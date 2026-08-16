import api from './api';
import { getCached, invalidateCache, clearAllCache } from './apiCache';

const authService = {
    register: async (data) => {
        const response = await api.post('/register', data);
        return response.data;
    },

    login: async (data) => {
        const response = await api.post('/login', data);
        localStorage.setItem('token', response.data.token);
        clearAllCache();
        return response.data;
    },

    logout: async () => {
        try {
            await api.post('/logout');
        } catch {
            // Ignore token expiration errors during logout cleanup
        } finally {
            localStorage.removeItem('token');
            clearAllCache();
        }
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

    forgotPassword: async (email) => {
        const response = await api.post('/forgot-password', { email });
        return response.data;
    },

    resetPassword: async (data) => {
        const response = await api.post('/reset-password', data);
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