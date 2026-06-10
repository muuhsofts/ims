// src/services/report.service.js
import api from './api';

export const reportService = {
    // Stock Reports
    getStockReport: (warehouse_id, cc_id) =>
        api.get('/v14/reports/stock', { params: { warehouse_id, cc_id } }),

    // Purchases Reports
    getPurchasesReport: (from_date, to_date, status = 'completed', supplier_id = null, category_id = null) => {
        const params = { from_date, to_date };
        if (status && status !== 'all') params.status = status;
        if (supplier_id) params.supplier_id = supplier_id;
        if (category_id) params.category_id = category_id;
        return api.get('/v14/reports/purchases', { params });
    },

    // Sales Reports
    getSalesReport: (from_date, to_date, group_by = 'agent') =>
        api.get('/v14/reports/sales', { params: { from_date, to_date, group_by } }),
};