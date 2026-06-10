<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\AgentInventory;
use App\Models\StockDistribution;
use App\Models\StockDistributionLog;        // ← NEW
use App\Models\CollectionCenterInventory;
use App\Models\User;
use App\Models\Product;
use App\Models\CollectionCenter;
use App\Models\StockMovement;
use App\Traits\Auditable;
use App\Mail\DistributionMail;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class DistributionController extends BaseApiController
{
    use Auditable;

    // =========================================================================
    // HELPER – STOCK MOVEMENT LOGGING (existing)
    // =========================================================================

    private function logStockMovement(
        string $productId,
        string $fromType,
        string $fromId,
        string $toType,
        string $toId,
        int $quantity,
        string $movementType,
        string $performedBy,
        ?string $referenceId = null,
        ?string $notes = null
    ): void {
        StockMovement::create([
            'movement_id'   => (string) Str::uuid(),
            'request_id'    => null,
            'product_id'    => $productId,
            'from_type'     => $fromType,
            'from_id'       => $fromId,
            'to_type'       => $toType,
            'to_id'         => $toId,
            'quantity'      => $quantity,
            'movement_type' => $movementType,
            'reference_id'  => $referenceId,
            'notes'         => $notes ?? ($movementType === 'transfer' ? 'Distributed to sales agent' : 'Receipt confirmed by agent'),
            'performed_by'  => $performedBy,
            'created_at'    => now(),
        ]);
    }

    // =========================================================================
    // EXISTING HELPER METHODS (unchanged)
    // =========================================================================

    private function getCcInventory($ccId)
    {
        return CollectionCenterInventory::where('cc_id', $ccId)->first();
    }

    private function resolveCcId($authUser, Request $request)
    {
        if ($request->filled('cc_id')) {
            $ccId = $request->cc_id;
            $cc   = CollectionCenter::where('cc_id', $ccId)->first();
            if (!$cc || (!$this->isCollectionCenterOwner($authUser, $cc) && !$this->userCan('distributions.view'))) {
                throw new \Exception('Invalid or unauthorized collection center');
            }
            return $ccId;
        }
        $owned = CollectionCenter::where('owner_id', $authUser->id)->get();
        if ($owned->count() === 1) {
            return $owned->first()->cc_id;
        }
        throw new \Exception('Please specify cc_id (you own multiple collection centers)');
    }

    private function getDefaultCcId($user)
    {
        $centers = CollectionCenter::where('owner_id', $user->id)->get();
        return $centers->count() === 1 ? $centers->first()->cc_id : null;
    }

    private function isCollectionCenterOwner($user, $collectionCenter)
    {
        if (!$user || !$collectionCenter) return false;
        return $user->id === $collectionCenter->owner_id;
    }

    // =========================================================================
    // 1. LIST DISTRIBUTIONS
    // =========================================================================

    public function index(Request $request)
    {
        $perm = $this->checkPermission('distributions.view');
        if ($perm) return $perm;
        $query = StockDistribution::with(['user', 'collectionCenter', 'product.category', 'performer', 'approver', 'receiver']);
        if ($request->filled('user_id')) $query->where('user_id', $request->user_id);
        if ($request->filled('cc_id')) $query->where('cc_id', $request->cc_id);
        if ($request->filled('status')) $query->where('status', $request->status);
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(20), 'Distributions retrieved');
    }

    // =========================================================================
    // 2. SHOW SINGLE DISTRIBUTION
    // =========================================================================

    public function show($id)
    {
        $perm = $this->checkPermission('distributions.view');
        if ($perm) return $perm;
        $distribution = StockDistribution::with(['user', 'collectionCenter', 'product', 'performer', 'approver', 'receiver'])->findOrFail($id);
        return $this->successResponse($distribution, 'Distribution details');
    }

    // =========================================================================
    // 3. CREATE DISTRIBUTION (multiple products)
    // =========================================================================

    public function store(Request $request)
    {
        $perm = $this->checkPermission('distributions.create');
        if ($perm) return $perm;
        try {
            $authUser = $request->user();
            $ccId     = $this->resolveCcId($authUser, $request);
            $validated = $request->validate([
                'user_id'              => 'required|string|exists:users,id',
                'notes'                => 'nullable|string',
                'items'                => 'required|array|min:1',
                'items.*.product_id'   => 'required|string|exists:products,product_id',
                'items.*.quantity'     => 'required|integer|min:1',
            ]);
            $agent = User::findOrFail($validated['user_id']);
            if (!$agent->isSalesAgent()) return $this->badRequest('Target user is not a sales agent');
            if ($agent->cc_id && $agent->cc_id !== $ccId) return $this->badRequest('This sales agent does not belong to your collection center');
            $ccInventory = $this->getCcInventory($ccId);
            if (!$ccInventory) return $this->badRequest('Collection center inventory not found');
            $ccCounts = array_count_values($ccInventory->product_ids ?? []);
            foreach ($validated['items'] as $item) {
                $available = $ccCounts[$item['product_id']] ?? 0;
                if ($available < $item['quantity']) return $this->badRequest("Not enough stock for product {$item['product_id']}. Available: {$available}");
            }
            DB::beginTransaction();
            $remainingCcIds = $ccInventory->product_ids ?? [];
            $distributions  = [];
            foreach ($validated['items'] as $item) {
                $productId = $item['product_id'];
                $qty       = $item['quantity'];
                $toMove   = [];
                $leftover = [];
                $pulled   = 0;
                foreach ($remainingCcIds as $id) {
                    if ($id === $productId && $pulled < $qty) {
                        $toMove[] = $id;
                        $pulled++;
                    } else {
                        $leftover[] = $id;
                    }
                }
                $remainingCcIds = $leftover;
                $agentInv = AgentInventory::firstOrCreate(
                    ['user_id' => $validated['user_id'], 'product_id' => $productId],
                    ['quantity_received' => 0, 'quantity_sold' => 0, 'product_ids' => []]
                );
                $agentInv->product_ids = array_merge($agentInv->product_ids ?? [], $toMove);
                $agentInv->quantity_received += $qty;
                $agentInv->save();
                $dist = StockDistribution::create([
                    'user_id'           => $validated['user_id'],
                    'cc_id'             => $ccId,
                    'product_id'        => $productId,
                    'quantity'          => $qty,
                    'quantity_received' => $qty,
                    'status'            => 'completed',
                    'performed_by'      => $authUser->id,
                    'approved_by'       => $authUser->id,
                    'received_by'       => $validated['user_id'],
                    'notes'             => $validated['notes'] ?? null,
                ]);
                $distributions[] = $dist;
                // Existing stock movement log
                $this->logStockMovement(
                    productId: $productId, fromType: 'collection_center', fromId: $ccId,
                    toType: 'sales_agent', toId: $validated['user_id'], quantity: $qty,
                    movementType: 'transfer', performedBy: $authUser->id,
                    referenceId: $dist->distribution_id, notes: "Distributed {$qty} unit(s) to agent {$agent->name}"
                );
                // NEW: log to stock_distribution_logs
                StockDistributionLog::create([
                    'distribution_id' => $dist->distribution_id,
                    'product_id'      => $productId,
                    'from_cc_id'      => $ccId,
                    'to_agent_id'     => $validated['user_id'],
                    'quantity'        => $qty,
                    'status'          => 'completed',
                    'notes'           => $validated['notes'] ?? null,
                    'performed_by'    => $authUser->id,
                    'created_at'      => now(),
                ]);
                $this->logAudit('create_distribution', 'distribution', $dist->distribution_id, "Distributed {$qty} units of {$productId} to agent {$agent->name}");
            }
            $ccInventory->product_ids = array_values($remainingCcIds);
            $ccInventory->quantity    = count($remainingCcIds);
            $ccInventory->save();
            DB::commit();
            if ($agent->email) {
                foreach ($distributions as $dist) {
                    Mail::to($agent->email)->send(new DistributionMail($dist, 'agent'));
                }
            }
            $loaded = collect($distributions)->map(fn($d) => $d->load(['user', 'product', 'collectionCenter']));
            return $this->created($loaded, 'Stock successfully transferred to agent inventory');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to distribute stock: ' . $e->getMessage());
        }
    }

    // =========================================================================
    // 4. MANUAL FULL RECEIPT CONFIRMATION
    // =========================================================================

    public function confirmReceipt(Request $request, $id)
    {
        $perm = $this->checkPermission('distributions.confirm_receipt');
        if ($perm) return $perm;
        try {
            $authUser     = $request->user();
            $distribution = StockDistribution::findOrFail($id);
            if ($distribution->status !== 'completed') return $this->badRequest('Distribution not completed');
            if ($distribution->quantity_received >= $distribution->quantity) return $this->badRequest('All products already received');
            if (!$this->userCan('distributions.view') && $distribution->user_id !== $authUser->id) return $this->forbidden('Only the sales agent can confirm receipt');
            DB::beginTransaction();
            $remaining = $distribution->quantity - $distribution->quantity_received;
            $distribution->quantity_received = $distribution->quantity;
            $distribution->received_by       = $authUser->id;
            $distribution->save();
            $agentInv = AgentInventory::firstOrCreate(
                ['user_id' => $distribution->user_id, 'product_id' => $distribution->product_id],
                ['quantity_received' => 0, 'quantity_sold' => 0, 'product_ids' => []]
            );
            $agentInv->quantity_received += $remaining;
            $agentInv->save();
            // NEW: log to stock_distribution_logs (receipt confirmation)
            StockDistributionLog::create([
                'distribution_id' => $distribution->distribution_id,
                'product_id'      => $distribution->product_id,
                'from_cc_id'      => $distribution->cc_id,
                'to_agent_id'     => $distribution->user_id,
                'quantity'        => $remaining,
                'status'          => $distribution->quantity_received >= $distribution->quantity ? 'completed' : 'partial',
                'notes'           => $distribution->notes ?? 'Receipt confirmed by agent',
                'performed_by'    => $authUser->id,
                'created_at'      => now(),
            ]);
            DB::commit();
            Mail::to($authUser->email)->send(new DistributionMail($distribution, 'agent'));
            $this->logAudit('confirm_distribution_receipt', 'distribution', $distribution->distribution_id, "Confirmed receipt of {$remaining} units");
            return $this->successResponse($distribution, 'Receipt confirmed successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to confirm receipt: ' . $e->getMessage());
        }
    }

    // =========================================================================
    // 5. CONFIRM BY IMEI SCAN (one product at a time)
    // =========================================================================

    public function confirmByImei(Request $request)
    {
        $perm = $this->checkPermission('distributions.scan_imei');
        if ($perm) return $perm;
        try {
            $authUser  = $request->user();
            $validated = $request->validate(['imei' => 'required|string|exists:products,imei']);
            $product = Product::where('imei', $validated['imei'])->firstOrFail();
            $distribution = StockDistribution::where('user_id', $authUser->id)
                ->where('product_id', $product->product_id)
                ->where('status', 'completed')
                ->whereRaw('quantity_received < quantity')
                ->orderBy('created_at', 'desc')
                ->first();
            if (!$distribution) return $this->badRequest('No pending distribution found for this IMEI');
            DB::beginTransaction();
            $distribution->quantity_received += 1;
            $fullyReceived = ($distribution->quantity_received >= $distribution->quantity);
            if ($fullyReceived) $distribution->received_by = $authUser->id;
            $distribution->save();
            $agentInv = AgentInventory::firstOrCreate(
                ['user_id' => $distribution->user_id, 'product_id' => $distribution->product_id],
                ['quantity_received' => 0, 'quantity_sold' => 0, 'product_ids' => []]
            );
            $agentInv->quantity_received += 1;
            $agentInv->save();
            // NEW: log each IMEI receipt to stock_distribution_logs
            StockDistributionLog::create([
                'distribution_id' => $distribution->distribution_id,
                'product_id'      => $distribution->product_id,
                'from_cc_id'      => $distribution->cc_id,
                'to_agent_id'     => $distribution->user_id,
                'quantity'        => 1,
                'status'          => $fullyReceived ? 'completed' : 'partial',
                'notes'           => "IMEI {$validated['imei']} scanned and received",
                'performed_by'    => $authUser->id,
                'created_at'      => now(),
            ]);
            DB::commit();
            $message = $fullyReceived ? 'All products received successfully.' : "Received {$distribution->quantity_received} of {$distribution->quantity}";
            if ($fullyReceived) Mail::to($authUser->email)->send(new DistributionMail($distribution, 'agent'));
            $this->logAudit('confirm_distribution_by_imei', 'distribution', $distribution->distribution_id, "IMEI {$validated['imei']} scanned — {$distribution->quantity_received}/{$distribution->quantity}");
            return $this->successResponse([
                'distribution' => $distribution,
                'received'     => $distribution->quantity_received,
                'total'        => $distribution->quantity,
                'completed'    => $fullyReceived,
            ], $message);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to confirm by IMEI: ' . $e->getMessage());
        }
    }

    // =========================================================================
    // 6. GET AVAILABLE STOCK IN COLLECTION CENTER
    // =========================================================================

    public function getAvailableStock(Request $request)
    {
        $perm = $this->checkPermission('distributions.view_available_stock');
        if ($perm) return $perm;
        try {
            $authUser    = $request->user();
            $ccId        = $request->filled('cc_id') ? $request->cc_id : $this->getDefaultCcId($authUser);
            $ccInventory = $this->getCcInventory($ccId);
            if (!$ccInventory || empty($ccInventory->product_ids)) return $this->successResponse([], 'No stock available');
            $counts = array_count_values($ccInventory->product_ids);
            $stock  = [];
            foreach ($counts as $productId => $quantity) {
                $product = Product::find($productId);
                if ($product) {
                    $stock[] = [
                        'product_id'         => $productId,
                        'imei'               => $product->imei,
                        'color'              => $product->color,
                        'buying_price'       => $product->buying_price,
                        'selling_price'      => $product->selling_price,
                        'available_quantity' => $quantity,
                    ];
                }
            }
            return $this->successResponse($stock, 'Available stock retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch stock: ' . $e->getMessage());
        }
    }
}