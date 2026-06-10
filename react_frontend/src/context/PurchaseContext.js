// src/contexts/PurchaseContext.js
import { createDataContext } from './createDataContext';
import { purchaseService } from 'services/purchase.service';

const adapter = {
    getAll: (params) => purchaseService.getPurchases(params),
    getOne: (id) => purchaseService.getPurchase(id),
    create: (data) => purchaseService.createPurchase(data),
    update: (id, data) => purchaseService.updatePurchase(id, data),
    delete: (id) => purchaseService.deletePurchase(id),
};

export const { Provider: PurchaseProvider, useResource: usePurchases } = createDataContext(adapter, 'Purchase');