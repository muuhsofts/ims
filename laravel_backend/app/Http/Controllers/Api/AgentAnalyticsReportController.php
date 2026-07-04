<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Traits\Auditable;
use App\Models\AgentInventory;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
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

            // ========== GET INVENTORY RECORDS ==========
            $inventoryRecords = AgentInventory::where('user_id', $agentId)->get();

            $totalStock = 0;
            $remainingStock = 0;

            foreach ($inventoryRecords as $record) {
                // Total Stock: sum of quantity_received (or 1 fallback)
                $totalStock += $record->quantity_received ?? 1;

                // Remaining Stock: count items in product_ids JSON array
                if (!empty($record->product_ids) && is_array($record->product_ids)) {
                    $remainingStock += count($record->product_ids);
                }
                // if product_ids is empty, contribution is 0
            }

            // ========== SALES COUNTS ==========
            // Total sales (all statuses)
            $salesQuery = Sale::where('agent_id', $agentId);
            // No status filter – count ALL sales
            if ($startDate && $endDate) {
                $salesQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $totalSalesCount = $salesQuery->count();

            // Returned sales (status = 'returned')
            $returnsQuery = Sale::where('agent_id', $agentId)
                ->where('status', 'returned');   // adjust if status is 'refunded' or 'returned'
            if ($startDate && $endDate) {
                $returnsQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $totalReturns = $returnsQuery->count();

            // ========== LOGGING ==========
            Log::info('Agent Analytics Results:', [
                'agent_id'          => $agentId,
                'total_stock'       => $totalStock,
                'remaining_stock'   => $remainingStock,
                'total_sales_count' => $totalSalesCount,
                'total_returns'     => $totalReturns,
                'period'            => $periodLabel,
            ]);

            // ========== TOP 5 SALES (all statuses) ==========
            $topSalesQuery = Sale::where('agent_id', $agentId)
                ->with(['customer', 'product.category']); // No status filter

            if ($startDate && $endDate) {
                $topSalesQuery->whereBetween('created_at', [$startDate, $endDate]);
            }

            $topSales = $topSalesQuery->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(fn($sale) => [
                    'sale_id'        => $sale->sale_id,
                    'customer_name'  => $sale->customer->customer_name ?? $sale->customer_name,
                    'customer_phone' => $sale->customer->msisdn ?? $sale->customer_phone,
                    'payment_method' => $sale->payment_method,
                    'status'         => $sale->status,
                    'created_at'     => $sale->created_at->toDateTimeString(),
                    'product_name'   => $sale->product->product_name ?? 'Unknown',
                    'category_name'  => $sale->product->category->category_name ?? 'Unknown',
                    'model'          => $sale->product->category->model ?? 'Unknown',
                    'imei'           => $sale->product->imei ?? 'Unknown',
                    'sku'            => $sale->product->sku ?? 'Unknown',
                ]);

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
                    'remaining_stock'    => $remainingStock,
                    'total_sales_count'  => $totalSalesCount,
                    'total_returns'      => $totalReturns,
                    'period'             => $periodLabel,
                ],
                'top_5_sales' => $topSales,
            ], 'Agent analytics retrieved successfully');

        } catch (\Exception $e) {
            Log::error('Agent analytics failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->serverError('Failed to load agent analytics: ' . $e->getMessage());
        }
    }
}