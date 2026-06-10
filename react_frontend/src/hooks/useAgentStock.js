import { useState, useCallback } from 'react';
import { agentSalesService } from 'services/agent-sales.service';
import { showSnackbar } from 'utils/snackbar';

export const useAgentStock = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStock = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await agentSalesService.getAvailableStock();
            // response.data is the array of stock items
            setData(response.data || []);
        } catch (err) {
            setError(err);
            showSnackbar({ type: 'error', message: err.response?.data?.message || 'Failed to load stock' });
            setData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        data,
        loading,
        error,
        fetchStock,
    };
};