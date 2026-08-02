import { useEffect, useState } from 'react';
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
    CheckSquare,
    Building2
} from 'lucide-react';

const AnnouncementListContent = () => {
    const { clubId } = useParams();
    const { user, isAdmin } = useAuth();

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

    // Recipient selection state
    const [targetType, setTargetType] = useState('all_users');
    const [targetClubId, setTargetClubId] = useState('');
    const [targetUserId, setTargetUserId] = useState('');
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
                setTargetClubId(clubId);
            }
        } catch {
            // silent fail
        }
    };

    useEffect(() => {
        loadAnnouncements();
        loadContext();
    }, [clubId]);

    // Fetch club members when targetClubId changes and targetType requires a club member
    useEffect(() => {
        if ((targetType === 'specific_club_member') && targetClubId) {
            setLoadingMembers(true);
            announcementService.getClubMembers(targetClubId)
                .then((members) => {
                    setClubMembersList(Array.isArray(members) ? members : []);
                })
                .catch(() => setClubMembersList([]))
                .finally(() => setLoadingMembers(false));
        } else {
            setClubMembersList([]);
        }
    }, [targetType, targetClubId]);

    const openCreateModal = () => {
        setTitle('');
        setBody('');
        setIsPinned(false);

        const defaultClub = clubId || (context.exec_clubs[0]?.id || context.all_clubs[0]?.id || '');
        setTargetClubId(defaultClub ? String(defaultClub) : '');
        setTargetUserId('');
        setTargetType(context.is_admin ? 'all_users' : (defaultClub ? 'club_members' : 'all_users'));
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                title,
                body,
                is_pinned: isPinned,
                target_type: targetType,
                target_club_id: targetClubId ? Number(targetClubId) : null,
                target_user_id: targetUserId ? Number(targetUserId) : null,
            };

            await announcementService.create(payload, clubId || null);
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
        const itemClubId = item.club_id || item.target_club_id;
        if (!itemClubId) return false;
        return context.exec_clubs.some((c) => c.id === itemClubId);
    };

    const getTargetBadge = (item) => {
        const type = item.target_type;
        const clubName = item.target_club?.name || item.club?.name;
        const userName = item.target_user?.name;

        switch (type) {
            case 'all_users':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Globe className="w-3 h-3" /> All Users
                    </span>
                );
            case 'specific_user':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                        <User className="w-3 h-3" /> Direct: {userName || 'User'}
                    </span>
                );
            case 'club_members':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        <Users className="w-3 h-3" /> {clubName || 'Club'} Members
                    </span>
                );
            case 'club_executives':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <Shield className="w-3 h-3" /> {clubName || 'Club'} Executives
                    </span>
                );
            case 'specific_club_member':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        <User className="w-3 h-3" /> {userName || 'Member'} ({clubName || 'Club'})
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

    const pinned = announcements.filter((a) => a.is_pinned);
    const regular = announcements.filter((a) => !a.is_pinned);

    // Available target options depending on role
    const adminOptions = [
        { id: 'all_users', label: 'All Users', desc: 'Send to every registered user on the platform' },
        { id: 'specific_user', label: 'A Specific Individual User', desc: 'Select any specific platform user' },
        { id: 'club_members', label: 'All Members of a Selected Club', desc: 'Includes both general members and executives' },
        { id: 'club_executives', label: 'Only Executives of One Club', desc: 'Send exclusively to executive members' },
        { id: 'specific_club_member', label: 'A Specific Member of a Selected Club', desc: 'Target one member of a chosen club' },
    ];

    const execOptions = [
        { id: 'all_users', label: 'All Users', desc: 'Send to every registered user on the platform' },
        { id: 'club_members', label: 'All Members of My Club', desc: 'Send to all active members of your club' },
        { id: 'club_executives', label: 'Only Executives of My Club', desc: 'Send exclusively to executive team' },
        { id: 'specific_club_member', label: 'A Specific Member of My Club', desc: 'Target a specific member within your club' },
    ];

    const currentOptions = context.is_admin ? adminOptions : execOptions;
    const availableClubs = context.is_admin ? context.all_clubs : context.exec_clubs;

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
                <div className="space-y-4">
                    {/* Pinned Announcements */}
                    {pinned.map((item) => (
                        <div
                            key={item.id}
                            className="bg-[#fffdf5] border-2 border-amber-300/80 p-6 rounded-xl shadow-xs space-y-3 relative"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="bg-amber-400 text-slate-900 text-[11px] px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                                            <Pin className="w-3 h-3 fill-slate-900" /> PINNED
                                        </span>
                                        {getTargetBadge(item)}
                                    </div>
                                    <h3 className="font-bold text-xl text-[#0b1c30] tracking-tight">{item.title}</h3>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-xs text-slate-500 font-medium">
                                        {new Date(item.created_at).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </span>
                                    {item.author && (
                                        <p className="text-xs text-slate-400 mt-0.5 font-medium">By {item.author.name}</p>
                                    )}
                                </div>
                            </div>
                            <p className="text-slate-700 text-sm whitespace-pre-line leading-relaxed">{item.body}</p>
                            {canDelete(item) && (
                                <div className="pt-3 flex justify-end border-t border-amber-200/60">
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Regular Announcements */}
                    {regular.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-3"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {getTargetBadge(item)}
                                    </div>
                                    <h3 className="font-bold text-lg text-[#0b1c30] tracking-tight">{item.title}</h3>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-xs text-slate-500 font-medium">
                                        {new Date(item.created_at).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </span>
                                    {item.author && (
                                        <p className="text-xs text-slate-400 mt-0.5 font-medium">By {item.author.name}</p>
                                    )}
                                </div>
                            </div>
                            <p className="text-slate-700 text-sm whitespace-pre-line leading-relaxed">{item.body}</p>
                            {canDelete(item) && (
                                <div className="pt-3 flex justify-end border-t border-slate-100">
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
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
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Title
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

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Content
                        </label>
                        <textarea
                            rows={4}
                            required
                            placeholder="Write your announcement content here..."
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>

                    {/* Recipient Targeting Selection */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <CheckSquare className="w-4 h-4 text-blue-600" /> Target Recipients
                        </label>

                        <div className="space-y-2">
                            {currentOptions.map((opt) => (
                                <label
                                    key={opt.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                        targetType === opt.id
                                            ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400'
                                            : 'bg-white border-slate-200 hover:bg-slate-100/80'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={targetType === opt.id}
                                        onChange={() => setTargetType(opt.id)}
                                        className="mt-0.5 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">{opt.label}</p>
                                        <p className="text-[11px] text-slate-500">{opt.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* Dependent Selectors */}
                        {/* Club Selector */}
                        {['club_members', 'club_executives', 'specific_club_member'].includes(targetType) && (
                            <div className="pt-2">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Select Club
                                </label>
                                <select
                                    required
                                    value={targetClubId}
                                    onChange={(e) => setTargetClubId(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#2563eb]"
                                >
                                    <option value="">-- Choose Club --</option>
                                    {availableClubs.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Specific Member of Club Selector */}
                        {targetType === 'specific_club_member' && (
                            <div className="pt-2">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Select Club Member
                                </label>
                                {loadingMembers ? (
                                    <p className="text-xs text-slate-500 italic">Loading club members...</p>
                                ) : (
                                    <select
                                        required
                                        value={targetUserId}
                                        onChange={(e) => setTargetUserId(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#2563eb]"
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

                        {/* Specific Individual User Selector (Admin) */}
                        {targetType === 'specific_user' && context.is_admin && (
                            <div className="pt-2">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Select User
                                </label>
                                <select
                                    required
                                    value={targetUserId}
                                    onChange={(e) => setTargetUserId(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#2563eb]"
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
                    </div>

                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 pt-1">
                        <input
                            type="checkbox"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span>Pin this announcement to top of feed</span>
                    </label>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            type="button"
                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
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
