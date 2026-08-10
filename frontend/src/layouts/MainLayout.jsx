import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/layout/SearchBar';
import notificationService from '../services/notificationService';
import {
    Bell,
    Shield,
    LogOut,
    User,
    Users,
    Building2,
    LayoutDashboard,
    Calendar,
    Megaphone,
    BellRing,
    Award,
    PanelLeft,
    PanelLeftClose,
    Building2Icon,
} from 'lucide-react';

const MainLayout = ({ children }) => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [unreadCount, setUnreadCount] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });

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
            const interval = setInterval(fetchUnread, 45000);
            return () => {
                active = false;
                clearInterval(interval);
            };
        }
    }, [user?.id]);

    const toggleSidebar = () => {
        setIsCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar_collapsed', String(next));
            return next;
        });
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/clubs', label: 'Clubs', icon: Building2 },
        { to: '/events', label: 'Events', icon: Calendar },
        { to: '/recruitment', label: 'Recruitment', icon: Megaphone },
        { to: '/announcements', label: 'Announcements', icon: BellRing },
        { to: '/certificates', label: 'Certificates', icon: Award },
        ...(isAdmin() ? [{ to: '/admin/users', label: 'User Management', icon: Users }] : []),
    ];

    return (
        <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] font-sans flex flex-col">
            {/* Sticky Top Header */}
            <header className="bg-[#f5f3ee] border-b border-[#e4e2dd] shadow-xs sticky top-0 z-50 h-16 flex items-center">
                <div className="w-full px-4 sm:px-6 flex items-center justify-between gap-4">
                    {/* Left: Sidebar Toggle + Brand Logo */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={toggleSidebar}
                            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                            className="p-2 text-[#444748] hover:text-[#1b1c19] hover:bg-[#eae8e3] rounded-lg transition-colors flex items-center justify-center"
                        >
                            {isCollapsed ? (
                                <PanelLeft className="w-5 h-5 text-[#444748]" />
                            ) : (
                                <PanelLeftClose className="w-5 h-5 text-[#444748]" />
                            )}
                        </button>

                        <Link to="/dashboard" className="flex items-center gap-2.5 group">
                            <div className="w-9 h-9 bg-[#1c1b1b] rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-xs group-hover:bg-[#30312e] transition-colors">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[#1c1b1b] font-extrabold text-xl tracking-tight hidden sm:inline font-heading">
                                ClubHouse
                            </span>
                        </Link>
                    </div>

                    {/* Center: Expanded Global Search Bar */}
                    <div className="flex-1 max-w-xl md:max-w-2xl mx-2 sm:mx-6 min-w-0">
                        <SearchBar />
                    </div>

                    {/* Right: Notifications, Profile, Admin Suite, Logout */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Notification Bell */}
                        <Link
                            to="/notifications"
                            title="Notifications"
                            className="relative p-2 rounded-full text-[#444748] hover:text-[#1b1c19] hover:bg-[#eae8e3] transition-colors shrink-0"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-[#ba1a1a] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </Link>

                        {/* User profile */}
                        <Link
                            to="/profile"
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e8e2d9] hover:bg-[#dbdad5] text-[#1d1b16] transition-colors border border-[#cbc6bd]/50 shrink-0"
                        >
                            <User className="w-4 h-4 text-[#615e57] shrink-0" />
                            <span className="text-xs font-bold truncate max-w-[100px] xl:max-w-[140px]" title={user?.name}>
                                {user?.name}
                            </span>
                            {isAdmin() && (
                                <span className="px-2 py-0.5 bg-[#3a0a00] text-white text-[10px] rounded-full font-bold flex items-center gap-1 shrink-0">
                                    <Shield className="w-3 h-3 text-[#ffb59f]" />
                                    Admin
                                </span>
                            )}
                        </Link>

                        {/* Admin Suite Button */}
                        {isAdmin() && (
                            <Link
                                to="/admin/clubs"
                                className="px-3 py-1.5 text-xs font-bold bg-[#1c1b1b] text-white rounded-full hover:bg-[#30312e] transition-colors flex items-center gap-1 shadow-xs shrink-0"
                            >
                                <Shield className="w-3.5 h-3.5 text-[#ffb59f]" />
                                <span className="hidden sm:inline">Admin Suite</span>
                            </Link>
                        )}

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="p-2 text-[#444748] hover:text-[#1b1c19] border border-[#e4e2dd] hover:bg-[#eae8e3] rounded-full transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Area: Collapsible Sidebar + Content */}
            <div className="flex flex-1">
                {/* Collapsible Vertical Sidebar */}
                <aside
                    className={`bg-[#f5f3ee] border-r border-[#e4e2dd] transition-all duration-300 flex flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-40 ${isCollapsed ? 'w-16' : 'w-60'
                        }`}
                >
                    <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active =
                                location.pathname === item.to ||
                                (item.to !== '/' && location.pathname.startsWith(item.to));

                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    title={isCollapsed ? item.label : undefined}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${active
                                        ? 'bg-[#e8e2d9] text-[#1d1b16] shadow-xs font-bold'
                                        : 'text-[#444748] hover:text-[#1b1c19] hover:bg-[#eae8e3]'
                                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                                >
                                    <Icon
                                        className={`w-5 h-5 shrink-0 ${active ? 'text-[#1c1b1b]' : 'text-[#615e57]'
                                            }`}
                                    />
                                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>
                </aside>

                {/* Page Content */}
                <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">{children}</div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;