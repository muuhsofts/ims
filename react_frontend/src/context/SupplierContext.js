import { createDataContext } from './createDataContext';
import { supplierService } from 'services/supplier.service';

const adapter = {
    getAll: (params) => supplierService.getSuppliers(params),
    getOne: (id) => supplierService.getSupplier(id),
    create: (data) => supplierService.createSupplier(data),
    update: (id, data) => supplierService.updateSupplier(id, data),
    delete: (id) => supplierService.deleteSupplier(id),
};

// Extend the context with custom actions
export const {
    Provider: SupplierProvider,
    useResource: useSuppliers
} = createDataContext(adapter, 'Supplier');

// Custom hook for dropdown (recommended)
export const useSuppliersDropdown = () => {
    return {
        getDropdown: supplierService.getSuppliersDropdown,
    };
};