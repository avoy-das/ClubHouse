import api from './api';

const clubService = {
    // Any authenticated user
    getClubs: () =>
        api.get('/clubs'),

    getClub: (id) =>
        api.get(`/clubs/${id}`),

    createClub: (formData) =>
        api.post('/clubs', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    // Admin only
    adminGetClubs: () =>
        api.get('/admin/clubs'),

    adminApprove: (id) =>
        api.post(`/admin/clubs/${id}/approve`),

    adminReject: (id, reason) =>
        api.post(`/admin/clubs/${id}/reject`, { rejection_reason: reason }),

    adminSuspend: (id) =>
        api.post(`/admin/clubs/${id}/suspend`),

    adminUpdate: (id, formData) =>
        api.put(`/admin/clubs/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

export default clubService;