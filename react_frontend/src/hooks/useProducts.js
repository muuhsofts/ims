// src/hooks/useProducts.js
import { useState, useCallback } from 'react';
import { productService } from 'services/product.service';
import { showSnackbar } from 'utils/snackbar';

export const useProducts = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await productService.getProducts(params);
            if (response.data?.success) {
                setData(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "An error occurred");
            showSnackbar({ type: 'error', message: 'Failed to fetch products' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const create = useCallback(async (formData) => {
        const response = await productService.createProduct(formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const update = useCallback(async (id, formData) => {
        const response = await productService.updateProduct(id, formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const remove = useCallback(async (id) => {
        const response = await productService.deleteProduct(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const restore = useCallback(async (id) => {
        const response = await productService.restoreProduct(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const forceDelete = useCallback(async (id) => {
        const response = await productService.forceDeleteProduct(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const changeStatus = useCallback(async (id, status) => {
        const response = await productService.changeProductStatus(id, status);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const scanByImei = useCallback(async (imei) => {
        const response = await productService.scanByImei(imei);
        // If found, response.data.success = true with product data
        // If not found, response.data.success = false
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
        scanByImei,
    };
};