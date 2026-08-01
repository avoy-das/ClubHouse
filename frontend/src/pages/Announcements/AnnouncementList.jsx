import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import announcementService from '../../services/announcementService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';
import Modal from '../../components/ui/Modal';
import { Megaphone, Pin, Plus, ArrowLeft, Edit, Trash2 } from 'lucide-react';

const AnnouncementListContent = () => {
    const { clubId } = useParams();
    const { can } = useClubPermissions();

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Modal / form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isPinned, setIsPinned] = useState(false);
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

    useEffect(() => {
        loadAnnouncements();
    }, [clubId]);

    const openCreateModal = () => {
        setEditingItem(null);
        setTitle('');
        setBody('');
        setIsPinned(false);
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setTitle(item.title);
        setBody(item.body);
        setIsPinned(item.is_pinned || false);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);
        try {
            const payload = { title, body, is_pinned: isPinned };
            if (editingItem) {
                await announcementService.update(editingItem.id, payload);
                setSuccess('Announcement updated.');
            } else {
                await announcementService.create(clubId, payload);
                setSuccess('Announcement posted.');
            }
            setIsModalOpen(false);
            loadAnnouncements();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save announcement.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this announcement?')) return;
        setError(null);
        setSuccess(null);
        try {
            await announcementService.remove(id);
            setSuccess('Announcement deleted.');
            loadAnnouncements();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete announcement.');
        }
    };

    if (loading) return <LoadingSpinner />;

    // Separate pinned vs normal
    const pinned = announcements.filter((a) => a.is_pinned);
    const regular = announcements.filter((a) => !a.is_pinned);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-amber-500" />
                        {clubId ? 'Club Announcements' : 'All Announcements'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Official updates and notices from campus clubs.</p>
                </div>
                <div className="flex space-x-3">
                    {clubId ? (
                        <Link to={`/clubs/${clubId}`}>
                            <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5">
                                <ArrowLeft className="w-4 h-4" /> Back to Club
                            </button>
                        </Link>
                    ) : (
                        <Link to="/clubs">
                            <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors">
                                Browse Clubs
                            </button>
                        </Link>
                    )}
                    {clubId && can('can_manage_announcements') && (
                        <button
                            onClick={openCreateModal}
                            className="px-3.5 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                            <Plus className="w-4 h-4" /> Post Announcement
                        </button>
                    )}
                </div>
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            {announcements.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-xl shadow-xs border border-slate-200 text-slate-500">
                    <p className="text-base font-medium">No announcements posted yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Pinned Section */}
                    {pinned.map((item) => (
                        <div key={item.id} className="bg-[#ffdf9a]/20 border-2 border-[#eab308]/50 p-6 rounded-xl shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="bg-[#eab308] text-slate-900 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                        <Pin className="w-3 h-3 fill-slate-900" /> PINNED
                                    </span>
                                    {item.club?.name && (
                                        <span className="bg-slate-200 text-slate-800 text-xs px-2 py-0.5 rounded-md font-medium">
                                            {item.club.name}
                                        </span>
                                    )}
                                    <h3 className="font-bold text-xl text-[#0b1c30]">{item.title}</h3>
                                </div>
                                <span className="text-xs text-slate-500">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-slate-700 text-sm whitespace-pre-line leading-relaxed">{item.body}</p>
                            {clubId && can('can_manage_announcements') && (
                                <div className="pt-3 flex justify-end space-x-2 border-t border-[#eab308]/30">
                                    <button
                                        onClick={() => openEditModal(item)}
                                        className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Edit className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Regular Announcements */}
                    {regular.map((item) => (
                        <div key={item.id} className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    {item.club?.name && (
                                        <span className="bg-[#f8f9ff] border border-slate-200 text-[#0b1c30] text-xs px-2.5 py-0.5 rounded-md font-semibold">
                                            {item.club.name}
                                        </span>
                                    )}
                                    <h3 className="font-bold text-lg text-[#0b1c30]">{item.title}</h3>
                                </div>
                                <span className="text-xs text-slate-500">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-slate-700 text-sm whitespace-pre-line leading-relaxed">{item.body}</p>
                            {clubId && can('can_manage_announcements') && (
                                <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                                    <button
                                        onClick={() => openEditModal(item)}
                                        className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Edit className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Edit Announcement' : 'Post Announcement'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-[#0b1c30]">Title</label>
                        <input
                            type="text"
                            required
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-[#0b1c30]">Content</label>
                        <textarea
                            rows={5}
                            required
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>

                    <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                        <input
                            type="checkbox"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Pin to top of announcement feed</span>
                    </label>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
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
                            className="px-4 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                        >
                            {submitting ? 'Saving...' : editingItem ? 'Update' : 'Post Announcement'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

const AnnouncementList = () => {
    const { clubId } = useParams();
    if (clubId) {
        return (
            <MainLayout>
                <ClubPermissionsProvider clubId={clubId}>
                    <AnnouncementListContent />
                </ClubPermissionsProvider>
            </MainLayout>
        );
    }
    return (
        <MainLayout>
            <AnnouncementListContent />
        </MainLayout>
    );
};

export default AnnouncementList;
