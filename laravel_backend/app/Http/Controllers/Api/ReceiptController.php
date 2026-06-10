<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Receipt;
use Illuminate\Http\Request;

class ReceiptController extends BaseApiController
{
    /**
     * List all receipts (admin/manager only)
     * Permission: receipts.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('receipts.view');
        if ($perm) return $perm;

        try {
            $receipts = Receipt::with(['sale', 'creator'])->orderBy('created_at', 'desc')->paginate(20);
            return $this->successResponse($receipts, 'Receipts retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch receipts: ' . $e->getMessage());
        }
    }

    /**
     * Show a single receipt by ID
     * Permission: receipts.view (admin/manager) OR receipts.view_own (if created by current user)
     */
    public function show($id)
    {
        try {
            $receipt = Receipt::with(['sale', 'creator'])->findOrFail($id);
            $user = request()->user();

            // Check permissions
            if ($this->userCan('receipts.view')) {
                // Admin/manager can view any receipt
                return $this->successResponse($receipt, 'Receipt details');
            }

            if ($this->userCan('receipts.view_own') && $receipt->created_by === $user->id) {
                return $this->successResponse($receipt, 'Receipt details');
            }

            return $this->forbidden('Unauthorized');
        } catch (\Exception $e) {
            return $this->notFound('Receipt not found');
        }
    }

    /**
     * Get receipt by sale ID
     * Permission: receipts.view (admin/manager) OR receipts.view_own (if created by current user)
     */
    public function bySale($saleId)
    {
        try {
            $receipt = Receipt::with(['sale', 'creator'])->where('order_id', $saleId)->firstOrFail();
            $user = request()->user();

            if ($this->userCan('receipts.view')) {
                return $this->successResponse($receipt, 'Receipt for sale');
            }

            if ($this->userCan('receipts.view_own') && $receipt->created_by === $user->id) {
                return $this->successResponse($receipt, 'Receipt for sale');
            }

            return $this->forbidden('Unauthorized');
        } catch (\Exception $e) {
            return $this->notFound('No receipt found for this sale');
        }
    }
}