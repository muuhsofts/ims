<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Traits\Auditable;
use App\Models\CollectionCenterInventory;
use App\Models\AgentInventory;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use App\Models\TransferRequest;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BranchOwnerAnalyticsReportController extends BaseApiController
{
    use Auditable;

    public function index(Request $request): JsonResponse
    {
        // 1. Permission check
        $perm = $this->checkPermission('cc_center_dashboard.view');
        if ($perm) return $perm;

        $user = auth()->user();
        if (!$user) {
            return $this->unauthorized('User not authenticated');
        }

        // Branch owner must have a cc_id
        $ccId = $user->cc_id;
        if (!$ccId) {
            return $this->errorResponse('Branch owner not associated with any collection center', 400);
        }

        try {
            // ----- Period filtering (optional) -----
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
                    Log::warning('Branch owner analytics date parse failed', ['period' => $period, 'date' => $dateInput]);
                }
            }

            // ========== 1. CC Inventory (total units) ==========
            $ccInventory = CollectionCenterInventory::where('cc_id', $ccId)->first();
            $totalCcStock = 0;
            $productIdsInCc = [];
            if ($ccInventory && !empty($ccInventory->product_ids) && is_array($ccInventory->product_ids)) {
                $totalCcStock = count($ccInventory->product_ids);
                $productIdsInCc = $ccInventory->product_ids;
            }

            // ========== 2. Agents under this branch ==========
            $agents = User::where('cc_id', $ccId)
                ->whereHas('role', function ($q) {
                    $q->where('name', 'SALES_AGENT');
                })
                ->get();
            $totalAgents = $agents->count();

            // ========== 3. Total stock held by agents ==========
            $totalAgentStock = 0;
            $agentStockMap = []; // for pie chart later
            foreach ($agents as $agent) {
                $agentInv = AgentInventory::where('user_id', $agent->id)->get();
                $agentTotal = 0;
                foreach ($agentInv as $inv) {
                    if (!empty($inv->product_ids) && is_array($inv->product_ids)) {
                        $agentTotal += count($inv->product_ids);
                    } else {
                        $agentTotal += $inv->quantity_received;
                    }
                }
                $totalAgentStock += $agentTotal;
                $agentStockMap[$agent->name] = $agentTotal;
            }

            // ========== 4. Transfer requests (counts & recent list) ==========
            $transferQuery = TransferRequest::where('cc_id', $ccId);
            if ($startDate && $endDate) {
                $transferQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $transferStats = [
                'pending'  => (clone $transferQuery)->where('status', 'pending')->count(),
                'approved' => (clone $transferQuery)->where('status', 'approved')->count(),
                'rejected' => (clone $transferQuery)->where('status', 'rejected')->count(),
                'total'    => $transferQuery->count(),
            ];

            // Recent transfers (limit 10)
            $recentTransfers = TransferRequest::where('cc_id', $ccId)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($tr) {
                    return [
                        'request_id'       => $tr->request_id,
                        'requested_items'  => $tr->requested_items, // JSON array
                        'total_quantity'   => $tr->total_quantity,
                        'status'           => $tr->status,
                        'approved_by'      => $tr->approved_by,
                        'approved_at'      => $tr->approved_at,
                        'created_at'       => $tr->created_at->toDateTimeString(),
                    ];
                });

            // ========== 5. Weekly transfer trend (last 7 days) ==========
            $weeklyTransfers = TransferRequest::where('cc_id', $ccId)
                ->where('created_at', '>=', Carbon::now()->subDays(7))
                ->select(DB::raw('DATE(created_at) as day'), DB::raw('COUNT(*) as transfer_count'))
                ->groupBy('day')
                ->orderBy('day', 'asc')
                ->get()
                ->map(fn($item) => [
                    'day' => Carbon::parse($item->day)->format('D, M j'),
                    'transfer_count' => $item->transfer_count,
                ]);

            // ========== 6. Pie chart: Product categories from CC inventory ==========
            $categoryCounts = [];
            foreach ($productIdsInCc as $pid) {
                $product = Product::with('category')->find($pid);
                if ($product && $product->category) {
                    $catName = $product->category->category_name;
                    $categoryCounts[$catName] = ($categoryCounts[$catName] ?? 0) + 1;
                }
            }
            $categoryPie = collect($categoryCounts)->map(fn($count, $cat) => [
                'category' => $cat,
                'product_count' => $count,
            ])->values();

            // ========== 7. Pie chart: Agent stock distribution ==========
            $agentPie = collect($agentStockMap)->map(fn($stock, $name) => [
                'agent_name' => $name,
                'stock' => $stock,
            ])->values();

            // ========== 8. Histogram: Top 10 stocked products (from CC inventory) ==========
            $productCountMap = [];
            foreach ($productIdsInCc as $pid) {
                $productCountMap[$pid] = ($productCountMap[$pid] ?? 0) + 1;
            }
            arsort($productCountMap);
            $topProductIds = array_slice(array_keys($productCountMap), 0, 10);
            $products = Product::with('category')->whereIn('product_id', $topProductIds)->get()->keyBy('product_id');

            $productStockHistogram = collect($productCountMap)->take(10)->map(function ($qty, $pid) use ($products) {
                $product = $products->get($pid);
                if (!$product) {
                    return [
                        'product_name' => 'Unknown Product',
                        'category_name' => 'Unknown',
                        'model' => 'Unknown',
                        'sku' => 'Unknown',
                        'imei' => 'Unknown',
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
            })->values();

            // Audit log
            $this->logAudit(
                'view_branch_owner_dashboard',
                'branch_owner_dashboard',
                null,
                "Viewed branch owner analytics dashboard (period: {$periodLabel})"
            );

            return $this->successResponse([
                'cards' => [
                    'total_cc_stock'      => $totalCcStock,
                    'total_agent_stock'   => $totalAgentStock,
                    'total_agents'        => $totalAgents,
                    'period'              => $periodLabel,
                ],
                'transfer_stats' => $transferStats,
                'recent_transfers' => $recentTransfers,
                'weekly_transfers' => $weeklyTransfers,
                'category_pie'     => $categoryPie,
                'agent_pie'        => $agentPie,
                'product_stock_histogram' => $productStockHistogram,
            ], 'Branch owner analytics retrieved successfully');

        } catch (\Exception $e) {
            Log::error('Branch owner analytics failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->serverError('Failed to load branch owner analytics: ' . $e->getMessage());
        }
    }
}