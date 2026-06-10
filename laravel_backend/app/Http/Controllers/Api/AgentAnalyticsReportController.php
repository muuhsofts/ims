<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Traits\Auditable;
use App\Models\AgentInventory;
use App\Models\Sale;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AgentAnalyticsReportController extends BaseApiController
{
    use Auditable;

    public function index(Request $request): JsonResponse
    {
        $perm = $this->checkPermission('agent-dashboard.view');
        if ($perm) return $perm;

        $agentId = auth()->id();
        if (!$agentId) {
            return $this->unauthorized('User not authenticated');
        }

        try {
            // ----- PERIOD FILTERING -----
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
                            $target = ($dateInput && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateInput))
                                ? Carbon::parse($dateInput)
                                : $now;
                            $startDate = $target->copy()->startOfDay();
                            $endDate = $target->copy()->endOfDay();
                            $periodLabel = $startDate->toDateString();
                            break;
                        case 'monthly':
                            if ($dateInput && preg_match('/^\d{2}$/', $dateInput)) {
                                $target = Carbon::parse($now->format('Y') . '-' . $dateInput . '-01');
                            } elseif ($dateInput && preg_match('/^\d{4}-\d{2}$/', $dateInput)) {
                                $target = Carbon::parse($dateInput . '-01');
                            } else {
                                $target = $now->copy()->startOfMonth();
                            }
                            $startDate = $target->copy()->startOfMonth();
                            $endDate = $target->copy()->endOfMonth();
                            $periodLabel = $startDate->format('Y-m');
                            break;
                        case 'yearly':
                            $target = ($dateInput && preg_match('/^\d{4}$/', $dateInput))
                                ? Carbon::parse($dateInput . '-01-01')
                                : $now->copy()->startOfYear();
                            $startDate = $target->copy()->startOfYear();
                            $endDate = $target->copy()->endOfYear();
                            $periodLabel = $startDate->format('Y');
                            break;
                    }
                } catch (\Exception $e) {
                    Log::warning('Agent analytics date parse failed', ['period' => $period, 'date' => $dateInput]);
                }
            }

            // ----- Fetch all agent inventory rows -----
            $inventories = AgentInventory::where('user_id', $agentId)->get();

            // ========== 1. TOTAL STOCK (units) ==========
            $totalStock = 0;
            foreach ($inventories as $inv) {
                if (!empty($inv->product_ids) && is_array($inv->product_ids)) {
                    $totalStock += count($inv->product_ids);
                } else {
                    $totalStock += $inv->quantity_received;
                }
            }

            // ========== 2. SALES STATISTICS (period‑filtered) ==========
            $salesQuery = Sale::where('agent_id', $agentId);
            if ($startDate && $endDate) {
                $salesQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $totalSalesAmount = (float) $salesQuery->sum('total_amount');
            $totalSalesCount  = $salesQuery->count();

            // ========== 3. TOP 5 SALES (with customer & product details) ==========
            $topSalesQuery = Sale::where('agent_id', $agentId)->with(['customer', 'product.category']);
            if ($startDate && $endDate) {
                $topSalesQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $topSales = $topSalesQuery->orderBy('total_amount', 'desc')
                ->limit(5)
                ->get()
                ->map(fn($sale) => [
                    'sale_id'        => $sale->sale_id,
                    'customer_name'  => $sale->customer->customer_name ?? $sale->customer_name,
                    'customer_phone' => $sale->customer->msisdn ?? $sale->customer_phone,
                    'total_amount'   => $sale->total_amount,
                    'payment_method' => $sale->payment_method,
                    'status'         => $sale->status,
                    'created_at'     => $sale->created_at->toDateTimeString(),
                    'product_name'   => $sale->product->product_name ?? 'Unknown',
                    'category_name'  => $sale->product->category->category_name ?? 'Unknown',
                    'model'          => $sale->product->category->model ?? 'Unknown',
                    'imei'           => $sale->product->imei ?? 'Unknown',
                    'sku'            => $sale->product->sku ?? 'Unknown',
                ]);

            // ========== 4. WEEKLY SALES TREND ==========
            $weeklySales = Sale::where('agent_id', $agentId)
                ->where('created_at', '>=', Carbon::now()->subDays(7))
                ->select(DB::raw('DATE(created_at) as day'), DB::raw('COUNT(*) as sales_count'))
                ->groupBy('day')
                ->orderBy('day', 'asc')
                ->get()
                ->map(fn($item) => [
                    'day' => Carbon::parse($item->day)->format('D, M j'),
                    'sales_count' => $item->sales_count,
                ]);

            // ========== 5. PIE CHART: Categories (with model info in tooltip later) ==========
            $categoryCounts = [];
            foreach ($inventories as $inv) {
                $productIds = [];
                if (!empty($inv->product_ids) && is_array($inv->product_ids)) {
                    $productIds = $inv->product_ids;
                } elseif ($inv->product_id) {
                    $productIds = [$inv->product_id];
                }
                foreach ($productIds as $pid) {
                    $product = Product::with('category')->find($pid);
                    if ($product && $product->category) {
                        $catName = $product->category->category_name;
                        $categoryCounts[$catName] = ($categoryCounts[$catName] ?? 0) + 1;
                    }
                }
            }
            $pieChart = collect($categoryCounts)->map(fn($count, $cat) => [
                'category' => $cat,
                'product_count' => $count,
            ])->values();

            // ========== 6. HISTOGRAM: Stock per product (with category & model) ==========
            $productCountMap = [];
            foreach ($inventories as $inv) {
                $productIds = [];
                if (!empty($inv->product_ids) && is_array($inv->product_ids)) {
                    $productIds = $inv->product_ids;
                } elseif ($inv->product_id) {
                    $productIds = [$inv->product_id];
                }
                foreach ($productIds as $pid) {
                    $productCountMap[$pid] = ($productCountMap[$pid] ?? 0) + 1;
                }
            }

            $uniqueProductIds = array_keys($productCountMap);
            $products = Product::with('category')->whereIn('product_id', $uniqueProductIds)->get()->keyBy('product_id');

            $productStock = collect($productCountMap)->map(function ($qty, $pid) use ($products) {
                $product = $products->get($pid);
                if (!$product) {
                    return [
                        'product_name' => 'Unknown Product',
                        'category_name' => 'Unknown',
                        'model' => 'Unknown',
                        'quantity' => $qty,
                    ];
                }
                return [
                    'product_name' => $product->product_name,
                    'category_name' => $product->category->category_name ?? 'Unknown',
                    'model' => $product->category->model ?? 'Unknown',
                    'sku' => $product->sku ?? 'Unknown',
                    'imei' => $product->imei ?? 'Unknown',
                    'quantity' => $qty,
                ];
            })->sortByDesc('quantity')->take(10)->values();

            // Audit log
            $this->logAudit(
                'view_agent_dashboard',
                'agent_dashboard',
                null,
                "Viewed agent analytics dashboard (period: {$periodLabel})"
            );

            return $this->successResponse([
                'cards' => [
                    'total_stock'        => $totalStock,
                    'total_sales_amount' => $totalSalesAmount,
                    'total_sales_count'  => $totalSalesCount,
                    'period'             => $periodLabel,
                ],
                'pie_chart'               => $pieChart,
                'weekly_sales'            => $weeklySales,
                'top_5_sales'             => $topSales,
                'product_stock_histogram' => $productStock,
            ], 'Agent analytics retrieved successfully');

        } catch (\Exception $e) {
            Log::error('Agent analytics failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->serverError('Failed to load agent analytics: ' . $e->getMessage());
        }
    }
}