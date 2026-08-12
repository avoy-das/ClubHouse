import api from './api';
import { getCached, invalidateCache } from './apiCache';

const authService = {
    register: async (data) => {
        const response = await api.post('/register', data);
        return response.data;
    },

    login: async (data) => {
        const response = await api.post('/login', data);
        localStorage.setItem('token', response.data.token);
        invalidateCache('auth:*');
        return response.data;
    },

    logout: async () => {
        await api.post('/logout');
        localStorage.removeItem('token');
        invalidateCache('auth:*');
    },

    me: () =>
        getCached('auth:me', 15000, async () => {
            const response = await api.get('/me');
            return response.data;
        }),

    updateProfile: async (data) => {
        const response = await api.put('/me', data);
        invalidateCache('auth:*');
        return response.data;
    },

    changePassword: async (data) => {
        const response = await api.post('/me/change-password', data);
        return response.data;
    },

    getMyMemberships: () =>
        getCached('auth:memberships', 30000, async () => {
            const response = await api.get('/me/memberships');
            return response.data;
        }),

    getToken: () => localStorage.getItem('token'),

    isLoggedIn: () => !!localStorage.getItem('token'),
};

export default authService;