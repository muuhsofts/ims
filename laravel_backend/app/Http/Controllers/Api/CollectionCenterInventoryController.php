<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\CollectionCenterInventory;
use App\Models\CollectionCenter;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockMovementLog;       
use App\Models\Warehouse;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CollectionCenterInventoryController extends BaseApiController
{
    use Auditable;

    // =========================================================================
    // VALIDATION HELPERS
    // =========================================================================

    /**
     * Validate that products are not already in any collection center inventory
     */
    private function validateProductsNotInAnyCC(array $productIds): void
    {
        if (empty($productIds)) return;
        
        $allCcInventories = CollectionCenterInventory::whereIn('cc_inventory_status', ['pending', 'arrived'])->get();
        $allCcProductIds = [];
        
        foreach ($allCcInventories as $inv) {
            $ids = is_array($inv->product_ids) ? $inv->product_ids : [];
            $allCcProductIds = array_merge($allCcProductIds, $ids);
        }
        $allCcProductIds = array_unique($allCcProductIds);
        
        $conflicting = array_intersect($productIds, $allCcProductIds);
        if (!empty($conflicting)) {
            $conflictingProducts = Product::whereIn('product_id', $conflicting)->pluck('imei', 'product_id');
            $errorMessages = [];
            foreach ($conflicting as $pid) {
                $imei = $conflictingProducts[$pid] ?? $pid;
                $errorMessages[] = "Product IMEI {$imei} is already in another collection center inventory.";
            }
            throw new \Exception(implode(' ', $errorMessages));
        }
    }

    /**
     * Validate that products are not already in this specific collection center
     */
    private function validateProductsNotAlreadyInThisCc(array $productIds, string $ccId): void
    {
        if (empty($productIds)) return;
        
        $ccInventories = CollectionCenterInventory::where('cc_id', $ccId)
            ->whereIn('cc_inventory_status', ['pending', 'arrived'])
            ->get();
            
        $existingIds = [];
        foreach ($ccInventories as $inv) {
            $ids = is_array($inv->product_ids) ? $inv->product_ids : [];
            $existingIds = array_merge($existingIds, $ids);
        }
        
        $duplicates = array_intersect($productIds, $existingIds);
        if (!empty($duplicates)) {
            $dupProducts = Product::whereIn('product_id', $duplicates)->pluck('imei', 'product_id');
            $errorMessages = [];
            foreach ($duplicates as $pid) {
                $imei = $dupProducts[$pid] ?? $pid;
                $errorMessages[] = "Product IMEI {$imei} is already in this collection center.";
            }
            throw new \Exception(implode(' ', $errorMessages));
        }
    }

    // =========================================================================
    // CHECK PRODUCTS IN WAREHOUSE
    // =========================================================================

    private function getProductWarehouseMap(array $productIds): array
{
    $productWarehouseMap = [];
    $allInventories = Inventory::all();
    $missingProducts = [];

    $productIds = array_map(fn($id) => trim((string)$id), $productIds);

    foreach ($productIds as $pid) {
        $found = false;

        foreach ($allInventories as $inv) {
            $invIds = $inv->product_ids;
            if (is_string($invIds)) $invIds = json_decode($invIds, true);
            if (!is_array($invIds)) $invIds = [];
            $invIds = array_map('strval', $invIds);

            if (in_array(strval($pid), $invIds)) {
                // Track BOTH the inventory row id and warehouse id
                $productWarehouseMap[$pid] = [
                    'inventory_id' => $inv->inventory_id,
                    'warehouse_id' => $inv->warehouse_id,
                ];
                $found = true;
                break;
            }
        }

        if (!$found) {
            $product = Product::find($pid) ?? Product::where('imei', $pid)->first();
            $imei = $product->imei ?? $pid;
            $sku = $product->sku ?? 'N/A';
            $category = $product?->category?->category_name ?? 'N/A';
            $missingProducts[] = "IMEI: {$imei} (SKU: {$sku}, Category: {$category})";
        }
    }

    if (!empty($missingProducts)) {
        throw new \Exception("The following products are not in any warehouse inventory:\n" . implode("\n", $missingProducts));
    }

    return $productWarehouseMap;
}

    // =========================================================================
    // STOCK MOVEMENT HELPERS
    // =========================================================================

    /**
     * Move products from warehouse to collection center - Creates a NEW record per transfer
     * ALWAYS deducts from warehouse inventory
     */
     private function moveProductsToCC(array $productIds, string $toCcId, string $performedBy, ?string $requestId = null): CollectionCenterInventory
{
    if (empty($productIds)) {
        throw new \Exception("No products to move.");
    }

    $productIds = array_map(fn($id) => trim((string)$id), $productIds);

    // Map is now: product_id => ['inventory_id' => ..., 'warehouse_id' => ...]
    $productWarehouseMap = $this->getProductWarehouseMap($productIds);

    // Group product IDs by the SPECIFIC inventory row, not just warehouse_id
    $grouped = [];
    foreach ($productWarehouseMap as $pid => $info) {
        $grouped[$info['inventory_id']][] = $pid;
    }

    // Create a transfer request if none provided
    if (is_null($requestId)) {
        $transferRequest = \App\Models\TransferRequest::create([
            'request_id' => (string) Str::uuid(),
            'requester_id' => $performedBy,
            'cc_id' => $toCcId,
            'requested_items' => $productIds,
            'total_quantity' => count($productIds),
            'received_quantity' => 0,
            'status' => 'completed', // Or 'approved' based on your workflow
            'approved_by' => $performedBy,
            'approved_at' => now(),
            'notes' => "Direct transfer from warehouse to collection center",
        ]);
        $requestId = $transferRequest->request_id;
    }

    DB::transaction(function () use ($grouped, $toCcId, $performedBy, $requestId, $productIds, $productWarehouseMap) {
        foreach ($grouped as $inventoryId => $pids) {
            $sourceInventory = Inventory::find($inventoryId);
            if (!$sourceInventory) {
                throw new \Exception("Warehouse inventory record not found: {$inventoryId}");
            }

            $currentIds = $sourceInventory->product_ids;
            if (is_string($currentIds)) $currentIds = json_decode($currentIds, true);
            if (!is_array($currentIds)) $currentIds = [];
            $currentIds = array_map('strval', $currentIds);
            $pids = array_map('strval', $pids);

            $missing = array_diff($pids, $currentIds);
            if (!empty($missing)) {
                $missingProducts = Product::whereIn('product_id', $missing)->pluck('imei', 'product_id');
                $missingImeis = $missingProducts->values()->implode(', ');
                throw new \Exception("Products with IMEI(s) {$missingImeis} not found in warehouse.");
            }

            $updatedIds = array_values(array_diff($currentIds, $pids));
            $sourceInventory->update([
                'product_ids' => $updatedIds,
                'quantity' => count($updatedIds),
            ]);
        }

        Product::whereIn('product_id', $productIds)->update(['stock_status' => 'transferred']);
    });

    // Use warehouse_id from the map for the CC record / stock movement logs
    $warehouseIds = array_unique(array_column($productWarehouseMap, 'warehouse_id'));
    $sourceWarehouseId = (count($warehouseIds) === 1) ? $warehouseIds[0] : null;

    $ccInventory = CollectionCenterInventory::create([
        'cc_id' => $toCcId,
        'product_ids' => $productIds,
        'quantity' => count($productIds),
        'source_warehouse_id' => $sourceWarehouseId,
        'cc_inventory_status' => 'pending',
    ]);

    foreach ($productIds as $productId) {
        $fromWarehouse = $productWarehouseMap[$productId]['warehouse_id'] ?? null;
        if (is_null($fromWarehouse)) {
            throw new \Exception("Source warehouse not found for product {$productId}");
        }

        StockMovement::create([
            'movement_id'   => (string) Str::uuid(),
            'request_id'    => $requestId, // Now this is a valid transfer request ID
            'reference_id'  => $ccInventory->cc_inventory_id,
            'product_id'    => $productId,
            'from_type'     => 'warehouse',
            'from_id'       => $fromWarehouse,
            'to_type'       => 'collection_center',
            'to_id'         => $toCcId,
            'quantity'      => 1,
            'movement_type' => 'transfer',
            'notes'         => "Transferred from warehouse to collection center (Transfer ID: {$ccInventory->cc_inventory_id})",
            'performed_by'  => $performedBy,
        ]);

        StockMovementLog::create([
            'product_id'    => $productId,
            'from_type'     => 'warehouse',
            'from_id'       => $fromWarehouse,
            'to_type'       => 'collection_center',
            'to_id'         => $toCcId,
            'quantity'      => 1,
            'movement_type' => 'transfer',
            'reference_id'  => $ccInventory->cc_inventory_id,
            'notes'         => "Transferred from warehouse to collection center",
            'performed_by'  => $performedBy,
            'created_at'    => now(),
        ]);
    }

    return $ccInventory;
}

    /**
     * Return products from collection center back to warehouse
     * ALWAYS adds back to warehouse inventory
     */
    private function returnProductsToWarehouse(array $productIds, string $fromCcId, string $performedBy): void
    {
        if (empty($productIds)) return;

        // Find the specific inventory record containing these products
        $ccInventory = null;
        $inventories = CollectionCenterInventory::where('cc_id', $fromCcId)
            ->whereIn('cc_inventory_status', ['pending', 'arrived'])
            ->where('quantity', '>', 0)
            ->get();
            
        foreach ($inventories as $inv) {
            $ids = is_array($inv->product_ids) ? $inv->product_ids : [];
            $intersect = array_intersect($productIds, $ids);
            if (!empty($intersect)) {
                $ccInventory = $inv;
                break;
            }
        }

        if (!$ccInventory) {
            throw new \Exception("No inventory record found for these products.");
        }

        $targetWarehouseId = $ccInventory->source_warehouse_id;
        if (is_null($targetWarehouseId)) {
            $defaultWarehouse = Warehouse::active()->first();
            if (!$defaultWarehouse) {
                throw new \Exception("No active warehouse found to return products.");
            }
            $targetWarehouseId = $defaultWarehouse->warehouse_id;
        }

        DB::transaction(function () use ($productIds, $fromCcId, $performedBy, $ccInventory, $targetWarehouseId) {
            // 1. Remove products from CC inventory
            $currentCcIds = $ccInventory->product_ids ?? [];
            $updatedCcIds = array_values(array_diff($currentCcIds, $productIds));
            
            if (empty($updatedCcIds)) {
                $ccInventory->update([
                    'product_ids' => [],
                    'quantity' => 0,
                    'cc_inventory_status' => 'rejected',
                ]);
            } else {
                $ccInventory->update([
                    'product_ids' => $updatedCcIds,
                    'quantity' => count($updatedCcIds),
                ]);
            }

            // 2. ADD products back to the target warehouse inventory
            $warehouseInventory = Inventory::firstOrCreate(
                ['warehouse_id' => $targetWarehouseId],
                ['product_ids' => [], 'quantity' => 0]
            );
            $currentWarehouseIds = $warehouseInventory->product_ids ?? [];
            $mergedIds = array_values(array_unique(array_merge($currentWarehouseIds, $productIds)));
            $warehouseInventory->update([
                'product_ids' => $mergedIds,
                'quantity' => count($mergedIds),
            ]);

            // 3. Update product status back to in_stock
            Product::whereIn('product_id', $productIds)->update(['stock_status' => 'in_stock']);

            // 4. Log returns
            foreach ($productIds as $productId) {
                StockMovement::create([
                    'movement_id'   => (string) Str::uuid(),
                    'product_id'    => $productId,
                    'from_type'     => 'collection_center',
                    'from_id'       => $fromCcId,
                    'to_type'       => 'warehouse',
                    'to_id'         => $targetWarehouseId,
                    'quantity'      => 1,
                    'movement_type' => 'return',
                    'notes'         => "Returned from collection center to warehouse",
                    'performed_by'  => $performedBy,
                ]);

                StockMovementLog::create([
                    'product_id'    => $productId,
                    'from_type'     => 'collection_center',
                    'from_id'       => $fromCcId,
                    'to_type'       => 'warehouse',
                    'to_id'         => $targetWarehouseId,
                    'quantity'      => 1,
                    'movement_type' => 'return',
                    'reference_id'  => $ccInventory->cc_inventory_id,
                    'notes'         => 'Returned from collection center to warehouse',
                    'performed_by'  => $performedBy,
                    'created_at'    => now(),
                ]);
            }
        });
    }

    // =========================================================================
    // OTHER HELPERS
    // =========================================================================

    /**
     * Attach product details to inventory record
     */
    private function attachProducts($inventory)
    {
        if (!$inventory || empty($inventory->product_ids)) {
            $inventory->products = [];
            return $inventory;
        }
        
        $inventory->products = Product::with('category')
            ->whereIn('product_id', $inventory->product_ids ?? [])
            ->get()
            ->map(function ($product) {
                $product->name = $product->category?->category_name ?? null;
                return $product;
            });
        return $inventory;
    }

    /**
     * Check if user is a restricted owner (BRANCH_OWNER or TBL)
     */
    private function isRestrictedOwner($user): bool
    {
        return !$this->userCan('cc_inventory.view')
            && ($user->hasRole('BRANCH_OWNER') || $user->hasRole('TBL'));
    }

    /**
     * Convert IMEI to Product ID if needed
     */
    private function convertToProductIds(array $ids): array
    {
        $productIds = [];
        
        foreach ($ids as $id) {
            $id = trim((string)$id);
            
            // Check if it's a valid UUID
            if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
                // It's a UUID, use as is
                $productIds[] = $id;
            } else {
                // Not a UUID, try to find by IMEI
                $product = Product::where('imei', $id)->first();
                if ($product) {
                    $productIds[] = $product->product_id;
                } else {
                    throw new \Exception("Product with IMEI or ID '{$id}' not found");
                }
            }
        }
        
        return $productIds;
    }

    // =========================================================================
    // API ENDPOINTS
    // =========================================================================

    /**
     * Check if products are available in warehouse inventory
     */
    public function checkProductsInWarehouse(Request $request)
    {
        $perm = $this->checkPermission('cc_inventory.view');
        if ($perm) return $perm;
        
        try {
            $request->validate([
                'product_ids' => 'required|array|min:1',
                'product_ids.*' => 'required|string|exists:products,product_id',
            ]);
            
            $productIds = $request->product_ids;
            $result = [];
            $allInventories = Inventory::all();
            
            foreach ($productIds as $pid) {
                $product = Product::with('category')->find($pid);
                $found = false;
                $warehouseName = null;
                
                foreach ($allInventories as $inv) {
                    $invIds = is_array($inv->product_ids) ? $inv->product_ids : [];
                    if (in_array($pid, $invIds)) {
                        $found = true;
                        $warehouse = Warehouse::find($inv->warehouse_id);
                        $warehouseName = $warehouse ? $warehouse->name : $inv->warehouse_id;
                        break;
                    }
                }
                
                $result[] = [
                    'product_id' => $pid,
                    'imei' => $product ? $product->imei : 'N/A',
                    'sku' => $product ? $product->sku : 'N/A',
                    'category' => $product && $product->category ? $product->category->category_name : 'N/A',
                    'in_warehouse' => $found,
                    'warehouse' => $warehouseName,
                ];
            }
            
            $available = array_filter($result, fn($r) => $r['in_warehouse']);
            $unavailable = array_filter($result, fn($r) => !$r['in_warehouse']);
            
            return $this->successResponse([
                'available' => array_values($available),
                'unavailable' => array_values($unavailable),
                'total' => count($result),
                'available_count' => count($available),
                'unavailable_count' => count($unavailable),
            ], 'Products availability checked');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to check products: ' . $e->getMessage());
        }
    }

    /**
     * List all transfers
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$this->userCan('cc_inventory.view') && !$this->userCan('cc_inventory.view_own')) {
            return $this->forbidden('Missing permission: cc_inventory.view or cc_inventory.view_own');
        }
        try {
            $query = CollectionCenterInventory::with('collectionCenter');
            
            if ($this->isRestrictedOwner($user)) {
                $assignedCcId = $user->cc_id;
                if (!$assignedCcId) return $this->successResponse([], 'No collection center assigned to your account');
                $query->where('cc_id', $assignedCcId);
                if ($request->filled('cc_id') && $request->cc_id !== $assignedCcId) {
                    return $this->forbidden('You are not assigned to this collection center');
                }
            } elseif ($request->filled('cc_id')) {
                $query->where('cc_id', $request->cc_id);
            }
            
            if ($request->filled('status')) {
                $query->where('cc_inventory_status', $request->status);
            }
            
            if ($request->filled('from_date')) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }
            if ($request->filled('to_date')) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }
            
            $inventories = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));
                
            $inventories->getCollection()->transform(fn($inv) => $this->attachProducts($inv));
            
            $inventories->setCollection(
                $inventories->getCollection()->filter(function ($inv) {
                    return !empty($inv->product_ids) && count($inv->product_ids) > 0;
                })
            );
            
            $this->logAudit('view_collection_center_inventories', 'collection_center_inventory', null, 'Viewed inventory list');
            return $this->successResponse($inventories, 'Inventories retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch inventories');
        }
    }

    /**
     * Show a specific transfer
     */
    public function show($id)
    {
        $user = request()->user();
        if (!$this->userCan('cc_inventory.view') && !$this->userCan('cc_inventory.view_own')) {
            return $this->forbidden('Missing permission: cc_inventory.view or cc_inventory.view_own');
        }
        try {
            $inventory = CollectionCenterInventory::with('collectionCenter')->findOrFail($id);
            if ($this->isRestrictedOwner($user)) {
                $assignedCcId = $user->cc_id;
                if (!$assignedCcId || $inventory->cc_id !== $assignedCcId) {
                    return $this->forbidden('You are not assigned to this collection center');
                }
            }
            $this->attachProducts($inventory);
            $this->logAudit('view_collection_center_inventory', 'collection_center_inventory', $inventory->cc_inventory_id, 'Viewed inventory');
            return $this->successResponse($inventory, 'Inventory retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Inventory record not found');
        }
    }

    /**
     * Create a new transfer (each transfer = separate record, NO MERGING!)
     * FIXED: Converts IMEI to Product ID if needed
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('cc_inventory.create');
        if ($perm) return $perm;
        $authUser = $request->user();
        try {
            $validated = $request->validate([
                'cc_id'         => 'required|string|exists:collection_centers,cc_id',
                'product_ids'   => 'required|array|min:1',
                'product_ids.*' => 'required|string',  // Accept UUID or IMEI
            ]);
            
            // 🔥 CONVERT IMEI TO PRODUCT ID IF NEEDED
            $productIds = $this->convertToProductIds($validated['product_ids']);
            $validated['product_ids'] = $productIds;
            
            // Check products are available (in_stock)
            $notAvailable = Product::whereIn('product_id', $validated['product_ids'])
                ->where('stock_status', '!=', 'in_stock')
                ->pluck('imei', 'product_id');
            if ($notAvailable->isNotEmpty()) {
                return $this->validationError([
                    'product_ids' => $notAvailable->map(fn($imei, $id) => "Product IMEI {$imei} is not available (not in_stock).")->values()->toArray(),
                ]);
            }
            
            // Check products are in warehouse inventory
            try {
                $productWarehouseMap = $this->getProductWarehouseMap($validated['product_ids']);
            } catch (\Exception $e) {
                return $this->validationError([
                    'product_ids' => [$e->getMessage()],
                ]);
            }
            
            // Validate products not in any other CC
            $this->validateProductsNotInAnyCC($validated['product_ids']);
            
            DB::beginTransaction();
            $inventory = $this->moveProductsToCC($validated['product_ids'], $validated['cc_id'], $authUser->id, null);
            DB::commit();
            
            $this->attachProducts($inventory->load('collectionCenter'));
            $this->logAudit('add_products_to_cc_inventory', 'collection_center_inventory', $inventory->cc_inventory_id, 
                "Created new transfer with " . count($validated['product_ids']) . " product(s) to CC {$inventory->cc_id}");
            
            return $this->created($inventory, 'Products transferred to CC successfully. Waiting for confirmation.');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to transfer products: ' . $e->getMessage());
        }
    }

    /**
     * Update a specific transfer
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('cc_inventory.edit');
        if ($perm) return $perm;
        $authUser = $request->user();
        try {
            $inventory = CollectionCenterInventory::findOrFail($id);
            
            if ($inventory->cc_inventory_status === 'arrived') {
                return $this->conflict('Cannot edit an already confirmed transfer. Please create a new transfer.');
            }
            if ($inventory->cc_inventory_status === 'rejected') {
                return $this->conflict('Cannot edit a rejected transfer.');
            }
            
            $validated = $request->validate([
                'product_ids'   => 'required|array|min:0',
                'product_ids.*' => 'required|string',
            ]);
            
            // 🔥 CONVERT IMEI TO PRODUCT ID IF NEEDED
            $productIds = $this->convertToProductIds($validated['product_ids']);
            $validated['product_ids'] = $productIds;
            
            $oldIds = $inventory->product_ids ?? [];
            $newIds = $validated['product_ids'];
            $added  = array_values(array_diff($newIds, $oldIds));
            $removed = array_values(array_diff($oldIds, $newIds));
            
            if (!empty($added)) {
                $notAvailable = Product::whereIn('product_id', $added)
                    ->where('stock_status', '!=', 'in_stock')
                    ->pluck('imei', 'product_id');
                if ($notAvailable->isNotEmpty()) {
                    return $this->validationError([
                        'product_ids' => $notAvailable->map(fn($imei, $id) => "Product IMEI {$imei} is not available (not in_stock).")->values()->toArray(),
                    ]);
                }
                
                try {
                    $this->getProductWarehouseMap($added);
                } catch (\Exception $e) {
                    return $this->validationError([
                        'product_ids' => [$e->getMessage()],
                    ]);
                }
                
                $this->validateProductsNotInAnyCC($added);
            }
            
            DB::beginTransaction();
            if (!empty($removed)) {
                $this->returnProductsToWarehouse($removed, $inventory->cc_id, $authUser->id);
            }
            if (!empty($added)) {
                $this->moveProductsToCC($added, $inventory->cc_id, $authUser->id);
            }
            
            if (!empty($newIds)) {
                $inventory->update([
                    'product_ids' => $newIds,
                    'quantity' => count($newIds),
                ]);
            }
            
            $inventory->refresh();
            $this->attachProducts($inventory->load('collectionCenter'));
            DB::commit();
            
            $this->logAudit('update_collection_center_inventory', 'collection_center_inventory', $inventory->cc_inventory_id, 
                "Updated transfer: +".count($added)." added, -".count($removed)." removed");
            
            return $this->successResponse($inventory, 'Transfer updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to update transfer: ' . $e->getMessage());
        }
    }

    /**
     * Delete/Reject a transfer
     */
    public function destroy($id)
    {
        $perm = $this->checkPermission('cc_inventory.delete');
        if ($perm) return $perm;
        $authUser = request()->user();
        try {
            $inventory = CollectionCenterInventory::findOrFail($id);
            
            if ($inventory->cc_inventory_status === 'arrived') {
                return $this->conflict('Cannot delete an already confirmed transfer. Please create a return transfer.');
            }
            
            $ccId = $inventory->cc_id;
            $invId = $inventory->cc_inventory_id;
            $productIds = is_array($inventory->product_ids) ? $inventory->product_ids : [];
            
            DB::beginTransaction();
            if (!empty($productIds)) {
                $this->returnProductsToWarehouse($productIds, $ccId, $authUser->id);
            }
            $inventory->delete();
            DB::commit();
            
            $this->logAudit('delete_collection_center_inventory', 'collection_center_inventory', $invId, 
                "Rejected transfer and returned " . count($productIds) . " product(s) to warehouse");
            
            return $this->successResponse(null, 'Transfer rejected. Products returned to warehouse.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to reject transfer: ' . $e->getMessage());
        }
    }

    /**
     * Confirm a specific transfer receipt
     */
    public function confirmInventoryReceipt($id)
    {
        $user = request()->user();
        if (!$this->userCan('collection_center.confirm_receipt')) {
            return $this->forbidden('Missing permission: collection_center.confirm_receipt');
        }
        
        $inventory = CollectionCenterInventory::with('collectionCenter')->find($id);
        if (!$inventory) return $this->notFound('Transfer record not found.');
        
        $center = $inventory->collectionCenter;
        if (!$center) return $this->notFound('Associated collection center not found.');
        if ($center->owner_id !== $user->id) {
            return $this->forbidden('You do not own this collection center.');
        }
        
        if ($inventory->cc_inventory_status === 'arrived') {
            return $this->conflict('This transfer has already been confirmed.');
        }
        if ($inventory->cc_inventory_status === 'rejected') {
            return $this->conflict('This transfer was rejected. Cannot confirm.');
        }
        
        $productIds = $inventory->product_ids ?? [];
        if (!empty($productIds)) {
            Product::whereIn('product_id', $productIds)->update(['stock_status' => 'received']);
        }
        
        $inventory->cc_inventory_status = 'arrived';
        $inventory->save();
        
        $this->attachProducts($inventory);
        $this->logAudit('confirm_receipt_by_id', 'collection_center_inventory', $inventory->cc_inventory_id, 
            "Confirmed transfer for center {$center->cc_name}");
        
        return $this->successResponse($inventory, 'Transfer confirmed successfully.');
    }

    /**
     * Confirm ALL pending transfers for the logged-in user's CC
     */
    public function confirmMyReceipt(Request $request)
    {
        $user = $request->user();
        if (!$this->userCan('collection_center.confirm_receipt')) {
            return $this->forbidden('Missing permission: collection_center.confirm_receipt');
        }
        
        $assignedCcId = $user->cc_id;
        if (!$assignedCcId) return $this->forbidden('No collection center assigned to your account.');
        
        $center = CollectionCenter::find($assignedCcId);
        if (!$center) return $this->forbidden('Assigned collection center not found.');
        
        $pendingTransfers = CollectionCenterInventory::where('cc_id', $center->cc_id)
            ->where('cc_inventory_status', 'pending')
            ->where('quantity', '>', 0)
            ->orderBy('created_at', 'asc')
            ->get();
            
        if ($pendingTransfers->isEmpty()) {
            return $this->successResponse([], 'No pending transfers to confirm.');
        }
        
        $confirmedCount = 0;
        $allProductIds = [];
        $confirmedTransfers = [];
        
        DB::beginTransaction();
        try {
            foreach ($pendingTransfers as $transfer) {
                $productIds = $transfer->product_ids ?? [];
                if (!empty($productIds)) {
                    $allProductIds = array_merge($allProductIds, $productIds);
                    Product::whereIn('product_id', $productIds)->update(['stock_status' => 'received']);
                }
                
                $transfer->cc_inventory_status = 'arrived';
                $transfer->save();
                $confirmedCount++;
                $confirmedTransfers[] = $transfer->cc_inventory_id;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to confirm transfers: ' . $e->getMessage());
        }
        
        $this->logAudit('confirm_my_receipt', 'collection_center_inventory', null, 
            "Confirmed {$confirmedCount} transfers for center {$center->cc_name}");
        
        return $this->successResponse([
            'confirmed_count' => $confirmedCount,
            'total_products' => count(array_unique($allProductIds)),
            'confirmed_transfer_ids' => $confirmedTransfers,
        ], "{$confirmedCount} transfers confirmed successfully.");
    }

    /**
     * Get all products from confirmed transfers for the logged-in user's CC
     */
    public function fetchMyCCProducts(Request $request)
    {
        $user = $request->user();
        if (!$this->userCan('cc_inventory.view') && !$this->userCan('cc_inventory.view_own')) {
            return $this->forbidden('Missing permission');
        }
        try {
            $assignedCcId = $user->cc_id;
            if (!$assignedCcId) return $this->successResponse([], 'No collection center assigned to your account');
            
            $transfers = CollectionCenterInventory::with('collectionCenter')
                ->where('cc_id', $assignedCcId)
                ->where('cc_inventory_status', 'arrived')
                ->where('quantity', '>', 0)
                ->orderBy('created_at', 'desc')
                ->get();
                
            if ($transfers->isEmpty()) {
                return $this->successResponse([], 'No products in your assigned collection center');
            }
            
            $allProductIds = [];
            $transferMap = [];
            foreach ($transfers as $transfer) {
                $ids = $transfer->product_ids ?? [];
                foreach ($ids as $pid) {
                    $allProductIds[] = $pid;
                    $transferMap[$pid] = [
                        'transfer_id' => $transfer->cc_inventory_id,
                        'transfer_date' => $transfer->created_at,
                        'status' => $transfer->cc_inventory_status,
                    ];
                }
            }
            $allProductIds = array_unique($allProductIds);
            
            if (empty($allProductIds)) {
                return $this->successResponse([], 'No products in your assigned collection center');
            }
            
            $products = Product::with('category')
                ->whereIn('product_id', $allProductIds)
                ->get()
                ->map(function ($product) use ($assignedCcId, $transferMap) {
                    $productData = $product->toArray();
                    $productData['collection_center'] = [
                        'cc_id' => $assignedCcId,
                        'transfer_id' => $transferMap[$product->product_id]['transfer_id'] ?? null,
                        'transfer_date' => $transferMap[$product->product_id]['transfer_date'] ?? null,
                        'status' => $transferMap[$product->product_id]['status'] ?? null,
                    ];
                    $productData['product_name'] = $product->product_name;
                    return $productData;
                });
                
            return $this->successResponse($products, 'Products retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch products: ' . $e->getMessage());
        }
    }

    /**
     * Get dropdown of products from confirmed transfers for the logged-in user's CC
     */
    public function getMyProductsDropdown(Request $request)
    {
        $user = $request->user();
        if (!$this->userCan('cc_inventory.view') && !$this->userCan('cc_inventory.view_own')) {
            return $this->forbidden('Missing permission');
        }
        
        $assignedCcId = $user->cc_id;
        if (!$assignedCcId) return $this->successResponse([], 'No collection center assigned to your account');
        
        $center = CollectionCenter::find($assignedCcId);
        if (!$center) return $this->successResponse([], 'Assigned collection center not found');
        
        $transfers = CollectionCenterInventory::where('cc_id', $center->cc_id)
            ->where('cc_inventory_status', 'arrived')
            ->where('quantity', '>', 0)
            ->get();
            
        if ($transfers->isEmpty()) {
            return $this->successResponse([], 'No products in your collection centre');
        }
        
        $allProductIds = [];
        foreach ($transfers as $transfer) {
            $ids = $transfer->product_ids ?? [];
            $allProductIds = array_merge($allProductIds, $ids);
        }
        $allProductIds = array_unique($allProductIds);
        
        if (empty($allProductIds)) {
            return $this->successResponse([], 'No products in your collection centre');
        }
        
        $products = Product::with('category')
            ->whereIn('product_id', $allProductIds)
            ->get()
            ->map(function ($product) use ($center) {
                return [
                    'product_id'        => $product->product_id,
                    'imei'              => $product->imei,
                    'sku'               => $product->sku,
                    'category_name'     => $product->category?->category_name,
                    'model'             => $product->category?->model,
                    'cash_selling_price' => $product->cash_selling_price,
                    'loan_selling_price' => $product->loan_selling_price,
                    'buying_price'      => $product->buying_price,
                    'collection_center' => [
                        'cc_id' => $center->cc_id,
                        'name'  => $center->cc_name,
                    ],
                    'product_name'      => $product->product_name,
                ];
            });
            
        return $this->successResponse($products, 'Products in your collection centre');
    }

    /**
     * Get transfer history for a specific collection center
     */
    public function getTransferHistory($ccId, Request $request)
    {
        $perm = $this->checkPermission('cc_inventory.view');
        if ($perm) return $perm;
        
        try {
            $transfers = CollectionCenterInventory::with('collectionCenter')
                ->where('cc_id', $ccId)
                ->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 20));
                
            $transfers->getCollection()->transform(function ($transfer) {
                return $this->attachProducts($transfer);
            });
            
            $stats = [
                'total_transfers' => CollectionCenterInventory::where('cc_id', $ccId)->count(),
                'pending' => CollectionCenterInventory::where('cc_id', $ccId)->where('cc_inventory_status', 'pending')->count(),
                'arrived' => CollectionCenterInventory::where('cc_id', $ccId)->where('cc_inventory_status', 'arrived')->count(),
                'rejected' => CollectionCenterInventory::where('cc_id', $ccId)->where('cc_inventory_status', 'rejected')->count(),
                'total_products' => CollectionCenterInventory::where('cc_id', $ccId)->sum('quantity'),
            ];
            
            return $this->successResponse([
                'stats' => $stats,
                'transfers' => $transfers,
            ], 'Transfer history retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch transfer history: ' . $e->getMessage());
        }
    }
}