import { useEffect, useState, useMemo } from 'react';
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
import {
    Target, Calendar, Clock, Plus, ArrowLeft, ArrowRight, Pencil, Trash,
    ClipboardList, Building2, AlertCircle, Search, Filter,
    Users, Check
} from 'lucide-react';
import { formatForDateInput, dateInputToStartOfDayISO, dateInputToEndOfDayISO } from '../../utils/dateUtils';
import { formatSessionLabel, generateSessionOptions } from '../../utils/sessionUtils';

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
    const [currentClub, setCurrentClub] = useState(null);
    const [myExecClubIds, setMyExecClubIds] = useState([]);

    // Active View Tab: 'browse' | 'my_applications' | 'manage'
    const [activeTab, setActiveTab] = useState('browse');

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'upcoming' | 'closed'
    const [clubFilter, setClubFilter] = useState('all');

    // Single-page form modal state for creation/editing
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editNoticeId, setEditNoticeId] = useState(null);

    // Form fields
    const [selectedClubId, setSelectedClubId] = useState('');
    const [title, setTitle] = useState('');
    const [session, setSession] = useState('26');
    const [targetSessions, setTargetSessions] = useState([23, 24]);
    const [opensAt, setOpensAt] = useState('');
    const [closesAt, setClosesAt] = useState('');
    const [description, setDescription] = useState('');
    const [requirements, setRequirements] = useState('');
    // DEFAULT TO SIMPLE PIPELINE BY DEFAULT
    const [pipelineTemplate, setPipelineTemplate] = useState('simple');
    const [pipelineStages, setPipelineStages] = useState([
        { key: 'submitted', label: 'Application Submitted' }
    ]);
    const [customFields, setCustomFields] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Modals
    const [showIneligibleModal, setShowIneligibleModal] = useState(false);
    const [deleteConfirmNotice, setDeleteConfirmNotice] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const admin = isAdmin();

            // Fire all independent network requests in parallel
            const noticesPromise = clubId
                ? recruitmentService.listForClub(clubId)
                : recruitmentService.listAll();

            const currentClubPromise = clubId
                ? clubService.getClub(clubId).catch(() => null)
                : Promise.resolve(null);

            const membershipsPromise = authService.getMyMemberships().catch(() => []);

            const allClubsPromise = admin
                ? clubService.getClubs().catch(() => [])
                : Promise.resolve([]);

            const [noticesRes, currentClubRes, membersRes, allClubsRes] = await Promise.all([
                noticesPromise,
                currentClubPromise,
                membershipsPromise,
                allClubsPromise,
            ]);

            // Process notices
            const list = noticesRes.data || noticesRes;
            const loadedNotices = Array.isArray(list) ? list : [];
            setNotices(loadedNotices);

            if (currentClubRes) {
                setCurrentClub(currentClubRes.data || currentClubRes);
            }

            // Process memberships
            const memberships = membersRes.data || membersRes || [];
            const execMemberships = memberships.filter(m =>
                m.status === 'active' &&
                (m.role !== 'member' || (m.positions && m.positions.some(p => p.position?.is_executive || p.position?.can_manage_recruitment)))
            );
            const execClubIdsList = execMemberships.map(m => m.club_id || m.club?.id).filter(Boolean);
            setMyExecClubIds(execClubIdsList);

            // Determine executive clubs and eligibility
            let clubsList = [];
            let execFlag = false;

            if (execClubIdsList.length > 0) {
                execFlag = true;
                clubsList = execMemberships.map(m => m.club).filter(Boolean);
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
                    ineligibleReason: hasActive ? 'Active campaign already running' : null
                };
            });

            setAvailableClubs(annotatedClubs);

        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load recruitment data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [clubId]);

    const isUserExecutive = can('can_manage_recruitment') || isExecUser;

    // DYNAMIC CHECK: Check if currently selected club has an active recruitment notice
    const activeCampaignForSelectedClub = useMemo(() => {
        if (!selectedClubId) return null;
        return notices.find(n =>
            String(n.club_id) === String(selectedClubId) &&
            n.status === 'open' &&
            new Date(n.closes_at) > new Date() &&
            (!isEditMode || String(n.id) !== String(editNoticeId))
        );
    }, [selectedClubId, notices, isEditMode, editNoticeId]);

    // Form actions
    const handleTargetSessionToggle = (sessionValue) => {
        const num = Number(sessionValue);
        setTargetSessions(prev =>
            prev.includes(num) ? prev.filter(s => s !== num) : [...prev, num]
        );
    };

    const addCustomField = () => {
        setCustomFields(prev => [
            ...prev,
            { id: `field_${Date.now()}`, label: '', type: 'text', required: false }
        ]);
    };

    const updateCustomField = (index, key, value) => {
        setCustomFields(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    };

    const removeCustomField = (index) => {
        setCustomFields(prev => prev.filter((_, i) => i !== index));
    };

    // Filter notices
    const myAppliedNotices = useMemo(() => {
        return notices.filter(n => Boolean(n.my_application));
    }, [notices]);

    const filteredNotices = useMemo(() => {
        return notices.filter(notice => {
            // Search query
            const q = searchQuery.toLowerCase().trim();
            if (q) {
                const titleMatch = notice.title?.toLowerCase().includes(q);
                const clubMatch = notice.club?.name?.toLowerCase().includes(q);
                const descMatch = notice.description?.toLowerCase().includes(q);
                if (!titleMatch && !clubMatch && !descMatch) return false;
            }

            // Club filter
            if (clubFilter !== 'all' && String(notice.club_id) !== String(clubFilter)) {
                return false;
            }

            // Status filter
            const now = new Date();
            const opens = new Date(notice.opens_at);
            const closes = new Date(notice.closes_at);

            if (statusFilter === 'open') {
                return notice.status === 'open' && now >= opens && now <= closes;
            }
            if (statusFilter === 'upcoming') {
                return now < opens && notice.status === 'open';
            }
            if (statusFilter === 'closed') {
                return now > closes || notice.status === 'closed';
            }

            return true;
        });
    }, [notices, searchQuery, statusFilter, clubFilter]);

    const handleCreateOpen = () => {
        if (!isExecUser) {
            setShowIneligibleModal(true);
            return;
        }

        if (availableClubs.length === 0) {
            setShowIneligibleModal(true);
            return;
        }

        let targetClub = null;
        if (clubId) {
            setSelectedClubId(clubId);
            targetClub = availableClubs.find(c => String(c.id) === String(clubId)) || currentClub;
        } else {
            const firstEligible = availableClubs.find(c => c.isEligible);
            const initialId = firstEligible ? String(firstEligible.id) : String(availableClubs[0]?.id || '');
            setSelectedClubId(initialId);
            targetClub = availableClubs.find(c => String(c.id) === String(initialId));
        }

        setIsEditMode(false);
        setEditNoticeId(null);
        setTitle(targetClub ? `${targetClub.name} Recruitment` : '');
        setSession('26');
        setTargetSessions([23, 24]);
        setDescription('');
        setRequirements('');
        setCustomFields([]);

        // Default Evaluation Pipeline to Simple
        setPipelineTemplate('simple');
        setPipelineStages([
            { key: 'submitted', label: 'Application Submitted' }
        ]);

        const now = new Date();
        const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        setOpensAt(formatForDateInput(now));
        setClosesAt(formatForDateInput(twoWeeks));

        setIsModalOpen(true);
    };

    const handleEditOpen = (notice) => {
        setIsEditMode(true);
        setEditNoticeId(notice.id);
        setSelectedClubId(String(notice.club_id));
        setTitle(notice.title || '');
        setSession(notice.session || '26');
        setTargetSessions(Array.isArray(notice.target_sessions) ? notice.target_sessions.map(Number) : []);
        setDescription(notice.description || '');
        setRequirements(notice.requirements || '');
        setCustomFields(Array.isArray(notice.custom_fields) ? notice.custom_fields : []);
        setPipelineTemplate(notice.pipeline_template || 'simple');
        setPipelineStages(Array.isArray(notice.pipeline_stages) ? notice.pipeline_stages : [
            { key: 'submitted', label: 'Application Submitted' }
        ]);

        setOpensAt(formatForDateInput(notice.opens_at));
        setClosesAt(formatForDateInput(notice.closes_at));
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const targetClubObj = availableClubs.find(c => String(c.id) === String(selectedClubId)) || currentClub;
            const finalTitle = title.trim() || (targetClubObj ? `${targetClubObj.name} Recruitment` : 'Club Recruitment');

            const payload = {
                title: finalTitle,
                session,
                target_sessions: targetSessions,
                description,
                requirements,
                custom_fields: customFields,
                pipeline_template: pipelineTemplate,
                pipeline_stages: pipelineStages,
                opens_at: dateInputToStartOfDayISO(opensAt),
                closes_at: dateInputToEndOfDayISO(closesAt),
                status: 'open',
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

    const confirmDelete = async () => {
        if (!deleteConfirmNotice) return;
        try {
            await recruitmentService.remove(deleteConfirmNotice.id);
            setDeleteConfirmNotice(null);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete recruitment notice.');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            {/* Main Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-full mb-1">
                        <Target className="w-3.5 h-3.5" /> Official Recruitment
                    </div>
                    <h1 className="text-2xl font-extrabold text-[#0b1c30]">
                        {currentClub ? `${currentClub.name} Recruitment Hub` : 'Recruitment Hub'}
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                        {currentClub
                            ? `Explore active recruitment campaigns and team opportunities for ${currentClub.name}.`
                            : 'Explore open recruitment campaigns, track your applications, or manage club team drives.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {clubId && (
                        <Link to={`/clubs/${clubId}`}>
                            <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5">
                                <ArrowLeft className="w-4 h-4" /> Back to Club
                            </button>
                        </Link>
                    )}
                    {isUserExecutive && (
                        <button
                            onClick={handleCreateOpen}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" /> Start Recruitment Campaign
                        </button>
                    )}
                </div>
            </div>

            {error && <ErrorBanner message={error} />}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-xl shadow-xs">
                <button
                    onClick={() => setActiveTab('browse')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                        activeTab === 'browse'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Search className="w-4 h-4" />
                    Browse Campaigns
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {notices.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('my_applications')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                        activeTab === 'my_applications'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    My Applications
                    {myAppliedNotices.length > 0 && (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {myAppliedNotices.length}
                        </span>
                    )}
                </button>

                {isUserExecutive && (
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                            activeTab === 'manage'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Building2 className="w-4 h-4" />
                        Executive Dashboard
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {availableClubs.length} Club(s)
                        </span>
                    </button>
                )}
            </div>

            {/* TAB 1: BROWSE CAMPAIGNS */}
            {activeTab === 'browse' && (
                <div className="space-y-4">
                    {/* Filters bar */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full md:w-80">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by campaign, title, or club..."
                                aria-label="Search recruitment campaigns"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50/50"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                            {/* Status Filter */}
                            <div className="flex items-center gap-1 text-xs">
                                <Filter className="w-3.5 h-3.5 text-slate-500" />
                                <label htmlFor="recruitment-status-filter-select" className="font-semibold text-slate-600">Status:</label>
                                <select
                                    id="recruitment-status-filter-select"
                                    aria-label="Filter by campaign status"
                                    data-testid="recruitment-status-filter"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white outline-none focus:border-blue-500"
                                >
                                    <option value="all">All Campaigns</option>
                                    <option value="open">Active / Open</option>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>

                            {/* Club Filter */}
                            {!clubId && availableClubs.length > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                    <label htmlFor="recruitment-club-filter-select" className="font-semibold text-slate-600">Club:</label>
                                    <select
                                        id="recruitment-club-filter-select"
                                        aria-label="Filter by organization or club"
                                        data-testid="recruitment-club-filter"
                                        value={clubFilter}
                                        onChange={(e) => setClubFilter(e.target.value)}
                                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white outline-none focus:border-blue-500"
                                    >
                                        <option value="all">All Organizations</option>
                                        {availableClubs.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {filteredNotices.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-2xl shadow-xs border border-slate-200 text-slate-500 space-y-3">
                            <Target className="w-10 h-10 text-slate-300 mx-auto" />
                            <p className="text-base font-semibold text-slate-700">No recruitment campaigns found.</p>
                            <p className="text-xs text-slate-600 max-w-sm mx-auto">
                                Try adjusting your search query or filter options.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredNotices.map((notice) => {
                                const now = new Date();
                                const opens = new Date(notice.opens_at);
                                const closes = new Date(notice.closes_at);
                                const isCurrentlyOpen = notice.status === 'open' && now >= opens && now <= closes;
                                const isUpcoming = now < opens && notice.status === 'open';

                                return (
                                    <Card key={notice.id} className="flex flex-col justify-between hover:shadow-md transition-all border border-slate-200 bg-white rounded-2xl p-6 space-y-4 relative">
                                        <div className="space-y-3">
                                            {/* Top badges & Title */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {notice.session && (
                                                            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                                                                Campaign Year: {formatSessionLabel(notice.session) || notice.session}
                                                            </span>
                                                        )}
                                                        {isCurrentlyOpen && (
                                                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                                                Accepting Applications
                                                            </span>
                                                        )}
                                                        {isUpcoming && (
                                                            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                                                Upcoming
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h2 className="font-bold text-xl text-[#0b1c30] leading-snug">{notice.title}</h2>
                                                    {notice.club && (
                                                        <p className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                                                            <Building2 className="w-3.5 h-3.5" /> {notice.club.name}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Action menu for execs */}
                                                {(can('can_manage_recruitment') || myExecClubIds.includes(notice.club_id)) && (
                                                    <div className="flex items-center space-x-1 shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                                        <button onClick={() => handleEditOpen(notice)} aria-label="Edit Campaign" className="p-1.5 text-slate-600 hover:text-blue-600 rounded transition-colors" title="Edit Campaign">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => setDeleteConfirmNotice(notice)} aria-label="Delete Campaign" className="p-1.5 text-slate-600 hover:text-rose-600 rounded transition-colors" title="Delete Campaign">
                                                            <Trash className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Timeline box */}
                                            <div className="text-xs text-slate-600 space-y-1 bg-[#f8f9ff] p-3 rounded-xl border border-slate-200">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                                    <span>Opens: {new Date(notice.opens_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                    <span>Closes: {new Date(notice.closes_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            {/* Target Student Batches */}
                                            {Array.isArray(notice.target_sessions) && notice.target_sessions.length > 0 && (
                                                <div className="text-xs text-slate-600">
                                                    <span className="font-semibold text-slate-700">Eligible Batches: </span>
                                                    <span>{notice.target_sessions.map(s => `Session ${formatSessionLabel(s) || s}`).join(', ')}</span>
                                                </div>
                                            )}

                                            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{notice.description}</p>
                                        </div>

                                        {/* Card CTA Row */}
                                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                            <Link to={clubId ? `/clubs/${clubId}/recruitment/${notice.id}` : `/recruitment/${notice.id}`}>
                                                <button className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-xs ${
                                                    notice.is_member
                                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                        : notice.my_application
                                                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                }`}>
                                                    {notice.is_member
                                                        ? 'Already a Member'
                                                        : notice.my_application
                                                            ? 'View My Application'
                                                            : 'View Campaign & Apply'} <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                            </Link>

                                            {myExecClubIds.includes(notice.club_id) && (
                                                <Link to={clubId ? `/clubs/${clubId}/recruitment/${notice.id}/applications` : `/recruitment/${notice.id}/applications`}>
                                                    <button className="px-3 py-1.5 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] border border-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1">
                                                        <Users className="w-3.5 h-3.5 text-blue-600" /> Review Applications
                                                    </button>
                                                </Link>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: MY APPLICATIONS */}
            {activeTab === 'my_applications' && (
                <div className="space-y-4">
                    {myAppliedNotices.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-2xl shadow-xs border border-slate-200 text-slate-500 space-y-3">
                            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                            <p className="text-base font-semibold text-slate-700">No applications submitted yet.</p>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Browse open recruitment campaigns to find available positions and submit your application.
                            </p>
                            <div className="pt-2">
                                <button
                                    onClick={() => setActiveTab('browse')}
                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
                                >
                                    Browse Open Campaigns <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myAppliedNotices.map((notice) => {
                                const app = notice.my_application;
                                return (
                                    <div key={notice.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                                                        {notice.club?.name || 'Club Organization'}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-[#0b1c30] mt-1">{notice.title}</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {app.status && <Badge status={app.status} />}
                                                <Link to={`/recruitment/${notice.id}`}>
                                                    <button className="px-3 py-1.5 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-bold rounded-xl border border-slate-300 transition-colors">
                                                        View Details
                                                    </button>
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl">
                                            <div>
                                                <span className="font-semibold text-slate-700 block">Submitted On:</span>
                                                <span>{app.created_at ? new Date(app.created_at).toLocaleString() : 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-700 block">Campaign Session:</span>
                                                <span>Session {formatSessionLabel(notice.session) || notice.session}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: EXECUTIVE DASHBOARD */}
            {activeTab === 'manage' && isUserExecutive && (
                <div className="space-y-4">
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xs space-y-2">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-400" /> Executive Recruitment Hub
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                            Manage recruitment drives for your executive organizations. Each club can host 1 active campaign at a time to ensure clear candidate evaluation.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {availableClubs.map((club) => {
                            const activeNotice = notices.find(n => n.club_id === club.id && n.status === 'open');
                            return (
                                <Card key={club.id} className="p-6 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-base text-[#0b1c30]">{club.name}</h4>
                                            {club.isEligible ? (
                                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    Ready for Campaign
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                    Campaign Active
                                                </span>
                                            )}
                                        </div>

                                        {activeNotice ? (
                                            <div className="p-3 bg-[#f8f9ff] rounded-xl border border-slate-200 text-xs space-y-1">
                                                <div className="font-bold text-slate-800">{activeNotice.title}</div>
                                                <div className="text-slate-500">Closes: {new Date(activeNotice.closes_at).toLocaleDateString()}</div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic">No active recruitment campaign running for this club.</p>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                        {activeNotice ? (
                                            <Link to={`/clubs/${club.id}/recruitment/${activeNotice.id}/applications`}>
                                                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5">
                                                    <Users className="w-4 h-4" /> Review Applications
                                                </button>
                                            </Link>
                                        ) : (
                                            <button
                                                onClick={handleCreateOpen}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                                            >
                                                <Plus className="w-4 h-4" /> Launch Campaign
                                            </button>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Ineligibility Modal */}
            <Modal isOpen={showIneligibleModal} onClose={() => setShowIneligibleModal(false)} title="Recruitment Access Restricted">
                <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="font-bold text-amber-900 text-sm">Cannot Initiate Recruitment Campaign</h4>
                            <p className="text-xs text-amber-800 leading-relaxed">
                                {!isExecUser
                                    ? "You are not registered as an active executive for any club. Only club executives have permission to launch recruitment campaigns."
                                    : "All of your executive clubs currently have an active recruitment campaign in progress."}
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

            {/* Delete Confirmation Modal */}
            <Modal isOpen={Boolean(deleteConfirmNotice)} onClose={() => setDeleteConfirmNotice(null)} title="Delete Recruitment Campaign">
                <div className="space-y-4">
                    <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-3">
                        <Trash className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="font-bold text-rose-900 text-sm">Confirm Permanent Deletion</h4>
                            <p className="text-xs text-rose-800 leading-relaxed">
                                Are you sure you want to delete <span className="font-bold">{deleteConfirmNotice?.title}</span>? This action cannot be undone and will remove all submitted candidate applications.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            onClick={() => setDeleteConfirmNotice(null)}
                            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-xs"
                        >
                            Yes, Delete Campaign
                        </button>
                    </div>
                </div>
            </Modal>

            {/* SINGLE PAGE RECRUITMENT FORM MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Edit Recruitment Campaign" : "Launch New Recruitment Campaign"} maxWidth="max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* SECTION 1: IDENTITY & DYNAMIC WARNING */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-[#0b1c30] border-b border-slate-100 pb-2">1. Organization & Campaign Identity</h4>

                        {!isEditMode && (
                            <div>
                                <label htmlFor="recruitment-target-club-select" className="block text-xs font-bold text-[#0b1c30] mb-1">Target Organization / Club</label>
                                <select
                                    id="recruitment-target-club-select"
                                    aria-label="Target Organization or Club"
                                    data-testid="recruitment-modal-club-select"
                                    required
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb] bg-white font-medium"
                                    value={selectedClubId}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        setSelectedClubId(id);
                                        const target = availableClubs.find(c => String(c.id) === String(id));
                                        if (target) setTitle(`${target.name} Recruitment`);
                                    }}
                                >
                                    <option value="" disabled>-- Select Organization --</option>
                                    {availableClubs.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {!c.isEligible ? `(Active Campaign Exists)` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* DYNAMIC WARNING BANNER: Triggers live if selected club already has an active recruitment campaign */}
                        {activeCampaignForSelectedClub && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm text-amber-900">Active Recruitment Campaign Exists</h4>
                                    <p className="text-xs text-amber-800 leading-relaxed">
                                        <span className="font-semibold">{activeCampaignForSelectedClub.club?.name || 'This organization'}</span> currently has an active recruitment campaign (<span className="font-bold">{activeCampaignForSelectedClub.title}</span>) running until {new Date(activeCampaignForSelectedClub.closes_at).toLocaleDateString()}. Please ensure you want to launch another active campaign before submitting.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[#0b1c30] mb-1">Campaign Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Executive Team Recruitment 2026"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                                />
                            </div>

                            <div>
                                <label htmlFor="recruitment-session-select" className="block text-xs font-bold text-[#0b1c30] mb-1">Campaign Session / Intake Year</label>
                                <select
                                    id="recruitment-session-select"
                                    aria-label="Campaign Session or Intake Year"
                                    data-testid="recruitment-modal-session-select"
                                    required
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb] bg-white font-medium"
                                    value={session}
                                    onChange={(e) => setSession(e.target.value)}
                                >
                                    {generateSessionOptions().map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            Session {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: ELIGIBILITY & SCHEDULE */}
                    <div className="space-y-4 pt-2">
                        <h4 className="text-sm font-bold text-[#0b1c30] border-b border-slate-100 pb-2">2. Eligibility & Application Timeline</h4>

                        <div>
                            <label className="block text-xs font-bold text-[#0b1c30] mb-1">
                                Eligible Student Batches (Who can apply?)
                            </label>
                            <p className="text-[11px] text-slate-500 mb-2">
                                Select student session batches allowed to submit applications for this campaign.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#f8f9ff] p-3 rounded-xl border border-slate-200">
                                {generateSessionOptions(8, 0).map((opt) => {
                                    const isChecked = targetSessions.includes(opt.value);
                                    return (
                                        <label
                                            key={opt.value}
                                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                                                isChecked
                                                    ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleTargetSessionToggle(opt.value)}
                                                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                            />
                                            <span>Session {opt.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[#0b1c30] mb-1">Starting Date (Starts 12:00 AM)</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                                    value={opensAt}
                                    onChange={(e) => setOpensAt(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#0b1c30] mb-1">Ending Date (Ends 11:59 PM)</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                                    value={closesAt}
                                    onChange={(e) => setClosesAt(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: OVERVIEW & REQUIREMENTS */}
                    <div className="space-y-4 pt-2">
                        <h4 className="text-sm font-bold text-[#0b1c30] border-b border-slate-100 pb-2">3. Campaign Details & Requirements</h4>

                        <div>
                            <label className="block text-xs font-bold text-[#0b1c30] mb-1">Campaign Overview & Description</label>
                            <textarea
                                rows={3}
                                required
                                placeholder="Provide details about open team roles, responsibilities, and campaign overview..."
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#0b1c30] mb-1">Requirements & Qualifications</label>
                            <textarea
                                rows={3}
                                placeholder="Minimum qualifications, portfolio requirements, skills, or prerequisites..."
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                                value={requirements}
                                onChange={(e) => setRequirements(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* SECTION 4: PIPELINE & CUSTOM QUESTIONS */}
                    <div className="space-y-4 pt-2">
                        <h4 className="text-sm font-bold text-[#0b1c30] border-b border-slate-100 pb-2">4. Evaluation Pipeline & Questions</h4>

                        <div>
                            <label htmlFor="recruitment-pipeline-template-select" className="block text-xs font-bold text-[#0b1c30] mb-1">Evaluation Pipeline Steps</label>
                            {/* PIPELINE TEMPLATE: SIMPLE BY DEFAULT FIRST */}
                            <select
                                id="recruitment-pipeline-template-select"
                                aria-label="Evaluation Pipeline Steps Template"
                                data-testid="recruitment-modal-pipeline-template-select"
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2563eb] bg-white font-medium mb-3"
                                value={pipelineTemplate}
                                onChange={(e) => {
                                    const t = e.target.value;
                                    setPipelineTemplate(t);
                                    if (t === 'simple') {
                                        setPipelineStages([{ key: 'submitted', label: 'Application Submitted' }]);
                                    } else if (t === 'standard') {
                                        setPipelineStages([
                                            { key: 'submitted', label: 'Application Submitted' },
                                            { key: 'under_review', label: 'Under Review' }
                                        ]);
                                    } else if (t === 'multi_stage') {
                                        setPipelineStages([
                                            { key: 'submitted', label: 'Application Submitted' },
                                            { key: 'shortlisted', label: 'Shortlisted' },
                                            { key: 'interview', label: 'Interview' }
                                        ]);
                                    }
                                }}
                            >
                                <option value="simple">Simple — 1 Step (Apply → Accept/Reject)</option>
                                <option value="standard">Standard — 2 Steps (Apply → Under Review → Accept/Reject)</option>
                                <option value="multi_stage">Multi-Stage — 3 Steps (Apply → Shortlist → Interview → Accept/Reject)</option>
                                <option value="custom">Custom Pipeline Steps</option>
                            </select>

                            <div className="bg-[#f8f9ff] p-3 rounded-xl border border-slate-200 space-y-2">
                                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Stage Flow Preview:
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    {pipelineStages.map((stg, i) => (
                                        <div key={stg.key || i} className="flex items-center gap-1.5">
                                            <span className="bg-white border border-slate-300 font-semibold text-slate-800 px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                                                {stg.label}
                                            </span>
                                            <span className="text-slate-400 font-bold">&rarr;</span>
                                        </div>
                                    ))}
                                    <span className="bg-emerald-50 border border-emerald-300 font-bold text-emerald-800 px-2.5 py-1 rounded-lg text-xs">
                                        Accept / Reject
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Custom Form Fields */}
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="block text-xs font-bold text-[#0b1c30]">Custom Form Fields</label>
                                    <p className="text-[11px] text-slate-500">Add custom text or document upload prompts for applicants.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addCustomField}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Form Field
                                </button>
                            </div>

                            {customFields.length > 0 && (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-1">
                                    {customFields.map((field, idx) => (
                                        <div key={field.id || idx} className="flex items-center gap-2 bg-[#f8f9ff] p-2 rounded-xl border border-slate-200">
                                            <input
                                                type="text"
                                                placeholder="Question Prompt (e.g. Upload Student ID)"
                                                required
                                                value={field.label}
                                                onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                                                className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white"
                                            />
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateCustomField(idx, 'type', e.target.value)}
                                                aria-label="Field Input Type"
                                                data-testid={`recruitment-custom-field-type-select-${idx}`}
                                                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 bg-white font-medium"
                                            >
                                                <option value="text">Text Input</option>
                                                <option value="file">File Upload</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => removeCustomField(idx)}
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Single Page Form Submit Footer */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
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
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
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
