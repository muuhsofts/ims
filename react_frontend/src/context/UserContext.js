// src/contexts/UserContext.js
import { createDataContext } from './createDataContext';
import { userService } from 'services/user.service';

const adapter = {
  getAll: (params) => userService.getUsers(params),
  getOne: (id) => userService.getUser(id),
  create: (data) => userService.createUser(data),
  update: (id, data) => userService.updateUser(id, data),
  delete: (id) => userService.deleteUser(id),
  getDropdown: (params) => userService.getUsersDropdown(params),
};

export const { Provider: UserProvider, useResource: useUsers } = createDataContext(adapter, 'User');