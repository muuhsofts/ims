// src/hooks/useCompanies.js
import { useState, useCallback } from 'react';
import { companyService } from 'services/company.service';
import { showSnackbar } from 'utils/snackbar';

export const useCompanies = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await companyService.getCompanies(params);
            if (response.data?.success) {
                setData(response.data.data.data || []);
                setTotal(response.data.data.total || 0);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "An error occurred");
            showSnackbar({ type: 'error', message: 'Failed to fetch companies' });
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDropdown = useCallback(async (params = {}) => {
        try {
            const response = await companyService.getCompaniesDropdown(params);
            if (response.data?.success) {
                return response.data.data || [];
            }
            return [];
        } catch (err) {
            console.error('Failed to fetch companies dropdown:', err);
            return [];
        }
    }, []);

    const create = useCallback(async (formData) => {
        const response = await companyService.createCompany(formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const update = useCallback(async (id, formData) => {
        const response = await companyService.updateCompany(id, formData);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const remove = useCallback(async (id) => {
        const response = await companyService.deleteCompany(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const restore = useCallback(async (id) => {
        const response = await companyService.restoreCompany(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const forceDelete = useCallback(async (id) => {
        const response = await companyService.forceDeleteCompany(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const toggleStatus = useCallback(async (id) => {
        const response = await companyService.toggleCompanyStatus(id);
        if (!response.data?.success) throw new Error(response.data?.message);
        return response.data;
    }, []);

    const getStats = useCallback(async () => {
        try {
            const response = await companyService.getCompanyStats();
            if (response.data?.success) {
                return response.data.data;
            }
            return null;
        } catch (err) {
            console.error('Failed to fetch company stats:', err);
            return null;
        }
    }, []);

    const getTrashed = useCallback(async (params = {}) => {
        try {
            const response = await companyService.getTrashedCompanies(params);
            if (response.data?.success) {
                return response.data.data;
            }
            return null;
        } catch (err) {
            console.error('Failed to fetch trashed companies:', err);
            return null;
        }
    }, []);

    return {
        data,
        total,
        loading,
        error,
        fetchData,
        fetchDropdown,
        create,
        update,
        remove,
        restore,
        forceDelete,
        toggleStatus,
        getStats,
        getTrashed,
    };
};