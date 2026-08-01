import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import notificationService from '../../services/notificationService';
import { getNotificationTargetUrl } from '../../utils/notificationUtils';

const Dashboard = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        api.get('/dashboard')
            .then((res) => {
                if (active) setDashboardData(res.data);
            })
            .catch((err) => {
                if (active) setError(err.response?.data?.message || 'Failed to load dashboard data');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const quickActions = [
        { label: 'Browse Events',     action: () => navigate('/events'), icon: '📅' },
        { label: 'Browse Clubs',      action: () => navigate('/clubs'), icon: '🏛️' },
        { label: 'Recruitment Drives', action: () => navigate('/recruitment'), icon: '🎯' },
        { label: 'My Certificates',   action: () => navigate('/certificates'), icon: '🎓' },
        { label: 'Request a Club',    action: () => navigate('/clubs/create'), icon: '➕' },
        ...(isAdmin()
            ? [{ label: 'Admin Suite', action: () => navigate('/admin/clubs'), icon: '⚡' }]
            : []),
    ];

    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const myClubs = dashboardData?.my_clubs || [];
    const upcomingEvents = dashboardData?.upcoming_events || [];
    const recentNotifications = dashboardData?.recent_notifications || [];
    const recentAnnouncements = dashboardData?.recent_announcements || [];
    const unreadCount = dashboardData?.unread_count || 0;

    return (
        <MainLayout>
            {/* Header banner */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 sm:p-8 rounded-2xl text-white shadow-md">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Welcome back, {user?.name}! 👋
                    </h1>
                    <p className="text-slate-300 text-sm mt-1">
                        Here's your central overview for campus clubs, events, and notifications.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/profile"
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors border border-white/20"
                    >
                        View Profile
                    </Link>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="py-12 text-center text-slate-400 font-medium animate-pulse">
                    Loading dashboard details...
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left 2 Columns */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* My Clubs */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <span>🏛️</span> My Clubs ({myClubs.length})
                                </h2>
                                <Link to="/clubs" className="text-xs font-semibold text-indigo-600 hover:underline">
                                    Explore More &rarr;
                                </Link>
                            </div>

                            {myClubs.length === 0 ? (
                                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-500 mb-2">You haven't joined any clubs yet.</p>
                                    <button
                                        onClick={() => navigate('/clubs')}
                                        className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors"
                                    >
                                        Browse Clubs Directory
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {myClubs.map((item) => {
                                        const club = item.club;
                                        if (!club) return null;
                                        return (
                                            <div
                                                key={item.id || club.id}
                                                onClick={() => navigate(`/clubs/${club.id}`)}
                                                className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between group"
                                            >
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                                                        {club.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">{club.category || club.department || 'General Club'}</p>
                                                    <span className="inline-block mt-2 text-[11px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded capitalize">
                                                        {item.role ? item.role.replace('_', ' ') : 'Member'}
                                                    </span>
                                                </div>
                                                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">&rarr;</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <span>📅</span> Upcoming Events
                                </h2>
                                <Link to="/events" className="text-xs font-semibold text-indigo-600 hover:underline">
                                    Browse Events &rarr;
                                </Link>
                            </div>

                            {upcomingEvents.length === 0 ? (
                                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-500 mb-2">You are not registered for any upcoming events.</p>
                                    <button
                                        onClick={() => navigate('/events')}
                                        className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors"
                                    >
                                        Explore Upcoming Events
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingEvents.map((reg) => {
                                        const event = reg.event;
                                        if (!event) return null;
                                        return (
                                            <div
                                                key={reg.id}
                                                onClick={() => navigate(`/events/${event.id}`)}
                                                className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 cursor-pointer transition-all flex items-center justify-between"
                                            >
                                                <div className="pr-2 min-w-0">
                                                    <h4 className="font-semibold text-slate-900 text-sm truncate">
                                                        {event.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                        <span className="text-indigo-600 font-medium">{event.club?.name}</span>
                                                        <span>&bull;</span>
                                                        <span>{formatDate(event.start_time || event.starts_at)}</span>
                                                    </div>
                                                </div>
                                                <span className="shrink-0 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                                                    Registered
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Recent Announcements */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <span>📢</span> Recent Club Announcements
                                </h2>
                                <Link to="/announcements" className="text-xs font-semibold text-indigo-600 hover:underline">
                                    View All &rarr;
                                </Link>
                            </div>

                            {recentAnnouncements.length === 0 ? (
                                <p className="text-sm text-slate-400 py-2">No recent announcements posted in your clubs.</p>
                            ) : (
                                <div className="space-y-3 divide-y divide-slate-100">
                                    {recentAnnouncements.map((anc) => (
                                        <div key={anc.id} className="pt-3 first:pt-0">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-bold text-indigo-600">{anc.club?.name}</span>
                                                <span className="text-slate-400">{new Date(anc.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <h4 className="font-semibold text-slate-900 text-sm">{anc.title}</h4>
                                            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{anc.body}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right 1 Column */}
                    <div className="space-y-6">

                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-base font-bold text-slate-900 mb-4">
                                Quick Actions
                            </h2>
                            <div className="grid grid-cols-2 gap-2.5">
                                {quickActions.map((item) => (
                                    <button
                                        key={item.label}
                                        onClick={item.action}
                                        className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all gap-1.5"
                                    >
                                        <span className="text-base">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recent Notifications */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <span>🔔</span> Notifications
                                </h2>
                                {unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>

                            {recentNotifications.length === 0 ? (
                                <p className="text-sm text-slate-400 py-2">No notifications yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {recentNotifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => {
                                                if (!notif.is_read) {
                                                    notificationService.markRead(notif.id).catch(() => {});
                                                }
                                                navigate(getNotificationTargetUrl(notif));
                                            }}
                                            className={`p-3 rounded-lg border text-xs cursor-pointer transition hover:shadow-sm ${
                                                notif.is_read ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-blue-50 border-blue-200 font-medium hover:bg-blue-100/70'
                                            }`}
                                        >
                                            <div className="font-semibold text-slate-900">{notif.title || notif.type}</div>
                                            <div className="text-slate-600 line-clamp-2 mt-0.5">{notif.message}</div>
                                            <div className="text-[10px] text-slate-400 mt-1">{new Date(notif.created_at).toLocaleString()}</div>
                                        </div>
                                    ))}
                                    <Link
                                        to="/notifications"
                                        className="block text-center text-xs font-semibold text-indigo-600 hover:underline pt-2"
                                    >
                                        View All Notifications &rarr;
                                    </Link>
                                </div>
                            )}
                        </div>

                    </div>

                </div>
            )}
        </MainLayout>
    );
};

export default Dashboard;
