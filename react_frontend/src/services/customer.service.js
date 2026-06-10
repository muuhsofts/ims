import api from './api';

export const customerService = {
    getCustomers: (params) => api.get('/v12/customers', { params }),
    getCustomer: (id) => api.get(`/v12/customers/${id}`),
    createCustomer: (data) => api.post('/v12/customers', data),
    updateCustomer: (id, data) => api.put(`/v12/customers/${id}`, data),
    deleteCustomer: (id) => api.delete(`/v12/customers/${id}`), // soft delete
    restoreCustomer: (id) => api.patch(`/v12/customers/${id}/restore`),

    getMyCustomers: (params) => api.get('/v12/customers/my', { params }),
};