import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/layout/SearchBar';
import notificationService from '../services/notificationService';
import { Bell, Shield, LogOut, User, Building2 } from 'lucide-react';

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
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    active
                        ? 'bg-[#e8e2d9] text-[#1d1b16] shadow-xs font-bold'
                        : 'text-[#444748] hover:text-[#1b1c19] hover:bg-[#eae8e3]'
                }`}
            >
                {label}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] font-sans">
            {/* Topbar */}
            <nav className="bg-[#f5f3ee] border-b border-[#e4e2dd] shadow-xs sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 gap-4">

                        {/* Logo & Primary Nav */}
                        <div className="flex items-center gap-6 shrink-0">
                            <Link to="/dashboard" className="flex items-center gap-2.5 group">
                                <div className="w-9 h-9 bg-[#1c1b1b] rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-xs group-hover:bg-[#30312e] transition-colors">
                                    <Building2 className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-[#1c1b1b] font-extrabold text-xl tracking-tight hidden sm:inline font-heading">
                                    ClubHouse
                                </span>
                            </Link>

                            {/* Nav Links (Pill-shaped as in Stitch) */}
                            <div className="hidden lg:flex items-center gap-1.5 bg-[#f0eee9] p-1 rounded-full border border-[#e4e2dd]">
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
                        <div className="flex items-center gap-2.5 shrink-0">
                            {/* Notification Bell */}
                            <Link
                                to="/notifications"
                                title="Notifications"
                                className="relative p-2 rounded-full text-[#444748] hover:text-[#1b1c19] hover:bg-[#eae8e3] transition-colors"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 bg-[#ba1a1a] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </Link>

                            {/* User details */}
                            <Link
                                to="/profile"
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e8e2d9] hover:bg-[#dbdad5] text-[#1d1b16] transition-colors border border-[#cbc6bd]/50"
                            >
                                <User className="w-4 h-4 text-[#615e57]" />
                                <span className="text-xs font-bold">
                                    {user?.name}
                                </span>
                                {isAdmin() && (
                                    <span className="px-2 py-0.5 bg-[#3a0a00] text-white text-[10px] rounded-full font-bold flex items-center gap-1">
                                        <Shield className="w-3 h-3 text-[#ffb59f]" />
                                        Admin
                                    </span>
                                )}
                            </Link>

                            {isAdmin() && (
                                <Link
                                    to="/admin/clubs"
                                    className="px-3 py-1.5 text-xs font-bold bg-[#1c1b1b] text-white rounded-full hover:bg-[#30312e] transition-colors flex items-center gap-1 shadow-xs"
                                >
                                    <Shield className="w-3.5 h-3.5 text-[#ffb59f]" />
                                    Admin Suite
                                </Link>
                            )}

                            <button
                                onClick={handleLogout}
                                className="p-2 text-[#444748] hover:text-[#1b1c19] border border-[#e4e2dd] hover:bg-[#eae8e3] rounded-full transition-colors flex items-center gap-1.5 text-xs font-semibold"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>

                    </div>

                    {/* Secondary bar for mobile nav */}
                    <div className="flex lg:hidden overflow-x-auto py-2 border-t border-[#e4e2dd] gap-1 text-xs">
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