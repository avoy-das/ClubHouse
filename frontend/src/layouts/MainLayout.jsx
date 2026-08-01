import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/layout/SearchBar';
import notificationService from '../services/notificationService';

const MainLayout = ({ children }) => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let active = true;
        const fetchUnread = async () => {
            try {
                const res = await notificationService.getUnreadCount();
                if (active) setUnreadCount(res.unread_count || res.count || 0);
            } catch {
                // Ignore unread fetch errors silently
            }
        };

        if (user) {
            fetchUnread();
            const interval = setInterval(fetchUnread, 30000);
            return () => {
                active = false;
                clearInterval(interval);
            };
        }
    }, [user, location.pathname]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navLink = (to, label) => {
        const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
        return (
            <Link
                to={to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
                {label}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Topbar */}
            <nav className="bg-slate-900 shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 gap-4">

                        {/* Logo & Primary Nav */}
                        <div className="flex items-center gap-6 shrink-0">
                            <Link to="/dashboard" className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                                    <span className="text-slate-900 font-black text-sm">CH</span>
                                </div>
                                <span className="text-white font-bold text-lg tracking-tight hidden sm:inline">
                                    ClubHouse
                                </span>
                            </Link>

                            {/* Nav Links */}
                            <div className="hidden lg:flex items-center gap-1">
                                {navLink('/dashboard', 'Dashboard')}
                                {navLink('/clubs', 'Clubs')}
                                {navLink('/events', 'Events')}
                                {navLink('/recruitment', 'Recruitment')}
                                {navLink('/announcements', 'Announcements')}
                                {navLink('/certificates', 'Certificates')}
                            </div>
                        </div>

                        {/* Center — Global Search Bar */}
                        <div className="flex-1 max-w-xs md:max-w-md mx-2">
                            <SearchBar />
                        </div>

                        {/* Right side — Bell icon + User info + profile + logout */}
                        <div className="flex items-center gap-3 shrink-0">
                            {/* Notification Bell */}
                            <Link
                                to="/notifications"
                                title="Notifications"
                                className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <span className="text-lg">🔔</span>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </Link>

                            {/* User details */}
                            <Link
                                to="/profile"
                                className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                            >
                                <span className="text-sm font-medium">
                                    {user?.name}
                                </span>
                                {isAdmin() && (
                                    <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full font-medium">
                                        Admin
                                    </span>
                                )}
                            </Link>

                            {isAdmin() && (
                                <Link
                                    to="/admin/clubs"
                                    className="px-2.5 py-1 text-xs font-semibold bg-amber-600/30 text-amber-300 border border-amber-500/50 rounded-md hover:bg-amber-600/50 transition-colors"
                                >
                                    Admin Suite
                                </Link>
                            )}

                            <button
                                onClick={handleLogout}
                                className="px-3 py-1.5 text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-md transition-colors"
                            >
                                Logout
                            </button>
                        </div>

                    </div>

                    {/* Secondary bar for mobile / admin nav */}
                    <div className="flex lg:hidden overflow-x-auto py-2 border-t border-slate-800 gap-2 text-xs">
                        {navLink('/dashboard', 'Dashboard')}
                        {navLink('/clubs', 'Clubs')}
                        {navLink('/events', 'Events')}
                        {navLink('/recruitment', 'Recruitment')}
                        {navLink('/announcements', 'Announcements')}
                        {navLink('/certificates', 'Certificates')}
                    </div>
                </div>
            </nav>

            {/* Page content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
};

export default MainLayout;