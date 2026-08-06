import { useState, useEffect } from 'react';
import clubService from '../../services/clubService';
import { actionLabels, renderMetaSummary } from '../../utils/auditLogUtils';
import { FileText, X, ArrowLeft, ArrowRight } from 'lucide-react';

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
        if (!isoStr) return '-';
        const d = new Date(isoStr);
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full p-6 relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" /> Club Activity Log
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {club.name} &bull; Operational activity feed ({pagination.total || logs.length} total entries)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg shrink-0">
                        {error}
                    </div>
                )}

                {/* Tabulated Log Table */}
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
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-[11px] font-semibold">
                                    <tr>
                                        <th className="p-3">Timestamp</th>
                                        <th className="p-3">Performer</th>
                                        <th className="p-3">Action</th>
                                        <th className="p-3">Activity Summary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {logs.map(log => {
                                        const actionName = actionLabels[log.action] || log.action;
                                        const performerName = log.user?.name || (log.user_id ? `User #${log.user_id}` : 'System');
                                        const summary = renderMetaSummary(log);
                                        const hasSpecificTarget = log.target_label && log.target_label.toLowerCase() !== club.name?.toLowerCase();

                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-3 text-slate-500 whitespace-nowrap font-medium">
                                                    {formatDate(log.created_at)}
                                                </td>
                                                <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                                                    {performerName}
                                                </td>
                                                <td className="p-3">
                                                    <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] inline-block">
                                                        {actionName}
                                                    </span>
                                                    {hasSpecificTarget && (
                                                        <span className="block text-blue-700 font-medium text-[11px] mt-0.5">
                                                            {log.target_label}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-slate-700">
                                                    {summary ? (
                                                        <span className="font-medium text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-100 block">
                                                            {summary}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer & Pagination */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-500 font-medium">
                        Page {pagination.current_page} of {pagination.last_page}
                    </p>
                    <div className="flex items-center gap-2">
                        {pagination.last_page > 1 && (
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={pagination.current_page === 1 || loading}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" /> Prev
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                                    disabled={pagination.current_page === pagination.last_page || loading}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
                                >
                                    Next <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
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
