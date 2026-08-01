import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import clubService from '../../services/clubService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import MembershipRequestList from '../../components/clubs/MembershipRequestList';
import PositionAssignment from '../../components/clubs/PositionAssignment';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { ArrowLeft, Users } from 'lucide-react';

const ClubMembersContent = () => {
    const { clubId } = useParams();
    const { can } = useClubPermissions();

    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" /> Club Members Directory
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Members and executive positions.</p>
                </div>
                <Link to={`/clubs/${clubId}`}>
                    <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5">
                        <ArrowLeft className="w-4 h-4" /> Back to Club
                    </button>
                </Link>
            </div>

            {error && <ErrorBanner message={error} />}

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                    <h3 className="text-lg font-bold text-[#0b1c30] mb-4">Active Roster ({members.length})</h3>
                    {members.length === 0 ? (
                        <p className="text-slate-500 text-sm">No members in this club yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Email</th>
                                        <th className="p-3">Positions</th>
                                        <th className="p-3">Joined</th>
                                        {can('can_manage_members') && <th className="p-3 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {members.map((m) => (
                                        <tr key={m.id} className="hover:bg-[#f8f9ff]/60 transition-colors">
                                            <td className="p-3 font-semibold text-[#0b1c30]">
                                                {m.user?.name || `Member #${m.id}`}
                                            </td>
                                            <td className="p-3">{m.user?.email || 'N/A'}</td>
                                            <td className="p-3">
                                                {m.positions && m.positions.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {m.positions.map((p) => (
                                                            <span
                                                                key={p.id}
                                                                className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium"
                                                            >
                                                                {p.title}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">Member</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            {can('can_manage_members') && (
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handleRemoveMember(m.id)}
                                                        className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                                                    >
                                                        Remove
                                                    </button>
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

            {/* Executive controls */}
            {can('can_manage_members') && (
                <>
                    <MembershipRequestList clubId={clubId} onRequestProcessed={loadMembers} />
                    <PositionAssignment clubId={clubId} members={members} onUpdated={loadMembers} />
                </>
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
