import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';
import { useAuth } from '../../context/AuthContext';
import EditClubModal from '../../components/Clubs/EditClubModal';
import ClubAuditLogModal from '../../components/Clubs/ClubAuditLogModal';

const roleLabels = {
    president:      'President',
    vice_president: 'Vice President',
    secretary:      'Secretary',
    treasurer:      'Treasurer',
    member:         'Member',
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

    // Contextual member search state
    const [memberQuery, setMemberQuery] = useState('');
    const [membersList, setMembersList] = useState([]);
    const [searchingMembers, setSearchingMembers] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState(null);

    const myMembership = club?.members?.find(m => m.user_id === user?.id);
    const isExec = isAdmin() || (myMembership && ['president', 'vice_president', 'secretary', 'treasurer'].includes(myMembership.role));

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
            <p className="text-slate-400 text-sm">Loading...</p>
        </MainLayout>
    );

    if (error) return (
        <MainLayout>
            <p className="text-red-500 text-sm">{error}</p>
        </MainLayout>
    );

    return (
        <MainLayout>
            <button
                onClick={() => navigate('/clubs')}
                className="text-sm text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-1"
            >
                ← Back to Clubs
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
                <div className="mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                                Club Executive Control Suite
                            </span>
                            <h3 className="text-lg font-bold text-white mt-0.5">
                                Club & Roster Management
                            </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/15 flex items-center gap-1.5"
                            >
                                ✏️ Edit Club Details
                            </button>

                            <button
                                onClick={() => setIsLogsOpen(true)}
                                className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                            >
                                📜 Club Audit Logs
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        {club.logo_path ? (
                            <img
                                src={`/storage/${club.logo_path}`}
                                alt={club.name}
                                className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-xl border border-indigo-100">
                                {club.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{club.name}</h1>
                            <p className="text-slate-500 text-sm mt-0.5">{club.department}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                            {club.category}
                        </span>
                        {myMembership && (
                            <button
                                onClick={handleLeaveClub}
                                disabled={leaving}
                                className="px-3 py-1.5 text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                            >
                                {leaving ? 'Leaving...' : 'Leave Club'}
                            </button>
                        )}
                        {isAdmin() && club.status === 'approved' && (
                            <button
                                onClick={handleSuspend}
                                disabled={suspending}
                                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                                {suspending ? 'Suspending...' : 'Suspend Club'}
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed mb-6">
                    {club.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Contact Email</p>
                        <p className="text-slate-700">{club.contact_email}</p>
                    </div>
                    {club.contact_phone && (
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Contact Phone</p>
                            <p className="text-slate-700">{club.contact_phone}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Founded by</p>
                        <p className="text-slate-700">{club.creator?.name}</p>
                    </div>
                </div>
            </div>

            {/* Contextual Member Search Roster */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">
                            Members Directory ({membersList.length})
                        </h2>
                        <p className="text-xs text-slate-500">
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
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <svg
                            className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                </div>

                {searchingMembers ? (
                    <div className="py-6 text-center text-slate-400 text-sm">Searching members...</div>
                ) : membersList.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {membersList.map(member => {
                            const isUpdating = updatingUserId === member.user_id;
                            const memberName = member.user?.name || member.name || `User #${member.user_id}`;

                            return (
                                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
                                    <div>
                                        <span className="text-sm font-semibold text-slate-800 block">
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
                                        {isExec ? (
                                            <>
                                                {/* Role Dropdown */}
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                                                    disabled={isUpdating}
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-slate-900"
                                                >
                                                    <option value="president">President</option>
                                                    <option value="vice_president">Vice President</option>
                                                    <option value="secretary">Secretary</option>
                                                    <option value="treasurer">Treasurer</option>
                                                    <option value="member">Member</option>
                                                </select>

                                                {/* Kick / Remove Button */}
                                                <button
                                                    onClick={() => handleRemoveMember(member.user_id, memberName)}
                                                    disabled={isUpdating || (member.role === 'president' && !isAdmin())}
                                                    title={member.role === 'president' && !isAdmin() ? 'Cannot remove President' : 'Remove member'}
                                                    className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-40"
                                                >
                                                    Remove
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium capitalize">
                                                {roleLabels[member.role] || member.role || 'Member'}
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
        </MainLayout>
    );
};

export default ClubDetail;
