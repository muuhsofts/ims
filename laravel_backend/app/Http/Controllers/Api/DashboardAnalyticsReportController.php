<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Traits\Auditable;
use App\Models\Customer;
use App\Models\User;
use App\Models\Supplier;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Inventory;
use App\Models\AgentInventory;
use App\Models\CollectionCenterInventory;
use App\Models\StockDistribution;
use App\Models\StockMovement;
use App\Models\TransferRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DashboardAnalyticsReportController extends BaseApiController
{
    use Auditable;

    public function index(Request $request): JsonResponse
    {
        $perm = $this->checkPermission('dashboard.view');
        if ($perm) return $perm;

        try {
            // ----- Period resolution with safe parsing -----
            $period = $request->query('period');
            $dateInput = $request->query('date');
            $startDate = null;
            $endDate = null;
            $periodLabel = 'all-time';

            if ($period && in_array($period, ['daily', 'monthly', 'yearly'])) {
                try {
                    $now = Carbon::now();
                    switch ($period) {
                        case 'daily':
                            if ($dateInput && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateInput)) {
                                $target = Carbon::parse($dateInput);
                            } else {
                                $target = $now;
                            }
                            $startDate = $target->copy()->startOfDay();
                            $endDate = $target->copy()->endOfDay();
                            $periodLabel = $startDate->toDateString();
                            break;
                        case 'monthly':
                            if ($dateInput && preg_match('/^\d{4}-\d{2}$/', $dateInput)) {
                                $target = Carbon::parse($dateInput . '-01');
                            } else {
                                $target = $now->copy()->startOfMonth();
                            }
                            $startDate = $target->copy()->startOfMonth();
                            $endDate = $target->copy()->endOfMonth();
                            $periodLabel = $startDate->format('Y-m');
                            break;
                        case 'yearly':
                            if ($dateInput && preg_match('/^\d{4}$/', $dateInput)) {
                                $target = Carbon::parse($dateInput . '-01-01');
                            } else {
                                $target = $now->copy()->startOfYear();
                            }
                            $startDate = $target->copy()->startOfYear();
                            $endDate = $target->copy()->endOfYear();
                            $periodLabel = $startDate->format('Y');
                            break;
                    }
                } catch (\Exception $e) {
                    Log::warning('Invalid date format', ['period' => $period, 'date' => $dateInput]);
                    $startDate = null;
                    $endDate = null;
                }
            }

            // ----- Master data (all-time) -----
            $totalUsers      = User::count();
            $totalCustomers  = Customer::count();
            $totalSuppliers  = Supplier::count();
            $totalProducts   = Product::count();
            $totalCategories = ProductCategory::count();
            $inventoryLevel  = Inventory::sum('quantity');

            // ----- Period‑based aggregates (purchases & sales) -----
            $purchasesQuery = Purchase::query();
            $salesQuery = Sale::query();
            if ($startDate && $endDate) {
                $purchasesQuery->whereBetween('created_at', [$startDate, $endDate]);
                $salesQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $periodPurchasesCount = $purchasesQuery->count();
            $periodPurchasesTotal = $purchasesQuery->sum('subtotal');
            $periodSalesCount     = $salesQuery->count();
            $periodSalesTotal     = $salesQuery->sum('total_amount');

            // ----- Top 5 purchases -----
            $topPurchasesQuery = Purchase::with('supplier');
            if ($startDate && $endDate) {
                $topPurchasesQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $topPurchases = $topPurchasesQuery->orderBy('subtotal', 'desc')->limit(5)->get()->map(fn($p) => [
                'purchase_id'   => $p->purchase_id,
                'supplier_name' => $p->supplier->supplier_name ?? 'N/A',
                'quantity'      => $p->quantity_ordered,
                'unit_price'    => $p->unit_price,
                'subtotal'      => $p->subtotal,
                'status'        => $p->status,
                'created_at'    => $p->created_at->toDateTimeString(),
            ]);

            // ----- Top 5 sales -----
            $topSalesQuery = Sale::with('customer');
            if ($startDate && $endDate) {
                $topSalesQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $topSales = $topSalesQuery->orderBy('total_amount', 'desc')->limit(5)->get()->map(fn($s) => [
                'sale_id'        => $s->sale_id,
                'customer_name'  => $s->customer->customer_name ?? $s->customer_name,
                'customer_phone' => $s->customer->msisdn ?? $s->customer_phone,
                'total_amount'   => $s->total_amount,
                'payment_method' => $s->payment_method,
                'status'         => $s->status,
                'created_at'     => $s->created_at->toDateTimeString(),
            ]);

            // ----- Pie chart & products by category -----
            $pieChart = ProductCategory::withCount('products')->get()->map(fn($cat) => [
                'category' => $cat->category_name,
                'product_count' => $cat->products_count,
            ]);

            $productsByCategory = Product::with('category')->get()
                ->groupBy(fn($p) => $p->category->category_name ?? 'Uncategorized')
                ->map(fn($products, $catName) => [
                    'category' => $catName,
                    'count' => $products->count(),
                    'products' => $products->map(fn($p) => [
                        'product_id'    => $p->product_id,
                        'imei'          => $p->imei,
                        'color'         => $p->color,
                        'buying_price'  => $p->buying_price,
                        'selling_price' => $p->selling_price,
                        'stock_status'  => $p->stock_status,
                    ])->values(),
                ])->values();

            // ----- EXTENDED ANALYTICS (using correct columns) -----
            $extended = [];

            // Agent Inventory – use quantity_received column
            if (class_exists(AgentInventory::class)) {
                try {
                    $extended['agent_inventory'] = [
                        'total_quantity' => AgentInventory::sum('quantity_received') ?? 0,
                        'records_count'  => AgentInventory::count(),
                    ];
                } catch (\Exception $e) {
                    Log::warning('AgentInventory query failed', ['error' => $e->getMessage()]);
                    $extended['agent_inventory'] = ['total_quantity' => 0, 'records_count' => 0];
                }
            } else {
                $extended['agent_inventory'] = ['total_quantity' => 0, 'records_count' => 0];
            }

            // Collection Center Inventory – has 'quantity' column
            if (class_exists(CollectionCenterInventory::class)) {
                try {
                    $extended['collection_center_inventory'] = [
                        'total_quantity' => CollectionCenterInventory::sum('quantity') ?? 0,
                        'records_count'  => CollectionCenterInventory::count(),
                    ];
                } catch (\Exception $e) {
                    Log::warning('CollectionCenterInventory query failed', ['error' => $e->getMessage()]);
                    $extended['collection_center_inventory'] = ['total_quantity' => 0, 'records_count' => 0];
                }
            } else {
                $extended['collection_center_inventory'] = ['total_quantity' => 0, 'records_count' => 0];
            }

            // Stock Distributions
            if (class_exists(StockDistribution::class)) {
                try {
                    $extended['stock_distributions'] = [
                        'total_quantity'   => StockDistribution::sum('quantity') ?? 0,
                        'pending_count'    => StockDistribution::where('status', 'pending')->count(),
                        'completed_count'  => StockDistribution::where('status', 'completed')->count(),
                    ];
                } catch (\Exception $e) {
                    Log::warning('StockDistribution query failed', ['error' => $e->getMessage()]);
                    $extended['stock_distributions'] = ['total_quantity' => 0, 'pending_count' => 0, 'completed_count' => 0];
                }
            } else {
                $extended['stock_distributions'] = ['total_quantity' => 0, 'pending_count' => 0, 'completed_count' => 0];
            }

            // Stock Movements
            if (class_exists(StockMovement::class)) {
                try {
                    $extended['stock_movements'] = [
                        'total_movements' => StockMovement::count(),
                    ];
                } catch (\Exception $e) {
                    Log::warning('StockMovement query failed', ['error' => $e->getMessage()]);
                    $extended['stock_movements'] = ['total_movements' => 0];
                }
            } else {
                $extended['stock_movements'] = ['total_movements' => 0];
            }

            // Transfer Requests
            if (class_exists(TransferRequest::class)) {
                try {
                    $extended['transfer_requests'] = [
                        'total_requests'     => TransferRequest::count(),
                        'pending_requests'   => TransferRequest::where('status', 'pending')->count(),
                        'completed_requests' => TransferRequest::where('status', 'completed')->count(),
                    ];
                } catch (\Exception $e) {
                    Log::warning('TransferRequest query failed', ['error' => $e->getMessage()]);
                    $extended['transfer_requests'] = ['total_requests' => 0, 'pending_requests' => 0, 'completed_requests' => 0];
                }
            } else {
                $extended['transfer_requests'] = ['total_requests' => 0, 'pending_requests' => 0, 'completed_requests' => 0];
            }

            // ----- Audit log -----
            $this->logAudit('view_dashboard', 'dashboard', null, "Viewed dashboard analytics (period: {$periodLabel})");

            // ----- Final response -----
            return $this->successResponse([
                'cards' => [
                    'total_users'       => $totalUsers,
                    'total_customers'   => $totalCustomers,
                    'total_suppliers'   => $totalSuppliers,
                    'total_products'    => $totalProducts,
                    'total_categories'  => $totalCategories,
                    'inventory_level'   => $inventoryLevel,
                    'period'            => $periodLabel,
                    'purchases_count'   => $periodPurchasesCount,
                    'purchases_total'   => (float) $periodPurchasesTotal,
                    'sales_count'       => $periodSalesCount,
                    'sales_total'       => (float) $periodSalesTotal,
                ],
                'extended_analytics'           => $extended,
                'pie_chart'                    => $pieChart,
                'top_5_purchases'              => $topPurchases,
                'top_5_sales_with_customers'   => $topSales,
                'products_by_category'         => $productsByCategory,
            ], 'Dashboard analytics retrieved successfully');

        } catch (\Exception $e) {
            Log::error('Dashboard analytics crash: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            // Return full error for debugging – remove or change in production
            return $this->serverError('Failed to load dashboard analytics: ' . $e->getMessage());
        }
    }
}