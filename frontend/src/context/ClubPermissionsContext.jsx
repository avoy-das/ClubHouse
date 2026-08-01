import { createContext, useContext, useEffect, useState } from 'react';
import clubService from '../services/clubService';
import { useAuth } from './AuthContext';

const ClubPermissionsContext = createContext({
    club: null,
    membership: null,
    loading: false,
    can: () => false,
    isExecutive: () => false,
    refreshPermissions: () => {},
});

export const ClubPermissionsProvider = ({ clubId, children }) => {
    const { user, isAdmin } = useAuth();
    const [membership, setMembership] = useState(null); // The member object with role
    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        if (clubId) {
            clubService.getClub(clubId)
                .then((res) => {
                    if (active) {
                        const data = res.data || res;
                        setClub(data);
                        const foundMembership = data?.members?.find(m => m.user_id === user?.id);
                        setMembership(foundMembership ?? null);
                    }
                })
                .catch(() => {
                    if (active) {
                        setClub(null);
                        setMembership(null);
                    }
                })
                .finally(() => { if (active) setLoading(false); });
        } else {
            setLoading(false);
        }
        return () => { active = false; };
    }, [clubId]);

    const refreshPermissions = () => {
        if (!clubId) return;
        clubService.getClub(clubId).then((res) => {
            const data = res.data || res;
            setClub(data);
            const foundMembership = data?.members?.find(m => m.user_id === user?.id);
            setMembership(foundMembership ?? null);
        });
    };

    const isExecutive = () => {
        if (isAdmin()) return true;
        if (!membership) return false;
        return ['president', 'vice_president', 'secretary', 'treasurer'].includes(membership.role);
    };

    const can = (permission) => {
        return isExecutive();
    };

    return (
        <ClubPermissionsContext.Provider value={{ club, membership, loading, can, isExecutive, refreshPermissions }}>
            {children}
        </ClubPermissionsContext.Provider>
    );
};

export const useClubPermissions = () => useContext(ClubPermissionsContext);
