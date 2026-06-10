// src/contexts/StockMovementContext.js
import { createDataContext } from './createDataContext';
import { stockMovementService } from 'services/stock-movement.service';

const adapter = {
    getAll: (params) => stockMovementService.getMovements(params),
    getOne: (id) => stockMovementService.getMovement(id),
    create: (data) => stockMovementService.createMovement(data),
    update: (id, data) => stockMovementService.updateMovement(id, data),
    delete: (id) => stockMovementService.deleteMovement(id),
};

export const { Provider: StockMovementProvider, useResource: useStockMovements } = createDataContext(adapter, 'StockMovement');

