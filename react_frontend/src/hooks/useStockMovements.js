// src/hooks/useStockMovements.js
import { useState, useCallback } from 'react';
import { stockMovementService } from 'services/stock-movement.service';
import { showSnackbar } from 'utils/snackbar';

export const useStockMovements = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await stockMovementService.getMovements(params);
            if (response.data?.success) {
                // ✅ Your backend response structure: response.data.data.data
                setData(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err);
            showSnackbar({ type: 'error', message: 'Failed to fetch stock movements' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const create = useCallback(async (formData) => {
        const response = await stockMovementService.createMovement(formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const update = useCallback(async (id, formData) => {
        const response = await stockMovementService.updateMovement(id, formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const remove = useCallback(async (id) => {
        const response = await stockMovementService.deleteMovement(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    // Optional: Additional methods specific to stock movements
    const getMovementById = useCallback(async (id) => {
        const response = await stockMovementService.getMovement(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const filterByProduct = useCallback(async (productId, params = {}) => {
        return fetchData({ ...params, product_id: productId });
    }, [fetchData]);

    const filterByType = useCallback(async (movementType, params = {}) => {
        return fetchData({ ...params, movement_type: movementType });
    }, [fetchData]);

    return {
        data,
        total,
        loading,
        error,
        fetchData,
        create,
        update,
        remove,
        getMovementById,
        filterByProduct,
        filterByType,
    };
};