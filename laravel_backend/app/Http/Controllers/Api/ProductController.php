<?php
// app/Http/Controllers/Api/ProductController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Inventory;
use App\Models\Purchase;
use App\Models\CollectionCenterInventory;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductController extends BaseApiController
{
    use Auditable;

    // =====================================================================
    // LIST / SHOW
    // =====================================================================

    public function index(Request $request)
    {
        if ($perm = $this->checkPermission('products.view')) return $perm;

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

    public function show($id)
    {
        if ($perm = $this->checkPermission('products.view')) return $perm;

        try {
            $product = Product::with('category')->findOrFail($id);
            $this->logAudit('view_product', 'product', $product->product_id, "Viewed product IMEI: {$product->imei}");
            return $this->successResponse($product, 'Product retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Product not found');
        }
    }

    // =====================================================================
    // CREATE / UPDATE
    // =====================================================================

    public function store(Request $request)
    {
        if ($perm = $this->checkPermission('products.create')) return $perm;

        try {
            $request->validate([
                'category_id'                       => 'required|string|exists:product_categories,category_id',
                'sku'                               => 'required|string|max:255',
                'imeis'                             => 'required|string',
                'buying_price'                      => 'sometimes|numeric|min:0|nullable',
                'cash_selling_price'                => 'sometimes|numeric|min:0|nullable',
                'loan_selling_price'                => 'required|array|min:1',
                'loan_selling_price.*.company_id'   => 'required|string|exists:companies,id',
                'loan_selling_price.*.price'        => 'required|numeric|min:0',
                'status'                            => 'sometimes|in:active,inactive,sold,damaged',
            ]);

            $category = ProductCategory::find($request->category_id);
            if (!$category) {
                return $this->validationError(['category_id' => ['Category not found']]);
            }

            $validSkus = $category->sku ?? [];
            if (!in_array($request->sku, $validSkus)) {
                return $this->validationError(['sku' => ["SKU '{$request->sku}' is not valid for this category"]]);
            }

            $imeis = preg_split('/[\s,]+/', trim($request->imeis));
            $imeis = array_filter($imeis, fn ($imei) => !empty($imei));

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

            // Buying price
            $buyingPrice = $request->buying_price;
            if (empty($buyingPrice)) {
                $buyingPrice = $this->getBuyingPriceFromPurchase($request->category_id, $request->sku);
                if ($buyingPrice === null) {
                    return $this->validationError(['buying_price' => ['No purchase record found for this category and SKU. Please enter buying price manually.']]);
                }
            }

            // Purchase quantity guard
            $totalPurchased    = $this->getTotalPurchasedQuantity($request->category_id, $request->sku);
            $existingProducts  = Product::where('category_id', $request->category_id)
                ->where('sku', $request->sku)
                ->count();
            $newTotal = $existingProducts + count($uniqueImeis);

            if ($totalPurchased > 0 && $newTotal > $totalPurchased) {
                return $this->validationError([
                    'imeis' => [
                        "Cannot add " . count($uniqueImeis) . " products. Only " .
                        ($totalPurchased - $existingProducts) .
                        " more items available from purchase (Total purchased: {$totalPurchased}, Already added: {$existingProducts})."
                    ]
                ]);
            }

            $loanPrices = $this->formatLoanPrices($request->loan_selling_price);

            DB::beginTransaction();
            $created = [];
            foreach ($uniqueImeis as $imei) {
                $created[] = Product::create([
                    'category_id'        => $request->category_id,
                    'sku'                => $request->sku,
                    'imei'               => $imei,
                    'buying_price'       => $buyingPrice,
                    'cash_selling_price' => $request->cash_selling_price ?? null,
                    'loan_selling_price' => $loanPrices,
                    'status'             => $request->input('status', 'active'),
                    'stock_status'       => 'in_stock',
                ]);
            }
            DB::commit();

            $this->logAudit('create_products', 'product', null,
                "Bulk created " . count($created) . " products with company loan prices");

            return $this->created($created, count($created) . ' products created successfully');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create products: ' . $e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        if ($perm = $this->checkPermission('products.edit')) return $perm;

        try {
            $product = Product::findOrFail($id);

            $request->validate([
                'category_id'                       => 'sometimes|string|exists:product_categories,category_id',
                'sku'                               => 'nullable|string|max:255',
                'imei'                              => 'nullable|string|max:255|unique:products,imei,' . $product->product_id . ',product_id',
                'buying_price'                      => 'sometimes|numeric|min:0',
                'cash_selling_price'                => 'sometimes|numeric|min:0|nullable',
                'loan_selling_price'                => 'sometimes|array|min:1',
                'loan_selling_price.*.company_id'   => 'required|string|exists:companies,id',
                'loan_selling_price.*.price'        => 'required|numeric|min:0',
                'status'                            => 'sometimes|in:active,inactive,sold,damaged',
            ]);

            $data = $request->only([
                'category_id', 'sku', 'imei',
                'buying_price', 'cash_selling_price', 'status',
            ]);

            if ($request->has('loan_selling_price')) {
                $loanPrices = $this->formatLoanPrices($request->loan_selling_price);
                $data['loan_selling_price'] = !empty($loanPrices) ? $loanPrices : null;
            }

            // Validate SKU against category if either changed
            if (($request->filled('category_id') && $request->category_id != $product->category_id) ||
                ($request->filled('sku') && $request->sku != $product->sku)) {

                $catId = $request->category_id ?? $product->category_id;
                $sku   = $request->sku ?? $product->sku;

                $category = ProductCategory::find($catId);
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
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to update product: ' . $e->getMessage());
        }
    }

    // =====================================================================
    // DELETE / RESTORE
    // =====================================================================

    public function destroy($id, Request $request)
    {
        if ($perm = $this->checkPermission('products.delete')) return $perm;

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

    public function restore($id, Request $request)
    {
        if ($perm = $this->checkPermission('products.restore')) return $perm;

        try {
            $product = Product::withTrashed()->findOrFail($id);
            $product->restore();

            $this->logAudit('restore_product', 'product', $id, "Restored product IMEI: {$product->imei}");
            return $this->successResponse($product->load('category'), 'Product restored');
        } catch (\Exception $e) {
            return $this->serverError('Failed to restore product');
        }
    }

    public function forceDelete($id, Request $request)
    {
        if ($perm = $this->checkPermission('products.force_delete')) return $perm;

        try {
            $product = Product::withTrashed()->findOrFail($id);
            $product->forceDelete();

            $this->logAudit('force_delete_product', 'product', $id, "Permanently deleted product ID: {$id}");
            return $this->successResponse(null, 'Product permanently deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to permanently delete product');
        }
    }

    public function changeStatus(Request $request, $id)
    {
        if ($perm = $this->checkPermission('products.change_status')) return $perm;

        try {
            $request->validate([
                'status' => 'required|in:active,inactive,sold,damaged',
            ]);

            $product   = Product::findOrFail($id);
            $oldStatus = $product->status;
            $product->setStatus($request->status);

            $this->logAudit('change_product_status', 'product', $product->product_id,
                "Changed status from {$oldStatus} to {$request->status} for product IMEI: {$product->imei}");

            return $this->successResponse($product, 'Product status updated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to change product status');
        }
    }

    // =====================================================================
    // SCANNER
    // =====================================================================

    public function scanByImei($imei)
    {
        if ($perm = $this->checkPermission('products.scan')) return $perm;

        return $this->findByImeiResponse($imei);
    }

    public function scanImeiPost(Request $request)
    {
        if ($perm = $this->checkPermission('products.scan')) return $perm;

        try {
            $request->validate(['imei' => 'required|string']);
            return $this->findByImeiResponse($request->imei);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        }
    }

    public function assignImei(Request $request, $id)
    {
        if ($perm = $this->checkPermission('products.assign_imei')) return $perm;

        try {
            $product = Product::findOrFail($id);

            $request->validate([
                'imei' => 'required|string|max:255|unique:products,imei,' . $product->product_id . ',product_id',
            ]);

            $oldImei = $product->imei;
            $product->imei = $request->imei;
            $product->save();

            $this->logAudit('assign_imei', 'product', $product->product_id,
                "Assigned IMEI: {$oldImei} → {$product->imei}");

            return $this->successResponse($product, 'IMEI assigned successfully');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to assign IMEI');
        }
    }

    // =====================================================================
    // DROPDOWNS
    // =====================================================================

    public function getPurchaseInfo(Request $request)
    {
        try {
            $request->validate([
                'category_id' => 'required|string|exists:product_categories,category_id',
                'sku'         => 'required|string',
            ]);

            $categoryId = $request->category_id;
            $sku        = $request->sku;

            $latestPurchase = Purchase::where('category_id', $categoryId)
                ->where('status', 'completed')
                ->whereJsonContains('selected_skus', $sku)
                ->orderBy('created_at', 'desc')
                ->first();

            $totalPurchased = Purchase::where('category_id', $categoryId)
                ->where('status', 'completed')
                ->whereJsonContains('selected_skus', $sku)
                ->sum('quantity_ordered');

            $currentCount = Product::where('category_id', $categoryId)
                ->where('sku', $sku)
                ->count();

            $purchases = Purchase::where('category_id', $categoryId)
                ->where('status', 'completed')
                ->whereJsonContains('selected_skus', $sku)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn ($p) => [
                    'purchase_id'      => $p->purchase_id,
                    'quantity_ordered' => $p->quantity_ordered,
                    'unit_price'       => $p->unit_price,
                    'created_at'       => $p->created_at,
                ]);

            return $this->successResponse([
                'unit_price'        => $latestPurchase?->unit_price,
                'total_purchased'   => $totalPurchased,
                'current_count'     => $currentCount,
                'available_to_add'  => max(0, $totalPurchased - $currentCount),
                'purchase_exists'   => $latestPurchase !== null,
                'purchases'         => $purchases,
            ], 'Purchase info retrieved successfully');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch purchase info: ' . $e->getMessage());
        }
    }

    public function Productdropdown(Request $request)
    {
        if ($perm = $this->checkPermission('products.view')) return $perm;

        try {
            $excludedIds = $this->excludedProductIds();

            $products = Product::select(
                    'product_id', 'imei', 'sku', 'category_id',
                    'stock_status', 'cash_selling_price', 'loan_selling_price'
                )
                ->with(['category' => fn ($q) => $q->select('category_id', 'category_name', 'model')])
                ->where('status', 'active')
                ->where('stock_status', 'in_stock')
                ->whereNull('deleted_at')
                ->when(!empty($excludedIds), fn ($q) => $q->whereNotIn('product_id', $excludedIds))
                ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->category_id))
                ->when($request->filled('search'), function ($q) use ($request) {
                    $s = $request->search;
                    $q->where(fn ($q) => $q->where('imei', 'LIKE', "%{$s}%")
                                          ->orWhere('sku', 'LIKE', "%{$s}%"));
                })
                ->orderBy('imei')
                ->get()
                ->map(fn ($p) => [
                    'id'                 => $p->product_id,
                    'label'              => ($p->category?->category_name ?? 'No Category') . ' | ' .
                                            ($p->category?->model ?? 'No Model') . ' | ' .
                                            ($p->sku ?? 'No SKU') . ' | IMEI: ' . ($p->imei ?? ''),
                    'cash_selling_price' => $p->cash_selling_price,
                    'loan_selling_price' => $p->loan_selling_price,
                ]);

            return $this->successResponse($products, 'Products available for addition retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch available products: ' . $e->getMessage());
        }
    }

    public function productsInInventoryDropdown(Request $request)
    {
        if (!$this->userCan('products.view')) {
            return $this->forbidden();
        }

        $warehouseIds = Inventory::pluck('product_ids')
            ->filter()
            ->flatMap(fn ($ids) => is_array($ids) ? $ids : json_decode($ids, true) ?? [])
            ->unique()->values()->toArray();

        $ccIds = CollectionCenterInventory::pluck('product_ids')
            ->filter()
            ->flatMap(fn ($ids) => is_array($ids) ? $ids : json_decode($ids, true) ?? [])
            ->unique()->toArray();

        $availableIds = array_diff($warehouseIds, $ccIds);

        if (empty($availableIds)) {
            return $this->successResponse([], 'No products available to move');
        }

        $products = Product::whereIn('product_id', $availableIds)
            ->where('stock_status', 'in_stock')
            ->with('category')
            ->get()
            ->map(fn ($p) => [
                'id'                 => $p->product_id,
                'label'              => "Cate: {$p->category?->category_name}, " .
                                        "Model: {$p->category?->model}, " .
                                        "SKU: {$p->sku} | IMEI: {$p->imei}",
                'cash_selling_price' => $p->cash_selling_price,
                'loan_selling_price' => $p->loan_selling_price,
            ]);

        return $this->successResponse($products);
    }

    // =====================================================================
    // PRIVATE HELPERS
    // =====================================================================

    private function getBuyingPriceFromPurchase(string $categoryId, string $sku): ?float
    {
        $purchase = Purchase::where('category_id', $categoryId)
            ->where('status', 'completed')
            ->whereJsonContains('selected_skus', $sku)
            ->orderBy('created_at', 'desc')
            ->first();

        return $purchase ? (float) $purchase->unit_price : null;
    }

    private function getTotalPurchasedQuantity(string $categoryId, string $sku): int
    {
        return (int) Purchase::where('category_id', $categoryId)
            ->where('status', 'completed')
            ->whereJsonContains('selected_skus', $sku)
            ->sum('quantity_ordered');
    }

    private function formatLoanPrices($prices): array
    {
        if (!is_array($prices)) {
            return [];
        }

        $formatted = [];
        foreach ($prices as $lp) {
            if (isset($lp['company_id'], $lp['price'])) {
                $formatted[] = [
                    'company_id' => $lp['company_id'],
                    'price'      => (float) $lp['price'],
                ];
            }
        }
        return $formatted;
    }

    private function excludedProductIds(): array
    {
        $warehouseIds = Inventory::pluck('product_ids')
            ->filter()
            ->flatMap(fn ($ids) => is_array($ids) ? $ids : json_decode($ids, true) ?? [])
            ->unique()->values()->toArray();

        $ccIds = CollectionCenterInventory::pluck('product_ids')
            ->filter()
            ->flatMap(fn ($ids) => is_array($ids) ? $ids : json_decode($ids, true) ?? [])
            ->unique()->toArray();

        return array_unique(array_merge($warehouseIds, $ccIds));
    }

    private function findByImeiResponse(string $imei)
    {
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
}