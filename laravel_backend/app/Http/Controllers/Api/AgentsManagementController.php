<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\User;
use App\Models\Role;
use App\Models\OTP;
use App\Models\CollectionCenter;
use App\Mail\OTPMail;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Mail;

class AgentsManagementController extends BaseApiController
{
    use Auditable;

    // =========================================================================
    // PRIVATE HELPER METHODS
    // =========================================================================

    /**
     * Generate a default password (fixed to 12345678 for simplicity)
     */
    private function generateDefaultPassword(): string
    {
        return '12345678';
    }

    /**
     * Get the role ID for SALES_AGENT.
     */
    private function getSalesAgentRoleId()
    {
        $role = Role::where('name', 'SALES_AGENT')->first();
        if (!$role) {
            throw new \Exception('SALES_AGENT role not found. Please seed roles first.');
        }
        return $role->id;
    }

    /**
     * Check if the authenticated user can view all agents.
     * (Admin or Manager have full access.)
     */
    private function canViewAllAgents(): bool
    {
        $user = auth()->user();
        return $user->role && in_array($user->role->name, ['ADMINISTRATOR', 'MANAGER']);
    }

    /**
     * Get the collection center IDs owned by the authenticated branch owner.
     * Returns null if user is not a branch owner, or an array of IDs.
     */
    private function getOwnedCenterIds($user)
    {
        if (!$user->role || $user->role->name !== 'BRANCH_OWNER') {
            return null;
        }
        return CollectionCenter::where('owner_id', $user->id)->pluck('cc_id')->toArray();
    }

    /**
     * Check if an agent belongs to any center owned by the given user.
     * Used for show/update/delete/status actions.
     */
    private function isAgentOwnedByUser($agent, $user): bool
    {
        if (!$agent->cc_id) return false;
        $ownedIds = $this->getOwnedCenterIds($user);
        if (empty($ownedIds)) return false;
        return in_array($agent->cc_id, $ownedIds);
    }

    /**
     * Check if user has access to an agent (admin, creator, or owner).
     */
    private function hasAccessToAgent($agent, $user): bool
    {
        $isAdminOrManager = $this->canViewAllAgents();
        $isCreator = $agent->created_by === $user->id;
        $isOwnedByUser = $this->isAgentOwnedByUser($agent, $user);
        
        return $isAdminOrManager || $isCreator || $isOwnedByUser;
    }

    /**
     * Apply filters to agent query.
     */
    private function applyAgentFilters($query, Request $request)
    {
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
        if ($request->filled('cc_id')) {
            $query->where('cc_id', $request->cc_id);
        }
        return $query;
    }

    // =========================================================================
    // PUBLIC API METHODS
    // =========================================================================

    /**
     * List sales agents – filtered by:
     * - Admin/Manager: all agents
     * - Branch Owner: all agents assigned to any collection center they own
     * - Other users: only agents they created
     * Permission: sales_agent.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('sales_agent.view');
        if ($perm) return $perm;

        try {
            $roleId = $this->getSalesAgentRoleId();
            $authUser = $request->user();

            $query = User::with('role', 'createdBy', 'collectionCenter')
                ->where('role_id', $roleId);

            $isAdminOrManager = $this->canViewAllAgents();
            $ownedCenterIds = $this->getOwnedCenterIds($authUser);
            $isBranchOwner = !empty($ownedCenterIds);

            if ($isAdminOrManager) {
                // Admins/Managers see all agents – no additional filter.
            } elseif ($isBranchOwner) {
                // Branch owners see agents assigned to any center they own.
                $query->whereIn('cc_id', $ownedCenterIds);
            } else {
                // Regular users see only agents they created.
                $query->where(function($q) use ($authUser) {
                    $q->where('created_by', $authUser->id)
                      ->orWhereNull('created_by');
                });
            }

            $this->applyAgentFilters($query, $request);

            $agents = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));

            $this->logAudit('view_agents', 'user', null, 'Viewed sales agents list');
            return $this->successResponse($agents, 'Sales agents retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch agents: ' . $e->getMessage());
        }
    }

    /**
     * Show a single sales agent – only if user has access (owns center, created, or admin).
     * Permission: sales_agent.view
     */
    public function show(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.view');
        if ($perm) return $perm;

        try {
            $roleId = $this->getSalesAgentRoleId();
            $authUser = $request->user();

            $agent = User::with('role', 'createdBy', 'collectionCenter')
                ->where('role_id', $roleId)
                ->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to view this agent.');
            }

            return $this->successResponse($agent, 'Agent retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Agent not found');
        }
    }

    /**
     * Create a new sales agent – automatically generates password (12345678).
     * Permission: sales_agent.create
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('sales_agent.create');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();

            $request->validate([
                'name'     => 'required|string|max:255',
                'email'    => 'required|email|unique:users',
                'phone'    => 'nullable|string|max:20',
                'cc_id'    => 'nullable|string|exists:collection_centers,cc_id',
            ]);

            // If user is branch owner, ensure they can assign to one of their centers
            $ownedCenterIds = $this->getOwnedCenterIds($authUser);
            if (!empty($ownedCenterIds) && $request->filled('cc_id')) {
                if (!in_array($request->cc_id, $ownedCenterIds)) {
                    return $this->badRequest('You can only assign agents to collection centers you own.');
                }
            }

            $defaultPassword = $this->generateDefaultPassword();
            $roleId = $this->getSalesAgentRoleId();

            DB::beginTransaction();

            $user = User::create([
                'id'         => (string) Str::uuid(),
                'name'       => $request->name,
                'email'      => $request->email,
                'password'   => Hash::make($defaultPassword),
                'phone'      => $request->phone,
                'status'     => 'pending',
                'is_active'  => false,
                'created_by' => $authUser->id,
                'role_id'    => $roleId,
                'cc_id'      => $request->cc_id ?? null,
            ]);

            // Send OTP
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

            // Return the generated password so it can be displayed to the user
            $response = $user->load('role', 'collectionCenter');
            $response->generated_password = $defaultPassword;

            $this->logAudit('create_agent', 'user', $user->id, "Created sales agent {$user->email}");
            return $this->created($response, 'Sales agent created. OTP sent. Default password: ' . $defaultPassword);
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create agent: ' . $e->getMessage());
        }
    }

    /**
     * Update a sales agent – only if user has access.
     * Permission: sales_agent.edit
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.edit');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();

            $agent = User::where('role_id', $roleId)->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to edit this agent.');
            }

            // If branch owner, ensure they can assign to a center they own
            if ($request->has('cc_id') && $request->filled('cc_id')) {
                $ownedCenterIds = $this->getOwnedCenterIds($authUser);
                if (!empty($ownedCenterIds) && !in_array($request->cc_id, $ownedCenterIds)) {
                    return $this->badRequest('You can only assign agents to collection centers you own.');
                }
            }

            $rules = [
                'name'   => 'sometimes|string|max:255',
                'phone'  => 'nullable|string|max:20',
                'status' => 'sometimes|in:pending,active,inactive,suspended',
                'cc_id'  => 'nullable|string|exists:collection_centers,cc_id',
            ];

            $request->validate($rules);

            $data = $request->only(['name', 'phone', 'cc_id']);
            if ($request->has('status')) {
                $data['status'] = $request->status;
                $data['is_active'] = $request->status === 'active';
            }

            $agent->update($data);
            $this->logAudit('update_agent', 'user', $agent->id, "Updated sales agent {$agent->email}");
            return $this->successResponse($agent->load('role', 'collectionCenter'), 'Agent updated');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to update agent: ' . $e->getMessage());
        }
    }

    /**
     * Soft delete a sales agent – only if user has access.
     * Permission: sales_agent.delete
     */
    public function destroy(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.delete');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();

            $agent = User::where('role_id', $roleId)->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to delete this agent.');
            }

            if ($agent->id === $authUser->id) {
                return $this->badRequest('Cannot delete yourself');
            }

            $email = $agent->email;
            $agent->delete();
            $this->logAudit('delete_agent', 'user', $id, "Deleted sales agent {$email}");
            return $this->successResponse(null, 'Agent deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete agent: ' . $e->getMessage());
        }
    }

    /**
     * Restore a soft‑deleted sales agent – only if user has access.
     * Permission: sales_agent.restore
     */
    public function restore(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.restore');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();

            $agent = User::onlyTrashed()->where('role_id', $roleId)->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to restore this agent.');
            }

            $agent->restore();
            $this->logAudit('restore_agent', 'user', $id, "Restored sales agent {$agent->email}");
            return $this->successResponse(null, 'Agent restored');
        } catch (\Exception $e) {
            return $this->serverError('Failed to restore agent: ' . $e->getMessage());
        }
    }

    /**
     * Permanently delete a sales agent – only if user has access.
     * Permission: sales_agent.delete
     */
    public function forceDelete(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.delete');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();

            $agent = User::onlyTrashed()->where('role_id', $roleId)->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to permanently delete this agent.');
            }

            $email = $agent->email;
            $agent->forceDelete();
            $this->logAudit('force_delete_agent', 'user', $id, "Permanently deleted sales agent {$email}");
            return $this->successResponse(null, 'Agent permanently deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to force delete agent: ' . $e->getMessage());
        }
    }

    /**
     * Activate a sales agent – only if user has access.
     * Permission: sales_agent.activate
     */
    public function activate(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.activate');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();

            $agent = User::where('role_id', $roleId)->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to activate this agent.');
            }

            $agent->update(['status' => 'active', 'is_active' => true]);
            $this->logAudit('activate_agent', 'user', $agent->id, "Activated sales agent {$agent->email}");
            return $this->successResponse(null, 'Agent activated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to activate agent: ' . $e->getMessage());
        }
    }

    /**
     * Deactivate a sales agent – only if user has access.
     * Permission: sales_agent.deactivate
     */
    public function deactivate(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.deactivate');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();

            $agent = User::where('role_id', $roleId)->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to deactivate this agent.');
            }

            $agent->update(['status' => 'inactive', 'is_active' => false]);
            $this->logAudit('deactivate_agent', 'user', $agent->id, "Deactivated sales agent {$agent->email}");
            return $this->successResponse(null, 'Agent deactivated');
        } catch (\Exception $e) {
            return $this->serverError('Failed to deactivate agent: ' . $e->getMessage());
        }
    }

    /**
     * Suspend a sales agent – only if user has access.
     * Permission: sales_agent.suspend
     */
    public function suspend(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.suspend');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();

            $agent = User::where('role_id', $roleId)->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to suspend this agent.');
            }

            $agent->update(['status' => 'suspended', 'is_active' => false]);
            $agent->tokens()->delete();
            $this->logAudit('suspend_agent', 'user', $agent->id, "Suspended sales agent {$agent->email}");
            return $this->successResponse(null, 'Agent suspended');
        } catch (\Exception $e) {
            return $this->serverError('Failed to suspend agent: ' . $e->getMessage());
        }
    }

    /**
     * List trashed (soft‑deleted) sales agents – filtered by ownership.
     * Permission: sales_agent.view
     */
    public function trashed(Request $request)
    {
        $perm = $this->checkPermission('sales_agent.view');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();

            $query = User::onlyTrashed()
                ->with('role', 'createdBy', 'collectionCenter')
                ->where('role_id', $roleId);

            $isAdminOrManager = $this->canViewAllAgents();
            $ownedCenterIds = $this->getOwnedCenterIds($authUser);
            $isBranchOwner = !empty($ownedCenterIds);

            if ($isAdminOrManager) {
                // no filter
            } elseif ($isBranchOwner) {
                $query->whereIn('cc_id', $ownedCenterIds);
            } else {
                $query->where(function($q) use ($authUser) {
                    $q->where('created_by', $authUser->id)
                      ->orWhereNull('created_by');
                });
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function($q) use ($s) {
                    $q->where('name', 'LIKE', "%{$s}%")
                      ->orWhere('email', 'LIKE', "%{$s}%")
                      ->orWhere('phone', 'LIKE', "%{$s}%");
                });
            }

            $agents = $query->orderBy('deleted_at', 'desc')
                ->paginate($request->get('per_page', 15));

            return $this->successResponse($agents, 'Trashed agents retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch trashed agents: ' . $e->getMessage());
        }
    }

    /**
     * Get stats for sales agents – counts are always global (no ownership filter needed).
     * Permission: sales_agent.view
     */
    public function stats(Request $request)
    {
        $perm = $this->checkPermission('sales_agent.view');
        if ($perm) return $perm;

        try {
            $roleId = $this->getSalesAgentRoleId();
            $stats = [
                'total'     => User::where('role_id', $roleId)->count(),
                'active'    => User::where('role_id', $roleId)->where('status', 'active')->count(),
                'inactive'  => User::where('role_id', $roleId)->where('status', 'inactive')->count(),
                'pending'   => User::where('role_id', $roleId)->where('status', 'pending')->count(),
                'suspended' => User::where('role_id', $roleId)->where('status', 'suspended')->count(),
            ];
            return $this->successResponse($stats, 'Agent stats retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to retrieve agent stats: ' . $e->getMessage());
        }
    }
}