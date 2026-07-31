import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import eventService from '../../services/eventService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import EventForm from './EventForm';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';

const EventDetailContent = () => {
    const { clubId, eventId } = useParams();
    const { can } = useClubPermissions();

    const [eventData, setEventData] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [myRegistration, setMyRegistration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Feedback state
    const [rating, setRating] = useState(5);
    const [comments, setComments] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    const loadEvent = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await eventService.get(eventId);
            const data = res.data || res;
            setEventData(data);
            setMyRegistration(data.my_registration || null);

            // Fetch registration counts / list
            try {
                const regRes = await eventService.listRegistrations(eventId);
                const regList = regRes.data || regRes || [];
                setRegistrations(regList);
            } catch {
                // Ignore failure to fetch all registrations if normal user
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load event details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId) loadEvent();
    }, [eventId]);

    const handleRegister = async () => {
        setActionLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await eventService.register(eventId);
            setSuccess('Successfully registered for event!');
            loadEvent();
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelRegistration = async () => {
        setActionLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await eventService.cancelRegistration(eventId);
            setSuccess('Registration cancelled.');
            loadEvent();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to cancel registration.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await eventService.submitFeedback(eventId, { rating, comments });
            setSuccess('Thank you! Your feedback has been submitted.');
            setFeedbackSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit feedback.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!eventData) return <ErrorBanner message={error || 'Event not found'} />;

    const registeredCount = registrations.filter((r) => r.status === 'registered').length;
    const isFull = eventData.capacity ? registeredCount >= eventData.capacity : false;
    const isPastDeadline = eventData.registration_deadline
        ? new Date() > new Date(eventData.registration_deadline)
        : false;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                Event Details
                            </span>
                            {eventData.status && <Badge status={eventData.status} />}
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900">{eventData.title}</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Link to={`/clubs/${eventData.club_id || clubId}/events`}>
                            <Button variant="secondary">← Back to Events</Button>
                        </Link>
                        {can('can_manage_events') && (
                            <Button variant="primary" onClick={() => setIsEditOpen(true)}>
                                Edit Event
                            </Button>
                        )}
                        {can('can_track_attendance') && (
                            <Link to={`/clubs/${eventData.club_id || clubId}/events/${eventId}/attendance`}>
                                <Button variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                                    Track Attendance
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {error && <ErrorBanner message={error} />}
                {success && <SuccessBanner message={success} />}

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="font-bold text-gray-800 text-lg">About this Event</h3>
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{eventData.description}</p>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg border space-y-4 text-sm">
                        <h4 className="font-bold text-gray-800 border-b pb-2">Event Details</h4>
                        <div>
                            <span className="text-gray-500 block">Venue:</span>
                            <span className="font-medium text-gray-900">{eventData.venue || 'To Be Announced'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Date & Time:</span>
                            <span className="font-medium text-gray-900">
                                {new Date(eventData.start_at).toLocaleString()}
                                {eventData.end_at && ` - ${new Date(eventData.end_at).toLocaleTimeString()}`}
                            </span>
                        </div>
                        {eventData.registration_deadline && (
                            <div>
                                <span className="text-gray-500 block">Registration Deadline:</span>
                                <span className="font-medium text-gray-900">
                                    {new Date(eventData.registration_deadline).toLocaleString()}
                                </span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-500 block">Capacity & Spots:</span>
                            <span className="font-medium text-gray-900">
                                {eventData.capacity
                                    ? `${registeredCount} / ${eventData.capacity} spots filled`
                                    : 'Unlimited spots'}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 border-t">
                            {myRegistration && myRegistration.status === 'registered' ? (
                                <div className="space-y-3">
                                    <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-xs font-semibold text-center">
                                        ✓ You are registered for this event
                                    </div>
                                    <Button
                                        variant="danger"
                                        className="w-full"
                                        disabled={actionLoading}
                                        onClick={handleCancelRegistration}
                                    >
                                        {actionLoading ? 'Cancelling...' : 'Cancel Registration'}
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="primary"
                                    className="w-full"
                                    disabled={actionLoading || isFull || isPastDeadline || eventData.status !== 'published'}
                                    onClick={handleRegister}
                                >
                                    {actionLoading
                                        ? 'Registering...'
                                        : isFull
                                        ? 'Event Capacity Full'
                                        : isPastDeadline
                                        ? 'Registration Closed'
                                        : 'Register Now'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Event Feedback Section */}
                {myRegistration && myRegistration.attended && !feedbackSubmitted && (
                    <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mt-6">
                        <h3 className="font-bold text-gray-800 text-lg mb-2">Leave Feedback for this Event</h3>
                        <p className="text-xs text-gray-600 mb-4">
                            You attended this event! Please share your rating and thoughts.
                        </p>
                        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Rating (1 to 5 Stars)</label>
                                <select
                                    className="border rounded px-3 py-2 text-sm bg-white outline-none"
                                    value={rating}
                                    onChange={(e) => setRating(parseInt(e.target.value, 10))}
                                >
                                    <option value={5}>⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                                    <option value={4}>⭐⭐⭐⭐ (4 - Good)</option>
                                    <option value={3}>⭐⭐⭐ (3 - Average)</option>
                                    <option value={2}>⭐⭐ (2 - Poor)</option>
                                    <option value={1}>⭐ (1 - Terrible)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Comments</label>
                                <textarea
                                    rows={3}
                                    className="w-full border rounded px-3 py-2 text-sm bg-white outline-none"
                                    placeholder="Write your feedback..."
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                />
                            </div>
                            <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                                Submit Feedback
                            </Button>
                        </form>
                    </div>
                )}
            </div>

            {/* Edit Event Modal */}
            {isEditOpen && (
                <EventForm
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    clubId={eventData.club_id}
                    eventItem={eventData}
                    onSuccess={loadEvent}
                />
            )}
        </div>
    );
};

const EventDetail = () => {
    const { clubId } = useParams();
    if (clubId) {
        return (
            <ClubPermissionsProvider clubId={clubId}>
                <EventDetailContent />
            </ClubPermissionsProvider>
        );
    }
    return <EventDetailContent />;
};

export default EventDetail;
