<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class InvoiceController extends BaseApiController
{
    /**
     * List all invoices (invoices.view)
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('invoices.view');
        if ($perm) return $perm;

        try {
            $invoices = Receipt::with(['sale', 'creator'])
                ->orderBy('created_at', 'desc')
                ->paginate(20);
            return $this->successResponse($invoices, 'Invoices retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch invoices: ' . $e->getMessage());
        }
    }

    /**
     * Show a single invoice by ID (invoices.view)
     */
    public function show($id)
    {
        $perm = $this->checkPermission('invoices.view');
        if ($perm) return $perm;

        try {
            $invoice = Receipt::with(['sale', 'creator'])->findOrFail($id);
            return $this->successResponse($invoice, 'Invoice details');
        } catch (\Exception $e) {
            return $this->notFound('Invoice not found');
        }
    }

    /**
     * Download invoice PDF (invoices.download)
     */
    public function download($id)
    {
        $perm = $this->checkPermission('invoices.download');
        if ($perm) return $perm;

        try {
            $invoice = Receipt::findOrFail($id);
            if (!$invoice->pdf_path || !Storage::disk('public')->exists($invoice->pdf_path)) {
                return $this->errorResponse('PDF file not found', 404);
            }

            return Storage::disk('public')->download($invoice->pdf_path, "invoice_{$invoice->receipt_number}.pdf");
        } catch (\Exception $e) {
            return $this->serverError('Failed to download invoice: ' . $e->getMessage());
        }
    }

    /**
     * Get invoice by sale ID
     */
    public function bySale($saleId)
    {
        $perm = $this->checkPermission('invoices.view');
        if ($perm) return $perm;

        try {
            $invoice = Receipt::with(['sale', 'creator'])
                ->where('order_id', $saleId)
                ->firstOrFail();
            return $this->successResponse($invoice, 'Invoice for sale');
        } catch (\Exception $e) {
            return $this->notFound('No invoice found for this sale');
        }
    }
}