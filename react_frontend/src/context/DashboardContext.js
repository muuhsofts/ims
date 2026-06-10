// src/contexts/DashboardContext.js
import React, { createContext, useContext, useState } from 'react';
import { dashboardService } from 'services/dashboardService';

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMainStats = async () => {
        setLoading(true);
        try {
            const res = await dashboardService.mainStats();
            if (res.data.success) return res.data.data;
            throw new Error(res.data.message);
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Similarly add other dashboard methods

    const value = { loading, error, fetchMainStats };
    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
    const ctx = useContext(DashboardContext);
    if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
    return ctx;
};