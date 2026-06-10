import api from './api';

export const dashboardService = {
    // Accept period & date as optional query parameters
    getDashboardAnalytics: (params = {}) => {
        return api.get('/v14/analytics/dashboard', { params });
    },
};