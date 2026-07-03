// src/hooks/useReturns.js
import { useState, useCallback } from 'react';
import { returnsService } from 'services/returns.service';
import { showSnackbar } from 'utils/snackbar';

export const useReturns = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statistics, setStatistics] = useState(null);

    // Fetch all returns
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
            return response.data;
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to fetch returns';
            setError(errorMsg);
            showSnackbar({ type: 'error', message: errorMsg });
            setData([]);
            setTotal(0);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch single return
    const fetchReturn = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await returnsService.getReturn(id);
            if (response.data?.success) {
                return response.data.data;
            }
            throw new Error('Return not found');
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to fetch return';
            setError(errorMsg);
            showSnackbar({ type: 'error', message: errorMsg });
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Create a new return
    const createReturn = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await returnsService.createReturn(data);
            if (response.data?.success) {
                showSnackbar({
                    type: 'success',
                    message: response.data.message || 'Return created successfully'
                });
                return response.data.data;
            }
            throw new Error('Failed to create return');
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to create return';
            setError(errorMsg);
            showSnackbar({ type: 'error', message: errorMsg });
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Submit/complete a return
    const submitReturn = useCallback(async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await returnsService.submitReturn(id, data);
            if (response.data?.success) {
                showSnackbar({
                    type: 'success',
                    message: response.data.message || 'Return submitted successfully'
                });
                return response.data.data;
            }
            throw new Error('Failed to submit return');
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to submit return';
            setError(errorMsg);
            showSnackbar({ type: 'error', message: errorMsg });
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Cancel a return
    const cancelReturn = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await returnsService.cancelReturn(id);
            if (response.data?.success) {
                showSnackbar({
                    type: 'success',
                    message: response.data.message || 'Return cancelled successfully'
                });
                return response.data.data;
            }
            throw new Error('Failed to cancel return');
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to cancel return';
            setError(errorMsg);
            showSnackbar({ type: 'error', message: errorMsg });
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Validate IMEI
    const validateImei = useCallback(async (imei) => {
        try {
            const response = await returnsService.validateImei(imei);
            if (response.data?.success) {
                return response.data.data;
            }
            return { valid: false, message: 'Validation failed' };
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to validate IMEI';
            showSnackbar({ type: 'error', message: errorMsg });
            return { valid: false, message: errorMsg };
        }
    }, []);

    // Search returns
    const searchReturns = useCallback(async (query) => {
        setLoading(true);
        setError(null);
        try {
            const response = await returnsService.searchReturns(query);
            if (response.data?.success) {
                return response.data.data;
            }
            return [];
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Search failed';
            setError(errorMsg);
            showSnackbar({ type: 'error', message: errorMsg });
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch statistics
    const fetchStatistics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await returnsService.getStatistics();
            if (response.data?.success) {
                setStatistics(response.data.data);
                return response.data.data;
            }
            return null;
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to fetch statistics';
            setError(errorMsg);
            showSnackbar({ type: 'error', message: errorMsg });
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        data,
        total,
        loading,
        error,
        statistics,
        fetchReturns,
        fetchReturn,
        createReturn,
        submitReturn,
        cancelReturn,
        validateImei,
        searchReturns,
        fetchStatistics,
    };
};