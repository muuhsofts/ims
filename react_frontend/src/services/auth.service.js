// src/services/auth.service.js
import api from './api';

export const authService = {
    register: (data) => api.post('/v1/auth/register', data),

    login: (email, password) => api.post('/v1/auth/login', { email, password }),

    verifyOTP: (email, otp) => api.post('/v1/auth/verify-otp', { email, otp }),

    forgotPassword: (email) => api.post('/v1/auth/forgot-password', { email }),

    verifyResetOTP: (email, otp) => api.post('/v1/auth/verify-reset-otp', { email, otp }),

    resetPassword: (email, otp, password, password_confirmation) =>
        api.post('/v1/auth/reset-password', { email, otp, password, password_confirmation }),

    logout: () => api.post('/v1/auth/logout'),

    me: () => api.get('/v1/auth/me'),

    updateProfile: (data) => api.put('/v1/auth/profile', data),

    changePassword: (current_password, password, password_confirmation) =>
        api.post('/v1/auth/change-password', { current_password, password, password_confirmation }),

    googleRedirect: (role) => api.get('/v1/auth/google/redirect', { params: { role } }),

    getPermissions: () => api.get('/v1/auth/permissions'),
};