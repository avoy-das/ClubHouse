import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';
import { useAuth } from '../../context/AuthContext';
import EditClubModal from '../../components/Clubs/EditClubModal';
import ClubAuditLogModal from '../../components/Clubs/ClubAuditLogModal';
import EventModal from '../../components/Events/EventModal';
import { ArrowLeft, Edit, FileText, Search, Shield, Building2, Megaphone, Target, Calendar } from 'lucide-react';

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

    // Modal states
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isLogsOpen, setIsLogsOpen] = useState(false);
    const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

    // Contextual member search state
    const [memberQuery, setMemberQuery] = useState('');
    const [membersList, setMembersList] = useState([]);
    const [searchingMembers, setSearchingMembers] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState(null);

    const myMembership = club?.members?.find(m => m.user_id === user?.id);
    const isExec = isAdmin() || (myMembership && ['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(myMembership.role));

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

    useEffect(() => {
        fetchClubDetails();
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

            {/* Executive Management Control Suite Toolbar */}
            {isExec && (
                <div className="mb-6 bg-[#0f172a] text-white rounded-2xl p-5 shadow-xs border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#eab308]">
                                Club Executive Control Suite
                            </span>
                            <h3 className="text-lg font-bold text-white mt-0.5">
                                Club & Roster Management
                            </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setIsCreateEventOpen(true)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                            >
                                <Calendar className="w-4 h-4" /> Create Event
                            </button>

                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/15 flex items-center gap-1.5"
                            >
                                <Edit className="w-4 h-4" /> Edit Club Details
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

            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xs">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        {club.logo_path ? (
                            <img
                                src={`/storage/${club.logo_path}`}
                                alt={club.name}
                                className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] text-[#2563eb] flex items-center justify-center font-extrabold text-xl border border-blue-200/60">
                                {club.name.charAt(0)}
                            </div>
                        )}
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

            {/* Contextual Member Search Roster */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-[#0b1c30]">
                            Members Directory ({membersList.length})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isAdmin()
                                ? 'Admin mode: Platform-wide roster & role actions'
                                : isExec
                                ? 'Executive mode: Manage club member roles and permissions'
                                : 'Member mode: Browsing club roster'}
                        </p>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <input
                            type="text"
                            placeholder="Filter by name or student ID..."
                            value={memberQuery}
                            onChange={(e) => setMemberQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] bg-white"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                </div>

                {searchingMembers ? (
                    <div className="py-6 text-center text-slate-400 text-sm animate-pulse">Searching members...</div>
                ) : membersList.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {membersList.map(member => {
                            const isUpdating = updatingUserId === member.user_id;
                            const memberName = member.user?.name || member.name || `User #${member.user_id}`;
                            const isSelf = user && (member.user_id === user.id || member.id === myMembership?.id);
                            const callerRank = isAdmin() ? 100 : (myMembership ? getMemberHighestRank(myMembership) : 1);
                            const targetCurrentRank = getMemberHighestRank(member);
                            const canManageTarget = isExec && !isSelf && (isAdmin() || callerRank > targetCurrentRank);

                            const availableRoleOptions = [
                                { value: 'president', label: 'President', rank: 10 },
                                { value: 'vice_president', label: 'Vice President', rank: 9 },
                                { value: 'secretary', label: 'Secretary', rank: 8 },
                                { value: 'treasurer', label: 'Treasurer', rank: 8 },
                                { value: 'member', label: 'Member', rank: 1 },
                            ].filter(opt => isAdmin() || opt.rank < callerRank);

                            return (
                                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
                                    <div>
                                        <span className="text-sm font-semibold text-[#0b1c30] block">
                                            {memberName}
                                        </span>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            {(member.user?.student_id || member.student_id) && (
                                                <span>ID: {member.user?.student_id || member.student_id} {member.user?.department ? `• ${member.user.department}` : ''}</span>
                                            )}
                                            {member.joined_at && (
                                                <>
                                                    <span>&bull;</span>
                                                    <span>Joined {formatDate(member.joined_at)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action controls / Role badge */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {canManageTarget ? (
                                            <>
                                                {/* Role Dropdown */}
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                                                    disabled={isUpdating}
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-[#f8f9ff] text-[#0b1c30] focus:border-[#2563eb]"
                                                >
                                                    {availableRoleOptions.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>

                                                {/* Kick / Remove Button */}
                                                <button
                                                    onClick={() => handleRemoveMember(member.user_id, memberName)}
                                                    disabled={isUpdating}
                                                    title="Remove member"
                                                    className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-40"
                                                >
                                                    Remove
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full font-medium capitalize">
                                                {roleLabels[member.role] || member.role || 'Member'}{isSelf ? ' (You)' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-slate-400 text-sm py-4 text-center">
                        {memberQuery ? `No members found matching '${memberQuery}'` : 'No members yet.'}
                    </p>
                )}
            </div>

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
        </MainLayout>
    );
};

export default ClubDetail;
