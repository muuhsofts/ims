// services/permission.service.js
import api from './api';

export const permissionService = {
    // Support pagination, search, etc.
    getPermissions: (params) => api.get('/v1/permissions', { params }),
    getPermission: (id) => api.get(`/v1/permissions/${id}`),
    createPermission: (data) => api.post('/v1/permissions', data),
    updatePermission: (id, data) => api.put(`/v1/permissions/${id}`, data),
    deletePermission: (id) => api.delete(`/v1/permissions/${id}`),
};