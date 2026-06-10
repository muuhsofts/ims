import { createDataContext } from './createDataContext';
import { invoiceService } from 'services/invoice.service';

// Standard CRUD adapter (only view and download – no create/update/delete)
const adapter = {
    getAll: (params) => invoiceService.getInvoices(params),
    getOne: (id) => invoiceService.getInvoice(id),
    // No create, update, delete – only view & download
    create: null,
    update: null,
    delete: null,
};

const { Provider, useResource } = createDataContext(adapter, 'Invoice');

// Custom hook to include download method
export const useInvoices = () => {
    const context = useResource();

    // Helper to trigger download
    const downloadInvoice = async (id, fileName) => {
        const response = await invoiceService.downloadInvoice(id);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName || `invoice_${id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    return {
        ...context,
        downloadInvoice,
    };
};

export const InvoiceProvider = Provider;