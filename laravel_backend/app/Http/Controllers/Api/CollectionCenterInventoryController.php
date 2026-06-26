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
    // VALIDATION HELPERS (unchanged)
    // =========================================================================

    private function validateProductsNotInAnyCC(array $productIds): void
    {
        if (empty($productIds)) return;
        $allCcProductIds = CollectionCenterInventory::pluck('product_ids')
            ->filter()
            ->flatMap(fn($ids) => is_array($ids) ? $ids : json_decode($ids, true) ?? [])
            ->unique()
            ->values()
            ->toArray();
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

    private function validateProductsNotAlreadyInThisCc(array $productIds, string $ccId): void
    {
        if (empty($productIds)) return;
        $ccInventory = CollectionCenterInventory::where('cc_id', $ccId)->first();
        if (!$ccInventory) return;
        $existingIds = $ccInventory->product_ids ?? [];
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
    // STOCK MOVEMENT HELPERS (with new logging)
    // =========================================================================

    /**
 * Move products from warehouse(s) to a collection center.
 * Supports products from multiple warehouses.
 */
/**
 * Move products from warehouse(s) to a collection center.
 * Supports products from multiple warehouses.
 */
private function moveProductsToCC(array $productIds, string $toCcId, string $performedBy, ?string $requestId = null): void
{
    if (empty($productIds)) return;

    // 1. Find which warehouse contains each product
    $productWarehouseMap = [];
    $allInventories = Inventory::all();
    foreach ($productIds as $pid) {
        $found = false;
        foreach ($allInventories as $inv) {
            $invIds = is_array($inv->product_ids) ? $inv->product_ids : [];
            if (in_array($pid, $invIds)) {
                $productWarehouseMap[$pid] = $inv->warehouse_id;
                $found = true;
                break;
            }
        }
        if (!$found) {
            throw new \Exception("Product ID {$pid} not found in any warehouse inventory.");
        }
    }

    // 2. Group product IDs by warehouse
    $grouped = [];
    foreach ($productWarehouseMap as $pid => $warehouseId) {
        $grouped[$warehouseId][] = $pid;
    }

    DB::transaction(function () use ($grouped, $toCcId, $performedBy, $requestId, $productIds, $productWarehouseMap) {
        // 2.1 Remove products from each source warehouse inventory
        foreach ($grouped as $warehouseId => $pids) {
            $sourceInventory = Inventory::where('warehouse_id', $warehouseId)->first();
            if (!$sourceInventory) continue;
            $currentIds = $sourceInventory->product_ids ?? [];
            $updatedIds = array_values(array_diff($currentIds, $pids));
            $sourceInventory->update([
                'product_ids' => $updatedIds,
                'quantity' => count($updatedIds),
            ]);
        }

        // 2.2 Mark products as transferred
        Product::whereIn('product_id', $productIds)->update(['stock_status' => 'transferred']);

        // 2.3 Update or create CC inventory – merge all products
        $ccInventory = CollectionCenterInventory::firstOrNew(['cc_id' => $toCcId]);
        $existingIds = $ccInventory->product_ids ?? [];
        $newIds = array_values(array_unique(array_merge($existingIds, $productIds)));
        $sourceWarehouseId = (count($grouped) === 1) ? array_key_first($grouped) : null;
        $ccInventory->fill([
            'product_ids' => $newIds,
            'quantity' => count($newIds),
            'source_warehouse_id' => $sourceWarehouseId,
        ])->save();

        // 2.4 Log stock movements for each product (with correct from warehouse)
        foreach ($productIds as $productId) {
            $fromWarehouse = $productWarehouseMap[$productId] ?? null;
            // Safety check – should never be null because we built the map
            if (is_null($fromWarehouse)) {
                throw new \Exception("Source warehouse not found for product {$productId}");
            }

            // Existing StockMovement
            StockMovement::create([
                'movement_id'   => (string) Str::uuid(),
                'request_id'    => $requestId,
                'product_id'    => $productId,
                'from_type'     => 'warehouse',
                'from_id'       => $fromWarehouse,
                'to_type'       => 'collection_center',
                'to_id'         => $toCcId,
                'quantity'      => 1,
                'movement_type' => 'transfer',
                'notes'         => 'Transferred from warehouse to collection center',
                'performed_by'  => $performedBy,
            ]);

            // New log table
            StockMovementLog::create([
                'product_id'    => $productId,
                'from_type'     => 'warehouse',
                'from_id'       => $fromWarehouse,
                'to_type'       => 'collection_center',
                'to_id'         => $toCcId,
                'quantity'      => 1,
                'movement_type' => 'transfer',
                'reference_id'  => $requestId,
                'notes'         => 'Transferred from warehouse to collection center',
                'performed_by'  => $performedBy,
                'created_at'    => now(),
            ]);
        }
    });
}



  /**
 * Return products from a collection center back to warehouse(s).
 * If the CC has multiple source warehouses (source_warehouse_id is null),
 * we fall back to the first active warehouse.
 */
private function returnProductsToWarehouse(array $productIds, string $fromCcId, string $performedBy): void
{
    if (empty($productIds)) return;

    $ccInventory = CollectionCenterInventory::where('cc_id', $fromCcId)->first();
    if (!$ccInventory) return;

    // Determine target warehouse(s) – if source_warehouse_id is null,
    // we return to a default warehouse (e.g., the first active one)
    $targetWarehouseId = $ccInventory->source_warehouse_id;
    if (is_null($targetWarehouseId)) {
        $defaultWarehouse = Warehouse::active()->first();
        if (!$defaultWarehouse) {
            throw new \Exception("No active warehouse found to return products.");
        }
        $targetWarehouseId = $defaultWarehouse->warehouse_id;
    }

    DB::transaction(function () use ($productIds, $fromCcId, $performedBy, $ccInventory, $targetWarehouseId) {
        // 1. Remove from CC inventory
        $currentCcIds = $ccInventory->product_ids ?? [];
        $updatedCcIds = array_values(array_diff($currentCcIds, $productIds));
        $ccInventory->update([
            'product_ids' => $updatedCcIds,
            'quantity' => count($updatedCcIds),
        ]);
        if (empty($updatedCcIds)) {
            $ccInventory->delete();
        }

        // 2. Add back to the target warehouse inventory
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

        // 3. Update product status
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
                'notes'         => 'Returned from collection center to warehouse',
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
                'reference_id'  => null,
                'notes'         => 'Returned from collection center to warehouse',
                'performed_by'  => $performedBy,
                'created_at'    => now(),
            ]);
        }
    });
}

    private function findInventoriesContainingProducts(array $productIds)
    {
        $allInventories = Inventory::all();
        return $allInventories->filter(function ($inv) use ($productIds) {
            $invIds = is_array($inv->product_ids) ? $inv->product_ids : [];
            return count(array_intersect($invIds, $productIds)) > 0;
        });
    }

    // =========================================================================
    // OTHER HELPERS (unchanged)
    // =========================================================================

    private function attachProducts($inventory)
    {
        $inventory->products = Product::with('category')
            ->whereIn('product_id', $inventory->product_ids ?? [])
            ->get()
            ->map(function ($product) {
                $product->name = $product->category?->category_name ?? null;
                return $product;
            });
        return $inventory;
    }

    private function isRestrictedOwner($user): bool
    {
        return !$this->userCan('cc_inventory.view')
            && ($user->hasRole('BRANCH_OWNER') || $user->hasRole('TBL'));
    }

    // =========================================================================
    // INDEX
    // =========================================================================

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
            $inventories = $query->orderBy('created_at', 'desc')->paginate(15);
            $inventories->getCollection()->transform(fn($inv) => $this->attachProducts($inv));
            $this->logAudit('view_collection_center_inventories', 'collection_center_inventory', null, 'Viewed inventory list');
            return $this->successResponse($inventories, 'Inventories retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch inventories');
        }
    }

    // =========================================================================
    // SHOW
    // =========================================================================

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

    // =========================================================================
    // STORE
    // =========================================================================

    public function store(Request $request)
    {
        $perm = $this->checkPermission('cc_inventory.create');
        if ($perm) return $perm;
        $authUser = $request->user();
        try {
            $validated = $request->validate([
                'cc_id'         => 'required|string|exists:collection_centers,cc_id',
                'product_ids'   => 'required|array|min:1',
                'product_ids.*' => 'required|string|exists:products,product_id',
            ]);
            $notAvailable = Product::whereIn('product_id', $validated['product_ids'])
                ->where('stock_status', '!=', 'in_stock')
                ->pluck('imei', 'product_id');
            if ($notAvailable->isNotEmpty()) {
                return $this->validationError([
                    'product_ids' => $notAvailable->map(fn($imei, $id) => "Product IMEI {$imei} is not available (not in_stock).")->values()->toArray(),
                ]);
            }
            $this->validateProductsNotInAnyCC($validated['product_ids']);
            DB::beginTransaction();
            $this->moveProductsToCC($validated['product_ids'], $validated['cc_id'], $authUser->id, null);
            $inventory = CollectionCenterInventory::where('cc_id', $validated['cc_id'])->firstOrFail();
            DB::commit();
            $this->attachProducts($inventory->load('collectionCenter'));
            $this->logAudit('add_products_to_cc_inventory', 'collection_center_inventory', $inventory->cc_inventory_id, "Added " . count($validated['product_ids']) . " product(s) to CC inventory for {$inventory->cc_id}");
            return $this->created($inventory, 'Products added to CC inventory successfully.');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to add products: ' . $e->getMessage());
        }
    }

    // =========================================================================
    // UPDATE
    // =========================================================================

    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('cc_inventory.edit');
        if ($perm) return $perm;
        $authUser = $request->user();
        try {
            $inventory = CollectionCenterInventory::findOrFail($id);
            $validated = $request->validate([
                'product_ids'   => 'required|array|min:0',
                'product_ids.*' => 'string|exists:products,product_id',
            ]);
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
                $this->validateProductsNotInAnyCC($added);
            }
            DB::beginTransaction();
            if (!empty($removed)) $this->returnProductsToWarehouse($removed, $inventory->cc_id, $authUser->id);
            if (!empty($added)) $this->moveProductsToCC($added, $inventory->cc_id, $authUser->id);
            $inventory->refresh();
            $this->attachProducts($inventory->load('collectionCenter'));
            DB::commit();
            $this->logAudit('update_collection_center_inventory', 'collection_center_inventory', $inventory->cc_inventory_id, "Updated CC inventory {$inventory->cc_id}: +".count($added)." transferred, -".count($removed)." returned to warehouse");
            return $this->successResponse($inventory, 'CC inventory updated');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to update inventory: ' . $e->getMessage());
        }
    }

    // =========================================================================
    // DESTROY
    // =========================================================================

    public function destroy($id)
    {
        $perm = $this->checkPermission('cc_inventory.delete');
        if ($perm) return $perm;
        $authUser = request()->user();
        try {
            $inventory  = CollectionCenterInventory::findOrFail($id);
            $ccId       = $inventory->cc_id;
            $invId      = $inventory->cc_inventory_id;
            $productIds = is_array($inventory->product_ids) ? $inventory->product_ids : [];
            DB::beginTransaction();
            if (!empty($productIds)) $this->returnProductsToWarehouse($productIds, $ccId, $authUser->id);
            $inventory->delete();
            DB::commit();
            $this->logAudit('delete_collection_center_inventory', 'collection_center_inventory', $invId, "Deleted CC inventory for {$ccId}, returned " . count($productIds) . " product(s) to warehouse");
            return $this->successResponse(null, 'CC inventory deleted. Products returned to warehouse.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to delete inventory: ' . $e->getMessage());
        }
    }

    // =========================================================================
    // FETCH MY CC PRODUCTS
    // =========================================================================

    public function fetchMyCCProducts(Request $request)
    {
        $user = $request->user();
        if (!$this->userCan('cc_inventory.view') && !$this->userCan('cc_inventory.view_own')) {
            return $this->forbidden('Missing permission');
        }
        try {
            $assignedCcId = $user->cc_id;
            if (!$assignedCcId) return $this->successResponse([], 'No collection center assigned to your account');
            $inventory = CollectionCenterInventory::with('collectionCenter')->where('cc_id', $assignedCcId)->first();
            if (!$inventory || empty($inventory->product_ids)) return $this->successResponse([], 'No products in your assigned collection center');
            $this->attachProducts($inventory);
            $allProducts = [];
            foreach ($inventory->products ?? [] as $product) {
                $productData = $product->toArray();
                $productData['collection_center'] = [
                    'cc_id' => $inventory->cc_id,
                    'name'  => $inventory->collectionCenter?->cc_name ?? 'N/A',
                ];
                $allProducts[] = $productData;
            }
            return $this->successResponse($allProducts, 'Products retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch products');
        }
    }

    // =========================================================================
    // CONFIRM RECEIPT BY ID
    // =========================================================================

    public function confirmInventoryReceipt($id)
    {
        $user = request()->user();
        if (!$this->userCan('collection_center.confirm_receipt')) {
            return $this->forbidden('Missing permission: collection_center.confirm_receipt');
        }
        $inventory = CollectionCenterInventory::with('collectionCenter')->find($id);
        if (!$inventory) return $this->notFound('Inventory record not found.');
        $center = $inventory->collectionCenter;
        if (!$center) return $this->notFound('Associated collection center not found.');
        if ($center->owner_id !== $user->id) return $this->forbidden('You do not own this collection center.');
        if ($inventory->cc_inventory_status === 'arrived') return $this->conflict('Receipt already confirmed for this inventory.');
        if ($inventory->cc_inventory_status === 'rejected') return $this->conflict('This inventory was rejected. Cannot confirm.');
        $inventory->cc_inventory_status = 'arrived';
        $inventory->save();
        $this->logAudit('confirm_receipt_by_id', 'collection_center_inventory', $inventory->cc_inventory_id, "Branch owner confirmed receipt for center {$center->cc_name}");
        return $this->successResponse($inventory, 'Receipt confirmed successfully.');
    }

    // =========================================================================
    // CONFIRM MY RECEIPT
    // =========================================================================

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
        $inventory = CollectionCenterInventory::firstOrNew(['cc_id' => $center->cc_id]);
        if ($inventory->cc_inventory_status === 'arrived') return $this->conflict('Receipt already confirmed for this inventory.');
        if ($inventory->cc_inventory_status === 'rejected') return $this->conflict('This inventory was rejected. Cannot confirm.');
        if (!$inventory->exists) {
            $inventory->product_ids = [];
            $inventory->quantity = 0;
        }
        $inventory->cc_inventory_status = 'arrived';
        $inventory->save();
        $inventory->load('collectionCenter');
        $this->attachProducts($inventory);
        $this->logAudit('confirm_my_receipt', 'collection_center_inventory', $inventory->cc_inventory_id, "Branch owner confirmed receipt for their own center {$center->cc_name}");
        return $this->successResponse($inventory, 'Receipt confirmed for your center.');
    }

    // =========================================================================
    // GET MY PRODUCTS DROPDOWN
    // =========================================================================

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
        $inventory = CollectionCenterInventory::where('cc_id', $center->cc_id)->first();
        if (!$inventory || empty($inventory->product_ids)) return $this->successResponse([], 'No products in your collection centre');
        $products = Product::with('category')
            ->whereIn('product_id', $inventory->product_ids)
            ->get()
            ->map(function ($product) use ($center) {
                return [
                    'product_id'        => $product->product_id,
                    'imei'              => $product->imei,
                    'sku'               => $product->sku,
                    'category_name'     => $product->category?->category_name,
                    'model'             => $product->category?->model,
                    'color'             => null,
                    'collection_center' => [
                        'cc_id' => $center->cc_id,
                        'name'  => $center->cc_name,
                    ],
                    'product_name'      => $product->product_name,
                ];
            });
        return $this->successResponse($products, 'Products in your collection centre');
    }
}