// src/services/collection-center.service.js
import api from './api';

export const collectionCenterService = {
    getCentersDropdown: (params) => api.get('/v9/collection-centers/dropdown', { params }),
    getCenters:   (params)    => api.get('/v9/collection-centers', { params }),
    getCenter:    (id)        => api.get(`/v9/collection-centers/${id}`),
    createCenter: (data)      => api.post('/v9/collection-centers', data),
    updateCenter: (id, data)  => api.put(`/v9/collection-centers/${id}`, data),
    deleteCenter: (id)        => api.delete(`/v9/collection-centers/${id}`),
    restoreCenter:(id)        => api.patch(`/v9/collection-centers/${id}/restore`),
};