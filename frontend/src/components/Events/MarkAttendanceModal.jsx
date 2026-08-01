import { useState, useEffect } from 'react';
import eventService from '../../services/eventService';
import { Check, X, Users, Search } from 'lucide-react';

const MarkAttendanceModal = ({ isOpen, onClose, event }) => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const [error, setError] = useState(null);

    const fetchRegistrations = async (query = '') => {
        if (!event?.id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await eventService.getEventRegistrations(event.id, { search: query });
            setRegistrations(res.data.registrations || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load attendees.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && event?.id) {
            fetchRegistrations(search);
        }
    }, [isOpen, event?.id]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        fetchRegistrations(val);
    };

    const handleToggleAttendance = async (userId, attendedVal) => {
        setUpdatingUserId(userId);
        try {
            await eventService.markAttendance(event.id, userId, attendedVal);
            setRegistrations(prev =>
                prev.map(r => r.user_id === userId ? { ...r, attended: attendedVal } : r)
            );
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update attendance status.');
        } finally {
            setUpdatingUserId(null);
        }
    };

    if (!isOpen || !event) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full p-6 relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-[#0b1c30] flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" /> Check-in & Attendance Roster
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {event.title} &bull; {registrations.length} registered
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
                    >
                        &times;
                    </button>
                </div>

                {/* Filter Search */}
                <div className="py-3 border-b border-slate-100 shrink-0 relative">
                    <input
                        type="text"
                        placeholder="Search attendee by name, email, or student ID..."
                        value={search}
                        onChange={handleSearchChange}
                        className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] bg-[#f8f9ff]"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-5" />
                </div>

                {error && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg shrink-0">
                        {error}
                    </div>
                )}

                {/* Attendees Table / List */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                    {loading ? (
                        <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                            Loading attendee list...
                        </div>
                    ) : registrations.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">
                            {search ? `No attendees found matching '${search}'.` : 'No members registered for this event yet.'}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {registrations.map(reg => {
                                const u = reg.user;
                                const isUpdating = updatingUserId === reg.user_id;

                                return (
                                    <div key={reg.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f8f9ff] px-2 rounded-lg transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[#0b1c30] text-sm">{u?.name || 'Registered User'}</span>
                                                <span className="text-xs text-slate-400">({u?.email})</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                                {u?.student_id && <span>ID: {u.student_id}</span>}
                                                {u?.department && <span>&bull; {u.department}</span>}
                                            </div>
                                        </div>

                                        {/* Status Badge & Action Buttons */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* Status Badge */}
                                            {reg.attended === true && (
                                                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                                                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Attended
                                                </span>
                                            )}
                                            {reg.attended === false && (
                                                <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full border border-rose-200 flex items-center gap-1">
                                                    <X className="w-3.5 h-3.5 text-rose-600" /> Absent
                                                </span>
                                            )}
                                            {reg.attended === null && (
                                                <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                                                    Unmarked
                                                </span>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white">
                                                <button
                                                    onClick={() => handleToggleAttendance(reg.user_id, true)}
                                                    disabled={isUpdating || reg.attended === true}
                                                    title="Mark as Attended"
                                                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                                        reg.attended === true
                                                            ? 'bg-emerald-600 text-white font-semibold'
                                                            : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                                    } disabled:opacity-50`}
                                                >
                                                    Present
                                                </button>
                                                <button
                                                    onClick={() => handleToggleAttendance(reg.user_id, false)}
                                                    disabled={isUpdating || reg.attended === false}
                                                    title="Mark as Absent"
                                                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                                        reg.attended === false
                                                            ? 'bg-rose-600 text-white font-semibold'
                                                            : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                                    } disabled:opacity-50`}
                                                >
                                                    Absent
                                                </button>
                                                {reg.attended !== null && (
                                                    <button
                                                        onClick={() => handleToggleAttendance(reg.user_id, null)}
                                                        disabled={isUpdating}
                                                        title="Reset status to unmarked"
                                                        className="px-2 py-1 text-slate-400 hover:text-slate-700 text-xs transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[#0f172a] text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MarkAttendanceModal;
