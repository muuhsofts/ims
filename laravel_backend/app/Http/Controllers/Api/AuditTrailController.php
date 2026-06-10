<?php

namespace App\Http\Controllers\Api;

use App\Models\AuditTrail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuditTrailController extends BaseApiController
{
    /**
     * List audit trails with filters
     * Permission: audit.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('audit.view');
        if ($perm) return $perm;

        try {
            $query = $this->buildQuery($request);
            $perPage = $request->get('per_page', 15);
            $auditTrails = $query->orderBy('created_at', 'desc')->paginate($perPage);
            $auditTrails->getCollection()->transform(fn($item) => $item->makeHidden('id'));

            return $this->successResponse($auditTrails, 'Audit trails retrieved successfully');
        } catch (\Exception $e) {
            Log::error('AuditTrail index error: ' . $e->getMessage());
            return $this->serverError('Failed to load audit trails');
        }
    }

    /**
     * Get distinct modules
     * Permission: audit.view
     */
    public function getModules(Request $request)
    {
        $perm = $this->checkPermission('audit.view');
        if ($perm) return $perm;

        try {
            $modules = AuditTrail::distinct('module')
                ->whereNotNull('module')
                ->where('module', '!=', '')
                ->pluck('module')
                ->sort()
                ->values();

            return $this->successResponse($modules, 'Modules retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to retrieve modules');
        }
    }

    /**
     * Get distinct actions
     * Permission: audit.view
     */
    public function getActions(Request $request)
    {
        $perm = $this->checkPermission('audit.view');
        if ($perm) return $perm;

        try {
            $actions = AuditTrail::distinct('action')
                ->whereNotNull('action')
                ->where('action', '!=', '')
                ->pluck('action')
                ->sort()
                ->values();

            return $this->successResponse($actions, 'Actions retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to retrieve actions');
        }
    }

    /**
     * Get statistics about audit trails
     * Permission: audit.view
     */
    public function stats(Request $request)
    {
        $perm = $this->checkPermission('audit.view');
        if ($perm) return $perm;

        try {
            $query = $this->buildQuery($request);

            $stats = [
                'total'       => $query->count(),
                'by_module'   => (clone $query)->select('module', DB::raw('count(*) as count'))
                                    ->groupBy('module')->pluck('count', 'module'),
                'by_action'   => (clone $query)->select('action', DB::raw('count(*) as count'))
                                    ->groupBy('action')->pluck('count', 'action'),
                'by_user'     => (clone $query)->select('user_email', DB::raw('count(*) as count'))
                                    ->groupBy('user_email')->orderByDesc('count')->limit(10)->get(),
                'today'       => AuditTrail::whereDate('created_at', today())->count(),
                'this_week'   => AuditTrail::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            ];

            return $this->successResponse($stats, 'Stats retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to retrieve stats');
        }
    }

    /**
     * Export audit trails to CSV
     * Permission: audit.export
     */
    public function exportCsv(Request $request)
    {
        $perm = $this->checkPermission('audit.export');
        if ($perm) return $perm;

        try {
            $data     = $this->buildQuery($request)->orderBy('created_at', 'desc')->get();
            $filename = 'audit_trails_' . now()->format('Y-m-d_His') . '.csv';

            return response()->stream(function () use ($data) {
                $file = fopen('php://output', 'w');
                fwrite($file, "\xEF\xBB\xBF");
                fputcsv($file, [
                    'Date & Time', 'User Email', 'User Name', 'User Role',
                    'Action', 'Action Type', 'Module', 'Description',
                    'IP Address', 'Request Method', 'Request URL',
                ]);
                foreach ($data as $item) {
                    fputcsv($file, [
                        $item->created_at?->format('Y-m-d H:i:s') ?? '',
                        $item->user_email ?? '',
                        $item->user_name ?? '',
                        $item->user_role ?? '',
                        $item->action ?? '',
                        $item->action_type ?? '',
                        $item->module ?? '',
                        $item->description ?? '',
                        $item->ip_address ?? '',
                        $item->request_method ?? '',
                        $item->request_url ?? '',
                    ]);
                }
                fclose($file);
            }, 200, [
                'Content-Type'        => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        } catch (\Exception $e) {
            Log::error('CSV Export error: ' . $e->getMessage());
            return $this->serverError('Failed to export CSV');
        }
    }

    /**
     * Export audit trails to Excel (tab-separated)
     * Permission: audit.export
     */
    public function exportExcel(Request $request)
    {
        $perm = $this->checkPermission('audit.export');
        if ($perm) return $perm;

        try {
            $data     = $this->buildQuery($request)->orderBy('created_at', 'desc')->get();
            $filename = 'audit_trails_' . now()->format('Y-m-d_His') . '.xls';

            return response()->stream(function () use ($data) {
                $file = fopen('php://output', 'w');
                fputcsv($file, [
                    'Date & Time', 'User Email', 'User Name', 'User Role',
                    'Action', 'Action Type', 'Module', 'Description',
                    'IP Address', 'Request Method', 'Request URL',
                ], "\t");
                foreach ($data as $item) {
                    fputcsv($file, [
                        $item->created_at?->format('Y-m-d H:i:s') ?? '',
                        $item->user_email ?? '',
                        $item->user_name ?? '',
                        $item->user_role ?? '',
                        $item->action ?? '',
                        $item->action_type ?? '',
                        $item->module ?? '',
                        $item->description ?? '',
                        $item->ip_address ?? '',
                        $item->request_method ?? '',
                        $item->request_url ?? '',
                    ], "\t");
                }
                fclose($file);
            }, 200, [
                'Content-Type'        => 'application/vnd.ms-excel',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        } catch (\Exception $e) {
            Log::error('Excel Export error: ' . $e->getMessage());
            return $this->serverError('Failed to export Excel');
        }
    }

    /**
     * Export audit trails to PDF (HTML report)
     * Permission: audit.export
     */
    public function exportPdf(Request $request)
    {
        $perm = $this->checkPermission('audit.export');
        if ($perm) return $perm;

        try {
            $data     = $this->buildQuery($request)->orderBy('created_at', 'desc')->get();
            $html     = $this->generateHtmlReport($data, $request);
            $filename = 'audit_trails_' . now()->format('Y-m-d') . '.html';

            return response($html, 200)
                ->header('Content-Type', 'text/html')
                ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
        } catch (\Exception $e) {
            Log::error('PDF Export error: ' . $e->getMessage());
            return $this->serverError('Failed to generate report');
        }
    }

    // ==================== PRIVATE HELPERS ====================

    private function buildQuery(Request $request)
    {
        $query = AuditTrail::query();

        if ($request->filled('from_date'))  $query->whereDate('created_at', '>=', $request->from_date);
        if ($request->filled('to_date'))    $query->whereDate('created_at', '<=', $request->to_date);
        if ($request->filled('module') && $request->module !== 'all') $query->where('module', $request->module);
        if ($request->filled('action') && $request->action !== 'all') $query->where('action', $request->action);
        if ($request->filled('user_email')) $query->where('user_email', 'like', "%{$request->user_email}%");

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) =>
                $q->where('user_email', 'like', "%{$s}%")
                  ->orWhere('user_name', 'like', "%{$s}%")
                  ->orWhere('action', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%")
            );
        }

        return $query;
    }

    private function generateHtmlReport($data, Request $request): string
    {
        $dateRange = '';
        if ($request->filled('from_date') || $request->filled('to_date')) {
            $from      = $request->from_date ?? 'Start';
            $to        = $request->to_date ?? 'End';
            $dateRange = "<p>Date Range: {$from} to {$to}</p>";
        }

        $rows = $data->count() === 0
            ? '<tr><td colspan="6" style="text-align:center;">No audit records found</td></tr>'
            : $data->map(fn($item) => '
                <tr>
                    <td>' . ($item->created_at?->format('Y-m-d H:i:s') ?? '') . '</td>
                    <td>
                        <strong>' . htmlspecialchars($item->user_name ?? 'N/A') . '</strong><br>
                        <small>' . htmlspecialchars($item->user_email ?? 'N/A') . '</small>
                    </td>
                    <td>' . strtoupper(htmlspecialchars($item->action ?? 'N/A')) . '</td>
                    <td>' . htmlspecialchars($item->module ?? 'N/A') . '</td>
                    <td>' . htmlspecialchars(substr($item->description ?? '', 0, 100)) . '</td>
                    <td>' . htmlspecialchars($item->ip_address ?? 'N/A') . '</td>
                </tr>'
            )->implode('');

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Audit Trail Report</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .header h1 { margin: 0; font-size: 18px; }
                .header p { margin: 3px 0; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
                th { background-color: #4CAF50; color: white; font-weight: bold; }
                .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Audit Trail Report</h1>
                <p>Generated: {$this->now()}</p>
                {$dateRange}
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Date & Time</th><th>User</th><th>Action</th>
                        <th>Module</th><th>Description</th><th>IP Address</th>
                    </tr>
                </thead>
                <tbody>{$rows}</tbody>
            </table>
            <div class="footer">
                <p>Total Records: {$data->count()} | Generated by System</p>
                <p class="no-print">To save as PDF: Press Ctrl+P (or Cmd+P on Mac) → Save as PDF</p>
            </div>
        </body>
        </html>
        HTML;
    }

    private function now(): string
    {
        return now()->format('Y-m-d H:i:s');
    }
}