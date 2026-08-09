import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import EditClubModal from '../../components/Clubs/EditClubModal';
import ClubAuditLogModal from '../../components/Clubs/ClubAuditLogModal';
import EventModal from '../../components/Events/EventModal';
import MembersDirectory from '../../components/Clubs/MembersDirectory';
import { ArrowLeft, Edit, FileText, Search, Shield, Building2, Megaphone, Target, Calendar, Eye, User, Phone, CheckCircle2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatSessionLabel } from '../../utils/sessionUtils';
import { getImageUrl } from '../../utils/imageUrl';

const roleLabels = {
    president:      'President',
    vice_president: 'Vice President',
    secretary:      'Secretary',
    treasurer:      'Treasurer',
    member:         'Member',
};

const getRoleRank = (role) => {
    switch ((role || 'member').toLowerCase()) {
        case 'president': return 10;
        case 'vice_president':
        case 'vice president':
        case 'vp': return 9;
        case 'secretary':
        case 'treasurer': return 8;
        case 'executive': return 7;
        default: return 1;
    }
};

const getMemberHighestRank = (member) => {
    let maxRank = getRoleRank(member?.role);
    if (member?.positions && Array.isArray(member.positions)) {
        member.positions.forEach(p => {
            if (p.position?.title) {
                const title = p.position.title.toLowerCase();
                let rank = 1;
                if (title.includes('president') && !title.includes('vice')) rank = 10;
                else if (title.includes('vice') || title.includes('vp')) rank = 9;
                else if (title.includes('secretary') || title.includes('treasurer')) rank = 8;
                else if (p.position.is_executive || p.position.can_manage_members) rank = 7;
                if (rank > maxRank) maxRank = rank;
            }
        });
    }
    return maxRank;
};

const ClubDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [club, setClub]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [suspending, setSuspending] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [toast, setToast] = useState(null);

    // Club events & edit request state
    const [clubEvents, setClubEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [pendingEditRequest, setPendingEditRequest] = useState(null);

    // Modal states
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isLogsOpen, setIsLogsOpen] = useState(false);
    const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

    // Contextual member search & details state
    const [memberQuery, setMemberQuery] = useState('');
    const [membersList, setMembersList] = useState([]);
    const [searchingMembers, setSearchingMembers] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const myMembership = club?.members?.find(m => m.user_id === user?.id);
    const isExec = isAdmin() || (myMembership && ['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(myMembership.role));
    const isClubExec = !user?.is_admin && Boolean(myMembership && ['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(myMembership.role));

    const formatDate = (isoStr) => {
        if (!isoStr) return 'N/A';
        return new Date(isoStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const fetchClubDetails = () => {
        clubService.getClub(id)
            .then(res => {
                setClub(res.data);
                if (res.data?.members) {
                    setMembersList(res.data.members);
                }
            })
            .catch(() => setError('Club not found.'))
            .finally(() => setLoading(false));
    };

    const fetchPendingEditRequest = () => {
        clubService.getPendingEditRequest(id)
            .then(res => setPendingEditRequest(res.data?.pending_request || null))
            .catch(() => setPendingEditRequest(null));
    };

    const fetchClubEvents = () => {
        setLoadingEvents(true);
        api.get('/events', { params: { club_id: id } })
            .then(res => {
                const data = res.data?.data || res.data || [];
                setClubEvents(Array.isArray(data) ? data : []);
            })
            .catch(() => setClubEvents([]))
            .finally(() => setLoadingEvents(false));
    };

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setLoadingEvents(true);

        Promise.allSettled([
            clubService.getClub(id),
            api.get('/events', { params: { club_id: id } }),
            clubService.getPendingEditRequest(id),
        ]).then(([clubRes, eventsRes, editReqRes]) => {
            if (!isMounted) return;

            if (clubRes.status === 'fulfilled') {
                const clubData = clubRes.value.data;
                setClub(clubData);
                if (clubData?.members) {
                    setMembersList(clubData.members);
                }
            } else {
                setError('Club not found.');
            }

            if (eventsRes.status === 'fulfilled') {
                const data = eventsRes.value.data?.data || eventsRes.value.data || [];
                setClubEvents(Array.isArray(data) ? data : []);
            } else {
                setClubEvents([]);
            }

            if (editReqRes.status === 'fulfilled') {
                setPendingEditRequest(editReqRes.value.data?.pending_request || null);
            } else {
                setPendingEditRequest(null);
            }
        }).finally(() => {
            if (isMounted) {
                setLoading(false);
                setLoadingEvents(false);
            }
        });

        return () => { isMounted = false; };
    }, [id]);

    // Handle API contextual member search with ?q=
    useEffect(() => {
        let isMounted = true;
        const fetchMembers = async () => {
            setSearchingMembers(true);
            try {
                const res = await clubService.listMembers(id, memberQuery.trim());
                if (isMounted) {
                    setMembersList(res.data || []);
                }
            } catch {
                // Ignore temporary network search errors
            } finally {
                if (isMounted) setSearchingMembers(false);
            }
        };

        const timer = setTimeout(() => {
            if (id) fetchMembers();
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [id, memberQuery]);

    const handleSuspend = async () => {
        if (!window.confirm('Are you sure you want to suspend this club?')) return;
        setSuspending(true);
        try {
            await clubService.adminSuspend(id);
            setClub(prev => ({ ...prev, status: 'suspended' }));
        } catch {
            alert('Failed to suspend club.');
        } finally {
            setSuspending(false);
        }
    };

    const handleActivate = async () => {
        if (!window.confirm('Are you sure you want to make this club active again?')) return;
        setActivating(true);
        try {
            await clubService.adminActivate(id);
            setClub(prev => ({ ...prev, status: 'approved' }));
        } catch {
            alert('Failed to activate club.');
        } finally {
            setActivating(false);
        }
    };

    const handleLeaveClub = async () => {
        if (myMembership && ['president', 'vice_president', 'secretary', 'treasurer'].includes(myMembership.role)) {
            alert(`As a club executive (${roleLabels[myMembership.role] || myMembership.role}), you must transfer your executive role before leaving ${club.name}.`);
            return;
        }

        if (!window.confirm(`Are you sure you want to leave ${club.name}?`)) return;

        setLeaving(true);
        try {
            await clubService.leaveClub(id);
            alert(`You have left ${club.name}.`);
            navigate('/clubs');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to leave club.');
        } finally {
            setLeaving(false);
        }
    };

    // Executive Action Handlers for Members
    const handleRoleChange = async (targetUserId, newRole) => {
        setUpdatingUserId(targetUserId);
        try {
            await clubService.updateMemberRole(id, targetUserId, newRole);
            setMembersList(prev =>
                prev.map(m => m.user_id === targetUserId ? { ...m, role: newRole } : m)
            );
            setToast({
                type: 'success',
                message: `Member role updated to ${roleLabels[newRole] || newRole}.`,
            });
        } catch (err) {
            setToast({
                type: 'error',
                message: err.response?.data?.message || 'Failed to update member role.',
            });
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleRemoveMember = async (targetUserId, memberName) => {
        if (!window.confirm(`Are you sure you want to remove ${memberName || 'this member'} from ${club.name}?`)) return;
        setUpdatingUserId(targetUserId);
        try {
            await clubService.removeMember(id, targetUserId);
            setMembersList(prev => prev.filter(m => m.user_id !== targetUserId));
            setToast({
                type: 'success',
                message: 'Member removed from club successfully.',
            });
        } catch (err) {
            setToast({
                type: 'error',
                message: err.response?.data?.message || 'Failed to remove member.',
            });
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleClubUpdated = (updatedClub, message) => {
        setClub(updatedClub);
        setToast({
            type: 'success',
            message: message || 'Club details updated successfully.',
        });
    };

    if (loading) return (
        <MainLayout>
            <p className="text-slate-400 text-sm animate-pulse py-12 text-center">Loading club details...</p>
        </MainLayout>
    );

    if (error) return (
        <MainLayout>
            <p className="text-red-500 text-sm py-6">{error}</p>
        </MainLayout>
    );

    return (
        <MainLayout>
            <button
                onClick={() => navigate('/clubs')}
                className="text-sm font-medium text-slate-500 hover:text-[#0b1c30] mb-6 flex items-center gap-1.5 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Clubs
            </button>

            {/* Notification Toast */}
            {toast && (
                <div
                    className={`mb-6 p-4 rounded-xl text-sm border flex items-center justify-between ${
                        toast.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                >
                    <span>{toast.message}</span>
                    <button
                        onClick={() => setToast(null)}
                        className="text-xs font-bold ml-4 opacity-60 hover:opacity-100"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Pending Club Creation Approval Banner */}
            {club.status === 'pending' && (
                <div className="mb-6 bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-200/80 rounded-xl text-amber-800 font-bold shrink-0">⏳</div>
                        <div>
                            <p className="text-xs font-bold text-amber-950 uppercase tracking-wider">Requested by you — Waiting for approval</p>
                            <p className="text-xs text-amber-900 mt-0.5">
                                This club creation request is currently pending administrator approval. You can view all submitted details below, but club management features remain disabled until approved.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Edit Request Banner */}
            {pendingEditRequest && (
                <div className="mb-6 bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-200/80 rounded-xl text-amber-800 font-bold shrink-0">⏳</div>
                        <div>
                            <p className="text-xs font-bold text-amber-950 uppercase tracking-wider">Club Edit Request Under Review</p>
                            <p className="text-xs text-amber-900 mt-0.5">
                                Updated information submitted by <strong className="font-bold">{pendingEditRequest.requested_by?.name || 'Executive'}</strong> is currently pending administrator review and approval.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Executive & Admin Management Control Suite Toolbar */}
            {club.status === 'approved' && (isExec || isAdmin()) && (
                <div className="mb-6 bg-[#0f172a] text-white rounded-2xl p-5 shadow-xs border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#eab308]">
                                {isAdmin() ? 'Administrator Control Suite' : 'Club Executive Control Suite'}
                            </span>
                            <h3 className="text-lg font-bold text-white mt-0.5">
                                Club & Roster Management
                            </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {isClubExec && (
                                <button
                                    onClick={() => setIsCreateEventOpen(true)}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                                >
                                    <Calendar className="w-4 h-4" /> Create Event
                                </button>
                            )}

                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/15 flex items-center gap-1.5"
                            >
                                <Edit className="w-4 h-4" /> {isAdmin() ? 'Edit Club Details (Direct)' : 'Edit Club Details'}
                            </button>

                            <button
                                onClick={() => setIsLogsOpen(true)}
                                className="px-3.5 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                            >
                                <FileText className="w-4 h-4" /> Club Audit Logs
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl mb-6 shadow-xs overflow-hidden">
                {getImageUrl(club.banner_url || club.banner_path) ? (
                    <div className="h-44 w-full bg-slate-100 relative">
                        <img
                            src={getImageUrl(club.banner_url || club.banner_path)}
                            alt={`${club.name} Banner`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="h-28 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-800 relative opacity-90" />
                )}

                <div className="p-6 relative pt-4">
                    <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white -mt-10 shrink-0 relative z-10">
                                {getImageUrl(club.logo_url || club.logo_path) ? (
                                    <img
                                        src={getImageUrl(club.logo_url || club.logo_path)}
                                        alt={club.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-[#eff4ff] text-[#2563eb] flex items-center justify-center font-extrabold text-xl">
                                        {club.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[#0b1c30]">{club.name}</h1>
                                {club.department && <p className="text-slate-500 text-sm mt-0.5">{club.department}</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-[#f8f9ff] text-[#0b1c30] text-xs font-semibold rounded-full border border-slate-200">
                                {club.category}
                            </span>
                            {myMembership && (
                                <button
                                    onClick={handleLeaveClub}
                                    disabled={leaving}
                                    className="px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                                >
                                    {leaving ? 'Leaving...' : 'Leave Club'}
                                </button>
                            )}
                            {isAdmin() && club.status === 'approved' && (
                                <button
                                    onClick={handleSuspend}
                                    disabled={suspending}
                                    className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                    {suspending ? 'Suspending...' : 'Suspend Club'}
                                </button>
                            )}
                            {isAdmin() && club.status === 'suspended' && (
                                <button
                                    onClick={handleActivate}
                                    disabled={activating}
                                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                >
                                    {activating ? 'Activating...' : 'Activate Club'}
                                </button>
                            )}
                        </div>
                    </div>

                <p className="text-slate-700 text-sm leading-relaxed mb-6">
                    {club.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm p-4 bg-[#f8f9ff] rounded-xl border border-slate-200/80">
                    <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1 font-medium">Contact Email</p>
                        <p className="text-[#0b1c30] font-medium">{club.contact_email}</p>
                    </div>
                    {club.contact_phone && (
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1 font-medium">Contact Phone</p>
                            <p className="text-[#0b1c30] font-medium">{club.contact_phone}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1 font-medium">Founded by</p>
                        <p className="text-[#0b1c30] font-medium">{club.creator?.name}</p>
                    </div>
                    {club.reason && (
                        <div className="sm:col-span-3 border-t border-slate-200/60 pt-3">
                            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1 font-medium">Reason for Creation Request</p>
                            <p className="text-[#0b1c30] font-medium text-xs leading-relaxed">{club.reason}</p>
                        </div>
                    )}
                    {getImageUrl(club.permission_doc_url || club.permission_doc_path) && (
                        <div className="sm:col-span-3 border-t border-slate-200/60 pt-3">
                            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1 font-medium">Authority Permission Document</p>
                            <a
                                href={getImageUrl(club.permission_doc_url || club.permission_doc_path)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline text-xs font-semibold inline-flex items-center gap-1"
                            >
                                📄 View Submitted Permission Document / Letter ↗
                            </a>
                        </div>
                    )}
                </div>

                {/* Module Quick Links */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => navigate(`/clubs/${club.id}/announcements`)}
                        className="px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Megaphone className="w-4 h-4" /> Announcements
                    </button>
                    <button
                        onClick={() => navigate(`/clubs/${club.id}/recruitment`)}
                        className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Target className="w-4 h-4" /> Recruitment
                    </button>
                </div>
            </div>
        </div>

            {/* Club Events Directory */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-[#0b1c30] flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#2563eb]" /> Club Events ({clubEvents.length})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">All events organized by {club.name}</p>
                    </div>
                    {isClubExec && (
                        <button
                            onClick={() => setIsCreateEventOpen(true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1"
                        >
                            + Create Event
                        </button>
                    )}
                </div>

                {loadingEvents ? (
                    <div className="py-6 text-center text-slate-400 text-sm animate-pulse">Loading club events...</div>
                ) : clubEvents.length === 0 ? (
                    <div className="p-6 text-center bg-[#f8f9ff] rounded-xl border border-dashed border-slate-300 space-y-1">
                        <p className="text-xs font-semibold text-slate-600">No events found for this club.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clubEvents.map(ev => (
                            <div
                                key={ev.id}
                                onClick={() => navigate(`/events/${ev.id}`)}
                                className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer bg-[#f8f9ff] hover:bg-white space-y-2.5 flex flex-col justify-between"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-[#0b1c30] truncate">{ev.title}</span>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase shrink-0 ${
                                            ev.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                                            ev.status === 'ongoing'   ? 'bg-blue-100 text-blue-800' :
                                            ev.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                                            ev.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                                            'bg-amber-100 text-amber-800'
                                        }`}>
                                            {ev.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2">{ev.description}</p>
                                </div>

                                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                                    <div className="flex items-center gap-1 text-[#2563eb] font-semibold">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(ev.starts_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                    </div>
                                    {ev.location_value && (
                                        <div className="text-slate-500 truncate">📍 {ev.location_value}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Contextual Members Directory (Two-Section Layout with Advisor Card) */}
            <MembersDirectory clubId={id} initialClub={club} onClubUpdated={(updated) => setClub(updated)} />

            {/* Modals */}
            <EditClubModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                club={club}
                onSuccess={handleClubUpdated}
            />

            <ClubAuditLogModal
                isOpen={isLogsOpen}
                onClose={() => setIsLogsOpen(false)}
                club={club}
            />

            <EventModal
                isOpen={isCreateEventOpen}
                onClose={() => setIsCreateEventOpen(false)}
                defaultClubId={club?.id}
                isLockedClub={true}
                onSuccess={(newEvent, msg) => {
                    setIsCreateEventOpen(false);
                    setToast({
                        type: 'success',
                        message: msg || 'Event created successfully.',
                    });
                }}
            />

            {/* View Member Details Modal */}
            {selectedMember && (
                <Modal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    title={`Member Profile: ${selectedMember.user?.name || selectedMember.name || 'User Details'}`}
                >
                    <div className="space-y-5">
                        {/* Profile Header */}
                        <div className="flex items-center gap-4 p-4 bg-[#f8f9ff] rounded-xl border border-slate-200">
                            <div className="w-12 h-12 bg-[#0b1c30] text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                                {(selectedMember.user?.name || selectedMember.name) ? (selectedMember.user?.name || selectedMember.name).charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-[#0b1c30] text-base truncate">{selectedMember.user?.name || selectedMember.name}</h3>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-full border border-blue-200 capitalize">
                                        {roleLabels[selectedMember.role] || selectedMember.role || 'Member'}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs flex flex-wrap items-center gap-2 font-mono">
                                    <span>ID: <strong>{selectedMember.user?.student_id || selectedMember.student_id || 'N/A'}</strong></span>
                                    <span>•</span>
                                    <span>{selectedMember.user?.email || selectedMember.email}</span>
                                </p>
                            </div>
                        </div>

                        {/* General User Information */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                <User className="w-4 h-4 text-blue-600" /> General Information
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                    <span className="text-slate-500 block">Department:</span>
                                    <span className="font-semibold text-slate-800">{selectedMember.user?.department || selectedMember.department || 'Not specified'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Academic Session:</span>
                                    <span className="font-semibold text-slate-800">
                                        {(selectedMember.user?.session !== null && selectedMember.user?.session !== undefined)
                                            ? formatSessionLabel(selectedMember.user.session)
                                            : (selectedMember.session !== null && selectedMember.session !== undefined)
                                            ? formatSessionLabel(selectedMember.session)
                                            : 'Not specified'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Phone Number:</span>
                                    <span className="font-semibold text-slate-800">{selectedMember.user?.phone || selectedMember.phone || 'Not specified'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Official Club Joining Date:</span>
                                    <span className="font-semibold text-blue-700">
                                        {selectedMember.joined_at || selectedMember.created_at
                                            ? new Date(selectedMember.joined_at || selectedMember.created_at).toLocaleString()
                                            : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Joining Details / Application Data */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                <FileText className="w-4 h-4 text-blue-600" /> Club Joining Application Data
                            </h4>

                            {selectedMember.recruitment_application ? (
                                <div className="space-y-3 bg-[#f8f9ff] p-4 rounded-xl border border-blue-100 text-xs">
                                    <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                                        <span className="font-bold text-blue-900 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Joined via Recruitment Campaign
                                        </span>
                                        {selectedMember.recruitment_application.recruitment_notice && (
                                            <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                {selectedMember.recruitment_application.recruitment_notice.title}
                                            </span>
                                        )}
                                    </div>

                                    {selectedMember.recruitment_application.answers?.motivation && (
                                        <div>
                                            <span className="font-semibold text-slate-600 block mb-1">Motivation Statement:</span>
                                            <p className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed">
                                                {selectedMember.recruitment_application.answers.motivation}
                                            </p>
                                        </div>
                                    )}

                                    {selectedMember.recruitment_application.answers?.experience && (
                                        <div>
                                            <span className="font-semibold text-slate-600 block mb-1">Experience & Skills:</span>
                                            <p className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed">
                                                {selectedMember.recruitment_application.answers.experience}
                                            </p>
                                        </div>
                                    )}

                                    {selectedMember.recruitment_application.answers?.portfolio_url && (
                                        <div>
                                            <span className="font-[#2563eb] block mb-1">Portfolio / Link:</span>
                                            <a
                                                href={selectedMember.recruitment_application.answers.portfolio_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:underline font-medium break-all"
                                            >
                                                {selectedMember.recruitment_application.answers.portfolio_url}
                                            </a>
                                        </div>
                                    )}

                                    {selectedMember.recruitment_application.answers?.custom_text &&
                                        Object.entries(selectedMember.recruitment_application.answers.custom_text).map(([key, val]) => (
                                            <div key={key}>
                                                <span className="font-semibold text-slate-600 block mb-1">{key}:</span>
                                                <p className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed">{val}</p>
                                            </div>
                                        ))}

                                    {selectedMember.recruitment_application.answers?.custom_files &&
                                        Object.entries(selectedMember.recruitment_application.answers.custom_files).map(([key, fileObj]) => (
                                            <div key={key}>
                                                <span className="font-semibold text-slate-600 block mb-1">{key}:</span>
                                                <a
                                                    href={getImageUrl(fileObj.url || fileObj.path)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-blue-600 font-semibold hover:bg-slate-50 transition-colors"
                                                >
                                                    📄 {fileObj.name || 'View Uploaded Document'} ↗
                                                </a>
                                            </div>
                                        ))}
                                </div>
                            ) : selectedMember.membership_request ? (
                                <div className="space-y-2 bg-[#f8f9ff] p-4 rounded-xl border border-slate-200 text-xs">
                                    <div className="font-bold text-slate-800 pb-1.5 border-b border-slate-200">
                                        Joined via Direct Membership Request
                                    </div>
                                    {selectedMember.membership_request.message && (
                                        <div>
                                            <span className="font-semibold text-slate-600 block mb-1">Joining Request Message:</span>
                                            <p className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed">
                                                {selectedMember.membership_request.message}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    No custom joining application submission recorded (e.g. founding member or admin assigned).
                                </p>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end pt-3 border-t border-slate-200">
                            <Button variant="secondary" onClick={() => setIsDetailsModalOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </MainLayout>
    );
};

export default ClubDetail;
