<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\User;
use App\Models\Role;
use App\Models\OTP;
use App\Mail\OTPMail;
use Illuminate\Support\Facades\Mail;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UserManagementController extends BaseApiController
{
    use Auditable;

    /**
     * List users (with optional Collection Center relation)
     * Permission: users.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('users.view');
        if ($perm) return $perm;

        try {
            $query = User::with('role', 'createdBy', 'collectionCenter'); // added collectionCenter

            if ($request->filled('role_id')) {
                $query->where('role_id', $request->role_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function($q) use ($s) {
                    $q->where('name', 'LIKE', "%{$s}%")
                      ->orWhere('email', 'LIKE', "%{$s}%")
                      ->orWhere('phone', 'LIKE', "%{$s}%");
                });
            }

            $users = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));
            $this->logAudit('view_users', 'user', 'user_management', 'Viewed users list');
            return $this->successResponse($users, 'Users retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch users');
        }
    }

    /**
     * Show single user (with Collection Center)
     */
    public function show(Request $request, $id)
    {
        $perm = $this->checkPermission('users.view');
        if ($perm) return $perm;

        try {
            $user = User::with('role', 'createdBy', 'collectionCenter')->findOrFail($id);
            return $this->successResponse($user, 'User retrieved');
        } catch (\Exception $e) {
            return $this->notFound('User not found');
        }
    }

    /**
     * Create a new user (optional cc_id)
     * Permission: users.create
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('users.create');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();

            $request->validate([
                'name'     => 'required|string|max:255',
                'email'    => 'required|email|unique:users',
                'password' => 'required|string|min:8',
                'phone'    => 'nullable|string|max:20',
                'role_id'  => 'required|string|exists:roles,id',
                'cc_id'    => 'nullable|string|exists:collection_centers,cc_id', // new
            ]);

            DB::beginTransaction();

            $role = Role::findOrFail($request->role_id);
            $user = User::create([
                'id'         => (string) Str::uuid(),
                'name'       => $request->name,
                'email'      => $request->email,
                'password'   => Hash::make($request->password),
                'phone'      => $request->phone,
                'status'     => 'pending',
                'is_active'  => false,
                'created_by' => $authUser->id,
                'role_id'    => $role->id,
                'cc_id'      => $request->cc_id ?? null, // optional
            ]);

            $otpRecord = OTP::create([
                'id'    => (string) Str::uuid(),
                'email' => $user->email,
                'type'  => OTP::TYPE_REGISTRATION,
                'name'  => $user->name,
            ]);

            Mail::to($user->email)->send(
                new OTPMail($otpRecord->otp, $user->name, 'verification', $otpRecord->getVerificationUrl())
            );

            DB::commit();
            $this->logAudit('create_user', 'user', $user->id, "Created user {$user->email}");
            return $this->created($user->load('role', 'collectionCenter'), 'User created. OTP sent.');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create user');
        }
    }

    /**
     * Update user (optional cc_id)
     * Own profile can update name/phone only (no role/status/cc change)
     * Others need users.edit permission.
     */
    public function update(Request $request, $id)
{
    try {
        $authUser = $request->user();
        $user = User::findOrFail($id);

        // ✅ Correct: own profile if the authenticated user is the same as the user being updated
        $isOwnProfile = ($user->id === $authUser->id);

        if (!$isOwnProfile) {
            $perm = $this->checkPermission('users.edit');
            if ($perm) return $perm;
        }

        $rules = [
            'name'  => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
        ];

        // Only admins/managers can change status, role, or cc_id
        if (!$isOwnProfile) {
            $rules['status']  = 'sometimes|in:pending,active,inactive,suspended';
            $rules['role_id'] = 'sometimes|string|exists:roles,id';
            $rules['cc_id']   = 'nullable|string|exists:collection_centers,cc_id';
        }

        $request->validate($rules);

        $data = $request->only(['name', 'phone']);
        if (!$isOwnProfile) {
            if ($request->has('status')) {
                $data['status'] = $request->status;
                $data['is_active'] = $request->status === 'active';
            }
            if ($request->has('role_id')) {
                $data['role_id'] = $request->role_id;
            }
            if ($request->has('cc_id')) {
                $data['cc_id'] = $request->cc_id;
            }
        }

        $user->update($data);
        $this->logAudit('update_user', 'user', $user->id, "Updated user {$user->email}");
        return $this->successResponse($user->load('role', 'collectionCenter'), 'User updated');
    } catch (\Exception $e) {
        return $this->serverError('Failed to update user');
    }
}

    // -------------------------------------------------------------------------
    // The rest of the methods (destroy, activate, deactivate, suspend, assignRole,
    // resetUserPassword, stats, trashed, restore, forceDelete, Userdropdown,
    // salesAgentDropdown) remain exactly as you provided.
    // -------------------------------------------------------------------------

    /**
     * Delete user (soft delete)
     * Permission: users.delete
     */
    public function destroy(Request $request, $id)
    {
        $perm = $this->checkPermission('users.delete');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $user = User::findOrFail($id);

            if ($user->id === $authUser->id) {
                return $this->badRequest('Cannot delete yourself');
            }

            $email = $user->email;
            $user->delete();
            $this->logAudit('delete_user', 'user', $id, "Deleted user {$email}");
            return $this->successResponse(null, 'User deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete user');
        }
    }

    public function activate(Request $request, $id)
    {
        $perm = $this->checkPermission('users.activate');
        if ($perm) return $perm;

        try {
            $user = User::findOrFail($id);
            $user->update(['status' => 'active', 'is_active' => true]);
            $this->logAudit('activate_user', 'user', $user->id, "Activated user {$user->email}");
            return $this->successResponse(null, 'User activated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to activate user');
        }
    }

    public function deactivate(Request $request, $id)
    {
        $perm = $this->checkPermission('users.deactivate');
        if ($perm) return $perm;

        try {
            $user = User::findOrFail($id);
            $user->update(['status' => 'inactive', 'is_active' => false]);
            $this->logAudit('deactivate_user', 'user', $user->id, "Deactivated user {$user->email}");
            return $this->successResponse(null, 'User deactivated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to deactivate user');
        }
    }

    public function suspend(Request $request, $id)
    {
        $perm = $this->checkPermission('users.suspend');
        if ($perm) return $perm;

        try {
            $user = User::findOrFail($id);
            $user->update(['status' => 'suspended', 'is_active' => false]);
            $user->tokens()->delete();
            $this->logAudit('suspend_user', 'user', $user->id, "Suspended user {$user->email}");
            return $this->successResponse(null, 'User suspended');
        } catch (\Exception $e) {
            return $this->serverError('Failed to suspend user');
        }
    }

    public function assignRole(Request $request, $id)
    {
        $perm = $this->checkPermission('users.assign_role');
        if ($perm) return $perm;

        try {
            $request->validate(['role_id' => 'required|string|exists:roles,id']);
            $user = User::findOrFail($id);
            $user->update(['role_id' => $request->role_id]);

            $role = Role::find($request->role_id);
            $this->logAudit('assign_role', 'user', $user->id, "Assigned role {$role->name} to {$user->email}");
            return $this->successResponse($user->load('role', 'collectionCenter'), 'Role assigned');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to assign role');
        }
    }

    public function resetUserPassword(Request $request, $id)
    {
        $perm = $this->checkPermission('users.reset_password');
        if ($perm) return $perm;

        try {
            $request->validate(['password' => 'required|string|min:8|confirmed']);
            $user = User::findOrFail($id);
            $user->updatePassword($request->password);

            $this->logAudit('reset_password', 'user', $user->id, "Admin reset password for {$user->email}");
            return $this->successResponse(null, 'Password reset');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to reset password');
        }
    }

    public function stats(Request $request)
    {
        $perm = $this->checkPermission('users.stats');
        if ($perm) return $perm;

        try {
            $stats = [
                'total'     => User::count(),
                'active'    => User::where('status', 'active')->count(),
                'inactive'  => User::where('status', 'inactive')->count(),
                'pending'   => User::where('status', 'pending')->count(),
                'suspended' => User::where('status', 'suspended')->count(),
                'by_role'   => Role::withCount('users')->get()->pluck('users_count', 'name'),
            ];
            $this->logAudit('view_user_stats', 'user', null, 'Viewed user statistics');
            return $this->successResponse($stats, 'Stats retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to retrieve stats');
        }
    }

    public function trashed(Request $request)
    {
        $perm = $this->checkPermission('users.view');
        if ($perm) return $perm;

        try {
            $query = User::onlyTrashed()->with('role', 'createdBy', 'collectionCenter');

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function($q) use ($s) {
                    $q->where('name', 'LIKE', "%{$s}%")
                      ->orWhere('email', 'LIKE', "%{$s}%")
                      ->orWhere('phone', 'LIKE', "%{$s}%");
                });
            }

            $users = $query->orderBy('deleted_at', 'desc')->paginate($request->get('per_page', 15));
            $this->logAudit('view_trashed_users', 'user', null, 'Viewed trashed users');
            return $this->successResponse($users, 'Trashed users retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch trashed users');
        }
    }

    public function restore(Request $request, $id)
    {
        $perm = $this->checkPermission('users.restore');
        if ($perm) return $perm;

        try {
            $user = User::onlyTrashed()->findOrFail($id);
            $user->restore();
            $this->logAudit('restore_user', 'user', $id, "Restored user {$user->email}");
            return $this->successResponse(null, 'User restored');
        } catch (\Exception $e) {
            return $this->serverError('Failed to restore user');
        }
    }

    public function forceDelete(Request $request, $id)
    {
        $perm = $this->checkPermission('users.delete');
        if ($perm) return $perm;

        try {
            $user = User::onlyTrashed()->findOrFail($id);
            $email = $user->email;
            $user->forceDelete();
            $this->logAudit('force_delete_user', 'user', $id, "Permanently deleted user {$email}");
            return $this->successResponse(null, 'User permanently deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to force delete user');
        }
    }

    public function Userdropdown(Request $request)
    {
        try {
            $query = User::select('id', 'name')
                ->orderBy('name', 'asc');

            if ($request->filled('active_only') && $request->active_only == 1) {
                $query->where('status', 'active');
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where('name', 'LIKE', "%{$s}%");
            }

            $users = $query->limit(50)->get();

            return $this->successResponse($users, 'Users dropdown retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch users dropdown');
        }
    }

    public function salesAgentDropdown(Request $request)
{
    try {
        $user = $this->authUser();
        if (!$user) {
            return $this->unauthorized('Not authenticated');
        }

        $query = User::without('role')
            ->select('id', 'name')
            ->whereHas('role', function ($q) {
                $q->where('name', 'SALES_AGENT');
            })
            ->where('status', 'active')
            ->orderBy('name');

        // Branch owners: only see sales agents assigned to their own collection center
        if ($user->isBranchOwner()) {
            if (empty($user->cc_id)) {
                return $this->successResponse([], 'No branch assigned to this owner');
            }
            $query->where('cc_id', $user->cc_id);
        }

        // Optional search filter
        if ($request->filled('search')) {
            $query->where('name', 'LIKE', '%' . $request->search . '%');
        }

        $salesAgents = $query->limit(50)->get();

        return $this->successResponse(
            $salesAgents,
            'Sales agents dropdown retrieved'
        );
    } catch (\Exception $e) {
        return $this->serverError('Failed to fetch sales agents dropdown');
    }
}

    /**
 * Resend OTP to a user (admin action)
 * Permission: users.edit (or create a dedicated permission)
 */
public function resendOtp(Request $request, $id)
{
    $perm = $this->checkPermission('users.edit'); // adjust as needed
    if ($perm) return $perm;

    try {
        $user = User::findOrFail($id);

        if ($user->email_verified_at) {
            return $this->badRequest('Email already verified');
        }

        // Delete old OTPs for this email (registration type)
        OTP::where('email', $user->email)
            ->where('type', OTP::TYPE_REGISTRATION)
            ->delete();

        // Create new OTP
        $otpRecord = OTP::create([
            'id'         => (string) Str::uuid(),
            'email'      => $user->email,
            'type'       => OTP::TYPE_REGISTRATION,
            'name'       => $user->name,
            'expires_at' => now()->addMinutes(10),
        ]);

        // Send email
        Mail::to($user->email)->send(
            new OTPMail($otpRecord->otp, $user->name, 'verification', $otpRecord->getVerificationUrl())
        );

        $this->logAudit('resend_otp', 'user', $user->id, "Resent OTP to {$user->email}");
        return $this->successResponse(null, 'OTP resent successfully');
    } catch (\Exception $e) {
        return $this->serverError('Failed to resend OTP');
    }
}
}