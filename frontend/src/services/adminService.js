import api from './api';

const adminService = {
    getOverviewReports: async () => (await api.get('/admin/reports/overview')).data,
    getAuditLogs: async (page = 1) => (await api.get('/admin/audit-logs', { params: { page } })).data,
    getUsers: async () => (await api.get('/users')).data,
    getUser: async (userId) => (await api.get(`/users/${userId}`)).data,
    updateUser: async (userId, data) => (await api.put(`/users/${userId}`, data)).data,
};

export default adminService;
