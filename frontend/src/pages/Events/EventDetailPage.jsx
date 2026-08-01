import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import eventService from '../../services/eventService';
import EventModal from '../../components/Events/EventModal';
import MarkAttendanceModal from '../../components/Events/MarkAttendanceModal';
import AttendanceReportModal from '../../components/Events/AttendanceReportModal';

const statusBadgeStyles = {
    upcoming: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ongoing: 'bg-amber-100 text-amber-800 border-amber-200',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
    published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    draft: 'bg-purple-100 text-purple-700 border-purple-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

const EventDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [canManage, setCanManage] = useState(false);
    const [spotsRemaining, setSpotsRemaining] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [notFound, setNotFound] = useState(false);

    // Executive management modal states
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(null);

        eventService.getEvent(id)
            .then(res => {
                const data = res.data;
                setEvent(data.event);
                setIsRegistered(data.is_registered || false);
                setCanManage(data.can_manage || false);
                setSpotsRemaining(data.spots_remaining);
            })
            .catch(err => {
                if (err.response?.status === 404) {
                    setNotFound(true);
                    setToast({
                        type: 'error',
                        message: 'The event is no longer available.',
                    });
                    setTimeout(() => {
                        navigate('/events');
                    }, 3000);
                } else {
                    setError(err.response?.data?.message || 'Failed to load event details.');
                }
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    const handleRegister = async () => {
        setSubmitting(true);
        setToast(null);

        try {
            const res = await eventService.registerEvent(id);
            setIsRegistered(true);
            setEvent(prev => ({
                ...prev,
                registrations_count: (prev.registrations_count || 0) + 1,
            }));
            if (res.data.spots_remaining !== undefined) {
                setSpotsRemaining(res.data.spots_remaining);
            }
            setToast({
                type: 'success',
                message: res.data.message || 'Successfully registered for this event!',
            });
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to register for event.';
            setToast({
                type: 'error',
                message: msg,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async () => {
        setSubmitting(true);
        setToast(null);

        try {
            const res = await eventService.cancelRegistration(id);
            setIsRegistered(false);
            setEvent(prev => ({
                ...prev,
                registrations_count: Math.max(0, (prev.registrations_count || 0) - 1),
            }));
            if (res.data.spots_remaining !== undefined) {
                setSpotsRemaining(res.data.spots_remaining);
            }
            setToast({
                type: 'success',
                message: res.data.message || 'Registration successfully cancelled.',
            });
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to cancel registration.';
            setToast({
                type: 'error',
                message: msg,
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Executive Action Handlers
    const handleStatusTransition = async (newStatus) => {
        if (!window.confirm(`Are you sure you want to change status to '${newStatus}'?`)) return;
        setSubmitting(true);
        try {
            const res = await eventService.updateEventStatus(id, newStatus);
            setEvent(res.data.event);
            setToast({
                type: 'success',
                message: res.data.message || `Event status updated to ${newStatus}.`,
            });
        } catch (err) {
            setToast({
                type: 'error',
                message: err.response?.data?.message || 'Failed to update event status.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!window.confirm('Are you sure you want to permanently delete this event? This action cannot be undone.')) return;
        setSubmitting(true);
        try {
            await eventService.deleteEvent(id);
            setToast({
                type: 'success',
                message: 'Event deleted successfully.',
            });
            setTimeout(() => {
                navigate('/events');
            }, 1500);
        } catch (err) {
            setToast({
                type: 'error',
                message: err.response?.data?.message || 'Failed to delete event.',
            });
            setSubmitting(false);
        }
    };

    const handleEventUpdated = (updatedEvent, message) => {
        setEvent(updatedEvent);
        setToast({
            type: 'success',
            message: message || 'Event updated successfully.',
        });
    };

    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex justify-center py-20">
                    <p className="text-slate-400 text-sm animate-pulse">Loading event details...</p>
                </div>
            </MainLayout>
        );
    }

    if (notFound) {
        return (
            <MainLayout>
                <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl text-center">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                        !
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Event Not Available</h2>
                    <p className="text-slate-600 text-sm mb-6">
                        The event you are looking for does not exist or has been removed. You will be redirected to the events list shortly.
                    </p>
                    <button
                        onClick={() => navigate('/events')}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                        Back to Events
                    </button>
                </div>
            </MainLayout>
        );
    }

    if (error || !event) {
        return (
            <MainLayout>
                <div className="max-w-2xl mx-auto my-8 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error || 'Event could not be found.'}
                    <div className="mt-4">
                        <Link to="/events" className="text-red-800 font-semibold underline">
                            &larr; Return to Events
                        </Link>
                    </div>
                </div>
            </MainLayout>
        );
    }

    // Determine state variables
    const isCompletedOrPast = event.status === 'completed' || event.status === 'cancelled' || (event.ends_at && new Date(event.ends_at) < new Date());
    const isFull = event.capacity !== null && event.registrations_count >= event.capacity;
    const formattedStatus = event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Published';

    return (
        <MainLayout>
            {/* Back link */}
            <div className="mb-6 flex items-center justify-between">
                <Link to="/events" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
                    &larr; Back to Events
                </Link>
            </div>

            {/* Notification Toast Banner */}
            {toast && (
                <div
                    className={`mb-6 p-4 rounded-xl text-sm border flex items-center justify-between ${
                        toast.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                >
                    <span>{toast.message}</span>
                    <button
                        onClick={() => setToast(null)}
                        className="text-xs font-bold ml-4 opacity-60 hover:opacity-100"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Executive Control Panel Toolbar (Visible only if canManage is true) */}
            {canManage && (
                <div className="mb-6 bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-900 text-white rounded-2xl p-5 shadow-sm border border-purple-800/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                                Club Executive Control Suite
                            </span>
                            <h3 className="text-lg font-bold text-white mt-0.5">
                                Event Management Toolbar
                            </h3>
                        </div>

                        {/* Control Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Edit Event */}
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/15 flex items-center gap-1.5"
                            >
                                ✏️ Edit Event
                            </button>

                            {/* Mark Attendance */}
                            <button
                                onClick={() => setIsAttendanceOpen(true)}
                                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                            >
                                📋 Check-in Roster
                            </button>

                            {/* Attendance Report */}
                            <button
                                onClick={() => setIsReportOpen(true)}
                                className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                            >
                                📊 Attendance Report
                            </button>

                            {/* Status Transitions */}
                            {event.status === 'draft' && (
                                <button
                                    onClick={() => handleStatusTransition('published')}
                                    disabled={submitting}
                                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                                >
                                    🚀 Publish Event
                                </button>
                            )}

                            {event.status === 'published' && (
                                <button
                                    onClick={() => handleStatusTransition('ongoing')}
                                    disabled={submitting}
                                    className="px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                                >
                                    ▶️ Mark Ongoing
                                </button>
                            )}

                            {event.status === 'ongoing' && (
                                <button
                                    onClick={() => handleStatusTransition('completed')}
                                    disabled={submitting}
                                    className="px-3.5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                                >
                                    🏁 Mark Completed
                                </button>
                            )}

                            {['draft', 'published', 'ongoing'].includes(event.status) && (
                                <button
                                    onClick={() => handleStatusTransition('cancelled')}
                                    disabled={submitting}
                                    className="px-3.5 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold transition-colors border border-rose-500/30"
                                >
                                    🚫 Cancel Event
                                </button>
                            )}

                            {/* Delete Event (only draft or cancelled) */}
                            {['draft', 'cancelled'].includes(event.status) && (
                                <button
                                    onClick={handleDeleteEvent}
                                    disabled={submitting}
                                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                                >
                                    🗑️ Delete Event
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Event Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    {/* Club link */}
                    <Link
                        to={`/clubs/${event.club_id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                    >
                        <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {event.club?.name || 'Hosting Club'}
                    </Link>

                    <div className="flex items-center gap-2">
                        {canManage && (
                            <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 text-purple-700 border border-purple-200 rounded-full">
                                Executive Access
                            </span>
                        )}
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusBadgeStyles[event.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {formattedStatus}
                        </span>
                    </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
                    {event.title}
                </h1>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl mb-6 text-sm">
                    {/* Date & Time */}
                    <div>
                        <span className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Date & Time</span>
                        <div className="text-slate-800 font-semibold">{formatDate(event.starts_at)}</div>
                        {event.ends_at && (
                            <div className="text-xs text-slate-500 mt-0.5">Until {formatDate(event.ends_at)}</div>
                        )}
                    </div>

                    {/* Location */}
                    <div>
                        <span className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Location</span>
                        <div className="text-slate-800 font-semibold capitalize">{event.location_type || 'Physical'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{event.location_value || 'Venue info not specified'}</div>
                    </div>

                    {/* Capacity & Registrations */}
                    <div>
                        <span className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Capacity</span>
                        <div className="text-slate-800 font-semibold">
                            {event.capacity !== null ? (
                                <span>{event.registrations_count} / {event.capacity} registered</span>
                            ) : (
                                <span>{event.registrations_count} registered (Unlimited capacity)</span>
                            )}
                        </div>
                        {event.capacity !== null && spotsRemaining !== null && (
                            <div className="text-xs text-slate-500 mt-0.5">
                                {spotsRemaining > 0 ? `${spotsRemaining} spots available` : 'No spots remaining'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                <div className="prose prose-slate max-w-none mb-8">
                    <h3 className="text-base font-bold text-slate-900 mb-2">About This Event</h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                        {event.description || 'No detailed description provided for this event.'}
                    </p>
                </div>

                {/* Action / Participation Button Section */}
                <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-slate-500">
                        {isRegistered ? (
                            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                You are registered for this event
                            </span>
                        ) : (
                            <span>
                                {isCompletedOrPast
                                    ? 'Registration has closed.'
                                    : isFull
                                    ? 'Capacity limit reached.'
                                    : 'Registration is open for all authenticated members.'}
                            </span>
                        )}
                    </div>

                    <div>
                        {/* Button State Logic */}
                        {isCompletedOrPast ? (
                            <button
                                disabled
                                className="w-full sm:w-auto px-6 py-3 bg-slate-200 text-slate-500 font-medium rounded-xl text-sm cursor-not-allowed border border-slate-300"
                            >
                                This event has ended
                            </button>
                        ) : isRegistered ? (
                            <button
                                onClick={handleCancel}
                                disabled={submitting}
                                className="w-full sm:w-auto px-6 py-3 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold rounded-xl text-sm border border-rose-200 transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Cancelling...' : 'Cancel Registration'}
                            </button>
                        ) : isFull ? (
                            <button
                                disabled
                                className="w-full sm:w-auto px-6 py-3 bg-slate-200 text-slate-500 font-medium rounded-xl text-sm cursor-not-allowed border border-slate-300"
                            >
                                Fully Booked
                            </button>
                        ) : (
                            <button
                                onClick={handleRegister}
                                disabled={submitting}
                                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Processing...' : 'Register for Event'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <EventModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                eventToEdit={event}
                onSuccess={handleEventUpdated}
            />

            <MarkAttendanceModal
                isOpen={isAttendanceOpen}
                onClose={() => setIsAttendanceOpen(false)}
                event={event}
            />

            <AttendanceReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                event={event}
            />
        </MainLayout>
    );
};

export default EventDetailPage;

