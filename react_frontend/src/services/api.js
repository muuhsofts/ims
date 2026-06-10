import axios from 'axios';
import config from '../config';

const api = axios.create({
    baseURL: config.baseURLApi,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const { config, response } = error;
        const isAuthRequest = config?.url?.includes('/auth/') &&
            !config?.url?.includes('/auth/logout') &&
            !config?.url?.includes('/auth/me');

        if (response?.status === 401 && !isAuthRequest) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;