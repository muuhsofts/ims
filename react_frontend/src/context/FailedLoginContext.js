// src/contexts/FailedLoginContext.js
import { createDataContext } from './createDataContext';
import { failedLoginService } from 'services/failed-login.service';

const adapter = {
    getAll: (params) => failedLoginService.getFailedLogins(params),
    getOne: null,
    create: null,
    update: null,
    delete: null,
};

export const { Provider: FailedLoginProvider, useResource: useFailedLogins } = createDataContext(adapter, 'FailedLogin');