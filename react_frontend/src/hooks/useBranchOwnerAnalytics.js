import { useState, useEffect, useCallback } from 'react';
import { branchOwnerDashboardService } from 'services/branchOwnerDashboardService';
import { showSnackbar } from 'utils/snackbar';

export const useBranchOwnerAnalytics = (autoRefreshMs = 300000, period = null, date = null) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (period) params.period = period;
            if (date) params.date = date;

            const response = await branchOwnerDashboardService.getBranchOwnerAnalytics(params);
            if (response.data && response.data.success === false) {
                throw new Error(response.data.message || 'Failed to load branch owner dashboard');
            }
            const dashboardData = response.data?.data || response.data;
            setData(dashboardData);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Failed to load branch owner dashboard';
            setError(message);
            if (showSnackbar) showSnackbar({ type: 'error', message });
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [period, date]);

    useEffect(() => {
        fetchData();
        if (autoRefreshMs > 0) {
            const interval = setInterval(fetchData, autoRefreshMs);
            return () => clearInterval(interval);
        }
    }, [fetchData, autoRefreshMs]);

    return { data, loading, error, refetch: fetchData };
};