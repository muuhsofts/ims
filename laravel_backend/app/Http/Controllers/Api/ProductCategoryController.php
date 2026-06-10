<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\ProductCategory;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class ProductCategoryController extends BaseApiController
{
    use Auditable;

    public function index(Request $request)
    {
        $perm = $this->checkPermission('categories.view');
        if ($perm) return $perm;

        try {
            $query = ProductCategory::query();
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('category_name', 'LIKE', "%{$search}%")
                      ->orWhere('model', 'LIKE', "%{$search}%")
                      ->orWhereRaw('JSON_SEARCH(sku, "one", ?) IS NOT NULL', ["%{$search}%"]);
                });
            }
            $categories = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));
            $this->logAudit('view_product_categories', 'product_category', null, 'Viewed categories list');
            return $this->successResponse($categories, 'Categories retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch categories');
        }
    }

    public function show($id, Request $request)
    {
        $perm = $this->checkPermission('categories.view');
        if ($perm) return $perm;

        try {
            $category = ProductCategory::findOrFail($id);
            $this->logAudit('view_product_category', 'product_category', $category->category_id, "Viewed category: {$category->category_name}");
            return $this->successResponse($category, 'Category retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFound('Category not found');
        }
    }

    public function store(Request $request)
    {
        $perm = $this->checkPermission('categories.create');
        if ($perm) return $perm;

        try {
            $request->validate([
                'category_name' => 'required|string|max:255',
                'model'         => 'nullable|string|max:255',
                'sku'           => 'nullable|array',
                'sku.*'         => 'nullable|string|max:255',
                'status'        => 'sometimes|in:active,inactive',
            ]);

            DB::beginTransaction();

            $category = ProductCategory::create([
                'category_name' => $request->category_name,
                'model'         => $request->model,
                'sku'           => $request->sku ?? [],
                'status'        => $request->input('status', 'active'),
            ]);

            DB::commit();

            $this->logAudit(
                'create_product_category',
                'product_category',
                $category->category_id,
                "Created category: {$category->category_name}"
            );

            return $this->created($category, 'Category created successfully');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create category');
        }
    }

    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('categories.edit');
        if ($perm) return $perm;

        try {
            $category = ProductCategory::findOrFail($id);

            $request->validate([
                'category_name' => 'sometimes|string|max:255',
                'model'         => 'nullable|string|max:255',
                'sku'           => 'nullable|array',
                'sku.*'         => 'nullable|string|max:255',
                'status'        => 'sometimes|in:active,inactive',
            ]);

            $oldData = $category->toArray();

            $category->update($request->only(['category_name', 'model', 'sku', 'status']));

            $this->logAudit(
                'update_product_category',
                'product_category',
                $category->category_id,
                "Updated category: {$category->category_name}",
                $oldData,
                $category->fresh()->toArray()
            );

            return $this->successResponse($category->fresh(), 'Category updated successfully');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to update category');
        }
    }

    public function destroy(Request $request, $id)
    {
        $perm = $this->checkPermission('categories.delete');
        if ($perm) return $perm;

        try {
            $category = ProductCategory::findOrFail($id);
            $oldData = $category->toArray();
            $categoryName = $category->category_name;
            $category->delete();

            $this->logAudit('delete_product_category', 'product_category', $id, "Deleted category: {$categoryName}", $oldData, null);
            return $this->successResponse(null, 'Category deleted successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete category');
        }
    }

    public function activate(Request $request, $id)
    {
        $perm = $this->checkPermission('categories.edit');
        if ($perm) return $perm;
        try {
            $category = ProductCategory::findOrFail($id);
            $oldData = $category->toArray();
            $category->update(['status' => 'active']);
            $this->logAudit('activate_product_category', 'product_category', $category->category_id, "Activated category: {$category->category_name}", $oldData, $category->fresh()->toArray());
            return $this->successResponse($category->fresh(), 'Category activated successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to activate category');
        }
    }

    public function deactivate(Request $request, $id)
    {
        $perm = $this->checkPermission('categories.edit');
        if ($perm) return $perm;
        try {
            $category = ProductCategory::findOrFail($id);
            $oldData = $category->toArray();
            $category->update(['status' => 'inactive']);
            $this->logAudit('deactivate_product_category', 'product_category', $category->category_id, "Deactivated category: {$category->category_name}", $oldData, $category->fresh()->toArray());
            return $this->successResponse($category->fresh(), 'Category deactivated successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to deactivate category');
        }
    }

    public function toggleStatus(Request $request, $id)
    {
        $perm = $this->checkPermission('categories.edit');
        if ($perm) return $perm;

        try {
            $category = ProductCategory::findOrFail($id);
            $oldData = $category->toArray();
            $newStatus = $category->status === 'active' ? 'inactive' : 'active';
            $category->update(['status' => $newStatus]);

            $this->logAudit(
                'toggle_status_product_category',
                'product_category',
                $category->category_id,
                "Changed status of {$category->category_name} to {$newStatus}",
                $oldData,
                $category->fresh()->toArray()
            );

            return $this->successResponse($category->fresh(), "Category status changed to {$newStatus}");
        } catch (\Exception $e) {
            return $this->serverError('Failed to change category status');
        }
    }

    public function productCategoryDropdown(Request $request)
    {
        $perm = $this->checkPermission('categories.view');
        if ($perm) return $perm;

        try {
            $query = ProductCategory::select(
                'category_id',
                'category_name as name',
                'model as code',
                'sku',
                'status'
            );

            if (!$request->filled('include_inactive')) {
                $query->where('status', 'active');
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('category_name', 'LIKE', "%{$search}%")
                      ->orWhere('model', 'LIKE', "%{$search}%")
                      ->orWhereRaw('JSON_SEARCH(sku, "one", ?) IS NOT NULL', ["%{$search}%"]);
                });
            }

            $categories = $query->orderBy('category_name')->limit(100)->get();

            $formatted = $categories->map(function ($category) {
                $skus = $category->sku ?? []; // already an array due to casting
                $label = $category->name;
                if ($category->code) {
                    $label .= " ({$category->code})";
                }
                if (!empty($skus)) {
                    $label .= ' - ' . implode(', ', $skus);
                }

                return [
                    'value'  => $category->category_id,
                    'label'  => $label,
                    'name'   => $category->name,
                    'code'   => $category->code ?? '',
                    'skus'   => $skus,   // array of SKUs
                    'status' => $category->status,
                ];
            });

            return $this->successResponse($formatted, 'Product categories dropdown retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('Category dropdown error: ' . $e->getMessage());
            return $this->serverError('Failed to fetch category dropdown');
        }
    }
}