import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import clubService from '../../services/clubService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import MembershipRequestList from '../../components/clubs/MembershipRequestList';
import PositionAssignment from '../../components/clubs/PositionAssignment';
import AddCommitteeMemberModal from '../../components/clubs/AddCommitteeMemberModal';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Modal from '../../components/ui/Modal';
import { ArrowLeft, Users, Eye, User, FileText, CheckCircle2, ShieldCheck, UserCheck, PlusCircle } from 'lucide-react';
import { formatSessionLabel } from '../../utils/sessionUtils';

const ClubMembersContent = () => {
    const { clubId } = useParams();
    const { can } = useClubPermissions();

    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Active tab: 'committee' or 'members'
    const [activeTab, setActiveTab] = useState('committee');

    // Add Committee Member Modal state
    const [isAddCommitteeModalOpen, setIsAddCommitteeModalOpen] = useState(false);

    // View Member Details modal state
    const [selectedMember, setSelectedMember] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const loadMembers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await clubService.listMembers(clubId);
            setMembers(data.data || data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load member list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clubId) loadMembers();
    }, [clubId]);

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            await clubService.removeMember(clubId, memberId);
            loadMembers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleOpenDetails = (member) => {
        setSelectedMember(member);
        setIsDetailsModalOpen(true);
    };

    // Filter members into Committee vs Members
    const committeeMembers = members.filter((m) => {
        const isExecRole = ['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(m.role?.toLowerCase());
        const hasPositions = m.positions && m.positions.length > 0;
        return isExecRole || hasPositions;
    });

    const generalMembers = members.filter((m) => {
        const isExecRole = ['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(m.role?.toLowerCase());
        const hasPositions = m.positions && m.positions.length > 0;
        return !isExecRole && !hasPositions;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-xl shadow-xs border border-slate-200 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" /> Club Members Directory
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Explore club committee leadership and general member roster.</p>
                </div>
                <div className="flex items-center gap-3">
                    {can('can_manage_members') && (
                        <button
                            onClick={() => setIsAddCommitteeModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                        >
                            <PlusCircle className="w-4 h-4" /> Add New Committee Member
                        </button>
                    )}
                    <Link to={`/clubs/${clubId}`}>
                        <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5">
                            <ArrowLeft className="w-4 h-4" /> Back to Club
                        </button>
                    </Link>
                </div>
            </div>

            {error && <ErrorBanner message={error} />}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 pt-3 rounded-t-xl">
                <button
                    onClick={() => setActiveTab('committee')}
                    className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === 'committee'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    Committee ({committeeMembers.length})
                </button>
                <button
                    onClick={() => setActiveTab('members')}
                    className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === 'members'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <UserCheck className="w-4 h-4" />
                    Members ({generalMembers.length})
                </button>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="bg-white p-6 rounded-b-xl shadow-xs border border-slate-200 border-t-0">
                    {activeTab === 'committee' ? (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-[#0b1c30]">Executive Committee Personnel</h3>
                                {can('can_manage_members') && (
                                    <button
                                        onClick={() => setIsAddCommitteeModalOpen(true)}
                                        className="text-xs text-blue-600 hover:underline font-bold"
                                    >
                                        + Manage Designations & Admit Member
                                    </button>
                                )}
                            </div>

                            {committeeMembers.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                                    <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500 text-sm font-medium">No committee members assigned yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-xs font-semibold">
                                            <tr>
                                                <th className="p-3">Name</th>
                                                <th className="p-3">Email</th>
                                                <th className="p-3">Committee Designation</th>
                                                <th className="p-3">Joined</th>
                                                {can('can_manage_members') && <th className="p-3 text-right">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {committeeMembers.map((m) => (
                                                <tr key={m.id} className="hover:bg-[#f8f9ff]/60 transition-colors">
                                                    <td className="p-3 font-semibold text-[#0b1c30]">
                                                        {m.user?.name || `Member #${m.id}`}
                                                    </td>
                                                    <td className="p-3 font-mono text-xs">{m.user?.email || 'N/A'}</td>
                                                    <td className="p-3">
                                                        {m.positions && m.positions.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {m.positions.map((p) => (
                                                                    <span
                                                                        key={p.id}
                                                                        className="bg-blue-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-2xs"
                                                                    >
                                                                        {p.title}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold capitalize">
                                                                {m.role?.replace('_', ' ')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        {m.joined_at || m.created_at ? new Date(m.joined_at || m.created_at).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    {can('can_manage_members') && (
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleOpenDetails(m)}
                                                                    className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" /> Profile Details
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveMember(m.id)}
                                                                    className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-base font-bold text-[#0b1c30] mb-4">General Members</h3>

                            {generalMembers.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500 text-sm font-medium">No general members in this club yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-xs font-semibold">
                                            <tr>
                                                <th className="p-3">Name</th>
                                                <th className="p-3">Email</th>
                                                <th className="p-3">Department</th>
                                                <th className="p-3">Joined</th>
                                                {can('can_manage_members') && <th className="p-3 text-right">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {generalMembers.map((m) => (
                                                <tr key={m.id} className="hover:bg-[#f8f9ff]/60 transition-colors">
                                                    <td className="p-3 font-semibold text-[#0b1c30]">
                                                        {m.user?.name || `Member #${m.id}`}
                                                    </td>
                                                    <td className="p-3 font-mono text-xs">{m.user?.email || 'N/A'}</td>
                                                    <td className="p-3">{m.user?.department || 'General'}</td>
                                                    <td className="p-3">
                                                        {m.joined_at || m.created_at ? new Date(m.joined_at || m.created_at).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    {can('can_manage_members') && (
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleOpenDetails(m)}
                                                                    className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" /> Details
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveMember(m.id)}
                                                                    className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Executive management tools */}
            {can('can_manage_members') && (
                <>
                    <MembershipRequestList clubId={clubId} onRequestProcessed={loadMembers} />
                    <PositionAssignment clubId={clubId} members={members} onUpdated={loadMembers} />
                </>
            )}

            {/* Add Committee Member Side-by-Side Modal */}
            <AddCommitteeMemberModal
                isOpen={isAddCommitteeModalOpen}
                onClose={() => setIsAddCommitteeModalOpen(false)}
                clubId={clubId}
                onMemberAdded={loadMembers}
            />

            {/* View Member Details Modal */}
            {selectedMember && (
                <Modal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    title={`Member Profile: ${selectedMember.user?.name || 'User Details'}`}
                >
                    <div className="space-y-5">
                        {/* Profile Header */}
                        <div className="flex items-center gap-4 p-4 bg-[#f8f9ff] rounded-xl border border-slate-200">
                            <div className="w-12 h-12 bg-[#0b1c30] text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                                {selectedMember.user?.name ? selectedMember.user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-[#0b1c30] text-base truncate">{selectedMember.user?.name}</h3>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-full border border-blue-200 capitalize">
                                        {selectedMember.role || 'Member'}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs flex flex-wrap items-center gap-2 font-mono">
                                    <span>ID: <strong>{selectedMember.user?.student_id || 'N/A'}</strong></span>
                                    <span>•</span>
                                    <span>{selectedMember.user?.email}</span>
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

                        {/* Modal Footer */}
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

const ClubMembers = () => {
    const { clubId } = useParams();
    return (
        <ClubPermissionsProvider clubId={clubId}>
            <ClubMembersContent />
        </ClubPermissionsProvider>
    );
};

export default ClubMembers;
