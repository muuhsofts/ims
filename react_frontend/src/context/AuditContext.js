// src/contexts/AuditContext.js
import { createDataContext } from './createDataContext';
import { auditService } from 'services/audit.service';

const adapter = {
    getAll: (params) => auditService.getAuditTrails(params),
    getOne: null,  // no single audit endpoint
    create: null,
    update: null,
    delete: null,
};

export const { Provider: AuditProvider, useResource: useAudits } = createDataContext(adapter, 'Audit');