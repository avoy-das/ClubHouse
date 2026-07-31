import api from './api';

const eventService = {
    // Temporary fix: Backend doesn't have GET /api/events or /api/clubs/events
    listAll: async () => [],

    listForClub: async (clubId, params = {}) =>
        (await api.get(`/clubs/${clubId}/events`, { params })).data,

    get: async (eventId) =>
        (await api.get(`/events/${eventId}`)).data,

    create: async (clubId, data) =>
        (await api.post(`/clubs/${clubId}/events`, data)).data,

    update: async (eventId, data) =>
        (await api.put(`/events/${eventId}`, data)).data,

    remove: async (eventId) =>
        (await api.delete(`/events/${eventId}`)).data,

    register: async (eventId) =>
        (await api.post(`/events/${eventId}/register`)).data,

    cancelRegistration: async (eventId) =>
        (await api.delete(`/events/${eventId}/register`)).data,

    listRegistrations: async (eventId) =>
        (await api.get(`/events/${eventId}/registrations`)).data,

    markAttendance: async (eventId, registrationId, attended) =>
        (
            await api.patch(
                `/events/${eventId}/registrations/${registrationId}/attendance`,
                { attended }
            )
        ).data,

    submitFeedback: async (eventId, data) =>
        (await api.post(`/events/${eventId}/feedback`, data)).data,
};

export default eventService;