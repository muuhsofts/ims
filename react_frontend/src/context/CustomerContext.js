import { createDataContext } from './createDataContext';
import { customerService } from 'services/customer.service';

const adapter = {
    getAll: (params) => customerService.getCustomers(params),
    getOne: (id) => customerService.getCustomer(id),
    create: (data) => customerService.createCustomer(data),
    update: (id, data) => customerService.updateCustomer(id, data),
    delete: (id) => customerService.deleteCustomer(id),
    getMyCustomers: (params) => customerService.getMyCustomers(params),
};

const { Provider, useResource } = createDataContext(adapter, 'Customer');

// Custom hook to explicitly include the custom method
export const useCustomers = () => {
    const context = useResource();
    return {
        ...context,
        getMyCustomers: adapter.getMyCustomers,
    };
};

export const CustomerProvider = Provider;