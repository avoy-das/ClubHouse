import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import notificationService from '../../services/notificationService';
import announcementService from '../../services/announcementService';
import { getNotificationTargetUrl, isAnnouncementNotification } from '../../utils/notificationUtils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Modal from '../../components/ui/Modal';
import { Bell, CheckCheck, ArrowRight, Check, Megaphone, Calendar, User, Building2 } from 'lucide-react';

const NotificationList = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dialog state for Announcement notifications
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [isDialogLoading, setIsDialogLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const loadNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await notificationService.list();
            const list = res.notifications || res.data || res;
            setNotifications(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleMarkRead = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            await notificationService.markRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark notification as read');
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            handleMarkRead(notif.id);
        }

        if (isAnnouncementNotification(notif)) {
            // Show dialog box instead of redirecting!
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
                    // Fall back to notification content if fetching fails
                } finally {
                    setIsDialogLoading(false);
                }
            } else {
                setIsDialogLoading(false);
            }
            return;
        }

        const targetUrl = getNotificationTargetUrl(notif);
        navigate(targetUrl);
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark all notifications as read');
        }
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                            <Bell className="w-6 h-6 text-blue-600" /> Notifications
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">
                            System updates, announcements, and activity alerts. Click an announcement to view details.
                        </p>
                    </div>
                    {notifications.some((n) => !n.is_read) && (
                        <button
                            onClick={handleMarkAllRead}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300"
                        >
                            <CheckCheck className="w-4 h-4 text-blue-600" /> Mark All as Read
                        </button>
                    )}
                </div>

                {error && <ErrorBanner message={error} />}

                {loading ? (
                    <LoadingSpinner />
                ) : notifications.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-xl shadow-xs border border-slate-200 text-slate-500">
                        <p className="text-base font-medium">No notifications found.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                        {notifications.map((notif) => {
                            const isAnnounce = isAnnouncementNotification(notif);

                            return (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-4 flex items-start justify-between cursor-pointer transition hover:bg-slate-50 ${
                                        notif.is_read ? 'bg-white' : 'bg-[#eff4ff]/60 border-l-4 border-l-[#2563eb]'
                                    }`}
                                >
                                    <div className="space-y-1 pr-4">
                                        <div className="flex items-center space-x-2">
                                            {!notif.is_read && (
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] inline-block" />
                                            )}
                                            {isAnnounce && <Megaphone className="w-4 h-4 text-amber-500 shrink-0" />}
                                            <h4 className="font-bold text-[#0b1c30] text-sm">{notif.title || notif.type}</h4>
                                        </div>
                                        <p className="text-slate-700 text-sm pl-4.5">{notif.message}</p>
                                        <span className="text-xs text-slate-400 pl-4.5 block">
                                            {new Date(notif.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 shrink-0">
                                        {!notif.is_read && (
                                            <button
                                                onClick={(e) => handleMarkRead(notif.id, e)}
                                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                                            >
                                                <Check className="w-3.5 h-3.5 text-blue-600" /> Read
                                            </button>
                                        )}
                                        <ArrowRight className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

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

export default NotificationList;
