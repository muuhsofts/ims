<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Role;
use App\Models\Permission;
use App\Traits\Auditable;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RolePermissionController extends BaseApiController
{
    use Auditable;

    /*
    |--------------------------------------------------------------------------
    | ROLES
    |--------------------------------------------------------------------------
    */

    /**
     * List all roles.
     * Permission: roles.view
     */
    public function index(Request $request)
    {
        $perm = $this->checkPermission('roles.view');
        if ($perm) return $perm;

        try {
            $query = Role::withCount('users');

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(fn($q) => $q->where('name',         'LIKE', "%{$s}%")
                                          ->orWhere('display_name', 'LIKE', "%{$s}%")
                                          ->orWhere('description',  'LIKE', "%{$s}%"));
            }

            $roles = $query->orderBy('display_name')->paginate($request->get('per_page', 15));
            $this->logAudit('view_roles', 'role', null, 'Viewed roles list');
            return $this->successResponse($roles, 'Roles retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch roles');
        }
    }

    /**
     * Create a new role.
     * Permission: roles.create
     */
    public function store(Request $request)
    {
        $perm = $this->checkPermission('roles.create');
        if ($perm) return $perm;

        try {
            $request->validate([
                'name'         => 'required|string|max:255|unique:roles,name',
                'display_name' => 'nullable|string|max:255',
                'description'  => 'nullable|string|max:500',
            ]);

            $role = Role::create([
                'id'           => (string) Str::uuid(),
                'name'         => $request->name,
                'display_name' => $request->input('display_name', $request->name),
                'description'  => $request->description,
                'guard_name'   => 'web',
            ]);

            $this->logAudit('create_role', 'role', $role->id, "Created role {$role->name}");
            return $this->created($role, 'Role created');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to create role');
        }
    }

    /**
     * Get roles for dropdown.
     * Used by: GET /v1/roles/dropdown
     */
    public function getRolesDropdown(Request $request)
    {
        try {
            $roles = Role::select('id', 'name', 'display_name', 'description')
                ->orderBy('display_name')
                ->get();

            return $this->successResponse($roles, 'Roles dropdown retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch roles dropdown');
        }
    }

    /**
     * Get role statistics.
     * Permission: roles.view
     */
    public function getStats(Request $request)
    {
        $perm = $this->checkPermission('roles.view');
        if ($perm) return $perm;

        try {
            $stats = [
                'total'   => Role::count(),
                'by_role' => Role::withCount('users')->get()->map(fn($r) => [
                    'name'         => $r->name,
                    'display_name' => $r->display_name,
                    'users_count'  => $r->users_count,
                ]),
            ];

            $this->logAudit('view_role_stats', 'role', null, 'Viewed role statistics');
            return $this->successResponse($stats, 'Role stats retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch role stats');
        }
    }

    /**
     * Show a single role with its permissions.
     * Permission: roles.view
     */
    public function show(Request $request, $id)
    {
        $perm = $this->checkPermission('roles.view');
        if ($perm) return $perm;

        try {
            $role = Role::with('permissions')->withCount('users')->findOrFail($id);
            return $this->successResponse($role, 'Role retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Role not found');
        }
    }

    /**
     * Update a role.
     * Permission: roles.edit
     */
    public function update(Request $request, $id)
    {
        $perm = $this->checkPermission('roles.edit');
        if ($perm) return $perm;

        try {
            $role = Role::findOrFail($id);

            $request->validate([
                'name'         => 'sometimes|string|max:255|unique:roles,name,' . $id,
                'display_name' => 'nullable|string|max:255',
                'description'  => 'nullable|string|max:500',
            ]);

            $role->update($request->only(['name', 'display_name', 'description']));
            $this->logAudit('update_role', 'role', $role->id, "Updated role {$role->name}");
            return $this->successResponse($role, 'Role updated');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to update role');
        }
    }

    /**
     * Delete a role.
     * Permission: roles.delete
     */
    public function destroy(Request $request, $id)
    {
        $perm = $this->checkPermission('roles.delete');
        if ($perm) return $perm;

        try {
            $role = Role::withCount('users')->findOrFail($id);

            if ($role->users_count > 0) {
                return $this->badRequest('Cannot delete a role that has users assigned to it');
            }

            $name = $role->name;
            $role->delete();
            $this->logAudit('delete_role', 'role', $id, "Deleted role {$name}");
            return $this->successResponse(null, 'Role deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete role');
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ROLE ↔ PERMISSION RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    /**
     * Get all permissions assigned to a role.
     * Permission: roles.view
     */
    public function getRolePermissions(Request $request, $id)
    {
        $perm = $this->checkPermission('roles.view');
        if ($perm) return $perm;

        try {
            $role = Role::with('permissions')->findOrFail($id);
            return $this->successResponse($role->permissions, 'Role permissions retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Role not found');
        }
    }

    /**
     * Assign permissions to a role (additive).
     * Permission: roles.assign_permissions
     */
    public function assignPermissionsToRole(Request $request, $id)
    {
        $perm = $this->checkPermission('roles.assign_permissions');
        if ($perm) return $perm;

        try {
            $request->validate([
                'permissions'   => 'required|array|min:1',
                'permissions.*' => 'string|exists:permissions,id',
            ]);

            $role = Role::findOrFail($id);
            $role->permissions()->syncWithoutDetaching($request->permissions);

            $this->logAudit('assign_permissions', 'role', $role->id, "Assigned permissions to role {$role->name}");
            return $this->successResponse($role->load('permissions'), 'Permissions assigned');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to assign permissions');
        }
    }

    /**
     * Sync permissions on a role (replaces existing set).
     * Permission: roles.assign_permissions
     */
    public function syncRolePermissions(Request $request, $id)
    {
        $perm = $this->checkPermission('roles.assign_permissions');
        if ($perm) return $perm;

        try {
            $request->validate([
                'permissions'   => 'required|array',
                'permissions.*' => 'string|exists:permissions,id',
            ]);

            $role = Role::findOrFail($id);
            $role->permissions()->sync($request->permissions);

            $this->logAudit('sync_permissions', 'role', $role->id, "Synced permissions on role {$role->name}");
            return $this->successResponse($role->load('permissions'), 'Permissions synced');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to sync permissions');
        }
    }

    /**
     * Revoke a permission from a role.
     * Permission: roles.assign_permissions
     */
    public function revokePermissionFromRole(Request $request, $id)
    {
        $perm = $this->checkPermission('roles.assign_permissions');
        if ($perm) return $perm;

        try {
            $request->validate([
                'permission_id' => 'required|string|exists:permissions,id',
            ]);

            $role = Role::findOrFail($id);
            $role->permissions()->detach($request->permission_id);

            $this->logAudit('revoke_permission', 'role', $role->id, "Revoked permission from role {$role->name}");
            return $this->successResponse($role->load('permissions'), 'Permission revoked');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to revoke permission');
        }
    }

    /*
    |--------------------------------------------------------------------------
    | PERMISSIONS (standalone CRUD)
    |--------------------------------------------------------------------------
    */

    /**
     * List all permissions.
     * Permission: permissions.view
     */
    public function getPermissions(Request $request)
    {
        $perm = $this->checkPermission('permissions.view');
        if ($perm) return $perm;

        try {
            $query = Permission::query();

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(fn($q) => $q->where('name',         'LIKE', "%{$s}%")
                                          ->orWhere('display_name', 'LIKE', "%{$s}%")
                                          ->orWhere('description',  'LIKE', "%{$s}%"));
            }

            $permissions = $query->orderBy('name')->paginate($request->get('per_page', 50));
            $this->logAudit('view_permissions', 'permission', null, 'Viewed permissions list');
            return $this->successResponse($permissions, 'Permissions retrieved');
        } catch (\Exception $e) {
            return $this->serverError('Failed to fetch permissions');
        }
    }

    /**
     * Create a permission.
     * Permission: permissions.create
     */
    public function createPermission(Request $request)
    {
        $perm = $this->checkPermission('permissions.create');
        if ($perm) return $perm;

        try {
            $request->validate([
                'name'         => 'required|string|max:255|unique:permissions,name',
                'display_name' => 'nullable|string|max:255',
                'description'  => 'nullable|string|max:500',
            ]);

            $permission = Permission::create([
                'id'           => (string) Str::uuid(),
                'name'         => $request->name,
                'display_name' => $request->input('display_name', $request->name),
                'description'  => $request->description,
                'guard_name'   => 'web',
            ]);

            $this->logAudit('create_permission', 'permission', $permission->id, "Created permission {$permission->name}");
            return $this->created($permission, 'Permission created');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to create permission');
        }
    }

    /**
     * Show a single permission.
     * Permission: permissions.view
     */
    public function getPermission(Request $request, $id)
    {
        $perm = $this->checkPermission('permissions.view');
        if ($perm) return $perm;

        try {
            $permission = Permission::findOrFail($id);
            return $this->successResponse($permission, 'Permission retrieved');
        } catch (\Exception $e) {
            return $this->notFound('Permission not found');
        }
    }

    /**
     * Update a permission.
     * Permission: permissions.edit
     */
    public function updatePermission(Request $request, $id)
    {
        $perm = $this->checkPermission('permissions.edit');
        if ($perm) return $perm;

        try {
            $permission = Permission::findOrFail($id);

            $request->validate([
                'name'         => 'sometimes|string|max:255|unique:permissions,name,' . $id,
                'display_name' => 'nullable|string|max:255',
                'description'  => 'nullable|string|max:500',
            ]);

            $permission->update($request->only(['name', 'display_name', 'description']));
            $this->logAudit('update_permission', 'permission', $permission->id, "Updated permission {$permission->name}");
            return $this->successResponse($permission, 'Permission updated');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (\Exception $e) {
            return $this->serverError('Failed to update permission');
        }
    }

    /**
     * Delete a permission.
     * Permission: permissions.delete
     */
    public function deletePermission(Request $request, $id)
    {
        $perm = $this->checkPermission('permissions.delete');
        if ($perm) return $perm;

        try {
            $permission = Permission::findOrFail($id);
            $name       = $permission->name;
            $permission->delete();

            $this->logAudit('delete_permission', 'permission', $id, "Deleted permission {$name}");
            return $this->successResponse(null, 'Permission deleted');
        } catch (\Exception $e) {
            return $this->serverError('Failed to delete permission');
        }
    }
}