import { useState, useCallback } from 'react';
import { ccInventoryService } from 'services/collection-center-inventory.service';
import { showSnackbar } from 'utils/snackbar';

export const useCcInventory = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch inventories with pagination & search
    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await ccInventoryService.getInventories(params);
            if (response.data?.success) {
                setData(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "An error occurred");
            showSnackbar({ type: 'error', message: 'Failed to fetch CC inventories' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    // Confirm receipt by inventory ID
    const confirmReceiptById = useCallback(async (id) => {
        const response = await ccInventoryService.confirmReceiptById(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    // Confirm receipt for the logged‑in user's own center
    const confirmMyReceipt = useCallback(async () => {
        const response = await ccInventoryService.confirmMyReceipt();
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    // CRUD
    const create = useCallback(async (formData) => {
        const response = await ccInventoryService.createInventory(formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const update = useCallback(async (id, formData) => {
        const response = await ccInventoryService.updateInventory(id, formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const remove = useCallback(async (id) => {
        const response = await ccInventoryService.deleteInventory(id);
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
        confirmReceiptById,
        confirmMyReceipt,
    };
};