// src/contexts/InventoryContext.js
import { createDataContext } from './createDataContext';
import { inventoryService } from 'services/inventory.service';

const adapter = {
    getAll: (params) => inventoryService.getInventories(params),
    getOne: (id) => inventoryService.getInventory(id),
    create: (data) => inventoryService.createInventory(data),
    update: (id, data) => inventoryService.updateInventory(id, data),
    delete: (id) => inventoryService.deleteInventory(id),
};

export const { Provider: InventoryProvider, useResource: useInventories } = createDataContext(adapter, 'Inventory');