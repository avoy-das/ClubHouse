import api from './api';

const clubService = {
    list: async (params = {}) => (await api.get('/clubs', { params })).data,
    get: async (clubId) => (await api.get(`/clubs/${clubId}`)).data,
    create: async (data) => (await api.post('/clubs', data)).data,
    update: async (clubId, data) => (await api.put(`/clubs/${clubId}`, data)).data,
    remove: async (clubId) => (await api.delete(`/clubs/${clubId}`)).data,
    approve: async (clubId) => (await api.post(`/clubs/${clubId}/approve`)).data,
    suspend: async (clubId) => (await api.post(`/clubs/${clubId}/suspend`)).data,

    listPositions: async (clubId) => (await api.get(`/clubs/${clubId}/positions`)).data,
    createPosition: async (clubId, data) => (await api.post(`/clubs/${clubId}/positions`, data)).data,
    updatePosition: async (positionId, data) => (await api.put(`/positions/${positionId}`, data)).data,
    removePosition: async (positionId) => (await api.delete(`/positions/${positionId}`)).data,

    listMembers: async (clubId) => (await api.get(`/clubs/${clubId}/members`)).data,
    removeMember: async (clubId, memberId) => (await api.delete(`/clubs/${clubId}/members/${memberId}`)).data,
    assignPosition: async (memberId, positionId) =>
        (await api.post(`/club-members/${memberId}/positions`, { position_id: positionId })).data,
    revokePosition: async (memberId, positionId) =>
        (await api.delete(`/club-members/${memberId}/positions/${positionId}`)).data,

    listGalleries: async (clubId) => (await api.get(`/clubs/${clubId}/galleries`)).data,
    addGallery: async (clubId, data) => (await api.post(`/clubs/${clubId}/galleries`, data)).data,
    removeGallery: async (galleryId) => (await api.delete(`/galleries/${galleryId}`)).data,
};

export default clubService;
