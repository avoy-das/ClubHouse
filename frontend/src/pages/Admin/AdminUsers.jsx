import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import adminService from '../../services/adminService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';
import { Shield, Users } from 'lucide-react';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminService.getUsers();
            const list = data.data || data;
            setUsers(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleToggleAdmin = async (userId, currentIsAdmin) => {
        setUpdatingId(userId);
        setError(null);
        setSuccess(null);
        try {
            await adminService.updateUser(userId, { is_admin: !currentIsAdmin });
            setSuccess('User updated successfully.');
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeactivateUser = async (userId) => {
        if (!window.confirm('Are you sure you want to deactivate/delete this user? Their access will be revoked.')) return;
        setUpdatingId(userId);
        setError(null);
        setSuccess(null);
        try {
            await adminService.deleteUser(userId);
            setSuccess('User deactivated successfully.');
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to deactivate user.');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                            <Shield className="w-6 h-6 text-amber-500" /> Admin — User Directory
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">View registered users and manage admin privileges or access.</p>
                    </div>
                    <div className="flex space-x-2 text-xs font-semibold">
                        <Link to="/admin/clubs" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            Club Management
                        </Link>
                        <Link to="/admin/reports" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            Reports & Stats
                        </Link>
                        <Link to="/admin/audit-logs" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            Audit Logs
                        </Link>
                    </div>
                </div>

                {error && <ErrorBanner message={error} />}
                {success && <SuccessBanner message={success} />}

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 font-bold text-[#0b1c30] flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" /> System Users ({users.length})
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="p-3.5">Name</th>
                                        <th className="p-3.5">Email</th>
                                        <th className="p-3.5">Role</th>
                                        <th className="p-3.5">Registered At</th>
                                        <th className="p-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-[#f8f9ff]/60 transition-colors">
                                            <td className="p-3.5 font-semibold text-[#0b1c30]">{u.name}</td>
                                            <td className="p-3.5">{u.email}</td>
                                            <td className="p-3.5">
                                                {u.is_admin ? (
                                                    <span className="bg-[#ffdf9a]/40 text-[#5a4300] border border-[#eab308]/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                                        System Admin
                                                    </span>
                                                ) : (
                                                    <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                                                        User
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3.5">{new Date(u.created_at).toLocaleDateString()}</td>
                                            <td className="p-3.5 text-right flex justify-end gap-2">
                                                <button
                                                    disabled={updatingId === u.id}
                                                    onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                                                    className="px-3 py-1 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors disabled:opacity-50"
                                                >
                                                    {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                                                </button>
                                                <button
                                                    disabled={updatingId === u.id}
                                                    onClick={() => handleDeactivateUser(u.id)}
                                                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg border border-rose-200 transition-colors disabled:opacity-50"
                                                >
                                                    Deactivate
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default AdminUsers;
