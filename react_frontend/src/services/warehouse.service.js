// src/services/warehouse.service.js
import api from './api';

export const warehouseService = {
    getWarehousesDropdown: ()            => api.get('/v5/warehouses/dropdown'),
    getWarehouses:         (params)      => api.get('/v5/warehouses', { params }),
    getWarehouse:          (id)          => api.get(`/v5/warehouses/${id}`),
    createWarehouse:       (data)        => api.post('/v5/warehouses', data),
    updateWarehouse:       (id, data)    => api.put(`/v5/warehouses/${id}`, data),
    deleteWarehouse:       (id)          => api.delete(`/v5/warehouses/${id}`),
    restoreWarehouse:      (id)          => api.patch(`/v5/warehouses/${id}/restore`),
    forceDeleteWarehouse:  (id)          => api.delete(`/v5/warehouses/${id}/force`),
    changeWarehouseStatus: (id, status)  => api.patch(`/v5/warehouses/${id}/status`, { status }),
};