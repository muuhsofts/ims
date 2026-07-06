// src/services/user.service.js
import api from './api';

export const userService = {
    // Active users
    getUsers: (params) => api.get('/v1/users', { params }),
    getUser: (id) => api.get(`/v1/users/${id}`),
    createUser: (data) => api.post('/v1/users', data),
    updateUser: (id, data) => api.put(`/v1/users/${id}`, data),
    deleteUser: (id) => api.delete(`/v1/users/${id}`),

    // Dropdown
    getUsersDropdown: (params) => api.get('/v1/users/dropdown', { params }),
    getSalesAgentsDropdown: (params) => api.get('/v1/users/sales-agents/dropdown', { params }),
    getBranchOwners: (params) => api.get('/v1/users/branch-owners', { params }),
    getBranchOwnersDropdown: (params) => api.get('/v1/users/branch-owners/dropdown', { params }),

    // Status changes
    activateUser: (id) => api.patch(`/v1/users/${id}/activate`),
    deactivateUser: (id) => api.patch(`/v1/users/${id}/deactivate`),
    suspendUser: (id) => api.patch(`/v1/users/${id}/suspend`),

    // Role & password
    assignRole: (userId, role_id) => api.patch(`/v1/users/${userId}/role`, { role_id }),
    resetUserPassword: (userId, password, password_confirmation) =>
        api.post(`/v1/users/${userId}/reset-password`, { password, password_confirmation }),

    // 🔐 Verification methods
    verifyUserOTP: (data) => api.post('/v1/auth/verify-otp', data),
    resendUserVerification: (userId) => api.post(`/v1/users/${userId}/resend-verification`),
    getUserVerificationStatus: (userId) => api.get(`/v1/users/${userId}/verification-status`),

    // Utilities
    getUserStats: () => api.get('/v1/users/stats'),
    resendOtp: (userId) => api.post(`/v1/users/${userId}/resend-otp`),

    // Soft delete & restore
    getTrashedUsers: (params) => api.get('/v1/users/trashed', { params }),
    restoreUser: (id) => api.patch(`/v1/users/${id}/restore`),
    forceDeleteUser: (id) => api.delete(`/v1/users/${id}/force`),
};