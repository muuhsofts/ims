// src/hooks/useCollectionCenters.js
import { useState, useCallback } from 'react';
import { collectionCenterService } from 'services/collection-center.service';
import { showSnackbar } from 'utils/snackbar';

export const useCollectionCenters = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await collectionCenterService.getCenters(params);
            if (response.data?.success) {
                // ✅ Correct extraction for your API: response.data.data.data
                setData(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err);
            showSnackbar({ type: 'error', message: 'Failed to fetch collection centers' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const create = useCallback(async (formData) => {
        const response = await collectionCenterService.createCenter(formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const update = useCallback(async (id, formData) => {
        const response = await collectionCenterService.updateCenter(id, formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const remove = useCallback(async (id) => {
        const response = await collectionCenterService.deleteCenter(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const restore = useCallback(async (id) => {
        const response = await collectionCenterService.restoreCenter(id);
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
    };
};