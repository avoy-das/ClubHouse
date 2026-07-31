import { useEffect, useState } from 'react';
import notificationService from '../../services/notificationService';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';

const NotificationList = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await notificationService.list();
            const list = res.data || res;
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

    const handleMarkRead = async (id) => {
        try {
            await notificationService.markRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark notification as read');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-500 text-sm">System updates, membership approvals, and event alerts.</p>
            </div>

            {error && <ErrorBanner message={error} />}

            {notifications.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-lg shadow-sm border text-gray-500">
                    <p className="text-lg font-medium">No notifications found.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border divide-y">
                    {notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`p-4 flex items-start justify-between transition ${
                                notif.is_read ? 'bg-white' : 'bg-blue-50/60'
                            }`}
                        >
                            <div className="space-y-1">
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
                            {!notif.is_read && (
                                <Button variant="secondary" size="sm" onClick={() => handleMarkRead(notif.id)}>
                                    Mark as Read
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationList;
