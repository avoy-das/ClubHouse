import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import adminService from '../../services/adminService';
import clubService from '../../services/clubService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Shield, BarChart2, Building2, Users, Calendar, Award } from 'lucide-react';

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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                            <Shield className="w-6 h-6 text-amber-500" /> Admin — Platform System Reports
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">System-wide metrics, club activity, and registration trends.</p>
                    </div>
                    <div className="flex space-x-2 text-xs font-semibold">
                        <Link to="/admin/clubs" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            Club Management
                        </Link>
                        <Link to="/admin/users" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            User Directory
                        </Link>
                        <Link to="/admin/audit-logs" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
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
                                <div className="bg-[#0f172a] text-white p-6 rounded-2xl shadow-xs border border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs uppercase tracking-wider font-semibold text-[#eab308]">Total Active Clubs</div>
                                        <Building2 className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="text-3xl font-extrabold mt-3">{reports.total_clubs ?? reports.clubs_count ?? 0}</div>
                                </div>

                                <div className="bg-white text-[#0b1c30] p-6 rounded-2xl shadow-xs border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">Registered Users</div>
                                        <Users className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="text-3xl font-extrabold mt-3">{reports.total_users ?? reports.users_count ?? 0}</div>
                                </div>

                                <div className="bg-white text-[#0b1c30] p-6 rounded-2xl shadow-xs border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">Published Events</div>
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="text-3xl font-extrabold mt-3">{reports.total_events ?? reports.events_count ?? 0}</div>
                                </div>

                                <div className="bg-white text-[#0b1c30] p-6 rounded-2xl shadow-xs border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">Event Registrations</div>
                                        <Award className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div className="text-3xl font-extrabold mt-3">{reports.total_registrations ?? reports.registrations_count ?? 0}</div>
                                </div>
                            </div>
                        )}

                        {/* Per-Club Detailed Report Inspector */}
                        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
                            <h2 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
                                <BarChart2 className="w-5 h-5 text-blue-600" /> Per-Club Detailed Analytics
                            </h2>
                            <div className="max-w-xs">
                                <select
                                    value={selectedClubId}
                                    onChange={(e) => handleSelectClub(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] bg-[#f8f9ff]"
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
                                    <div className="p-4 bg-[#f8f9ff] rounded-xl border border-slate-200/80">
                                        <div className="text-xs text-slate-500 font-medium">Club Members</div>
                                        <div className="text-2xl font-bold text-[#0b1c30] mt-1">{clubReport.total_members}</div>
                                    </div>
                                    <div className="p-4 bg-[#f8f9ff] rounded-xl border border-slate-200/80">
                                        <div className="text-xs text-slate-500 font-medium">Total Events</div>
                                        <div className="text-2xl font-bold text-[#0b1c30] mt-1">{clubReport.total_events}</div>
                                    </div>
                                    <div className="p-4 bg-[#f8f9ff] rounded-xl border border-slate-200/80">
                                        <div className="text-xs text-slate-500 font-medium">Upcoming Events</div>
                                        <div className="text-2xl font-bold text-[#0b1c30] mt-1">{clubReport.upcoming_events}</div>
                                    </div>
                                    <div className="p-4 bg-[#f8f9ff] rounded-xl border border-slate-200/80">
                                        <div className="text-xs text-slate-500 font-medium">Total Registrations</div>
                                        <div className="text-2xl font-bold text-[#0b1c30] mt-1">{clubReport.total_registrations}</div>
                                    </div>
                                    <div className="p-4 bg-[#f8f9ff] rounded-xl border border-slate-200/80">
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
