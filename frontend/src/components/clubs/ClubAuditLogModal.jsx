import { useState, useEffect } from 'react';
import clubService from '../../services/clubService';

const actionLabels = {
    'club.created': 'Club Request Created',
    'club.approved': 'Club Approved',
    'club.rejected': 'Club Rejected',
    'club.updated': 'Club Details Updated',
    'club.suspended': 'Club Suspended',
    'club.member_joined': 'Member Joined Club',
    'club.member_left': 'Member Left Club',
    'club.member_role_updated': 'Member Role Changed',
    'club.member_removed': 'Member Removed/Kicked',
    'event.created': 'Event Created',
    'event.updated': 'Event Updated',
    'event.status_changed': 'Event Status Changed',
    'event.deleted': 'Event Deleted',
    'event.registered': 'User Registered for Event',
    'event.registration_cancelled': 'Event Registration Cancelled',
    'event.attendance_updated': 'Attendance Status Updated',
};

const ClubAuditLogModal = ({ isOpen, onClose, club }) => {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [error, setError] = useState(null);

    const fetchLogs = (p = 1) => {
        if (!club?.id) return;
        setLoading(true);
        setError(null);

        clubService.getClubAuditLogs(club.id, p)
            .then(res => {
                const data = res.data;
                if (data.data) {
                    setLogs(data.data);
                    setPagination({
                        current_page: data.current_page,
                        last_page: data.last_page,
                        total: data.total,
                    });
                } else {
                    setLogs(Array.isArray(data) ? data : []);
                }
            })
            .catch(err => setError(err.response?.data?.message || 'Failed to fetch club audit logs.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (isOpen && club?.id) {
            fetchLogs(page);
        }
    }, [isOpen, club?.id, page]);

    if (!isOpen || !club) return null;

    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full p-6 relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Club Activity & Audit Logs
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {club.name} &bull; Read-only executive audit records ({pagination.total || logs.length} total entries)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
                    >
                        &times;
                    </button>
                </div>

                {error && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg shrink-0">
                        {error}
                    </div>
                )}

                {/* Log List */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                    {loading ? (
                        <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                            Loading activity logs...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">
                            No audit logs found for this club yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                            {logs.map(log => {
                                const actionName = actionLabels[log.action] || log.action;
                                const performerName = log.user?.name || (log.user_id ? `User #${log.user_id}` : 'System');

                                return (
                                    <div key={log.id} className="p-3.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                    {actionName}
                                                </span>
                                                <span className="text-slate-500 font-medium">by {performerName}</span>
                                            </div>

                                            {log.metadata && (
                                                <div className="text-slate-500 font-mono text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100 overflow-x-auto max-w-xl">
                                                    {JSON.stringify(log.metadata)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-slate-400 shrink-0 text-[11px]">
                                            {formatDate(log.created_at)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer & Pagination */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-500">
                        Page {pagination.current_page} of {pagination.last_page}
                    </p>
                    <div className="flex items-center gap-2">
                        {pagination.last_page > 1 && (
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={pagination.current_page === 1 || loading}
                                    className="px-3 py-1 border border-slate-300 rounded text-xs disabled:opacity-40"
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                                    disabled={pagination.current_page === pagination.last_page || loading}
                                    className="px-3 py-1 border border-slate-300 rounded text-xs disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClubAuditLogModal;
