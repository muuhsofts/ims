// src/services/role.service.js
import api from './api';

export const roleService = {
    // General roles
    getRoles: () => api.get('/v1/roles'),

    // Dropdown - Recommended for forms & filters (lighter)
    getRolesDropdown: () => api.get('/v1/roles/dropdown'),

    getRole: (id) => api.get(`/v1/roles/${id}`),
    createRole: (data) => api.post('/v1/roles', data),
    updateRole: (id, data) => api.put(`/v1/roles/${id}`, data),
    deleteRole: (id) => api.delete(`/v1/roles/${id}`),

    // Role Permissions
    getRolePermissions: (roleId) => api.get(`/v1/roles/${roleId}/permissions`),

    assignPermissionsToRole: (roleId, permissionIds) =>
        api.post(`/v1/roles/${roleId}/permissions/assign`, { permissions: permissionIds }),

    syncRolePermissions: (roleId, permissionIds) =>
        api.post(`/v1/roles/${roleId}/permissions/sync`, { permissions: permissionIds }),

    revokePermissionFromRole: (roleId, permissionId) =>
        api.post(`/v1/roles/${roleId}/permissions/revoke`, { permission_id: permissionId }),
};