import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';
import UserManagementSection from '../../components/admin/UserManagementSection';
import { Shield, Building2, BarChart2, Users } from 'lucide-react';

const statusStyles = {
    pending:  'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
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
            <div className="space-y-8">
                {/* Admin Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                            <Shield className="w-6 h-6 text-amber-500" /> Admin Suite — Club Approval & Users
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">
                            Review, approve, or suspend club creation requests and manage system users.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold shrink-0">
                        <Link to="/clubs" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            Browse Clubs
                        </Link>
                        <Link to="/admin/users" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            User Management
                        </Link>
                        <Link to="/admin/reports" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors flex items-center gap-1.5">
                            <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                            Reports & Stats
                        </Link>
                        <Link to="/admin/audit-logs" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            Audit Logs
                        </Link>
                    </div>
                </div>

                {/* Section 1: Club Approval */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-[#0b1c30] flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-amber-500" /> Club Approval Requests
                        </h2>
                    </div>

                    {loading && <p className="text-slate-400 text-sm animate-pulse py-8 text-center bg-white rounded-xl border border-slate-200">Loading clubs...</p>}
                    {error   && <p className="text-red-500 text-sm py-4 bg-white rounded-xl p-4 border border-red-200">{error}</p>}

                    {!loading && !error && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-[#f8f9ff]">
                                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#0b1c30] uppercase tracking-wide">Club</th>
                                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#0b1c30] uppercase tracking-wide">Category</th>
                                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#0b1c30] uppercase tracking-wide">Requested By</th>
                                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#0b1c30] uppercase tracking-wide">Status</th>
                                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#0b1c30] uppercase tracking-wide">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {clubs.map(club => (
                                            <tr key={club.id} className="hover:bg-[#f8f9ff]/60 transition-colors">
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-[#0b1c30]">{club.name}</p>
                                                    {club.department && <p className="text-xs text-slate-400 mt-0.5">{club.department}</p>}
                                                </td>
                                                <td className="px-5 py-4 text-slate-600">{club.category}</td>
                                                <td className="px-5 py-4 text-slate-600">{club.creator?.name}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[club.status]}`}>
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
                                                                    className="px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => setRejectModal({ open: true, clubId: club.id })}
                                                                    disabled={actionLoading}
                                                                    className="px-3 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        {club.status === 'approved' && (
                                                            <button
                                                                onClick={() => handleSuspend(club.id)}
                                                                disabled={actionLoading}
                                                                className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
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
                            </div>

                            {clubs.length === 0 && (
                                <p className="text-slate-400 text-sm text-center py-8">No clubs found.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Section 2: User Management (Embedded below Club Approval) */}
                <UserManagementSection />
            </div>

            {/* Reject Modal */}
            {rejectModal.open && (
                <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200">
                        <h3 className="text-base font-bold text-[#0b1c30] mb-4">
                            Reject Club Request
                        </h3>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="Provide a reason for rejection..."
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] resize-none mb-4 bg-[#f8f9ff]"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setRejectModal({ open: false, clubId: null });
                                    setRejectReason('');
                                }}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                disabled={actionLoading || !rejectReason.trim()}
                                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
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