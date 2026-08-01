import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import recruitmentService from '../../services/recruitmentService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Modal from '../../components/ui/Modal';

const RecruitmentListContent = () => {
    const { clubId } = useParams();
    const { can } = useClubPermissions();

    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state for executive creation
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [requirements, setRequirements] = useState('');
    const [opensAt, setOpensAt] = useState('');
    const [closesAt, setClosesAt] = useState('');
    const status = 'open';
    const [submitting, setSubmitting] = useState(false);

    const loadNotices = async () => {
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
            setNotices(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load recruitment notices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotices();
    }, [clubId]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            await recruitmentService.create(clubId, {
                title,
                description,
                requirements,
                opens_at: opensAt,
                closes_at: closesAt,
                status,
            });
            setIsCreateOpen(false);
            setTitle('');
            setDescription('');
            setRequirements('');
            loadNotices();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create recruitment notice.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Member Recruitment Drives</h1>
                    <p className="text-gray-500 text-sm">Apply for official positions and general membership across clubs.</p>
                </div>
                <div className="flex space-x-3">
                    {clubId && (
                        <Link to={`/clubs/${clubId}`}>
                            <Button variant="secondary">← Back to Club</Button>
                        </Link>
                    )}
                    {clubId && can('can_manage_recruitment') && (
                        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
                            + Post Recruitment Drive
                        </Button>
                    )}
                </div>
            </div>

            {error && <ErrorBanner message={error} />}

            {notices.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-lg shadow-sm border text-gray-500">
                    <p className="text-lg font-medium">No open recruitment drives currently available.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {notices.map((notice) => (
                        <Card key={notice.id} className="flex flex-col justify-between hover:shadow-md transition">
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-bold text-xl text-gray-900 leading-snug">{notice.title}</h3>
                                    {notice.status && <Badge status={notice.status} />}
                                </div>
                                <div className="text-xs text-gray-500 space-y-1 mb-3 bg-gray-50 p-2 rounded border">
                                    <div>🗓️ Opens: {new Date(notice.opens_at).toLocaleString()}</div>
                                    <div>⏳ Closes: {new Date(notice.closes_at).toLocaleString()}</div>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-3 mb-4">{notice.description}</p>
                            </div>
                            <div className="pt-3 border-t flex items-center justify-between">
                                <Link to={`/recruitment/${notice.id}`}>
                                    <Button variant="primary" size="sm">
                                        View Details & Apply →
                                    </Button>
                                </Link>
                                {can('can_manage_recruitment') && (
                                    <Link to={`/recruitment/${notice.id}/applications`}>
                                        <Button variant="secondary" size="sm">
                                            Review Applications
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Recruitment Modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Post Recruitment Notice">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Spring Executive Drive 2026"
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Opens At</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={opensAt}
                                onChange={(e) => setOpensAt(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Closes At</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={closesAt}
                                onChange={(e) => setClosesAt(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            rows={3}
                            required
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Requirements</label>
                        <textarea
                            rows={3}
                            placeholder="Minimum qualifications, skills, or portfolio links required..."
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={requirements}
                            onChange={(e) => setRequirements(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button variant="secondary" onClick={() => setIsCreateOpen(false)} type="button">
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Creating...' : 'Post Notice'}
                        </Button>
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
