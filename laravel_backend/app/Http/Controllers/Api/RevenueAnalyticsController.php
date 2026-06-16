<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Sale;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class RevenueAnalyticsController extends BaseApiController
{
    /**
     * Get revenue analytics: total, pie chart (by category), histogram (by time)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getRevenueAnalytics(Request $request): JsonResponse
    {
        $perm = $this->checkPermission('dashboard.view');
        if ($perm) return $perm;

        try {
            // ----- 1. Parse period & date -----
            $period = $request->query('period'); // daily, monthly, yearly
            $dateInput = $request->query('date');
            $startDate = null;
            $endDate = null;

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
                            break;
                        case 'monthly':
                            if ($dateInput && preg_match('/^\d{4}-\d{2}$/', $dateInput)) {
                                $target = Carbon::parse($dateInput . '-01');
                            } else {
                                $target = $now->copy()->startOfMonth();
                            }
                            $startDate = $target->copy()->startOfMonth();
                            $endDate = $target->copy()->endOfMonth();
                            break;
                        case 'yearly':
                            if ($dateInput && preg_match('/^\d{4}$/', $dateInput)) {
                                $target = Carbon::parse($dateInput . '-01-01');
                            } else {
                                $target = $now->copy()->startOfYear();
                            }
                            $startDate = $target->copy()->startOfYear();
                            $endDate = $target->copy()->endOfYear();
                            break;
                    }
                } catch (\Exception $e) {
                    Log::warning('Invalid date format in revenue analytics', ['period' => $period, 'date' => $dateInput]);
                }
            }

            // ----- 2. Total revenue (respect period) -----
            $totalRevenueQuery = Sale::query();
            if ($startDate && $endDate) {
                $totalRevenueQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $totalRevenue = (float) $totalRevenueQuery->sum('total_amount');

            // ----- 3. Revenue by category (pie chart) -----
            $revenueByCategory = [];
            try {
                $query = Sale::query()
                    ->join('products', 'sales.product_id', '=', 'products.product_id')
                    ->join('product_categories', 'products.category_id', '=', 'product_categories.category_id')
                    ->selectRaw('product_categories.category_name, SUM(sales.total_amount) as revenue');

                if ($startDate && $endDate) {
                    $query->whereBetween('sales.created_at', [$startDate, $endDate]);
                }
                $revenueByCategory = $query->groupBy('product_categories.category_name')
                    ->get()
                    ->map(fn($item) => [
                        'category' => $item->category_name,
                        'revenue'  => (float) $item->revenue,
                    ]);
            } catch (\Exception $e) {
                Log::warning('Revenue by category query failed', ['error' => $e->getMessage()]);
            }

            // ----- 4. Revenue histogram (time bins) -----
            $histogram = [];
            if ($startDate && $endDate && $period) {
                try {
                    $groupBy = match ($period) {
                        'daily'   => 'DATE(sales.created_at)',
                        'monthly' => 'DATE_FORMAT(sales.created_at, "%Y-%m")',
                        'yearly'  => 'YEAR(sales.created_at)',
                        default   => null,
                    };
                    if ($groupBy) {
                        $histogramQuery = Sale::query()
                            ->selectRaw("$groupBy as bin, SUM(total_amount) as revenue")
                            ->whereBetween('created_at', [$startDate, $endDate])
                            ->groupBy('bin')
                            ->orderBy('bin');

                        $histogram = $histogramQuery->get()->map(fn($row) => [
                            'bin'     => $row->bin,
                            'revenue' => (float) $row->revenue,
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::warning('Revenue histogram query failed', ['error' => $e->getMessage()]);
                }
            }

            // ----- Response -----
            return $this->successResponse([
                'total_revenue'        => $totalRevenue,
                'revenue_pie_chart'    => $revenueByCategory,
                'revenue_histogram'    => $histogram,
                'period_applied'       => $period ?? 'all-time',
                'date_range'           => [
                    'start' => $startDate ? $startDate->toDateTimeString() : null,
                    'end'   => $endDate ? $endDate->toDateTimeString() : null,
                ],
            ], 'Revenue analytics retrieved successfully');

        } catch (\Exception $e) {
            Log::error('Revenue analytics crash: ' . $e->getMessage());
            return $this->serverError('Failed to load revenue analytics: ' . $e->getMessage());
        }
    }
}