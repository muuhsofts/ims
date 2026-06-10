// src/services/stock-movement.service.js
import api from './api';

export const stockMovementService = {
    getMovements: (params) => api.get('/v9/stock-movements', { params }),
    getMovement: (id) => api.get(`/v9/stock-movements/${id}`),
    createMovement: (data) => api.post('/v9/stock-movements', data),
    updateMovement: (id, data) => api.put(`/v9/stock-movements/${id}`, data),
    deleteMovement: (id) => api.delete(`/v9/stock-movements/${id}`),
};