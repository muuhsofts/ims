// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { authService } from 'services/auth.service';

const AuthContext = createContext();

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);   // ✅ new
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch permissions from backend
    const fetchPermissions = async () => {
        try {
            const res = await authService.getPermissions();
            if (res.data.success) {
                setPermissions(res.data.data);
            } else {
                console.warn('Failed to fetch permissions', res.data.message);
            }
        } catch (err) {
            console.error('Error fetching permissions', err);
        }
    };

    useEffect(() => {
        const loadStoredUser = async () => {
            const storedToken = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('user');
            if (storedToken && storedUser) {
                setToken(storedToken);
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    // Refresh user data from backend
                    const response = await api.get('/v1/auth/me');
                    if (response.data.success && response.data.data) {
                        const freshUser = response.data.data.user;
                        const freshRole = response.data.data.role;
                        setUser(freshUser);
                        setRoles(freshRole ? [freshRole.name] : []);
                        localStorage.setItem('user', JSON.stringify(freshUser));
                        // ✅ fetch permissions after user is set
                        await fetchPermissions();
                    } else {
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('user');
                        setToken(null);
                        setUser(null);
                    }
                } catch {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');
                    setToken(null);
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        loadStoredUser();
    }, []);

    const login = async (email, password) => {
        const response = await authService.login(email, password);
        if (response.data.success && response.data.data) {
            const { user, role, token } = response.data.data;
            setUser(user);
            setRoles(role ? [role.name] : []);
            setToken(token);
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));
            // ✅ fetch permissions after login
            await fetchPermissions();
            return true;
        }
        throw new Error(response.data.message || 'Login failed');
    };

    const logout = async () => {
        try {
            await api.post('/v1/auth/logout');
        } catch { /* empty */ }
        setUser(null);
        setRoles([]);
        setPermissions([]);     // ✅ clear permissions
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    };

    const updateUser = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const setAuth = (user, token, rolesArray) => {
        setUser(user);
        setToken(token);
        setRoles(rolesArray);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        // ✅ fetch permissions immediately when setAuth is called (e.g., after OTP verification)
        fetchPermissions();
    };

    const value = {
        user,
        roles,
        permissions,
        token,
        isLoading,
        login,
        logout,
        updateUser,
        setAuth,
        isAuthenticated: !!token,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};