import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();

    const quickActions = [
        { label: 'Browse Clubs',      action: () => navigate('/clubs') },
        { label: 'Request a Club',    action: () => navigate('/clubs/create') },
        ...(isAdmin()
            ? [{ label: 'Admin Panel', action: () => navigate('/admin/clubs') }]
            : []),
    ];

    return (
        <MainLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">
                    Welcome back, {user?.name}
                </h1>
                <p className="text-slate-500 mt-1">
                    Here's what's happening on ClubHouse.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* My Clubs — placeholder until Week 5 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-semibold text-slate-800 mb-4">
                        My Clubs
                    </h2>
                    <p className="text-sm text-slate-400">
                        Your club memberships will appear here once the memberships module is built.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-semibold text-slate-800 mb-4">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {quickActions.map((item) => (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className="flex items-center justify-center px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Announcements — placeholder until Week 6 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-semibold text-slate-800 mb-4">
                        Recent Announcements
                    </h2>
                    <p className="text-sm text-slate-400">
                        Announcements from your clubs will appear here.
                    </p>
                </div>

                {/* Upcoming Events — placeholder until Week 4 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-semibold text-slate-800 mb-4">
                        Upcoming Events
                    </h2>
                    <p className="text-sm text-slate-400">
                        Events you're registered for will appear here.
                    </p>
                </div>

            </div>
        </MainLayout>
    );
};

export default Dashboard;