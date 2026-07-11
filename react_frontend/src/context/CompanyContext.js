// src/contexts/CompanyContext.js
import { createDataContext } from './createDataContext';
import { companyService } from 'services/company.service';

const adapter = {
    getAll: (params) => companyService.getCompanies(params),
    getOne: (id) => companyService.getCompany(id),
    create: (data) => companyService.createCompany(data),
    update: (id, data) => companyService.updateCompany(id, data),
    delete: (id) => companyService.deleteCompany(id),
};

export const { Provider: CompanyProvider, useResource: useCompanies } = createDataContext(adapter, 'Company');