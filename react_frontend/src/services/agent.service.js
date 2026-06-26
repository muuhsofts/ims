// src/services/agent.service.js
import api from './api';

export const agentService = {
    // ----- Active agents (main CRUD) -----
    getAgents: (params) => api.get('/v16/agents', { params }),
    getAgent: (id) => api.get(`/v16/agents/${id}`),
    createAgent: (data) => api.post('/v16/agents', data),
    updateAgent: (id, data) => api.put(`/v16/agents/${id}`, data),
    deleteAgent: (id) => api.delete(`/v16/agents/${id}`),

    // ----- Status actions -----
    activateAgent: (id) => api.patch(`/v16/agents/${id}/activate`),
    deactivateAgent: (id) => api.patch(`/v16/agents/${id}/deactivate`),
    suspendAgent: (id) => api.patch(`/v16/agents/${id}/suspend`),

    // ----- Soft‑delete endpoints (keep for admin restore, but not used in main list) -----
    getTrashedAgents: (params) => api.get('/v16/agents/trashed', { params }),
    restoreAgent: (id) => api.patch(`/v16/agents/${id}/restore`),
    forceDeleteAgent: (id) => api.delete(`/v16/agents/${id}/force`),

    // ----- Stats (optional) -----
    getAgentStats: () => api.get('/v16/agents/stats'),
};