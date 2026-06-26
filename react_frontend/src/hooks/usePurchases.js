// src/hooks/usePurchases.js
import { useState, useCallback } from 'react';
import { purchaseService } from 'services/purchase.service';
import { showSnackbar } from 'utils/snackbar';

export const usePurchases = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await purchaseService.getPurchases(params);
            if (response.data?.success) {
                setData(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "An error occurred");
            showSnackbar({ type: 'error', message: 'Failed to fetch purchases' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const create = useCallback(async (formData) => {
        const response = await purchaseService.createPurchase(formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const update = useCallback(async (id, formData) => {
        const response = await purchaseService.updatePurchase(id, formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const updateStatus = useCallback(async (id, status) => {
        const response = await purchaseService.updatePurchaseStatus(id, status);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const remove = useCallback(async (id) => {
        const response = await purchaseService.deletePurchase(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    return {
        data,
        total,
        loading,
        error,
        fetchData,
        create,
        update,
        updateStatus,
        remove,
    };
};