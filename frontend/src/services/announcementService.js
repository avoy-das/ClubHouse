import api from './api';
import { getCached, invalidateCache } from './apiCache';

const announcementService = {
    listAll: async () => (await api.get('/announcements')).data,
    listForClub: async (clubId) => (await api.get(`/clubs/${clubId}/announcements`)).data,
    show: async (announcementId) => (await api.get(`/announcements/${announcementId}`)).data,
    create: async (data, clubId = null) => {
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        let res;
        if (clubId) {
            res = (await api.post(`/clubs/${clubId}/announcements`, data, config)).data;
        } else {
            res = (await api.post('/announcements', data, config)).data;
        }
        invalidateCache('announcements:*');
        return res;
    },
    createGlobal: async (data) => {
        const res = (await api.post('/announcements', data)).data;
        invalidateCache('announcements:*');
        return res;
    },
    getCreationContext: () => getCached('announcements:creation-context', 60000, async () => (await api.get('/announcements/creation-context')).data),
    getClubMembers: async (clubId) => (await api.get(`/clubs/${clubId}/announcement-members`)).data,
    update: async (announcementId, data) => {
        const res = (await api.put(`/announcements/${announcementId}`, data)).data;
        invalidateCache('announcements:*');
        return res;
    },
    remove: async (announcementId) => {
        const res = (await api.delete(`/announcements/${announcementId}`)).data;
        invalidateCache('announcements:*');
        return res;
    },
    unpin: async (announcementId) => {
        const res = (await api.post(`/announcements/${announcementId}/unpin`)).data;
        invalidateCache('announcements:*');
        return res;
    },
};

export default announcementService;
