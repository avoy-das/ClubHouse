import api from './api';
import { getCached, invalidateCache } from './apiCache';

const eventService = {
    // Get list of events with query filters (30 second TTL)
    getEvents: (params = {}) => {
        const cacheKey = `events:list:${JSON.stringify(params)}`;
        return getCached(cacheKey, 30000, () => api.get('/events', { params }));
    },

    // Get single event details (30 second TTL)
    getEvent: (id) =>
        getCached(`events:${id}`, 30000, () => api.get(`/events/${id}`)),

    // Register authenticated user for an event
    registerEvent: async (id, data) => {
        const res = await api.post(`/events/${id}/register`, data);
        invalidateCache('events:*');
        return res;
    },

    // Cancel registration for an event
    cancelRegistration: async (id) => {
        const res = await api.delete(`/events/${id}/register`);
        invalidateCache('events:*');
        return res;
    },

    // Get events user is registered for
    getMyEvents: (status = 'upcoming') =>
        api.get('/events', { params: { registered: 'true', status } }),

    // Create a new event (Exec/Admin)
    createEvent: async (data) => {
        let res;
        if (typeof FormData !== 'undefined' && data instanceof FormData) {
            res = await api.post('/events', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } else {
            res = await api.post('/events', data);
        }
        invalidateCache('events:*');
        return res;
    },

    // Update existing event details (Exec/Admin)
    updateEvent: async (id, data) => {
        let res;
        if (typeof FormData !== 'undefined' && data instanceof FormData) {
            data.append('_method', 'PUT');
            res = await api.post(`/events/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } else {
            res = await api.put(`/events/${id}`, data);
        }
        invalidateCache('events:*');
        return res;
    },

    // Update event status: draft -> published -> ongoing -> completed / cancelled (Exec/Admin)
    updateEventStatus: async (id, status) => {
        const res = await api.patch(`/events/${id}/status`, { status });
        invalidateCache('events:*');
        return res;
    },

    // Delete a draft or cancelled event (Exec/Admin)
    deleteEvent: async (id) => {
        const res = await api.delete(`/events/${id}`);
        invalidateCache('events:*');
        return res;
    },

    // Get registrations checklist for an event (Exec/Admin)
    getEventRegistrations: (id, params = {}) =>
        api.get(`/events/${id}/registrations`, { params }),

    // Mark check-in status for an attendee (Exec/Admin)
    markAttendance: (eventId, userId, attended) =>
        api.patch(`/events/${eventId}/registrations/${userId}/attendance`, { attended }),

    // Get attendance metrics summary report (Exec/Admin)
    getAttendanceReport: (eventId) =>
        api.get(`/events/${eventId}/attendance-report`),

    // Approve a pending registration (Exec/Admin)
    approveRegistration: async (eventId, userId) => {
        const res = await api.post(`/events/${eventId}/registrations/${userId}/approve`);
        invalidateCache('events:*');
        return res;
    },

    // Reject a pending registration (Exec/Admin)
    rejectRegistration: async (eventId, userId, reason = null) => {
        const res = await api.post(`/events/${eventId}/registrations/${userId}/reject`, { reason });
        invalidateCache('events:*');
        return res;
    },

    // Cancel registration for a user by executive (Exec/Admin)
    cancelAttendee: async (eventId, userId, reason = null) => {
        const res = await api.delete(`/events/${eventId}/registrations/${userId}/cancel`, {
            data: { reason },
            params: { reason },
        });
        invalidateCache('events:*');
        return res;
    },

    // Block a user from registering for an event (Exec/Admin)
    blockUser: async (eventId, userId, reason = null) => {
        const res = await api.post(`/events/${eventId}/blocks`, { user_id: userId, reason });
        invalidateCache('events:*');
        return res;
    },

    // Unblock a blocked user (Exec/Admin)
    unblockUser: async (eventId, userId) => {
        const res = await api.delete(`/events/${eventId}/blocks/${userId}`);
        invalidateCache('events:*');
        return res;
    },

    // Get list of blocked users for an event (Exec/Admin)
    getEventBlocks: (eventId) =>
        api.get(`/events/${eventId}/blocks`),

    // Get schedule of all ongoing and upcoming events for overlap/conflict checking (60 second TTL)
    getSchedule: () =>
        getCached('events:schedule', 60000, () => api.get('/events/schedule')),

    // Get feedback summary & status for an event
    getFeedbackSummary: (eventId) =>
        api.get(`/events/${eventId}/feedback/summary`),

    // Get full list of feedback entries for an event (Exec/Admin)
    getEventFeedback: (eventId) =>
        api.get(`/events/${eventId}/feedback`),

    // Submit new event feedback (Attendee)
    submitFeedback: (eventId, data) =>
        api.post(`/events/${eventId}/feedback`, data),

    // Update existing event feedback (Attendee)
    updateFeedback: (eventId, data) =>
        api.put(`/events/${eventId}/feedback`, data),

    // Delete existing event feedback (Attendee)
    deleteFeedback: (eventId) =>
        api.delete(`/events/${eventId}/feedback`),

    // Send reminder notification to registered attendees (Exec/Admin)
    sendReminder: (eventId, customMessage = '') =>
        api.post(`/events/${eventId}/send-reminder`, { message: customMessage }),
};

export default eventService;
