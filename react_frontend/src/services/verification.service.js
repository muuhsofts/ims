import api from './api';

export const verificationService = {
    sendOTP: (email) => api.post('/v1/verification/send-otp', { email }),
    verifyWithOTP: (email, otp) => api.post('/v1/verification/verify', { email, otp }),
    verifyByToken: (email, token) => api.post('/v1/verification/verify-token', { email, token }),
    resendOTP: (email) => api.post('/v1/verification/resend-otp', { email }),
    checkStatus: (email) => api.get('/v1/verification/status', { params: { email } }),
};