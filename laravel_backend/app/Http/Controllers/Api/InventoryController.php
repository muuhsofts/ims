<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Inventory;
use App\Models\InventoryLog;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class InventoryController extends BaseApiController
{
    use Auditable;

    private function loadRelations(Inventory $inventory)
    {
        $inventory->load(['warehouse', 'createdByUser']);
        $inventory->loadProducts();
        return $inventory;
    }

    /**
     * List inventory records
     * Permission: inventory.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('inventory.view');
        if ($perm) return $perm;

        try {
            $query = Inventory::with(['warehouse', 'createdByUser']);
            if ($request->filled('warehouse_id')) {
                $query->where('warehouse_id', $request->warehouse_id);
            }
            if ($request->filled('search')) {
                $search = $request->search;
                $query->whereHas('warehouse', function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%");
                });
            }
            $inventories = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));
            foreach ($inventories as $inventory) {
                $inventory->loadProducts();
            }
            $this->logAudit('view_inventories', 'inventory', null, 'Viewed inventory list');
            return $this->successResponse($inventories, 'Inventory records retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch inventory');
        }
    }

    /**
     * Show single inventory record
     * Permission: inventory.view
     */
    public function show($id)
    {
        $perm = $this->checkPermission('inventory.view');
        if ($perm) return $perm;

        try {
            $inventory = Inventory::with(['warehouse', 'createdByUser'])->findOrFail($id);
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
            return $this->created($inventory, 'Inventory created');
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
            $inventory->update($request->only(['product_ids', 'warehouse_id']));
            $inventory = $this->loadRelations($inventory->fresh());

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
            return $this->successResponse($inventory, 'Inventory updated');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e->getMessage());
        }
    }

    /**
     * Delete an inventory record
     * Permission: inventory.delete
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
            return $this->successResponse(null, 'Inventory deleted');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError($e->getMessage());
        }
    }
}