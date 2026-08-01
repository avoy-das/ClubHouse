import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import adminService from '../../services/adminService';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';

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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin — User Directory</h1>
                        <p className="text-gray-500 text-sm">View registered users and manage admin privileges or access.</p>
                    </div>
                    <div className="flex space-x-3 text-sm">
                        <Link to="/admin/clubs" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700">
                            Club Management
                        </Link>
                        <Link to="/admin/reports" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700">
                            Reports & Stats
                        </Link>
                        <Link to="/admin/audit-logs" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700">
                            Audit Logs
                        </Link>
                    </div>
                </div>

                {error && <ErrorBanner message={error} />}
                {success && <SuccessBanner message={success} />}

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                        <div className="p-4 border-b font-bold text-gray-800">System Users ({users.length})</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Email</th>
                                        <th className="p-3">Role</th>
                                        <th className="p-3">Registered At</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td className="p-3 font-semibold text-gray-900">{u.name}</td>
                                            <td className="p-3">{u.email}</td>
                                            <td className="p-3">
                                                {u.is_admin ? (
                                                    <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded font-bold">
                                                        System Admin
                                                    </span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded">
                                                        User
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    disabled={updatingId === u.id}
                                                    onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                                                >
                                                    {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    disabled={updatingId === u.id}
                                                    onClick={() => handleDeactivateUser(u.id)}
                                                >
                                                    Deactivate
                                                </Button>
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
