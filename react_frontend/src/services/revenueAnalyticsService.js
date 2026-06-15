import api from './api';

export const revenueAnalyticsService = {
    /**
     * Fetch revenue analytics (total, pie chart, histogram)
     * @param {Object} params - { period: 'daily'|'monthly'|'yearly', date: 'YYYY-MM-DD'|'YYYY-MM'|'YYYY' }
     * @returns {Promise}
     */
    getRevenueAnalytics: (params = {}) => {
        return api.get('/v14/reports/revenue-analytics', { params });
    },
};