// src/services/returns.service.js
import api from './api';

export const returnsService = {
    // List and search
    getReturns: (params) => api.get('/v17/returns', { params }),
    getStatistics: () => api.get('/v17/returns/statistics'),
    searchReturns: (query) => api.get('/v17/returns/search', { params: { query } }),
    getMyReturns: (params) => api.get('/v17/returns/my-returns', { params }),
    getAgentSales: () => api.get('/v17/returns/agent-sales'),

    // Stock Controller only
    getPendingApproval: (params) => api.get('/v17/returns/pending-approval', { params }),
    approveReturn: (id, data) => api.post(`/v17/returns/${id}/approve`, data),
    completeReturn: (id) => api.post(`/v17/returns/${id}/complete`),

    // IMEI validation
    validateImei: (imei) => api.get('/v17/returns/validate-imei', { params: { imei } }),

    // CRUD
    getReturn: (id) => api.get(`/v17/returns/${id}`),
    createReturn: (data) => api.post('/v17/returns', data),
    cancelReturn: (id) => api.post(`/v17/returns/${id}/cancel`),
};