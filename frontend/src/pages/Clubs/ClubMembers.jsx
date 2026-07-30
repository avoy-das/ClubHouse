import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import clubService from '../../services/clubService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import MembershipRequestList from '../../components/clubs/MembershipRequestList';
import PositionAssignment from '../../components/clubs/PositionAssignment';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';

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
            <div className="flex items-center justify-between bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Club Members Directory</h1>
                    <p className="text-gray-500 text-sm">Members and executive positions.</p>
                </div>
                <Link to={`/clubs/${clubId}`}>
                    <Button variant="secondary">← Back to Club</Button>
                </Link>
            </div>

            {error && <ErrorBanner message={error} />}

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Active Roster ({members.length})</h3>
                    {members.length === 0 ? (
                        <p className="text-gray-500 text-sm">No members in this club yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Email</th>
                                        <th className="p-3">Positions</th>
                                        <th className="p-3">Joined</th>
                                        {can('can_manage_members') && <th className="p-3 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {members.map((m) => (
                                        <tr key={m.id}>
                                            <td className="p-3 font-semibold text-gray-900">
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
                                                    <span className="text-gray-400 text-xs">Member</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            {can('can_manage_members') && (
                                                <td className="p-3 text-right">
                                                    <Button variant="danger" size="sm" onClick={() => handleRemoveMember(m.id)}>
                                                        Remove
                                                    </Button>
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
