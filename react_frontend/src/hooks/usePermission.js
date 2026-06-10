// src/hooks/usePermission.js
import { useAuth } from 'context/AuthContext';

export const usePermission = () => {
    const { user, permissions } = useAuth();   // also get user

    const hasPermission = (permissionName) => permissions.includes(permissionName);
    const hasAnyPermission = (permList) => permList.some(hasPermission);
    const hasAllPermissions = (permList) => permList.every(hasPermission);

    return { user, permissions, hasPermission, hasAnyPermission, hasAllPermissions };
};