import api from './api';
import { getCached, invalidateCache } from './apiCache';

const clubService = {
    // Any authenticated user
    getClubs: () =>
        getCached('clubs:list', 60000, () => api.get('/clubs')),

    list: () =>
        getCached('clubs:list', 60000, () => api.get('/clubs')),

    getExecutiveClubs: () =>
        getCached('clubs:executive', 60000, () => api.get('/clubs/executive')),

    getClub: (id) =>
        getCached(`clubs:${id}`, 60000, () => api.get(`/clubs/${id}`)),

    createClub: async (formData) => {
        const res = await api.post('/clubs', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        invalidateCache('clubs:*');
        return res;
    },

    listMembers: (clubId, query = '') =>
        api.get(`/clubs/${clubId}/members`, { params: query ? { q: query } : {} }),

    updateClub: async (id, formData) => {
        const res = await api.post(`/clubs/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        invalidateCache('clubs:*');
        return res;
    },

    leaveClub: async (id) => {
        const res = await api.delete(`/clubs/${id}/leave`);
        invalidateCache('clubs:*');
        return res;
    },

    updateMemberRole: async (clubId, userId, role) => {
        const res = await api.patch(`/clubs/${clubId}/members/${userId}/role`, { role });
        invalidateCache('clubs:*');
        return res;
    },

    updateAdvisor: async (clubId, advisorData) => {
        const res = await api.put(`/clubs/${clubId}/advisor`, advisorData);
        invalidateCache('clubs:*');
        return res;
    },

    transferPresidency: async (clubId, targetUserId, formerRole = 'member') => {
        const res = await api.post(`/clubs/${clubId}/transfer-presidency`, { target_user_id: targetUserId, former_role: formerRole });
        invalidateCache('clubs:*');
        return res;
    },

    removeMember: async (clubId, userId) => {
        const res = await api.delete(`/clubs/${clubId}/members/${userId}`);
        invalidateCache('clubs:*');
        return res;
    },

    getClubAuditLogs: (clubId, page = 1) =>
        api.get(`/clubs/${clubId}/audit-logs`, { params: { page } }),

    // Admin only
    adminGetClubs: () =>
        getCached('clubs:admin_list', 30000, () => api.get('/admin/clubs')),

    adminApprove: async (id) => {
        const res = await api.post(`/admin/clubs/${id}/approve`);
        invalidateCache('clubs:*');
        return res;
    },

    adminReject: async (id, reason) => {
        const res = await api.post(`/admin/clubs/${id}/reject`, { rejection_reason: reason });
        invalidateCache('clubs:*');
        return res;
    },

    adminSuspend: async (id) => {
        const res = await api.post(`/admin/clubs/${id}/suspend`);
        invalidateCache('clubs:*');
        return res;
    },

    adminActivate: async (id) => {
        const res = await api.post(`/admin/clubs/${id}/activate`);
        invalidateCache('clubs:*');
        return res;
    },

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

    // Positions & Committee Management
    listPositions: (clubId) =>
        api.get(`/clubs/${clubId}/positions`),

    createPosition: (clubId, data) =>
        api.post(`/clubs/${clubId}/positions`, data),

    removePosition: (positionId) =>
        api.delete(`/positions/${positionId}`),

    assignPosition: (memberId, positionId) =>
        api.post(`/club-members/${memberId}/positions`, { position_id: positionId }),

    revokePosition: (memberId, positionId) =>
        api.delete(`/club-members/${memberId}/positions/${positionId}`),

    addCommitteeMemberByEmail: (clubId, data) =>
        api.post(`/clubs/${clubId}/committee-members`, data),
};

export default clubService;
