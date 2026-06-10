import api from './api';

export const invoiceService = {
    // View invoices (with pagination/filtering)
    getInvoices: (params) => api.get('/v14/invoices', { params }),
    // View single invoice details
    getInvoice: (id) => api.get(`/v14/invoices/${id}`),
    // Download invoice PDF (returns blob)
    downloadInvoice: (id) => api.get(`/v14/invoices/download/${id}`, { responseType: 'blob' }),
    // Get invoice by sale ID
    getInvoiceBySale: (saleId) => api.get(`/v14/invoices/sale/${saleId}`),
};