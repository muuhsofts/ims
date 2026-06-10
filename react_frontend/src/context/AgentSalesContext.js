// src/contexts/AgentSalesContext.js
import { createDataContext } from './createDataContext';
import { agentSalesService } from 'services/agent-sales.service';

const adapter = {
    getAll: (params) => agentSalesService.getMySales(params),
    getOne: (id) => agentSalesService.getSale(id),
    create: (data) => agentSalesService.sellProduct(data),
    update: null,  // not supported
    delete: null,  // not supported
};

export const { Provider: AgentSalesProvider, useResource: useAgentSales } = createDataContext(adapter, 'AgentSale');