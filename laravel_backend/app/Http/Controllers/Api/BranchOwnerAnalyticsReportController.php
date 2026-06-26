<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Traits\Auditable;
use App\Models\CollectionCenterInventory;
use App\Models\AgentInventory;
use App\Models\Product;
use App\Models\User;
use App\Models\Role;
use App\Models\CollectionCenter;
use Carbon\Carbon;
use App\Models\TransferRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BranchOwnerAnalyticsReportController extends BaseApiController
{
    use Auditable;

    public function index(Request $request): JsonResponse
    {
        $perm = $this->checkPermission('cc_center_dashboard.view');
        if ($perm) return $perm;

        $user = auth()->user();
        if (!$user) {
            return $this->unauthorized('User not authenticated');
        }

        // Get all collection centers owned by this branch owner
        $ownedCenterIds = CollectionCenter::where('owner_id', $user->id)->pluck('cc_id')->toArray();
        if (empty($ownedCenterIds)) {
            return $this->errorResponse('Branch owner does not own any collection center', 400);
        }

        try {
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

            // Get SALES_AGENT role ID
            $salesAgentRole = Role::where('name', 'SALES_AGENT')->first();
            if (!$salesAgentRole) {
                Log::error('SALES_AGENT role not found');
                return $this->errorResponse('System misconfiguration: SALES_AGENT role missing', 500);
            }
            $salesAgentRoleId = $salesAgentRole->id;

            // 1. Total CC stock across all owned centers
            $totalCcStock = 0;
            $productIdsInCc = [];
            $ccInventories = CollectionCenterInventory::whereIn('cc_id', $ownedCenterIds)->get();
            foreach ($ccInventories as $inv) {
                if (!empty($inv->product_ids) && is_array($inv->product_ids)) {
                    $totalCcStock += count($inv->product_ids);
                    $productIdsInCc = array_merge($productIdsInCc, $inv->product_ids);
                }
            }
            // remove duplicates
            $productIdsInCc = array_unique($productIdsInCc);

            // 2. Agents under these centers (any center owned by branch owner)
            $agents = User::whereIn('cc_id', $ownedCenterIds)
                ->where('role_id', $salesAgentRoleId)
                ->get();
            $totalAgents = $agents->count();

            // 3. Total agent stock
            $totalAgentStock = 0;
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
            }

            // 4. Transfer requests for any owned center
            $transferQuery = TransferRequest::whereIn('cc_id', $ownedCenterIds);
            if ($startDate && $endDate) {
                $transferQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $transferStats = [
                'pending'  => (clone $transferQuery)->where('status', 'pending')->count(),
                'approved' => (clone $transferQuery)->where('status', 'approved')->count(),
                'rejected' => (clone $transferQuery)->where('status', 'rejected')->count(),
                'total'    => $transferQuery->count(),
            ];

            // 5. Recent transfers
            $recentTransfers = TransferRequest::whereIn('cc_id', $ownedCenterIds)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($tr) {
                    return [
                        'request_id'       => $tr->request_id,
                        'requested_items'  => $tr->requested_items,
                        'total_quantity'   => $tr->total_quantity,
                        'status'           => $tr->status,
                        'approved_by'      => $tr->approved_by,
                        'approved_at'      => $tr->approved_at,
                        'created_at'       => $tr->created_at->toDateTimeString(),
                    ];
                });

            // 6. Top 10 stocked products (from all owned centers' inventory)
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
                        'product_name'  => 'Unknown Product',
                        'category_name' => 'Unknown',
                        'model'         => 'Unknown',
                        'sku'           => 'Unknown',
                        'imei'          => 'Unknown',
                        'quantity'      => $qty,
                    ];
                }
                return [
                    'product_name'  => $product->product_name,
                    'category_name' => $product->category->category_name ?? 'Unknown',
                    'model'         => $product->category->model ?? 'Unknown',
                    'sku'           => $product->sku ?? 'Unknown',
                    'imei'          => $product->imei ?? 'Unknown',
                    'quantity'      => $qty,
                ];
            })->values();

            // Audit log
            $this->logAudit(
                'view_branch_owner_dashboard',
                'branch_owner_dashboard',
                null,
                "Viewed branch owner analytics (period: {$periodLabel})"
            );

            return $this->successResponse([
                'cards' => [
                    'total_cc_stock'    => $totalCcStock,
                    'total_agent_stock' => $totalAgentStock,
                    'total_agents'      => $totalAgents,
                    'period'            => $periodLabel,
                ],
                'transfer_stats'          => $transferStats,
                'recent_transfers'        => $recentTransfers,
                'product_stock_histogram' => $productStockHistogram,
            ], 'Branch owner analytics retrieved successfully');

        } catch (\Exception $e) {
            Log::error('Branch owner analytics failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->serverError('Failed to load branch owner analytics: ' . $e->getMessage());
        }
    }
}