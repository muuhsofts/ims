// src/contexts/WarehouseContext.js
import { createDataContext } from './createDataContext';
import { warehouseService } from 'services/warehouse.service';

const adapter = {
    getAll: (params) => warehouseService.getWarehouses(params),
    getOne: (id) => warehouseService.getWarehouse(id),
    create: (data) => warehouseService.createWarehouse(data),
    update: (id, data) => warehouseService.updateWarehouse(id, data),
    delete: (id) => warehouseService.deleteWarehouse(id),
};

export const { Provider: WarehouseProvider, useResource: useWarehouses } = createDataContext(adapter, 'Warehouse');