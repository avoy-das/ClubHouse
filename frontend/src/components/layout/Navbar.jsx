import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import { Building2, Bell, Shield, LogOut } from 'lucide-react';

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
        <nav className="bg-[#0f172a] text-white shadow-md border-b border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <Link to="/dashboard" className="flex items-center space-x-2 text-xl font-bold tracking-tight text-white">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <span>ClubHouse</span>
                        </Link>
                        <div className="hidden md:flex space-x-2">
                            <Link
                                to="/dashboard"
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    isActive('/dashboard') ? 'bg-[#2563eb] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/clubs"
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    isActive('/clubs') ? 'bg-[#2563eb] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                Clubs
                            </Link>
                            <Link
                                to="/certificates"
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    isActive('/certificates') ? 'bg-[#2563eb] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                Certificates
                            </Link>
                            <Link
                                to="/notifications"
                                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    isActive('/notifications') ? 'bg-[#2563eb] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <Bell className="w-4 h-4" />
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>
                            {isAdmin() && (
                                <Link
                                    to="/admin/clubs"
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                                        isActive('/admin') ? 'bg-[#eab308]/30 text-[#eab308]' : 'text-[#eab308] hover:bg-slate-800'
                                    }`}
                                >
                                    <Shield className="w-4 h-4" />
                                    Admin Suite
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user && (
                            <span className="text-sm font-medium text-slate-300 hidden sm:inline">
                                {user.name} {user.is_admin && <span className="ml-1 text-xs bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/40 px-2 py-0.5 rounded-full">Admin</span>}
                            </span>
                        )}
                        <button
                            onClick={handleLogout}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-700 transition flex items-center gap-1.5"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
