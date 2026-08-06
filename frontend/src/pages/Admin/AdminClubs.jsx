import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clubService from '../../services/clubService';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';

const AdminClubs = () => {
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [actionId, setActionId] = useState(null);

    const loadClubs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await clubService.list({ all: true });
            const list = data.data || data;
            setClubs(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load clubs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClubs();
    }, []);

    const handleApprove = async (id) => {
        setActionId(id);
        setError(null);
        setSuccess(null);
        try {
            await clubService.approve(id);
            setSuccess('Club approved successfully.');
            loadClubs();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve club.');
        } finally {
            setActionId(null);
        }
    };

    const handleSuspend = async (id) => {
        setActionId(id);
        setError(null);
        setSuccess(null);
        try {
            await clubService.suspend(id);
            setSuccess('Club suspended.');
            loadClubs();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to suspend club.');
        } finally {
            setActionId(null);
        }
    };

    const handleActivate = async (id) => {
        setActionId(id);
        setError(null);
        setSuccess(null);
        try {
            await clubService.adminActivate(id);
            setSuccess('Club activated successfully.');
            loadClubs();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to activate club.');
        } finally {
            setActionId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this club?')) return;
        setActionId(id);
        setError(null);
        setSuccess(null);
        try {
            await clubService.remove(id);
            setSuccess('Club deleted.');
            loadClubs();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete club.');
        } finally {
            setActionId(null);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin — Club Approval</h1>
                    <p className="text-gray-500 text-sm">Approve pending club creations, suspend, or delete clubs.</p>
                </div>
                <div className="flex space-x-3 text-sm">
                    <Link to="/admin/users" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700">
                        User Directory
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

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4 border-b font-bold text-gray-800">System Clubs ({clubs.length})</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                            <tr>
                                <th className="p-3">Club Name</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Created At</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {clubs.map((c) => (
                                <tr key={c.id}>
                                    <td className="p-3 font-semibold text-gray-900">
                                        <Link to={`/clubs/${c.id}`} className="hover:text-blue-600">
                                            {c.name}
                                        </Link>
                                    </td>
                                    <td className="p-3 capitalize">{c.category}</td>
                                    <td className="p-3">
                                        <Badge status={c.status} />
                                    </td>
                                    <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 text-right space-x-2">
                                        {c.status === 'pending' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                disabled={actionId === c.id}
                                                onClick={() => handleApprove(c.id)}
                                            >
                                                Approve
                                            </Button>
                                        )}
                                        {c.status === 'approved' && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                disabled={actionId === c.id}
                                                onClick={() => handleSuspend(c.id)}
                                            >
                                                Suspend
                                            </Button>
                                        )}
                                        {c.status === 'suspended' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                disabled={actionId === c.id}
                                                onClick={() => handleActivate(c.id)}
                                            >
                                                Activate
                                            </Button>
                                        )}
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            disabled={actionId === c.id}
                                            onClick={() => handleDelete(c.id)}
                                        >
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminClubs;
