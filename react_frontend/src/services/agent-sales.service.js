// src/services/agent-sales.service.js
import api from './api';

export const agentSalesService = {
    getAvailableStock: () => api.get('/v11/agent/stock'),
    scanProduct: (imei) => api.post('/v11/agent/scan', { imei }),
    sellProduct: (data) => api.post('/v11/agent/sale-product', data),
    returnDamaged: (data) => api.post('/v11/agent/return', data),
    getMySales: (params) => api.get('/v11/agent/sales', { params }),
    getSale: (id) => api.get(`/v11/agent/sales/${id}`),
};