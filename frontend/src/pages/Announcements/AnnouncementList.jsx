import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import announcementService from '../../services/announcementService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';
import Modal from '../../components/ui/Modal';

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {clubId ? 'Club Announcements' : 'All Announcements'}
                    </h1>
                    <p className="text-gray-500 text-sm">Official updates and notices from campus clubs.</p>
                </div>
                <div className="flex space-x-3">
                    {clubId ? (
                        <Link to={`/clubs/${clubId}`}>
                            <Button variant="secondary">← Back to Club</Button>
                        </Link>
                    ) : (
                        <Link to="/clubs">
                            <Button variant="secondary">Browse Clubs</Button>
                        </Link>
                    )}
                    {clubId && can('can_manage_announcements') && (
                        <Button variant="primary" onClick={openCreateModal}>
                            + Post Announcement
                        </Button>
                    )}
                </div>
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            {announcements.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-lg shadow-sm border text-gray-500">
                    <p className="text-lg font-medium">No announcements posted yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Pinned Section */}
                    {pinned.map((item) => (
                        <div key={item.id} className="bg-amber-50 border-2 border-amber-300 p-6 rounded-lg shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded font-bold">
                                        📌 PINNED
                                    </span>
                                    {item.club?.name && (
                                        <span className="bg-slate-200 text-slate-800 text-xs px-2 py-0.5 rounded font-medium">
                                            {item.club.name}
                                        </span>
                                    )}
                                    <h3 className="font-bold text-xl text-gray-900">{item.title}</h3>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">{item.body}</p>
                            {clubId && can('can_manage_announcements') && (
                                <div className="pt-2 flex justify-end space-x-2 border-t border-amber-200">
                                    <Button variant="secondary" size="sm" onClick={() => openEditModal(item)}>
                                        Edit
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Regular Announcements */}
                    {regular.map((item) => (
                        <div key={item.id} className="bg-white border p-6 rounded-lg shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    {item.club?.name && (
                                        <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded font-medium">
                                            {item.club.name}
                                        </span>
                                    )}
                                    <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">{item.body}</p>
                            {clubId && can('can_manage_announcements') && (
                                <div className="pt-2 flex justify-end space-x-2 border-t">
                                    <Button variant="secondary" size="sm" onClick={() => openEditModal(item)}>
                                        Edit
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                                        Delete
                                    </Button>
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
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                            type="text"
                            required
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Content</label>
                        <textarea
                            rows={5}
                            required
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>

                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                        />
                        <span>Pin to top of announcement feed</span>
                    </label>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : editingItem ? 'Update' : 'Post Announcement'}
                        </Button>
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
