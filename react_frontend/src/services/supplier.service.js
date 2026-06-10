import api from './api';

export const supplierService = {
    // Dropdown
    getSuppliersDropdown: () => api.get('/v4/suppliers/dropdown'),

    // Existing CRUD
    getSuppliers: (params) => api.get('/v4/suppliers', { params }),
    getSupplier: (id) => api.get(`/v4/suppliers/${id}`),
    createSupplier: (data) => api.post('/v4/suppliers', data),
    updateSupplier: (id, data) => api.put(`/v4/suppliers/${id}`, data),
    deleteSupplier: (id) => api.delete(`/v4/suppliers/${id}`),
    restoreSupplier: (id) => api.patch(`/v4/suppliers/${id}/restore`),
    forceDeleteSupplier: (id) => api.delete(`/v4/suppliers/${id}/force`),
    changeSupplierStatus: (id, status) => api.patch(`/v4/suppliers/${id}/status`, { status }),
};