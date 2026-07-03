<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Inventory;
use App\Models\InventoryLog;
use App\Models\Product;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class InventoryController extends BaseApiController
{
    use Auditable;

    /**
     * Load relationships and products for an inventory
     */
    private function loadRelations(Inventory $inventory)
    {
        $inventory->load(['warehouse', 'createdByUser']);
        $inventory->loadProducts();
        return $inventory;
    }

    /**
     * List inventory records - Only show records with products
     * Permission: inventory.view
     * Route: GET /v7/inventory
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('inventory.view');
        if ($perm) return $perm;

        try {
            $query = Inventory::with(['warehouse', 'createdByUser'])
                ->withProducts(); // Only get inventories with products

            // Filter by warehouse
            if ($request->filled('warehouse_id')) {
                $query->inWarehouse($request->warehouse_id);
            }

            // Search by warehouse name
            if ($request->filled('search')) {
                $search = $request->search;
                $query->whereHas('warehouse', function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%");
                });
            }

            $inventories = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));

            // Load products for each inventory
            foreach ($inventories as $inventory) {
                $inventory->loadProducts();
            }

            $this->logAudit('view_inventories', 'inventory', null, 'Viewed inventory list');
            return $this->successResponse($inventories, 'Inventory records retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch inventory: ' . $e->getMessage());
        }
    }

    /**
     * Show single inventory record
     * Permission: inventory.view
     * Route: GET /v7/inventory/{id}
     */
    public function show($id)
    {
        $perm = $this->checkPermission('inventory.view');
        if ($perm) return $perm;

        try {
            $inventory = Inventory::with(['warehouse', 'createdByUser'])
                ->withProducts()
                ->findOrFail($id);
            
            $inventory->loadProducts();

            $this->logAudit('view_inventory', 'inventory', $inventory->inventory_id, "Viewed inventory #{$inventory->inventory_id}");
            return $this->successResponse($inventory, 'Inventory record retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Inventory record not found');
        }
    }

    /**
     * Create a new inventory record
     * Permission: inventory.create
     * Route: POST /v7/inventory
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('inventory.create');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();

            $request->validate([
                'product_ids'   => 'required|array|min:1',
                'product_ids.*' => 'required|string|exists:products,product_id',
                'warehouse_id'  => 'required|string|exists:warehouses,warehouse_id',
            ]);

            DB::beginTransaction();

            $inventory = Inventory::create([
                'product_ids'  => $request->product_ids,
                'warehouse_id' => $request->warehouse_id,
                'created_by'   => $authUser->id,
            ]);

            $inventory = $this->loadRelations($inventory);

            // Log each product in the inventory
            foreach ($inventory->products as $product) {
                InventoryLog::create([
                    'log_date'         => now()->toDateString(),
                    'product_id'       => $product->product_id,
                    'product_name'     => $product->name ?? null,
                    'category_id'      => $product->category_id,
                    'category_name'    => $product->category->category_name ?? null,
                    'action'           => 'CREATE_INVENTORY',
                    'quantity_change'  => 0,
                    'new_quantity'     => $product->quantity ?? 0,
                    'reference_id'     => $inventory->inventory_id,
                    'notes'            => 'Inventory created',
                    'performed_by'     => $authUser->id,
                    'performed_by_name'=> $authUser->name ?? null,
                ]);
            }

            DB::commit();

            $this->logAudit('create_inventory', 'inventory', $inventory->inventory_id, 'Created inventory');
            return $this->created($inventory, 'Inventory created successfully');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e->getMessage());
        }
    }

    /**
     * Update an existing inventory record
     * Permission: inventory.edit
     * Route: PUT /v7/inventory/{id}
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('inventory.edit');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $inventory = Inventory::findOrFail($id);

            $request->validate([
                'product_ids'   => 'sometimes|array|min:1',
                'product_ids.*' => 'required|string|exists:products,product_id',
                'warehouse_id'  => 'sometimes|string|exists:warehouses,warehouse_id',
            ]);

            DB::beginTransaction();

            // Update product_ids if provided
            if ($request->has('product_ids')) {
                if (empty($request->product_ids) || count($request->product_ids) === 0) {
                    throw new \Exception('Product IDs cannot be empty');
                }
                $inventory->product_ids = $request->product_ids;
            }

            // Update warehouse_id if provided
            if ($request->has('warehouse_id')) {
                $inventory->warehouse_id = $request->warehouse_id;
            }

            $inventory->save();
            $inventory = $this->loadRelations($inventory->fresh());

            // Log each product in the updated inventory
            foreach ($inventory->products as $product) {
                InventoryLog::create([
                    'log_date'         => now()->toDateString(),
                    'product_id'       => $product->product_id,
                    'product_name'     => $product->name ?? null,
                    'category_id'      => $product->category_id,
                    'category_name'    => $product->category->category_name ?? null,
                    'action'           => 'UPDATE_INVENTORY',
                    'quantity_change'  => 0,
                    'new_quantity'     => $product->quantity ?? 0,
                    'reference_id'     => $inventory->inventory_id,
                    'notes'            => 'Inventory updated',
                    'performed_by'     => $authUser->id,
                    'performed_by_name'=> $authUser->name ?? null,
                ]);
            }

            DB::commit();

            $this->logAudit('update_inventory', 'inventory', $inventory->inventory_id, 'Updated inventory');
            return $this->successResponse($inventory, 'Inventory updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e->getMessage());
        }
    }

    /**
     * Delete an inventory record
     * Permission: inventory.delete
     * Route: DELETE /v7/inventory/{id}
     */
    public function destroy($id, Request $request)
    {
        $perm = $this->checkPermission('inventory.delete');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $inventory = Inventory::findOrFail($id);
            $inventoryId = $inventory->inventory_id;

            DB::beginTransaction();

            $inventory->delete();

            // Log the deletion
            InventoryLog::create([
                'log_date'         => now()->toDateString(),
                'product_id'       => null,
                'product_name'     => null,
                'category_id'      => null,
                'category_name'    => null,
                'action'           => 'DELETE_INVENTORY',
                'quantity_change'  => 0,
                'new_quantity'     => 0,
                'reference_id'     => $inventoryId,
                'notes'            => 'Inventory deleted',
                'performed_by'     => $authUser->id,
                'performed_by_name'=> $authUser->name ?? null,
            ]);

            DB::commit();

            $this->logAudit('delete_inventory', 'inventory', $inventoryId, 'Deleted inventory');
            return $this->successResponse(null, 'Inventory deleted successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e->getMessage());
        }
    }

    /**
     * Get inventory summary - Only count inventories with products
     * Permission: inventory.view
     * Route: GET /v7/inventory/summary
     */
    public function summary(Request $request)
    {
        $perm = $this->checkPermission('inventory.view');
        if ($perm) return $perm;

        try {
            $inventories = Inventory::with(['warehouse', 'createdByUser'])
                ->withProducts()
                ->get();

            $totalProducts = 0;
            foreach ($inventories as $inventory) {
                $inventory->loadProducts();
                $totalProducts += count($inventory->product_ids);
            }

            return $this->successResponse([
                'total_inventories' => $inventories->count(),
                'total_products'    => $totalProducts,
                'warehouses'        => $inventories->groupBy('warehouse_id')->map(function ($items) {
                    return [
                        'count' => $items->count(),
                        'warehouse_name' => $items->first()->warehouse->name ?? null,
                    ];
                }),
            ], 'Inventory summary retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch inventory summary: ' . $e->getMessage());
        }
    }

    /**
     * Get inventory statistics
     * Permission: inventory.view
     * Route: GET /v7/inventory/statistics
     */
    public function statistics(Request $request)
    {
        $perm = $this->checkPermission('inventory.view');
        if ($perm) return $perm;

        try {
            $totalInventories = Inventory::withProducts()->count();
            $totalProducts = 0;
            $warehouseStats = [];

            $inventories = Inventory::with(['warehouse'])
                ->withProducts()
                ->get();

            foreach ($inventories as $inventory) {
                $inventory->loadProducts();
                $productCount = count($inventory->product_ids);
                $totalProducts += $productCount;

                $warehouseId = $inventory->warehouse_id;
                if (!isset($warehouseStats[$warehouseId])) {
                    $warehouseStats[$warehouseId] = [
                        'warehouse_name' => $inventory->warehouse->name ?? 'Unknown',
                        'inventory_count' => 0,
                        'product_count' => 0,
                    ];
                }
                $warehouseStats[$warehouseId]['inventory_count']++;
                $warehouseStats[$warehouseId]['product_count'] += $productCount;
            }

            return $this->successResponse([
                'total_inventories' => $totalInventories,
                'total_products'    => $totalProducts,
                'warehouses'        => $warehouseStats,
                'average_products_per_inventory' => $totalInventories > 0 
                    ? round($totalProducts / $totalInventories, 2) 
                    : 0,
            ], 'Inventory statistics retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch inventory statistics: ' . $e->getMessage());
        }
    }

    /**
     * Get products in a specific inventory
     * Permission: inventory.view
     * Route: GET /v7/inventory/{id}/products
     */
    public function getProducts($id, Request $request)
    {
        $perm = $this->checkPermission('inventory.view');
        if ($perm) return $perm;

        try {
            $inventory = Inventory::withProducts()->findOrFail($id);
            $inventory->loadProducts();

            return $this->successResponse([
                'inventory_id' => $inventory->inventory_id,
                'warehouse'    => $inventory->warehouse,
                'products'     => $inventory->products,
                'total'        => count($inventory->product_ids),
            ], 'Products retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFound('Inventory record not found');
        }
    }

    /**
     * Add products to an existing inventory
     * Permission: inventory.edit
     * Route: POST /v7/inventory/{id}/products
     */
    public function addProducts(Request $request, $id)
    {
        $perm = $this->checkPermission('inventory.edit');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $inventory = Inventory::findOrFail($id);

            $request->validate([
                'product_ids'   => 'required|array|min:1',
                'product_ids.*' => 'required|string|exists:products,product_id',
            ]);

            DB::beginTransaction();

            // Merge existing products with new ones
            $existingProducts = $inventory->product_ids ?? [];
            $newProducts = array_merge($existingProducts, $request->product_ids);
            $newProducts = array_unique($newProducts); // Remove duplicates

            $inventory->product_ids = $newProducts;
            $inventory->save();

            $inventory = $this->loadRelations($inventory->fresh());

            // Log only the newly added products
            foreach ($request->product_ids as $productId) {
                $product = Product::with('category')->find($productId);
                if ($product) {
                    InventoryLog::create([
                        'log_date'         => now()->toDateString(),
                        'product_id'       => $product->product_id,
                        'product_name'     => $product->name ?? null,
                        'category_id'      => $product->category_id,
                        'category_name'    => $product->category->category_name ?? null,
                        'action'           => 'ADD_PRODUCTS',
                        'quantity_change'  => 1,
                        'new_quantity'     => count($inventory->product_ids),
                        'reference_id'     => $inventory->inventory_id,
                        'notes'            => 'Products added to inventory',
                        'performed_by'     => $authUser->id,
                        'performed_by_name'=> $authUser->name ?? null,
                    ]);
                }
            }

            DB::commit();

            $this->logAudit('add_products', 'inventory', $inventory->inventory_id, 'Added products to inventory');
            return $this->successResponse($inventory, 'Products added successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e->getMessage());
        }
    }

    /**
     * Remove products from an inventory
     * Permission: inventory.edit
     * Route: DELETE /v7/inventory/{id}/products
     */
    public function removeProducts(Request $request, $id)
    {
        $perm = $this->checkPermission('inventory.edit');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $inventory = Inventory::findOrFail($id);

            $request->validate([
                'product_ids'   => 'required|array|min:1',
                'product_ids.*' => 'required|string|exists:products,product_id',
            ]);

            DB::beginTransaction();

            // Remove specified products from the inventory
            $existingProducts = $inventory->product_ids ?? [];
            $removedProducts = array_intersect($existingProducts, $request->product_ids);
            $remainingProducts = array_diff($existingProducts, $request->product_ids);

            if (empty($remainingProducts)) {
                throw new \Exception('Cannot remove all products. Inventory must have at least one product.');
            }

            $inventory->product_ids = array_values($remainingProducts);
            $inventory->save();

            $inventory = $this->loadRelations($inventory->fresh());

            // Log each removed product
            foreach ($removedProducts as $productId) {
                $product = Product::with('category')->find($productId);
                if ($product) {
                    InventoryLog::create([
                        'log_date'         => now()->toDateString(),
                        'product_id'       => $product->product_id,
                        'product_name'     => $product->name ?? null,
                        'category_id'      => $product->category_id,
                        'category_name'    => $product->category->category_name ?? null,
                        'action'           => 'REMOVE_PRODUCTS',
                        'quantity_change'  => -1,
                        'new_quantity'     => count($inventory->product_ids),
                        'reference_id'     => $inventory->inventory_id,
                        'notes'            => 'Products removed from inventory',
                        'performed_by'     => $authUser->id,
                        'performed_by_name'=> $authUser->name ?? null,
                    ]);
                }
            }

            DB::commit();

            $this->logAudit('remove_products', 'inventory', $inventory->inventory_id, 'Removed products from inventory');
            return $this->successResponse($inventory, 'Products removed successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e->getMessage());
        }
    }
}