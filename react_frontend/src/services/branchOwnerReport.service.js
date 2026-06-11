import api from './api';

export const reportService = {
    getBranchStockReport: (from_date, to_date, stock_status = null) => {
        const params = { from_date, to_date };
        if (stock_status) params.stock_status = stock_status;
        return api.get('/v14/reports/branch/stock', { params });
    },

    getBranchAgentStockReport: (from_date, to_date, agent_id = null, stock_status = null) => {
        const params = { from_date, to_date };
        if (agent_id) params.agent_id = agent_id;
        if (stock_status) params.stock_status = stock_status;
        return api.get('/v14/reports/branch/agent-stock', { params });
    },

    getBranchAgentProductsReport: (agent_id, from_date, to_date, stock_status = null) => {
        const params = { agent_id, from_date, to_date };
        if (stock_status) params.stock_status = stock_status;
        return api.get('/v14/reports/branch/agent-products', { params });
    },
};