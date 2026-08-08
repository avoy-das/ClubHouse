import api from './api';

const announcementService = {
    listAll: async () => (await api.get('/announcements')).data,
    listForClub: async (clubId) => (await api.get(`/clubs/${clubId}/announcements`)).data,
    show: async (announcementId) => (await api.get(`/announcements/${announcementId}`)).data,
    create: async (data, clubId = null) => {
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        if (clubId) {
            return (await api.post(`/clubs/${clubId}/announcements`, data, config)).data;
        }
        return (await api.post('/announcements', data, config)).data;
    },
    createGlobal: async (data) => (await api.post('/announcements', data)).data,
    getCreationContext: async () => (await api.get('/announcements/creation-context')).data,
    getClubMembers: async (clubId) => (await api.get(`/clubs/${clubId}/announcement-members`)).data,
    update: async (announcementId, data) => (await api.put(`/announcements/${announcementId}`, data)).data,
    remove: async (announcementId) => (await api.delete(`/announcements/${announcementId}`)).data,
    unpin: async (announcementId) => (await api.post(`/announcements/${announcementId}/unpin`)).data,
};

export default announcementService;
