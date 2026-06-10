import api from './api';

export const agentDashboardService = {
    getAgentAnalytics: (params = {}) => {
        return api.get('/v14/analytics/agent-dashboard', { params });
    },
};