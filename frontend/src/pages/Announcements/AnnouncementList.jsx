import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import announcementService from '../../services/announcementService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';
import Modal from '../../components/ui/Modal';
import {
    Megaphone,
    Pin,
    Plus,
    ArrowLeft,
    Trash2,
    Globe,
    Users,
    Shield,
    User,
    Paperclip,
    X,
    Building2,
    Send,
    AlertCircle
} from 'lucide-react';

const AnnouncementListContent = () => {
    const { clubId } = useParams();
    const { user, isAdmin } = useAuth();
    const fileInputRef = useRef(null);

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Creation context state
    const [context, setContext] = useState({
        is_admin: false,
        can_create: false,
        exec_clubs: [],
        all_clubs: [],
        all_users: [],
    });

    // Modal / form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isPinned, setIsPinned] = useState(false);

    // Single From Identity state: 'admin', 'club_{id}', or '' (unselected placeholder)
    const [fromIdentity, setFromIdentity] = useState('');
    const [targetType, setTargetType] = useState('all_users');
    const [targetClubId, setTargetClubId] = useState('');
    const [targetUserId, setTargetUserId] = useState('');
    const [attachmentFile, setAttachmentFile] = useState(null);

    const [clubMembersList, setClubMembersList] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const loadAnnouncements = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = clubId
                ? await announcementService.listForClub(clubId)
                : await announcementService.listAll();
            const list = res.data || res;
            setAnnouncements(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    const loadContext = async () => {
        try {
            const ctx = await announcementService.getCreationContext();
            setContext(ctx);
            if (clubId) {
                setFromIdentity(`club_${clubId}`);
            } else if (ctx.exec_clubs.length > 1 || (ctx.is_admin && ctx.exec_clubs.length > 0)) {
                setFromIdentity('');
            } else if (ctx.is_admin) {
                setFromIdentity('admin');
            } else if (ctx.exec_clubs.length === 1) {
                setFromIdentity(`club_${ctx.exec_clubs[0].id}`);
            }
        } catch {
            // silent fail
        }
    };

    useEffect(() => {
        loadAnnouncements();
        loadContext();
    }, [clubId]);

    // Handle From Identity change and update available target choices dynamically
    useEffect(() => {
        if (fromIdentity === 'admin') {
            setTargetType('all_users');
        } else if (fromIdentity.startsWith('club_')) {
            setTargetType('club_members');
        } else {
            setTargetType('');
        }
    }, [fromIdentity]);

    // Extract club ID if fromIdentity is a club
    const activeFromClubId = fromIdentity.startsWith('club_') ? fromIdentity.replace('club_', '') : '';

    // Fetch club members when targetType requires a club member
    useEffect(() => {
        const activeClubId = activeFromClubId || targetClubId;
        if (targetType === 'specific_club_member' && activeClubId) {
            setLoadingMembers(true);
            announcementService.getClubMembers(activeClubId)
                .then((members) => {
                    setClubMembersList(Array.isArray(members) ? members : []);
                })
                .catch(() => setClubMembersList([]))
                .finally(() => setLoadingMembers(false));
        } else {
            setClubMembersList([]);
        }
    }, [targetType, activeFromClubId, targetClubId]);

    const openCreateModal = () => {
        setTitle('');
        setBody('');
        setIsPinned(false);
        setAttachmentFile(null);
        setTargetUserId('');
        setTargetClubId('');
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (clubId) {
            setFromIdentity(`club_${clubId}`);
            setTargetType('club_members');
        } else if (context.exec_clubs.length > 1 || (context.is_admin && context.exec_clubs.length > 0)) {
            setFromIdentity('');
            setTargetType('');
        } else if (context.is_admin) {
            setFromIdentity('admin');
            setTargetType('all_users');
        } else if (context.exec_clubs.length === 1) {
            setFromIdentity(`club_${context.exec_clubs[0].id}`);
            setTargetType('club_members');
        } else {
            setFromIdentity('');
            setTargetType('');
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fromIdentity) {
            setError('Please select a From (Sender Role) first.');
            return;
        }
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('body', body);
            formData.append('is_pinned', isPinned ? '1' : '0');
            formData.append('from_identity', fromIdentity);

            if (fromIdentity === 'admin') {
                formData.append('from_type', 'admin');
            } else if (fromIdentity.startsWith('club_')) {
                formData.append('from_type', 'club');
                formData.append('from_club_id', activeFromClubId);
            }

            formData.append('target_type', targetType);
            if (targetClubId) {
                formData.append('target_club_id', targetClubId);
            } else if (activeFromClubId) {
                formData.append('target_club_id', activeFromClubId);
            }

            if (targetUserId) {
                formData.append('target_user_id', targetUserId);
            }
            if (attachmentFile) {
                formData.append('attachment', attachmentFile);
            }

            await announcementService.create(formData, clubId || null);
            setSuccess('Announcement published and notifications sent successfully.');
            setIsModalOpen(false);
            loadAnnouncements();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to publish announcement.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        setError(null);
        setSuccess(null);
        try {
            await announcementService.remove(id);
            setSuccess('Announcement deleted successfully.');
            loadAnnouncements();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete announcement.');
        }
    };

    const canDelete = (item) => {
        if (isAdmin()) return true;
        if (item.posted_by === user?.id) return true;
        const itemClubId = item.club_id || item.target_club_id;
        if (!itemClubId) return false;
        return context.exec_clubs.some((c) => c.id === itemClubId);
    };

    const handleUnpin = async (id) => {
        try {
            await announcementService.unpin(id);
            setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_pinned_for_me: false } : a));
        } catch {
            // ignore
        }
    };

    const getTargetBadge = (item) => {
        const type = item.target_type;
        const clubName = item.target_club?.name || item.club?.name;
        const userName = item.target_user?.name;

        switch (type) {
            case 'all_users':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Globe className="w-3 h-3" /> To: All Platform Users
                    </span>
                );
            case 'public':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                        <Globe className="w-3 h-3" /> To: Public (Visitors & Members)
                    </span>
                );
            case 'specific_user':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                        <User className="w-3 h-3" /> To: Direct User ({userName || 'User'})
                    </span>
                );
            case 'club_members':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        <Users className="w-3 h-3" /> To: All Active Members of {clubName || 'Club'}
                    </span>
                );
            case 'club_executives':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <Shield className="w-3 h-3" /> To: Executives of {clubName || 'Club'}
                    </span>
                );
            case 'specific_club_member':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        <User className="w-3 h-3" /> To: Direct Member ({userName || 'Member'})
                    </span>
                );
            default:
                return clubName ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        <Building2 className="w-3 h-3" /> {clubName}
                    </span>
                ) : null;
        }
    };

    if (loading) return <LoadingSpinner />;

    const pinned = announcements
        .filter((a) => a.is_pinned_for_me ?? a.is_pinned)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const regular = announcements
        .filter((a) => !(a.is_pinned_for_me ?? a.is_pinned))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-amber-500" />
                        {clubId ? 'Club Announcements' : 'Announcements'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Official announcements, updates, and targeted notifications.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {clubId && (
                        <Link to={`/clubs/${clubId}`}>
                            <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5">
                                <ArrowLeft className="w-4 h-4" /> Back to Club
                            </button>
                        </Link>
                    )}

                    {context.can_create && (
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                            <Plus className="w-4 h-4" /> Post Announcement
                        </button>
                    )}
                </div>
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            {/* Announcement Feed */}
            {announcements.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-xl shadow-xs border border-slate-200 text-slate-500">
                    <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-semibold text-slate-700">No announcements found</p>
                    <p className="text-xs text-slate-400 mt-1">
                        Any targeted or public announcements will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Pinned Announcements */}
                    {pinned.map((item) => (
                        <div
                            key={item.id}
                            className="bg-[#fffdf5] border-2 border-amber-300/80 p-4 sm:p-5 rounded-xl shadow-xs space-y-2.5 relative"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                                            <Pin className="w-3 h-3 fill-slate-900" /> PINNED
                                        </span>
                                        {getTargetBadge(item)}
                                    </div>
                                    <h3 className="font-bold text-base sm:text-lg text-[#0b1c30] tracking-tight leading-snug">{item.title}</h3>
                                </div>

                                {/* Top Right: Sender section, date below it */}
                                <div className="text-right shrink-0 space-y-0.5">
                                    <div className="text-xs text-slate-700 font-medium">
                                        Sender: <strong className="text-amber-950 font-bold">{item.sender_role_label || 'Administrator'}</strong>
                                        {item.author?.name && (
                                            <span className="text-slate-500 ml-1 font-normal">({item.author.name})</span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium">
                                        {new Date(item.created_at).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </div>
                                </div>
                            </div>

                            <p className="text-slate-700 text-xs sm:text-sm whitespace-pre-line leading-relaxed">{item.body}</p>

                            {/* Attachment Link if present */}
                            {item.attachment_path && (
                                <div className="pt-1">
                                    <a
                                        href={`/storage/${item.attachment_path}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-semibold border border-blue-200 transition-colors shadow-2xs"
                                    >
                                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                                        Attachment: {item.attachment_name || 'View Attached File'} ↗
                                    </a>
                                </div>
                            )}

                            <div className="pt-2 flex items-center justify-between border-t border-amber-200/60">
                                <button
                                    onClick={() => handleUnpin(item.id)}
                                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 border border-amber-300"
                                    title="Unpin announcement"
                                >
                                    <Pin className="w-3 h-3 rotate-45" /> Unpin
                                </button>
                                {canDelete(item) && (
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Regular Announcements */}
                    {regular.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xl shadow-xs space-y-2.5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {getTargetBadge(item)}
                                    </div>
                                    <h3 className="font-bold text-base sm:text-lg text-[#0b1c30] tracking-tight leading-snug">{item.title}</h3>
                                </div>

                                {/* Top Right: Sender section, date below it */}
                                <div className="text-right shrink-0 space-y-0.5">
                                    <div className="text-xs text-slate-700 font-medium">
                                        Sender: <strong className="text-[#0b1c30] font-bold">{item.sender_role_label || 'Administrator'}</strong>
                                        {item.author?.name && (
                                            <span className="text-slate-500 ml-1 font-normal">({item.author.name})</span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium">
                                        {new Date(item.created_at).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </div>
                                </div>
                            </div>

                            <p className="text-slate-700 text-xs sm:text-sm whitespace-pre-line leading-relaxed">{item.body}</p>

                            {/* Attachment Link if present */}
                            {item.attachment_path && (
                                <div className="pt-1">
                                    <a
                                        href={`/storage/${item.attachment_path}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f9ff] text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-semibold border border-blue-200 transition-colors shadow-2xs"
                                    >
                                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                                        Attachment: {item.attachment_name || 'View Attached File'} ↗
                                    </a>
                                </div>
                            )}

                            {canDelete(item) && (
                                <div className="pt-2 flex justify-end border-t border-slate-100">
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Announcement Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Publish New Announcement"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Announcement Title
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Announcement title..."
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Announcement Content
                        </label>
                        <textarea
                            rows={3}
                            required
                            placeholder="Write your announcement content here..."
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>

                    {/* Two-Column Side-by-Side FROM & TO Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                            <Send className="w-4 h-4 text-blue-600" /> Sender & Target Configuration
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* FROM COLUMN (SINGLE DROPDOWN MENU) */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    From :
                                </label>

                                {context.is_admin || context.exec_clubs.length > 0 ? (
                                    <select
                                        required
                                        value={fromIdentity}
                                        onChange={(e) => setFromIdentity(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white font-medium outline-none focus:border-[#2563eb]"
                                    >
                                        {(context.exec_clubs.length > 1 || (context.is_admin && context.exec_clubs.length > 0) || !fromIdentity) && (
                                            <option value="">-- Select Sender Role --</option>
                                        )}
                                        {context.is_admin && (
                                            <option value="admin">Admin (Platform Administrator)</option>
                                        )}
                                        {context.exec_clubs.map((c) => (
                                            <option key={c.id} value={`club_${c.id}`}>
                                                {c.name} ({c.user_role || 'Executive'})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-2.5 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200 flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>No authorized sender role available.</span>
                                    </div>
                                )}
                            </div>

                            {/* TO COLUMN (TARGET RECIPIENTS) */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    To :
                                </label>
                                <select
                                    required
                                    disabled={!fromIdentity}
                                    value={targetType}
                                    onChange={(e) => setTargetType(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white font-medium outline-none focus:border-[#2563eb] disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    {!fromIdentity ? (
                                        <option value="">-- Select Sender Role First --</option>
                                    ) : fromIdentity === 'admin' ? (
                                        <>
                                            <option value="all_users">All Platform Users</option>
                                            <option value="specific_user">A Specific User</option>
                                            <option value="club_executives">Executives of a Specific Club</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="club_members">All Active Club Members</option>
                                            <option value="specific_club_member">A Specific Club Member</option>
                                            <option value="public">Public (Visible to All Visitors & Members)</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Dependent Selector Sub-sections */}
                        {/* 1. Target Specific User (Admin -> Specific user) */}
                        {fromIdentity === 'admin' && targetType === 'specific_user' && (
                            <div className="pt-2 border-t border-slate-200">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Select Target User:
                                </label>
                                <select
                                    required
                                    value={targetUserId}
                                    onChange={(e) => setTargetUserId(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white outline-none focus:border-[#2563eb]"
                                >
                                    <option value="">-- Choose User --</option>
                                    {context.all_users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.student_id || u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* 2. Target Club Executives (Admin -> Club Executives) */}
                        {fromIdentity === 'admin' && targetType === 'club_executives' && (
                            <div className="pt-2 border-t border-slate-200">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Select Target Club:
                                </label>
                                <select
                                    required
                                    value={targetClubId}
                                    onChange={(e) => setTargetClubId(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white outline-none focus:border-[#2563eb]"
                                >
                                    <option value="">-- Choose Target Club --</option>
                                    {context.all_clubs.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} Executives
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* 3. Target Specific Member of Club */}
                        {fromIdentity.startsWith('club_') && targetType === 'specific_club_member' && (
                            <div className="pt-2 border-t border-slate-200">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Select Target Club Member:
                                </label>
                                {loadingMembers ? (
                                    <p className="text-xs text-slate-500 italic">Loading club members...</p>
                                ) : (
                                    <select
                                        required
                                        value={targetUserId}
                                        onChange={(e) => setTargetUserId(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white outline-none focus:border-[#2563eb]"
                                    >
                                        <option value="">-- Choose Member --</option>
                                        {clubMembersList.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.student_id || m.email})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
                    </div>

                    {/* File Attachment Upload Field */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-blue-600" /> Attach File (Optional)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => setAttachmentFile(e.target.files[0] || null)}
                                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg"
                            />
                            {attachmentFile && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAttachmentFile(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors shrink-0"
                                    title="Remove attachment"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Pin checkbox */}
                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 pt-1">
                        <input
                            type="checkbox"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span>Pin this announcement to top of feed</span>
                    </label>

                    {/* Modal Buttons */}
                    <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            type="button"
                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !fromIdentity || (!context.is_admin && context.exec_clubs.length === 0)}
                            className="px-5 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-50"
                        >
                            {submitting ? 'Publishing...' : 'Publish Announcement'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

const AnnouncementList = () => {
    return (
        <MainLayout>
            <AnnouncementListContent />
        </MainLayout>
    );
};

export default AnnouncementList;
