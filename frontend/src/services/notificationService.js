import api from './api';
import { getCached, invalidateCache } from './apiCache';

const notificationService = {
    list: async (page = 1) => (await api.get('/notifications', { params: { page } })).data,
    getNotifications: async (page = 1) => (await api.get('/notifications', { params: { page } })).data,
    markRead: async (notificationId) => {
        const data = (await api.patch(`/notifications/${notificationId}/read`)).data;
        invalidateCache('notifications:*');
        return data;
    },
    markAllRead: async () => {
        const data = (await api.post('/notifications/mark-all-read')).data;
        invalidateCache('notifications:*');
        return data;
    },
    getUnreadCount: async () => {
        const res = await getCached('notifications:unread_count', 30000, () => api.get('/notifications/unread-count'));
        return res.data;
    },
};

export default notificationService;
