// src/services/failed-login.service.js
import api from './api';

export const failedLoginService = {
    getFailedLogins: (params) => api.get('/v1/failed-logins', { params }),
    clear: (email, ip_address) => api.delete('/v1/failed-logins/clear', { data: { email, ip_address } }),
    block: (ip_address) => api.post('/v1/failed-logins/block', { ip_address }),
    unblock: (ip_address) => api.post('/v1/failed-logins/unblock', { ip_address }),
};