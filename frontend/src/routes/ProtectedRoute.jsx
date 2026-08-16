import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fbf9f4]">
                <LoadingSpinner />
            </div>
        );
    }

    if (!user && !authService.isLoggedIn()) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;