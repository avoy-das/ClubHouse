import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import notificationService from '../../services/notificationService';
import { getNotificationTargetUrl } from '../../utils/notificationUtils';
import { Calendar, Building2, Target, GraduationCap, Plus, Shield, Bell, Megaphone, ArrowRight, User } from 'lucide-react';

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
        { label: 'Browse Events',     action: () => navigate('/events'), icon: Calendar },
        { label: 'Browse Clubs',      action: () => navigate('/clubs'), icon: Building2 },
        { label: 'Recruitment Drives', action: () => navigate('/recruitment'), icon: Target },
        { label: 'My Certificates',   action: () => navigate('/certificates'), icon: GraduationCap },
        { label: 'Request a Club',    action: () => navigate('/clubs/create'), icon: Plus },
        ...(isAdmin()
            ? [{ label: 'Admin Suite', action: () => navigate('/admin/clubs'), icon: Shield }]
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
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#1c1b1b] p-6 sm:p-8 rounded-3xl text-white shadow-xs border border-[#30312e]">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 font-heading">
                        Welcome back, {user?.name}
                    </h1>
                    <p className="text-[#cbc6bd] text-xs sm:text-sm mt-1 font-sans">
                        Here's your central portal overview for campus clubs, events, and notifications.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/profile"
                        className="px-4 py-2 bg-[#e8e2d9] hover:bg-[#dbdad5] text-[#1d1b16] rounded-full text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
                    >
                        <User className="w-4 h-4 text-[#615e57]" />
                        View Profile
                    </Link>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb59f] rounded-2xl text-sm font-semibold">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="py-12 text-center text-[#615e57] font-medium animate-pulse">
                    Loading dashboard details...
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left 2 Columns */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* My Clubs */}
                        <div className="bg-white rounded-2xl border border-[#e4e2dd] p-6 shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-[#1b1c19] flex items-center gap-2 font-heading">
                                    <Building2 className="w-5 h-5 text-[#d95e36]" /> My Clubs ({myClubs.length})
                                </h2>
                                <Link to="/clubs" className="text-xs font-bold text-[#1c1b1b] hover:text-[#d95e36] flex items-center gap-1">
                                    Explore More <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            {myClubs.length === 0 ? (
                                <div className="text-center py-6 bg-[#f5f3ee] rounded-2xl border border-dashed border-[#cbc6bd]">
                                    <p className="text-xs text-[#615e57] mb-3">You haven't joined any clubs yet.</p>
                                    <button
                                        onClick={() => navigate('/clubs')}
                                        className="px-4 py-2 bg-[#1c1b1b] text-white text-xs font-bold rounded-full hover:bg-[#30312e] transition-colors shadow-xs"
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
                                                className="p-4 bg-[#f5f3ee] border border-[#e4e2dd] rounded-2xl hover:border-[#1c1b1b] hover:shadow-xs cursor-pointer transition-all flex items-center justify-between group"
                                            >
                                                <div>
                                                    <h3 className="font-bold text-[#1b1c19] text-sm group-hover:text-[#d95e36] transition-colors font-heading">
                                                        {club.name}
                                                    </h3>
                                                    <p className="text-xs text-[#615e57] mt-0.5">{club.category || club.department || 'General Club'}</p>
                                                    <span className="inline-block mt-2 text-[11px] font-bold text-[#1d1b16] bg-[#e8e2d9] px-2.5 py-0.5 rounded-full capitalize">
                                                        {item.role ? item.role.replace('_', ' ') : 'Member'}
                                                    </span>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-[#615e57] group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-white rounded-2xl border border-[#e4e2dd] p-6 shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-[#1b1c19] flex items-center gap-2 font-heading">
                                    <Calendar className="w-5 h-5 text-[#d95e36]" /> Upcoming Events
                                </h2>
                                <Link to="/events" className="text-xs font-bold text-[#1c1b1b] hover:text-[#d95e36] flex items-center gap-1">
                                    Browse Events <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            {upcomingEvents.length === 0 ? (
                                <div className="text-center py-6 bg-[#f5f3ee] rounded-2xl border border-dashed border-[#cbc6bd]">
                                    <p className="text-xs text-[#615e57] mb-3">You are not registered for any upcoming events.</p>
                                    <button
                                        onClick={() => navigate('/events')}
                                        className="px-4 py-2 bg-[#1c1b1b] text-white text-xs font-bold rounded-full hover:bg-[#30312e] transition-colors shadow-xs"
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
                                                className="p-3.5 bg-[#f5f3ee] border border-[#e4e2dd] rounded-2xl hover:border-[#1c1b1b] cursor-pointer transition-all flex items-center justify-between"
                                            >
                                                <div className="pr-2 min-w-0">
                                                    <h4 className="font-bold text-[#1b1c19] text-sm truncate font-heading">
                                                        {event.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-xs text-[#615e57] mt-1">
                                                        <span className="text-[#d95e36] font-semibold">{event.club?.name}</span>
                                                        <span>&bull;</span>
                                                        <span>{formatDate(event.start_time || event.starts_at)}</span>
                                                    </div>
                                                </div>
                                                <span className="shrink-0 text-xs font-bold text-[#1d1b16] bg-[#e8e2d9] px-3 py-1 rounded-full border border-[#cbc6bd]">
                                                    Registered
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Recent Announcements */}
                        <div className="bg-white rounded-2xl border border-[#e4e2dd] p-6 shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-[#1b1c19] flex items-center gap-2 font-heading">
                                    <Megaphone className="w-5 h-5 text-[#d95e36]" /> Recent Announcements
                                </h2>
                                <Link to="/announcements" className="text-xs font-bold text-[#1c1b1b] hover:text-[#d95e36] flex items-center gap-1">
                                    View All <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            {recentAnnouncements.length === 0 ? (
                                <p className="text-xs text-[#615e57] py-2">No recent announcements posted in your clubs.</p>
                            ) : (
                                <div className="space-y-3 divide-y divide-[#f0eee9]">
                                    {recentAnnouncements.map((anc) => (
                                        <div key={anc.id} className="pt-3 first:pt-0">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-bold text-[#d95e36]">{anc.club?.name}</span>
                                                <span className="text-[#615e57]">{new Date(anc.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <h4 className="font-bold text-[#1b1c19] text-sm font-heading">{anc.title}</h4>
                                            <p className="text-xs text-[#444748] line-clamp-2 mt-0.5">{anc.body}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right 1 Column */}
                    <div className="space-y-6">

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl border border-[#e4e2dd] p-6 shadow-xs">
                            <h2 className="text-base font-bold text-[#1b1c19] mb-4 font-heading">
                                Quick Actions
                            </h2>
                            <div className="grid grid-cols-2 gap-2.5">
                                {quickActions.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.label}
                                            onClick={item.action}
                                            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#f5f3ee] border border-[#e4e2dd] text-xs font-semibold text-[#1b1c19] hover:bg-[#e8e2d9] hover:border-[#1c1b1b] transition-all gap-2"
                                        >
                                            <Icon className="w-5 h-5 text-[#d95e36]" />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Notifications */}
                        <div className="bg-white rounded-2xl border border-[#e4e2dd] p-6 shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-[#1b1c19] flex items-center gap-2 font-heading">
                                    <Bell className="w-5 h-5 text-[#d95e36]" /> Notifications
                                </h2>
                                {unreadCount > 0 && (
                                    <span className="bg-[#ba1a1a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>

                            {recentNotifications.length === 0 ? (
                                <p className="text-xs text-[#615e57] py-2">No notifications yet.</p>
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
                                            className={`p-3 rounded-2xl border text-xs cursor-pointer transition hover:shadow-xs ${
                                                notif.is_read ? 'bg-[#f5f3ee] border-[#e4e2dd] hover:bg-[#eae8e3]' : 'bg-[#ffdbd0]/40 border-[#ffb59f] font-semibold hover:bg-[#ffdbd0]/70'
                                            }`}
                                        >
                                            <div className="font-bold text-[#1b1c19]">{notif.title || notif.type}</div>
                                            <div className="text-[#444748] line-clamp-2 mt-0.5">{notif.message}</div>
                                            <div className="text-[10px] text-[#615e57] mt-1">{new Date(notif.created_at).toLocaleString()}</div>
                                        </div>
                                    ))}
                                    <Link
                                        to="/notifications"
                                        className="block text-center text-xs font-bold text-[#d95e36] hover:underline pt-2"
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
