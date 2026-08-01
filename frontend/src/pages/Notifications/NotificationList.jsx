import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import notificationService from '../../services/notificationService';
import { getNotificationTargetUrl } from '../../utils/notificationUtils';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';

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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                        <p className="text-gray-500 text-sm">System updates, membership approvals, and event alerts. Click any item to navigate.</p>
                    </div>
                    {notifications.some((n) => !n.is_read) && (
                        <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                            ✓ Mark All as Read
                        </Button>
                    )}
                </div>

                {error && <ErrorBanner message={error} />}

                {loading ? (
                    <LoadingSpinner />
                ) : notifications.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-lg shadow-sm border text-gray-500">
                        <p className="text-lg font-medium">No notifications found.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border divide-y">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-4 flex items-start justify-between cursor-pointer transition hover:bg-slate-50 ${
                                    notif.is_read ? 'bg-white' : 'bg-blue-50/70 border-l-4 border-l-blue-600'
                                }`}
                            >
                                <div className="space-y-1 pr-4">
                                    <div className="flex items-center space-x-2">
                                        {!notif.is_read && (
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                                        )}
                                        <h4 className="font-bold text-gray-900 text-sm">{notif.title || notif.type}</h4>
                                    </div>
                                    <p className="text-gray-700 text-sm pl-4">{notif.message}</p>
                                    <span className="text-xs text-gray-400 pl-4 block">
                                        {new Date(notif.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                    {!notif.is_read && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={(e) => handleMarkRead(notif.id, e)}
                                        >
                                            Mark as Read
                                        </Button>
                                    )}
                                    <span className="text-slate-400 text-sm">&rarr;</span>
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
