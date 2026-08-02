import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import recruitmentService from '../../services/recruitmentService';
import authService from '../../services/authService';
import clubService from '../../services/clubService';
import { useAuth } from '../../context/AuthContext';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Modal from '../../components/ui/Modal';
import { Target, Calendar, Clock, Plus, ArrowLeft, ArrowRight, Pencil, Trash, ClipboardList, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';

const RecruitmentListContent = () => {
    const { clubId } = useParams();
    const { can } = useClubPermissions();
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [availableClubs, setAvailableClubs] = useState([]);
    const [isExecUser, setIsExecUser] = useState(false);

    // Modal state for creation/editing
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editNoticeId, setEditNoticeId] = useState(null);
    const [selectedClubId, setSelectedClubId] = useState('');
    const [title, setTitle] = useState('');
    const [session, setSession] = useState('');
    const [description, setDescription] = useState('');
    const [requirements, setRequirements] = useState('');
    const [opensAt, setOpensAt] = useState('');
    const [closesAt, setClosesAt] = useState('');
    const status = 'open';
    const [submitting, setSubmitting] = useState(false);

    // Ineligibility warning modal
    const [showIneligibleModal, setShowIneligibleModal] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            let res;
            if (clubId) {
                res = await recruitmentService.listForClub(clubId);
            } else {
                res = await recruitmentService.listAll();
            }
            const list = res.data || res;
            const loadedNotices = Array.isArray(list) ? list : [];
            setNotices(loadedNotices);

            // Determine executive clubs and eligibility
            let clubsList = [];
            let execFlag = false;

            if (isAdmin()) {
                execFlag = true;
                const allClubsRes = await clubService.list();
                clubsList = (allClubsRes.data || allClubsRes || []).filter(c => c.status === 'approved');
            } else {
                const membersRes = await authService.getMyMemberships();
                const memberships = membersRes.data || membersRes || [];
                const execMemberships = memberships.filter(m => 
                    m.status === 'active' && 
                    (m.role !== 'member' || (m.positions && m.positions.some(p => p.position?.is_executive || p.position?.can_manage_recruitment)))
                );
                if (execMemberships.length > 0) {
                    execFlag = true;
                    clubsList = execMemberships.map(m => m.club).filter(Boolean);
                }
            }

            setIsExecUser(execFlag);

            // Calculate eligibility for each club
            const annotatedClubs = clubsList.map(club => {
                const hasActive = loadedNotices.some(n => 
                    n.club_id === club.id && 
                    n.status === 'open' && 
                    new Date(n.closes_at) > new Date()
                );
                return {
                    ...club,
                    isEligible: !hasActive,
                    ineligibleReason: hasActive ? 'Active recruitment campaign in progress' : null
                };
            });

            setAvailableClubs(annotatedClubs);

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load recruitment data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [clubId]);

    const handleCreateSidebarClick = () => {
        if (!isExecUser && !isAdmin()) {
            setShowIneligibleModal(true);
            return;
        }

        if (availableClubs.length === 0) {
            setShowIneligibleModal(true);
            return;
        }

        // Pre-select club if clubId exists in URL or if only one club available
        if (clubId) {
            setSelectedClubId(clubId);
        } else {
            const firstEligible = availableClubs.find(c => c.isEligible);
            setSelectedClubId(firstEligible ? String(firstEligible.id) : String(availableClubs[0]?.id || ''));
        }

        handleCreateOpen();
    };

    const handleCreateOpen = () => {
        setIsEditMode(false);
        setEditNoticeId(null);
        setTitle('');
        setSession('Spring 2026');
        setDescription('');
        setRequirements('');
        
        // Default start date = now, default end date = +14 days
        const now = new Date();
        const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        
        const formatForInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        
        setOpensAt(formatForInput(now));
        setClosesAt(formatForInput(twoWeeks));
        setIsModalOpen(true);
    };

    const handleEditOpen = (notice) => {
        setIsEditMode(true);
        setEditNoticeId(notice.id);
        setSelectedClubId(String(notice.club_id));
        setTitle(notice.title || '');
        setSession(notice.session || '');
        setDescription(notice.description || '');
        setRequirements(notice.requirements || '');
        
        const formatForInput = (dateString) => {
            if (!dateString) return '';
            const d = new Date(dateString);
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        };
        
        setOpensAt(formatForInput(notice.opens_at));
        setClosesAt(formatForInput(notice.closes_at));
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const toUTC = (localDateString) => {
                if (!localDateString) return null;
                return new Date(localDateString).toISOString();
            };

            const payload = {
                title,
                session,
                description,
                requirements,
                opens_at: toUTC(opensAt),
                closes_at: toUTC(closesAt),
                status,
            };
            
            if (isEditMode) {
                await recruitmentService.update(editNoticeId, payload);
            } else {
                if (!selectedClubId) {
                    throw new Error('Please select a target club for this recruitment campaign.');
                }
                await recruitmentService.create(selectedClubId, payload);
            }
            
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || err.message || `Failed to ${isEditMode ? 'update' : 'create'} recruitment notice.`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (noticeId) => {
        if (!window.confirm('Are you sure you want to delete this recruitment notice?')) return;
        try {
            await recruitmentService.remove(noticeId);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete recruitment notice.');
        }
    };

    const isUserExecutive = can('can_manage_recruitment') || isAdmin() || isExecUser;

    if (loading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col md:flex-row gap-6">
            {/* Action Sidebar */}
            <div className="w-full md:w-64 shrink-0">
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden sticky top-6">
                    <div className="p-4 bg-slate-900 text-white">
                        <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-400" />
                            Recruitment Hub
                        </h3>
                    </div>
                    <div className="p-3 space-y-2">
                        {isUserExecutive ? (
                            <button 
                                onClick={handleCreateSidebarClick}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
                            >
                                <Plus className="w-4 h-4" /> Start Recruitment Campaign
                            </button>
                        ) : (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                    Executive Access Only
                                </div>
                                <p className="text-[11px] text-amber-700 leading-snug">
                                    Only official club executives can launch recruitment campaigns.
                                </p>
                            </div>
                        )}

                        <button 
                            onClick={() => {
                                if (clubId) {
                                    navigate(`/clubs/${clubId}`);
                                } else {
                                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                        >
                            <ClipboardList className="w-4 h-4 text-slate-500" /> View Applications
                        </button>
                    </div>

                    {/* Executive eligibility list snippet */}
                    {isExecUser && availableClubs.length > 0 && (
                        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
                            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-500" /> Eligible Clubs
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {availableClubs.map(c => (
                                    <div key={c.id} className="flex items-center justify-between text-xs p-1.5 bg-white rounded-lg border border-slate-200">
                                        <span className="font-semibold text-slate-800 truncate max-w-[110px]">{c.name}</span>
                                        {c.isEligible ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200" title="Active campaign already running">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
                    <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-full mb-1">
                            <Target className="w-3.5 h-3.5" /> Official Recruitment
                        </div>
                        <h1 className="text-2xl font-extrabold text-[#0b1c30]">
                            Member Recruitment
                        </h1>
                        <p className="text-slate-500 text-xs mt-0.5">Explore open recruitment campaigns and join official student organization teams.</p>
                    </div>
                    <div className="flex space-x-3">
                        {clubId && (
                            <Link to={`/clubs/${clubId}`}>
                                <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5">
                                    <ArrowLeft className="w-4 h-4" /> Back to Club
                                </button>
                            </Link>
                        )}
                    </div>
                </div>

                {error && <ErrorBanner message={error} />}

                {notices.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl shadow-xs border border-slate-200 text-slate-500 space-y-3">
                        <Target className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-base font-semibold text-slate-700">No open recruitment campaigns currently available.</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">Check back later or contact club executives for membership updates.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {notices.map((notice) => (
                            <Card key={notice.id} className="flex flex-col justify-between hover:shadow-md transition-all border border-slate-200 bg-white rounded-2xl p-6 space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            {notice.session && (
                                                <span className="inline-block bg-slate-100 text-slate-700 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full mb-1.5 border border-slate-200">
                                                    Session: {notice.session}
                                                </span>
                                            )}
                                            <h3 className="font-bold text-xl text-[#0b1c30] leading-snug">{notice.title}</h3>
                                            {!clubId && notice.club && (
                                                <p className="text-xs font-semibold text-blue-600 flex items-center gap-1 mt-1">
                                                    <Building2 className="w-3.5 h-3.5" /> {notice.club.name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {notice.is_member ? (
                                                <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                                                    Already a Member
                                                </span>
                                            ) : notice.my_application ? (
                                                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200 capitalize">
                                                    Applied ({notice.my_application.status})
                                                </span>
                                            ) : null}
                                            {notice.status && <Badge status={notice.status} />}
                                            {(can('can_manage_recruitment') || isAdmin() || availableClubs.some(c => c.id === notice.club_id)) && (
                                                <div className="flex items-center space-x-1">
                                                    <button onClick={() => handleEditOpen(notice)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Recruitment">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(notice.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Recruitment">
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-600 space-y-1.5 bg-[#f8f9ff] p-3 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-600" /> Opens: {new Date(notice.opens_at).toLocaleString()}</div>
                                        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> Closes: {new Date(notice.closes_at).toLocaleString()}</div>
                                    </div>
                                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{notice.description}</p>
                                </div>
                                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                    <Link to={`/recruitment/${notice.id}`}>
                                        <button className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-xs ${
                                            notice.is_member
                                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                : notice.my_application
                                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300'
                                                : 'bg-[#2563eb] hover:bg-[#0051d5] text-white'
                                        }`}>
                                            {notice.is_member
                                                ? 'View Details (Member)'
                                                : notice.my_application
                                                ? 'View My Application'
                                                : 'View Details & Apply'} <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </Link>
                                    {(can('can_manage_recruitment') || isAdmin() || availableClubs.some(c => c.id === notice.club_id)) && (
                                        <Link to={`/recruitment/${notice.id}/applications`}>
                                            <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] border border-slate-300 text-xs font-bold rounded-xl transition-colors">
                                                Review Applications
                                            </button>
                                        </Link>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Ineligibility Warning Modal */}
            <Modal isOpen={showIneligibleModal} onClose={() => setShowIneligibleModal(false)} title="Recruitment Access Restricted">
                <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="font-bold text-amber-900 text-sm">Cannot Initiate Recruitment Campaign</h4>
                            <p className="text-xs text-amber-800 leading-relaxed">
                                {!isExecUser && !isAdmin()
                                    ? "You are not registered as an active executive for any club. Only club executives and administrators have permission to launch recruitment campaigns."
                                    : "All of your executive clubs currently have an active recruitment campaign in progress. Each club is permitted to host only 1 active recruitment campaign at a time."}
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => setShowIneligibleModal(false)}
                            className="px-4 py-2 bg-[#0b1c30] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit / Create Recruitment Campaign Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Edit Recruitment Campaign" : "Launch New Recruitment Campaign"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isEditMode && (
                        <div>
                            <label className="block text-xs font-bold text-[#0b1c30] mb-1">Target Club</label>
                            <select
                                required
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                value={selectedClubId}
                                onChange={(e) => setSelectedClubId(e.target.value)}
                            >
                                <option value="" disabled>-- Select Club --</option>
                                {availableClubs.map(c => (
                                    <option key={c.id} value={c.id} disabled={!c.isEligible}>
                                        {c.name} {!c.isEligible ? `(${c.ineligibleReason})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-[#0b1c30] mb-1">Campaign Title</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Executive & Member Recruitment"
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#0b1c30] mb-1">Academic Session</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Spring 2026"
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                value={session}
                                onChange={(e) => setSession(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-[#0b1c30] mb-1">Opens At</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                value={opensAt}
                                onChange={(e) => setOpensAt(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#0b1c30] mb-1">Closes At</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                value={closesAt}
                                onChange={(e) => setClosesAt(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#0b1c30] mb-1">Campaign Description</label>
                        <textarea
                            rows={3}
                            required
                            placeholder="Provide details about the recruitment campaign, open positions, and requirements..."
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#0b1c30] mb-1">Requirements & Qualifications</label>
                        <textarea
                            rows={3}
                            placeholder="Minimum qualifications, skills, portfolio links, or prerequisites..."
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                            value={requirements}
                            onChange={(e) => setRequirements(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            type="button"
                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                        >
                            {submitting ? (isEditMode ? 'Updating...' : 'Launching...') : (isEditMode ? 'Update Notice' : 'Post Recruitment Campaign')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

const RecruitmentList = () => {
    const { clubId } = useParams();
    if (clubId) {
        return (
            <MainLayout>
                <ClubPermissionsProvider clubId={clubId}>
                    <RecruitmentListContent />
                </ClubPermissionsProvider>
            </MainLayout>
        );
    }
    return (
        <MainLayout>
            <RecruitmentListContent />
        </MainLayout>
    );
};

export default RecruitmentList;
