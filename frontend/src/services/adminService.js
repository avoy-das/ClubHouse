import api from './api';

const adminService = {
    getOverviewReports: async () => (await api.get('/admin/reports/overview')).data,
    getClubReport: async (clubId) => (await api.get(`/admin/reports/clubs/${clubId}`)).data,
    getAuditLogs: async (params = {}) => {
        const queryParams = typeof params === 'number' ? { page: params } : params;
        return (await api.get('/admin/audit-logs', { params: queryParams })).data;
    },
    getUsers: async () => (await api.get('/users')).data,
    getUser: async (userId) => (await api.get(`/users/${userId}`)).data,
    updateUser: async (userId, data) => (await api.put(`/users/${userId}`, data)).data,
    deleteUser: async (userId) => (await api.delete(`/users/${userId}`)).data,
    deleteClub: async (clubId) => (await api.delete(`/admin/clubs/${clubId}`)).data,
};

export default adminService;
