// src/hooks/useDistributions.js
import { useState, useCallback } from 'react';
import { distributionService } from 'services/distribution.service';
import { ccInventoryService } from 'services/collection-center-inventory.service';
import { showSnackbar } from 'utils/snackbar';

export const useDistributions = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await distributionService.getDistributions(params);
            if (response.data?.success) {
                setData(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err);
            showSnackbar({ type: 'error', message: 'Failed to fetch distributions' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const create = useCallback(async (formData) => {
        const response = await distributionService.createDistribution(formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const confirmReceipt = useCallback(async (id) => {
        const response = await distributionService.confirmReceipt(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const confirmByImei = useCallback(async (imei) => {
        const response = await distributionService.confirmByImei(imei);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    // ✅ Fixed: use correct method name from ccInventoryService
    const getMyProducts = useCallback(async () => {
        const response = await ccInventoryService.getMyProducts();  // was fetchMyProducts
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
        confirmReceipt,
        confirmByImei,
        getMyProducts,
    };
};