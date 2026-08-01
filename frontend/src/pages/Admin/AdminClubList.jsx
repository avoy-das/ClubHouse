import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';

const statusStyles = {
    pending:  'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    suspended:'bg-slate-100 text-slate-600',
};

const AdminClubList = () => {
    const [clubs, setClubs]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [rejectModal, setRejectModal] = useState({ open: false, clubId: null });
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchClubs = () => {
        setLoading(true);
        clubService.adminGetClubs()
            .then(res => setClubs(res.data))
            .catch(() => setError('Failed to load clubs.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchClubs(); }, []);

    const handleApprove = async (id) => {
        if (!window.confirm('Approve this club?')) return;
        setActionLoading(true);
        try {
            await clubService.adminApprove(id);
            fetchClubs();
        } catch {
            alert('Failed to approve club.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectSubmit = async () => {
        if (!rejectReason.trim()) return;
        setActionLoading(true);
        try {
            await clubService.adminReject(rejectModal.clubId, rejectReason);
            setRejectModal({ open: false, clubId: null });
            setRejectReason('');
            fetchClubs();
        } catch {
            alert('Failed to reject club.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSuspend = async (id) => {
        if (!window.confirm('Suspend this club?')) return;
        setActionLoading(true);
        try {
            await clubService.adminSuspend(id);
            fetchClubs();
        } catch {
            alert('Failed to suspend club.');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Club Management</h1>
                <p className="text-slate-500 mt-1">Review and manage all club requests.</p>
            </div>

            {loading && <p className="text-slate-400 text-sm">Loading...</p>}
            {error   && <p className="text-red-500 text-sm">{error}</p>}

            {!loading && !error && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Club</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Requested By</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clubs.map(club => (
                                <tr key={club.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-slate-800">{club.name}</p>
                                        {club.department && <p className="text-xs text-slate-400 mt-0.5">{club.department}</p>}
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">{club.category}</td>
                                    <td className="px-5 py-4 text-slate-600">{club.creator?.name}</td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[club.status]}`}>
                                            {club.status.charAt(0).toUpperCase() + club.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            {club.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(club.id)}
                                                        disabled={actionLoading}
                                                        className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectModal({ open: true, clubId: club.id })}
                                                        disabled={actionLoading}
                                                        className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {club.status === 'approved' && (
                                                <button
                                                    onClick={() => handleSuspend(club.id)}
                                                    disabled={actionLoading}
                                                    className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                                                >
                                                    Suspend
                                                </button>
                                            )}
                                            {(club.status === 'rejected' || club.status === 'suspended') && (
                                                <span className="text-xs text-slate-400">No actions</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {clubs.length === 0 && (
                        <p className="text-slate-400 text-sm text-center py-8">No clubs found.</p>
                    )}
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal.open && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-base font-semibold text-slate-800 mb-4">
                            Reject Club
                        </h3>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="Provide a reason for rejection..."
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setRejectModal({ open: false, clubId: null });
                                    setRejectReason('');
                                }}
                                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                disabled={actionLoading || !rejectReason.trim()}
                                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default AdminClubList;