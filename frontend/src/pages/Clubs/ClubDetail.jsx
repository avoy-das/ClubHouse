import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';
import { useAuth } from '../../context/AuthContext';

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
    const { isAdmin } = useAuth();
    const [club, setClub]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [suspending, setSuspending] = useState(false);

    // Contextual member search state
    const [memberQuery, setMemberQuery] = useState('');
    const [membersList, setMembersList] = useState([]);
    const [searchingMembers, setSearchingMembers] = useState(false);

    useEffect(() => {
        clubService.getClub(id)
            .then(res => {
                setClub(res.data);
                if (res.data?.members) {
                    setMembersList(res.data.members);
                }
            })
            .catch(() => setError('Club not found.'))
            .finally(() => setLoading(false));
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

            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{club.name}</h1>
                        <p className="text-slate-500 text-sm mt-1">{club.department}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                            {club.category}
                        </span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                                ? 'Admin mode: Searching platform-wide members'
                                : 'Executive/Member mode: Searching club roster'}
                        </p>
                    </div>

                    {/* Simple search bar on the page, no tabs */}
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
                        {membersList.map(member => (
                            <div key={member.id} className="flex items-center justify-between py-3">
                                <div>
                                    <span className="text-sm font-semibold text-slate-800 block">
                                        {member.user?.name || member.name || `User #${member.user_id}`}
                                    </span>
                                    {(member.user?.student_id || member.student_id) && (
                                        <span className="text-xs text-slate-500">
                                            ID: {member.user?.student_id || member.student_id} {member.user?.department ? `• ${member.user.department}` : ''}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium capitalize">
                                    {roleLabels[member.role] || member.role || 'Member'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-400 text-sm py-4 text-center">
                        {memberQuery ? `No members found matching '${memberQuery}'` : 'No members yet.'}
                    </p>
                )}
            </div>
        </MainLayout>
    );
};

export default ClubDetail;
