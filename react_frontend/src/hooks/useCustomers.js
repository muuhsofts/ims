// src/hooks/useCustomers.js
import { useState, useCallback } from 'react';
import { customerService } from 'services/customer.service';
import { showSnackbar } from 'utils/snackbar';

export const useCustomers = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Helper to map backend response (customer_id -> id)
    const mapCustomers = (customers) => (customers || []).map(c => ({
        id: c.customer_id,
        ...c
    }));

    // Fetch all customers (with optional filters)
    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await customerService.getCustomers(params);
            if (response.data?.success) {
                const mapped = mapCustomers(response.data.data.data || []);
                setData(mapped);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err);
            showSnackbar({ type: 'error', message: 'Failed to fetch customers' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    // NEW: Fetch only customers created by the logged-in user
    const fetchMyCustomers = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await customerService.getMyCustomers(params);
            if (response.data?.success) {
                const mapped = mapCustomers(response.data.data.data || []);
                setData(mapped);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err);
            showSnackbar({ type: 'error', message: 'Failed to fetch your customers' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const create = useCallback(async (formData) => {
        try {
            const response = await customerService.createCustomer(formData);
            if (!response.data?.success) throw new Error(response.data?.message);
            const created = response.data.data;
            showSnackbar({ type: 'success', message: 'Customer created successfully' });
            return { ...created, id: created.customer_id };
        } catch (err) {
            showSnackbar({ type: 'error', message: err.message || 'Failed to create customer' });
            throw err;
        }
    }, []);

    const update = useCallback(async (id, formData) => {
        try {
            const response = await customerService.updateCustomer(id, formData);
            if (!response.data?.success) throw new Error(response.data?.message);
            const updated = response.data.data;
            showSnackbar({ type: 'success', message: 'Customer updated successfully' });
            return { ...updated, id: updated.customer_id };
        } catch (err) {
            showSnackbar({ type: 'error', message: err.message || 'Failed to update customer' });
            throw err;
        }
    }, []);

    const remove = useCallback(async (id) => {
        try {
            const response = await customerService.deleteCustomer(id);
            if (!response.data?.success) throw new Error(response.data?.message);
            showSnackbar({ type: 'success', message: 'Customer deleted successfully' });
            return response.data;
        } catch (err) {
            showSnackbar({ type: 'error', message: err.message || 'Failed to delete customer' });
            throw err;
        }
    }, []);

    const restore = useCallback(async (id) => {
        try {
            const response = await customerService.restoreCustomer(id);
            if (!response.data?.success) throw new Error(response.data?.message);
            showSnackbar({ type: 'success', message: 'Customer restored successfully' });
            return response.data;
        } catch (err) {
            showSnackbar({ type: 'error', message: err.message || 'Failed to restore customer' });
            throw err;
        }
    }, []);

    return {
        data,
        total,
        loading,
        error,
        fetchData,           // all customers
        fetchMyCustomers,    // my customers (created by logged-in user)
        create,
        update,
        remove,
        restore,
    };
};