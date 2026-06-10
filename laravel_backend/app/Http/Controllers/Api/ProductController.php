<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Product;
use App\Models\Inventory;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use App\Models\CollectionCenterInventory;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends BaseApiController
{
    use Auditable;

    /**
     * List products with filters
     * Permission: products.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('products.view');
        if ($perm) return $perm;

        try {
            $query = Product::with('category');
            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('imei', 'LIKE', "%{$search}%")
                      ->orWhere('sku', 'LIKE', "%{$search}%");
                });
            }
            $products = $query->orderBy('created_at', 'desc')
                             ->paginate($request->get('per_page', 15));
            $this->logAudit('view_products', 'product', null, 'Viewed products list');
            return $this->successResponse($products, 'Products retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch products');
        }
    }

    /**
     * Show single product
     * Permission: products.view
     */
    public function show($id)
    {
        $perm = $this->checkPermission('products.view');
        if ($perm) return $perm;

        try {
            $product = Product::with('category')->findOrFail($id);
            $this->logAudit('view_product', 'product', $product->product_id, "Viewed product IMEI: {$product->imei}");
            return $this->successResponse($product, 'Product retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Product not found');
        }
    }

    /**
     * Bulk create products (multiple IMEIs, one category & SKU)
     * Permission: products.create
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('products.create');
        if ($perm) return $perm;

        try {
            $request->validate([
                'category_id'    => 'required|string|exists:product_categories,category_id',
                'sku'            => 'required|string|max:255',
                'imeis'          => 'required|string',
                'buying_price'   => 'required|numeric|min:0',
                'selling_price'  => 'required|numeric|min:0',
                'status'         => 'sometimes|in:active,inactive,sold,damaged',
            ]);

            // Verify that the selected SKU belongs to the category's sku array
            $category = \App\Models\ProductCategory::find($request->category_id);
            if (!$category) {
                return $this->validationError(['category_id' => ['Category not found']]);
            }
            $validSkus = $category->sku ?? [];
            if (!in_array($request->sku, $validSkus)) {
                return $this->validationError(['sku' => ["SKU '{$request->sku}' is not valid for this category"]]);
            }

            // Parse IMEIs (newline, comma, space)
            $imeis = preg_split('/[\s,]+/', trim($request->imeis));
            $imeis = array_filter($imeis, fn($imei) => !empty($imei));
            if (empty($imeis)) {
                return $this->validationError(['imeis' => ['At least one IMEI is required']]);
            }

            $uniqueImeis = array_unique($imeis);
            if (count($imeis) !== count($uniqueImeis)) {
                return $this->validationError(['imeis' => ['Duplicate IMEIs in the list']]);
            }

            $existing = Product::whereIn('imei', $uniqueImeis)->pluck('imei')->toArray();
            if (!empty($existing)) {
                return $this->validationError(['imeis' => ['IMEIs already exist: ' . implode(', ', $existing)]]);
            }

            DB::beginTransaction();
            $created = [];
            foreach ($uniqueImeis as $imei) {
                $product = Product::create([
                    'category_id'    => $request->category_id,
                    'sku'            => $request->sku,
                    'imei'           => $imei,
                    'buying_price'   => $request->buying_price,
                    'selling_price'  => $request->selling_price,
                    'status'         => $request->input('status', 'active'),
                    'stock_status'   => 'in_stock',
                ]);
                $created[] = $product;
            }
            DB::commit();

            $this->logAudit('create_products', 'product', null,
                "Bulk created " . count($created) . " products for category {$request->category_id}, SKU {$request->sku}");

            return $this->created($created, count($created) . ' products created successfully');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create products: ' . $e->getMessage());
        }
    }

    /**
     * Update a single product
     * Permission: products.edit
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('products.edit');
        if ($perm) return $perm;

        try {
            $product = Product::findOrFail($id);

            $request->validate([
                'category_id'    => 'sometimes|string|exists:product_categories,category_id',
                'sku'            => 'nullable|string|max:255',
                'imei'           => 'nullable|string|max:255|unique:products,imei,' . $product->product_id . ',product_id',
                'buying_price'   => 'sometimes|numeric|min:0',
                'selling_price'  => 'sometimes|numeric|min:0',
                'status'         => 'sometimes|in:active,inactive,sold,damaged',
            ]);

            $data = $request->only(['category_id', 'sku', 'imei', 'buying_price', 'selling_price', 'status']);

            // If category or SKU is changed, validate SKU belongs to new category
            if (($request->has('category_id') && $request->category_id != $product->category_id) ||
                ($request->has('sku') && $request->sku != $product->sku)) {
                $catId = $request->category_id ?? $product->category_id;
                $sku = $request->sku ?? $product->sku;
                $category = \App\Models\ProductCategory::find($catId);
                if (!$category) {
                    return $this->validationError(['category_id' => ['Category not found']]);
                }
                $validSkus = $category->sku ?? [];
                if (!in_array($sku, $validSkus)) {
                    return $this->validationError(['sku' => ["SKU '{$sku}' is not valid for this category"]]);
                }
            }

            $product->update($data);

            $this->logAudit('update_product', 'product', $product->product_id,
                "Updated product IMEI: {$product->imei}");

            return $this->successResponse($product->load('category'), 'Product updated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to update product: ' . $e->getMessage());
        }
    }

    /**
     * Soft delete a product
     * Permission: products.delete
     */
    public function destroy($id, Request $request)
    {
        $perm = $this->checkPermission('products.delete');
        if ($perm) return $perm;

        try {
            $product = Product::findOrFail($id);
            $imei = $product->imei;
            $product->delete();
            $this->logAudit('delete_product', 'product', $id, "Soft-deleted product IMEI: {$imei}");
            return $this->successResponse(null, 'Product deleted (soft delete)');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete product');
        }
    }

    /**
     * Restore soft-deleted product
     * Permission: products.restore
     */
    public function restore($id, Request $request)
    {
        $perm = $this->checkPermission('products.restore');
        if ($perm) return $perm;

        try {
            $product = Product::withTrashed()->findOrFail($id);
            $product->restore();
            $this->logAudit('restore_product', 'product', $id, "Restored product IMEI: {$product->imei}");
            return $this->successResponse($product->load('category'), 'Product restored');
        } catch (\Exception $e) {
            return $this->serverError('Failed to restore product');
        }
    }

    /**
     * Force delete product permanently
     * Permission: products.force_delete
     */
    public function forceDelete($id, Request $request)
    {
        $perm = $this->checkPermission('products.force_delete');
        if ($perm) return $perm;

        try {
            $product = Product::withTrashed()->findOrFail($id);
            $product->forceDelete();
            $this->logAudit('force_delete_product', 'product', $id, "Permanently deleted product ID: {$id}");
            return $this->successResponse(null, 'Product permanently deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to permanently delete product');
        }
    }

    /**
     * Change product status
     * Permission: products.change_status
     */
    public function changeStatus(Request $request, $id)
    {
        $perm = $this->checkPermission('products.change_status');
        if ($perm) return $perm;

        try {
            $request->validate([
                'status' => 'required|in:active,inactive,sold,damaged',
            ]);
            $product = Product::findOrFail($id);
            $oldStatus = $product->status;
            $product->setStatus($request->status);
            $this->logAudit('change_product_status', 'product', $product->product_id,
                "Changed status from {$oldStatus} to {$request->status} for product IMEI: {$product->imei}");
            return $this->successResponse($product, 'Product status updated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to change product status');
        }
    }

    // -------------------------------------------------------------------------
    // SCANNER ENDPOINTS
    // -------------------------------------------------------------------------

    public function scanByImei($imei)
    {
        $perm = $this->checkPermission('products.scan');
        if ($perm) return $perm;

        try {
            $product = Product::with('category')->where('imei', $imei)->first();
            if (!$product) {
                return $this->notFound('Product with this IMEI not found');
            }
            $this->logAudit('scan_imei', 'product', $product->product_id, "Scanned IMEI: {$imei}");
            return $this->successResponse($product, 'Product found');
        } catch (\Exception $e) {
            return $this->serverError('Failed to scan IMEI');
        }
    }

    public function scanImeiPost(Request $request)
    {
        $perm = $this->checkPermission('products.scan');
        if ($perm) return $perm;

        try {
            $request->validate(['imei' => 'required|string']);
            $imei = $request->imei;
            $product = Product::with('category')->where('imei', $imei)->first();
            if (!$product) {
                return $this->notFound('Product with this IMEI not found');
            }
            $this->logAudit('scan_imei', 'product', $product->product_id, "Scanned IMEI: {$imei}");
            return $this->successResponse($product, 'Product found');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to scan IMEI');
        }
    }

    public function assignImei(Request $request, $id)
    {
        $perm = $this->checkPermission('products.assign_imei');
        if ($perm) return $perm;

        try {
            $product = Product::findOrFail($id);
            $request->validate([
                'imei' => 'required|string|max:255|unique:products,imei,' . $product->product_id . ',product_id',
            ]);

            $oldImei = $product->imei;
            $product->imei = $request->imei;
            $product->save();

            $this->logAudit('assign_imei', 'product', $product->product_id, "Assigned IMEI: {$oldImei} → {$product->imei}");
            return $this->successResponse($product, 'IMEI assigned successfully');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to assign IMEI');
        }
    }

    // -------------------------------------------------------------------------
    // DROPDOWN ENDPOINTS
    // -------------------------------------------------------------------------

    /**
     * Products NOT in any inventory – available for warehouse addition
     */
     /**
 * Products NOT already in any Collection Center Inventory – available for CC addition
 */
 /**
 * Products NOT in any inventory (warehouse or collection center) – available for new addition
 */
public function Productdropdown(Request $request)
{
    $perm = $this->checkPermission('products.view');
    if ($perm) return $perm;

    try {
        // 1. Get all product IDs from warehouse inventory
        $warehouseProductIds = Inventory::pluck('product_ids')
            ->filter()
            ->flatMap(fn($ids) => is_array($ids) ? $ids : json_decode($ids, true) ?? [])
            ->unique()
            ->values()
            ->toArray();

        // 2. Get all product IDs from CC inventory
        $ccProductIds = CollectionCenterInventory::pluck('product_ids')
            ->filter()
            ->flatMap(fn($ids) => is_array($ids) ? $ids : json_decode($ids, true) ?? [])
            ->unique()
            ->values()
            ->toArray();

        // 3. Merge both arrays and remove duplicates
        $excludedIds = array_unique(array_merge($warehouseProductIds, $ccProductIds));

        // 4. Build product query, excluding those already used anywhere
        $products = Product::select('product_id', 'imei', 'sku', 'category_id', 'stock_status')
            ->with(['category' => fn($q) => $q->select('category_id', 'category_name', 'model')])
            ->where('status', 'active')
            ->where('stock_status', 'in_stock')
            ->whereNull('deleted_at')
            ->when(!empty($excludedIds), fn($q) => $q->whereNotIn('product_id', $excludedIds))
            ->when($request->filled('category_id'), fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->filled('search'), function ($q) use ($request) {
                $s = $request->search;
                $q->where(fn($q) => $q->where('imei', 'LIKE', "%{$s}%")
                                      ->orWhere('sku', 'LIKE', "%{$s}%"));
            })
            ->orderBy('imei')
            ->get()
            ->map(fn($p) => [
                'id'    => $p->product_id,
                'label' => ($p->category?->category_name ?? 'No Category') . ' | ' .
                           ($p->category?->model ?? 'No Model') . ' | ' .
                           ($p->sku ?? 'No SKU') . ' | IMEI: ' . ($p->imei ?? ''),
            ]);

        return $this->successResponse($products, 'Products available for addition retrieved');
    } catch (\Exception $e) {
        return $this->serverError('Failed to fetch available products: ' . $e->getMessage());
    }
}

    /**
     * Products currently in warehouse inventory (stock_status = in_stock) available to move to CC
     */

public function productsInInventoryDropdown(Request $request)
{
    // Permission check
    if (!$this->userCan('products.view')) {
        return $this->forbidden();
    }

    // Get all product IDs that are currently in ANY warehouse inventory
    $warehouseProductIds = Inventory::pluck('product_ids')
        ->filter()
        ->flatMap(fn($ids) => is_array($ids) ? $ids : json_decode($ids, true) ?? [])
        ->unique()
        ->values()
        ->toArray();

    // Get all product IDs that are already in ANY CC inventory
    $ccProductIds = CollectionCenterInventory::pluck('product_ids')
        ->filter()
        ->flatMap(fn($ids) => is_array($ids) ? $ids : json_decode($ids, true) ?? [])
        ->unique()
        ->toArray();

    // Available = in warehouse but NOT in any CC
    $availableIds = array_diff($warehouseProductIds, $ccProductIds);

    if (empty($availableIds)) {
        return $this->successResponse([], 'No products available to move');
    }

    $products = Product::whereIn('product_id', $availableIds)
        ->where('stock_status', 'in_stock')
        ->with('category')
        ->get()
        ->map(fn($p) => [
            'id'    => $p->product_id,
            'label' => "Cate: {$p->category?->category_name}, Model: {$p->category?->model}, SKU: {$p->sku} | IMEI: {$p->imei}",
        ]);

    return $this->successResponse($products);
}


}