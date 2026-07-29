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
    const [club, setClub]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState(null);
    const [suspending, setSuspending] = useState(false);

    useEffect(() => {
        clubService.getClub(id)
            .then(res => setClub(res.data))
            .catch(() => setError('Club not found.'))
            .finally(() => setLoading(false));
    }, [id]);

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

            {/* Members */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-semibold text-slate-800 mb-4">Members</h2>
                {club.members && club.members.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {club.members.map(member => (
                            <div key={member.id} className="flex items-center justify-between py-3">
                                <span className="text-sm text-slate-800">{member.user?.name}</span>
                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                    {roleLabels[member.role] || member.role}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-400 text-sm">No members yet.</p>
                )}
            </div>
        </MainLayout>
    );
};

export default ClubDetail;