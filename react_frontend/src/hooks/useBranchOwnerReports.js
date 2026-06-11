import { useState, useCallback } from 'react';
import { reportService } from 'services/branchOwnerReport.service';
import { showSnackbar } from 'utils/snackbar';

export const useBranchOwnerReports = () => {
    const [stockData, setStockData] = useState(null);
    const [agentStockData, setAgentStockData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchBranchStock = useCallback(async (from_date, to_date, stock_status = null) => {
        setLoading(true);
        setError(null);
        try {
            const response = await reportService.getBranchStockReport(from_date, to_date, stock_status);
            if (response.data?.success) {
                setStockData(response.data.data);
            } else {
                throw new Error(response.data?.message || 'Failed to load branch stock');
            }
        } catch (err) {
            const message = err.response?.data?.message || err.message;
            setError(message);
            showSnackbar({ type: 'error', message });
            setStockData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAgentStock = useCallback(async (from_date, to_date, agent_id = null, stock_status = null) => {
        setLoading(true);
        setError(null);
        try {
            const response = await reportService.getBranchAgentStockReport(from_date, to_date, agent_id, stock_status);
            if (response.data?.success) {
                setAgentStockData(response.data.data);
            } else {
                throw new Error(response.data?.message || 'Failed to load agent stock');
            }
        } catch (err) {
            const message = err.response?.data?.message || err.message;
            setError(message);
            showSnackbar({ type: 'error', message });
            setAgentStockData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAgentProducts = useCallback(async (agent_id, from_date, to_date, stock_status = null) => {
        try {
            const response = await reportService.getBranchAgentProductsReport(agent_id, from_date, to_date, stock_status);
            if (response.data?.success) {
                return response.data.data.products || [];
            } else {
                throw new Error(response.data?.message || 'Failed to load agent products');
            }
        } catch (err) {
            const message = err.response?.data?.message || err.message;
            showSnackbar({ type: 'error', message });
            return [];
        }
    }, []);

    return {
        stockData,
        agentStockData,
        loading,
        error,
        fetchBranchStock,
        fetchAgentStock,
        fetchAgentProducts,
    };
};