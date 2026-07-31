import { createContext, useContext, useEffect, useState } from 'react';
import clubService from '../services/clubService';

const ClubPermissionsContext = createContext(null);

export const ClubPermissionsProvider = ({ clubId, children }) => {
    const [membership, setMembership] = useState(null); // { status, positions: [{title, can_manage_events, ...}] }
    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        if (clubId) {
            clubService.get(clubId)
                .then((data) => {
                    if (active) {
                        setClub(data);
                        setMembership(data.my_membership ?? null);
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
        clubService.get(clubId).then((data) => {
            setClub(data);
            setMembership(data.my_membership ?? null);
        });
    };

    const can = (permission) =>
        !!membership?.positions?.some((p) => p[permission] === true);

    const isExecutive = () =>
        !!membership?.positions?.some((p) =>
            ['can_manage_members', 'can_manage_events', 'can_manage_announcements',
             'can_manage_recruitment', 'can_track_attendance'].some((f) => p[f] === true));

    return (
        <ClubPermissionsContext.Provider value={{ club, membership, loading, can, isExecutive, refreshPermissions }}>
            {children}
        </ClubPermissionsContext.Provider>
    );
};

export const useClubPermissions = () => useContext(ClubPermissionsContext);
