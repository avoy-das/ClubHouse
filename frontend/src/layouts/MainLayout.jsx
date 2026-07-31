import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/layout/SearchBar';

const MainLayout = ({ children }) => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navLink = (to, label) => {
        const active = location.pathname.startsWith(to);
        return (
            <Link
                to={to}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                        ? 'bg-white text-slate-900'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
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

                        {/* Logo */}
                        <div className="flex items-center gap-8 shrink-0">
                            <Link to="/dashboard" className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                                    <span className="text-slate-900 font-black text-sm">CH</span>
                                </div>
                                <span className="text-white font-bold text-lg tracking-tight hidden sm:inline">
                                    ClubHouse
                                </span>
                            </Link>

                            {/* Nav Links */}
                            <div className="flex items-center gap-1">
                                {navLink('/dashboard', 'Dashboard')}
                                {navLink('/clubs', 'Clubs')}
                                {isAdmin() && navLink('/admin/clubs', 'Admin')}
                            </div>
                        </div>

                        {/* Center — Global Search Bar */}
                        <div className="flex-1 max-w-md mx-2">
                            <SearchBar />
                        </div>

                        {/* Right side — user info + logout */}
                        <div className="flex items-center gap-4">
                            <span className="text-slate-300 text-sm">
                                {user?.name}
                                {isAdmin() && (
                                    <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full font-medium">
                                        Admin
                                    </span>
                                )}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="px-3 py-1.5 text-sm text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded-md transition-colors"
                            >
                                Logout
                            </button>
                        </div>

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