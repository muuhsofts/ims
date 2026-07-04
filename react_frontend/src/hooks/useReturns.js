// src/hooks/useReturns.js
import { useState, useCallback } from 'react';
import { returnsService } from 'services/returns.service';
import { showSnackbar } from 'utils/snackbar';

export const useReturns = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [statistics, setStatistics] = useState(null);
    const [error, setError] = useState(null);

    const fetchReturns = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await returnsService.getReturns(params);
            if (response.data?.success) {
                setData(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "Failed to fetch returns");
            showSnackbar({ type: 'error', message: 'Failed to fetch returns' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStatistics = useCallback(async () => {
        try {
            const response = await returnsService.getStatistics();
            if (response.data?.success) {
                setStatistics(response.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch statistics:', err);
        }
    }, []);

    const createReturn = useCallback(async (formData) => {
        const response = await returnsService.createReturn(formData);
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to create return');
        }
        showSnackbar({ type: 'success', message: 'Return created successfully' });
        return response.data;
    }, []);

    const approveReturn = useCallback(async (id, data) => {
        const response = await returnsService.approveReturn(id, data);
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to approve return');
        }
        showSnackbar({ type: 'success', message: 'Return approved successfully' });
        return response.data;
    }, []);

    const cancelReturn = useCallback(async (id) => {
        const response = await returnsService.cancelReturn(id);
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to cancel return');
        }
        showSnackbar({ type: 'success', message: 'Return cancelled successfully' });
        return response.data;
    }, []);

    const validateImei = useCallback(async (imei) => {
        const response = await returnsService.validateImei(imei);
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'IMEI validation failed');
        }
        return response.data.data;
    }, []);

    return {
        data,
        total,
        loading,
        error,
        statistics,
        fetchReturns,
        fetchStatistics,
        createReturn,
        approveReturn,
        cancelReturn,
        validateImei,
    };
};