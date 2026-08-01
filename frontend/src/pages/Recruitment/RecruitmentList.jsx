import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import recruitmentService from '../../services/recruitmentService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Modal from '../../components/ui/Modal';
import { Target, Calendar, Clock, Plus, ArrowLeft, ArrowRight, Pencil, Trash } from 'lucide-react';

const RecruitmentListContent = () => {
    const { clubId } = useParams();
    const { can } = useClubPermissions();

    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state for executive creation/editing
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editNoticeId, setEditNoticeId] = useState(null);
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

    const handleCreateOpen = () => {
        setIsEditMode(false);
        setEditNoticeId(null);
        setTitle('');
        setDescription('');
        setRequirements('');
        setOpensAt('');
        setClosesAt('');
        setIsModalOpen(true);
    };

    const handleEditOpen = (notice) => {
        setIsEditMode(true);
        setEditNoticeId(notice.id);
        setTitle(notice.title);
        setDescription(notice.description);
        setRequirements(notice.requirements || '');
        
        // Convert to YYYY-MM-DDThh:mm format for datetime-local input
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
            // Convert local datetime string to UTC ISO string
            const toUTC = (localDateString) => {
                if (!localDateString) return null;
                return new Date(localDateString).toISOString();
            };

            const payload = {
                title,
                description,
                requirements,
                opens_at: toUTC(opensAt),
                closes_at: toUTC(closesAt),
                status,
            };
            
            if (isEditMode) {
                await recruitmentService.update(editNoticeId, payload);
            } else {
                await recruitmentService.create(clubId, payload);
            }
            
            setIsModalOpen(false);
            loadNotices();
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} recruitment notice.`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (noticeId) => {
        if (!window.confirm('Are you sure you want to delete this recruitment notice?')) return;
        try {
            await recruitmentService.remove(noticeId);
            loadNotices();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete recruitment notice.');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <Target className="w-6 h-6 text-blue-600" /> Member Recruitment Drives
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Apply for official positions and general membership across clubs.</p>
                </div>
                <div className="flex space-x-3">
                    {clubId && (
                        <Link to={`/clubs/${clubId}`}>
                            <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5">
                                <ArrowLeft className="w-4 h-4" /> Back to Club
                            </button>
                        </Link>
                    )}
                    {clubId && can('can_manage_recruitment') && (
                        <button
                            onClick={handleCreateOpen}
                            className="px-3.5 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                            <Plus className="w-4 h-4" /> Post Recruitment Drive
                        </button>
                    )}
                </div>
            </div>

            {error && <ErrorBanner message={error} />}

            {notices.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-xl shadow-xs border border-slate-200 text-slate-500">
                    <p className="text-base font-medium">No open recruitment drives currently available.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {notices.map((notice) => (
                        <Card key={notice.id} className="flex flex-col justify-between hover:shadow-xs transition border border-slate-200 bg-white rounded-xl p-6">
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-bold text-xl text-[#0b1c30] leading-snug">{notice.title}</h3>
                                    <div className="flex items-center gap-2">
                                        {notice.status && <Badge status={notice.status} />}
                                        {can('can_manage_recruitment') && (
                                            <div className="flex items-center space-x-1">
                                                <button onClick={() => handleEditOpen(notice)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(notice.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                                    <Trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-600 space-y-1.5 mb-3 bg-[#f8f9ff] p-3 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-600" /> Opens: {new Date(notice.opens_at).toLocaleString()}</div>
                                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> Closes: {new Date(notice.closes_at).toLocaleString()}</div>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-3 mb-4">{notice.description}</p>
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                <Link to={`/recruitment/${notice.id}`}>
                                    <button className="px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-xs">
                                        View Details & Apply <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </Link>
                                {can('can_manage_recruitment') && (
                                    <Link to={`/recruitment/${notice.id}/applications`}>
                                        <button className="px-3.5 py-1.5 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] border border-slate-300 text-xs font-semibold rounded-lg transition-colors">
                                            Review Applications
                                        </button>
                                    </Link>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit/Create Recruitment Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Edit Recruitment Notice" : "Post Recruitment Notice"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-[#0b1c30]">Title</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Spring Executive Drive 2026"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-[#0b1c30]">Opens At</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                value={opensAt}
                                onChange={(e) => setOpensAt(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-[#0b1c30]">Closes At</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                value={closesAt}
                                onChange={(e) => setClosesAt(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-[#0b1c30]">Description</label>
                        <textarea
                            rows={3}
                            required
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-[#0b1c30]">Requirements</label>
                        <textarea
                            rows={3}
                            placeholder="Minimum qualifications, skills, or portfolio links required..."
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                            value={requirements}
                            onChange={(e) => setRequirements(e.target.value)}
                        />
                    </div>

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
                            {submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Notice' : 'Post Notice')}
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
