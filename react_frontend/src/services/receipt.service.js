// src/services/receipt.service.js
import api from './api';

export const receiptService = {
    getReceipts: (params) => api.get('/v13/receipts', { params }),
    getReceipt: (id) => api.get(`/v13/receipts/${id}`),
    getReceiptBySale: (saleId) => api.get(`/v13/receipts/order/${saleId}`),
};