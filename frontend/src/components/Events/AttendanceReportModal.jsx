import { useState, useEffect } from 'react';
import eventService from '../../services/eventService';

const AttendanceReportModal = ({ isOpen, onClose, event }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && event?.id) {
            setLoading(true);
            setError(null);
            eventService.getAttendanceReport(event.id)
                .then(res => setReport(res.data))
                .catch(err => setError(err.response?.data?.message || 'Failed to generate attendance report.'))
                .finally(() => setLoading(false));
        }
    }, [isOpen, event?.id]);

    if (!isOpen || !event) return null;

    const m = report?.metrics || {
        total_registered: 0,
        attended_count: 0,
        absent_count: 0,
        unmarked_count: 0,
        attendance_rate: 0,
        capacity: event.capacity,
        spots_remaining: event.capacity ? event.capacity - (event.registrations_count || 0) : null,
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in duration-150">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Attendance Report & Analytics
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {event.title}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
                    >
                        &times;
                    </button>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                        Calculating metrics...
                    </div>
                ) : error ? (
                    <div className="my-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                        {error}
                    </div>
                ) : (
                    <div className="mt-5 space-y-6">
                        {/* Attendance Rate Highlight Card */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-xs text-center">
                            <span className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                                Attendance Check-in Rate
                            </span>
                            <div className="text-4xl font-extrabold my-2 text-slate-900">
                                {m.attendance_rate}%
                            </div>
                            <p className="text-xs text-slate-600">
                                {m.attended_count} of {m.total_registered} registered attendees checked in
                            </p>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4 overflow-hidden border border-slate-300/60">
                                <div
                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, m.attendance_rate)}%` }}
                                />
                            </div>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl">
                                <span className="text-xs font-semibold text-emerald-700 block">Attended</span>
                                <span className="text-xl font-bold text-emerald-900">{m.attended_count}</span>
                            </div>
                            <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl">
                                <span className="text-xs font-semibold text-rose-700 block">Absent</span>
                                <span className="text-xl font-bold text-rose-900">{m.absent_count}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                                <span className="text-xs font-semibold text-slate-600 block">Unmarked</span>
                                <span className="text-xl font-bold text-slate-800">{m.unmarked_count}</span>
                            </div>
                        </div>

                        {/* Capacity Stats */}
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between text-slate-600">
                                <span>Total Registered:</span>
                                <strong className="text-slate-900">{m.total_registered}</strong>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Maximum Capacity:</span>
                                <strong className="text-slate-900">{m.capacity ?? 'Unlimited'}</strong>
                            </div>
                            {m.capacity !== null && (
                                <div className="flex justify-between text-slate-600">
                                    <span>Available Spots:</span>
                                    <strong className="text-slate-900">{m.spots_remaining}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="pt-5 border-t border-slate-100 flex justify-end mt-4">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceReportModal;
