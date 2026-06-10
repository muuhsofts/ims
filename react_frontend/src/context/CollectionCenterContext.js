// src/contexts/CCInventoryContext.js
import { createDataContext } from './createDataContext';
import { ccInventoryService } from 'services/collection-center-inventory.service';

const adapter = {
    getAll: (params) => ccInventoryService.getInventories(params),
    getOne: (id) => ccInventoryService.getInventory(id),
    create: (data) => ccInventoryService.createInventory(data),
    update: (id, data) => ccInventoryService.updateInventory(id, data),
    delete: (id) => ccInventoryService.deleteInventory(id),
};

export const { Provider: CcInventoryProvider, useResource: useCcInventories } = createDataContext(adapter, 'CcInventory');