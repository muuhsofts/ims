// hooks/useAgentSales.js
import { useState, useCallback } from 'react';
import { agentSalesService } from 'services/agent-sales.service';
import { showSnackbar } from 'utils/snackbar';

export const useAgentSales = () => {
    const [stock, setStock] = useState([]);
    const [loadingStock, setLoadingStock] = useState(false);
    const [saleLoading, setSaleLoading] = useState(false);

    const fetchStock = useCallback(async () => {
        setLoadingStock(true);
        try {
            const response = await agentSalesService.getAvailableStock();
            if (response.data?.success) {
                setStock(response.data.data || []);
            } else {
                setStock([]);
                showSnackbar({ type: 'error', message: 'Failed to load stock' });
            }
        } catch (err) {
            console.error(err);
            showSnackbar({ type: 'error', message: err.response?.data?.message || 'Failed to load stock' });
            setStock([]);
        } finally {
            setLoadingStock(false);
        }
    }, []);

    const createSale = useCallback(async (saleData) => {
        setSaleLoading(true);
        try {
            const response = await agentSalesService.sellProduct(saleData);
            if (response.data?.success) {
                // ✅ Success toast removed – component will handle it
                await fetchStock(); // refresh stock after sale
                return response.data.data;
            } else {
                throw new Error(response.data?.message || 'Sale failed');
            }
        } catch (err) {
            showSnackbar({ type: 'error', message: err.response?.data?.message || err.message || 'Sale failed' });
            throw err;
        } finally {
            setSaleLoading(false);
        }
    }, [fetchStock]);

    return {
        stock,
        loadingStock,
        saleLoading,
        fetchStock,
        createSale,
    };
};