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

    // Create a new event (Exec/Admin)
    createEvent: (data) =>
        api.post('/events', data),

    // Update existing event details (Exec/Admin)
    updateEvent: (id, data) =>
        api.put(`/events/${id}`, data),

    // Update event status: draft -> published -> ongoing -> completed / cancelled (Exec/Admin)
    updateEventStatus: (id, status) =>
        api.patch(`/events/${id}/status`, { status }),

    // Delete a draft or cancelled event (Exec/Admin)
    deleteEvent: (id) =>
        api.delete(`/events/${id}`),

    // Get registrations checklist for an event (Exec/Admin)
    getEventRegistrations: (id, params = {}) =>
        api.get(`/events/${id}/registrations`, { params }),

    // Mark check-in status for an attendee (Exec/Admin)
    markAttendance: (eventId, userId, attended) =>
        api.patch(`/events/${eventId}/registrations/${userId}/attendance`, { attended }),

    // Get attendance metrics summary report (Exec/Admin)
    getAttendanceReport: (eventId) =>
        api.get(`/events/${eventId}/attendance-report`),

    // Get schedule of all ongoing and upcoming events for overlap/conflict checking
    getSchedule: () =>
        api.get('/events/schedule'),
};

export default eventService;
