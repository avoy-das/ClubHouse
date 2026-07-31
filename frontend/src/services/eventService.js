import api from './api';

const eventService = {
    // Get list of events with query filters
    getEvents: (params = {}) =>
        api.get('/events', { params }),

    // Get single event details
    getEvent: (id) =>
        api.get(`/events/${id}`),

    // Register authenticated user for an event
    registerEvent: (id) =>
        api.post(`/events/${id}/register`),

    // Cancel registration for an event
    cancelRegistration: (id) =>
        api.delete(`/events/${id}/register`),

    // Get events user is registered for
    getMyEvents: (status = 'upcoming') =>
        api.get('/events', { params: { registered: 'true', status } }),
};

export default eventService;
