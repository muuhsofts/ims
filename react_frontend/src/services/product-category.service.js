// src/services/product-category.service.js
import api from './api';

export const productCategoryService = {
    getCategories: (params) => api.get('/v2/product-categories', { params }),
    getCategory: (id) => api.get(`/v2/product-categories/${id}`),
    createCategory: (data) => api.post('/v2/product-categories', data),
    updateCategory: (id, data) => api.put(`/v2/product-categories/${id}`, data),
    deleteCategory: (id) => api.delete(`/v2/product-categories/${id}`),
    activateCategory: (id) => api.patch(`/v2/product-categories/${id}/activate`),
    deactivateCategory: (id) => api.patch(`/v2/product-categories/${id}/deactivate`),
    toggleCategoryStatus: (id) => api.patch(`/v2/product-categories/${id}/toggle-status`),
};