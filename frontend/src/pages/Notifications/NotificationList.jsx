import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import notificationService from '../../services/notificationService';
import { getNotificationTargetUrl } from '../../utils/notificationUtils';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Bell, CheckCheck, ArrowRight, Check } from 'lucide-react';

const NotificationList = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                        <p className="text-slate-500 text-sm mt-0.5">System updates, membership approvals, and event alerts. Click any item to navigate.</p>
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
                        {notifications.map((notif) => (
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
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default NotificationList;
