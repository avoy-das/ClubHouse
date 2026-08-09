import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import MembersDirectory from '../../components/Clubs/MembersDirectory';
import MembershipRequestList from '../../components/Clubs/MembershipRequestList';
import PositionAssignment from '../../components/Clubs/PositionAssignment';
import AddCommitteeMemberModal from '../../components/Clubs/AddCommitteeMemberModal';
import { ArrowLeft, Users, PlusCircle } from 'lucide-react';

const ClubMembersContent = () => {
    const { clubId } = useParams();
    const { can } = useClubPermissions();

    const [isAddCommitteeModalOpen, setIsAddCommitteeModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    return (
        <div className="space-y-6">
            {/* Top Page Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-2xl shadow-xs border border-slate-200 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" /> Club Members Directory
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">Explore executive leadership roster and general membership base.</p>
                </div>
                <div className="flex items-center gap-3">
                    {can('can_manage_members') && (
                        <button
                            onClick={() => setIsAddCommitteeModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                            <PlusCircle className="w-4 h-4" /> Add Committee Member
                        </button>
                    )}
                    <Link to={`/clubs/${clubId}`}>
                        <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5">
                            <ArrowLeft className="w-4 h-4" /> Back to Club
                        </button>
                    </Link>
                </div>
            </div>

            {/* Reusable Members Directory (Two-Section Layout with Advisor Card) */}
            <MembersDirectory key={refreshTrigger} clubId={clubId} />

            {/* Executive management tools */}
            {can('can_manage_members') && (
                <>
                    <MembershipRequestList clubId={clubId} onRequestProcessed={handleRefresh} />
                    <PositionAssignment clubId={clubId} onUpdated={handleRefresh} />
                </>
            )}

            {/* Add Committee Member Side-by-Side Modal */}
            <AddCommitteeMemberModal
                isOpen={isAddCommitteeModalOpen}
                onClose={() => setIsAddCommitteeModalOpen(false)}
                clubId={clubId}
                onMemberAdded={handleRefresh}
            />
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
