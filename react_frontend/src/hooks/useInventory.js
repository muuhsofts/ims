// src/hooks/useInventory.js
import { useState, useCallback } from 'react';
import { inventoryService } from 'services/inventory.service';
import { showSnackbar } from 'utils/snackbar';

export const useInventory = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: 15,
        total: 0,
    });

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await inventoryService.getInventories(params);
            if (response.data?.success) {
                const responseData = response.data.data;
                setData(responseData.data || []);
                setTotal(responseData.total || 0);
                setPagination(prev => ({
                    ...prev,
                    page: responseData.current_page || 1,
                    perPage: responseData.per_page || 15,
                    total: responseData.total || 0,
                }));
            } else {
                setData([]);
                setTotal(0);
                showSnackbar({ type: 'warning', message: response.data?.message || 'No data found' });
            }
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || "Failed to fetch inventory";
            setError(errorMsg);
            showSnackbar({ type: 'error', message: errorMsg });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const create = useCallback(async (formData) => {
        const response = await inventoryService.createInventory(formData);
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to create inventory');
        }
        showSnackbar({ type: 'success', message: 'Inventory created successfully' });
        return response.data;
    }, []);

    const update = useCallback(async (id, formData) => {
        const response = await inventoryService.updateInventory(id, formData);
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to update inventory');
        }
        showSnackbar({ type: 'success', message: 'Inventory updated successfully' });
        return response.data;
    }, []);

    const remove = useCallback(async (id) => {
        const response = await inventoryService.deleteInventory(id);
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to delete inventory');
        }
        showSnackbar({ type: 'success', message: 'Inventory deleted successfully' });
        return response.data;
    }, []);

    const getSummary = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const response = await inventoryService.getInventorySummary(params);
            if (response.data?.success) {
                return response.data.data;
            }
            return null;
        } catch (err) {
            showSnackbar({ type: 'error', message: 'Failed to fetch summary' });
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getStatistics = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const response = await inventoryService.getInventoryStatistics(params);
            if (response.data?.success) {
                return response.data.data;
            }
            return null;
        } catch (err) {
            showSnackbar({ type: 'error', message: 'Failed to fetch statistics' });
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const addProducts = useCallback(async (id, productIds) => {
        const response = await inventoryService.addProductsToInventory(id, { product_ids: productIds });
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to add products');
        }
        showSnackbar({ type: 'success', message: 'Products added successfully' });
        return response.data;
    }, []);

    const removeProducts = useCallback(async (id, productIds) => {
        const response = await inventoryService.removeProductsFromInventory(id, { product_ids: productIds });
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to remove products');
        }
        showSnackbar({ type: 'success', message: 'Products removed successfully' });
        return response.data;
    }, []);

    return {
        data,
        total,
        loading,
        error,
        pagination,
        fetchData,
        create,
        update,
        remove,
        getSummary,
        getStatistics,
        addProducts,
        removeProducts,
    };
};