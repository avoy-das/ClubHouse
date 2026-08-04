import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import adminService from '../../services/adminService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Shield, FileText, ArrowLeft, ArrowRight } from 'lucide-react';

const AdminAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [userId, setUserId] = useState('');
    const [clubId, setClubId] = useState('');
    const [action, setAction] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const loadAuditLogs = async (pageNum = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: pageNum,
                ...(userId && { user_id: userId }),
                ...(clubId && { club_id: clubId }),
                ...(action && { action }),
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
        setUserId('');
        setClubId('');
        setAction('');
        setFromDate('');
        setToDate('');
        setPage(1);
        loadAuditLogs(1);
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                            <Shield className="w-6 h-6 text-amber-500" /> Admin — System Audit Logs
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">Security and administrative action trail across the platform.</p>
                    </div>
                    <div className="flex space-x-2 text-xs font-semibold">
                        <Link to="/admin/clubs" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            Club Approval
                        </Link>
                        <Link to="/admin/users" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            User Directory
                        </Link>
                        <Link to="/admin/reports" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            Reports & Stats
                        </Link>
                    </div>
                </div>

                {/* Filter Form */}
                <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">User ID</label>
                        <input
                            type="text"
                            placeholder="e.g. 5"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Action Prefix</label>
                        <select
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none bg-white"
                        >
                            <option value="">All Actions</option>
                            <option value="auth.">auth.*</option>
                            <option value="club.">club.*</option>
                            <option value="event.">event.*</option>
                            <option value="admin.">admin.*</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">From Date</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#0b1c30] mb-1">To Date</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#2563eb] outline-none bg-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs">
                            Filter
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
                        <div className="p-4 border-b border-slate-200 font-bold text-[#0b1c30] flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" /> Action History
                        </div>
                        {logs.length === 0 ? (
                            <p className="p-6 text-slate-500 text-sm text-center">No audit logs recorded matching criteria.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-xs font-semibold">
                                        <tr>
                                            <th className="p-3.5">Timestamp</th>
                                            <th className="p-3.5">Actor / User</th>
                                            <th className="p-3.5">Action</th>
                                            <th className="p-3.5">Subject / Target</th>
                                            <th className="p-3.5">Meta Info</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-[#f8f9ff]/60 transition-colors">
                                                <td className="p-3.5 text-xs text-slate-500 whitespace-nowrap">
                                                    {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                                                </td>
                                                <td className="p-3.5 font-semibold text-[#0b1c30]">
                                                    {log.user?.name || log.actor?.name || (log.user_id ? `User #${log.user_id}` : 'System')}
                                                </td>
                                                <td className="p-3.5 font-semibold text-blue-700">{log.action}</td>
                                                <td className="p-3.5">
                                                    {log.target_type || log.subject_type ? `${log.target_type || log.subject_type} #${log.target_id || log.subject_id || ''}` : 'N/A'}
                                                </td>
                                                <td className="p-3.5 text-xs font-mono bg-slate-50 max-w-xs truncate rounded">
                                                    {log.metadata || log.meta ? JSON.stringify(log.metadata || log.meta) : '-'}
                                                </td>
                                            </tr>
                                        ))}
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
        </MainLayout>
    );
};

export default AdminAuditLogs;
