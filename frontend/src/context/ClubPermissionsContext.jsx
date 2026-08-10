import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import clubService from '../services/clubService';
import { useAuth } from './AuthContext';

const CACHE_TTL_MS = 60000; // 1 minute in-memory cache

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
    const [membership, setMembership] = useState(null);
    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);

    const cacheRef = useRef({}); // { [clubId]: { data, timestamp } }

    const loadClubData = useCallback((id, force = false) => {
        if (!id) {
            setClub(null);
            setMembership(null);
            setLoading(false);
            return;
        }

        const now = Date.now();
        const cached = cacheRef.current[id];

        if (!force && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
            const data = cached.data;
            setClub(data);
            const foundMembership = data?.members?.find(m => m.user_id === user?.id);
            setMembership(foundMembership ?? null);
            setLoading(false);
            return;
        }

        setLoading(true);
        clubService.getClub(id)
            .then((res) => {
                const data = res.data || res;
                cacheRef.current[id] = { data, timestamp: Date.now() };
                setClub(data);
                const foundMembership = data?.members?.find(m => m.user_id === user?.id);
                setMembership(foundMembership ?? null);
            })
            .catch(() => {
                setClub(null);
                setMembership(null);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [user?.id]);

    useEffect(() => {
        loadClubData(clubId);
    }, [clubId, loadClubData]);

    const refreshPermissions = useCallback(() => {
        if (clubId) {
            loadClubData(clubId, true);
        }
    }, [clubId, loadClubData]);

    const isExecutive = useCallback(() => {
        if (isAdmin()) return true;
        if (!membership) return false;
        return ['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(membership.role);
    }, [isAdmin, membership]);

    const can = useCallback((permission) => {
        return isExecutive();
    }, [isExecutive]);

    const value = useMemo(() => ({
        club,
        membership,
        loading,
        can,
        isExecutive,
        refreshPermissions,
    }), [club, membership, loading, can, isExecutive, refreshPermissions]);

    return (
        <ClubPermissionsContext.Provider value={value}>
            {children}
        </ClubPermissionsContext.Provider>
    );
};

export const useClubPermissions = () => useContext(ClubPermissionsContext);

