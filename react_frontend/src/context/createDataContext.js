// src/contexts/createDataContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

export function createDataContext(service, resourceName) {
    const Context = createContext();

    const Provider = ({ children }) => {
        const [items, setItems] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);

        const fetchAll = async (params) => {
            setLoading(true);
            setError(null);
            try {
                const res = await service.getAll(params);
                if (res.data.success) {
                    setItems(res.data.data.data || res.data.data);
                } else {
                    throw new Error(res.data.message);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const fetchOne = async (id) => {
            setLoading(true);
            setError(null);
            try {
                const res = await service.getOne(id);
                if (res.data.success) return res.data.data;
                throw new Error(res.data.message);
            } catch (err) {
                setError(err.message);
                return null;
            } finally {
                setLoading(false);
            }
        };

        const create = async (data) => {
            setLoading(true);
            try {
                const res = await service.create(data);
                if (res.data.success) {
                    await fetchAll();
                    return res.data.data;
                }
                throw new Error(res.data.message);
            } catch (err) {
                setError(err.message);
                return null;
            } finally {
                setLoading(false);
            }
        };

        const update = async (id, data) => {
            setLoading(true);
            try {
                const res = await service.update(id, data);
                if (res.data.success) {
                    await fetchAll();
                    return res.data.data;
                }
                throw new Error(res.data.message);
            } catch (err) {
                setError(err.message);
                return null;
            } finally {
                setLoading(false);
            }
        };

        const remove = async (id) => {
            setLoading(true);
            try {
                const res = await service.delete(id);
                if (res.data.success) {
                    await fetchAll();
                    return true;
                }
                throw new Error(res.data.message);
            } catch (err) {
                setError(err.message);
                return false;
            } finally {
                setLoading(false);
            }
        };

        const value = {
            items,
            loading,
            error,
            fetchAll,
            fetchOne,
            create,
            update,
            delete: remove,
        };

        return <Context.Provider value={value}>{children}</Context.Provider>;
    };

    const useResource = () => {
        const ctx = useContext(Context);
        if (!ctx) throw new Error(`use${resourceName} must be used within a ${resourceName}Provider`);
        return ctx;
    };

    return { Provider, useResource };
}