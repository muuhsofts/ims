// src/services/audit.service.js
import api from './api';

export const auditService = {
    getAuditTrails: (params) => api.get('/v1/audit-trails', { params }),
    getModules: () => api.get('/v1/audit-trails/modules'),
    getActions: () => api.get('/v1/audit-trails/actions'),
    getStats: (params) => api.get('/v1/audit-trails/stats', { params }),
    exportCsv: (params) => api.get('/v1/audit-trails/export/csv', { params, responseType: 'blob' }),
    exportExcel: (params) => api.get('/v1/audit-trails/export/excel', { params, responseType: 'blob' }),
    exportPdf: (params) => api.get('/v1/audit-trails/export/pdf', { params, responseType: 'blob' }),
};