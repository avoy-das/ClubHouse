import api from './api';

const notificationService = {
    list: async (page = 1) => (await api.get('/notifications', { params: { page } })).data,
    getNotifications: async (page = 1) => (await api.get('/notifications', { params: { page } })).data,
    markRead: async (notificationId) => (await api.patch(`/notifications/${notificationId}/read`)).data,
    markAllRead: async () => (await api.post('/notifications/mark-all-read')).data,
    getUnreadCount: async () => (await api.get('/notifications/unread-count')).data,
};

export default notificationService;
