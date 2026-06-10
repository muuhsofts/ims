<?php
// app/Traits/Auditable.php

namespace App\Traits;

use App\Models\AuditTrail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait Auditable
{
    protected function logAudit(
        string $action,
        string $actionType,
        ?string $module = null,
        ?string $description = null,
        $oldData = null,
        $newData = null,
        ?int $responseStatus = null,
        ?float $executionTimeMs = null
    ) {
        try {
            $user = Auth::user();
            $userRole = $user && $user->roles ? $user->roles->pluck('name')->implode(',') : null;
            
            AuditTrail::create([
                'user_id' => $user ? $user->id : null,
                'user_email' => $user ? $user->email : null,
                'user_name' => $user ? $user->name : null,
                'user_role' => $userRole,
                'action' => $action,
                'action_type' => $actionType,
                'module' => $module,
                'description' => $description,
                'old_data' => $oldData,
                'new_data' => $newData,
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
                'request_method' => Request::method(),
                'request_url' => Request::fullUrl(),
                'response_status' => $responseStatus,
                'execution_time_ms' => $executionTimeMs
            ]);
        } catch (\Exception $e) {
            \Log::error('Audit log failed: ' . $e->getMessage());
        }
    }
    
    protected function logAuthAction($action, $email = null, $status = null, $description = null)
    {
        $this->logAudit($action, 'auth', 'authentication', $description ?? "$action for email: " . ($email ?? 'unknown'), null, null, $status === 'success' ? 200 : ($status === 'failed' ? 401 : null));
    }
    
    protected function logUserAction($action, $targetUser, $oldData = null, $newData = null, $description = null)
    {
        $email = is_array($targetUser) ? ($targetUser['email'] ?? 'unknown') : ($targetUser->email ?? 'unknown');
        $this->logAudit($action, 'user', 'user_management', $description ?? "$action on user: $email", $oldData, $newData);
    }
    
    protected function logRoleAction($action, $role, $oldData = null, $newData = null, $description = null)
    {
        $roleName = is_array($role) ? ($role['name'] ?? 'unknown') : ($role->name ?? 'unknown');
        $this->logAudit($action, 'role', 'role_management', $description ?? "$action on role: $roleName", $oldData, $newData);
    }
}