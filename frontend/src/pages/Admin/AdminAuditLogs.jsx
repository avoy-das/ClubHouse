import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import adminService from '../../services/adminService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Shield, FileText, ArrowLeft, ArrowRight, X, Info, Clock, User as UserIcon, Tag, Download, Search, Filter } from 'lucide-react';
import { actionLabels, renderMetaSummary, getRoleBadge } from '../../utils/auditLogUtils';

const AdminAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [category, setCategory] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const loadAuditLogs = async (pageNum = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: pageNum,
                ...(search && { search }),
                ...(role && { role }),
                ...(category && { category }),
                ...(fromDate && { from: `${fromDate} 00:00:00` }),
                ...(toDate && { to: `${toDate} 23:59:59` }),
            };
            const res = await adminService.getAuditLogs(params);
            const data = res.data ? res : { data: res };
            const list = data.data?.data || data.data || [];
            setLogs(Array.isArray(list) ? list : []);
            if (data.data?.last_page) setLastPage(data.data.last_page);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAuditLogs(page);
    }, [page]);

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        loadAuditLogs(1);
    };

    const handleResetFilters = () => {
        setSearch('');
        setRole('');
        setCategory('');
        setFromDate('');
        setToDate('');
        setPage(1);
        loadAuditLogs(1);
    };

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const params = {
                ...(search && { search }),
                ...(role && { role }),
                ...(category && { category }),
                ...(fromDate && { from: `${fromDate} 00:00:00` }),
                ...(toDate && { to: `${toDate} 23:59:59` }),
            };
            await adminService.exportAuditLogs(params);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to export audit logs to CSV');
        } finally {
            setExporting(false);
        }
    };

    const formatDate = (isoStr) => {
        if (!isoStr) return '-';
        return new Date(isoStr).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                            <Shield className="w-6 h-6 text-amber-500" /> Admin — System Audit Logs
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">Authoritative governance trail of consequential actions across the platform.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            disabled={exporting}
                            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            {exporting ? 'Exporting...' : 'Export CSV'}
                        </button>
                        <Link to="/admin/clubs" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            Club Approval
                        </Link>
                        <Link to="/admin/users" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            User Directory
                        </Link>
                    </div>
                </div>

                {/* Filter Bar */}
                <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1 flex items-center gap-1">
                            <Search className="w-3 h-3 text-slate-400" /> Search (Name / Email / Action)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. John Doe, President, or club.updated"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Actor Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none bg-white"
                        >
                            <option value="">All Roles</option>
                            <option value="admin">Administrator</option>
                            <option value="executive">Club Executive</option>
                            <option value="member">General Member</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none bg-white"
                        >
                            <option value="">All Categories</option>
                            <option value="admin.">Admin Actions</option>
                            <option value="club.">Club Governance & Lifecycle</option>
                            <option value="membership.">Membership Requests</option>
                            <option value="event.">Event Management</option>
                            <option value="announcement.">Announcements</option>
                            <option value="recruitment.">Recruitment</option>
                            <option value="auth.">Security & Auth</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Date Range</label>
                        <div className="grid grid-cols-2 gap-1">
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none bg-white"
                                title="From Date"
                            />
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none bg-white"
                                title="To Date"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1">
                            <Filter className="w-3 h-3" /> Filter
                        </button>
                        <button type="button" onClick={handleResetFilters} className="px-3 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] border border-slate-300 text-xs font-semibold rounded-lg transition-colors">
                            Reset
                        </button>
                    </div>
                </form>

                {error && <ErrorBanner message={error} />}

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 font-bold text-[#0b1c30] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" /> Action History
                            </div>
                            <span className="text-xs font-normal text-slate-400">Showing {logs.length} entries &bull; Click row for details</span>
                        </div>
                        {logs.length === 0 ? (
                            <p className="p-6 text-slate-500 text-sm text-center">No audit logs recorded matching criteria.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-xs font-semibold">
                                        <tr>
                                            <th className="p-3.5">Timestamp</th>
                                            <th className="p-3.5">Actor</th>
                                            <th className="p-3.5">Action</th>
                                            <th className="p-3.5">Target</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {logs.map((log) => {
                                            const humanAction = actionLabels[log.action] || log.action;
                                            const actorName = log.user?.name || log.actor?.name || (log.user_id ? `User #${log.user_id}` : 'System');
                                            const actorEmail = log.user?.email || log.actor?.email;
                                            const badge = getRoleBadge(log.actor_role);

                                            const isSelfTarget = log.target_type === 'User' && String(log.target_id) === String(log.user_id);

                                            return (
                                                <tr
                                                    key={log.id}
                                                    onClick={() => setSelectedLog(log)}
                                                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                                >
                                                    <td className="p-3.5 text-xs text-slate-500 whitespace-nowrap">
                                                        {formatDate(log.created_at)}
                                                    </td>
                                                    <td className="p-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-[#0b1c30] group-hover:text-blue-600 transition-colors">
                                                                {actorName}
                                                            </span>
                                                            <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${badge.className}`}>
                                                                {badge.label}
                                                            </span>
                                                        </div>
                                                        {actorEmail && (
                                                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{actorEmail}</div>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className="font-semibold text-slate-900 block">{humanAction}</span>
                                                        <span className="text-[11px] text-slate-400 font-mono">{log.action}</span>
                                                    </td>
                                                    <td className="p-3.5">
                                                        {isSelfTarget ? (
                                                            <span className="text-xs text-slate-400 italic">Self / Profile</span>
                                                        ) : log.target_label ? (
                                                            <div>
                                                                <span className="font-semibold text-slate-900 block">{log.target_label}</span>
                                                                {log.target_type && (
                                                                    <span className="text-[11px] text-slate-400 font-mono">
                                                                        {log.target_type} #{log.target_id || ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : log.target_type ? (
                                                            <span className="font-mono text-slate-700">{`${log.target_type} #${log.target_id || ''}`}</span>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">System</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-[#f8f9ff]">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-[#0b1c30] text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Previous
                            </button>
                            <span className="text-xs font-medium text-slate-500">
                                Page {page} of {lastPage}
                            </span>
                            <button
                                disabled={page >= lastPage}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-[#0b1c30] text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1"
                            >
                                Next <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Audit Log Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Audit Log Record #{selectedLog.id}</span>
                                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                                    {actionLabels[selectedLog.action] || selectedLog.action}
                                </h2>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="py-4 space-y-4 text-xs">
                            {/* Summary Sentence Card */}
                            {renderMetaSummary(selectedLog) && (
                                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-900 flex items-start gap-2.5">
                                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-semibold block text-[11px] uppercase tracking-wider text-blue-700">Summary</span>
                                        <p className="text-xs font-medium text-slate-800 mt-0.5">{renderMetaSummary(selectedLog)}</p>
                                    </div>
                                </div>
                            )}

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                        <UserIcon className="w-3 h-3 text-slate-400" /> Actor
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-900">
                                            {selectedLog.user?.name || selectedLog.actor?.name || (selectedLog.user_id ? `User #${selectedLog.user_id}` : 'System / Guest')}
                                        </p>
                                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${getRoleBadge(selectedLog.actor_role).className}`}>
                                            {getRoleBadge(selectedLog.actor_role).label}
                                        </span>
                                    </div>
                                    {(selectedLog.user?.email || selectedLog.actor?.email) && (
                                        <p className="text-slate-500 font-mono text-[11px] truncate mt-0.5">{selectedLog.user?.email || selectedLog.actor?.email}</p>
                                    )}
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                        <Tag className="w-3 h-3 text-slate-400" /> Target
                                    </span>
                                    <p className="font-bold text-slate-900">
                                        {selectedLog.target_label || (selectedLog.target_type ? `${selectedLog.target_type} #${selectedLog.target_id}` : 'System Resource')}
                                    </p>
                                    {selectedLog.target_type && (
                                        <p className="text-slate-500 font-mono text-[11px]">{selectedLog.target_type} #{selectedLog.target_id}</p>
                                    )}
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                        <Clock className="w-3 h-3 text-slate-400" /> Timestamp
                                    </span>
                                    <p className="font-semibold text-slate-800">{formatDate(selectedLog.created_at)}</p>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                        <Shield className="w-3 h-3 text-slate-400" /> Action Code
                                    </span>
                                    <p className="font-mono text-slate-800 font-medium">{selectedLog.action}</p>
                                </div>
                            </div>

                            {/* Structured Field Changes if present */}
                            {selectedLog.metadata?.changed && selectedLog.metadata?.previous && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-xs">
                                        Attribute Changes
                                    </div>
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-semibold">
                                            <tr>
                                                <th className="p-2.5">Field</th>
                                                <th className="p-2.5">Previous Value</th>
                                                <th className="p-2.5">New Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {Object.keys(selectedLog.metadata.changed).map((field) => (
                                                <tr key={field}>
                                                    <td className="p-2.5 font-semibold text-slate-800">{field}</td>
                                                    <td className="p-2.5 text-rose-700 bg-rose-50/50 font-mono">{String(selectedLog.metadata.previous[field] ?? 'None')}</td>
                                                    <td className="p-2.5 text-emerald-700 bg-emerald-50/50 font-mono">{String(selectedLog.metadata.changed[field] ?? 'None')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default AdminAuditLogs;
