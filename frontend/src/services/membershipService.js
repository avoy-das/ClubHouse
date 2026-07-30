import api from './api';

const membershipService = {
    request: async (clubId, message = '') =>
        (await api.post(`/clubs/${clubId}/membership-requests`, { message })).data,
    listForClub: async (clubId) =>
        (await api.get(`/clubs/${clubId}/membership-requests`)).data,
    review: async (requestId, status) =>
        (await api.patch(`/membership-requests/${requestId}`, { status })).data,
};

export default membershipService;
