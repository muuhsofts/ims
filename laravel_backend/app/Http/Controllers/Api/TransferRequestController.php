<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\TransferRequest;
use App\Models\Inventory;
use App\Models\CollectionCenterInventory;
use App\Models\StockMovement;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Traits\Auditable;
use App\Mail\TransferRequestMail;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class TransferRequestController extends BaseApiController
{
    use Auditable;

    private function getNonEmptyInventory()
    {
        return Inventory::whereRaw('JSON_LENGTH(product_ids) > 0')->first();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. LIST
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request)
{
    $perm = $this->checkPermission('transfer_requests.view');
    if ($perm) return $perm;

    try {
        $authUser = $request->user();

        $query = TransferRequest::with([
            'requester:id,name,email',
            'collectionCenter:cc_id,cc_name,location',
            'approver:id,name,email',
            'receiver:id,name,email',
            'movements',
        ]);

        // STOCK_CONTROLLER sees all, others (including BRANCH_OWNER) see only their own
        if (!$this->isStockController()) {
            $query->where('requester_id', $authUser->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('cc_id')) {
            $query->where('cc_id', $request->cc_id);
        }

        $requests = $query->orderBy('created_at', 'desc')
                          ->paginate($request->get('per_page', 15));

        return $this->successResponse($requests, 'Transfer requests retrieved');
    } catch (\Exception $e) {
        return $this->serverError('Failed to fetch requests: ' . $e->getMessage());
    }
}

    // ─────────────────────────────────────────────────────────────────────────
    // 2. SHOW
    // ─────────────────────────────────────────────────────────────────────────
    public function show($id)
{
    $perm = $this->checkPermission('transfer_requests.view');
    if ($perm) return $perm;

    try {
        $transfer = TransferRequest::with([
            'requester', 'collectionCenter',
            'approver', 'receiver', 'movements.product',
        ])->findOrFail($id);

        $authUser = request()->user();

        // STOCK_CONTROLLER can view any request, others only their own
        if (!$this->isStockController() && $transfer->requester_id !== $authUser->id) {
            return $this->forbidden('You can only view your own transfer requests.');
        }

        return $this->successResponse($transfer, 'Request details');
    } catch (\Exception $e) {
        return $this->notFound('Request not found');
    }
}

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CREATE – uses logged user's cc_id
    // ─────────────────────────────────────────────────────────────────────────
    public function store(Request $request)
{
    $perm = $this->checkPermission('transfer_requests.create');
    if ($perm) return $perm;

    try {
        $authUser = $request->user();

        if (!$authUser->cc_id) {
            return $this->badRequest('You are not associated with any collection center.');
        }

        $center = \App\Models\CollectionCenter::find($authUser->cc_id);
        if (!$center) {
            return $this->badRequest('Your associated collection center does not exist.');
        }

        if (!($this->userCan('transfer_requests.approve') || $center->owner_id === $authUser->id)) {
            return $this->forbidden('You cannot create requests for this collection center.');
        }

        $validated = $request->validate([
            'requested_items'                 => 'required|array|min:1',
            'requested_items.*.category_id'   => 'required|string|exists:product_categories,category_id',
            'requested_items.*.category_name' => 'required|string',  // optional but kept for display
            'requested_items.*.model'         => 'nullable|string',
            'requested_items.*.skus'          => 'required|array|min:1',
            'requested_items.*.skus.*'        => 'required|string',
            'requested_items.*.description'   => 'nullable|string',
            'requested_items.*.quantity'      => 'nullable|integer|min:1',
            'notes'                           => 'nullable|string',
        ]);

        foreach ($validated['requested_items'] as $item) {
            $category = ProductCategory::find($item['category_id']); // ✅ find by ID
            if (!$category) {
                return $this->validationError([
                    'requested_items' => ["Category ID '{$item['category_id']}' not found"],
                ]);
            }

            $validSkus = $category->sku ?? [];
            foreach ($item['skus'] as $sku) {
                if (!in_array($sku, $validSkus)) {
                    return $this->validationError([
                        'requested_items' => ["SKU '{$sku}' is not valid for category '{$category->category_name}' (ID: {$category->category_id})"],
                    ]);
                }
            }
        }

        DB::beginTransaction();

        // Store only the necessary fields (category_name + skus are enough, but you can also store category_id)
        $transfer = TransferRequest::create([
            'requester_id'    => $authUser->id,
            'cc_id'           => $authUser->cc_id,
            'requested_items' => collect($validated['requested_items'])->map(function($item) {
                // Keep original structure: include category_name, skus, etc.
                return [
                    'category_id'   => $item['category_id'],
                    'category_name' => $item['category_name'],
                    'model'         => $item['model'] ?? null,
                    'skus'          => $item['skus'],
                    'description'   => $item['description'] ?? null,
                    'quantity'      => $item['quantity'] ?? 1,
                ];
            })->toArray(),
            'status'          => 'pending',
            'notes'           => $validated['notes'] ?? null,
        ]);

        DB::commit();

        $this->sendApprovalNotification($transfer);
        $this->logAudit('create_transfer_request', 'transfer_request', $transfer->request_id, 'Created transfer request');

        return $this->created(
            $transfer->load(['requester', 'collectionCenter']),
            'Transfer request created'
        );
    } catch (ValidationException $e) {
        return $this->validationError($e->errors());
    } catch (\Exception $e) {
        DB::rollBack();
        return $this->serverError('Failed to create request: ' . $e->getMessage());
    }
}

    // ─────────────────────────────────────────────────────────────────────────
    // 4. APPROVE
    // ─────────────────────────────────────────────────────────────────────────
    public function approve(Request $request, $id)
    {
        $perm = $this->checkPermission('transfer_requests.approve');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $transfer = TransferRequest::findOrFail($id);

            if ($transfer->status !== 'pending') {
                return $this->badRequest('Request already ' . $transfer->status);
            }

            DB::beginTransaction();
            $transfer->status      = 'approved';
            $transfer->approved_by = $authUser->id;
            $transfer->approved_at = now();
            $transfer->save();
            DB::commit();

            $this->sendApprovedNotification($transfer);
            $this->logAudit('approve_transfer_request', 'transfer_request', $transfer->request_id, 'Approved request');

            return $this->successResponse($transfer->load(['requester', 'collectionCenter', 'approver']), 'Transfer request approved');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to approve: ' . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. REJECT
    // ─────────────────────────────────────────────────────────────────────────
    public function reject(Request $request, $id)
    {
        $perm = $this->checkPermission('transfer_requests.reject');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $transfer = TransferRequest::findOrFail($id);

            if ($transfer->status !== 'pending') {
                return $this->badRequest('Request already ' . $transfer->status);
            }

            DB::beginTransaction();
            $transfer->status      = 'rejected';
            $transfer->approved_by = $authUser->id;
            $transfer->approved_at = now();
            $transfer->save();
            DB::commit();

            $this->sendRejectionNotification($transfer);
            $this->logAudit('reject_transfer_request', 'transfer_request', $transfer->request_id, 'Rejected request');

            return $this->successResponse($transfer, 'Request rejected');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to reject: ' . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. AVAILABLE PRODUCTS FOR PROCESSING
    // ─────────────────────────────────────────────────────────────────────────
    public function availableProducts($id, Request $request)
    {
        $perm = $this->checkPermission('transfer_requests.process');
        if ($perm) return $perm;

        try {
            $transfer = TransferRequest::findOrFail($id);

            if ($transfer->status !== 'approved') {
                return $this->badRequest('Request must be approved first');
            }

            $inventory = $this->getNonEmptyInventory();
            if (!$inventory) {
                return $this->badRequest('No inventory with products found');
            }

            $warehouseProductIds = $inventory->product_ids;
            $allProducts = [];

            foreach ($transfer->requested_items as $item) {
                $category = ProductCategory::where('category_name', $item['category_name'])->first();
                if (!$category) continue;

                $products = Product::where('category_id', $category->category_id)
                    ->whereIn('product_id', $warehouseProductIds)
                    ->whereIn('sku', $item['skus'])
                    ->where('status', 'active')
                    ->get(['product_id', 'imei', 'sku', 'buying_price', 'selling_price']);

                $allProducts = array_merge($allProducts, $products->toArray());
            }

            return $this->successResponse($allProducts, 'Available products');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch products: ' . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. PROCESS TRANSFER (warehouse → CC)
    // ─────────────────────────────────────────────────────────────────────────
    public function processTransfer(Request $request, $id)
    {
        $perm = $this->checkPermission('transfer_requests.process');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $transfer = TransferRequest::findOrFail($id);

            if ($transfer->status !== 'approved') {
                return $this->badRequest('Request must be approved before processing');
            }

            $validated = $request->validate([
                'product_ids'   => 'required|array|min:1',
                'product_ids.*' => 'string|exists:products,product_id',
            ]);

            $warehouseInventory = $this->getNonEmptyInventory();
            if (!$warehouseInventory) {
                return $this->badRequest('No warehouse inventory with products found');
            }

            $availableProductIds = $warehouseInventory->product_ids;
            $missing = array_diff($validated['product_ids'], $availableProductIds);
            if (!empty($missing)) {
                return $this->badRequest('Some products are not in warehouse inventory');
            }

            DB::beginTransaction();

            $transfer->total_quantity = count($validated['product_ids']);
            $transfer->save();

            // Remove from warehouse
            $warehouseInventory->product_ids = array_values(
                array_diff($availableProductIds, $validated['product_ids'])
            );
            $warehouseInventory->save();

            // Add to CC inventory
            $destInventory = CollectionCenterInventory::firstOrCreate(
                ['cc_id' => $transfer->cc_id],
                ['product_ids' => []]
            );
            $destInventory->product_ids = array_values(
                array_unique(array_merge($destInventory->product_ids ?? [], $validated['product_ids']))
            );
            $destInventory->save();

            // Update products + record movements
            foreach ($validated['product_ids'] as $productId) {
                $product = Product::find($productId);
                if ($product) {
                    $product->stock_status = 'transferred';
                    $product->save();
                }

                StockMovement::create([
                    'request_id'    => $transfer->request_id,
                    'product_id'    => $productId,
                    'from_type'     => 'warehouse',
                    'from_id'       => $warehouseInventory->warehouse_id,
                    'to_type'       => 'collection_center',
                    'to_id'         => $transfer->cc_id,
                    'quantity'      => 1,
                    'movement_type' => 'transfer',
                    'performed_by'  => $authUser->id,
                    'notes'         => 'Processed transfer request #' . $transfer->request_id,
                ]);
            }

            DB::commit();

            $this->sendProcessedNotification($transfer);
            $this->logAudit('process_transfer', 'transfer_request', $transfer->request_id, 'Processed transfer, moved products');

            return $this->successResponse($transfer->fresh(['movements']), 'Transfer processed and stock moved');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to process transfer: ' . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. SCAN RECEIPT (by IMEI)
    // ─────────────────────────────────────────────────────────────────────────
    public function scanReceipt(Request $request, $id)
    {
        $perm = $this->checkPermission('transfer_requests.scan_receipt');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $transfer = TransferRequest::findOrFail($id);

            $cc = \App\Models\CollectionCenter::find($transfer->cc_id);
            if (!$this->userCan('transfer_requests.view') && $cc->owner_id !== $authUser->id) {
                return $this->forbidden('Only the collection center owner can scan receipt');
            }

            if (!in_array($transfer->status, ['approved', 'completed'])) {
                return $this->badRequest('Request must be approved first');
            }

            if ($transfer->received_quantity >= $transfer->total_quantity) {
                return $this->badRequest('All products already received');
            }

            $request->validate(['imei' => 'required|string']);

            $product = Product::where('imei', $request->imei)->first();
            if (!$product) {
                return $this->notFound('Product with this IMEI not found');
            }

            $requestProductIds = $transfer->movements()->pluck('product_id')->toArray();
            if (!in_array($product->product_id, $requestProductIds)) {
                return $this->badRequest('This product is not part of this transfer request');
            }

            if ($product->stock_status === 'received') {
                return $this->badRequest('Product already received');
            }

            DB::beginTransaction();

            $product->stock_status = 'received';
            $product->save();

            $transfer->received_quantity += 1;
            $transfer->save();

            $completed = false;
            if ($transfer->received_quantity >= $transfer->total_quantity) {
                $transfer->status      = 'completed';
                $transfer->received_by = $authUser->id;
                $transfer->received_at = now();
                $transfer->save();
                $completed = true;
                $this->sendReceivedNotification($transfer);
            }

            DB::commit();

            $this->logAudit('scan_receipt', 'transfer_request', $transfer->request_id, "Scanned IMEI {$request->imei} as received");

            return $this->successResponse([
                'received'  => $transfer->received_quantity,
                'total'     => $transfer->total_quantity,
                'completed' => $completed,
            ], 'Product receipt scanned');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to scan receipt: ' . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. MANUAL CONFIRM RECEIPT
    // ─────────────────────────────────────────────────────────────────────────
    public function confirmReceived(Request $request, $id)
    {
        $perm = $this->checkPermission('transfer_requests.confirm_receipt');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $transfer = TransferRequest::findOrFail($id);

            if ($transfer->status !== 'approved') {
                return $this->badRequest('Cannot confirm – request is not approved');
            }

            $cc = \App\Models\CollectionCenter::find($transfer->cc_id);
            if (!$this->userCan('transfer_requests.view') && $cc->owner_id !== $authUser->id) {
                return $this->forbidden('Only the collection center owner can confirm receipt');
            }

            DB::beginTransaction();
            $transfer->status      = 'completed';
            $transfer->received_by = $authUser->id;
            $transfer->received_at = now();
            $transfer->save();
            DB::commit();

            $this->sendReceivedNotification($transfer);
            $this->logAudit('confirm_receipt', 'transfer_request', $transfer->request_id, 'Confirmed receipt');

            return $this->successResponse($transfer->load(['receiver']), 'Receipt confirmed');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to confirm: ' . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. DELETE PENDING REQUEST
    // ─────────────────────────────────────────────────────────────────────────
    public function destroy($id, Request $request)
    {
        $perm = $this->checkPermission('transfer_requests.delete');
        if ($perm) return $perm;

        try {
            $transfer = TransferRequest::findOrFail($id);

            if ($transfer->status !== 'pending') {
                return $this->badRequest('Cannot delete a request that is already processed');
            }

            $transfer->delete();
            $this->logAudit('delete_transfer_request', 'transfer_request', $id, 'Deleted pending request');

            return $this->successResponse(null, 'Request deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete: ' . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Email notifications
    // ─────────────────────────────────────────────────────────────────────────
    private function sendApprovalNotification(TransferRequest $transfer)
    {
        $roleIds = \App\Models\Role::whereIn('name', ['ADMINISTRATOR', 'STOCK_CONTROLLER'])->pluck('id');
        $recipients = \App\Models\User::whereIn('role_id', $roleIds)->where('status', 'active')->get();
        foreach ($recipients as $user) {
            Mail::to($user->email)->send(new TransferRequestMail($transfer, 'approver'));
        }
    }

    private function sendApprovedNotification(TransferRequest $transfer)
    {
        Mail::to($transfer->requester->email)->send(new TransferRequestMail($transfer, 'requester'));
    }

    private function sendRejectionNotification(TransferRequest $transfer)
    {
        Mail::to($transfer->requester->email)->send(new TransferRequestMail($transfer, 'requester'));
    }

    private function sendProcessedNotification(TransferRequest $transfer)
    {
        Mail::to($transfer->requester->email)->send(new TransferRequestMail($transfer, 'requester'));
    }

    private function sendReceivedNotification(TransferRequest $transfer)
    {
        Mail::to($transfer->requester->email)->send(new TransferRequestMail($transfer, 'requester'));
        if ($transfer->approver) {
            Mail::to($transfer->approver->email)->send(new TransferRequestMail($transfer, 'approver'));
        }
    }
}