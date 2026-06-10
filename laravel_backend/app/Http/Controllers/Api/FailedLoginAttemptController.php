<?php

namespace App\Http\Controllers\Api;

use App\Models\FailedLoginAttempt;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Carbon\Carbon;

class FailedLoginAttemptController extends BaseApiController
{
    use Auditable;

    /**
     * List failed login attempts with filters and statistics
     * Permission: failed_logins.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('failed_logins.view');
        if ($perm) return $perm;

        try {
            $query = FailedLoginAttempt::orderBy('last_attempt_at', 'desc');

            if ($request->filled('email'))       $query->where('email', 'LIKE', "%{$request->email}%");
            if ($request->filled('ip_address'))  $query->where('ip_address', 'LIKE', "%{$request->ip_address}%");
            if ($request->filled('start_date'))  $query->whereDate('last_attempt_at', '>=', $request->start_date);
            if ($request->filled('end_date'))    $query->whereDate('last_attempt_at', '<=', $request->end_date);
            if ($request->filled('min_attempts'))$query->where('attempt_count', '>=', $request->min_attempts);

            $attempts = $query->paginate($request->get('per_page', 20));

            $stats = [
                'total_records'  => FailedLoginAttempt::count(),
                'unique_emails'  => FailedLoginAttempt::distinct('email')->count('email'),
                'unique_ips'     => FailedLoginAttempt::distinct('ip_address')->count('ip_address'),
                'blocked_ips'    => FailedLoginAttempt::where('attempt_count', '>=', 10)->count(),
                'today_attempts' => FailedLoginAttempt::whereDate('last_attempt_at', Carbon::today())->count(),
            ];

            return $this->successResponse([
                'data'  => $attempts,
                'stats' => $stats,
            ], 'Failed login attempts retrieved successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch failed login attempts');
        }
    }

    /**
     * Clear failed login attempts (optionally by email or IP)
     * Permission: failed_logins.clear
     */
    public function clear(Request $request)
    {
        $perm = $this->checkPermission('failed_logins.clear');
        if ($perm) return $perm;

        try {
            $request->validate([
                'email'      => 'nullable|email',
                'ip_address' => 'nullable|ip',
            ]);

            $query = FailedLoginAttempt::query();
            if ($request->filled('email'))      $query->where('email', $request->email);
            if ($request->filled('ip_address')) $query->where('ip_address', $request->ip_address);

            $deleted = $query->delete();

            $this->logAudit('clear_failed_logins', 'failed_login', null, "Cleared {$deleted} failed login attempts" . ($request->email ? " for email {$request->email}" : "") . ($request->ip_address ? " for IP {$request->ip_address}" : ""));

            return $this->successResponse(['deleted_count' => $deleted], "Cleared {$deleted} failed login attempt(s)");
        } catch (\Exception $e) {
            return $this->serverError('Failed to clear attempts');
        }
    }

    /**
     * Block an IP address by setting attempt_count to a high value
     * Permission: failed_logins.block
     */
    public function block(Request $request)
    {
        $perm = $this->checkPermission('failed_logins.block');
        if ($perm) return $perm;

        try {
            $request->validate(['ip_address' => 'required|ip']);

            FailedLoginAttempt::where('ip_address', $request->ip_address)
                ->update(['attempt_count' => 999, 'last_attempt_at' => Carbon::now()]);

            $this->logAudit('block_ip', 'failed_login', null, "Blocked IP address: {$request->ip_address}");

            return $this->successResponse(null, 'IP address blocked successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to block IP');
        }
    }

    /**
     * Unblock an IP address by deleting its failed login records
     * Permission: failed_logins.unblock
     */
    public function unblock(Request $request)
    {
        $perm = $this->checkPermission('failed_logins.unblock');
        if ($perm) return $perm;

        try {
            $request->validate(['ip_address' => 'required|ip']);

            FailedLoginAttempt::where('ip_address', $request->ip_address)->delete();

            $this->logAudit('unblock_ip', 'failed_login', null, "Unblocked IP address: {$request->ip_address}");

            return $this->successResponse(null, 'IP address unblocked successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to unblock IP');
        }
    }
}