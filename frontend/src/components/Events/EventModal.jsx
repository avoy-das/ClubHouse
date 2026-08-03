import { useState, useEffect } from 'react';
import eventService from '../../services/eventService';
import clubService from '../../services/clubService';
import { AlertTriangle, Calendar } from 'lucide-react';

const EventModal = ({ isOpen, onClose, onSuccess, eventToEdit = null, defaultClubId = '', isLockedClub = false }) => {
    const isEdit = Boolean(eventToEdit);

    const [clubs, setClubs] = useState([]);
    const [fetchingClubs, setFetchingClubs] = useState(false);
    const [noExecutiveClubs, setNoExecutiveClubs] = useState(false);
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
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null);

    // Format ISO string for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatForInput = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        const pad = (num) => String(num).padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const mins = pad(d.getMinutes());
        return `${year}-${month}-${day}T${hours}:${mins}`;
    };

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setWarning(null);
            setNoExecutiveClubs(false);

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
                        setNoExecutiveClubs(true);
                    })
                    .finally(() => setFetchingClubs(false));
            }

            if (eventToEdit) {
                setFormData({
                    club_id: eventToEdit.club_id || '',
                    title: eventToEdit.title || '',
                    description: eventToEdit.description || '',
                    visibility: eventToEdit.visibility || 'public',
                    location_type: eventToEdit.location_type || 'physical',
                    location_value: eventToEdit.location_value || '',
                    capacity: eventToEdit.capacity || 50,
                    starts_at: formatForInput(eventToEdit.starts_at),
                    ends_at: formatForInput(eventToEdit.ends_at),
                });
            } else {
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
                    starts_at: formatForInput(defaultStart.toISOString()),
                    ends_at: formatForInput(defaultEnd.toISOString()),
                }));
            }
        }
    }, [isOpen, eventToEdit, defaultClubId]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

        const payload = {
            ...formData,
            capacity: Number(formData.capacity),
        };

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
            const msg = err.response?.data?.message || (isEdit ? 'Failed to update event.' : 'Failed to create event.');
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
