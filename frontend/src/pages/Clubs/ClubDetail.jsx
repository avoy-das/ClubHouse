import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import EditClubModal from '../../components/Clubs/EditClubModal';
import ClubAuditLogModal from '../../components/Clubs/ClubAuditLogModal';
import EventModal from '../../components/Events/EventModal';
import MembersDirectory from '../../components/Clubs/MembersDirectory';
import { ArrowLeft, Edit, FileText, Shield, ShieldAlert, Megaphone, Target, Calendar, Clock, MapPin, ExternalLink } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';
import { roleLabels } from '../../utils/roleUtils';

const ClubDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [club, setClub]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [suspending, setSuspending] = useState(false);
    const [activating, setActivating] = useState(false);
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

    const myMembership = club?.members?.find(m => m.user_id === user?.id);
    const isExec = isAdmin() || (myMembership && ['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(myMembership.role));
    const isClubExec = !user?.is_admin && Boolean(myMembership && ['president', 'vice_president', 'secretary', 'treasurer', 'executive'].includes(myMembership.role));

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
                setClub(clubRes.value.data);
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

    const handleClubUpdated = (updatedClub, message) => {
        setClub(updatedClub);
        setToast({
            type: 'success',
            message: message || 'Club details updated successfully.',
        });
    };

    const handleMembersClubUpdate = useCallback((updated) => {
        setClub(updated);
    }, []);

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
                        <div className="p-2 bg-amber-200/80 rounded-xl text-amber-800 font-bold shrink-0"><Clock className="w-5 h-5 text-amber-800" /></div>
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
                        <div className="p-2 bg-amber-200/80 rounded-xl text-amber-800 font-bold shrink-0"><Clock className="w-5 h-5 text-amber-800" /></div>
                        <div>
                            <p className="text-xs font-bold text-amber-950 uppercase tracking-wider">Club Edit Request Under Review</p>
                            <p className="text-xs text-amber-900 mt-0.5">
                                Updated information submitted by <strong className="font-bold">{pendingEditRequest.requested_by?.name || 'Executive'}</strong> is currently pending administrator review and approval.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspended Club Banner */}
            {club.status === 'suspended' && (
                <div className="mb-6 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl p-5 shadow-xs flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-rose-200/80 rounded-xl text-rose-800 font-bold shrink-0 mt-0.5">
                            <ShieldAlert className="w-5 h-5 text-rose-800" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-rose-950 uppercase tracking-wider">Club Suspended by Administration</p>
                            <p className="text-xs text-rose-900 mt-1">
                                This club is currently suspended by administration. Normal club operations and event features are temporarily paused.
                            </p>
                            {club.suspension_reason && (
                                <div className="mt-3 p-3 bg-white/80 border border-rose-200 rounded-xl">
                                    <p className="text-xs font-bold text-rose-950">Official Reason for Suspension:</p>
                                    <p className="text-xs text-rose-900 mt-0.5 whitespace-pre-wrap">{club.suspension_reason}</p>
                                </div>
                            )}
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
                                <FileText className="w-4 h-4 text-blue-600 inline shrink-0" />
                                <span>View Submitted Permission Document / Letter</span>
                                <ExternalLink className="w-3.5 h-3.5 inline shrink-0" />
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
                                        <div className="text-slate-500 truncate flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {ev.location_value}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Contextual Members Directory (Two-Section Layout with Advisor Card) */}
            <MembersDirectory clubId={id} initialClub={club} onClubUpdated={handleMembersClubUpdate} />

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
