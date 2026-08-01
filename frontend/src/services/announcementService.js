import api from './api';

const announcementService = {
    listAll: async () => (await api.get('/announcements')).data,
    listForClub: async (clubId) => (await api.get(`/clubs/${clubId}/announcements`)).data,
    create: async (clubId, data) => (await api.post(`/clubs/${clubId}/announcements`, data)).data,
    update: async (announcementId, data) => (await api.put(`/announcements/${announcementId}`, data)).data,
    remove: async (announcementId) => (await api.delete(`/announcements/${announcementId}`)).data,
};

export default announcementService;
