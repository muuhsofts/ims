<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Purchase;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class PurchaseController extends BaseApiController
{
    use Auditable;

    public function index(Request $request)
    {
        $perm = $this->checkPermission('purchases.view');
        if ($perm) return $perm;

        try {
            $query = Purchase::with(['supplier', 'category']);
            if ($request->filled('supplier_id')) {
                $query->where('supplier_id', $request->supplier_id);
            }
            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('search')) {
                $search = $request->search;
                $query->whereHas('supplier', function($q) use ($search) {
                    $q->where('supplier_name', 'LIKE', "%{$search}%");
                })->orWhereHas('category', function($q) use ($search) {
                    $q->where('category_name', 'LIKE', "%{$search}%");
                });
            }
            $purchases = $query->orderBy('created_at', 'desc')
                               ->paginate($request->get('per_page', 15));
            $this->logAudit('view_purchases', 'purchase', null, 'Viewed purchases list');
            return $this->successResponse($purchases, 'Purchases retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch purchases');
        }
    }

    public function show($id)
    {
        $perm = $this->checkPermission('purchases.view');
        if ($perm) return $perm;

        try {
            $purchase = Purchase::with(['supplier', 'category'])->findOrFail($id);
            $this->logAudit('view_purchase', 'purchase', $purchase->purchase_id, "Viewed purchase #{$purchase->purchase_id}");
            return $this->successResponse($purchase, 'Purchase retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Purchase not found');
        }
    }

    public function store(Request $request)
    {
        $perm = $this->checkPermission('purchases.create');
        if ($perm) return $perm;

        try {
            $request->validate([
                'supplier_id'      => 'required|string|exists:suppliers,supplier_id',
                'category_id'      => 'required|string|exists:product_categories,category_id',
                'selected_skus'    => 'required|array',                // <-- new validation
                'selected_skus.*'  => 'string',
                'quantity_ordered' => 'required|integer|min:1',
                'unit_price'       => 'required|numeric|min:0',
                'subtotal'         => 'nullable|numeric|min:0',  
                'status'           => 'sometimes|in:pending,completed,cancelled',
            ]);

            DB::beginTransaction();
            $data = $request->only(['supplier_id', 'category_id', 'quantity_ordered', 'unit_price', 'subtotal']);
            $data['selected_skus'] = $request->selected_skus;  // will be cast to JSON
            $data['status'] = $request->input('status', 'pending');
            $purchase = Purchase::create($data);
            DB::commit();

            $this->logAudit('create_purchase', 'purchase', $purchase->purchase_id,
                "Created purchase #{$purchase->purchase_id} for supplier {$purchase->supplier_id}");
            return $this->created($purchase->load(['supplier', 'category']), 'Purchase created successfully');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create purchase: ' . $e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('purchases.edit');
        if ($perm) return $perm;

        try {
            $purchase = Purchase::findOrFail($id);
            $request->validate([
                'quantity_ordered' => 'sometimes|integer|min:1',
                'unit_price'       => 'sometimes|numeric|min:0',
                'subtotal'         => 'nullable|numeric|min:0',
                'selected_skus'    => 'nullable|array',
                'selected_skus.*'  => 'string',
                'status'           => 'sometimes|in:pending,completed,cancelled',
            ]);

            $data = $request->only(['quantity_ordered', 'unit_price', 'subtotal', 'selected_skus', 'status']);
            $purchase->update($data);

            $this->logAudit('update_purchase', 'purchase', $purchase->purchase_id, "Updated purchase #{$purchase->purchase_id}");
            return $this->successResponse($purchase->load(['supplier', 'category']), 'Purchase updated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to update purchase');
        }
    }

    public function updateStatus(Request $request, $id)
    {
        $perm = $this->checkPermission('purchases.edit');
        if ($perm) return $perm;

        try {
            $request->validate([
                'status' => 'required|in:pending,completed,cancelled',
            ]);

            $purchase = Purchase::findOrFail($id);
            $oldStatus = $purchase->status;
            $purchase->updateStatus($request->status);

            $this->logAudit('update_purchase_status', 'purchase', $purchase->purchase_id,
                "Changed status from {$oldStatus} to {$request->status}");
            return $this->successResponse($purchase, 'Purchase status updated');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to update purchase status');
        }
    }

    public function destroy($id, Request $request)
    {
        $perm = $this->checkPermission('purchases.delete');
        if ($perm) return $perm;

        try {
            $purchase = Purchase::findOrFail($id);
            $purchaseId = $purchase->purchase_id;
            $purchase->delete();

            $this->logAudit('delete_purchase', 'purchase', $id, "Deleted purchase #{$purchaseId}");
            return $this->successResponse(null, 'Purchase deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete purchase');
        }
    }
}