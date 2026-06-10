// src/services/distribution.service.js
import api from './api';

export const distributionService = {
    getDistributions: (params) => api.get('/v10/distributions', { params }),
    getDistribution: (id) => api.get(`/v10/distributions/${id}`),
    createDistribution: (data) => api.post('/v10/distributions', data),
    confirmReceipt: (id) => api.patch(`/v10/distributions/${id}/confirm`),
    confirmByImei: (imei) => api.post('/v10/distributions/confirm-by-imei', { imei }),
    getAvailableStock: (params) => api.get('/v10/collection-center/stock', { params }),
};