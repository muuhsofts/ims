import { useState, useCallback } from 'react';
import { transferRequestService } from 'services/transfer-request.service';
import { showSnackbar } from 'utils/snackbar';

export const useTransferRequests = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const response = await transferRequestService.getRequests(params);
            if (response.data.success) {
                setData(response.data.data.data);
                setTotal(response.data.data.total);
            } else {
                throw new Error(response.data.message || 'Failed to fetch requests');
            }
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "An error occurred");
            showSnackbar({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    const create = useCallback(async (payload) => {
        const response = await transferRequestService.createRequest(payload);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    }, []);

    const approve = useCallback(async (id) => {
        const response = await transferRequestService.approveRequest(id);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    }, []);

    const reject = useCallback(async (id) => {
        const response = await transferRequestService.rejectRequest(id);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    }, []);

    const processTransfer = useCallback(async (id, productIds) => {
        const response = await transferRequestService.processTransfer(id, productIds);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    }, []);

    const scanReceipt = useCallback(async (id, imei) => {
        const response = await transferRequestService.scanReceipt(id, imei);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    }, []);

    const confirmReceived = useCallback(async (id) => {
        const response = await transferRequestService.confirmReceipt(id);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    }, []);

    const remove = useCallback(async (id) => {
        const response = await transferRequestService.deleteRequest(id);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    }, []);

    const getAvailableProducts = useCallback(async (id) => {
        const response = await transferRequestService.getAvailableProducts(id);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    }, []);

    return {
        data,
        total,
        loading,
        error,
        fetchData,
        create,
        approve,
        reject,
        processTransfer,
        scanReceipt,
        confirmReceived,
        remove,
        getAvailableProducts,
    };
};