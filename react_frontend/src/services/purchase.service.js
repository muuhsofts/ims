// src/services/purchase.service.js
import api from './api';

export const purchaseService = {
    getPurchases: (params) => api.get('/v6/purchases', { params }),
    getPurchase: (id) => api.get(`/v6/purchases/${id}`),
    createPurchase: (data) => api.post('/v6/purchases', data),
    updatePurchase: (id, data) => api.put(`/v6/purchases/${id}`, data),
    updatePurchaseStatus: (id, status) => api.patch(`/v6/purchases/${id}/status`, { status }),
    deletePurchase: (id) => api.delete(`/v6/purchases/${id}`),
};