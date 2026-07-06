<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\User;
use App\Models\Role;
use App\Models\OTP;
use App\Models\CollectionCenter;
use App\Mail\OTPMail;
use App\Services\VerificationService;
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

    protected $verificationService;

    public function __construct(VerificationService $verificationService)
    {
        $this->verificationService = $verificationService;
    }

    // =========================================================================
    // PRIVATE HELPER METHODS
    // =========================================================================

    private function generateDefaultPassword(): string
    {
        return '12345678';
    }

    private function getSalesAgentRoleId()
    {
        $role = Role::where('name', 'SALES_AGENT')->first();
        if (!$role) {
            throw new \Exception('SALES_AGENT role not found. Please seed roles first.');
        }
        return $role->id;
    }

    private function canViewAllAgents(): bool
    {
        $user = auth()->user();
        return $user->role && in_array($user->role->name, ['ADMINISTRATOR', 'MANAGER']);
    }

    private function getOwnedCenterIds($user)
    {
        if (!$user->role || $user->role->name !== 'BRANCH_OWNER') {
            return null;
        }
        return CollectionCenter::where('owner_id', $user->id)->pluck('cc_id')->toArray();
    }

    private function isAgentOwnedByUser($agent, $user): bool
    {
        if (!$agent->cc_id) return false;
        $ownedIds = $this->getOwnedCenterIds($user);
        if (empty($ownedIds)) return false;
        return in_array($agent->cc_id, $ownedIds);
    }

    private function hasAccessToAgent($agent, $user): bool
    {
        $isAdminOrManager = $this->canViewAllAgents();
        $isCreator = $agent->created_by === $user->id;
        $isOwnedByUser = $this->isAgentOwnedByUser($agent, $user);
        
        return $isAdminOrManager || $isCreator || $isOwnedByUser;
    }

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
                // Admins/Managers see all agents
            } elseif ($isBranchOwner) {
                $query->whereIn('cc_id', $ownedCenterIds);
            } else {
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
     * Create a new sales agent with verification
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

            $result = $this->verificationService->sendVerificationOTP($user, OTP::TYPE_REGISTRATION);

            DB::commit();

            $response = $user->load('role', 'collectionCenter');
            $response->generated_password = $defaultPassword;

            $this->logAudit('create_agent', 'user', $user->id, "Created sales agent {$user->email}");
            
            return $this->created([
                'agent' => $response,
                'generated_password' => $defaultPassword,
                'otp_sent' => true,
                'expires_in' => $result['expires_in'],
            ], 'Sales agent created. OTP sent to email.');

        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->serverError('Failed to create agent: ' . $e->getMessage());
        }
    }

    /**
     * Verify agent by ID
     * Permission: sales_agent.activate
     */
    public function verifyAgent(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.activate');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();
            $agent = User::where('role_id', $roleId)->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to verify this agent.');
            }

            $result = $this->verificationService->verifyAgentById($id);

            $this->logAudit('verify_agent', 'user', $agent->id, "Manually verified sales agent {$agent->email}");

            return $this->successResponse($result, 'Agent verified successfully.');

        } catch (\Exception $e) {
            return $this->serverError('Failed to verify agent: ' . $e->getMessage());
        }
    }

    /**
     * Get verification status for an agent
     * Permission: sales_agent.view
     */
    public function getAgentVerificationStatus(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.view');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();
            $agent = User::where('role_id', $roleId)->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to view this agent\'s verification status.');
            }

            $status = $this->verificationService->checkVerificationStatus($id);
            return $this->successResponse($status, 'Verification status retrieved.');

        } catch (\Exception $e) {
            return $this->serverError('Failed to check verification status: ' . $e->getMessage());
        }
    }

    /**
     * Resend verification OTP for agent
     * Permission: sales_agent.edit
     */
    public function resendAgentVerification(Request $request, $id)
    {
        $perm = $this->checkPermission('sales_agent.edit');
        if ($perm) return $perm;

        try {
            $authUser = $request->user();
            $roleId = $this->getSalesAgentRoleId();
            $agent = User::where('role_id', $roleId)->findOrFail($id);

            if (!$this->hasAccessToAgent($agent, $authUser)) {
                return $this->forbidden('You do not have permission to resend verification.');
            }

            if (!is_null($agent->email_verified_at)) {
                return $this->badRequest('Agent is already verified.');
            }

            $result = $this->verificationService->resendOTP($agent->email, OTP::TYPE_REGISTRATION);

            $this->logAudit('resend_agent_verification', 'user', $agent->id, "Resent verification OTP to agent {$agent->email}");

            return $this->successResponse([
                'email' => $result['email'],
                'otp_sent' => true,
                'expires_in' => $result['expires_in'],
            ], 'Verification OTP resent successfully.');

        } catch (\Exception $e) {
            return $this->serverError('Failed to resend verification: ' . $e->getMessage());
        }
    }

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