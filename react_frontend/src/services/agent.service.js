// src/services/agent.service.js
import api from './api';

export const agentService = {
    // Active agents (main CRUD)
    getAgents: (params) => api.get('/v16/agents', { params }),
    getAgent: (id) => api.get(`/v16/agents/${id}`),
    createAgent: (data) => api.post('/v16/agents', data),
    updateAgent: (id, data) => api.put(`/v16/agents/${id}`, data),
    deleteAgent: (id) => api.delete(`/v16/agents/${id}`),

    // Status actions
    activateAgent: (id) => api.patch(`/v16/agents/${id}/activate`),
    deactivateAgent: (id) => api.patch(`/v16/agents/${id}/deactivate`),
    suspendAgent: (id) => api.patch(`/v16/agents/${id}/suspend`),

    // 🔐 Verification methods
    verifyAgentOTP: (data) => api.post('/v1/auth/verify-otp', data),
    resendAgentVerification: (agentId) => api.post(`/v16/agents/${agentId}/resend-verification`),
    getAgentVerificationStatus: (agentId) => api.get(`/v16/agents/${agentId}/verification-status`),

    // Soft‑delete endpoints
    getTrashedAgents: (params) => api.get('/v16/agents/trashed', { params }),
    restoreAgent: (id) => api.patch(`/v16/agents/${id}/restore`),
    forceDeleteAgent: (id) => api.delete(`/v16/agents/${id}/force`),

    // Stats
    getAgentStats: () => api.get('/v16/agents/stats'),
};