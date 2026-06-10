// src/contexts/RoleContext.js
import { createDataContext } from './createDataContext';
import { roleService } from 'services/role.service';

const adapter = {
    getAll: () => roleService.getRoles(),
    getOne: (id) => roleService.getRole(id),
    create: (data) => roleService.createRole(data),
    update: (id, data) => roleService.updateRole(id, data),
    delete: (id) => roleService.deleteRole(id),
};

export const { Provider: RoleProvider, useResource: useRoles } = createDataContext(adapter, 'Role');