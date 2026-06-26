// src/contexts/AgentContext.js
import { createDataContext } from './createDataContext';
import { agentService } from 'services/agent.service';

/**
 * Unwrap a service response.
 * If the server returned { success: false } without throwing (some axios
 * interceptor configs don't reject on 4xx), we throw here so the caller's
 * catch block always handles failures — regardless of HTTP status.
 */
const unwrap = (response) => {
    const data = response.data;

    // Backend explicitly said it failed — surface as a real error
    if (data && data.success === false) {
        const err = new Error(data.message || 'Request failed');
        err.response = response; // keep the original response accessible
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