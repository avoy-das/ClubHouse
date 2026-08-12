import { useState, useEffect } from 'react';
import eventService from '../../services/eventService';
import clubService from '../../services/clubService';
import { AlertTriangle, Calendar, Image as ImageIcon, Plus, Trash2, CalendarSearch } from 'lucide-react';
import { formatForDatetimeLocal, datetimeLocalToISO, formatDisplayDateTime } from '../../utils/dateUtils';
import { getImageUrl } from '../../utils/imageUrl';
import compressImage from '../../utils/imageCompressor';

const EventModal = ({ isOpen, onClose, onSuccess, eventToEdit = null, defaultClubId = '', isLockedClub = false }) => {
    const isEdit = Boolean(eventToEdit);

    const [clubs, setClubs] = useState([]);
    const [fetchingClubs, setFetchingClubs] = useState(false);
    const [noExecutiveClubs, setNoExecutiveClubs] = useState(false);
    const [customFields, setCustomFields] = useState([]);
    const [formData, setFormData] = useState({
        club_id: defaultClubId || '',
        title: '',
        description: '',
        visibility: 'public',
        location_type: 'physical',
        location_value: '',
        capacity: 50,
        starts_at: '',
        ends_at: '',
        feedback_policy: 'attended_only',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null);

    const [bannerFile, setBannerFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState(null);

    // Schedule state for conflict checking
    const [showSchedule, setShowSchedule] = useState(false);
    const [scheduleEvents, setScheduleEvents] = useState([]);
    const [loadingSchedule, setLoadingSchedule] = useState(false);

    const addCustomField = () => {
        setCustomFields(prev => [
            ...prev,
            { id: `field_${Date.now()}`, label: '', type: 'text', required: false, options: [] }
        ]);
    };

    const updateCustomField = (index, key, value) => {
        setCustomFields(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [key]: value };
            return updated;
        });
    };

    const removeCustomField = (index) => {
        setCustomFields(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setWarning(null);
            setNoExecutiveClubs(false);
            setBannerFile(null);

            if (!isEdit) {
                setFetchingClubs(true);
                clubService.getExecutiveClubs()
                    .then(res => {
                        const fetchedClubs = res.data || [];
                        setClubs(fetchedClubs);

                        if (fetchedClubs.length === 0 && !defaultClubId) {
                            setNoExecutiveClubs(true);
                        }

                        // Auto-select if only 1 executive club and no default selected
                        if (!defaultClubId && fetchedClubs.length === 1) {
                            setFormData(prev => ({ ...prev, club_id: String(fetchedClubs[0].id) }));
                        }
                    })
                    .catch(() => {
                        setClubs([]);
                        if (!defaultClubId) {
                            setNoExecutiveClubs(true);
                        }
                    })
                    .finally(() => setFetchingClubs(false));
            }

            if (eventToEdit) {
                setBannerPreview(getImageUrl(eventToEdit.banner_url || eventToEdit.banner_path));
                setCustomFields(Array.isArray(eventToEdit.custom_fields) ? eventToEdit.custom_fields : []);
                setFormData({
                    club_id: eventToEdit.club_id || '',
                    title: eventToEdit.title || '',
                    description: eventToEdit.description || '',
                    visibility: eventToEdit.visibility || 'public',
                    location_type: eventToEdit.location_type || 'physical',
                    location_value: eventToEdit.location_value || '',
                    capacity: eventToEdit.capacity || 50,
                    starts_at: formatForDatetimeLocal(eventToEdit.starts_at),
                    ends_at: formatForDatetimeLocal(eventToEdit.ends_at),
                    feedback_policy: eventToEdit.feedback_policy || 'attended_only',
                });
            } else {
                setBannerPreview(null);
                setCustomFields([]);
                // Default start time: 1 day from now at 10:00 AM
                const defaultStart = new Date(Date.now() + 86400000);
                defaultStart.setHours(10, 0, 0, 0);
                const defaultEnd = new Date(defaultStart.getTime() + 7200000); // +2 hours

                setFormData(prev => ({
                    ...prev,
                    club_id: defaultClubId ? String(defaultClubId) : prev.club_id,
                    title: '',
                    description: '',
                    visibility: 'public',
                    location_type: 'physical',
                    location_value: '',
                    capacity: 50,
                    starts_at: formatForDatetimeLocal(defaultStart),
                    ends_at: formatForDatetimeLocal(defaultEnd),
                    feedback_policy: 'attended_only',
                }));
            }
        }
    }, [isOpen, eventToEdit, defaultClubId]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBannerChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const raw = e.target.files[0];
            const compressed = await compressImage(raw, { maxWidth: 1200, maxHeight: 600, quality: 0.82 });
            setBannerFile(compressed);
            setBannerPreview(URL.createObjectURL(compressed));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setWarning(null);

        // Validation check
        if (!formData.club_id && !isEdit) {
            setError('Please select a club for this event.');
            setLoading(false);
            return;
        }

        let payload;
        if (bannerFile) {
            payload = new FormData();
            payload.append('club_id', formData.club_id);
            payload.append('title', formData.title);
            if (formData.description) payload.append('description', formData.description);
            payload.append('visibility', formData.visibility);
            payload.append('location_type', formData.location_type);
            if (formData.location_value) payload.append('location_value', formData.location_value);
            payload.append('capacity', String(formData.capacity));
            payload.append('starts_at', datetimeLocalToISO(formData.starts_at));
            payload.append('ends_at', datetimeLocalToISO(formData.ends_at));
            payload.append('feedback_policy', formData.feedback_policy || 'attended_only');
            payload.append('banner', bannerFile);
            payload.append('custom_fields', JSON.stringify(customFields));
        } else {
            payload = {
                ...formData,
                capacity: Number(formData.capacity),
                starts_at: datetimeLocalToISO(formData.starts_at),
                ends_at: datetimeLocalToISO(formData.ends_at),
                custom_fields: customFields,
            };
        }

        try {
            let res;
            if (isEdit) {
                res = await eventService.updateEvent(eventToEdit.id, payload);
            } else {
                res = await eventService.createEvent(payload);
            }

            if (res.data?.warning) {
                setWarning(res.data.warning);
            }

            if (onSuccess) {
                onSuccess(res.data?.event || res.data, isEdit ? 'Event updated successfully' : 'Event created in draft status');
            }
            onClose();
        } catch (err) {
            let msg = err.response?.data?.message || (isEdit ? 'Failed to update event.' : 'Failed to create event.');
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 relative animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-[#0b1c30] flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        {isEdit ? 'Edit Event Details' : 'Create New Event'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
                    >
                        &times;
                    </button>
                </div>

                {noExecutiveClubs && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>You are not an executive of any club. Only club executives can create events.</span>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                        {error}
                    </div>
                )}

                {warning && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{warning}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
                    {/* Club Selector (Only if creating) */}
                    {!isEdit && (
                        <div>
                            <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                                {isLockedClub || defaultClubId ? 'Target Club (Locked) *' : 'Target Club *'}
                            </label>
                            {isLockedClub || defaultClubId ? (
                                <select
                                    name="club_id"
                                    value={formData.club_id}
                                    disabled
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-100 text-slate-700 cursor-not-allowed font-medium"
                                >
                                    {clubs.find(c => String(c.id) === String(formData.club_id)) ? (
                                        <option value={formData.club_id}>
                                            {clubs.find(c => String(c.id) === String(formData.club_id))?.name}
                                        </option>
                                    ) : (
                                        <option value={formData.club_id}>Selected Club #{formData.club_id}</option>
                                    )}
                                </select>
                            ) : (
                                <select
                                    name="club_id"
                                    value={formData.club_id}
                                    onChange={handleChange}
                                    required
                                    disabled={fetchingClubs || noExecutiveClubs}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#2563eb] bg-[#f8f9ff] disabled:opacity-60"
                                >
                                    <option value="">
                                        {fetchingClubs ? 'Loading executive clubs...' : noExecutiveClubs ? 'No executive clubs available' : '-- Select Club --'}
                                    </option>
                                    {clubs.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Event Title *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Annual Tech Symposium 2026"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#2563eb]"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Description</label>
                        <textarea
                            name="description"
                            rows={3}
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Detailed agenda, requirements, or event overview..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#2563eb]"
                        />
                    </div>

                    {/* Event Banner / Poster Upload */}
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Event Banner / Poster Image (Optional)</label>
                        {bannerPreview && (
                            <div className="mb-2 h-24 w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-50 relative">
                                <img src={bannerPreview} alt="Event Banner preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            onChange={handleBannerChange}
                            className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        />
                    </div>

                    {/* Grid: Visibility & Location Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Visibility *</label>
                            <select
                                name="visibility"
                                value={formData.visibility}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#2563eb] bg-[#f8f9ff]"
                            >
                                <option value="public">Public (Open to All)</option>
                                <option value="members_only">Members Only</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Location Type *</label>
                            <select
                                name="location_type"
                                value={formData.location_type}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#2563eb] bg-[#f8f9ff]"
                            >
                                <option value="physical">Physical Venue</option>
                                <option value="online">Online Stream / Video Link</option>
                            </select>
                        </div>
                    </div>

                    {/* Feedback Policy Setting */}
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Feedback Policy *</label>
                        <select
                            name="feedback_policy"
                            value={formData.feedback_policy || 'attended_only'}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#2563eb] bg-[#f8f9ff]"
                        >
                            <option value="attended_only">Attended Only (Check-in Required)</option>
                            <option value="registered_only">All Registered Attendees (No Check-in Needed)</option>
                            <option value="open_to_all">Open to All Students (Public Feedback)</option>
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Determines who can submit feedback after the event ends.
                        </p>
                    </div>

                    {/* Location Value & Capacity */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Location Details</label>
                            <input
                                type="text"
                                name="location_value"
                                value={formData.location_value}
                                onChange={handleChange}
                                placeholder={formData.location_type === 'online' ? 'https://meet.google.com/xyz' : 'Auditorium 1, Main Campus'}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#2563eb]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Capacity *</label>
                            <input
                                type="number"
                                name="capacity"
                                min={1}
                                value={formData.capacity}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#2563eb]"
                            />
                        </div>
                    </div>

                    {/* Date Times */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Start Date & Time *</label>
                            <input
                                type="datetime-local"
                                name="starts_at"
                                value={formData.starts_at}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#2563eb]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#0b1c30] mb-1">End Date & Time *</label>
                            <input
                                type="datetime-local"
                                name="ends_at"
                                value={formData.ends_at}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#2563eb]"
                            />
                        </div>
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
                                        .catch(() => { })
                                        .finally(() => setLoadingSchedule(false));
                                }
                            }}
                            className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <CalendarSearch className="w-4 h-4 text-blue-600" />
                                {showSchedule ? 'Hide Scheduled Events' : 'View Scheduled Events (Conflict Check)'}
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
                                            const curStart = formData.starts_at ? new Date(formData.starts_at).getTime() : null;
                                            const curEnd = formData.ends_at ? new Date(formData.ends_at).getTime() : null;
                                            const evtStart = new Date(evt.starts_at).getTime();
                                            const evtEnd = new Date(evt.ends_at).getTime();
                                            const isSelf = isEdit && eventToEdit && eventToEdit.id === evt.id;

                                            const isOverlapping = !isSelf && curStart && curEnd && evtStart < curEnd && evtEnd > curStart;

                                            return (
                                                <div
                                                    key={evt.id}
                                                    className={`p-2.5 rounded-lg border text-xs transition-colors ${isOverlapping
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

                    {/* Custom Event Registration Form Fields Builder */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-xs font-bold text-[#0b1c30]">Custom Registration Form Fields</label>
                                <p className="text-[11px] text-slate-500">Add custom text, selection, or checkbox questions for event attendees.</p>
                            </div>
                            <button
                                type="button"
                                onClick={addCustomField}
                                className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Field
                            </button>
                        </div>

                        {customFields.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2 px-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                No custom fields added yet. Default single-click registration will be used.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {customFields.map((field, idx) => (
                                    <div key={field.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs relative">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-slate-700">Question #{idx + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeCustomField(idx)}
                                                className="text-rose-500 hover:text-rose-700 text-xs font-semibold p-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                            <div className="sm:col-span-7">
                                                <input
                                                    type="text"
                                                    placeholder="Question Label (e.g. T-Shirt Size)"
                                                    value={field.label || ''}
                                                    onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:border-blue-500 bg-white"
                                                />
                                            </div>

                                            <div className="sm:col-span-5">
                                                <select
                                                    value={field.type || 'text'}
                                                    onChange={(e) => updateCustomField(idx, 'type', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:border-blue-500 bg-white"
                                                >
                                                    <option value="text">Short Text</option>
                                                    <option value="textarea">Long Text / Paragraph</option>
                                                    <option value="select">Dropdown Options</option>
                                                    <option value="checkbox">Confirmation Checkbox</option>
                                                </select>
                                            </div>
                                        </div>

                                        {field.type === 'select' && (
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Comma-separated options (e.g. Small, Medium, Large, XL)"
                                                    value={Array.isArray(field.options) ? field.options.join(', ') : (field.options || '')}
                                                    onChange={(e) => updateCustomField(idx, 'options', e.target.value.split(',').map(s => s.trim()))}
                                                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:border-blue-500 bg-white"
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 pt-1">
                                            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(field.required)}
                                                    onChange={(e) => updateCustomField(idx, 'required', e.target.checked)}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Required response</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (!isEdit && noExecutiveClubs)}
                            className="px-5 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                        >
                            {loading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Event')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventModal;
