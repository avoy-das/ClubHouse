import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import adminService from '../../services/adminService';
import clubService from '../../services/clubService';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';

const AdminReports = () => {
    const [reports, setReports] = useState(null);
    const [clubs, setClubs] = useState([]);
    const [selectedClubId, setSelectedClubId] = useState('');
    const [clubReport, setClubReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clubReportLoading, setClubReportLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [overviewData, clubsData] = await Promise.all([
                    adminService.getOverviewReports(),
                    clubService.adminGetClubs(),
                ]);
                if (active) {
                    setReports(overviewData.data || overviewData);
                    setClubs(clubsData.data || clubsData || []);
                }
            } catch (err) {
                if (active) setError(err.response?.data?.message || 'Failed to load report analytics');
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchData();
        return () => {
            active = false;
        };
    }, []);

    const handleSelectClub = async (clubId) => {
        setSelectedClubId(clubId);
        if (!clubId) {
            setClubReport(null);
            return;
        }
        setClubReportLoading(true);
        try {
            const data = await adminService.getClubReport(clubId);
            setClubReport(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load club report');
        } finally {
            setClubReportLoading(false);
        }
    };

    return (
        <MainLayout>
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

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
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

                        {/* Per-Club Detailed Report Inspector */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                            <h2 className="text-lg font-bold text-gray-800">Per-Club Detailed Analytics</h2>
                            <div className="max-w-xs">
                                <select
                                    value={selectedClubId}
                                    onChange={(e) => handleSelectClub(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                >
                                    <option value="">-- Select a Club --</option>
                                    {clubs.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.category || 'General'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {clubReportLoading && <LoadingSpinner />}

                            {clubReport && !clubReportLoading && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t">
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500 font-medium">Club Members</div>
                                        <div className="text-2xl font-bold text-slate-900 mt-1">{clubReport.total_members}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500 font-medium">Total Events</div>
                                        <div className="text-2xl font-bold text-slate-900 mt-1">{clubReport.total_events}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500 font-medium">Upcoming Events</div>
                                        <div className="text-2xl font-bold text-slate-900 mt-1">{clubReport.upcoming_events}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500 font-medium">Total Registrations</div>
                                        <div className="text-2xl font-bold text-slate-900 mt-1">{clubReport.total_registrations}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500 font-medium">Avg Attendance Rate</div>
                                        <div className="text-2xl font-bold text-emerald-600 mt-1">{clubReport.avg_attendance_rate}%</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </MainLayout>
    );
};

export default AdminReports;
