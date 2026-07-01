// src/services/inventory.service.js
import api from './api';

export const inventoryService = {
    getInventories: (params) => api.get('/v7/inventory', { params }),
    getInventory: (id) => api.get(`/v7/inventory/${id}`),
    createInventory: (data) => api.post('/v7/inventory', data),
    updateInventory: (id, data) => api.put(`/v7/inventory/${id}`, data),
    deleteInventory: (id) => api.delete(`/v7/inventory/${id}`),
    getProductsInInventoryDropdown: (params) => api.get('/v7/inventory/product-in/inventory/dropdown', { params }),
};