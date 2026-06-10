// src/contexts/PermissionContext.js
import { createDataContext } from './createDataContext';
import { permissionService } from 'services/permission.service';

const adapter = {
    getAll: () => permissionService.getPermissions(),
    getOne: (id) => permissionService.getPermission(id),
    create: (data) => permissionService.createPermission(data),
    update: (id, data) => permissionService.updatePermission(id, data),
    delete: (id) => permissionService.deletePermission(id),
};

export const { Provider: PermissionProvider, useResource: usePermissions } = createDataContext(adapter, 'Permission');