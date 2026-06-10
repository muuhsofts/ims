// src/services/product.service.js
import api from './api';

export const productService = {
    // Dropdown
    getProductsDropdown: (params) => api.get('/v3/products/dropdown', { params }),

    // CRUD
    getProducts:         (params)        => api.get('/v3/products', { params }),
    getProduct:          (id)            => api.get(`/v3/products/${id}`),
    createProduct:       (data)          => api.post('/v3/products', data),
    updateProduct:       (id, data)      => api.put(`/v3/products/${id}`, data),
    deleteProduct:       (id)            => api.delete(`/v3/products/${id}`),
    restoreProduct:      (id)            => api.patch(`/v3/products/${id}/restore`),
    forceDeleteProduct:  (id)            => api.delete(`/v3/products/${id}/force`),
    changeProductStatus: (id, status)    => api.patch(`/v3/products/${id}/status`, { status }),

    // Scanner
    scanByImei:   (imei)     => api.get(`/v3/products/scan/imei/${imei}`),
    scanImeiPost: (imei)     => api.post('/v3/products/scan/imei', { imei }),
    assignImei:   (id, imei) => api.patch(`/v3/products/${id}/assign-imei`, { imei }),
};