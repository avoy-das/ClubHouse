import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import eventService from '../../services/eventService';
import EventModal from '../../components/Events/EventModal';
import MarkAttendanceModal from '../../components/Events/MarkAttendanceModal';
import AttendanceReportModal from '../../components/Events/AttendanceReportModal';
import { Edit, ClipboardList, BarChart2, Rocket, Play, CheckSquare, Ban, Trash2, ArrowLeft, Building2, CheckCircle } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';

const statusBadgeStyles = {
    upcoming: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    ongoing: 'bg-[#ffdf9a]/40 text-[#5a4300] border-[#eab308]/40',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
    published: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    draft: 'bg-[#eff4ff] text-[#0051d5] border-[#316bf3]/30',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
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

    // Registration custom fields modal state
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [customTextAnswers, setCustomTextAnswers] = useState({});
    const [customFileAnswers, setCustomFileAnswers] = useState({});

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

    const handleRegisterClick = () => {
        if (Array.isArray(event?.custom_fields) && event.custom_fields.length > 0) {
            setCustomTextAnswers({});
            setCustomFileAnswers({});
            setIsRegisterModalOpen(true);
        } else {
            handleRegisterSubmit();
        }
    };

    const handleRegisterSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        setToast(null);

        try {
            let payload;
            const hasFiles = Object.keys(customFileAnswers).length > 0;
            if (hasFiles) {
                payload = new FormData();
                Object.entries(customTextAnswers).forEach(([key, val]) => {
                    payload.append(`answers[custom_text][${key}]`, val);
                });
                Object.entries(customFileAnswers).forEach(([key, file]) => {
                    payload.append(`answers_files[${key}]`, file);
                });
            } else if (Object.keys(customTextAnswers).length > 0) {
                payload = {
                    answers: {
                        custom_text: customTextAnswers,
                    }
                };
            }

            const res = await eventService.registerEvent(id, payload);
            setIsRegistered(true);
            setIsRegisterModalOpen(false);
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
                <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                        !
                    </div>
                    <h2 className="text-xl font-bold text-[#0b1c30] mb-2">Event Not Available</h2>
                    <p className="text-slate-600 text-sm mb-6">
                        The event you are looking for does not exist or has been removed. You will be redirected to the events list shortly.
                    </p>
                    <button
                        onClick={() => navigate('/events')}
                        className="px-4 py-2 bg-[#0f172a] text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
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
                        <Link to="/events" className="text-red-800 font-semibold underline flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> Return to Events
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
                <Link to="/events" className="text-sm font-medium text-slate-500 hover:text-[#0b1c30] flex items-center gap-1.5 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Events
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
                <div className="mb-6 bg-[#0f172a] text-white rounded-2xl p-5 shadow-xs border border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#eab308]">
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
                                <Edit className="w-4 h-4" /> Edit Event
                            </button>

                            {/* Mark Attendance */}
                            <button
                                onClick={() => setIsAttendanceOpen(true)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                            >
                                <ClipboardList className="w-4 h-4" /> Check-in Roster
                            </button>

                            {/* Attendance Report */}
                            <button
                                onClick={() => setIsReportOpen(true)}
                                className="px-3.5 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                            >
                                <BarChart2 className="w-4 h-4" /> Attendance Report
                            </button>

                            {/* Status Transitions */}
                            {event.status === 'draft' && (
                                <button
                                    onClick={() => handleStatusTransition('published')}
                                    disabled={submitting}
                                    className="px-3.5 py-2 bg-[#eab308] text-slate-900 font-bold hover:bg-amber-400 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1"
                                >
                                    <Rocket className="w-4 h-4" /> Publish Event
                                </button>
                            )}

                            {event.status === 'published' && (
                                <button
                                    onClick={() => handleStatusTransition('ongoing')}
                                    disabled={submitting}
                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1"
                                >
                                    <Play className="w-4 h-4" /> Mark Ongoing
                                </button>
                            )}

                            {event.status === 'ongoing' && (
                                <button
                                    onClick={() => handleStatusTransition('completed')}
                                    disabled={submitting}
                                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1"
                                >
                                    <CheckSquare className="w-4 h-4" /> Mark Completed
                                </button>
                            )}

                            {['draft', 'published', 'ongoing'].includes(event.status) && (
                                <button
                                    onClick={() => handleStatusTransition('cancelled')}
                                    disabled={submitting}
                                    className="px-3.5 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold transition-colors border border-rose-500/30 flex items-center gap-1"
                                >
                                    <Ban className="w-4 h-4" /> Cancel Event
                                </button>
                            )}

                            {/* Delete Event (only draft or cancelled) */}
                            {['draft', 'cancelled'].includes(event.status) && (
                                <button
                                    onClick={handleDeleteEvent}
                                    disabled={submitting}
                                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Event
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Event Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs overflow-hidden">
                {getImageUrl(event.banner_url || event.banner_path) && (
                    <div className="mb-6 h-56 sm:h-72 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 overflow-hidden bg-slate-100 border-b border-slate-200">
                        <img
                            src={getImageUrl(event.banner_url || event.banner_path)}
                            alt={event.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    {/* Club link */}
                    <Link
                        to={`/clubs/${event.club_id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] bg-[#eff4ff] px-3 py-1.5 rounded-lg border border-blue-200/60 hover:bg-blue-100 transition-colors"
                    >
                        <Building2 className="w-4 h-4 text-[#2563eb]" />
                        {event.club?.name || 'Hosting Club'}
                    </Link>

                    <div className="flex items-center gap-2">
                        {canManage && (
                            <span className="text-xs font-semibold px-2.5 py-1 bg-[#ffdf9a]/40 text-[#5a4300] border border-[#eab308]/40 rounded-full">
                                Executive Access
                            </span>
                        )}
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusBadgeStyles[event.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {formattedStatus}
                        </span>
                    </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight mb-4">
                    {event.title}
                </h1>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-[#f8f9ff] border border-slate-200/80 rounded-xl mb-6 text-sm">
                    {/* Date & Time */}
                    <div>
                        <span className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Date & Time</span>
                        <div className="text-[#0b1c30] font-semibold">{formatDate(event.starts_at)}</div>
                        {event.ends_at && (
                            <div className="text-xs text-slate-500 mt-0.5">Until {formatDate(event.ends_at)}</div>
                        )}
                    </div>

                    {/* Location */}
                    <div>
                        <span className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Location</span>
                        <div className="text-[#0b1c30] font-semibold capitalize">{event.location_type || 'Physical'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{event.location_value || 'Venue info not specified'}</div>
                    </div>

                    {/* Capacity & Registrations */}
                    <div>
                        <span className="block text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Capacity</span>
                        <div className="text-[#0b1c30] font-semibold">
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
                    <h3 className="text-base font-bold text-[#0b1c30] mb-2">About This Event</h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                        {event.description || 'No detailed description provided for this event.'}
                    </p>
                </div>

                {/* Action / Participation Button Section */}
                <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-slate-500">
                        {isRegistered ? (
                            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
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
                                className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-400 font-medium rounded-xl text-sm cursor-not-allowed border border-slate-200"
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
                                className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-400 font-medium rounded-xl text-sm cursor-not-allowed border border-slate-200"
                            >
                                Fully Booked
                            </button>
                        ) : (
                            <button
                                onClick={handleRegisterClick}
                                disabled={submitting}
                                className="w-full sm:w-auto px-6 py-3 bg-[#2563eb] hover:bg-[#0051d5] text-white font-semibold rounded-xl text-sm shadow-xs transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Processing...' : 'Register for Event'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Event Registration Custom Questions Modal */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="text-base font-bold text-[#0b1c30]">Event Registration Form</h3>
                                <p className="text-xs text-slate-500">Please answer the following required custom questions for this event.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleRegisterSubmit} className="space-y-4">
                            {(Array.isArray(event?.custom_fields) ? event.custom_fields : []).map((field, idx) => {
                                const fieldKey = field.label || `Field ${idx + 1}`;
                                return (
                                    <div key={field.id || idx} className="space-y-1">
                                        <label className="block text-xs font-semibold text-[#0b1c30]">
                                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                                        </label>

                                        {field.type === 'textarea' ? (
                                            <textarea
                                                rows={3}
                                                required={Boolean(field.required)}
                                                value={customTextAnswers[fieldKey] || ''}
                                                onChange={(e) => setCustomTextAnswers(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-blue-500"
                                                placeholder="Enter your response..."
                                            />
                                        ) : field.type === 'select' ? (
                                            <select
                                                required={Boolean(field.required)}
                                                value={customTextAnswers[fieldKey] || ''}
                                                onChange={(e) => setCustomTextAnswers(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-blue-500 bg-white"
                                            >
                                                <option value="">-- Select Option --</option>
                                                {(Array.isArray(field.options) ? field.options : (field.options || '').split(',')).map((opt, oIdx) => {
                                                    const val = typeof opt === 'string' ? opt.trim() : opt;
                                                    return <option key={oIdx} value={val}>{val}</option>;
                                                })}
                                            </select>
                                        ) : field.type === 'file' ? (
                                            <input
                                                type="file"
                                                required={Boolean(field.required)}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setCustomFileAnswers(prev => ({ ...prev, [fieldKey]: e.target.files[0] }));
                                                    }
                                                }}
                                                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                            />
                                        ) : field.type === 'checkbox' ? (
                                            <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer pt-1">
                                                <input
                                                    type="checkbox"
                                                    required={Boolean(field.required)}
                                                    checked={customTextAnswers[fieldKey] === 'Yes'}
                                                    onChange={(e) => setCustomTextAnswers(prev => ({ ...prev, [fieldKey]: e.target.checked ? 'Yes' : 'No' }))}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>I confirm / agree</span>
                                            </label>
                                        ) : (
                                            <input
                                                type="text"
                                                required={Boolean(field.required)}
                                                value={customTextAnswers[fieldKey] || ''}
                                                onChange={(e) => setCustomTextAnswers(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-blue-500"
                                                placeholder="Enter response..."
                                            />
                                        )}
                                    </div>
                                );
                            })}

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRegisterModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting Registration...' : 'Complete Registration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

