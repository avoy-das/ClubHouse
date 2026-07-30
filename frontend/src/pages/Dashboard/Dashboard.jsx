import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import clubService from '../../services/clubService';
import eventService from '../../services/eventService';
import notificationService from '../../services/notificationService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';

const Dashboard = () => {
    const { user, isAdmin } = useAuth();
    const [myClubs, setMyClubs] = useState([]);
    const [myEvents, setMyEvents] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch clubs user is involved in
                const clubsRes = await clubService.list();
                const clubsList = clubsRes.data || clubsRes || [];

                // Fetch events
                const eventsRes = await eventService.listAll({ upcoming: true });
                const eventsList = eventsRes.data || eventsRes || [];

                // Fetch notifications
                const notifRes = await notificationService.list();
                const notifList = notifRes.data || notifRes || [];

                if (active) {
                    setMyClubs(Array.isArray(clubsList) ? clubsList.slice(0, 6) : []);
                    setMyEvents(Array.isArray(eventsList) ? eventsList.slice(0, 5) : []);
                    setNotifications(Array.isArray(notifList) ? notifList.slice(0, 5) : []);
                }
            } catch (err) {
                if (active) {
                    setError(err.response?.data?.message || 'Failed to load dashboard data');
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchDashboardData();
        return () => {
            active = false;
        };
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-800 to-indigo-900 rounded-xl shadow-lg p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}! 👋</h1>
                    <p className="text-blue-200 mt-1 text-sm md:text-base">
                        Here is an overview of your campus club memberships, upcoming events, and notifications.
                    </p>
                </div>
                <div className="flex space-x-3">
                    <Link to="/clubs">
                        <Button variant="primary" className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                            Browse All Clubs
                        </Button>
                    </Link>
                    {isAdmin() && (
                        <Link to="/admin/clubs">
                            <Button variant="secondary" className="bg-purple-700 hover:bg-purple-600 text-purple-100 border-0">
                                Admin Dashboard
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {error && <ErrorBanner message={error} />}

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Columns (Clubs & Events) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* My Clubs */}
                    <Card>
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span>🏛️</span> Active Campus Clubs
                            </h2>
                            <Link to="/clubs" className="text-sm text-blue-600 hover:underline font-medium">
                                View all →
                            </Link>
                        </div>
                        {myClubs.length === 0 ? (
                            <p className="text-gray-500 text-sm py-4">You are not a member of any clubs yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {myClubs.map((club) => (
                                    <Link key={club.id} to={`/clubs/${club.id}`} className="block group">
                                        <div className="border rounded-lg p-4 hover:shadow-md transition bg-gray-50 group-hover:bg-white">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                                                    {club.name?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                                                        {club.name}
                                                    </h3>
                                                    <span className="text-xs text-gray-500 capitalize">{club.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Upcoming Events */}
                    <Card>
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span>📅</span> Upcoming Events
                            </h2>
                        </div>
                        {myEvents.length === 0 ? (
                            <p className="text-gray-500 text-sm py-4">No upcoming events scheduled.</p>
                        ) : (
                            <div className="space-y-3">
                                {myEvents.map((evt) => (
                                    <div key={evt.id} className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 transition">
                                        <div>
                                            <Link to={`/clubs/${evt.club_id}/events/${evt.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                                                {evt.title}
                                            </Link>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                📍 {evt.venue || 'TBA'} • 🕒 {new Date(evt.start_at).toLocaleString()}
                                            </div>
                                        </div>
                                        {evt.status && <Badge status={evt.status} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column (Notifications & Quick Links) */}
                <div className="space-y-6">
                    {/* Unread Notifications */}
                    <Card>
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span>🔔</span> Recent Notifications
                            </h2>
                            <Link to="/notifications" className="text-xs text-blue-600 hover:underline">
                                View all
                            </Link>
                        </div>
                        {notifications.length === 0 ? (
                            <p className="text-gray-500 text-sm py-4">No recent notifications.</p>
                        ) : (
                            <div className="space-y-3">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`p-3 rounded border text-xs ${
                                            notif.is_read ? 'bg-gray-50 text-gray-600' : 'bg-blue-50 border-blue-200 text-blue-900 font-medium'
                                        }`}
                                    >
                                        <div className="font-semibold">{notif.title || notif.type}</div>
                                        <div className="mt-1">{notif.message}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Certificates & Direct Actions */}
                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                        <h3 className="font-bold text-lg text-white mb-2">🎓 Event Certificates</h3>
                        <p className="text-slate-300 text-xs mb-4">
                            Earn official event attendance certificates automatically upon event completion.
                        </p>
                        <Link to="/certificates">
                            <Button variant="primary" size="sm" className="w-full bg-blue-500 hover:bg-blue-600">
                                My Certificates →
                            </Button>
                        </Link>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
