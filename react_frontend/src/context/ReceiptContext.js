// src/contexts/ReceiptContext.js
import { createDataContext } from './createDataContext';
import { receiptService } from 'services/receipt.service';

const adapter = {
    getAll: (params) => receiptService.getReceipts(params),
    getOne: (id) => receiptService.getReceipt(id),
    create: null,   // receipts are created automatically on sale
    update: null,
    delete: null,
};

export const { Provider: ReceiptProvider, useResource: useReceipts } = createDataContext(adapter, 'Receipt');