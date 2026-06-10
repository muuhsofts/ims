<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Supplier;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class SupplierController extends BaseApiController
{
    use Auditable;

    /**
     * List suppliers
     * Permission: suppliers.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('suppliers.view');
        if ($perm) return $perm;

        try {
            $query = Supplier::query();
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('supplier_name', 'LIKE', "%{$search}%")
                      ->orWhere('contact_person', 'LIKE', "%{$search}%")
                      ->orWhere('phone', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%");
                });
            }
            $suppliers = $query->orderBy('created_at', 'desc')
                               ->paginate($request->get('per_page', 15));
            $this->logAudit('view_suppliers', 'supplier', null, 'Viewed suppliers list');
            return $this->successResponse($suppliers, 'Suppliers retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch suppliers');
        }
    }

    /**
     * Show single supplier
     * Permission: suppliers.view
     */
    public function show($id)
    {
        $perm = $this->checkPermission('suppliers.view');
        if ($perm) return $perm;

        try {
            $supplier = Supplier::findOrFail($id);
            $this->logAudit('view_supplier', 'supplier', $supplier->supplier_id, "Viewed supplier: {$supplier->supplier_name}");
            return $this->successResponse($supplier, 'Supplier retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Supplier not found');
        }
    }

    /**
     * Create a new supplier
     * Permission: suppliers.create
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('suppliers.create');
        if ($perm) return $perm;

        try {
            $request->validate([
                'supplier_name'   => 'required|string|max:255',
                'contact_person'  => 'nullable|string|max:255',
                'phone'           => 'nullable|string|max:20',
                'email'           => 'nullable|email|max:255|unique:suppliers,email',
                'status'          => 'sometimes|in:active,inactive,suspended',
            ]);

            DB::beginTransaction();
            $data = $request->only(['supplier_name', 'contact_person', 'phone', 'email']);
            $data['status'] = $request->input('status', 'active');
            $supplier = Supplier::create($data);
            DB::commit();

            $this->logAudit('create_supplier', 'supplier', $supplier->supplier_id,
                "Created supplier: {$supplier->supplier_name} (status: {$supplier->status})");
            return $this->created($supplier, 'Supplier created successfully');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create supplier: ' . $e->getMessage());
        }
    }

    /**
     * Update supplier
     * Permission: suppliers.edit
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('suppliers.edit');
        if ($perm) return $perm;

        try {
            $supplier = Supplier::findOrFail($id);
            $request->validate([
                'supplier_name'   => 'sometimes|string|max:255',
                'contact_person'  => 'nullable|string|max:255',
                'phone'           => 'nullable|string|max:20',
                'email'           => 'nullable|email|max:255|unique:suppliers,email,' . $supplier->supplier_id . ',supplier_id',
                'status'          => 'sometimes|in:active,inactive,suspended',
            ]);

            $oldName = $supplier->supplier_name;
            $data = $request->only(['supplier_name', 'contact_person', 'phone', 'email', 'status']);
            $supplier->update($data);

            $this->logAudit('update_supplier', 'supplier', $supplier->supplier_id,
                "Updated supplier from '{$oldName}' to '{$supplier->supplier_name}'");
            return $this->successResponse($supplier, 'Supplier updated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to update supplier');
        }
    }

    /**
     * Soft delete supplier
     * Permission: suppliers.delete
     */
    public function destroy($id, Request $request)
    {
        $perm = $this->checkPermission('suppliers.delete');
        if ($perm) return $perm;

        try {
            $supplier = Supplier::findOrFail($id);
            $name = $supplier->supplier_name;
            $supplier->delete();
            $this->logAudit('delete_supplier', 'supplier', $id, "Soft-deleted supplier: {$name}");
            return $this->successResponse(null, 'Supplier deleted (soft delete)');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete supplier');
        }
    }

    /**
     * Restore soft-deleted supplier
     * Permission: suppliers.restore
     */
    public function restore($id, Request $request)
    {
        $perm = $this->checkPermission('suppliers.restore');
        if ($perm) return $perm;

        try {
            $supplier = Supplier::withTrashed()->findOrFail($id);
            $supplier->restore();
            $this->logAudit('restore_supplier', 'supplier', $id, "Restored supplier: {$supplier->supplier_name}");
            return $this->successResponse($supplier, 'Supplier restored');
        } catch (\Exception $e) {
            return $this->serverError('Failed to restore supplier');
        }
    }

    /**
     * Force delete supplier permanently (admin only)
     * Permission: suppliers.force_delete
     */
    public function forceDelete($id, Request $request)
    {
        $perm = $this->checkPermission('suppliers.force_delete');
        if ($perm) return $perm;

        try {
            $supplier = Supplier::withTrashed()->findOrFail($id);
            $name = $supplier->supplier_name;
            $supplier->forceDelete();
            $this->logAudit('force_delete_supplier', 'supplier', $id, "Permanently deleted supplier: {$name}");
            return $this->successResponse(null, 'Supplier permanently deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to permanently delete supplier');
        }
    }

    /**
     * Change supplier status
     * Permission: suppliers.edit
     */
    public function changeStatus(Request $request, $id)
    {
        $perm = $this->checkPermission('suppliers.edit');
        if ($perm) return $perm;

        try {
            $request->validate([
                'status' => 'required|in:active,inactive,suspended',
            ]);
            $supplier = Supplier::findOrFail($id);
            $oldStatus = $supplier->status;
            $supplier->setStatus($request->status);
            $this->logAudit('change_supplier_status', 'supplier', $supplier->supplier_id,
                "Changed status from {$oldStatus} to {$request->status} for supplier {$supplier->supplier_name}");
            return $this->successResponse($supplier, 'Supplier status updated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to change supplier status');
        }
    }


   
    /**
 * Supplier dropdown (id + name only)
 * Used for select inputs
 */
public function Suppliersdropdown(Request $request)
{
    $perm = $this->checkPermission('suppliers.view');
    if ($perm) return $perm;

    try {
        $query = Supplier::query()
            ->select('supplier_id', 'supplier_name')
            ->whereNull('deleted_at')
            ->orderBy('supplier_name', 'asc');

        // optional filter (active only if needed)
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', 'active');
        }

        $suppliers = $query->get();

        return $this->successResponse($suppliers, 'Supplier dropdown data retrieved');
    } catch (\Exception $e) {
        return $this->serverError('Failed to fetch supplier dropdown');
    }
}
}