<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\AgentInventory;
use App\Models\Sale;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Receipt;
use App\Models\Company;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AgentSalesController extends BaseApiController
{
    use Auditable;

    /**
     * 1. View agent inventory – returns FULL product details with company loan prices
     */
    public function availableStock(Request $request)
    {
        $perm = $this->checkPermission('agent.stock.view');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();

            $query = AgentInventory::with('user');
            if ($authUser->isSalesAgent()) {
                $query->where('user_id', $authUser->id);
            }

            $inventories = $query->get();
            $results = [];

            foreach ($inventories as $inventory) {
                if (!empty($inventory->product_ids) && is_array($inventory->product_ids)) {
                    $productCounts = array_count_values($inventory->product_ids);
                    foreach ($productCounts as $productId => $qty) {
                        $product = Product::with('category')->find($productId);
                        if (!$product || $product->stock_status === 'sold') continue;
                        $results[] = $this->formatInventoryItem($inventory, $product, $qty);
                    }
                } else {
                    $available = $inventory->quantity_received - $inventory->quantity_sold;
                    if ($available <= 0) continue;
                    $product = Product::with('category')->find($inventory->product_id);
                    if (!$product || $product->stock_status === 'sold') continue;
                    $results[] = $this->formatInventoryItem($inventory, $product, $available);
                }
            }

            return $this->successResponse($results, 'Agent inventory retrieved');

        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch agent inventory: ' . $e->getMessage());
        }
    }

    /**
     * Format a single inventory entry with product details and loan prices
     */
    private function formatInventoryItem($inventory, $product, $quantity)
    {
        $loanPrices = [];
        if (!empty($product->loan_selling_price)) {
            $prices = is_array($product->loan_selling_price) 
                ? $product->loan_selling_price 
                : json_decode($product->loan_selling_price, true);
            
            if (is_array($prices)) {
                foreach ($prices as $item) {
                    if (isset($item['company_id']) && isset($item['price'])) {
                        $company = Company::find($item['company_id']);
                        $loanPrices[] = [
                            'company_id' => $item['company_id'],
                            'company_name' => $company ? $company->company_name : $item['company_id'],
                            'price' => (float) $item['price']
                        ];
                    }
                }
            }
        }

        return [
            'agent_inv_id'      => $inventory->agent_inv_id,
            'agent_id'          => $inventory->user_id,
            'agent_name'        => $inventory->user->name ?? null,
            'product_id'        => $product->product_id,
            'product_name'      => $product->product_name,
            'imei'              => $product->imei,
            'sku'               => $product->sku,
            'category_name'     => $product->category->category_name ?? null,
            'model'             => $product->category->model ?? null,
            'color'             => $product->color ?? null,
            'buying_price'      => (float) $product->buying_price,
            'cash_selling_price' => (float) $product->cash_selling_price,
            'loan_prices'       => $loanPrices,
            'stock_status'      => $product->stock_status,
            'quantity_received' => $inventory->quantity_received,
            'quantity_sold'     => $inventory->quantity_sold,
            'available_quantity'=> $quantity,
        ];
    }

    /**
     * Helper to format loan prices
     */
    private function formatLoanPrices($product)
    {
        $loanPrices = [];
        if (!empty($product->loan_selling_price)) {
            $prices = is_array($product->loan_selling_price) 
                ? $product->loan_selling_price 
                : json_decode($product->loan_selling_price, true);
            
            if (is_array($prices)) {
                foreach ($prices as $item) {
                    if (isset($item['company_id']) && isset($item['price'])) {
                        $company = Company::find($item['company_id']);
                        $loanPrices[] = [
                            'company_id' => $item['company_id'],
                            'company_name' => $company ? $company->company_name : $item['company_id'],
                            'price' => (float) $item['price']
                        ];
                    }
                }
            }
        }
        return $loanPrices;
    }

    /**
     * 2. Scan product by IMEI
     */
    public function scanProduct(Request $request)
    {
        $perm = $this->checkPermission('agent.product.scan');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            if (!$authUser->isSalesAgent()) {
                return $this->forbidden('Only sales agents can scan products');
            }

            $validated = $request->validate(['imei' => 'required|string|exists:products,imei']);
            $product = Product::with('category')->where('imei', $validated['imei'])->first();

            $inventory = AgentInventory::where('user_id', $authUser->id)
                ->where('product_id', $product->product_id)
                ->first();

            if (!$inventory) {
                $inventory = AgentInventory::where('user_id', $authUser->id)
                    ->whereJsonContains('product_ids', $product->product_id)
                    ->first();
            }

            if (!$inventory) {
                return $this->badRequest('Product not found in your inventory');
            }

            $available = 0;
            if (!empty($inventory->product_ids) && is_array($inventory->product_ids)) {
                $available = array_count_values($inventory->product_ids)[$product->product_id] ?? 0;
            } else {
                $available = $inventory->quantity_received - $inventory->quantity_sold;
            }

            if ($available <= 0) {
                return $this->badRequest('Product not available in your inventory');
            }

            return $this->successResponse([
                'product_id'         => $product->product_id,
                'product_name'       => $product->product_name,
                'imei'               => $product->imei,
                'category_name'      => $product->category->category_name ?? null,
                'model'              => $product->category->model ?? null,
                'sku'                => $product->sku,
                'color'              => $product->color,
                'cash_selling_price' => (float) $product->cash_selling_price,
                'loan_prices'        => $this->formatLoanPrices($product),
                'available_quantity' => $available,
            ], 'Product found – ready for sale');

        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to scan: ' . $e->getMessage());
        }
    }

    /**
     * 3. Sell a product – updates inventory, creates sale and receipt, stores company_id
     */
    public function saleProduct(Request $request)
    {
        $perm = $this->checkPermission('agent.sale.create');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            if (!$authUser->isSalesAgent()) {
                return $this->forbidden('Only sales agents can sell products');
            }

            $validated = $request->validate([
                'product_id'     => 'required|string|exists:products,product_id',
                'customer_id'    => 'required|string|exists:customers,customer_id',
                'payment_method' => 'required|in:cash,loan',
                'company_id'     => 'nullable|string|exists:companies,id',
                'total_amount'   => 'nullable|numeric|min:0',
                'notes'          => 'nullable|string',
            ]);

            DB::beginTransaction();

            $inventory = AgentInventory::where('user_id', $authUser->id)
                ->where('product_id', $validated['product_id'])
                ->first();

            if (!$inventory) {
                $inventory = AgentInventory::where('user_id', $authUser->id)
                    ->whereJsonContains('product_ids', $validated['product_id'])
                    ->first();
            }

            if (!$inventory) {
                return $this->badRequest('Product not in your inventory');
            }

            $product = Product::find($validated['product_id']);
            if (!$product) {
                return $this->badRequest('Product not found');
            }

            // Determine total amount
            if (isset($validated['total_amount']) && !is_null($validated['total_amount'])) {
                $totalAmount = $validated['total_amount'];
            } else {
                if ($validated['payment_method'] === 'cash') {
                    if (is_null($product->cash_selling_price)) {
                        return $this->badRequest('Cash selling price is not set for this product.');
                    }
                    $totalAmount = $product->cash_selling_price;
                } else { // loan
                    $loanPrice = null;
                    if ($validated['company_id']) {
                        $loanPrice = $product->getLoanPriceForCompany($validated['company_id']);
                    }
                    if ($loanPrice === null && !empty($product->loan_selling_price)) {
                        $prices = is_array($product->loan_selling_price) 
                            ? $product->loan_selling_price 
                            : json_decode($product->loan_selling_price, true);
                        if (!empty($prices)) {
                            $loanPrice = $prices[0]['price'] ?? null;
                        }
                    }
                    if (is_null($loanPrice)) {
                        return $this->badRequest('Loan selling price is not set for this product.');
                    }
                    $totalAmount = $loanPrice;
                }
            }

            // Update inventory
            if (!empty($inventory->product_ids) && is_array($inventory->product_ids)) {
                $productIds = $inventory->product_ids;
                $index = array_search($validated['product_id'], $productIds);
                if ($index === false) {
                    return $this->badRequest('Product not available in your inventory');
                }
                array_splice($productIds, $index, 1);
                $inventory->product_ids = $productIds;
                $inventory->save();
            } else {
                $available = $inventory->quantity_received - $inventory->quantity_sold;
                if ($available < 1) {
                    return $this->badRequest('Product no longer available');
                }
                $inventory->quantity_sold += 1;
                $inventory->save();
            }

            // Create sale with company_id
            $sale = Sale::create([
                'agent_id'       => $authUser->id,
                'customer_id'    => $validated['customer_id'],
                'product_id'     => $validated['product_id'],
                'total_amount'   => $totalAmount,
                'payment_method' => $validated['payment_method'],
                'company_id'     => $validated['company_id'] ?? null,
                'status'         => 'completed',
                'notes'          => $validated['notes'] ?? null,
            ]);

            // Mark product as sold
            if ($product->stock_status !== 'sold') {
                $product->stock_status = 'sold';
                $product->save();
            }

            // Generate receipt
            $customer = Customer::findOrFail($validated['customer_id']);
            $receiptNumber = 'INV-' . date('Ymd') . '-' . strtoupper(substr(Str::uuid(), 0, 8));
            $receipt = Receipt::create([
                'receipt_id'      => (string) Str::uuid(),
                'receipt_number'  => $receiptNumber,
                'order_id'        => $sale->sale_id,
                'customer_name'   => $customer->customer_name,
                'customer_phone'  => $customer->msisdn,
                'total_amount'    => $sale->total_amount,
                'payment_method'  => $sale->payment_method,
                'payment_status'  => 'paid',
                'pdf_path'        => null,
                'created_by'      => $authUser->id,
            ]);

            $receipt->load('creator');
            DB::commit();

            $this->logAudit('sell_product', 'sale', $sale->sale_id, "Sold product {$validated['product_id']} for {$totalAmount}");

            return $this->created([
                'sale'    => $sale->load('agent', 'customer', 'product', 'company'),
                'receipt' => $receipt
            ], 'Sale completed successfully');

        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to sell: ' . $e->getMessage());
        }
    }

    /**
     * 4. Return damaged product
     */
    public function returnDamaged(Request $request)
    {
        $perm = $this->checkPermission('agent.return.create');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            if (!$authUser->isSalesAgent()) {
                return $this->forbidden('Only sales agents can return products');
            }

            $validated = $request->validate([
                'product_id' => 'required|string|exists:products,product_id',
                'quantity'   => 'required|integer|min:1',
                'reason'     => 'nullable|string',
            ]);

            $inventory = AgentInventory::where('user_id', $authUser->id)
                ->where('product_id', $validated['product_id'])
                ->first();

            if (!$inventory) {
                $inventory = AgentInventory::where('user_id', $authUser->id)
                    ->whereJsonContains('product_ids', $validated['product_id'])
                    ->first();
            }

            if (!$inventory) {
                return $this->badRequest('Product not found in your inventory');
            }

            DB::beginTransaction();

            if (!empty($inventory->product_ids) && is_array($inventory->product_ids)) {
                $productIds = $inventory->product_ids;
                for ($i = 0; $i < $validated['quantity']; $i++) {
                    $productIds[] = $validated['product_id'];
                }
                $inventory->product_ids = $productIds;
                $inventory->save();
            } else {
                if ($inventory->quantity_sold < $validated['quantity']) {
                    return $this->badRequest('Cannot return more than sold quantity');
                }
                $inventory->quantity_sold -= $validated['quantity'];
                $inventory->save();
            }

            DB::commit();

            $this->logAudit('return_damaged', 'inventory', $inventory->agent_inv_id, "Returned {$validated['quantity']} of product {$validated['product_id']}. Reason: {$validated['reason']}");

            return $this->successResponse(null, 'Product returned, stock adjusted');

        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to return: ' . $e->getMessage());
        }
    }

    /**
     * 5. List logged-in agent's sales
     */
    public function mySales(Request $request)
    {
        $perm = $this->checkPermission('agent.sales.view');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            if (!$authUser->isSalesAgent()) {
                return $this->forbidden('Only sales agents can view their sales');
            }

            $sales = Sale::with(['customer', 'product.category', 'receipt', 'company'])
                ->where('agent_id', $authUser->id)
                ->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 20));

            $sales->getCollection()->transform(function ($sale) {
                $product = $sale->product;
                if ($product) {
                    $sale->product_name = $product->product_name;
                    $sale->imei = $product->imei;
                    $sale->sku = $product->sku;
                    $sale->category_name = $product->category->category_name ?? null;
                    $sale->model = $product->category->model ?? null;
                    $sale->cash_selling_price = (float) $product->cash_selling_price;
                    $sale->loan_prices = $this->formatLoanPrices($product);
                }
                $sale->company_name = $sale->company ? $sale->company->company_name : null;
                return $sale;
            });

            return $this->successResponse($sales, 'Sales retrieved with full product details');

        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch sales: ' . $e->getMessage());
        }
    }

    /**
     * 6. Show a single sale
     */
    public function showSale($id)
    {
        $perm = $this->checkPermission('agent.sale.view');
        if ($perm) return $perm;

        try {
            $sale = Sale::with(['customer', 'product.category', 'receipt', 'company'])->findOrFail($id);
            $authUser = request()->user();

            if ($sale->agent_id !== $authUser->id && !$authUser->hasAnyRole(['ADMINISTRATOR', 'MANAGER'])) {
                return $this->forbidden('Unauthorized');
            }

            $product = $sale->product;
            if ($product) {
                $sale->product_name = $product->product_name;
                $sale->imei = $product->imei;
                $sale->sku = $product->sku;
                $sale->category_name = $product->category->category_name ?? null;
                $sale->model = $product->category->model ?? null;
                $sale->cash_selling_price = (float) $product->cash_selling_price;
                $sale->loan_prices = $this->formatLoanPrices($product);
            }
            $sale->company_name = $sale->company ? $sale->company->company_name : null;

            return $this->successResponse($sale, 'Sale details with full product info');

        } catch (\Exception $e) {
            return $this->notFound('Sale not found');
        }
    }
}