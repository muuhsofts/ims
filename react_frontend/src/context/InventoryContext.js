// src/contexts/InventoryContext.js
import { createDataContext } from './createDataContext';
import { inventoryService } from 'services/inventory.service';

const adapter = {
    getAll: (params) => inventoryService.getInventories(params),
    getOne: (id) => inventoryService.getInventory(id),
    create: (data) => inventoryService.createInventory(data),
    update: (id, data) => inventoryService.updateInventory(id, data),
    delete: (id) => inventoryService.deleteInventory(id),
    // Add these if needed
    getSummary: (params) => inventoryService.getInventorySummary(params),
    getStatistics: (params) => inventoryService.getInventoryStatistics(params),
    getProducts: (id) => inventoryService.getInventoryProducts(id),
    addProducts: (id, data) => inventoryService.addProductsToInventory(id, data),
    removeProducts: (id, data) => inventoryService.removeProductsFromInventory(id, data),
};

export const { Provider: InventoryProvider, useResource: useInventories } = createDataContext(adapter, 'Inventory');