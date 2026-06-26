import { useState, useEffect, useCallback } from 'react';
import {dashboardService} from "services/dashboardService";
import {showSnackbar} from "utils/snackbar";


export const useSalesReportDashboard = (days = 7, autoRefreshMs = 300000) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await dashboardService.salesReportDashboard(days);
            if (response.data.success) {
                setData(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to load sales report');
            }
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "An error occurred");
            showSnackbar({ type: 'error', message: err.message || 'Error loading sales report' });
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        fetchData();
        if (autoRefreshMs > 0) {
            const interval = setInterval(fetchData, autoRefreshMs);
            return () => clearInterval(interval);
        }
    }, [fetchData, autoRefreshMs]);

    return { data, loading, error, refetch: fetchData };
};