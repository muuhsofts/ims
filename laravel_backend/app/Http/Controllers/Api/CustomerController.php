<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Customer;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class CustomerController extends BaseApiController
{
    use Auditable;

    /**
     * List customers (with filters & soft-deleted)
     * - ADMIN / MANAGER: all customers
     * - SALES AGENT: only customers created by the logged-in agent
     * Permission: customers.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('customers.view');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $query = Customer::query();

            // Role‑based restriction
            if ($authUser->isSalesAgent()) {
                // Agent sees only customers they created
                $query->where('created_by', $authUser->id);
            }
            // ADMIN/MANAGER: no extra filter (view all)

            // Include trashed records if requested
            if ($request->boolean('trashed')) {
                $query->onlyTrashed();
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('customer_name', 'LIKE', "%{$search}%")
                      ->orWhere('msisdn', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%");
                });
            }

            $customers = $query->orderBy('created_at', 'desc')->paginate(15);
            $message = $authUser->isSalesAgent() ? 'Your customers retrieved' : 'Customers retrieved';
            return $this->successResponse($customers, $message);
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch customers', $e);
        }
    }

    /**
     * Get customers created by the logged-in user
     * (useful for agents to see only their own, or for admin/manager to see a specific creator)
     * Permission: customers.view
     */
    public function myCustomers(Request $request)
    {
        $perm = $this->checkPermission('customers.view');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $query = Customer::where('created_by', $authUser->id);

            if ($request->boolean('trashed')) {
                $query->onlyTrashed();
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('customer_name', 'LIKE', "%{$search}%")
                      ->orWhere('msisdn', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%");
                });
            }

            $customers = $query->orderBy('created_at', 'desc')->paginate(15);
            return $this->successResponse($customers, 'Customers created by you');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch your customers', $e);
        }
    }

    /**
     * Show single customer
     * - ADMIN / MANAGER: can view any customer
     * - SALES AGENT: can view only customers they created
     * Permission: customers.view
     */
    public function show($id)
    {
        $perm = $this->checkPermission('customers.view');
        if ($perm) return $perm;

        try {
            $authUser = request()->user();
            $customer = Customer::findOrFail($id);

            // Agent can only see their own customers
            if ($authUser->isSalesAgent() && $customer->created_by !== $authUser->id) {
                return $this->forbidden('You can only view customers you created');
            }

            return $this->successResponse($customer, 'Customer retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Customer not found');
        }
    }

    /**
     * Create a new customer
     * (automatically sets created_by to the logged-in user)
     * Permission: customers.create
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('customers.create');
        if ($perm) return $perm;

        try {
            $validated = $request->validate([
                'customer_name' => 'required|string|max:255',
                'nida'          => 'nullable|string|max:50',
                'msisdn'        => 'nullable|string|max:20',
                'email'         => 'nullable|email|max:255',
                'status'        => 'sometimes|in:active,inactive',
            ]);

            DB::beginTransaction();

            // created_by will be set automatically in the model's boot method
            $customer = Customer::create($validated + [
                'status' => $validated['status'] ?? 'active'
            ]);

            DB::commit();

            $this->logAudit('create_customer', 'customer', $customer->customer_id, "Created customer: {$customer->customer_name}");
            return $this->created($customer, 'Customer created successfully');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create customer: ' . $e->getMessage(), $e);
        }
    }

    /**
     * Update customer
     * - ADMIN / MANAGER: can update any customer
     * - SALES AGENT: can update only customers they created
     * Permission: customers.edit
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('customers.edit');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $customer = Customer::findOrFail($id);

            // Agent can only edit their own customers
            if ($authUser->isSalesAgent() && $customer->created_by !== $authUser->id) {
                return $this->forbidden('You can only edit customers you created');
            }

            $validated = $request->validate([
                'customer_name' => 'sometimes|string|max:255',
                'nida'          => 'nullable|string|max:50',
                'msisdn'        => 'nullable|string|max:20',
                'email'         => 'nullable|email|max:255',
                'status'        => 'sometimes|in:active,inactive',
            ]);

            $customer->update($validated);

            $this->logAudit('update_customer', 'customer', $customer->customer_id, "Updated customer: {$customer->customer_name}");
            return $this->successResponse($customer, 'Customer updated');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to update customer', $e);
        }
    }

    /**
     * Soft delete customer
     * - ADMIN / MANAGER: can delete any customer
     * - SALES AGENT: can delete only customers they created
     * Permission: customers.delete
     */
    public function destroy($id)
    {
        $perm = $this->checkPermission('customers.delete');
        if ($perm) return $perm;

        try {
            $authUser = request()->user();
            $customer = Customer::findOrFail($id);

            // Agent can only delete their own customers
            if ($authUser->isSalesAgent() && $customer->created_by !== $authUser->id) {
                return $this->forbidden('You can only delete customers you created');
            }

            $customer->delete();
            $this->logAudit('delete_customer', 'customer', $id, "Deleted customer: {$customer->customer_name}");
            return $this->successResponse(null, 'Customer deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete customer', $e);
        }
    }

    /**
     * Restore soft-deleted customer
     * - ADMIN / MANAGER: can restore any customer
     * - SALES AGENT: can restore only customers they created
     * Permission: customers.restore
     */
    public function restore($id)
    {
        $perm = $this->checkPermission('customers.restore');
        if ($perm) return $perm;

        try {
            $authUser = request()->user();
            $customer = Customer::withTrashed()->findOrFail($id);

            // Agent can only restore their own customers
            if ($authUser->isSalesAgent() && $customer->created_by !== $authUser->id) {
                return $this->forbidden('You can only restore customers you created');
            }

            $customer->restore();
            $this->logAudit('restore_customer', 'customer', $id, "Restored customer: {$customer->customer_name}");
            return $this->successResponse($customer, 'Customer restored');
        } catch (\Exception $e) {
            return $this->serverError('Failed to restore customer', $e);
        }
    }
}