import { Navigate } from 'react-router-dom';
import { useClubPermissions } from '../context/ClubPermissionsContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ClubExecutiveRoute = ({ permission, children }) => {
    const ctx = useClubPermissions();

    if (!ctx || ctx.loading) {
        return (
            <div className="flex justify-center p-8">
                <LoadingSpinner />
            </div>
        );
    }

    if (!ctx.can(permission)) {
        return <Navigate to=".." replace />;
    }

    return children;
};

export default ClubExecutiveRoute;
