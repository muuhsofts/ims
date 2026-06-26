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

            // ========== STEP 1: Get ALL product IDs from inventory for this agent ==========
            $inventoryRecords = AgentInventory::where('user_id', $agentId)->get();
            
            $inventoryProductIds = [];
            
            foreach ($inventoryRecords as $record) {
                if (!empty($record->product_id)) {
                    $inventoryProductIds[] = $record->product_id;
                }
            }
            
            // Log inventory product IDs
            Log::info('Inventory Product IDs:', [
                'count' => count($inventoryProductIds),
                'ids' => $inventoryProductIds
            ]);

            // ========== STEP 2: Get ALL product IDs from sales ==========
            $salesRecords = Sale::where('agent_id', $agentId)
                ->where('status', 'completed')
                ->whereNotNull('product_id')
                ->get();
            
            $soldProductIds = [];
            
            foreach ($salesRecords as $record) {
                if (!empty($record->product_id)) {
                    $soldProductIds[] = $record->product_id;
                }
            }
            
            // Log sold product IDs
            Log::info('Sold Product IDs:', [
                'count' => count($soldProductIds),
                'ids' => $soldProductIds
            ]);

            // ========== STEP 3: Calculate remaining stock ==========
            $remainingStock = 0;
            $unsoldProducts = [];

            // Loop through each product in inventory
            foreach ($inventoryProductIds as $inventoryProductId) {
                $isSold = false;
                
                // Check if this product is in the sold list
                foreach ($soldProductIds as $soldProductId) {
                    if ($inventoryProductId === $soldProductId) {
                        $isSold = true;
                        break;
                    }
                }
                
                // If not sold, count it as remaining stock
                if (!$isSold) {
                    $remainingStock++;
                    $unsoldProducts[] = $inventoryProductId;
                }
            }

            // Log remaining stock calculation
            Log::info('Remaining Stock Calculation:', [
                'remaining_count' => $remainingStock,
                'unsold_products' => $unsoldProducts
            ]);

            // Total stock
            $totalStock = count(array_unique($inventoryProductIds));

            // Total transactions
            $totalSalesCount = Sale::where('agent_id', $agentId)
                ->where('status', 'completed');
            
            if ($startDate && $endDate) {
                $totalSalesCount->whereBetween('created_at', [$startDate, $endDate]);
            }
            $totalSalesCount = $totalSalesCount->count();

            // Log final results
            Log::info('Final Results:', [
                'total_stock' => $totalStock,
                'remaining_stock' => $remainingStock,
                'total_sales_count' => $totalSalesCount
            ]);

            // ========== STEP 4: Get TOP 5 SALES ==========
            $topSalesQuery = Sale::where('agent_id', $agentId)
                ->where('status', 'completed')
                ->with(['customer', 'product.category']);
            
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