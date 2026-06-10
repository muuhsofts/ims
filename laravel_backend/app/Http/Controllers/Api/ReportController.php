<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\User;
use App\Models\Customer;
use App\Models\CollectionCenter;
use App\Models\ProductCategory;
use App\Traits\Auditable;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends BaseApiController
{
    use Auditable;

    /**
     * STOCK REPORT - Current inventory snapshot from warehouse
     * GET /api/v14/reports/stock?warehouse_id=&category_id=&product_id=
     */
    public function stockReport(Request $request)
    {
        $perm = $this->checkPermission('reports.stock.view');
        if ($perm) return $perm;

        try {
            $warehouseId = $request->get('warehouse_id');
            $categoryId = $request->get('category_id');
            $productId = $request->get('product_id');

            $inventoryQuery = Inventory::with('warehouse');
            if ($warehouseId) {
                $inventoryQuery->where('warehouse_id', $warehouseId);
            }
            $inventories = $inventoryQuery->get();

            $allProducts = [];
            $totalUnits = 0;
            $totalValue = 0;
            $warehouseInfo = null;

            foreach ($inventories as $inventory) {
                if (empty($inventory->product_id)) continue;

                $productIds = is_array($inventory->product_id) 
                    ? $inventory->product_id 
                    : json_decode($inventory->product_id, true);
                    
                if (!is_array($productIds) || empty($productIds)) continue;

                $counts = array_count_values($productIds);
                
                if ($productId) {
                    if (!isset($counts[$productId])) continue;
                    $counts = [$productId => $counts[$productId]];
                }
                
                if (empty($counts)) continue;

                $products = Product::with('category')
                    ->whereIn('product_id', array_keys($counts))
                    ->get()
                    ->keyBy('product_id');
                
                foreach ($counts as $pid => $qty) {
                    $product = $products->get($pid);
                    if (!$product) continue;
                    
                    if ($categoryId && $product->category_id !== $categoryId) continue;
                    
                    $quantity = intval($qty);
                    $buyingPrice = floatval($product->buying_price ?? 0);
                    
                    $productData = [
                        'product_id'        => $pid,
                        'imei'              => $product->imei ?? '',
                        'color'             => $product->color ?? '',
                        'buying_price'      => $buyingPrice,
                        'selling_price'     => floatval($product->selling_price ?? 0),
                        'quantity'          => $quantity,
                        'stock_status'      => $product->stock_status ?? '',
                        'product_status'    => $product->status ?? '',
                        'category_id'       => $product->category_id ?? '',
                        'category_name'     => $product->category->category_name ?? '',
                        'model'             => $product->category->model ?? '',
                        'sku'               => $product->category->sku ?? '',
                        'warehouse_id'      => $inventory->warehouse_id ?? '',
                        'warehouse_name'    => $inventory->warehouse->name ?? '',
                        'warehouse_location'=> $inventory->warehouse->location ?? '',
                    ];
                    
                    $allProducts[] = $productData;
                    $totalUnits += $quantity;
                    $totalValue += ($buyingPrice * $quantity);
                }
                
                if ($inventory->warehouse && !$warehouseInfo) {
                    $warehouseInfo = [
                        'warehouse_id'   => $inventory->warehouse->warehouse_id ?? '',
                        'name'           => $inventory->warehouse->name ?? '',
                        'location'       => $inventory->warehouse->location ?? '',
                        'manager_id'     => $inventory->warehouse->manager_id ?? '',
                        'status'         => $inventory->warehouse->status ?? '',
                    ];
                }
            }

            $productsByCategory = [];
            foreach ($allProducts as $product) {
                $categoryKey = $product['category_id'] ?: 'uncategorized';
                if (!isset($productsByCategory[$categoryKey])) {
                    $productsByCategory[$categoryKey] = [
                        'category_id'   => $product['category_id'],
                        'category_name' => $product['category_name'] ?: 'Uncategorized',
                        'model'         => $product['model'],
                        'sku'           => $product['sku'],
                        'products'      => [],
                        'total_units'   => 0,
                        'total_value'   => 0,
                    ];
                }
                $productsByCategory[$categoryKey]['products'][] = $product;
                $productsByCategory[$categoryKey]['total_units'] += $product['quantity'];
                $productsByCategory[$categoryKey]['total_value'] += ($product['buying_price'] * $product['quantity']);
            }

            $result = [
                'warehouse' => $warehouseInfo,
                'summary' => [
                    'total_unique_products' => count($allProducts),
                    'total_units' => $totalUnits,
                    'total_value' => $totalValue,
                    'average_unit_price' => $totalUnits > 0 ? round($totalValue / $totalUnits, 2) : 0,
                ],
                'stock_by_category' => array_values($productsByCategory),
                'all_products' => $allProducts,
            ];

            $this->logAudit('view_stock_report', 'report', null, 'Viewed stock report');
            return $this->successResponse($result, 'Stock report retrieved successfully');

        } catch (\Exception $e) {
            \Log::error('Stock report error: ' . $e->getMessage());
            return $this->serverError('Failed to generate stock report: ' . $e->getMessage());
        }
    }

    /**
     * Get inventory summary by warehouse
     * GET /api/v14/reports/stock/warehouse-summary
     */
    public function warehouseStockSummary(Request $request)
    {
        $perm = $this->checkPermission('reports.stock.view');
        if ($perm) return $perm;

        try {
            $inventories = Inventory::with('warehouse')->get();
            
            $warehouseSummary = [];
            foreach ($inventories as $inventory) {
                if (!$inventory->warehouse) continue;
                
                $productIds = is_array($inventory->product_id) 
                    ? $inventory->product_id 
                    : json_decode($inventory->product_id, true);
                
                $totalProducts = is_array($productIds) ? count($productIds) : 0;
                
                $totalValue = 0;
                if (is_array($productIds) && !empty($productIds)) {
                    $products = Product::whereIn('product_id', $productIds)->get();
                    foreach ($products as $product) {
                        $totalValue += floatval($product->buying_price ?? 0);
                    }
                }
                
                $warehouseSummary[] = [
                    'warehouse_id' => $inventory->warehouse->warehouse_id,
                    'warehouse_name' => $inventory->warehouse->name,
                    'location' => $inventory->warehouse->location,
                    'total_products' => $totalProducts,
                    'total_value' => $totalValue,
                    'last_updated' => $inventory->updated_at,
                ];
            }
            
            return $this->successResponse($warehouseSummary, 'Warehouse stock summary retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->serverError('Failed to generate warehouse summary: ' . $e->getMessage());
        }
    }

    /**
     * PURCHASES REPORT - Complete purchase analysis
     * GET /api/v14/reports/purchases?period=monthly&year=2026&month=6&from_date=&to_date=&supplier_id=&category_id=&status=completed
     */
    public function purchasesReport(Request $request)
    {
        $perm = $this->checkPermission('reports.purchases.view');
        if ($perm) return $perm;

        try {
            $period = $request->get('period', 'custom');
            $from = $request->get('from_date');
            $to = $request->get('to_date');
            $supplierId = $request->get('supplier_id');
            $categoryId = $request->get('category_id');
            $status = $request->get('status', 'completed');
            
            list($fromDate, $toDate) = $this->getDateRange($period, $request, $from, $to);

            $query = Purchase::with(['supplier', 'category'])
                ->whereBetween('created_at', [$fromDate, $toDate]);
            
            if ($status !== 'all') {
                $query->where('status', $status);
            }
            if ($supplierId) {
                $query->where('supplier_id', $supplierId);
            }
            if ($categoryId) {
                $query->where('category_id', $categoryId);
            }

            $purchases = $query->orderBy('created_at', 'desc')->get();
            
            $totalAmount = $purchases->sum('subtotal');
            $totalQuantity = $purchases->sum('quantity_ordered');
            
            $trends = $this->groupPurchasesByPeriod($purchases, $period, $fromDate, $toDate);
            
            $summary = [
                'total_purchases' => $purchases->count(),
                'total_quantity'  => $totalQuantity,
                'total_amount'    => $totalAmount,
                'average_order_value' => $purchases->count() > 0 ? $totalAmount / $purchases->count() : 0,
                'average_unit_price' => $totalQuantity > 0 ? $totalAmount / $totalQuantity : 0,
                
                'by_supplier' => $purchases->groupBy('supplier_id')->map(function($group) use ($totalAmount) {
                    $supplier = $group->first()->supplier;
                    $amount = $group->sum('subtotal');
                    return [
                        'supplier_id'   => $supplier->supplier_id ?? null,
                        'supplier_name' => $supplier->supplier_name ?? 'Unknown',
                        'purchase_count' => $group->count(),
                        'quantity'      => $group->sum('quantity_ordered'),
                        'amount'        => $amount,
                        'percentage'    => $totalAmount > 0 ? round(($amount / $totalAmount) * 100, 2) : 0,
                    ];
                })->sortByDesc('amount')->values(),
                
                'by_category' => $purchases->groupBy('category_id')->map(function($group) {
                    $category = $group->first()->category;
                    return [
                        'category_id'   => $category->category_id ?? null,
                        'category_name' => $category->category_name ?? 'Unknown',
                        'model'         => $category->model ?? '',
                        'sku'           => $category->sku ?? '',
                        'purchase_count' => $group->count(),
                        'quantity'      => $group->sum('quantity_ordered'),
                        'amount'        => $group->sum('subtotal'),
                    ];
                })->sortByDesc('amount')->values(),
                
                'by_status' => $purchases->groupBy('status')->map(function($group) {
                    return [
                        'status' => $group->first()->status,
                        'count'  => $group->count(),
                        'amount' => $group->sum('subtotal'),
                    ];
                })->values(),
            ];

            $this->logAudit('view_purchases_report', 'report', null, "Purchases report from {$fromDate->toDateString()} to {$toDate->toDateString()}");
            
            return $this->successResponse([
                'filter' => [
                    'period' => $period,
                    'from_date' => $fromDate->toDateString(),
                    'to_date' => $toDate->toDateString(),
                    'status' => $status,
                    'supplier_id' => $supplierId,
                    'category_id' => $categoryId,
                ],
                'summary' => $summary,
                'trends' => $trends,
                'purchases' => $purchases,
            ], 'Purchases report retrieved successfully');

        } catch (\Exception $e) {
            return $this->serverError('Failed to generate purchases report: ' . $e->getMessage());
        }
    }

    /**
     * CLEAR SALES REPORT - Complete sales analysis with collection center in each sale
     * GET /api/v14/reports/sales/clear?from_date=2026-06-01&to_date=2026-06-30&agent_id=&customer_id=&category_id=&product_id=&cc_id=&payment_method=&status=
     */
    public function clearSalesReport(Request $request)
    {
        $perm = $this->checkPermission('reports.sales.view');
        if ($perm) return $perm;

        try {
            $fromDate = $request->get('from_date', Carbon::now()->startOfMonth()->toDateString());
            $toDate = $request->get('to_date', Carbon::now()->toDateString());
            $agentId = $request->get('agent_id');
            $customerId = $request->get('customer_id');
            $categoryId = $request->get('category_id');
            $productId = $request->get('product_id');
            $paymentMethod = $request->get('payment_method');
            $status = $request->get('status', 'completed');
            $ccId = $request->get('cc_id');
            
            $startDate = Carbon::parse($fromDate)->startOfDay();
            $endDate = Carbon::parse($toDate)->endOfDay();
            
            // Pre-load all collection centers to avoid N+1 queries
            $allCollectionCenters = CollectionCenter::all()->keyBy('cc_id');
            
            $query = Sale::with(['agent', 'customer', 'product.category'])
                ->whereBetween('created_at', [$startDate, $endDate]);
            
            if ($status !== 'all') {
                $query->where('status', $status);
            }
            if ($agentId) {
                $query->where('agent_id', $agentId);
            }
            if ($customerId) {
                $query->where('customer_id', $customerId);
            }
            if ($productId) {
                $query->where('product_id', $productId);
            }
            if ($paymentMethod) {
                $query->where('payment_method', $paymentMethod);
            }
            if ($categoryId) {
                $query->whereHas('product', function($q) use ($categoryId) {
                    $q->where('category_id', $categoryId);
                });
            }
            if ($ccId) {
                $query->whereHas('agent', function($q) use ($ccId) {
                    $q->where('cc_id', $ccId);
                });
            }
            
            $sales = $query->orderBy('created_at', 'desc')->get();
            
            $salesData = [];
            $totalRevenue = 0;
            $totalProfit = 0;
            
            foreach ($sales as $sale) {
                $product = $sale->product;
                $category = $product ? $product->category : null;
                $agent = $sale->agent;
                $customer = $sale->customer;
                
                // Get collection center from agent's cc_id
                $collectionCenter = null;
                if ($agent && $agent->cc_id) {
                    $collectionCenter = $allCollectionCenters->get($agent->cc_id);
                }
                
                $buyingPrice = $product ? floatval($product->buying_price) : 0;
                $sellingPrice = floatval($sale->total_amount);
                $profit = $sellingPrice - $buyingPrice;
                
                // Build sale object with collection center
                $saleObject = [
                    'sale_id' => $sale->sale_id,
                    'agent_id' => $sale->agent_id,
                    'customer_id' => $sale->customer_id,
                    'total_amount' => $sellingPrice,
                    'payment_method' => $sale->payment_method,
                    'status' => $sale->status,
                    'product_id' => $sale->product_id,
                    'notes' => $sale->notes,
                    'created_at' => $sale->created_at,
                    'updated_at' => $sale->updated_at,
                    
                    // Agent data
                    'agent' => $agent ? [
                        'id' => $agent->id,
                        'name' => $agent->name,
                        'email' => $agent->email,
                        'phone' => $agent->phone,
                        'cc_id' => $agent->cc_id,
                    ] : null,
                    
                    // COLLECTION CENTER
                    'collection_center' => $collectionCenter ? [
                        'cc_id' => $collectionCenter->cc_id,
                        'cc_name' => $collectionCenter->cc_name,
                        'location' => $collectionCenter->location,
                        'owner_id' => $collectionCenter->owner_id,
                        'status' => $collectionCenter->status,
                    ] : null,
                    
                    // Customer data
                    'customer' => $customer ? [
                        'customer_id' => $customer->customer_id,
                        'customer_name' => $customer->customer_name,
                        'customer_phone' => $customer->customer_phone,
                        'msisdn' => $customer->msisdn,
                        'email' => $customer->email,
                    ] : null,
                    
                    // Product data with category
                    'product' => $product ? [
                        'product_id' => $product->product_id,
                        'category_id' => $product->category_id,
                        'imei' => $product->imei,
                        'color' => $product->color,
                        'buying_price' => floatval($product->buying_price),
                        'selling_price' => floatval($product->selling_price),
                        'stock_status' => $product->stock_status,
                        'category' => $category ? [
                            'category_id' => $category->category_id,
                            'category_name' => $category->category_name,
                            'model' => $category->model,
                            'sku' => $category->sku,
                        ] : null,
                    ] : null,
                ];
                
                $salesData[] = $saleObject;
                $totalRevenue += $sellingPrice;
                $totalProfit += $profit;
            }
            
            $totalTransactions = $sales->count();
            
            // Payment methods breakdown
            $paymentBreakdown = $sales->groupBy('payment_method')->map(function($group) use ($totalRevenue) {
                $amount = $group->sum('total_amount');
                return [
                    'method' => $group->first()->payment_method,
                    'count' => $group->count(),
                    'amount' => round($amount, 2),
                    'percentage' => $totalRevenue > 0 ? round(($amount / $totalRevenue) * 100, 2) : 0,
                ];
            })->values();
            
            // Status breakdown
            $statusBreakdown = $sales->groupBy('status')->map(function($group) {
                return [
                    'status' => $group->first()->status,
                    'count' => $group->count(),
                    'amount' => round($group->sum('total_amount'), 2),
                ];
            })->values();
            
            // Top products
            $topProducts = $this->getTopProductsFromSales($sales, 10);
            
            // Agent performance with collection center INCLUDING LOCATION
            $agentPerformance = $sales->groupBy('agent_id')->map(function($group) use ($allCollectionCenters) {
                $firstSale = $group->first();
                $agent = $firstSale->agent;
                $collectionCenter = $agent && $agent->cc_id ? $allCollectionCenters->get($agent->cc_id) : null;
                $revenue = $group->sum('total_amount');
                $profit = 0;
                foreach ($group as $sale) {
                    $product = $sale->product;
                    if ($product) {
                        $profit += floatval($sale->total_amount) - floatval($product->buying_price);
                    }
                }
                return [
                    'agent_id' => $group->first()->agent_id,
                    'agent_name' => $agent ? $agent->name : 'Unknown',
                    'agent_email' => $agent ? $agent->email : null,
                    'collection_center_id' => $collectionCenter ? $collectionCenter->cc_id : null,
                    'collection_center_name' => $collectionCenter ? $collectionCenter->cc_name : 'Unknown',
                    'collection_center_location' => $collectionCenter ? $collectionCenter->location : 'N/A',
                    'sales_count' => $group->count(),
                    'revenue' => round($revenue, 2),
                    'profit' => round($profit, 2),
                    'average_ticket' => $group->count() > 0 ? round($revenue / $group->count(), 2) : 0,
                ];
            })->sortByDesc('revenue')->values();
            
            // Collection center performance
            $ccPerformance = $sales->groupBy(function($sale) {
                $agent = $sale->agent;
                return $agent ? $agent->cc_id : 'unknown';
            })->map(function($group) use ($allCollectionCenters) {
                $firstSale = $group->first();
                $agent = $firstSale->agent;
                $collectionCenter = $agent && $agent->cc_id ? $allCollectionCenters->get($agent->cc_id) : null;
                $revenue = $group->sum('total_amount');
                $profit = 0;
                foreach ($group as $sale) {
                    $product = $sale->product;
                    if ($product) {
                        $profit += floatval($sale->total_amount) - floatval($product->buying_price);
                    }
                }
                return [
                    'collection_center_id' => $collectionCenter ? $collectionCenter->cc_id : null,
                    'collection_center_name' => $collectionCenter ? $collectionCenter->cc_name : 'Unknown',
                    'location' => $collectionCenter ? $collectionCenter->location : 'N/A',
                    'total_transactions' => $group->count(),
                    'total_revenue' => round($revenue, 2),
                    'total_profit' => round($profit, 2),
                    'profit_margin' => $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0,
                    'average_transaction_value' => $group->count() > 0 ? round($revenue / $group->count(), 2) : 0,
                ];
            })->sortByDesc('total_revenue')->values();
            
            // Category performance
            $categoryPerformance = $sales->groupBy(function($sale) {
                $product = $sale->product;
                return $product && $product->category ? $product->category->category_id : 'unknown';
            })->map(function($group) {
                $firstSale = $group->first();
                $product = $firstSale->product;
                $category = $product ? $product->category : null;
                $revenue = $group->sum('total_amount');
                $profit = 0;
                foreach ($group as $sale) {
                    $prod = $sale->product;
                    if ($prod) {
                        $profit += floatval($sale->total_amount) - floatval($prod->buying_price);
                    }
                }
                return [
                    'category_id' => $category ? $category->category_id : null,
                    'category_name' => $category ? $category->category_name : 'Unknown',
                    'model' => $category ? $category->model : '',
                    'sku' => $category ? $category->sku : '',
                    'quantity_sold' => $group->count(),
                    'revenue' => round($revenue, 2),
                    'profit' => round($profit, 2),
                    'profit_margin' => $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0,
                ];
            })->sortByDesc('revenue')->values();
            
            // Top customers
            $topCustomers = $sales->groupBy('customer_id')->map(function($group) {
                $customer = $group->first()->customer;
                $total = $group->sum('total_amount');
                return [
                    'customer_id' => $group->first()->customer_id,
                    'customer_name' => $customer ? $customer->customer_name : 'Walk-in Customer',
                    'customer_phone' => $customer ? ($customer->msisdn ?: $customer->customer_phone) : 'N/A',
                    'purchase_count' => $group->count(),
                    'total_spent' => round($total, 2),
                    'average_spent' => round($total / $group->count(), 2),
                ];
            })->sortByDesc('total_spent')->values()->take(10);
            
            // Daily breakdown
            $dailyBreakdown = $sales->groupBy(function($sale) {
                return $sale->created_at->format('Y-m-d');
            })->map(function($group, $date) {
                $dailyProfit = 0;
                foreach ($group as $sale) {
                    $product = $sale->product;
                    if ($product) {
                        $dailyProfit += floatval($sale->total_amount) - floatval($product->buying_price);
                    }
                }
                return [
                    'date' => $date,
                    'day_name' => Carbon::parse($date)->format('l'),
                    'transactions' => $group->count(),
                    'revenue' => round($group->sum('total_amount'), 2),
                    'profit' => round($dailyProfit, 2),
                ];
            })->sortBy('date')->values();
            
            // Available filters
            $collectionCenters = CollectionCenter::where('status', 'active')->get();
            $agents = User::where('status', 'active')->get();
            $categories = ProductCategory::where('status', 'active')->get();
            
            $summary = [
                'date_range' => [
                    'from' => $startDate->format('Y-m-d'),
                    'to' => $endDate->format('Y-m-d'),
                ],
                'total_transactions' => $totalTransactions,
                'total_revenue' => round($totalRevenue, 2),
                'total_profit' => round($totalProfit, 2),
                'average_transaction_value' => $totalTransactions > 0 ? round($totalRevenue / $totalTransactions, 2) : 0,
                'average_profit_per_transaction' => $totalTransactions > 0 ? round($totalProfit / $totalTransactions, 2) : 0,
                'overall_profit_margin' => $totalRevenue > 0 ? round(($totalProfit / $totalRevenue) * 100, 2) : 0,
                'payment_methods' => $paymentBreakdown,
                'by_status' => $statusBreakdown,
                'top_products' => $topProducts,
                'agent_performance' => $agentPerformance,
                'collection_center_performance' => $ccPerformance,
                'category_performance' => $categoryPerformance,
                'top_customers' => $topCustomers,
            ];
            
            $this->logAudit('view_clear_sales_report', 'report', null, 
                "Clear sales report from {$startDate->toDateString()} to {$endDate->toDateString()}");
            
            return $this->successResponse([
                'filter_applied' => [
                    'date_range' => ['from' => $fromDate, 'to' => $toDate],
                    'agent_id' => $agentId,
                    'customer_id' => $customerId,
                    'category_id' => $categoryId,
                    'product_id' => $productId,
                    'payment_method' => $paymentMethod,
                    'status' => $status,
                    'collection_center_id' => $ccId,
                ],
                'available_filters' => [
                    'collection_centers' => $collectionCenters->map(function($cc) {
                        return [
                            'cc_id' => $cc->cc_id,
                            'cc_name' => $cc->cc_name,
                            'location' => $cc->location,
                        ];
                    }),
                    'agents' => $agents->map(function($agent) {
                        return [
                            'id' => $agent->id,
                            'name' => $agent->name,
                            'email' => $agent->email,
                        ];
                    }),
                    'categories' => $categories->map(function($cat) {
                        return [
                            'category_id' => $cat->category_id,
                            'category_name' => $cat->category_name,
                            'model' => $cat->model,
                            'sku' => $cat->sku,
                        ];
                    }),
                ],
                'summary' => $summary,
                'daily_breakdown' => $dailyBreakdown,
                'sales' => $salesData,
                'total_records' => count($salesData),
            ], 'Sales report retrieved successfully');
            
        } catch (\Exception $e) {
            \Log::error('Clear sales report error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return $this->serverError('Failed to generate sales report: ' . $e->getMessage());
        }
    }

    /**
     * WEEKLY SALES REPORT
     * GET /api/v14/reports/sales/weekly?year=2026&week=23&cc_id=
     */
    public function weeklySalesReport(Request $request)
    {
        $year = $request->get('year', Carbon::now()->year);
        $week = $request->get('week', Carbon::now()->weekOfYear);
        
        $startDate = Carbon::now()->setISODate($year, $week)->startOfWeek();
        $endDate = Carbon::now()->setISODate($year, $week)->endOfWeek();
        
        $request->merge([
            'from_date' => $startDate->toDateString(),
            'to_date' => $endDate->toDateString(),
        ]);
        
        return $this->clearSalesReport($request);
    }
    
    /**
     * MONTHLY SALES REPORT
     * GET /api/v14/reports/sales/monthly?year=2026&month=6&cc_id=
     */
    public function monthlySalesReport(Request $request)
    {
        $year = $request->get('year', Carbon::now()->year);
        $month = $request->get('month', Carbon::now()->month);
        
        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = Carbon::createFromDate($year, $month, 1)->endOfMonth();
        
        $request->merge([
            'from_date' => $startDate->toDateString(),
            'to_date' => $endDate->toDateString(),
        ]);
        
        return $this->clearSalesReport($request);
    }
    
    /**
     * YEARLY SALES REPORT
     * GET /api/v14/reports/sales/yearly?year=2026&cc_id=
     */
    public function yearlySalesReport(Request $request)
    {
        $year = $request->get('year', Carbon::now()->year);
        
        $startDate = Carbon::createFromDate($year, 1, 1)->startOfYear();
        $endDate = Carbon::createFromDate($year, 12, 31)->endOfYear();
        
        $request->merge([
            'from_date' => $startDate->toDateString(),
            'to_date' => $endDate->toDateString(),
        ]);
        
        return $this->clearSalesReport($request);
    }
    
    /**
     * CUSTOM DATE RANGE SALES REPORT
     * GET /api/v14/reports/sales/custom?from_date=2026-01-01&to_date=2026-06-30&cc_id=
     */
    public function customSalesReport(Request $request)
    {
        $from = $request->get('from_date');
        $to = $request->get('to_date');
        
        if (!$from || !$to) {
            return $this->validationError(['from_date' => 'Both from_date and to_date are required']);
        }
        
        $request->merge([
            'from_date' => $from,
            'to_date' => $to,
        ]);
        
        return $this->clearSalesReport($request);
    }

    /**
     * SALES REPORT - Legacy method
     * GET /api/v14/reports/sales
     */
    public function salesReport(Request $request)
    {
        return $this->clearSalesReport($request);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get date range based on period type
     */
    private function getDateRange($period, $request, $from = null, $to = null)
    {
        switch ($period) {
            case 'weekly':
                $week = $request->get('week', Carbon::now()->weekOfYear);
                $year = $request->get('year', Carbon::now()->year);
                $startDate = Carbon::now()->setISODate($year, $week)->startOfWeek();
                $endDate = Carbon::now()->setISODate($year, $week)->endOfWeek();
                break;
                
            case 'monthly':
                $month = $request->get('month', Carbon::now()->month);
                $year = $request->get('year', Carbon::now()->year);
                $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
                $endDate = Carbon::createFromDate($year, $month, 1)->endOfMonth();
                break;
                
            case 'yearly':
                $year = $request->get('year', Carbon::now()->year);
                $startDate = Carbon::createFromDate($year, 1, 1)->startOfYear();
                $endDate = Carbon::createFromDate($year, 12, 31)->endOfYear();
                break;
                
            case 'custom':
            default:
                if (!$from || !$to) {
                    throw new \Exception('from_date and to_date are required for custom period');
                }
                $startDate = Carbon::parse($from)->startOfDay();
                $endDate = Carbon::parse($to)->endOfDay();
                break;
        }
        
        return [$startDate, $endDate];
    }

    /**
     * Group purchases by period for trend analysis
     */
    private function groupPurchasesByPeriod($purchases, $period, $fromDate, $toDate)
    {
        $trends = [];
        
        switch ($period) {
            case 'weekly':
                $currentDate = clone $fromDate;
                while ($currentDate <= $toDate) {
                    $weekEnd = (clone $currentDate)->endOfWeek();
                    $weekKey = $currentDate->format('Y-\WW');
                    $weekPurchases = $purchases->filter(function($purchase) use ($currentDate, $weekEnd) {
                        $purchaseDate = Carbon::parse($purchase->created_at);
                        return $purchaseDate >= $currentDate && $purchaseDate <= $weekEnd;
                    });
                    
                    $trends[] = [
                        'period'     => $weekKey,
                        'start_date' => $currentDate->toDateString(),
                        'end_date'   => $weekEnd->toDateString(),
                        'purchases'  => $weekPurchases->count(),
                        'quantity'   => $weekPurchases->sum('quantity_ordered'),
                        'amount'     => $weekPurchases->sum('subtotal'),
                    ];
                    
                    $currentDate = $weekEnd->addDay();
                }
                break;
                
            case 'monthly':
                $currentDate = clone $fromDate;
                while ($currentDate <= $toDate) {
                    $monthEnd = (clone $currentDate)->endOfMonth();
                    $monthKey = $currentDate->format('Y-m');
                    $monthPurchases = $purchases->filter(function($purchase) use ($currentDate, $monthEnd) {
                        $purchaseDate = Carbon::parse($purchase->created_at);
                        return $purchaseDate >= $currentDate && $purchaseDate <= $monthEnd;
                    });
                    
                    $trends[] = [
                        'period'       => $monthKey,
                        'month_name'   => $currentDate->format('F Y'),
                        'start_date'   => $currentDate->toDateString(),
                        'end_date'     => $monthEnd->toDateString(),
                        'purchases'    => $monthPurchases->count(),
                        'quantity'     => $monthPurchases->sum('quantity_ordered'),
                        'amount'       => $monthPurchases->sum('subtotal'),
                    ];
                    
                    $currentDate = $monthEnd->addDay();
                }
                break;
                
            case 'yearly':
                $currentDate = clone $fromDate;
                while ($currentDate <= $toDate) {
                    $yearEnd = (clone $currentDate)->endOfYear();
                    $yearKey = $currentDate->format('Y');
                    $yearPurchases = $purchases->filter(function($purchase) use ($currentDate, $yearEnd) {
                        $purchaseDate = Carbon::parse($purchase->created_at);
                        return $purchaseDate >= $currentDate && $purchaseDate <= $yearEnd;
                    });
                    
                    $trends[] = [
                        'period'     => $yearKey,
                        'start_date' => $currentDate->toDateString(),
                        'end_date'   => $yearEnd->toDateString(),
                        'purchases'  => $yearPurchases->count(),
                        'quantity'   => $yearPurchases->sum('quantity_ordered'),
                        'amount'     => $yearPurchases->sum('subtotal'),
                    ];
                    
                    $currentDate = $yearEnd->addDay();
                }
                break;
        }
        
        return $trends;
    }

    /**
     * Get top products from sales collection
     */
    private function getTopProductsFromSales($sales, $limit = 10)
    {
        $productSales = [];
        
        foreach ($sales as $sale) {
            $product = $sale->product;
            if (!$product) continue;
            
            $productId = $product->product_id;
            if (!isset($productSales[$productId])) {
                $category = $product->category;
                $productSales[$productId] = [
                    'product_id' => $productId,
                    'product_imei' => $product->imei,
                    'product_color' => $product->color,
                    'category_id' => $category ? $category->category_id : null,
                    'category_name' => $category ? $category->category_name : 'Unknown',
                    'model' => $category ? $category->model : '',
                    'sku' => $category ? $category->sku : '',
                    'selling_price' => floatval($product->selling_price),
                    'buying_price' => floatval($product->buying_price),
                    'quantity_sold' => 0,
                    'revenue' => 0,
                    'profit' => 0,
                ];
            }
            $productSales[$productId]['quantity_sold']++;
            $productSales[$productId]['revenue'] += floatval($sale->total_amount);
            $productSales[$productId]['profit'] += floatval($sale->total_amount) - floatval($product->buying_price);
        }
        
        return collect(array_values($productSales))
            ->sortByDesc('revenue')
            ->take($limit)
            ->values();
    }
}