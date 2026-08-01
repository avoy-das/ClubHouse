import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import adminService from '../../services/adminService';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';

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
                ...(fromDate && { from: fromDate }),
                ...(toDate && { to: toDate }),
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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin — System Audit Logs</h1>
                        <p className="text-gray-500 text-sm">Security and administrative action trail across the platform.</p>
                    </div>
                    <div className="flex space-x-3 text-sm">
                        <Link to="/admin/clubs" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700">
                            Club Management
                        </Link>
                        <Link to="/admin/users" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700">
                            User Directory
                        </Link>
                        <Link to="/admin/reports" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700">
                            Reports & Stats
                        </Link>
                    </div>
                </div>

                {/* Filter Form */}
                <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-lg shadow-sm border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">User ID</label>
                        <input
                            type="text"
                            placeholder="e.g. 5"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-slate-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Action Prefix</label>
                        <select
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-slate-500 outline-none"
                        >
                            <option value="">All Actions</option>
                            <option value="auth.">auth.*</option>
                            <option value="club.">club.*</option>
                            <option value="event.">event.*</option>
                            <option value="admin.">admin.*</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-slate-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-slate-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" className="flex-1">
                            Filter
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={handleResetFilters}>
                            Reset
                        </Button>
                    </div>
                </form>

                {error && <ErrorBanner message={error} />}

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                        <div className="p-4 border-b font-bold text-gray-800">Action History</div>
                        {logs.length === 0 ? (
                            <p className="p-6 text-gray-500 text-sm">No audit logs recorded matching criteria.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                                        <tr>
                                            <th className="p-3">Timestamp</th>
                                            <th className="p-3">Actor / User</th>
                                            <th className="p-3">Action</th>
                                            <th className="p-3">Subject / Target</th>
                                            <th className="p-3">Meta Info</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {logs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                                                    {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                                                </td>
                                                <td className="p-3 font-medium text-gray-900">
                                                    {log.user?.name || log.actor?.name || (log.user_id ? `User #${log.user_id}` : 'System')}
                                                </td>
                                                <td className="p-3 font-semibold text-blue-700">{log.action}</td>
                                                <td className="p-3">
                                                    {log.target_type || log.subject_type ? `${log.target_type || log.subject_type} #${log.target_id || log.subject_id || ''}` : 'N/A'}
                                                </td>
                                                <td className="p-3 text-xs font-mono bg-gray-50 max-w-xs truncate">
                                                    {log.metadata || log.meta ? JSON.stringify(log.metadata || log.meta) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="p-4 border-t flex justify-between items-center bg-gray-50">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                ← Previous
                            </Button>
                            <span className="text-xs text-gray-500">
                                Page {page} of {lastPage}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page >= lastPage}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next →
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default AdminAuditLogs;
