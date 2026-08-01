import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';

const Navbar = () => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let active = true;
        const fetchNotifications = async () => {
            try {
                const res = await notificationService.list();
                const list = res.notifications || res.data || res;
                if (active && Array.isArray(list)) {
                    const unread = list.filter((n) => !n.is_read).length;
                    setUnreadCount(unread);
                }
            } catch {
                // Ignore background notification fetch errors
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch {
            navigate('/login');
        }
    };

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <nav className="bg-slate-900 text-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <Link to="/dashboard" className="flex items-center space-x-2 text-xl font-bold tracking-tight text-blue-400">
                            <span>🏛️</span>
                            <span>ClubHouse</span>
                        </Link>
                        <div className="hidden md:flex space-x-4">
                            <Link
                                to="/dashboard"
                                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                                    isActive('/dashboard') ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/clubs"
                                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                                    isActive('/clubs') ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                Clubs
                            </Link>
                            <Link
                                to="/certificates"
                                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                                    isActive('/certificates') ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                Certificates
                            </Link>
                            <Link
                                to="/notifications"
                                className={`relative px-3 py-2 rounded-md text-sm font-medium transition ${
                                    isActive('/notifications') ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>
                            {isAdmin() && (
                                <Link
                                    to="/admin/clubs"
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                                        isActive('/admin') ? 'bg-purple-900 text-purple-200' : 'text-purple-300 hover:bg-purple-800'
                                    }`}
                                >
                                    Admin Portal
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user && (
                            <span className="text-sm font-medium text-slate-300 hidden sm:inline">
                                {user.name} {user.is_admin && <span className="ml-1 text-xs bg-purple-700 px-2 py-0.5 rounded text-purple-100">Admin</span>}
                            </span>
                        )}
                        <button
                            onClick={handleLogout}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md text-sm font-medium border border-slate-700 transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
