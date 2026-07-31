import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';

const AdminReports = () => {
    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        const fetchReports = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await adminService.getOverviewReports();
                if (active) setReports(data.data || data);
            } catch (err) {
                if (active) setError(err.response?.data?.message || 'Failed to load report analytics');
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchReports();
        return () => {
            active = false;
        };
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin — Platform System Reports</h1>
                    <p className="text-gray-500 text-sm">System-wide metrics, club activity, and registration trends.</p>
                </div>
                <div className="flex space-x-3 text-sm">
                    <Link to="/admin/clubs" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700">
                        Club Management
                    </Link>
                    <Link to="/admin/users" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700">
                        User Directory
                    </Link>
                    <Link to="/admin/audit-logs" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700">
                        Audit Logs
                    </Link>
                </div>
            </div>

            {error && <ErrorBanner message={error} />}

            {reports && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <div className="text-xs uppercase tracking-wider font-semibold text-blue-100">Total Active Clubs</div>
                        <div className="text-4xl font-extrabold mt-2">{reports.total_clubs ?? reports.clubs_count ?? 0}</div>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <div className="text-xs uppercase tracking-wider font-semibold text-green-100">Total Registered Users</div>
                        <div className="text-4xl font-extrabold mt-2">{reports.total_users ?? reports.users_count ?? 0}</div>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <div className="text-xs uppercase tracking-wider font-semibold text-purple-100">Total Published Events</div>
                        <div className="text-4xl font-extrabold mt-2">{reports.total_events ?? reports.events_count ?? 0}</div>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                        <div className="text-xs uppercase tracking-wider font-semibold text-amber-100">Event Registrations</div>
                        <div className="text-4xl font-extrabold mt-2">{reports.total_registrations ?? reports.registrations_count ?? 0}</div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminReports;
