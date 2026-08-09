import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';
import eventService from '../../services/eventService';
import { Calendar, AlertTriangle } from 'lucide-react';
import { formatForDatetimeLocal, datetimeLocalToISO, formatDisplayDateTime } from '../../utils/dateUtils';

const EventForm = ({ isOpen, onClose, clubId, eventItem = null, onSuccess }) => {
    const [title, setTitle] = useState(eventItem?.title || '');
    const [description, setDescription] = useState(eventItem?.description || '');
    const [venue, setVenue] = useState(eventItem?.venue || '');
    const [capacity, setCapacity] = useState(eventItem?.capacity || '');
    const [startAt, setStartAt] = useState(formatForDatetimeLocal(eventItem?.starts_at || eventItem?.start_at));
    const [endAt, setEndAt] = useState(formatForDatetimeLocal(eventItem?.ends_at || eventItem?.end_at));
    const [registrationDeadline, setRegistrationDeadline] = useState(
        formatForDatetimeLocal(eventItem?.registration_deadline)
    );
    const [status, setStatus] = useState(eventItem?.status || 'draft');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Schedule state for conflict checking
    const [showSchedule, setShowSchedule] = useState(false);
    const [scheduleEvents, setScheduleEvents] = useState([]);
    const [loadingSchedule, setLoadingSchedule] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const formattedStart = datetimeLocalToISO(startAt);
            const formattedEnd = datetimeLocalToISO(endAt);
            const formattedDeadline = datetimeLocalToISO(registrationDeadline);

            const payload = {
                club_id: clubId,
                title,
                description,
                venue,
                capacity: capacity ? parseInt(capacity, 10) : null,
                starts_at: formattedStart,
                ends_at: formattedEnd,
                start_at: formattedStart,
                end_at: formattedEnd,
                registration_deadline: formattedDeadline,
                status,
            };

            if (eventItem?.id) {
                await eventService.updateEvent(eventItem.id, payload);
            } else {
                await eventService.createEvent(payload);
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            let msg = err.response?.data?.message || 'Failed to save event.';
            if (err.response?.data?.errors) {
                const firstErr = Object.values(err.response.data.errors).flat()[0];
                if (firstErr) msg = firstErr;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={eventItem ? 'Edit Event' : 'Create New Event'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <ErrorBanner message={error} />}

                <div>
                    <label className="block text-sm font-medium mb-1">Event Title</label>
                    <input
                        type="text"
                        required
                        className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Venue / Platform</label>
                    <input
                        type="text"
                        placeholder="Auditorium A / Zoom link"
                        className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Max Capacity (Optional)</label>
                        <input
                            type="number"
                            min="1"
                            placeholder="Unlimited if empty"
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Start Date & Time</label>
                        <input
                            type="datetime-local"
                            required
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={startAt}
                            onChange={(e) => setStartAt(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">End Date & Time</label>
                        <input
                            type="datetime-local"
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={endAt}
                            onChange={(e) => setEndAt(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Registration Deadline</label>
                    <input
                        type="datetime-local"
                        className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={registrationDeadline}
                        onChange={(e) => setRegistrationDeadline(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        rows={4}
                        required
                        className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* Read-Only Schedule & Overlap Checker */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={() => {
                            const nextState = !showSchedule;
                            setShowSchedule(nextState);
                            if (nextState && scheduleEvents.length === 0) {
                                setLoadingSchedule(true);
                                eventService.getSchedule()
                                    .then(res => setScheduleEvents(res.data || []))
                                    .catch(() => {})
                                    .finally(() => setLoadingSchedule(false));
                            }
                        }}
                        className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            {showSchedule ? 'Hide Scheduled Events' : '📋 View Scheduled Events (Conflict Check)'}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">{showSchedule ? '▲' : '▼'}</span>
                    </button>

                    {showSchedule && (
                        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-bold text-slate-800">
                                <span>Ongoing & Upcoming Events ({scheduleEvents.length})</span>
                                <span className="text-[10px] text-slate-500 font-normal">Read-only Schedule</span>
                            </div>

                            {loadingSchedule ? (
                                <div className="py-4 text-center text-slate-400 animate-pulse">Loading schedule...</div>
                            ) : scheduleEvents.length === 0 ? (
                                <div className="py-3 text-center text-slate-400">No upcoming or ongoing events scheduled.</div>
                            ) : (
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                    {scheduleEvents.map(evt => {
                                        const curStart = startAt ? new Date(startAt).getTime() : null;
                                        const curEnd = endAt ? new Date(endAt).getTime() : null;
                                        const evtStart = new Date(evt.starts_at).getTime();
                                        const evtEnd = new Date(evt.ends_at).getTime();
                                        const isSelf = eventItem && eventItem.id === evt.id;

                                        const isOverlapping = !isSelf && curStart && curEnd && evtStart < curEnd && evtEnd > curStart;

                                        return (
                                            <div
                                                key={evt.id}
                                                className={`p-2.5 rounded-lg border text-xs transition-colors ${
                                                    isOverlapping
                                                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                                                        : 'bg-white border-slate-200 text-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <span className="font-bold text-[#0b1c30]">{evt.title}</span>
                                                    {isOverlapping && (
                                                        <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-semibold text-[10px] shrink-0 flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3 text-amber-700" /> Overlap
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                                    <span><strong>Club:</strong> {evt.club?.name || 'Club #' + evt.club_id}</span>
                                                    <span><strong>Venue:</strong> {evt.location_value || evt.venue || 'TBA'}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    <strong>Time:</strong> {formatDisplayDateTime(evt.starts_at)} – {formatDisplayDateTime(evt.ends_at)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Saving...' : eventItem ? 'Update Event' : 'Create Event'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default EventForm;
