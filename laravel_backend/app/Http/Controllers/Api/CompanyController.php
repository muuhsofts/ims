<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Company;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class CompanyController extends BaseApiController
{
    use Auditable;

    /**
     * List all companies
     * Permission: companies.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('companies.view');
        if ($perm) return $perm;

        try {
            $query = Company::with('creator');

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $query->search($request->search);
            }

            $companies = $query->orderBy('company_name', 'asc')
                ->paginate($request->get('per_page', 15));

            $this->logAudit('view_companies', 'company', null, 'Viewed companies list');
            return $this->successResponse($companies, 'Companies retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch companies: ' . $e->getMessage());
        }
    }

    /**
     * Get companies as dropdown
     * Permission: companies.view
     */
    public function companyDropdown(Request $request)
    {
        $perm = $this->checkPermission('companies.view');
        if ($perm) return $perm;

        try {
            $companies = Company::select('id', 'company_name', 'address')
                ->where('status', 'active')
                ->when($request->filled('search'), function ($q) use ($request) {
                    $s = $request->search;
                    $q->where('company_name', 'LIKE', "%{$s}%")
                      ->orWhere('address', 'LIKE', "%{$s}%");
                })
                ->orderBy('company_name')
                ->limit(50)
                ->get()
                ->map(fn($company) => [
                    'id'    => $company->id,
                    'label' => $company->company_name . ($company->address ? ' — ' . $company->address : ''),
                ]);

            return $this->successResponse($companies, 'Companies dropdown retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch companies dropdown: ' . $e->getMessage());
        }
    }

    /**
     * Show single company
     * Permission: companies.view
     */
    public function show($id)
    {
        $perm = $this->checkPermission('companies.view');
        if ($perm) return $perm;

        try {
            $company = Company::with('creator')->findOrFail($id);
            return $this->successResponse($company, 'Company retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFound('Company not found');
        }
    }

    /**
     * Create a new company
     * Permission: companies.create
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('companies.create');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();

            $validated = $request->validate([
                'company_name' => 'required|string|max:255|unique:companies,company_name',
                'address'      => 'nullable|string',
                'phone'        => 'nullable|string|max:20',
                'email'        => 'nullable|email|max:255',
                'status'       => 'sometimes|in:active,inactive',
            ]);

            DB::beginTransaction();

            $company = Company::create([
                'company_name' => $validated['company_name'],
                'address'      => $validated['address'] ?? null,
                'phone'        => $validated['phone'] ?? null,
                'email'        => $validated['email'] ?? null,
                'status'       => $validated['status'] ?? 'active',
                'created_by'   => $authUser->id,
            ]);

            DB::commit();

            $this->logAudit(
                'create_company',
                'company',
                $company->id,
                "Created company: {$company->company_name}"
            );

            return $this->created(
                $company->load('creator'),
                'Company created successfully'
            );
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create company: ' . $e->getMessage());
        }
    }

    /**
     * Update company
     * Permission: companies.edit
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('companies.edit');
        if ($perm) return $perm;

        try {
            $company = Company::findOrFail($id);

            $validated = $request->validate([
                'company_name' => 'sometimes|string|max:255|unique:companies,company_name,' . $company->id . ',id',
                'address'      => 'nullable|string',
                'phone'        => 'nullable|string|max:20',
                'email'        => 'nullable|email|max:255',
                'status'       => 'sometimes|in:active,inactive',
            ]);

            DB::beginTransaction();

            $company->update($validated);

            DB::commit();

            $this->logAudit(
                'update_company',
                'company',
                $company->id,
                "Updated company: {$company->company_name}"
            );

            return $this->successResponse(
                $company->load('creator'),
                'Company updated successfully'
            );
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to update company: ' . $e->getMessage());
        }
    }

    /**
     * Soft delete company
     * Permission: companies.delete
     */
    public function destroy($id)
    {
        $perm = $this->checkPermission('companies.delete');
        if ($perm) return $perm;

        try {
            $company = Company::findOrFail($id);
            $companyName = $company->company_name;
            $company->delete();

            $this->logAudit(
                'delete_company',
                'company',
                $id,
                "Deleted company: {$companyName}"
            );

            return $this->successResponse(null, 'Company deleted successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete company: ' . $e->getMessage());
        }
    }

    /**
     * Restore soft-deleted company
     * Permission: companies.restore
     */
    public function restore($id)
    {
        $perm = $this->checkPermission('companies.restore');
        if ($perm) return $perm;

        try {
            $company = Company::withTrashed()->findOrFail($id);
            $company->restore();

            $this->logAudit(
                'restore_company',
                'company',
                $id,
                "Restored company: {$company->company_name}"
            );

            return $this->successResponse(
                $company->load('creator'),
                'Company restored successfully'
            );
        } catch (\Exception $e) {
            return $this->serverError('Failed to restore company: ' . $e->getMessage());
        }
    }

    /**
     * Force delete company (permanently)
     * Permission: companies.delete
     */
    public function forceDelete($id)
    {
        $perm = $this->checkPermission('companies.delete');
        if ($perm) return $perm;

        try {
            $company = Company::withTrashed()->findOrFail($id);
            $companyName = $company->company_name;
            $company->forceDelete();

            $this->logAudit(
                'force_delete_company',
                'company',
                $id,
                "Permanently deleted company: {$companyName}"
            );

            return $this->successResponse(null, 'Company permanently deleted successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to force delete company: ' . $e->getMessage());
        }
    }

    /**
     * Get trashed companies
     * Permission: companies.view
     */
    public function trashed(Request $request)
    {
        $perm = $this->checkPermission('companies.view');
        if ($perm) return $perm;

        try {
            $query = Company::onlyTrashed()->with('creator');

            if ($request->filled('search')) {
                $query->search($request->search);
            }

            $companies = $query->orderBy('deleted_at', 'desc')
                ->paginate($request->get('per_page', 15));

            return $this->successResponse($companies, 'Trashed companies retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch trashed companies: ' . $e->getMessage());
        }
    }

    /**
     * Get company statistics
     * Permission: companies.view
     */
    public function stats()
    {
        $perm = $this->checkPermission('companies.view');
        if ($perm) return $perm;

        try {
            $stats = [
                'total' => Company::count(),
                'active' => Company::where('status', 'active')->count(),
                'inactive' => Company::where('status', 'inactive')->count(),
                'trashed' => Company::onlyTrashed()->count(),
            ];

            $this->logAudit('view_company_stats', 'company', null, 'Viewed company statistics');
            return $this->successResponse($stats, 'Company statistics retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch company statistics: ' . $e->getMessage());
        }
    }

    /**
     * Toggle company status
     * Permission: companies.edit
     */
    public function toggleStatus($id)
    {
        $perm = $this->checkPermission('companies.edit');
        if ($perm) return $perm;

        try {
            $company = Company::findOrFail($id);
            $company->status = $company->status === 'active' ? 'inactive' : 'active';
            $company->save();

            $this->logAudit(
                'toggle_company_status',
                'company',
                $company->id,
                "Toggled company status to: {$company->status} for {$company->company_name}"
            );

            return $this->successResponse(
                $company->load('creator'),
                "Company status updated to: {$company->status}"
            );
        } catch (\Exception $e) {
            return $this->serverError('Failed to toggle company status: ' . $e->getMessage());
        }
    }
}