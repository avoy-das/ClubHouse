import api from './api';

const clubService = {
    // Any authenticated user
    getClubs: () =>
        api.get('/clubs'),

    getExecutiveClubs: () =>
        api.get('/clubs/executive'),

    getClub: (id) =>
        api.get(`/clubs/${id}`),

    createClub: (formData) =>
        api.post('/clubs', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    listMembers: (clubId, query = '') =>
        api.get(`/clubs/${clubId}/members`, { params: query ? { q: query } : {} }),

    updateClub: (id, formData) =>
        api.post(`/clubs/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    leaveClub: (id) =>
        api.delete(`/clubs/${id}/leave`),

    updateMemberRole: (clubId, userId, role) =>
        api.patch(`/clubs/${clubId}/members/${userId}/role`, { role }),

    removeMember: (clubId, userId) =>
        api.delete(`/clubs/${clubId}/members/${userId}`),

    getClubAuditLogs: (clubId, page = 1) =>
        api.get(`/clubs/${clubId}/audit-logs`, { params: { page } }),

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

    // Club Edit Requests
    submitEditRequest: (clubId, formData) =>
        api.post(`/clubs/${clubId}/edit-requests`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    getPendingEditRequest: (clubId) =>
        api.get(`/clubs/${clubId}/edit-requests/pending`),

    adminGetEditRequests: () =>
        api.get('/admin/club-edit-requests'),

    adminApproveEditRequest: (requestId) =>
        api.post(`/admin/club-edit-requests/${requestId}/approve`),

    adminRejectEditRequest: (requestId, reason) =>
        api.post(`/admin/club-edit-requests/${requestId}/reject`, { rejection_reason: reason }),
};

export default clubService;
