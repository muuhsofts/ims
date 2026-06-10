// src/hooks/useWarehouses.js
import { useState, useCallback } from 'react';
import { warehouseService } from 'services/warehouse.service';
import { showSnackbar } from 'utils/snackbar';

export const useWarehouses = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await warehouseService.getWarehouses(params);
            if (response.data?.success) {
                // ✅ Correct extraction: response.data.data.data
                setData(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err);
            showSnackbar({ type: 'error', message: 'Failed to fetch warehouses' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const create = useCallback(async (formData) => {
        const response = await warehouseService.createWarehouse(formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const update = useCallback(async (id, formData) => {
        const response = await warehouseService.updateWarehouse(id, formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const remove = useCallback(async (id) => {
        const response = await warehouseService.deleteWarehouse(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const restore = useCallback(async (id) => {
        const response = await warehouseService.restoreWarehouse(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const changeStatus = useCallback(async (id, status) => {
        const response = await warehouseService.changeWarehouseStatus(id, status);
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
        remove,
        restore,
        changeStatus,
    };
};