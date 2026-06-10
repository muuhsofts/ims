// src/hooks/useSuppliers.js
import { useState, useCallback } from 'react';
import { supplierService } from 'services/supplier.service';
import { showSnackbar } from 'utils/snackbar';

export const useSuppliers = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await supplierService.getSuppliers(params);
            if (response.data?.success) {
                // ✅ Correct extraction for your API
                setData(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err);
            showSnackbar({ type: 'error', message: 'Failed to fetch suppliers' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const create = useCallback(async (formData) => {
        const response = await supplierService.createSupplier(formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const update = useCallback(async (id, formData) => {
        const response = await supplierService.updateSupplier(id, formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const remove = useCallback(async (id) => {
        const response = await supplierService.deleteSupplier(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const restore = useCallback(async (id) => {
        const response = await supplierService.restoreSupplier(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const forceDelete = useCallback(async (id) => {
        const response = await supplierService.forceDeleteSupplier(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const changeStatus = useCallback(async (id, status) => {
        const response = await supplierService.changeSupplierStatus(id, status);
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
        forceDelete,
        changeStatus,
    };
};