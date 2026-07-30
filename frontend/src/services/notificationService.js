import api from './api';

const notificationService = {
    list: async () => (await api.get('/notifications')).data,
    markRead: async (notificationId) => (await api.patch(`/notifications/${notificationId}/read`)).data,
};

export default notificationService;
