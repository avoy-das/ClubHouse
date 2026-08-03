import api from './api';

const recruitmentService = {
    listAll: async (params = {}) => (await api.get('/recruitment-notices', { params })).data,
    listForClub: async (clubId) => (await api.get(`/clubs/${clubId}/recruitment-notices`)).data,
    get: async (noticeId) => (await api.get(`/recruitment-notices/${noticeId}`)).data,
    create: async (clubId, data) => (await api.post(`/clubs/${clubId}/recruitment-notices`, data)).data,
    update: async (noticeId, data) => (await api.put(`/recruitment-notices/${noticeId}`, data)).data,
    remove: async (noticeId) => (await api.delete(`/recruitment-notices/${noticeId}`)).data,
    apply: async (noticeId, payload) => {
        if (payload instanceof FormData) {
            return (await api.post(`/recruitment-notices/${noticeId}/apply`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })).data;
        }
        return (await api.post(`/recruitment-notices/${noticeId}/apply`, { answers: payload })).data;
    },
    listApplications: async (noticeId) =>
        (await api.get(`/recruitment-notices/${noticeId}/applications`)).data,
    reviewApplication: async (applicationId, status) =>
        (await api.patch(`/recruitment-applications/${applicationId}`, { status })).data,
};

export default recruitmentService;
