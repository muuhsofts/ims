import api from './api';

export const transferRequestService = {
    // List & detail
    getRequests: (params) => api.get('/v8/transfer-requests', { params }),
    getRequest: (id) => api.get(`/v8/transfer-requests/${id}`),
    createRequest: (data) => api.post('/v8/transfer-requests', data),

    // Actions – use PATCH for state changes (as defined in routes)
    approveRequest: (id) => api.patch(`/v8/transfer-requests/${id}/approve`),
    rejectRequest:  (id) => api.patch(`/v8/transfer-requests/${id}/reject`),
    processTransfer: (id, productIds) => api.post(`/v8/transfer-requests/${id}/process`, { product_ids: productIds }),
    scanReceipt: (id, imei) => api.post(`/v8/transfer-requests/${id}/scan`, { imei }),
    confirmReceipt: (id) => api.post(`/v8/transfer-requests/${id}/confirm-receipt`),
    deleteRequest: (id) => api.delete(`/v8/transfer-requests/${id}`),

    // Helper
    getAvailableProducts: (id) => api.get(`/v8/transfer-requests/${id}/available-products`),
};