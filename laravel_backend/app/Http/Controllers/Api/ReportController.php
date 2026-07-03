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
use App\Models\StockMovementLog;
use App\Models\Warehouse;
use App\Models\Supplier;
use App\Traits\Auditable;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends BaseApiController
{
    use Auditable;

    /**
     * STOCK REPORT - Unified stock report
     * GET /api/v14/reports/stock?type=warehouse&warehouse_id=&category_id=&product_id=
     * GET /api/v14/reports/stock?type=collection_center&cc_id=&category_id=&product_id=
     * GET /api/v14/reports/stock?type=owner
     * GET /api/v14/reports/stock?type=summary
     * GET /api/v14/reports/stock?type=location
     * GET /api/v14/reports/stock?type=movement
     */
    public function stockReport(Request $request)
    {
        $type = $request->get('type', 'warehouse');
        
        switch ($type) {
            case 'owner':
                return $this->ownerStockData($request);
            case 'summary':
                return $this->stockSummaryData($request);
            case 'location':
                return $this->stockByLocationData($request);
            case 'movement':
                return $this->stockMovementReport($request);
            case 'collection_center':
                return $this->collectionCenterStockData($request);
            case 'warehouse':
            default:
                return $this->warehouseStockData($request);
        }
    }

    /**
     * WAREHOUSE STOCK DATA - Uses SKU directly from products table
     * GET /api/v14/reports/stock?type=warehouse&warehouse_id=&category_id=&product_id=
     */
    private function warehouseStockData(Request $request)
    {
        $perm = $this->checkPermission('reports.stock.view');
        if ($perm) return $perm;

        try {
            $warehouseId = $request->get('warehouse_id');
            $categoryId = $request->get('category_id');
            $productId = $request->get('product_id');

            // Get warehouse
            $warehouse = null;
            if ($warehouseId) {
                $warehouse = Warehouse::find($warehouseId);
            } else {
                $warehouse = Warehouse::where('status', 'active')->first();
            }
            
            if (!$warehouse) {
                return $this->errorResponse('No warehouse found', 404);
            }
            
            $warehouseInfo = [
                'warehouse_id' => $warehouse->warehouse_id,
                'name' => $warehouse->name,
                'location' => $warehouse->location,
                'manager_id' => $warehouse->manager_id,
                'status' => $warehouse->status,
            ];
            
            // Get products with category - only in_stock products
            $productsQuery = Product::with('category')
                ->where('status', 'active')
                ->where('stock_status', 'in_stock');
            
            if ($categoryId) {
                $productsQuery->where('category_id', $categoryId);
            }
            
            if ($productId) {
                $productsQuery->where('product_id', $productId);
            }
            
            $products = $productsQuery->get();
            
            $allProducts = [];
            $totalUnits = 0;
            $totalValue = 0;
            $productsByCategory = [];
            
            foreach ($products as $product) {
                $category = $product->category;
                $buyingPrice = floatval($product->buying_price ?? 0);
                $sellingPrice = floatval($product->selling_price ?? 0);
                
                $productSku = $product->sku ?? 'N/A';
                
                $productData = [
                    'product_id' => $product->product_id,
                    'imei' => $product->imei ?? 'N/A',
                    'color' => $product->color ?? 'N/A',
                    'buying_price' => $buyingPrice,
                    'selling_price' => $sellingPrice,
                    'cash_selling_price' => floatval($product->cash_selling_price ?? 0),
                    'loan_selling_price' => floatval($product->loan_selling_price ?? 0),
                    'quantity' => 1,
                    'stock_value' => $buyingPrice,
                    'stock_status' => $product->stock_status ?? '',
                    'product_status' => $product->status ?? '',
                    'category_id' => $product->category_id ?? '',
                    'category_name' => $category->category_name ?? '',
                    'model' => $category->model ?? '',
                    'sku' => $productSku,
                    'warehouse_id' => $warehouse->warehouse_id,
                    'warehouse_name' => $warehouse->name,
                    'warehouse_location' => $warehouse->location,
                ];
                
                $allProducts[] = $productData;
                $totalUnits++;
                $totalValue += $buyingPrice;
                
                // Group by category
                $catKey = ($category->category_id ?? 'uncategorized');
                if (!isset($productsByCategory[$catKey])) {
                    $productsByCategory[$catKey] = [
                        'category_id' => $category->category_id ?? null,
                        'category_name' => $category->category_name ?? 'Uncategorized',
                        'model' => $category->model ?? '',
                        'sku' => $category->sku ?? '',
                        'warehouse_id' => $warehouse->warehouse_id,
                        'warehouse_name' => $warehouse->name,
                        'warehouse_location' => $warehouse->location,
                        'products' => [],
                        'total_units' => 0,
                        'total_value' => 0,
                    ];
                }
                
                $productsByCategory[$catKey]['products'][] = $productData;
                $productsByCategory[$catKey]['total_units']++;
                $productsByCategory[$catKey]['total_value'] += $buyingPrice;
            }
            
            $result = [
                'location_type' => 'warehouse',
                'location' => $warehouseInfo,
                'summary' => [
                    'total_unique_products' => count($allProducts),
                    'total_units' => $totalUnits,
                    'total_value' => number_format($totalValue, 2),
                    'average_unit_price' => $totalUnits > 0 ? number_format($totalValue / $totalUnits, 2) : 0,
                ],
                'stock_by_category' => array_values($productsByCategory),
                'all_products' => $allProducts,
            ];
            
            $this->logAudit('view_warehouse_stock_report', 'report', null, 'Viewed warehouse stock report');
            return $this->successResponse($result, 'Warehouse stock report retrieved successfully');
            
        } catch (\Exception $e) {
            \Log::error('Warehouse stock report error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return $this->serverError('Failed to generate warehouse stock report: ' . $e->getMessage());
        }
    }

    /**
     * COLLECTION CENTER STOCK DATA
     */
    private function collectionCenterStockData(Request $request)
    {
        $perm = $this->checkPermission('reports.stock.view');
        if ($perm) return $perm;

        try {
            $ccId = $request->get('cc_id');
            $categoryId = $request->get('category_id');
            $productId = $request->get('product_id');

            $ccQuery = CollectionCenter::where('status', 'active');
            if ($ccId) {
                $ccQuery->where('cc_id', $ccId);
            }
            $collectionCenters = $ccQuery->get();
            
            $allProducts = [];
            $totalUnits = 0;
            $totalValue = 0;
            $productsByCategory = [];
            $ccInfo = null;
            
            if ($ccId) {
                $cc = $collectionCenters->first();
                if ($cc) {
                    $ccInfo = [
                        'cc_id' => $cc->cc_id,
                        'cc_name' => $cc->cc_name,
                        'location' => $cc->location,
                        'owner_id' => $cc->owner_id,
                        'status' => $cc->status,
                    ];
                }
            } elseif ($collectionCenters->count() === 1) {
                $cc = $collectionCenters->first();
                $ccInfo = [
                    'cc_id' => $cc->cc_id,
                    'cc_name' => $cc->cc_name,
                    'location' => $cc->location,
                    'owner_id' => $cc->owner_id,
                    'status' => $cc->status,
                ];
            } elseif ($collectionCenters->count() > 1) {
                $ccInfo = [
                    'note' => 'Multiple collection centers available',
                    'total_collection_centers' => $collectionCenters->count(),
                    'collection_center_list' => $collectionCenters->map(fn($cc) => [
                        'cc_id' => $cc->cc_id,
                        'cc_name' => $cc->cc_name,
                        'location' => $cc->location,
                    ]),
                ];
            }
            
            foreach ($collectionCenters as $cc) {
                $productIdsQuery = StockMovementLog::where(function($q) use ($cc) {
                        $q->where('to_type', 'collection_center')->where('to_id', $cc->cc_id)
                          ->orWhere('from_type', 'collection_center')->where('from_id', $cc->cc_id);
                    })
                    ->distinct('product_id');
                
                $productIds = $productIdsQuery->pluck('product_id');
                
                if ($categoryId) {
                    $productIds = Product::whereIn('product_id', $productIds)
                        ->where('category_id', $categoryId)
                        ->pluck('product_id');
                }
                
                if ($productId) {
                    $productIds = Product::whereIn('product_id', $productIds)
                        ->where('product_id', $productId)
                        ->pluck('product_id');
                }
                
                foreach ($productIds as $prodId) {
                    $product = Product::with('category')->find($prodId);
                    if (!$product) continue;
                    
                    $movements = StockMovementLog::where('product_id', $prodId)
                        ->where(function($q) use ($cc) {
                            $q->where(function($sub) use ($cc) {
                                $sub->where('to_type', 'collection_center')->where('to_id', $cc->cc_id);
                            })->orWhere(function($sub) use ($cc) {
                                $sub->where('from_type', 'collection_center')->where('from_id', $cc->cc_id);
                            });
                        })
                        ->get();
                    
                    $inbound = 0;
                    $outbound = 0;
                    
                    foreach ($movements as $movement) {
                        $quantity = intval($movement->quantity);
                        
                        if ($movement->to_type === 'collection_center' && $movement->to_id === $cc->cc_id) {
                            if (in_array($movement->movement_type, ['transfer', 'return'])) {
                                $inbound += $quantity;
                            }
                        }
                        
                        if ($movement->from_type === 'collection_center' && $movement->from_id === $cc->cc_id) {
                            if (in_array($movement->movement_type, ['sale', 'loss', 'transfer'])) {
                                $outbound += $quantity;
                            }
                        }
                    }
                    
                    $currentStock = $inbound - $outbound;
                    
                    if ($currentStock > 0) {
                        $buyingPrice = floatval($product->buying_price ?? 0);
                        $sellingPrice = floatval($product->selling_price ?? 0);
                        $category = $product->category;
                        $stockValue = $buyingPrice * $currentStock;
                        $potentialRevenue = $sellingPrice * $currentStock;
                        $potentialProfit = $potentialRevenue - $stockValue;
                        
                        $productData = [
                            'product_id' => $product->product_id,
                            'imei' => $product->imei ?? 'N/A',
                            'color' => $product->color ?? 'N/A',
                            'buying_price' => $buyingPrice,
                            'selling_price' => $sellingPrice,
                            'cash_selling_price' => floatval($product->cash_selling_price ?? 0),
                            'loan_selling_price' => floatval($product->loan_selling_price ?? 0),
                            'quantity' => $currentStock,
                            'stock_value' => $stockValue,
                            'potential_revenue' => $potentialRevenue,
                            'potential_profit' => $potentialProfit,
                            'stock_status' => $product->stock_status ?? '',
                            'product_status' => $product->status ?? '',
                            'category_id' => $product->category_id ?? '',
                            'category_name' => $category->category_name ?? '',
                            'model' => $category->model ?? '',
                            'sku' => $category->sku ?? '',
                            'collection_center_id' => $cc->cc_id,
                            'collection_center_name' => $cc->cc_name,
                            'collection_center_location' => $cc->location,
                        ];
                        
                        $existingKey = $product->product_id . '_' . $cc->cc_id;
                        $found = false;
                        foreach ($allProducts as $key => $existing) {
                            if ($existing['product_id'] == $product->product_id && $existing['collection_center_id'] == $cc->cc_id) {
                                $allProducts[$key]['quantity'] += $currentStock;
                                $allProducts[$key]['stock_value'] += $stockValue;
                                $allProducts[$key]['potential_revenue'] += $potentialRevenue;
                                $allProducts[$key]['potential_profit'] += $potentialProfit;
                                $found = true;
                                break;
                            }
                        }
                        
                        if (!$found) {
                            $allProducts[] = $productData;
                        }
                        
                        $totalUnits += $currentStock;
                        $totalValue += $stockValue;
                        
                        $catKey = ($category->category_id ?? 'uncategorized') . '_' . $cc->cc_id;
                        if (!isset($productsByCategory[$catKey])) {
                            $productsByCategory[$catKey] = [
                                'category_id' => $category->category_id ?? null,
                                'category_name' => $category->category_name ?? 'Uncategorized',
                                'model' => $category->model ?? '',
                                'sku' => $category->sku ?? '',
                                'collection_center_id' => $cc->cc_id,
                                'collection_center_name' => $cc->cc_name,
                                'products' => [],
                                'total_units' => 0,
                                'total_value' => 0,
                                'total_potential_revenue' => 0,
                                'total_potential_profit' => 0,
                            ];
                        }
                        
                        $productExists = false;
                        foreach ($productsByCategory[$catKey]['products'] as $idx => $prod) {
                            if ($prod['product_id'] == $product->product_id && $prod['collection_center_id'] == $cc->cc_id) {
                                $productsByCategory[$catKey]['products'][$idx]['quantity'] += $currentStock;
                                $productsByCategory[$catKey]['products'][$idx]['stock_value'] += $stockValue;
                                $productsByCategory[$catKey]['products'][$idx]['potential_revenue'] += $potentialRevenue;
                                $productsByCategory[$catKey]['products'][$idx]['potential_profit'] += $potentialProfit;
                                $productExists = true;
                                break;
                            }
                        }
                        
                        if (!$productExists) {
                            $productsByCategory[$catKey]['products'][] = $productData;
                        }
                        
                        $productsByCategory[$catKey]['total_units'] += $currentStock;
                        $productsByCategory[$catKey]['total_value'] += $stockValue;
                        $productsByCategory[$catKey]['total_potential_revenue'] += $potentialRevenue;
                        $productsByCategory[$catKey]['total_potential_profit'] += $potentialProfit;
                    }
                }
            }
            
            $totalPotentialRevenue = array_sum(array_column($allProducts, 'potential_revenue'));
            $totalPotentialProfit = array_sum(array_column($allProducts, 'potential_profit'));
            
            $result = [
                'location_type' => 'collection_center',
                'location' => $ccInfo,
                'summary' => [
                    'total_unique_products' => count($allProducts),
                    'total_units' => $totalUnits,
                    'total_cost_value' => number_format($totalValue, 2),
                    'total_potential_revenue' => number_format($totalPotentialRevenue, 2),
                    'total_potential_profit' => number_format($totalPotentialProfit, 2),
                    'average_unit_price' => $totalUnits > 0 ? number_format($totalValue / $totalUnits, 2) : 0,
                    'average_selling_price' => $totalUnits > 0 ? number_format($totalPotentialRevenue / $totalUnits, 2) : 0,
                    'average_profit_per_unit' => $totalUnits > 0 ? number_format($totalPotentialProfit / $totalUnits, 2) : 0,
                ],
                'stock_by_category' => array_values($productsByCategory),
                'all_products' => $allProducts,
            ];
            
            $this->logAudit('view_cc_stock_report', 'report', null, 'Viewed collection center stock report');
            return $this->successResponse($result, 'Collection center stock report retrieved successfully');
            
        } catch (\Exception $e) {
            \Log::error('Collection center stock report error: ' . $e->getMessage());
            return $this->serverError('Failed to generate collection center stock report: ' . $e->getMessage());
        }
    }

    /**
     * STOCK MOVEMENT REPORT
     */
    public function stockMovementReport(Request $request)
    {
        $perm = $this->checkPermission('reports.stock.view');
        if ($perm) return $perm;

        try {
            $fromDate = $request->get('from_date', Carbon::now()->subDays(30)->toDateString());
            $toDate = $request->get('to_date', Carbon::now()->toDateString());
            $productId = $request->get('product_id');
            $locationType = $request->get('location_type');
            $locationId = $request->get('location_id');
            $movementType = $request->get('movement_type');
            
            $startDate = Carbon::parse($fromDate)->startOfDay();
            $endDate = Carbon::parse($toDate)->endOfDay();
            
            $query = StockMovementLog::query();
            
            if ($productId) {
                $query->where('product_id', $productId);
            }
            
            if ($movementType) {
                $query->where('movement_type', $movementType);
            }
            
            $query->whereBetween('created_at', [$startDate, $endDate]);
            
            if ($locationType && $locationType !== 'both') {
                $query->where(function($q) use ($locationType, $locationId) {
                    $q->where('from_type', $locationType)
                      ->orWhere('to_type', $locationType);
                });
            }
            
            if ($locationId) {
                $query->where(function($q) use ($locationId) {
                    $q->where('from_id', $locationId)
                      ->orWhere('to_id', $locationId);
                });
            }
            
            $movements = $query->orderBy('created_at', 'desc')->get();
            
            $processedMovements = [];
            $totalInbound = 0;
            $totalOutbound = 0;
            $summaryByProduct = [];
            $summaryByMovementType = [];
            
            foreach ($movements as $movement) {
                $product = Product::with('category')->find($movement->product_id);
                $category = $product ? $product->category : null;
                
                $quantity = intval($movement->quantity);
                $isInbound = in_array($movement->movement_type, ['purchase', 'return']);
                $isOutbound = in_array($movement->movement_type, ['sale', 'loss']);
                
                if ($movement->movement_type === 'transfer') {
                    if ($locationId && $locationType) {
                        if ($movement->to_type === $locationType && $movement->to_id === $locationId) {
                            $isInbound = true;
                            $isOutbound = false;
                        } elseif ($movement->from_type === $locationType && $movement->from_id === $locationId) {
                            $isInbound = false;
                            $isOutbound = true;
                        }
                    } else {
                        $isInbound = false;
                        $isOutbound = false;
                    }
                }
                
                if ($isInbound) {
                    $totalInbound += $quantity;
                }
                if ($isOutbound) {
                    $totalOutbound += $quantity;
                }
                
                $fromLocationName = $this->getLocationName($movement->from_type, $movement->from_id);
                $toLocationName = $this->getLocationName($movement->to_type, $movement->to_id);
                
                $processedMovements[] = [
                    'log_id' => $movement->log_id,
                    'product' => [
                        'product_id' => $product ? $product->product_id : null,
                        'imei' => $product ? $product->imei : 'N/A',
                        'color' => $product->color ?? 'N/A',
                        'buying_price' => $product ? floatval($product->buying_price) : 0,
                        'selling_price' => $product ? floatval($product->selling_price) : 0,
                        'cash_selling_price' => $product ? floatval($product->cash_selling_price ?? 0) : 0,
                        'loan_selling_price' => $product ? floatval($product->loan_selling_price ?? 0) : 0,
                        'category_name' => $category ? $category->category_name : 'Unknown',
                        'model' => $category ? $category->model : '',
                        'sku' => $category ? $this->formatSku($category->sku) : 'N/A',
                    ],
                    'from' => [
                        'type' => $movement->from_type,
                        'id' => $movement->from_id,
                        'name' => $fromLocationName,
                    ],
                    'to' => [
                        'type' => $movement->to_type,
                        'id' => $movement->to_id,
                        'name' => $toLocationName,
                    ],
                    'quantity' => $quantity,
                    'movement_type' => $movement->movement_type,
                    'reference_id' => $movement->reference_id,
                    'notes' => $movement->notes,
                    'performed_by' => $movement->performed_by,
                    'created_at' => $movement->created_at,
                ];
                
                $prodKey = $product ? $product->product_id : 'unknown';
                if (!isset($summaryByProduct[$prodKey])) {
                    $summaryByProduct[$prodKey] = [
                        'product_id' => $product ? $product->product_id : null,
                        'imei' => $product ? $product->imei : 'N/A',
                        'product_name' => $category ? $category->category_name . ' ' . ($category->model ?? '') : 'Unknown',
                        'category_name' => $category ? $category->category_name : 'Unknown',
                        'inbound' => 0,
                        'outbound' => 0,
                        'net_change' => 0,
                        'last_movement_date' => null,
                    ];
                }
                if ($isInbound) {
                    $summaryByProduct[$prodKey]['inbound'] += $quantity;
                }
                if ($isOutbound) {
                    $summaryByProduct[$prodKey]['outbound'] += $quantity;
                }
                $summaryByProduct[$prodKey]['net_change'] = $summaryByProduct[$prodKey]['inbound'] - $summaryByProduct[$prodKey]['outbound'];
                $summaryByProduct[$prodKey]['last_movement_date'] = $movement->created_at;
            }
            
            $summaryByMovementType = $movements->groupBy('movement_type')->map(function($group) {
                return [
                    'movement_type' => $group->first()->movement_type,
                    'count' => $group->count(),
                    'total_quantity' => $group->sum('quantity'),
                ];
            })->values();
            
            $this->logAudit('view_stock_movement_report', 'report', null, 
                "Stock movement report from {$startDate->toDateString()} to {$endDate->toDateString()}");
            
            return $this->successResponse([
                'report_date' => Carbon::now()->format('Y-m-d H:i:s'),
                'report_type' => 'STOCK_MOVEMENT_REPORT',
                'date_range' => [
                    'from' => $startDate->toDateString(),
                    'to' => $endDate->toDateString(),
                ],
                'filters_applied' => [
                    'product_id' => $productId,
                    'location_type' => $locationType,
                    'location_id' => $locationId,
                    'movement_type' => $movementType,
                ],
                'summary' => [
                    'total_movements' => $movements->count(),
                    'total_inbound_quantity' => $totalInbound,
                    'total_outbound_quantity' => $totalOutbound,
                    'net_stock_change' => $totalInbound - $totalOutbound,
                    'by_movement_type' => $summaryByMovementType,
                ],
                'product_movement_summary' => array_values($summaryByProduct),
                'movements' => $processedMovements,
                'total_records' => count($processedMovements),
            ], 'Stock movement report retrieved successfully');
            
        } catch (\Exception $e) {
            \Log::error('Stock movement report error: ' . $e->getMessage());
            return $this->serverError('Failed to generate stock movement report: ' . $e->getMessage());
        }
    }

    /**
     * OWNER STOCK DATA
     */
    private function ownerStockData(Request $request)
    {
        try {
            $categoryId = $request->get('category_id');
            $viewBy = $request->get('view_by', 'all');
            $locationId = $request->get('location_id');
            
            $productsQuery = Product::with('category')->where('status', 'active');
            if ($categoryId) {
                $productsQuery->where('category_id', $categoryId);
            }
            $products = $productsQuery->get();
            
            $stockData = [];
            $totalStockValue = 0;
            $totalUnits = 0;
            $totalPotentialRevenue = 0;
            
            foreach ($products as $product) {
                $currentStock = $this->calculateProductCurrentStock($product->product_id, $viewBy, $locationId);
                
                if ($currentStock > 0) {
                    $buyingPrice = floatval($product->buying_price);
                    $sellingPrice = floatval($product->selling_price);
                    $stockValue = $currentStock * $buyingPrice;
                    $potentialRevenue = $currentStock * $sellingPrice;
                    $potentialProfit = $potentialRevenue - $stockValue;
                    
                    $category = $product->category;
                    $locationInfo = $this->getProductLocations($product->product_id, $viewBy, $locationId);
                    
                    $stockData[] = [
                        'product_id' => $product->product_id,
                        'product_name' => $category ? $category->category_name . ' ' . ($category->model ?? '') : 'Unknown Product',
                        'imei' => $product->imei ?? 'N/A',
                        'color' => $product->color ?? 'N/A',
                        'sku' => $category ? $this->formatSku($category->sku) : 'N/A',
                        'model' => $category ? $category->model : 'N/A',
                        'category_id' => $category ? $category->category_id : null,
                        'category_name' => $category ? $category->category_name : 'Unknown',
                        'buying_price' => number_format($buyingPrice, 2),
                        'selling_price' => number_format($sellingPrice, 2),
                        'cash_selling_price' => number_format($product->cash_selling_price ?? 0, 2),
                        'loan_selling_price' => number_format($product->loan_selling_price ?? 0, 2),
                        'current_stock' => $currentStock,
                        'stock_value' => number_format($stockValue, 2),
                        'potential_revenue' => number_format($potentialRevenue, 2),
                        'potential_profit' => number_format($potentialProfit, 2),
                        'profit_margin' => $sellingPrice > 0 ? round(($potentialProfit / $potentialRevenue) * 100, 2) : 0,
                        'stock_status' => $this->getStockStatusText($currentStock),
                        'location' => $locationInfo,
                        'last_movement_date' => $this->getLastMovementDate($product->product_id),
                    ];
                    
                    $totalUnits += $currentStock;
                    $totalStockValue += $stockValue;
                    $totalPotentialRevenue += $potentialRevenue;
                }
            }
            
            $stockByCategory = [];
            foreach ($stockData as $item) {
                $catName = $item['category_name'];
                if (!isset($stockByCategory[$catName])) {
                    $stockByCategory[$catName] = [
                        'category_id' => $item['category_id'],
                        'category_name' => $catName,
                        'total_units' => 0,
                        'total_value' => 0,
                        'potential_revenue' => 0,
                        'potential_profit' => 0,
                        'products' => [],
                    ];
                }
                $stockByCategory[$catName]['total_units'] += $item['current_stock'];
                $stockByCategory[$catName]['total_value'] += floatval(str_replace(',', '', $item['stock_value']));
                $stockByCategory[$catName]['potential_revenue'] += floatval(str_replace(',', '', $item['potential_revenue']));
                $stockByCategory[$catName]['potential_profit'] += floatval(str_replace(',', '', $item['potential_profit']));
                $stockByCategory[$catName]['products'][] = $item;
            }
            
            $totalPotentialProfit = $totalPotentialRevenue - $totalStockValue;
            $summary = [
                'report_type' => 'OWNER_STOCK_REPORT',
                'total_products' => count($stockData),
                'total_units' => $totalUnits,
                'total_cost_value' => number_format($totalStockValue, 2),
                'total_potential_revenue' => number_format($totalPotentialRevenue, 2),
                'total_potential_profit' => number_format($totalPotentialProfit, 2),
                'overall_profit_margin' => $totalPotentialRevenue > 0 ? round(($totalPotentialProfit / $totalPotentialRevenue) * 100, 2) : 0,
                'average_cost_per_unit' => $totalUnits > 0 ? number_format($totalStockValue / $totalUnits, 2) : 0,
                'average_selling_price' => $totalUnits > 0 ? number_format($totalPotentialRevenue / $totalUnits, 2) : 0,
                'average_profit_per_unit' => $totalUnits > 0 ? number_format($totalPotentialProfit / $totalUnits, 2) : 0,
                'roi_percentage' => $totalStockValue > 0 ? round(($totalPotentialProfit / $totalStockValue) * 100, 2) : 0,
            ];
            
            $stockHealth = $this->getStockHealth($stockData);
            
            $categories = ProductCategory::where('status', 'active')->get();
            $warehouses = Warehouse::where('status', 'active')->get();
            $collectionCenters = CollectionCenter::where('status', 'active')->get();
            
            $this->logAudit('view_owner_stock_report', 'report', null, 'Owner viewed complete stock report');
            
            return $this->successResponse([
                'report_date' => Carbon::now()->format('Y-m-d H:i:s'),
                'type' => 'owner',
                'view_by' => $viewBy,
                'location_id' => $locationId,
                'summary' => $summary,
                'stock_health' => $stockHealth,
                'stock_by_category' => array_values($stockByCategory),
                'all_stock' => $stockData,
                'filters' => [
                    'categories' => $categories->map(fn($c) => [
                        'category_id' => $c->category_id,
                        'category_name' => $c->category_name,
                        'model' => $c->model,
                    ]),
                    'warehouses' => $warehouses->map(fn($w) => [
                        'warehouse_id' => $w->warehouse_id,
                        'name' => $w->name,
                        'location' => $w->location,
                    ]),
                    'collection_centers' => $collectionCenters->map(fn($cc) => [
                        'cc_id' => $cc->cc_id,
                        'cc_name' => $cc->cc_name,
                        'location' => $cc->location,
                    ]),
                ],
            ], 'Owner stock report retrieved successfully');
            
        } catch (\Exception $e) {
            \Log::error('Owner stock report error: ' . $e->getMessage());
            return $this->serverError('Failed to generate owner stock report: ' . $e->getMessage());
        }
    }
    
    /**
     * STOCK SUMMARY DATA
     */
    private function stockSummaryData(Request $request)
    {
        try {
            $products = Product::where('status', 'active')->get();
            
            $totalUnits = 0;
            $totalValue = 0;
            $lowStockItems = 0;
            $outOfStock = 0;
            $healthyStock = 0;
            
            foreach ($products as $product) {
                $stock = $this->calculateProductCurrentStock($product->product_id);
                if ($stock > 0) {
                    $totalUnits += $stock;
                    $totalValue += $stock * floatval($product->buying_price);
                    
                    if ($stock <= 5) {
                        $lowStockItems++;
                    } elseif ($stock <= 10) {
                        $healthyStock++;
                    }
                } else {
                    $outOfStock++;
                }
            }
            
            $recentMovements = StockMovementLog::where('created_at', '>=', Carbon::now()->subDays(7))->count();
            
            $productsWithStock = Product::where('status', 'active')->get()->filter(function($product) {
                return $this->calculateProductCurrentStock($product->product_id) > 0;
            })->count();
            
            $topProducts = [];
            foreach ($products as $product) {
                $stock = $this->calculateProductCurrentStock($product->product_id);
                if ($stock > 0) {
                    $category = $product->category;
                    $topProducts[] = [
                        'product_name' => $category ? $category->category_name . ' ' . ($category->model ?? '') : 'Unknown',
                        'current_stock' => $stock,
                        'stock_value' => $stock * floatval($product->buying_price),
                    ];
                }
            }
            $topProducts = collect($topProducts)->sortByDesc('stock_value')->take(5)->values();
            
            $this->logAudit('view_stock_summary', 'report', null, 'Viewed stock summary');
            
            return $this->successResponse([
                'report_date' => Carbon::now()->format('Y-m-d H:i:s'),
                'type' => 'summary',
                'summary' => [
                    'total_units_in_stock' => $totalUnits,
                    'total_stock_value' => number_format($totalValue, 2),
                    'products_with_stock' => $productsWithStock,
                    'total_active_products' => $products->count(),
                    'low_stock_items' => $lowStockItems,
                    'out_of_stock_items' => $outOfStock,
                    'healthy_stock_items' => $healthyStock,
                    'recent_movements_7d' => $recentMovements,
                ],
                'top_products_by_value' => $topProducts,
            ], 'Stock summary retrieved successfully');
            
        } catch (\Exception $e) {
            \Log::error('Stock summary error: ' . $e->getMessage());
            return $this->serverError('Failed to get stock summary: ' . $e->getMessage());
        }
    }
    
    /**
     * STOCK BY LOCATION DATA
     */
    private function stockByLocationData(Request $request)
    {
        try {
            $products = Product::where('status', 'active')->get();
            
            $warehouseStock = [];
            $ccStock = [];
            
            foreach ($products as $product) {
                $buyingPrice = floatval($product->buying_price);
                
                $warehouseMovements = StockMovementLog::where('product_id', $product->product_id)
                    ->where(function($q) {
                        $q->where('from_type', 'warehouse')->orWhere('to_type', 'warehouse');
                    })
                    ->get();
                
                $warehouseNet = $this->calculateNetForLocation($warehouseMovements, 'warehouse');
                foreach ($warehouseNet as $whId => $qty) {
                    if (!isset($warehouseStock[$whId])) {
                        $warehouse = Warehouse::find($whId);
                        $warehouseStock[$whId] = [
                            'location_id' => $whId,
                            'location_name' => $warehouse ? $warehouse->name : 'Unknown',
                            'location_type' => 'warehouse',
                            'location_address' => $warehouse ? $warehouse->location : 'N/A',
                            'total_units' => 0,
                            'total_value' => 0,
                            'product_count' => 0,
                        ];
                    }
                    $stockValue = $qty * $buyingPrice;
                    $warehouseStock[$whId]['total_units'] += $qty;
                    $warehouseStock[$whId]['total_value'] += $stockValue;
                    $warehouseStock[$whId]['product_count']++;
                }
                
                $ccMovements = StockMovementLog::where('product_id', $product->product_id)
                    ->where(function($q) {
                        $q->where('from_type', 'collection_center')->orWhere('to_type', 'collection_center');
                    })
                    ->get();
                
                $ccNet = $this->calculateNetForLocation($ccMovements, 'collection_center');
                foreach ($ccNet as $ccId => $qty) {
                    if (!isset($ccStock[$ccId])) {
                        $center = CollectionCenter::find($ccId);
                        $ccStock[$ccId] = [
                            'location_id' => $ccId,
                            'location_name' => $center ? $center->cc_name : 'Unknown',
                            'location_type' => 'collection_center',
                            'location_address' => $center ? $center->location : 'N/A',
                            'total_units' => 0,
                            'total_value' => 0,
                            'product_count' => 0,
                        ];
                    }
                    $stockValue = $qty * $buyingPrice;
                    $ccStock[$ccId]['total_units'] += $qty;
                    $ccStock[$ccId]['total_value'] += $stockValue;
                    $ccStock[$ccId]['product_count']++;
                }
            }
            
            $allLocations = array_merge(array_values($warehouseStock), array_values($ccStock));
            usort($allLocations, function($a, $b) {
                return $b['total_units'] - $a['total_units'];
            });
            
            $totalAllUnits = array_sum(array_column($allLocations, 'total_units'));
            $totalAllValue = array_sum(array_column($allLocations, 'total_value'));
            
            $this->logAudit('view_stock_by_location', 'report', null, 'Viewed stock by location');
            
            return $this->successResponse([
                'report_date' => Carbon::now()->format('Y-m-d H:i:s'),
                'type' => 'location',
                'summary' => [
                    'total_locations_with_stock' => count($allLocations),
                    'total_units_across_locations' => $totalAllUnits,
                    'total_value_across_locations' => number_format($totalAllValue, 2),
                    'warehouse_count' => count($warehouseStock),
                    'collection_center_count' => count($ccStock),
                ],
                'locations' => $allLocations,
            ], 'Stock by location retrieved successfully');
            
        } catch (\Exception $e) {
            \Log::error('Stock by location error: ' . $e->getMessage());
            return $this->serverError('Failed to get stock by location: ' . $e->getMessage());
        }
    }

    /**
     * PURCHASES REPORT
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
            $status = $request->get('status', 'all');
            
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
            
            $processedPurchases = [];
            $totalAmount = 0;
            $totalQuantity = 0;
            
            $supplierSummary = [];
            $categorySummary = [];
            $skuSummary = [];
            $statusSummary = [];
            
            foreach ($purchases as $purchase) {
                $supplier = $purchase->supplier;
                $category = $purchase->category;
                
                $selectedSkus = $purchase->selected_skus;
                $skuDisplay = '';
                $skuArray = [];
                
                if (is_array($selectedSkus)) {
                    $skuArray = $selectedSkus;
                    $skuDisplay = implode(', ', $selectedSkus);
                } elseif (is_string($selectedSkus)) {
                    $decoded = json_decode($selectedSkus, true);
                    if (is_array($decoded)) {
                        $skuArray = $decoded;
                        $skuDisplay = implode(', ', $decoded);
                    } else {
                        $skuDisplay = $selectedSkus;
                        $skuArray = [$selectedSkus];
                    }
                }
                
                $modelName = $purchase->model;
                if (empty($modelName) && $category) {
                    $modelName = $category->model ?? '';
                }
                
                $processedPurchases[] = [
                    'purchase_id' => $purchase->purchase_id,
                    'supplier' => $supplier ? [
                        'supplier_id' => $supplier->supplier_id,
                        'supplier_name' => $supplier->supplier_name,
                        'supplier_phone' => $supplier->phone ?? '',
                        'email' => $supplier->email ?? '',
                        'contact_person' => $supplier->contact_person ?? '',
                    ] : null,
                    'category' => $category ? [
                        'category_id' => $category->category_id,
                        'category_name' => $category->category_name,
                        'model' => $category->model,
                        'sku_options' => $category->sku,
                    ] : null,
                    'model' => $modelName,
                    'quantity_ordered' => (int)$purchase->quantity_ordered,
                    'unit_price' => (float)$purchase->unit_price,
                    'subtotal' => (float)$purchase->subtotal,
                    'selected_skus' => $skuDisplay,
                    'selected_skus_array' => $skuArray,
                    'status' => $purchase->status,
                    'created_at' => $purchase->created_at ? $purchase->created_at->format('Y-m-d H:i:s') : null,
                    'updated_at' => $purchase->updated_at ? $purchase->updated_at->format('Y-m-d H:i:s') : null,
                ];
                
                $totalAmount += (float)$purchase->subtotal;
                $totalQuantity += (int)$purchase->quantity_ordered;
                
                $supId = $purchase->supplier_id;
                if (!isset($supplierSummary[$supId])) {
                    $supplierSummary[$supId] = [
                        'supplier_id' => $supId,
                        'supplier_name' => $supplier->supplier_name ?? 'Unknown',
                        'contact_person' => $supplier->contact_person ?? '',
                        'phone' => $supplier->phone ?? '',
                        'email' => $supplier->email ?? '',
                        'purchase_count' => 0,
                        'quantity' => 0,
                        'amount' => 0,
                    ];
                }
                $supplierSummary[$supId]['purchase_count']++;
                $supplierSummary[$supId]['quantity'] += (int)$purchase->quantity_ordered;
                $supplierSummary[$supId]['amount'] += (float)$purchase->subtotal;
                
                $catId = $purchase->category_id ?? 'uncategorized';
                if (!isset($categorySummary[$catId])) {
                    $categorySummary[$catId] = [
                        'category_id' => $catId,
                        'category_name' => $category->category_name ?? 'Unknown',
                        'model' => $category->model ?? '',
                        'sku_options' => $category->sku ?? [],
                        'purchase_count' => 0,
                        'quantity' => 0,
                        'amount' => 0,
                    ];
                }
                $categorySummary[$catId]['purchase_count']++;
                $categorySummary[$catId]['quantity'] += (int)$purchase->quantity_ordered;
                $categorySummary[$catId]['amount'] += (float)$purchase->subtotal;
                
                foreach ($skuArray as $sku) {
                    if (!isset($skuSummary[$sku])) {
                        $skuSummary[$sku] = [
                            'sku' => $sku,
                            'purchase_count' => 0,
                            'quantity' => 0,
                            'amount' => 0,
                        ];
                    }
                    $skuSummary[$sku]['purchase_count']++;
                    $skuSummary[$sku]['quantity'] += (int)$purchase->quantity_ordered;
                    $skuSummary[$sku]['amount'] += (float)$purchase->subtotal;
                }
                
                if (!isset($statusSummary[$purchase->status])) {
                    $statusSummary[$purchase->status] = [
                        'status' => $purchase->status,
                        'count' => 0,
                        'quantity' => 0,
                        'amount' => 0,
                    ];
                }
                $statusSummary[$purchase->status]['count']++;
                $statusSummary[$purchase->status]['quantity'] += (int)$purchase->quantity_ordered;
                $statusSummary[$purchase->status]['amount'] += (float)$purchase->subtotal;
            }
            
            $bySupplier = array_values($supplierSummary);
            foreach ($bySupplier as &$supp) {
                $supp['percentage'] = $totalAmount > 0 ? round(($supp['amount'] / $totalAmount) * 100, 2) : 0;
            }
            usort($bySupplier, fn($a, $b) => $b['amount'] - $a['amount']);
            
            $byCategory = array_values($categorySummary);
            foreach ($byCategory as &$cat) {
                $cat['percentage'] = $totalAmount > 0 ? round(($cat['amount'] / $totalAmount) * 100, 2) : 0;
            }
            usort($byCategory, fn($a, $b) => $b['amount'] - $a['amount']);
            
            $bySku = array_values($skuSummary);
            usort($bySku, fn($a, $b) => $b['amount'] - $a['amount']);
            
            $byStatus = array_values($statusSummary);
            
            $trends = $this->groupPurchasesByPeriod($purchases, $period, $fromDate, $toDate);
            
            $summary = [
                'total_purchases' => $purchases->count(),
                'total_quantity' => $totalQuantity,
                'total_amount' => round($totalAmount, 2),
                'average_order_value' => $purchases->count() > 0 ? round($totalAmount / $purchases->count(), 2) : 0,
                'average_unit_price' => $totalQuantity > 0 ? round($totalAmount / $totalQuantity, 2) : 0,
                'by_supplier' => $bySupplier,
                'by_category' => $byCategory,
                'by_sku' => $bySku,
                'by_status' => $byStatus,
            ];
            
            $suppliers = Supplier::where('status', 'active')->get();
            $categories = ProductCategory::where('status', 'active')->get();
            
            $this->logAudit('view_purchases_report', 'report', null, 
                "Purchases report from {$fromDate->toDateString()} to {$toDate->toDateString()}");
            
            return $this->successResponse([
                'report_date' => Carbon::now()->format('Y-m-d H:i:s'),
                'period_display' => $this->getPeriodDisplayText($period, $fromDate, $toDate, $request),
                'filter' => [
                    'period' => $period,
                    'from_date' => $fromDate->toDateString(),
                    'to_date' => $toDate->toDateString(),
                    'status' => $status,
                    'supplier_id' => $supplierId,
                    'category_id' => $categoryId,
                ],
                'available_filters' => [
                    'suppliers' => $suppliers->map(fn($s) => [
                        'supplier_id' => $s->supplier_id,
                        'supplier_name' => $s->supplier_name,
                        'contact_person' => $s->contact_person,
                        'phone' => $s->phone,
                    ]),
                    'categories' => $categories->map(fn($c) => [
                        'category_id' => $c->category_id,
                        'category_name' => $c->category_name,
                        'model' => $c->model,
                    ]),
                    'statuses' => ['pending', 'completed', 'cancelled', 'all'],
                ],
                'summary' => $summary,
                'trends' => $trends,
                'purchases' => $processedPurchases,
                'total_records' => count($processedPurchases),
            ], 'Purchases report retrieved successfully');

        } catch (\Exception $e) {
            \Log::error('Purchases report error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return $this->serverError('Failed to generate purchases report: ' . $e->getMessage());
        }
    }

    private function getPeriodDisplayText($period, $fromDate, $toDate, $request)
    {
        switch ($period) {
            case 'weekly':
                $week = $request->get('week', Carbon::now()->weekOfYear);
                $year = $request->get('year', Carbon::now()->year);
                return "Week {$week}, {$year}";
            case 'monthly':
                $month = $request->get('month', Carbon::now()->month);
                $year = $request->get('year', Carbon::now()->year);
                return Carbon::createFromDate($year, $month, 1)->format('F Y');
            case 'yearly':
                $year = $request->get('year', Carbon::now()->year);
                return "Year {$year}";
            case 'custom':
            default:
                return $fromDate->format('d/m/Y') . ' - ' . $toDate->format('d/m/Y');
        }
    }

    /**
     * CLEAR SALES REPORT - Complete sales analysis with product SKU from products table
     * GET /api/v14/reports/sales/clear
     * 
     * UPDATED: Added cash_selling_price and loan_selling_price to product data
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
                
                $collectionCenter = null;
                if ($agent && $agent->cc_id) {
                    $collectionCenter = $allCollectionCenters->get($agent->cc_id);
                }
                
                $buyingPrice = $product ? floatval($product->buying_price) : 0;
                $sellingPrice = floatval($sale->total_amount);
                $profit = $sellingPrice - $buyingPrice;
                
                $productSku = $product ? ($product->sku ?? 'N/A') : 'N/A';
                
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
                    'agent' => $agent ? [
                        'id' => $agent->id,
                        'name' => $agent->name,
                        'email' => $agent->email,
                        'phone' => $agent->phone,
                        'cc_id' => $agent->cc_id,
                    ] : null,
                    'collection_center' => $collectionCenter ? [
                        'cc_id' => $collectionCenter->cc_id,
                        'cc_name' => $collectionCenter->cc_name,
                        'location' => $collectionCenter->location,
                        'owner_id' => $collectionCenter->owner_id,
                        'status' => $collectionCenter->status,
                    ] : null,
                    'customer' => $customer ? [
                        'customer_id' => $customer->customer_id,
                        'customer_name' => $customer->customer_name,
                        'customer_phone' => $customer->customer_phone,
                        'msisdn' => $customer->msisdn,
                        'email' => $customer->email,
                    ] : null,
                    'product' => $product ? [
                        'product_id' => $product->product_id,
                        'category_id' => $product->category_id,
                        'imei' => $product->imei,
                        'color' => $product->color,
                        'buying_price' => floatval($product->buying_price),
                        'selling_price' => floatval($product->selling_price),
                        // NEW: added cash and loan selling prices
                        'cash_selling_price' => floatval($product->cash_selling_price ?? 0),
                        'loan_selling_price' => floatval($product->loan_selling_price ?? 0),
                        'stock_status' => $product->stock_status,
                        'sku' => $productSku,
                        'category' => $category ? [
                            'category_id' => $category->category_id,
                            'category_name' => $category->category_name,
                            'model' => $category->model,
                            'sku_options' => $category->sku,
                        ] : null,
                    ] : null,
                ];
                
                $salesData[] = $saleObject;
                $totalRevenue += $sellingPrice;
                $totalProfit += $profit;
            }
            
            $totalTransactions = $sales->count();
            
            $paymentBreakdown = $sales->groupBy('payment_method')->map(function($group) use ($totalRevenue) {
                $amount = $group->sum('total_amount');
                return [
                    'method' => $group->first()->payment_method,
                    'count' => $group->count(),
                    'amount' => round($amount, 2),
                    'percentage' => $totalRevenue > 0 ? round(($amount / $totalRevenue) * 100, 2) : 0,
                ];
            })->values();
            
            $statusBreakdown = $sales->groupBy('status')->map(function($group) {
                return [
                    'status' => $group->first()->status,
                    'count' => $group->count(),
                    'amount' => round($group->sum('total_amount'), 2),
                ];
            })->values();
            
            $topProducts = $this->getTopProductsFromSalesWithProductSku($sales, 10);
            
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
                    'sku_options' => $category ? $category->sku : [],
                    'quantity_sold' => $group->count(),
                    'revenue' => round($revenue, 2),
                    'profit' => round($profit, 2),
                    'profit_margin' => $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0,
                ];
            })->sortByDesc('revenue')->values();
            
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
                            'sku_options' => $cat->sku,
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
     * Get top products from sales collection using product SKU from products table
     */
    private function getTopProductsFromSalesWithProductSku($sales, $limit = 10)
    {
        $productSales = [];
        
        foreach ($sales as $sale) {
            $product = $sale->product;
            if (!$product) continue;
            
            $productId = $product->product_id;
            if (!isset($productSales[$productId])) {
                $category = $product->category;
                $productSku = $product->sku ?? 'N/A';
                
                $productSales[$productId] = [
                    'product_id' => $productId,
                    'product_imei' => $product->imei ?? 'N/A',
                    'product_color' => $product->color ?? 'N/A',
                    'product_sku' => $productSku,
                    'category_id' => $category ? $category->category_id : null,
                    'category_name' => $category ? $category->category_name : 'Unknown',
                    'model' => $category ? $category->model : '',
                    'sku_options' => $category ? $category->sku : [],
                    'selling_price' => floatval($product->selling_price),
                    'buying_price' => floatval($product->buying_price),
                    'cash_selling_price' => floatval($product->cash_selling_price ?? 0),
                    'loan_selling_price' => floatval($product->loan_selling_price ?? 0),
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

    /**
     * SALES REPORT - Legacy method
     */
    public function salesReport(Request $request)
    {
        return $this->clearSalesReport($request);
    }

    // ==================== HELPER METHODS ====================

    private function getLocationName($type, $id)
    {
        if (!$id) return 'N/A';
        
        switch ($type) {
            case 'warehouse':
                $warehouse = Warehouse::find($id);
                return $warehouse ? $warehouse->name : 'Unknown Warehouse';
            case 'collection_center':
                $cc = CollectionCenter::find($id);
                return $cc ? $cc->cc_name : 'Unknown Collection Center';
            case 'sales_agent':
                $agent = User::find($id);
                return $agent ? $agent->name : 'Unknown Agent';
            case 'supplier':
                $supplier = Supplier::find($id);
                return $supplier ? $supplier->supplier_name : 'Unknown Supplier';
            default:
                return 'Unknown';
        }
    }

    private function calculateProductCurrentStock($productId, $viewBy = 'all', $locationId = null)
    {
        $query = StockMovementLog::where('product_id', $productId);
        
        if ($viewBy === 'warehouse' && $locationId) {
            $query->where(function($q) use ($locationId) {
                $q->where('to_type', 'warehouse')->where('to_id', $locationId)
                  ->orWhere('from_type', 'warehouse')->where('from_id', $locationId);
            });
        } elseif ($viewBy === 'collection_center' && $locationId) {
            $query->where(function($q) use ($locationId) {
                $q->where('to_type', 'collection_center')->where('to_id', $locationId)
                  ->orWhere('from_type', 'collection_center')->where('from_id', $locationId);
            });
        }
        
        $movements = $query->get();
        
        $inbound = 0;
        $outbound = 0;
        
        foreach ($movements as $movement) {
            $quantity = intval($movement->quantity);
            
            if (in_array($movement->movement_type, ['purchase', 'return'])) {
                $inbound += $quantity;
            } elseif (in_array($movement->movement_type, ['sale', 'loss'])) {
                $outbound += $quantity;
            } elseif ($movement->movement_type === 'transfer') {
                if ($viewBy === 'warehouse' && $locationId) {
                    if ($movement->to_type === 'warehouse' && $movement->to_id === $locationId) {
                        $inbound += $quantity;
                    } elseif ($movement->from_type === 'warehouse' && $movement->from_id === $locationId) {
                        $outbound += $quantity;
                    }
                } elseif ($viewBy === 'collection_center' && $locationId) {
                    if ($movement->to_type === 'collection_center' && $movement->to_id === $locationId) {
                        $inbound += $quantity;
                    } elseif ($movement->from_type === 'collection_center' && $movement->from_id === $locationId) {
                        $outbound += $quantity;
                    }
                }
            }
        }
        
        return $inbound - $outbound;
    }
    
    private function calculateNetForLocation($movements, $locationType)
    {
        $netStock = [];
        
        foreach ($movements as $movement) {
            $quantity = intval($movement->quantity);
            
            if ($movement->to_type === $locationType) {
                $id = $movement->to_id;
                $netStock[$id] = ($netStock[$id] ?? 0) + $quantity;
            }
            if ($movement->from_type === $locationType) {
                $id = $movement->from_id;
                $netStock[$id] = ($netStock[$id] ?? 0) - $quantity;
            }
        }
        
        return array_filter($netStock, fn($qty) => $qty > 0);
    }
    
    private function getProductLocations($productId, $viewBy, $locationId = null)
    {
        $locations = [];
        
        if ($viewBy === 'all' || $viewBy === 'warehouse') {
            $warehouseMovements = StockMovementLog::where('product_id', $productId)
                ->where(function($q) {
                    $q->where('from_type', 'warehouse')->orWhere('to_type', 'warehouse');
                })
                ->get();
            
            $warehouseNet = $this->calculateNetForLocation($warehouseMovements, 'warehouse');
            foreach ($warehouseNet as $whId => $qty) {
                $warehouse = Warehouse::find($whId);
                if ($warehouse && (!$locationId || $locationId == $whId)) {
                    $locations[] = [
                        'type' => 'warehouse',
                        'id' => $whId,
                        'name' => $warehouse->name,
                        'quantity' => $qty,
                    ];
                }
            }
        }
        
        if ($viewBy === 'all' || $viewBy === 'collection_center') {
            $ccMovements = StockMovementLog::where('product_id', $productId)
                ->where(function($q) {
                    $q->where('from_type', 'collection_center')->orWhere('to_type', 'collection_center');
                })
                ->get();
            
            $ccNet = $this->calculateNetForLocation($ccMovements, 'collection_center');
            foreach ($ccNet as $ccId => $qty) {
                $center = CollectionCenter::find($ccId);
                if ($center && (!$locationId || $locationId == $ccId)) {
                    $locations[] = [
                        'type' => 'collection_center',
                        'id' => $ccId,
                        'name' => $center->cc_name,
                        'quantity' => $qty,
                    ];
                }
            }
        }
        
        return $locations;
    }
    
    private function getStockStatusText($quantity)
    {
        if ($quantity <= 0) return 'Out of Stock';
        if ($quantity <= 5) return 'Very Low Stock';
        if ($quantity <= 10) return 'Low Stock';
        if ($quantity <= 50) return 'Normal Stock';
        return 'High Stock';
    }
    
    private function getStockHealth($stockData)
    {
        $totalItems = count($stockData);
        if ($totalItems === 0) {
            return [
                'healthy_items' => 0,
                'low_stock_items' => 0,
                'out_of_stock_items' => 0,
                'health_percentage' => 0,
            ];
        }
        
        $healthy = 0;
        $lowStock = 0;
        
        foreach ($stockData as $item) {
            $stock = $item['current_stock'];
            if ($stock > 10) {
                $healthy++;
            } elseif ($stock > 0) {
                $lowStock++;
            }
        }
        
        return [
            'healthy_items' => $healthy,
            'low_stock_items' => $lowStock,
            'health_percentage' => round(($healthy / $totalItems) * 100, 2),
        ];
    }
    
    private function getLastMovementDate($productId)
    {
        $lastMovement = StockMovementLog::where('product_id', $productId)
            ->orderBy('created_at', 'desc')
            ->first();
        
        return $lastMovement ? $lastMovement->created_at->format('Y-m-d H:i:s') : null;
    }
    
    private function formatSku($sku)
    {
        if (is_array($sku)) {
            return implode(', ', $sku);
        }
        if (is_string($sku) && $sku[0] === '[') {
            $decoded = json_decode($sku, true);
            return is_array($decoded) ? implode(', ', $decoded) : $sku;
        }
        return $sku ?: 'N/A';
    }
    
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
                    'cash_selling_price' => floatval($product->cash_selling_price ?? 0),
                    'loan_selling_price' => floatval($product->loan_selling_price ?? 0),
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
