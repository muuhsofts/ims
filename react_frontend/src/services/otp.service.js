// src/services/otp.service.js
import api from './api';

export const otpService = {
    getOtps: (params) => api.get('/v1/otps', { params }),
    getStats: () => api.get('/v1/otps/stats'),
    cleanup: () => api.delete('/v1/otps/cleanup'),
    cleanupUsed: () => api.delete('/v1/otps/cleanup-used'),
};