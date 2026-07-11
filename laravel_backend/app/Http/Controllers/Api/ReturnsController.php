<?php
// app/Http/Controllers/Api/ReturnsController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Returns;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Customer;
use App\Models\StockMovement;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReturnsController extends BaseApiController
{
    use Auditable;

    /**
     * List returns - Stock Controllers see all returns
     * Users with returns.view permission see all returns
     * Permission: returns.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('returns.view');
        if ($perm) return $perm;

        try {
            $user = auth()->user();
            $query = Returns::with(['product', 'product.category', 'performedBy', 'approvedBy', 'sale', 'customer', 'stockMovement']);

            // Stock Controllers can see all returns (no filtering needed)
            // Non-Stock Controllers with returns.view permission also see all returns
            // Removed all agent/performer filtering logic

            // Filters
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('imei')) {
                $query->where('imei', 'LIKE', "%{$request->imei}%");
            }

            if ($request->filled('customer_name')) {
                $query->where('customer_name', 'LIKE', "%{$request->customer_name}%");
            }

            if ($request->filled('date_from')) {
                $query->whereDate('return_date', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->whereDate('return_date', '<=', $request->date_to);
            }

            $returns = $query->orderBy('created_at', 'desc')
                           ->paginate($request->get('per_page', 15));

            $this->logAudit('view_returns', 'return', null, 'Viewed returns list');
            return $this->successResponse($returns, 'Returns retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch returns: ' . $e->getMessage());
        }
    }

    /**
     * Show single return
     * Permission: returns.view
     */
    public function show($id)
    {
        $perm = $this->checkPermission('returns.view');
        if ($perm) return $perm;

        try {
            $user = auth()->user();
            $return = Returns::with(['product', 'product.category', 'performedBy', 'approvedBy', 'stockMovement', 'sale', 'customer'])
                            ->findOrFail($id);

            // Removed permission check - users with returns.view can view any return

            $this->logAudit('view_return', 'return', $return->return_id, 
                "Viewed return for IMEI: {$return->imei}");

            return $this->successResponse($return, 'Return retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFound('Return not found');
        }
    }

    /**
     * Create a new return - Only for products sold by the agent
     * Validates that:
     * 1. IMEI exists in products table
     * 2. Product was sold by this agent
     * 3. Product has a valid sale record
     * 4. Product hasn't been returned before
     * Permission: returns.create
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('returns.create');
        if ($perm) return $perm;

        try {
            $user = auth()->user();

            // Only sales agents can create returns
            if (!$user->isSalesAgent()) {
                return $this->forbidden('Only sales agents can create returns');
            }

            $request->validate([
                'imei' => 'required|string',
                'customer_name' => 'required|string|max:255',
                'return_reason' => 'nullable|string|max:500',
                'notes' => 'nullable|string',
            ]);

            // Check if product exists with this IMEI
            $product = Product::where('imei', $request->imei)->first();

            if (!$product) {
                return $this->validationError([
                    'imei' => ['Product with this IMEI not found in the system. Please verify the IMEI.']
                ]);
            }

            // Check if this product was sold by this agent
            $sale = Sale::where('product_id', $product->product_id)
                ->where('agent_id', $user->id)
                ->where('status', 'completed')
                ->first();

            if (!$sale) {
                return $this->validationError([
                    'imei' => ['This product was not sold by you. You can only return products you have sold.']
                ]);
            }

            // Check if product is already returned
            $existingReturn = Returns::where('product_id', $product->product_id)
                ->whereIn('status', ['returned', 'approved'])
                ->first();

            if ($existingReturn) {
                return $this->validationError([
                    'imei' => ['This product already has a pending or approved return.']
                ]);
            }

            // Check if already completed
            $completedReturn = Returns::where('product_id', $product->product_id)
                ->where('status', 'completed')
                ->first();

            if ($completedReturn) {
                return $this->validationError([
                    'imei' => ['This product has already been returned and processed.']
                ]);
            }

            // Get the customer from the sale
            $customer = Customer::find($sale->customer_id);

            DB::beginTransaction();

            // Create return record with status 'returned'
            $return = Returns::create([
                'return_id' => (string) Str::uuid(),
                'customer_name' => $request->customer_name,
                'imei' => $request->imei,
                'product_id' => $product->product_id,
                'sale_id' => $sale->sale_id,
                'agent_id' => $user->id,
                'customer_id' => $sale->customer_id,
                'request_id' => null,
                'status' => 'returned',
                'return_reason' => $request->return_reason,
                'return_date' => now(),
                'notes' => $request->notes,
                'performed_by' => auth()->id(),
            ]);

            // Create stock movement for return request
            StockMovement::create([
                'movement_id' => (string) Str::uuid(),
                'request_id' => null,
                'product_id' => $product->product_id,
                'from_type' => 'sales_agent',
                'from_id' => $user->id,
                'to_type' => 'warehouse',
                'to_id' => null,
                'quantity' => 1,
                'movement_type' => 'return_request',
                'reference_id' => $return->return_id,
                'notes' => "Return requested for IMEI: {$request->imei} by agent: {$user->name}",
                'performed_by' => auth()->id(),
            ]);

            DB::commit();

            $this->logAudit('create_return', 'return', $return->return_id,
                "Created return for IMEI: {$request->imei}, Customer: {$request->customer_name}, Sale: {$sale->sale_id}");

            return $this->created($return->load(['product', 'product.category', 'sale', 'customer', 'stockMovement']),
                'Return created successfully. Waiting for stock controller approval.');

        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create return: ' . $e->getMessage());
        }
    }

    /**
     * Approve a return - Only Stock Controllers can approve
     * Updates stock movement with warehouse details
     * Updates sale status to 'returned'
     * Permission: returns.approve
     */
    public function approveReturn(Request $request, $id)
    {
        $perm = $this->checkPermission('returns.approve');
        if ($perm) return $perm;

        try {
            $user = auth()->user();
            
            // Verify user is a stock controller
            if ($user->role?->name !== 'STOCK_CONTROLLER') {
                return $this->forbidden('Only stock controllers can approve returns');
            }

            $return = Returns::with(['product', 'sale'])->findOrFail($id);

            // Check if return can be approved
            if ($return->status !== 'returned') {
                return $this->validationError([
                    'status' => ['Only returned returns can be approved. Current status: ' . $return->status]
                ]);
            }

            // Validate warehouse and condition
            $request->validate([
                'warehouse_id' => 'required|string|exists:warehouses,warehouse_id',
                'condition' => 'nullable|in:good,damaged,defective',
                'notes' => 'nullable|string',
            ]);

            DB::beginTransaction();

            // Update stock movement with warehouse details
            $stockMovement = StockMovement::where('reference_id', $return->return_id)
                ->where('movement_type', 'return_request')
                ->first();

            if ($stockMovement) {
                $stockMovement->to_id = $request->warehouse_id;
                $stockMovement->movement_type = 'return_approved';
                $stockMovement->notes = ($stockMovement->notes ?? '') . 
                    " | ✅ Approved by " . $user->name . " on " . now() .
                    " - Moved to warehouse: {$request->warehouse_id}" .
                    " - Condition: " . ($request->condition ?? 'good');
                $stockMovement->save();
            } else {
                // Create new stock movement if not found
                StockMovement::create([
                    'movement_id' => (string) Str::uuid(),
                    'request_id' => null,
                    'product_id' => $return->product_id,
                    'from_type' => 'sales_agent',
                    'from_id' => $return->agent_id,
                    'to_type' => 'warehouse',
                    'to_id' => $request->warehouse_id,
                    'quantity' => 1,
                    'movement_type' => 'return_approved',
                    'reference_id' => $return->return_id,
                    'notes' => "Return approved for IMEI: {$return->imei} by " . $user->name,
                    'performed_by' => auth()->id(),
                ]);
            }

            // Update return status to approved
            $return->status = 'approved';
            $return->approved_by = auth()->id();
            $return->approved_at = now();
            $return->condition = $request->condition ?? 'good';
            $return->notes = ($return->notes ? $return->notes . "\n" : '') .
                           "✅ Approved by " . $user->name . " on " . now() .
                           " - Moved to warehouse: {$request->warehouse_id}" .
                           " - Condition: " . ($request->condition ?? 'good');
            $return->save();

            // ✅ Update sale status to 'returned'
            if ($return->sale) {
                $return->sale->status = 'returned';
                $return->sale->save();
            }

            DB::commit();

            $this->logAudit('approve_return', 'return', $return->return_id,
                "Approved return for IMEI: {$return->imei} to warehouse {$request->warehouse_id}. Sale status updated to returned.");

            return $this->successResponse([
                'return' => $return->load(['product', 'stockMovement', 'approvedBy', 'sale']),
                'movement' => $stockMovement,
                'message' => 'Return approved successfully. Sale status updated to returned.'
            ], 'Return approved successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Approve return failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->serverError('Failed to approve return: ' . $e->getMessage());
        }
    }

    /**
     * Cancel a returned return
     * Permission: returns.cancel
     */
    public function cancelReturn($id)
    {
        $perm = $this->checkPermission('returns.cancel');
        if ($perm) return $perm;

        try {
            $user = auth()->user();
            $return = Returns::with(['product', 'sale'])->findOrFail($id);

            // Removed authorization check - users with returns.cancel can cancel any return

            // Only returned status can be cancelled
            if ($return->status !== 'returned') {
                return $this->validationError([
                    'status' => ['Only returned returns can be cancelled. Current status: ' . $return->status]
                ]);
            }

            DB::beginTransaction();

            // Update stock movement to cancelled
            $stockMovement = StockMovement::where('reference_id', $return->return_id)
                ->whereIn('movement_type', ['return_request', 'return_approved'])
                ->first();

            if ($stockMovement) {
                $stockMovement->movement_type = 'return_cancelled';
                $stockMovement->notes = ($stockMovement->notes ?? '') . 
                    " | ❌ Cancelled by " . $user->name . " on " . now();
                $stockMovement->save();
            }

            // Update return status to cancelled
            $return->status = 'cancelled';
            $return->cancelled_at = now();
            $return->notes = ($return->notes ? $return->notes . "\n" : '') .
                           "❌ Cancelled on " . now() . " by " . $user->name;
            $return->save();

            // ✅ Revert sale status back to 'completed' if it was changed
            if ($return->sale && $return->sale->status === 'returned') {
                $return->sale->status = 'completed';
                $return->sale->save();
            }

            DB::commit();

            $this->logAudit('cancel_return', 'return', $return->return_id,
                "Cancelled return for IMEI: {$return->imei}. Sale status reverted.");

            return $this->successResponse($return->load(['product', 'stockMovement', 'sale']),
                'Return cancelled successfully. Sale status reverted.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to cancel return: ' . $e->getMessage());
        }
    }

    /**
     * Complete a return (finalize the return process)
     * Permission: returns.complete
     */
    public function completeReturn($id)
    {
        $perm = $this->checkPermission('returns.complete');
        if ($perm) return $perm;

        try {
            $user = auth()->user();
            
            // Verify user is a stock controller
            if ($user->role?->name !== 'STOCK_CONTROLLER') {
                return $this->forbidden('Only stock controllers can complete returns');
            }

            $return = Returns::with(['product', 'sale'])->findOrFail($id);

            // Check if return can be completed
            if ($return->status !== 'approved') {
                return $this->validationError([
                    'status' => ['Only approved returns can be completed. Current status: ' . $return->status]
                ]);
            }

            DB::beginTransaction();

            // Update stock movement to completed
            $stockMovement = StockMovement::where('reference_id', $return->return_id)
                ->where('movement_type', 'return_approved')
                ->first();

            if ($stockMovement) {
                $stockMovement->movement_type = 'return_completed';
                $stockMovement->notes = ($stockMovement->notes ?? '') . 
                    " | ✅ Completed by " . $user->name . " on " . now();
                $stockMovement->save();
            }

            // Update return status to completed
            $return->status = 'completed';
            $return->completed_at = now();
            $return->completed_date = now();
            $return->completed_by = auth()->id();
            $return->notes = ($return->notes ? $return->notes . "\n" : '') .
                           "✅ Completed on " . now() . " by " . $user->name;
            $return->save();

            // ✅ Ensure sale status remains 'returned'
            if ($return->sale && $return->sale->status !== 'returned') {
                $return->sale->status = 'returned';
                $return->sale->save();
            }

            DB::commit();

            $this->logAudit('complete_return', 'return', $return->return_id,
                "Completed return for IMEI: {$return->imei}");

            return $this->successResponse($return->load(['product', 'sale', 'stockMovement']),
                'Return completed successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to complete return: ' . $e->getMessage());
        }
    }

    /**
     * Search returns by IMEI or customer name
     * Permission: returns.view
     */
    public function search(Request $request)
    {
        $perm = $this->checkPermission('returns.view');
        if ($perm) return $perm;

        try {
            $request->validate([
                'query' => 'required|string|min:2',
            ]);

            $user = auth()->user();
            $query = $request->query;

            $returnsQuery = Returns::with(['product', 'product.category', 'sale']);

            // Removed filtering - users with returns.view can search all returns

            $returns = $returnsQuery->where('imei', 'LIKE', "%{$query}%")
                ->orWhere('customer_name', 'LIKE', "%{$query}%")
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get();

            return $this->successResponse($returns, 'Search results retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to search returns: ' . $e->getMessage());
        }
    }

    /**
     * Get return statistics
     * Permission: returns.view
     */
    public function statistics(Request $request)
    {
        $perm = $this->checkPermission('returns.view');
        if ($perm) return $perm;

        try {
            $user = auth()->user();
            
            // Removed filtering - users with returns.view can see all statistics
            $query = Returns::query();

            $stats = [
                'total' => $query->count(),
                'returned' => (clone $query)->where('status', 'returned')->count(),
                'approved' => (clone $query)->where('status', 'approved')->count(),
                'completed' => (clone $query)->where('status', 'completed')->count(),
                'cancelled' => (clone $query)->where('status', 'cancelled')->count(),
                'recent_returns' => (clone $query)->where('status', 'returned')
                    ->whereDate('created_at', '>=', now()->subDays(7))
                    ->count(),
                'completion_rate' => 0,
            ];

            if ($stats['total'] > 0) {
                $stats['completion_rate'] = round(
                    (($stats['approved'] + $stats['completed']) / $stats['total']) * 100,
                    2
                );
            }

            return $this->successResponse($stats, 'Statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch statistics: ' . $e->getMessage());
        }
    }

    /**
     * Validate IMEI for return - Checks if product was sold by this agent
     * Permission: returns.create
     */
    public function validateImei(Request $request)
    {
        $perm = $this->checkPermission('returns.create');
        if ($perm) return $perm;

        try {
            $user = auth()->user();

            // Only sales agents can validate for returns
            if (!$user->isSalesAgent()) {
                return $this->successResponse([
                    'valid' => false,
                    'message' => 'Only sales agents can validate IMEI for returns'
                ], 'Invalid user type');
            }

            $request->validate([
                'imei' => 'required|string',
            ]);

            $imei = $request->imei;
            $product = Product::where('imei', $imei)->first();

            if (!$product) {
                return $this->successResponse([
                    'valid' => false,
                    'message' => 'IMEI not found in the system'
                ], 'IMEI validation failed');
            }

            // Check if this product was sold by this agent
            $sale = Sale::where('product_id', $product->product_id)
                ->where('agent_id', $user->id)
                ->where('status', 'completed')
                ->first();

            if (!$sale) {
                return $this->successResponse([
                    'valid' => false,
                    'message' => 'This product was not sold by you. You can only return products you have sold.'
                ], 'Product not sold by this agent');
            }

            // Get customer info
            $customer = Customer::find($sale->customer_id);

            // Check for existing returns
            $existingReturn = Returns::where('product_id', $product->product_id)
                ->whereIn('status', ['returned', 'approved'])
                ->first();

            if ($existingReturn) {
                return $this->successResponse([
                    'valid' => false,
                    'message' => 'This product already has a pending or approved return',
                    'return_id' => $existingReturn->return_id,
                    'status' => $existingReturn->status,
                    'return_date' => $existingReturn->return_date,
                ], 'IMEI has pending return');
            }

            // Check if already completed
            $completedReturn = Returns::where('product_id', $product->product_id)
                ->where('status', 'completed')
                ->first();

            if ($completedReturn) {
                return $this->successResponse([
                    'valid' => false,
                    'message' => 'This product has already been returned and processed',
                    'return_id' => $completedReturn->return_id,
                    'completed_date' => $completedReturn->completed_date,
                ], 'IMEI already returned');
            }

            // IMEI is valid for return
            return $this->successResponse([
                'valid' => true,
                'message' => 'IMEI is valid for return',
                'product' => [
                    'product_id' => $product->product_id,
                    'imei' => $product->imei,
                    'sku' => $product->sku,
                    'category' => $product->category?->category_name ?? 'N/A',
                    'model' => $product->category?->model ?? 'N/A',
                    'status' => $product->status,
                    'stock_status' => $product->stock_status,
                ],
                'sale' => [
                    'sale_id' => $sale->sale_id,
                    'sale_date' => $sale->created_at,
                    'total_amount' => $sale->total_amount,
                    'payment_method' => $sale->payment_method,
                    'status' => $sale->status,
                ],
                'customer' => $customer ? [
                    'customer_id' => $customer->customer_id,
                    'customer_name' => $customer->customer_name,
                    'phone' => $customer->msisdn ?? $customer->phone,
                ] : null
            ], 'IMEI validation successful');

        } catch (\Exception $e) {
            return $this->serverError('Failed to validate IMEI: ' . $e->getMessage());
        }
    }

    /**
     * Get returns for the logged-in agent (my returns)
     * Permission: returns.view
     */
    public function myReturns(Request $request)
    {
        $perm = $this->checkPermission('returns.view');
        if ($perm) return $perm;

        try {
            $user = auth()->user();
            
            if (!$user->isSalesAgent()) {
                return $this->forbidden('Only sales agents can view their returns');
            }

            $query = Returns::with(['product', 'product.category', 'customer', 'sale'])
                ->where('agent_id', $user->id);

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $returns = $query->orderBy('created_at', 'desc')
                           ->paginate($request->get('per_page', 15));

            return $this->successResponse($returns, 'My returns retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch my returns: ' . $e->getMessage());
        }
    }

    /**
     * Get pending returns for approval (Stock Controllers only)
     * Permission: returns.approve
     */
    public function pendingForApproval(Request $request)
    {
        $perm = $this->checkPermission('returns.approve');
        if ($perm) return $perm;

        try {
            $user = auth()->user();

            // Verify user is a stock controller
            if ($user->role?->name !== 'STOCK_CONTROLLER') {
                return $this->forbidden('Only stock controllers can view pending approvals');
            }

            $query = Returns::with(['product', 'product.category', 'performedBy', 'agent', 'customer', 'sale'])
                ->where('status', 'returned');

            if ($request->filled('imei')) {
                $query->where('imei', 'LIKE', "%{$request->imei}%");
            }

            if ($request->filled('customer_name')) {
                $query->where('customer_name', 'LIKE', "%{$request->customer_name}%");
            }

            if ($request->filled('agent_id')) {
                $query->where('agent_id', $request->agent_id);
            }

            $returns = $query->orderBy('created_at', 'asc')
                           ->paginate($request->get('per_page', 15));

            return $this->successResponse($returns, 'Pending returns retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch pending returns: ' . $e->getMessage());
        }
    }

    /**
     * Get sales by agent for dropdown (for returns)
     * Permission: returns.create
     */
    public function getAgentSales(Request $request)
    {
        $perm = $this->checkPermission('returns.create');
        if ($perm) return $perm;

        try {
            $user = auth()->user();

            if (!$user->isSalesAgent()) {
                return $this->forbidden('Only sales agents can view their sales');
            }

            $sales = Sale::with(['product', 'customer'])
                ->where('agent_id', $user->id)
                ->where('status', 'completed')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($sale) {
                    return [
                        'sale_id' => $sale->sale_id,
                        'product' => $sale->product ? [
                            'product_id' => $sale->product->product_id,
                            'imei' => $sale->product->imei,
                            'sku' => $sale->product->sku,
                            'product_name' => $sale->product->product_name,
                        ] : null,
                        'customer' => $sale->customer ? [
                            'customer_id' => $sale->customer->customer_id,
                            'customer_name' => $sale->customer->customer_name,
                            'phone' => $sale->customer->msisdn ?? $sale->customer->phone,
                        ] : null,
                        'total_amount' => $sale->total_amount,
                        'payment_method' => $sale->payment_method,
                        'sale_date' => $sale->created_at,
                    ];
                });

            return $this->successResponse($sales, 'Agent sales retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch agent sales: ' . $e->getMessage());
        }
    }
}