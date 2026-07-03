// src/services/returns.service.js
import api from './api';

export const returnsService = {
    // Get all returns with filters
    getReturns: (params) => api.get('/v17/returns', { params }),

    // Get single return
    getReturn: (id) => api.get(`/v17/returns/${id}`),

    // Create a new return
    createReturn: (data) => api.post('/v17/returns', data),

    // Approve a return (Stock Controller only)
    approveReturn: (id, data) => api.post(`/v17/returns/${id}/approve`, data),

    // Cancel a return
    cancelReturn: (id) => api.post(`/v17/returns/${id}/cancel`),

    // Validate IMEI before creating return
    validateImei: (imei) => api.get('/v17/returns/validate-imei', {
        params: { imei }
    }),

    // Search returns
    searchReturns: (query) => api.get('/v17/returns/search', {
        params: { query }
    }),

    // Get return statistics
    getStatistics: () => api.get('/v17/returns/statistics'),

    // Get agent's own returns
    myReturns: (params) => api.get('/v17/returns/my-returns', { params }),

    // Get pending returns for approval
    pendingForApproval: (params) => api.get('/v17/returns/pending-approval', { params }),
};