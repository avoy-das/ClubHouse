import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import eventService from '../../services/eventService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import EventForm from './EventForm';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';
import { ArrowLeft, Edit, ClipboardList, CheckCircle, Calendar } from 'lucide-react';

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
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xs border border-slate-200 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <span className="text-xs uppercase font-semibold tracking-wider px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#2563eb] border border-blue-200/60">
                                Event Details
                            </span>
                            {eventData.status && <Badge status={eventData.status} />}
                        </div>
                        <h1 className="text-3xl font-extrabold text-[#0b1c30]">{eventData.title}</h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Link to={`/clubs/${eventData.club_id || clubId}/events`}>
                            <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5">
                                <ArrowLeft className="w-4 h-4" /> Back to Events
                            </button>
                        </Link>
                        {can('can_manage_events') && (
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="px-3.5 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                            >
                                <Edit className="w-4 h-4" /> Edit Event
                            </button>
                        )}
                        {can('can_track_attendance') && (
                            <Link to={`/clubs/${eventData.club_id || clubId}/events/${eventId}/attendance`}>
                                <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] border border-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
                                    <ClipboardList className="w-4 h-4 text-blue-600" /> Track Attendance
                                </button>
                            </Link>
                        )}
                    </div>
                </div>

                {error && <ErrorBanner message={error} />}
                {success && <SuccessBanner message={success} />}

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="font-bold text-[#0b1c30] text-lg">About this Event</h3>
                        <p className="text-slate-600 whitespace-pre-line leading-relaxed text-sm">{eventData.description}</p>
                    </div>

                    <div className="bg-[#f8f9ff] p-6 rounded-xl border border-slate-200/80 space-y-4 text-sm">
                        <h4 className="font-bold text-[#0b1c30] border-b border-slate-200 pb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" /> Event Details
                        </h4>
                        <div>
                            <span className="text-slate-400 text-xs uppercase tracking-wide block font-medium">Venue</span>
                            <span className="font-semibold text-[#0b1c30]">{eventData.venue || 'To Be Announced'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 text-xs uppercase tracking-wide block font-medium">Date & Time</span>
                            <span className="font-semibold text-[#0b1c30]">
                                {(eventData.starts_at || eventData.start_at) ? new Date(eventData.starts_at || eventData.start_at).toLocaleString() : 'TBA'}
                                {(eventData.ends_at || eventData.end_at) && ` - ${new Date(eventData.ends_at || eventData.end_at).toLocaleTimeString()}`}
                            </span>
                        </div>
                        {eventData.registration_deadline && (
                            <div>
                                <span className="text-slate-400 text-xs uppercase tracking-wide block font-medium">Registration Deadline</span>
                                <span className="font-semibold text-[#0b1c30]">
                                    {new Date(eventData.registration_deadline).toLocaleString()}
                                </span>
                            </div>
                        )}
                        <div>
                            <span className="text-slate-400 text-xs uppercase tracking-wide block font-medium">Capacity & Spots</span>
                            <span className="font-semibold text-[#0b1c30]">
                                {eventData.capacity
                                    ? `${registeredCount} / ${eventData.capacity} spots filled`
                                    : 'Unlimited spots'}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-slate-200">
                            {myRegistration && myRegistration.status === 'registered' ? (
                                <div className="space-y-3">
                                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                                        <CheckCircle className="w-4 h-4 text-emerald-600" /> You are registered for this event
                                    </div>
                                    <button
                                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs border border-rose-200 transition-colors disabled:opacity-50"
                                        disabled={actionLoading}
                                        onClick={handleCancelRegistration}
                                    >
                                        {actionLoading ? 'Cancelling...' : 'Cancel Registration'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="w-full py-3 bg-[#2563eb] hover:bg-[#0051d5] text-white font-semibold rounded-xl text-xs shadow-xs transition-colors disabled:opacity-50"
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
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Event Feedback Section */}
                {myRegistration && myRegistration.attended && !feedbackSubmitted && (
                    <div className="bg-[#eff4ff] border border-blue-200 p-6 rounded-2xl mt-6">
                        <h3 className="font-bold text-[#0b1c30] text-lg mb-1">Leave Feedback for this Event</h3>
                        <p className="text-xs text-slate-600 mb-4">
                            You attended this event! Please share your rating and thoughts.
                        </p>
                        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Rating</label>
                                <select
                                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-[#2563eb]"
                                    value={rating}
                                    onChange={(e) => setRating(parseInt(e.target.value, 10))}
                                >
                                    <option value={5}>Rating: 5 / 5 — Excellent</option>
                                    <option value={4}>Rating: 4 / 5 — Good</option>
                                    <option value={3}>Rating: 3 / 5 — Average</option>
                                    <option value={2}>Rating: 2 / 5 — Poor</option>
                                    <option value={1}>Rating: 1 / 5 — Terrible</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Comments</label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-[#2563eb]"
                                    placeholder="Write your feedback..."
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="px-4 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-50"
                            >
                                Submit Feedback
                            </button>
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
