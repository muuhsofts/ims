import { useState, useCallback } from 'react';
import { reportService } from 'services/report.service';
import { showSnackbar } from 'utils/snackbar';

export const useCurrentStock = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (warehouse_id = null, cc_id = null) => {
        setLoading(true);
        setError(null);
        try {
            const response = await reportService.getStockReport(warehouse_id, cc_id);
            if (response.data?.success) {
                setData(response.data.data);
            } else {
                setData(null);
            }
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "An error occurred");
            showSnackbar({ type: 'error', message: 'Failed to fetch current stock report' });
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        data,
        loading,
        error,
        fetchData,
    };
};