// src/contexts/AgentContext.js
import { createDataContext } from './createDataContext';
import { agentService } from 'services/agent.service';

const unwrap = (response) => {
    const data = response.data;
    if (data && data.success === false) {
        const err = new Error(data.message || 'Request failed');
        err.response = response;
        throw err;
    }
    return data?.data ?? data;
};

const adapter = {
    getAll: (params) => agentService.getAgents(params),
    getOne: (id) => agentService.getAgent(id),
    create: async (data) => {
        const response = await agentService.createAgent(data);
        return unwrap(response);
    },
    update: async (id, data) => {
        const response = await agentService.updateAgent(id, data);
        return unwrap(response);
    },
    delete: async (id) => {
        const response = await agentService.deleteAgent(id);
        return unwrap(response);
    },
};

export const { Provider: AgentProvider, useResource: useAgents } = createDataContext(adapter, 'Agent');