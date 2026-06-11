<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\AgentInventory;
use App\Models\Product;
use App\Models\User;
use App\Traits\Auditable;
use Carbon\Carbon;
use Illuminate\Http\Request;

class BranchOwnerReportController extends BaseApiController
{
    use Auditable;

    /**
     * BRANCH OWNER STOCK REPORT – Collection center stock
     * GET /api/v14/reports/branch/stock?from_date=&to_date=&stock_status=
     */
    public function branchStockReport(Request $request)
    {
        $perm = $this->checkPermission('branch-owner-reports.stock.view');
        if ($perm) return $perm;

        $user = auth()->user();
        $ccId = $user->cc_id;
        if (!$ccId) {
            return $this->errorResponse('Branch owner not associated with any collection center', 400);
        }

        $fromDate = $request->get('from_date');
        $toDate   = $request->get('to_date');
        $stockStatus = $request->get('stock_status'); // optional: 'in_stock', 'transferred', 'sold'
        $startDate = $fromDate ? Carbon::parse($fromDate)->startOfDay() : null;
        $endDate   = $toDate   ? Carbon::parse($toDate)->endOfDay()   : null;

        $query = \App\Models\CollectionCenterInventory::where('cc_id', $ccId);
        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [$startDate, $endDate]);
        }
        $inventories = $query->orderBy('created_at', 'desc')->get();

        $productCounts = [];
        foreach ($inventories as $inv) {
            if (!empty($inv->product_ids) && is_array($inv->product_ids)) {
                foreach ($inv->product_ids as $pid) {
                    $productCounts[$pid] = ($productCounts[$pid] ?? 0) + 1;
                }
            }
        }

        $totalUnits = array_sum($productCounts);
        $totalValue = 0;
        $productsData = [];

        if (!empty($productCounts)) {
            $products = Product::with('category')
                ->whereIn('product_id', array_keys($productCounts))
                ->get()
                ->keyBy('product_id');

            foreach ($productCounts as $pid => $qty) {
                $product = $products->get($pid);
                if (!$product) continue;
                if ($stockStatus && $product->stock_status !== $stockStatus) continue; // filter by stock_status

                $buyingPrice = floatval($product->buying_price ?? 0);
                $totalValue += $buyingPrice * $qty;

                $productsData[] = [
                    'product_id'     => $pid,
                    'product_name'   => $product->product_name ?? ($product->category->category_name ?? '') . ' ' . ($product->category->model ?? ''),
                    'imei'           => $product->imei ?? '',
                    'color'          => $product->color ?? '',
                    'buying_price'   => $buyingPrice,
                    'selling_price'  => floatval($product->selling_price ?? 0),
                    'quantity'       => $qty,
                    'category_name'  => $product->category->category_name ?? '',
                    'model'          => $product->category->model ?? '',
                    'sku'            => $product->sku ?? '',              // use product's own SKU string
                    'status'         => $product->status ?? '',
                    'stock_status'   => $product->stock_status ?? '',
                ];
            }
        }

        $result = [
            'summary' => [
                'total_unique_products' => count($productsData),
                'total_units'           => $totalUnits,
                'total_value'           => round($totalValue, 2),
                'average_unit_price'    => $totalUnits > 0 ? round($totalValue / $totalUnits, 2) : 0,
            ],
            'date_range' => [
                'from' => $startDate ? $startDate->toDateString() : null,
                'to'   => $endDate ? $endDate->toDateString() : null,
            ],
            'products' => $productsData,
        ];

        $this->logAudit('view_branch_stock_report', 'report', null, "Branch owner viewed stock report for CC {$ccId}");
        return $this->successResponse($result, 'Branch stock report retrieved successfully');
    }

    /**
     * BRANCH OWNER AGENT STOCK REPORT – Summary + product details for a specific agent
     * GET /api/v14/reports/branch/agent-stock?from_date=&to_date=&agent_id=&stock_status=
     */
    public function branchAgentStockReport(Request $request, $specificAgentId = null)
    {
        $perm = $this->checkPermission('branch-owner-reports.stock.view');
        if ($perm) return $perm;

        $user = auth()->user();
        $ccId = $user->cc_id;
        if (!$ccId) {
            return $this->errorResponse('Branch owner not associated with any collection center', 400);
        }

        $fromDate = $request->get('from_date');
        $toDate   = $request->get('to_date');
        $agentId  = $specificAgentId ?? $request->get('agent_id');
        $stockStatus = $request->get('stock_status'); // optional filter

        $startDate = $fromDate ? Carbon::parse($fromDate)->startOfDay() : null;
        $endDate   = $toDate   ? Carbon::parse($toDate)->endOfDay()   : null;

        $agentsQuery = User::where('cc_id', $ccId)
            ->whereHas('role', fn($q) => $q->where('name', 'SALES_AGENT'));
        if ($agentId) {
            $agentsQuery->where('id', $agentId);
        }
        $agents = $agentsQuery->get();

        $agentStockSummary = [];

        foreach ($agents as $agent) {
            $invQuery = AgentInventory::where('user_id', $agent->id);
            if ($startDate && $endDate) {
                $invQuery->whereBetween('created_at', [$startDate, $endDate]);
            }
            $inventories = $invQuery->get();

            $productCounts = [];
            foreach ($inventories as $inv) {
                $productIds = [];
                if (!empty($inv->product_ids) && is_array($inv->product_ids)) {
                    $productIds = $inv->product_ids;
                } elseif ($inv->product_id) {
                    $productIds = [$inv->product_id];
                }
                foreach ($productIds as $pid) {
                    $productCounts[$pid] = ($productCounts[$pid] ?? 0) + 1;
                }
            }

            $totalUnits = array_sum($productCounts);
            $productsData = [];
            $totalValue = 0;

            if (!empty($productCounts)) {
                $products = Product::with('category')
                    ->whereIn('product_id', array_keys($productCounts))
                    ->get()
                    ->keyBy('product_id');

                foreach ($productCounts as $pid => $qty) {
                    $product = $products->get($pid);
                    if (!$product) continue;
                    if ($stockStatus && $product->stock_status !== $stockStatus) continue; // filter by stock_status

                    $buyingPrice = floatval($product->buying_price ?? 0);
                    $totalValue += $buyingPrice * $qty;

                    $productsData[] = [
                        'product_id'     => $pid,
                        'product_name'   => $product->product_name ?? ($product->category->category_name ?? '') . ' ' . ($product->category->model ?? ''),
                        'imei'           => $product->imei ?? '',
                        'color'          => $product->color ?? '',
                        'buying_price'   => $buyingPrice,
                        'selling_price'  => floatval($product->selling_price ?? 0),
                        'quantity'       => $qty,
                        'category_name'  => $product->category->category_name ?? '',
                        'model'          => $product->category->model ?? '',
                        'sku'            => $product->sku ?? '',              // product's own SKU string
                        'status'         => $product->status ?? '',
                        'stock_status'   => $product->stock_status ?? '',
                    ];
                }
            }

            $agentSummary = [
                'agent_id'        => $agent->id,
                'agent_name'      => $agent->name,
                'agent_email'     => $agent->email,
                'agent_phone'     => $agent->phone,
                'total_units'     => $totalUnits,
                'unique_products' => count($productsData),
                'total_value'     => round($totalValue, 2),
                'last_activity'   => $inventories->isNotEmpty() ? $inventories->max('updated_at') : null,
            ];

            // Attach product details when requesting a single agent
            if ($agentId && count($agents) === 1) {
                $agentSummary['products'] = $productsData;
            }

            $agentStockSummary[] = $agentSummary;
        }

        if ($agentId && count($agentStockSummary) === 1) {
            $result = $agentStockSummary[0];
        } else {
            $result = [
                'summary' => [
                    'total_agents' => count($agentStockSummary),
                    'total_units'  => collect($agentStockSummary)->sum('total_units'),
                    'total_value'  => collect($agentStockSummary)->sum('total_value'),
                ],
                'agents'     => $agentStockSummary,
                'date_range' => [
                    'from' => $startDate ? $startDate->toDateString() : null,
                    'to'   => $endDate ? $endDate->toDateString() : null,
                ],
            ];
        }

        $this->logAudit('view_branch_agent_stock_report', 'report', null, "Branch owner viewed agent stock report for CC {$ccId}" . ($agentId ? " (agent $agentId)" : ""));
        return $this->successResponse($result, 'Agent stock report retrieved successfully');
    }

    /**
     * BRANCH OWNER AGENT PRODUCTS REPORT – Detailed product list for a specific agent
     * GET /api/v14/reports/branch/agent-products?agent_id=xxx&from_date=&to_date=&stock_status=
     */
    public function branchAgentProductsReport(Request $request)
    {
        $perm = $this->checkPermission('branch-owner-reports.stock.view');
        if ($perm) return $perm;

        $user = auth()->user();
        $ccId = $user->cc_id;
        if (!$ccId) {
            return $this->errorResponse('Branch owner not associated with any collection center', 400);
        }

        $agentId = $request->get('agent_id');
        if (!$agentId) {
            return $this->errorResponse('Agent ID is required', 400);
        }

        $agent = User::where('id', $agentId)
            ->where('cc_id', $ccId)
            ->whereHas('role', fn($q) => $q->where('name', 'SALES_AGENT'))
            ->first();

        if (!$agent) {
            return $this->errorResponse('Agent not found or not under your branch', 404);
        }

        $fromDate = $request->get('from_date');
        $toDate   = $request->get('to_date');
        $stockStatus = $request->get('stock_status');
        $startDate = $fromDate ? Carbon::parse($fromDate)->startOfDay() : null;
        $endDate   = $toDate   ? Carbon::parse($toDate)->endOfDay()   : null;

        $invQuery = AgentInventory::where('user_id', $agentId);
        if ($startDate && $endDate) {
            $invQuery->whereBetween('created_at', [$startDate, $endDate]);
        }
        $inventories = $invQuery->get();

        $productCounts = [];
        foreach ($inventories as $inv) {
            $productIds = [];
            if (!empty($inv->product_ids) && is_array($inv->product_ids)) {
                $productIds = $inv->product_ids;
            } elseif ($inv->product_id) {
                $productIds = [$inv->product_id];
            }
            foreach ($productIds as $pid) {
                $productCounts[$pid] = ($productCounts[$pid] ?? 0) + 1;
            }
        }

        $productsData = [];
        $totalUnits = array_sum($productCounts);
        $totalValue = 0;

        if (!empty($productCounts)) {
            $products = Product::with('category')
                ->whereIn('product_id', array_keys($productCounts))
                ->get()
                ->keyBy('product_id');

            foreach ($productCounts as $pid => $qty) {
                $product = $products->get($pid);
                if (!$product) continue;
                if ($stockStatus && $product->stock_status !== $stockStatus) continue;

                $buyingPrice = floatval($product->buying_price ?? 0);
                $totalValue += $buyingPrice * $qty;

                $productsData[] = [
                    'product_id'     => $pid,
                    'product_name'   => $product->product_name ?? ($product->category->category_name ?? '') . ' ' . ($product->category->model ?? ''),
                    'imei'           => $product->imei ?? '',
                    'color'          => $product->color ?? '',
                    'buying_price'   => $buyingPrice,
                    'selling_price'  => floatval($product->selling_price ?? 0),
                    'quantity'       => $qty,
                    'category_name'  => $product->category->category_name ?? '',
                    'model'          => $product->category->model ?? '',
                    'sku'            => $product->sku ?? '',
                    'status'         => $product->status ?? '',
                    'stock_status'   => $product->stock_status ?? '',
                ];
            }
        }

        $result = [
            'agent' => [
                'id'    => $agent->id,
                'name'  => $agent->name,
                'email' => $agent->email,
                'phone' => $agent->phone,
            ],
            'summary' => [
                'total_units'     => $totalUnits,
                'total_value'     => round($totalValue, 2),
                'unique_products' => count($productsData),
            ],
            'products'   => $productsData,
            'date_range' => [
                'from' => $startDate ? $startDate->toDateString() : null,
                'to'   => $endDate ? $endDate->toDateString() : null,
            ],
        ];

        $this->logAudit('view_branch_agent_products_report', 'report', null, "Branch owner viewed detailed products for agent {$agentId}");
        return $this->successResponse($result, 'Agent products retrieved successfully');
    }
}