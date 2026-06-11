import api from './api';

export const branchOwnerDashboardService = {
    getBranchOwnerAnalytics: (params = {}) => {
        return api.get('/v14/analytics/branch-owner-dashboard', { params });
    },
};