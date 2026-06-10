// src/contexts/TransferRequestContext.js
import { createDataContext } from './createDataContext';
import { transferRequestService } from 'services/transfer-request.service';

const adapter = {
    getAll: (params) => transferRequestService.getTransferRequests(params),
    getOne: (id) => transferRequestService.getTransferRequest(id),
    create: (data) => transferRequestService.createTransferRequest(data),
    update: (id, data) => transferRequestService.updateTransferRequest(id, data),
    delete: (id) => transferRequestService.deleteTransferRequest(id),
};

export const { Provider: TransferRequestProvider, useResource: useTransferRequests } = createDataContext(adapter, 'TransferRequest');