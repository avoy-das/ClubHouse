import api from './api';
import { getCached, invalidateCache } from './apiCache';

const recruitmentService = {
    listAll: (params = {}) =>
        getCached(`recruitment:list:${JSON.stringify(params)}`, 30000, async () => {
            const res = await api.get('/recruitment-notices', { params });
            return res.data || res;
        }),

    listForClub: (clubId) =>
        getCached(`recruitment:club:${clubId}`, 30000, async () => {
            const res = await api.get(`/clubs/${clubId}/recruitment-notices`);
            return res.data || res;
        }),

    get: (noticeId) =>
        getCached(`recruitment:${noticeId}`, 30000, async () => {
            const res = await api.get(`/recruitment-notices/${noticeId}`);
            return res.data || res;
        }),

    create: async (clubId, data) => {
        const res = await api.post(`/clubs/${clubId}/recruitment-notices`, data);
        invalidateCache('recruitment:*');
        return res.data || res;
    },

    update: async (noticeId, data) => {
        const res = await api.put(`/recruitment-notices/${noticeId}`, data);
        invalidateCache('recruitment:*');
        return res.data || res;
    },

    remove: async (noticeId) => {
        const res = await api.delete(`/recruitment-notices/${noticeId}`);
        invalidateCache('recruitment:*');
        return res.data || res;
    },

    apply: async (noticeId, payload) => {
        let res;
        if (payload instanceof FormData) {
            res = await api.post(`/recruitment-notices/${noticeId}/apply`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } else {
            res = await api.post(`/recruitment-notices/${noticeId}/apply`, { answers: payload });
        }
        invalidateCache('recruitment:*');
        return res.data || res;
    },

    listApplications: async (noticeId) => {
        const res = await api.get(`/recruitment-notices/${noticeId}/applications`);
        return res.data || res;
    },

    reviewApplication: async (applicationId, status) => {
        const res = await api.patch(`/recruitment-applications/${applicationId}`, { status });
        invalidateCache('recruitment:*');
        return res.data || res;
    },
};

export default recruitmentService;
