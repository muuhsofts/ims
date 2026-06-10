// services/ccInventoryService.js

import api from './api';

export const ccInventoryService = {
    // Get paginated list of collection center inventories
    getInventories: (params) => api.get('/v9/collection-center-inventories', { params }),
    getInventory: (id) => api.get(`/v9/collection-center-inventories/${id}`),

    // Confirm receipt by inventory ID
    confirmReceiptById: (id) => api.post(`/v9/collection-center-inventories/${id}/confirm`),

    // Confirm receipt for logged‑in owner's own center (no ID)
    confirmMyReceipt: () => api.post('/v9/collection-center-inventories/my/confirm'),

    // ✅ NEW: Get products available in the branch owner's own collection centre
    getMyProducts: () => api.get('/v9/collection-center-inventories/my-products'),

    // CRUD operations
    createInventory: (data) => api.post('/v9/collection-center-inventories', data),
    updateInventory: (id, data) => api.put(`/v9/collection-center-inventories/${id}`, data),
    deleteInventory: (id) => api.delete(`/v9/collection-center-inventories/${id}`),
};