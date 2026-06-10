// src/contexts/ReportContext.js
import React, { createContext, useContext, useState } from 'react';
import { reportService } from 'services/report.service';

const ReportContext = createContext();

export const ReportProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStockDaily = async (date) => {
        setLoading(true);
        try {
            const res = await reportService.stockDaily(date);
            if (res.data.success) return res.data.data;
            throw new Error(res.data.message);
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // similarly for other report methods...
    // For brevity, we expose only one example. You can add all report methods.

    const value = { loading, error, fetchStockDaily };
    return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
};

export const useReports = () => {
    const ctx = useContext(ReportContext);
    if (!ctx) throw new Error('useReports must be used within ReportProvider');
    return ctx;
};