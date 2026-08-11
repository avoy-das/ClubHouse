import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import notificationService from '../../services/notificationService';
import announcementService from '../../services/announcementService';
import { getNotificationTargetUrl, isAnnouncementNotification } from '../../utils/notificationUtils';
import { formatDisplayDateTime } from '../../utils/dateUtils';
import { getImageUrl } from '../../utils/imageUrl';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Calendar, Building2, Target, GraduationCap, Plus, Shield, Bell, Megaphone, ArrowRight, User } from 'lucide-react';

const Dashboard = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Announcement Modal state
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [isDialogLoading, setIsDialogLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
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

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            notificationService.markRead(notif.id).catch(() => { });
        }

        if (isAnnouncementNotification(notif)) {
            setIsDialogOpen(true);
            setIsDialogLoading(true);
            setSelectedAnnouncement({
                title: notif.title || 'Announcement',
                body: notif.message,
                created_at: notif.created_at,
            });

            if (notif.related_id) {
                try {
                    const announcementData = await announcementService.show(notif.related_id);
                    if (announcementData) {
                        setSelectedAnnouncement(announcementData);
                    }
                } catch {
                    // Fall back to notification message
                } finally {
                    setIsDialogLoading(false);
                }
            } else {
                setIsDialogLoading(false);
            }
            return;
        }

        navigate(getNotificationTargetUrl(notif));
    };

    const stats = dashboardData?.stats || {
        joined_clubs: 0,
        upcoming_events: 0,
        pending_requests: 0,
    };
    const clubs = dashboardData?.clubs || [];
    const events = dashboardData?.upcoming_events || [];
    const recentNotifications = dashboardData?.recent_notifications || [];
    const unreadCount = dashboardData?.unread_notifications_count || 0;

    return (
        <MainLayout>
            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <div className="bg-[#ffdbd0] text-[#ba1a1a] p-4 rounded-xl text-sm font-semibold">{error}</div>
            ) : (
                <div className="space-y-8">
                    {/* Welcome Banner */}
                    <div className="bg-gradient-to-r from-[#1c1b1b] to-[#30312e] rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-[#ffb59f] backdrop-blur-sm">
                                <GraduationCap className="w-4 h-4" /> Student Portal
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
                                Welcome , {user?.name}!
                            </h1>
                            <p className="text-sm text-gray-300">
                                Here's your central portal overview for campus clubs, events, and notifications.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                to="/clubs"
                                className="px-4 py-2.5 bg-white text-[#1c1b1b] hover:bg-gray-100 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                            >
                                <Building2 className="w-4 h-4" /> Explore Clubs
                            </Link>
                            <Link
                                to="/events"
                                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-sm flex items-center gap-2 border border-white/15"
                            >
                                <Calendar className="w-4 h-4" /> View Events
                            </Link>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className={`grid grid-cols-1 ${isAdmin() ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
                        <div className="bg-white p-5 rounded-2xl border border-[#e4e2dd] shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#e8e2d9] text-[#1c1b1b] flex items-center justify-center font-bold">
                                <Building2 className="w-6 h-6 text-[#1c1b1b]" />
                            </div>
                            <div>
                                <div className="text-2xl font-extrabold text-[#1b1c19] font-heading">{stats.joined_clubs}</div>
                                <div className="text-xs font-semibold text-[#615e57]">Joined Clubs</div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-[#e4e2dd] shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#e8e2d9] text-[#1c1b1b] flex items-center justify-center font-bold">
                                <Calendar className="w-6 h-6 text-[#1c1b1b]" />
                            </div>
                            <div>
                                <div className="text-2xl font-extrabold text-[#1b1c19] font-heading">{stats.upcoming_events}</div>
                                <div className="text-xs font-semibold text-[#615e57]">Upcoming Events</div>
                            </div>
                        </div>

                        {isAdmin() && (
                            <div className="bg-white p-5 rounded-2xl border border-[#e4e2dd] shadow-xs flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#e8e2d9] text-[#1c1b1b] flex items-center justify-center font-bold">
                                    <Target className="w-6 h-6 text-[#1c1b1b]" />
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-[#1b1c19] font-heading">{stats.pending_requests}</div>
                                    <div className="text-xs font-semibold text-[#615e57]">Pending Approvals</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Column (2 cols) */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* My Clubs */}
                            <div className="bg-white rounded-2xl border border-[#e4e2dd] p-6 shadow-xs space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-[#1b1c19] flex items-center gap-2 font-heading">
                                        <Building2 className="w-5 h-5 text-[#ba3d15]" /> My Clubs
                                    </h2>
                                    <Link to="/clubs" aria-label="View all clubs" className="text-xs font-bold text-[#ba3d15] hover:underline flex items-center gap-1">
                                        View All <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>

                                {clubs.length === 0 ? (
                                    <div className="p-6 text-center bg-[#f5f3ee] rounded-xl border border-dashed border-[#cbc6bd] space-y-2">
                                        <p className="text-xs font-semibold text-[#615e57]">You haven't joined any clubs yet.</p>
                                        <Link
                                            to="/clubs"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1b1b] text-white text-xs font-bold rounded-lg hover:bg-[#30312e] transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Join a Club
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {clubs.map((c) => (
                                            <Link
                                                key={c.id}
                                                to={`/clubs/${c.id}`}
                                                aria-label={`View ${c.name} club details`}
                                                className="p-4 rounded-xl border border-[#e4e2dd] bg-[#f5f3ee] hover:bg-[#eae8e3] transition-colors flex items-center gap-3 group"
                                            >
                                                <div className="w-10 h-10 bg-[#1c1b1b] text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                                                    {getImageUrl(c.logo_url || c.logo_path) ? (
                                                        <img src={getImageUrl(c.logo_url || c.logo_path)} alt={c.name} loading="lazy" decoding="async" width="40" height="40" className="w-full h-full object-cover rounded-lg" />
                                                    ) : (
                                                        c.name?.charAt(0) || 'C'
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-xs text-[#1b1c19] truncate group-hover:text-[#ba3d15] transition-colors">
                                                        {c.name}
                                                    </div>
                                                    <div className="text-[11px] text-[#615e57] capitalize">{c.pivot?.role || 'Member'}</div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Upcoming Events */}
                            <div className="bg-white rounded-2xl border border-[#e4e2dd] p-6 shadow-xs space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-[#1b1c19] flex items-center gap-2 font-heading">
                                        <Calendar className="w-5 h-5 text-[#ba3d15]" /> Upcoming Campus Events
                                    </h2>
                                    <Link to="/events" aria-label="View all events" className="text-xs font-bold text-[#ba3d15] hover:underline flex items-center gap-1">
                                        View All <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>

                                 {events.length === 0 ? (
                                    <p className="text-xs text-[#615e57]">No upcoming events scheduled.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {events.map((ev) => {
                                            const bannerUrl = getImageUrl(ev.banner_url || ev.banner_path);
                                            return (
                                                <Link
                                                    key={ev.id}
                                                    to={`/events/${ev.id}`}
                                                    aria-label={`View event details for ${ev.title}`}
                                                    className="p-3.5 rounded-xl border border-[#e4e2dd] hover:border-[#cbc6bd] hover:shadow-xs transition-all flex items-center gap-3.5 group bg-white"
                                                >
                                                    {bannerUrl ? (
                                                        <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 aspect-[5/4]">
                                                            <img src={bannerUrl} alt={ev.title} loading="lazy" decoding="async" width="80" height="64" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-20 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 shrink-0 flex items-center justify-center text-white/50">
                                                            <Calendar className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <h3 className="text-sm font-bold text-[#1b1c19] truncate group-hover:text-[#2563eb] transition-colors">{ev.title}</h3>
                                                        <p className="text-xs text-[#615e57] line-clamp-1">{ev.description || 'No description provided.'}</p>
                                                        <div className="flex items-center gap-2 text-[11px] text-[#615e57] pt-0.5 flex-wrap">
                                                            <span className="font-semibold text-[#ba3d15]">
                                                                {formatDisplayDateTime(ev.starts_at || ev.start_time)}
                                                            </span>
                                                            {ev.location && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="truncate max-w-[120px]">{ev.location}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                        {ev.is_registered && (
                                                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                                                Registered
                                                            </span>
                                                        )}
                                                        {ev.club && (
                                                            <span className="px-2.5 py-0.5 bg-[#e8e2d9] text-[#1b1c19] text-[10px] font-bold rounded-full max-w-[100px] truncate">
                                                                {ev.club.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Sidebar Column */}
                        <div className="space-y-6">
                            {/* Recent Notifications */}
                            <div className="bg-white rounded-2xl border border-[#e4e2dd] p-6 shadow-xs">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-bold text-[#1b1c19] flex items-center gap-2 font-heading">
                                        <Bell className="w-5 h-5 text-[#ba3d15]" /> Notifications
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
                                        {recentNotifications.map((notif) => {
                                            const isAnnounce = isAnnouncementNotification(notif);
                                            return (
                                                <div
                                                    key={notif.id}
                                                    onClick={() => handleNotificationClick(notif)}
                                                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition hover:shadow-xs ${notif.is_read
                                                            ? 'bg-[#f5f3ee] border-[#e4e2dd] hover:bg-[#eae8e3]'
                                                            : 'bg-[#ffdbd0]/40 border-[#ffb59f] font-semibold hover:bg-[#ffdbd0]/70'
                                                        }`}
                                                >
                                                    <div className="font-bold text-[#1b1c19] flex items-center gap-1.5">
                                                        {isAnnounce && <Megaphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                                        <span>{notif.title || notif.type}</span>
                                                    </div>
                                                    <div className="text-[#444748] line-clamp-2 mt-0.5">{notif.message}</div>
                                                    <div className="text-[10px] text-[#615e57] mt-1">
                                                        {new Date(notif.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <Link
                                            to="/notifications"
                                            aria-label="View all notifications"
                                            className="block text-center text-xs font-bold text-[#ba3d15] hover:underline pt-2"
                                        >
                                            View All Notifications &rarr;
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Announcement Dialog Box Modal */}
            <Modal
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                title="Announcement Details"
            >
                {isDialogLoading ? (
                    <div className="py-8">
                        <LoadingSpinner />
                    </div>
                ) : selectedAnnouncement ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700">
                                <Megaphone className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-[#0b1c30]">
                                    {selectedAnnouncement.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    {selectedAnnouncement.author && (
                                        <span className="flex items-center gap-1">
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                            {selectedAnnouncement.author.name}
                                        </span>
                                    )}
                                    {(selectedAnnouncement.club?.name || selectedAnnouncement.target_club?.name) && (
                                        <span className="flex items-center gap-1">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            {selectedAnnouncement.club?.name || selectedAnnouncement.target_club?.name}
                                        </span>
                                    )}
                                    {selectedAnnouncement.created_at && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {new Date(selectedAnnouncement.created_at).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                                {selectedAnnouncement.body}
                            </p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setIsDialogOpen(false)}
                                className="px-4 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </MainLayout>
    );
};

export default Dashboard;
