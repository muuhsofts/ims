<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Warehouse;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class WarehouseController extends BaseApiController
{
    use Auditable;

    /**
     * List warehouses
     * Permission: warehouses.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('warehouses.view');
        if ($perm) return $perm;

        try {
            $query = Warehouse::with('manager');
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('location', 'LIKE', "%{$search}%");
                });
            }
            $warehouses = $query->orderBy('created_at', 'desc')
                                ->paginate($request->get('per_page', 15));
            $this->logAudit('view_warehouses', 'warehouse', null, 'Viewed warehouses list');
            return $this->successResponse($warehouses, 'Warehouses retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch warehouses');
        }
    }

    /**
 * Get warehouses as dropdown (id + name)
 * Permission: warehouses.view
 */
public function Warehousesdropdown(Request $request)
{
    $perm = $this->checkPermission('warehouses.view');
    if ($perm) return $perm;

    try {
        $warehouses = Warehouse::select('warehouse_id', 'name', 'location', 'status')
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get()
            ->map(function ($warehouse) {
                return [
                    'id'    => $warehouse->warehouse_id,
                    'label' => $warehouse->name . ($warehouse->location ? ' — ' . $warehouse->location : ''),
                ];
            });

        return $this->successResponse($warehouses, 'Warehouses dropdown retrieved');
    } catch (\Exception $e) {
        return $this->serverError('Failed to fetch warehouses dropdown: ' . $e->getMessage());
    }
}

    /**
     * Show single warehouse
     * Permission: warehouses.view
     */
    public function show($id)
    {
        $perm = $this->checkPermission('warehouses.view');
        if ($perm) return $perm;

        try {
            $warehouse = Warehouse::with('manager')->findOrFail($id);
            $this->logAudit('view_warehouse', 'warehouse', $warehouse->warehouse_id, "Viewed warehouse: {$warehouse->name}");
            return $this->successResponse($warehouse, 'Warehouse retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Warehouse not found');
        }
    }

    /**
     * Create a new warehouse
     * Permission: warehouses.create
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('warehouses.create');
        if ($perm) return $perm;

        try {
            $request->validate([
                'name'        => 'required|string|max:255|unique:warehouses,name',
                'location'    => 'nullable|string',
                'manager_id'  => 'nullable|string|exists:users,id',
                'status'      => 'sometimes|in:active,inactive,maintenance',
            ]);

            DB::beginTransaction();

            $data = $request->only(['name', 'location', 'manager_id']);
            $data['status'] = $request->input('status', 'active');

            $warehouse = Warehouse::create($data);
            DB::commit();

            $this->logAudit('create_warehouse', 'warehouse', $warehouse->warehouse_id,
                "Created warehouse: {$warehouse->name} (status: {$warehouse->status})");

            return $this->created($warehouse->load('manager'), 'Warehouse created successfully');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create warehouse: ' . $e->getMessage());
        }
    }

    /**
     * Update warehouse
     * Permission: warehouses.edit
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('warehouses.edit');
        if ($perm) return $perm;

        try {
            $warehouse = Warehouse::findOrFail($id);
            $request->validate([
                'name'        => 'sometimes|string|max:255|unique:warehouses,name,' . $warehouse->warehouse_id . ',warehouse_id',
                'location'    => 'nullable|string',
                'manager_id'  => 'nullable|string|exists:users,id',
                'status'      => 'sometimes|in:active,inactive,maintenance',
            ]);

            $oldName = $warehouse->name;
            $data = $request->only(['name', 'location', 'manager_id', 'status']);
            $warehouse->update($data);

            $this->logAudit('update_warehouse', 'warehouse', $warehouse->warehouse_id,
                "Updated warehouse from '{$oldName}' to '{$warehouse->name}'");

            return $this->successResponse($warehouse->load('manager'), 'Warehouse updated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to update warehouse');
        }
    }

    /**
     * Soft delete warehouse
     * Permission: warehouses.delete
     */
    public function destroy($id, Request $request)
    {
        $perm = $this->checkPermission('warehouses.delete');
        if ($perm) return $perm;

        try {
            $warehouse = Warehouse::findOrFail($id);
            $name = $warehouse->name;
            $warehouse->delete();

            $this->logAudit('delete_warehouse', 'warehouse', $id, "Soft-deleted warehouse: {$name}");
            return $this->successResponse(null, 'Warehouse deleted (soft delete)');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete warehouse');
        }
    }

    /**
     * Restore soft-deleted warehouse
     * Permission: warehouses.restore
     */
    public function restore($id, Request $request)
    {
        $perm = $this->checkPermission('warehouses.restore');
        if ($perm) return $perm;

        try {
            $warehouse = Warehouse::withTrashed()->findOrFail($id);
            $warehouse->restore();

            $this->logAudit('restore_warehouse', 'warehouse', $id, "Restored warehouse: {$warehouse->name}");
            return $this->successResponse($warehouse->load('manager'), 'Warehouse restored');
        } catch (\Exception $e) {
            return $this->serverError('Failed to restore warehouse');
        }
    }

    /**
     * Force delete warehouse permanently (admin only)
     * Permission: warehouses.force_delete
     */
    public function forceDelete($id, Request $request)
    {
        $perm = $this->checkPermission('warehouses.force_delete');
        if ($perm) return $perm;

        try {
            $warehouse = Warehouse::withTrashed()->findOrFail($id);
            $name = $warehouse->name;
            $warehouse->forceDelete();

            $this->logAudit('force_delete_warehouse', 'warehouse', $id, "Permanently deleted warehouse: {$name}");
            return $this->successResponse(null, 'Warehouse permanently deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to permanently delete warehouse');
        }
    }

    /**
     * Change warehouse status
     * Permission: warehouses.edit
     */
    public function changeStatus(Request $request, $id)
    {
        $perm = $this->checkPermission('warehouses.edit');
        if ($perm) return $perm;

        try {
            $request->validate([
                'status' => 'required|in:active,inactive,maintenance',
            ]);

            $warehouse = Warehouse::findOrFail($id);
            $oldStatus = $warehouse->status;
            $warehouse->setStatus($request->status);

            $this->logAudit('change_warehouse_status', 'warehouse', $warehouse->warehouse_id,
                "Changed status from {$oldStatus} to {$request->status} for warehouse {$warehouse->name}");

            return $this->successResponse($warehouse, 'Warehouse status updated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to change warehouse status');
        }
    }
}