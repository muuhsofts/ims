// src/services/company.service.js
import api from './api';

export const companyService = {
    // Dropdown
    getCompaniesDropdown: (params) => api.get('/v18/companies/dropdown', { params }),

    // CRUD
    getCompanies: (params) => api.get('/v18/companies', { params }),
    getCompany: (id) => api.get(`/v18/companies/${id}`),
    createCompany: (data) => api.post('/v18/companies', data),
    updateCompany: (id, data) => api.put(`/v18/companies/${id}`, data),
    deleteCompany: (id) => api.delete(`/v18/companies/${id}`),
    restoreCompany: (id) => api.patch(`/v18/companies/${id}/restore`),
    forceDeleteCompany: (id) => api.delete(`/v18/companies/${id}/force`),
    toggleCompanyStatus: (id) => api.patch(`/v18/companies/${id}/toggle-status`),

    // Stats
    getCompanyStats: () => api.get('/v18/companies/stats'),
    getTrashedCompanies: (params) => api.get('/v18/companies/trashed', { params }),
};