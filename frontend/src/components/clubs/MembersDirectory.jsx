import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import clubService from '../../services/clubService';
import EditAdvisorModal from './EditAdvisorModal';
import TransferPresidencyModal from './TransferPresidencyModal';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorBanner from '../ui/ErrorBanner';
import { formatSessionLabel } from '../../utils/sessionUtils';
import { formatDisplayDate } from '../../utils/dateUtils';
import { roleLabels, getRoleRank, committeeRoleWeight } from '../../utils/roleUtils';
import {
    Users,
    ShieldCheck,
    UserCheck,
    Search,
    Eye,
    Trash2,
    Edit3,
    PlusCircle,
    User,
    Mail,
    Building,
    Briefcase,
    Crown,
    ArrowUpDown,
    CheckCircle2
} from 'lucide-react';

const MembersDirectory = ({ clubId, initialClub, onClubUpdated }) => {
    const { user, isAdmin } = useAuth();

    const [club, setClub] = useState(initialClub || null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);

    // Search and sort states
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('joined_desc'); // 'joined_desc' | 'alpha'

    // Advisor Modal state
    const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);

    // Transfer Presidency Modal state
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    // View Member Details Modal state
    const [selectedMember, setSelectedMember] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Track role update state per user
    const [updatingUserId, setUpdatingUserId] = useState(null);

    // Permissions & Hierarchy check
    const myMembership = useMemo(() => members.find((m) => m.user_id === user?.id), [members, user?.id]);
    const myRole = myMembership?.role?.toLowerCase() || '';

    const isSystemAdmin = isAdmin();
    const isPresident = myRole === 'president';
    const isSecretary = myRole === 'secretary';
    const isExecutive = isSystemAdmin || ['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(myRole);

    const myRank = isSystemAdmin ? 100 : getRoleRank(myRole);

    const canEditAdvisor = isSystemAdmin || isPresident || isSecretary;

    // President Slot check
    const currentPresident = useMemo(() => members.find((m) => m.role?.toLowerCase() === 'president'), [members]);
    const hasPresident = !!currentPresident;

    // Partition & sort members with useMemo
    const { rawCommittee, rawGeneral, committeeMembers, generalMembers } = useMemo(() => {
        const matchesQuery = (m) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const name = (m.user?.name || '').toLowerCase();
            const studentId = (m.user?.student_id || '').toLowerCase();
            const email = (m.user?.email || '').toLowerCase();
            return name.includes(q) || studentId.includes(q) || email.includes(q);
        };

        const committeeRaw = members.filter((m) => {
            const role = (m.role || 'member').toLowerCase();
            return ['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(role);
        });

        const generalRaw = members.filter((m) => {
            const role = (m.role || 'member').toLowerCase();
            return !['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(role);
        });

        const committeeSorted = committeeRaw
            .filter(matchesQuery)
            .sort((a, b) => {
                const weightA = committeeRoleWeight[a.role?.toLowerCase()] || 99;
                const weightB = committeeRoleWeight[b.role?.toLowerCase()] || 99;
                return weightA - weightB;
            });

        const generalSorted = generalRaw
            .filter(matchesQuery)
            .sort((a, b) => {
                if (sortOrder === 'alpha') {
                    const nameA = (a.user?.name || '').toLowerCase();
                    const nameB = (b.user?.name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                }
                const dateA = new Date(a.joined_at || a.created_at || 0).getTime();
                const dateB = new Date(b.joined_at || b.created_at || 0).getTime();
                return dateB - dateA;
            });

        return {
            rawCommittee: committeeRaw,
            rawGeneral: generalRaw,
            committeeMembers: committeeSorted,
            generalMembers: generalSorted,
        };
    }, [members, searchQuery, sortOrder]);

    // Role dropdown change handler
    const handleRoleChange = async (targetUserId, newRole) => {
        setUpdatingUserId(targetUserId);
        setError(null);
        setActionMessage(null);

        // Optimistic UI update
        const prevMembers = [...members];
        setMembers((prev) =>
            prev.map((m) => (m.user_id === targetUserId ? { ...m, role: newRole, positions: newRole === 'member' ? [] : m.positions } : m))
        );

        try {
            await clubService.updateMemberRole(clubId, targetUserId, newRole);
            setActionMessage(`Member role successfully updated to ${roleLabels[newRole] || newRole}.`);
            loadData();
        } catch (err) {
            // Revert on error
            setMembers(prevMembers);
            setError(err.response?.data?.message || 'Failed to update member role');
        } finally {
            setUpdatingUserId(null);
        }
    };

    // Remove member handler
    const handleRemoveMember = async (targetUserId, targetMemberName) => {
        if (!window.confirm(`Are you sure you want to remove ${targetMemberName || 'this member'} from the club?`)) {
            return;
        }

        setError(null);
        setActionMessage(null);

        // Optimistic UI remove
        const prevMembers = [...members];
        setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));

        try {
            await clubService.removeMember(clubId, targetUserId);
            setActionMessage(`${targetMemberName || 'Member'} removed from the club successfully.`);
            loadData();
        } catch (err) {
            setMembers(prevMembers);
            setError(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleOpenDetails = (member) => {
        setSelectedMember(member);
        setIsDetailsModalOpen(true);
    };

    const formatDate = (dateStr) => formatDisplayDate(dateStr) || 'N/A';

    // Advisor state & handlers
    const [advisorToEdit, setAdvisorToEdit] = useState(null);
    const [advisorEditIndex, setAdvisorEditIndex] = useState(null);

    const rawAdvisors = club?.advisors || club?.advisor;
    const advisors = Array.isArray(rawAdvisors)
        ? rawAdvisors
        : (rawAdvisors && rawAdvisors.name ? [rawAdvisors] : []);

    const handleOpenAddAdvisor = () => {
        setAdvisorToEdit(null);
        setAdvisorEditIndex(null);
        setIsAdvisorModalOpen(true);
    };

    const handleOpenEditAdvisor = (adv, index) => {
        setAdvisorToEdit(adv);
        setAdvisorEditIndex(index);
        setIsAdvisorModalOpen(true);
    };

    const handleDeleteAdvisor = async (indexToDelete) => {
        if (!window.confirm('Are you sure you want to remove this advisor?')) return;
        const updatedList = advisors.filter((_, idx) => idx !== indexToDelete);
        try {
            const res = await clubService.updateAdvisor(clubId, { advisors: updatedList });
            setClub((prev) => ({ ...prev, advisor: updatedList, advisors: updatedList }));
            setActionMessage('Advisor removed successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove advisor.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Global Search Bar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-[#0b1c30] flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" /> Members Directory
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isSystemAdmin
                                ? 'Admin Mode: Full control over committee designations & general member roles'
                                : isExecutive
                                ? 'Executive Mode: Manage member promotions and advisor details'
                                : 'Member View: Executive roster & member list'}
                        </p>
                    </div>

                    {/* Filter / Search Input */}
                    <div className="relative w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="Filter by name, student ID, or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-white"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                </div>

                {actionMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{actionMessage}</span>
                    </div>
                )}

                {error && <ErrorBanner message={error} />}
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <>
                    {/* SECTION 1 — CLUB COMMITTEE */}
                    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                        {/* Committee Section Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-blue-600" />
                                Club Committee ({rawCommittee.length})
                            </h3>
                        </div>

                        {/* Faculty / Club Advisors Section */}
                        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100 rounded-xl p-4 sm:p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                                        Faculty / Club Advisors ({advisors.length})
                                    </span>
                                </div>
                                {canEditAdvisor && (
                                    <button
                                        onClick={handleOpenAddAdvisor}
                                        className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 shadow-2xs transition-colors flex items-center gap-1.5"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                                        Add Advisor
                                    </button>
                                )}
                            </div>

                            {advisors.length === 0 ? (
                                <p className="text-xs font-medium text-slate-500 italic py-1">
                                    No advisor assigned yet.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                    {advisors.map((adv, idx) => (
                                        <div key={adv.id || idx} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5 relative group">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className="text-sm font-bold text-[#0b1c30]">{adv.name}</h4>
                                                    {adv.title && (
                                                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                                                            <Briefcase className="w-3 h-3 text-blue-600 shrink-0" />
                                                            {adv.title}
                                                        </p>
                                                    )}
                                                </div>
                                                {canEditAdvisor && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => handleOpenEditAdvisor(adv, idx)}
                                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                            title="Edit advisor"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAdvisor(idx)}
                                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                                            title="Delete advisor"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-1 border-t border-slate-100">
                                                {adv.department && (
                                                    <span className="flex items-center gap-1">
                                                        <Building className="w-3 h-3 text-blue-600 shrink-0" />
                                                        {adv.department}
                                                    </span>
                                                )}
                                                {adv.contact_email && (
                                                    <span className="flex items-center gap-1 font-mono text-blue-700 font-semibold">
                                                        <Mail className="w-3 h-3 text-blue-600 shrink-0" />
                                                        {adv.contact_email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Committee Member List */}
                        {committeeMembers.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500 text-xs font-medium">
                                    {searchQuery ? 'No committee members match your search.' : 'No committee members assigned yet.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-[11px] font-bold tracking-wider">
                                        <tr>
                                            <th className="p-3">Member</th>
                                            <th className="p-3">Designation</th>
                                            <th className="p-3">Department</th>
                                            <th className="p-3">Joined Date</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {committeeMembers.map((m) => {
                                            const isSelf = user && m.user_id === user.id;
                                            const role = (m.role || '').toLowerCase();
                                            const isTargetPresident = role === 'president';
                                            const targetRank = getRoleRank(role);
                                            const canManageCommitteeTarget = (isSystemAdmin || myRank > targetRank) && !isSelf;

                                            const committeeRoleOptions = [
                                                { value: 'vice_president', label: 'Vice President', rank: 9 },
                                                { value: 'secretary', label: 'Secretary', rank: 8 },
                                                { value: 'treasurer', label: 'Treasurer', rank: 8 },
                                                { value: 'executive', label: 'Executive', rank: 7 },
                                                { value: 'member', label: 'Demote to General Member', rank: 1 },
                                            ].filter((opt) => isSystemAdmin || opt.rank < myRank);

                                            return (
                                                <tr key={m.id} className="hover:bg-[#f8f9ff]/70 transition-colors">
                                                    <td className="p-3 font-semibold text-[#0b1c30]">
                                                        <div className="flex items-center gap-2">
                                                            <span>{m.user?.name || `User #${m.user_id}`}</span>
                                                            {isSelf && (
                                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md border border-blue-200">
                                                                    (You)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-slate-400 font-mono block">
                                                            {m.user?.student_id || m.user?.email || ''}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200 inline-block capitalize">
                                                            {roleLabels[m.role] || m.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">{m.user?.department || 'General'}</td>
                                                    <td className="p-3">{formatDate(m.joined_at || m.created_at)}</td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleOpenDetails(m)}
                                                                className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> Details
                                                            </button>
                                                            {/* Transfer Presidency button: ONLY beside the current president, ONLY ONE row */}
                                                            {isTargetPresident && (isPresident || isSystemAdmin) && (
                                                                <button
                                                                    onClick={() => setIsTransferModalOpen(true)}
                                                                    className="px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                                                                    title="Transfer presidency to another member"
                                                                >
                                                                    <Crown className="w-3.5 h-3.5 text-amber-600" /> Transfer
                                                                </button>
                                                            )}
                                                            {/* Remove button: higher rank can remove lower rank on Committee (never on President) */}
                                                            {canManageCommitteeTarget && !isTargetPresident && (
                                                                <button
                                                                    onClick={() => handleRemoveMember(m.user_id, m.user?.name)}
                                                                    className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* SECTION 2 — GENERAL MEMBERS */}
                    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                        {/* General Members Section Header & Sorting */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                            <h3 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-emerald-600" />
                                General Members ({rawGeneral.length})
                            </h3>

                            {/* Sort Controls */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                    <ArrowUpDown className="w-3 h-3 text-slate-400" /> Sort:
                                </span>
                                <button
                                    onClick={() => setSortOrder('joined_desc')}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                                        sortOrder === 'joined_desc'
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    Newest First
                                </button>
                                <button
                                    onClick={() => setSortOrder('alpha')}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                                        sortOrder === 'alpha'
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    Alphabetical
                                </button>
                            </div>
                        </div>

                        {/* General Member List */}
                        {generalMembers.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500 text-xs font-medium">
                                    {searchQuery
                                        ? 'No general members match your search.'
                                        : 'No general members yet. Members who join the club will appear here.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-[11px] font-bold tracking-wider">
                                        <tr>
                                            <th className="p-3">Member</th>
                                            <th className="p-3">Department</th>
                                            <th className="p-3">Joined Date</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {generalMembers.map((m) => {
                                            const isSelf = user && m.user_id === user.id;
                                            const targetRank = getRoleRank(m.role);
                                            const canManageGeneralTarget = (isSystemAdmin || myRank > targetRank) && !isSelf;

                                            return (
                                                <tr key={m.id} className="hover:bg-[#f8f9ff]/70 transition-colors">
                                                    <td className="p-3 font-semibold text-[#0b1c30]">
                                                        <div className="flex items-center gap-2">
                                                            <span>{m.user?.name || `User #${m.user_id}`}</span>
                                                            {isSelf && (
                                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md border border-blue-200">
                                                                    (You)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-slate-400 font-mono block">
                                                            {m.user?.student_id || m.user?.email || ''}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">{m.user?.department || 'General'}</td>
                                                    <td className="p-3">{formatDate(m.joined_at || m.created_at)}</td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleOpenDetails(m)}
                                                                className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> Details
                                                            </button>
                                                            {canManageGeneralTarget && (
                                                                <button
                                                                    onClick={() => handleRemoveMember(m.user_id, m.user?.name)}
                                                                    className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* Advisor Edit Modal */}
            <EditAdvisorModal
                isOpen={isAdvisorModalOpen}
                onClose={() => setIsAdvisorModalOpen(false)}
                clubId={clubId}
                currentAdvisors={advisors}
                advisorToEdit={advisorToEdit}
                editIndex={advisorEditIndex}
                onAdvisorUpdated={(newAdvisors) => {
                    setClub((prev) => ({ ...prev, advisor: newAdvisors, advisors: newAdvisors }));
                }}
            />

            {/* Transfer Presidency Modal */}
            <TransferPresidencyModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                clubId={clubId}
                members={members}
                currentPresidentId={currentPresident?.user_id}
                onTransferred={() => {
                    setActionMessage('Presidency successfully transferred.');
                    loadData();
                }}
            />

            {/* Member Details Modal */}
            {selectedMember && (
                <Modal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    title={`Member Profile: ${selectedMember.user?.name || 'User Details'}`}
                >
                    <div className="space-y-5">
                        <div className="flex items-center gap-4 p-4 bg-[#f8f9ff] rounded-xl border border-slate-200">
                            <div className="w-12 h-12 bg-[#0b1c30] text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                                {selectedMember.user?.name ? selectedMember.user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-[#0b1c30] text-base truncate">{selectedMember.user?.name}</h3>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-full border border-blue-200 capitalize">
                                        {roleLabels[selectedMember.role] || selectedMember.role || 'Member'}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs flex flex-wrap items-center gap-2 font-mono">
                                    <span>ID: <strong>{selectedMember.user?.student_id || 'N/A'}</strong></span>
                                    <span>•</span>
                                    <span>{selectedMember.user?.email}</span>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                <User className="w-4 h-4 text-blue-600" /> General Information
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                    <span className="text-slate-500 block">Department:</span>
                                    <span className="font-semibold text-slate-800">{selectedMember.user?.department || 'Not specified'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Academic Session:</span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedMember.user?.session !== null && selectedMember.user?.session !== undefined
                                            ? formatSessionLabel(selectedMember.user.session)
                                            : 'Not specified'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Phone Number:</span>
                                    <span className="font-semibold text-slate-800">{selectedMember.user?.phone || 'Not specified'}</span>
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

                        {/* Rank & Role Promotion / Demotion Controls */}
                        {(() => {
                            const selectedTargetRank = getRoleRank(selectedMember.role);
                            const canManageSelected = (isSystemAdmin || myRank > selectedTargetRank) && selectedMember.user_id !== user?.id && selectedMember.role !== 'president';

                            if (!canManageSelected) return null;

                            return (
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                        <ShieldCheck className="w-4 h-4 text-blue-600" /> Rank & Position Management
                                    </h4>
                                    <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-3">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Change Member Position / Rank
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <select
                                                value={selectedMember.role || 'member'}
                                                onChange={(e) => {
                                                    const newRole = e.target.value;
                                                    handleRoleChange(selectedMember.user_id, newRole);
                                                    setSelectedMember((prev) => prev ? { ...prev, role: newRole } : null);
                                                }}
                                                disabled={updatingUserId === selectedMember.user_id}
                                                className="w-full sm:w-auto px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-[#0b1c30] focus:border-blue-600 shadow-2xs"
                                            >
                                                <option value="member">General Member</option>
                                                {myRank > 8 && <option value="treasurer">Treasurer</option>}
                                                {myRank > 8 && <option value="secretary">Secretary</option>}
                                                {myRank > 9 && <option value="vice_president">Vice President</option>}
                                            </select>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Promoting to Vice President, Secretary, or Treasurer moves the member to the <strong>Club Committee</strong>. Changing to General Member returns them to <strong>General Members</strong>.
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="flex justify-end pt-3 border-t border-slate-200">
                            <Button variant="secondary" onClick={() => setIsDetailsModalOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default MembersDirectory;
