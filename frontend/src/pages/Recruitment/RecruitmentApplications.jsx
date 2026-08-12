import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import recruitmentService from '../../services/recruitmentService';
import { ClubPermissionsProvider } from '../../context/ClubPermissionsContext';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';
import { Check, X, ArrowLeft, Users, FileText, ExternalLink, Search, Filter } from 'lucide-react';
import { formatSessionLabel } from '../../utils/sessionUtils';
import { getImageUrl } from '../../utils/imageUrl';

const ApplicationPhaseStepper = ({ status, pipelineStages = [] }) => {
    // Dynamic stages list: intermediate stages from notice + final Decision stage
    const defaultStages = [
        { key: 'submitted', label: 'Application Submitted' },
        { key: 'shortlisted', label: 'Shortlisted' },
        { key: 'interview', label: 'Interview' }
    ];

    const stages = (pipelineStages.length > 0 ? pipelineStages : defaultStages).map(s => ({
        key: s.key,
        label: s.label || s.key,
    }));

    // Append terminal Decision stage
    stages.push({
        key: 'decision',
        label: 'Decision',
        desc: status === 'accepted' ? 'Accepted' : status === 'rejected' ? 'Rejected' : 'Pending'
    });

    const activeKeys = stages.map(s => s.key);
    let currentStepIndex = activeKeys.indexOf(status);
    if (status === 'accepted' || status === 'rejected') {
        currentStepIndex = stages.length - 1;
    } else if (currentStepIndex === -1) {
        currentStepIndex = 0;
    }

    return (
        <div className="w-full my-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between relative">
                {stages.map((step, idx) => {
                    const isCompleted = idx < currentStepIndex || (idx === stages.length - 1 && (status === 'accepted' || status === 'rejected'));
                    const isCurrent = idx === currentStepIndex && !(idx === stages.length - 1 && (status === 'accepted' || status === 'rejected'));
                    const isFailed = idx === stages.length - 1 && status === 'rejected';

                    return (
                        <div key={step.key || idx} className="flex-1 flex flex-col items-center relative z-10">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    isFailed
                                        ? 'bg-red-600 text-white ring-4 ring-red-100'
                                        : isCompleted
                                        ? 'bg-emerald-600 text-white'
                                        : isCurrent
                                        ? 'bg-[#2563eb] text-white ring-4 ring-blue-100'
                                        : 'bg-slate-100 text-slate-400 border border-slate-300'
                                }`}
                            >
                                {isFailed ? (
                                    <X className="w-4 h-4" />
                                ) : isCompleted ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    idx + 1
                                )}
                            </div>
                            <span className={`text-xs font-semibold mt-1.5 text-center ${
                                isCurrent || isCompleted ? 'text-[#0b1c30]' : 'text-slate-400'
                            }`}>
                                {step.label}
                            </span>
                            {step.desc && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                    {step.desc}
                                </span>
                            )}
                        </div>
                    );
                })}

                <div className="absolute top-4 left-12 right-12 h-0.5 bg-slate-200 -z-0">
                    <div
                        className="h-full transition-all duration-300"
                        style={{
                            width: `${(currentStepIndex / Math.max(1, stages.length - 1)) * 100}%`,
                            backgroundColor: status === 'rejected' ? '#dc2626' : status === 'accepted' ? '#16a34a' : '#2563eb'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

const RecruitmentApplicationsContent = () => {
    const { clubId, noticeId, id } = useParams();
    const targetNoticeId = noticeId || id;

    const [notice, setNotice] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [reviewingId, setReviewingId] = useState(null);

    // Filtering
    const [stageFilter, setStageFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const loadApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const [appsRes, noticeRes] = await Promise.all([
                recruitmentService.listApplications(targetNoticeId),
                recruitmentService.get(targetNoticeId).catch(() => null)
            ]);
            const list = appsRes.data || appsRes;
            setApplications(Array.isArray(list) ? list : []);
            setNotice(noticeRes?.data || noticeRes || null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (targetNoticeId) loadApplications();
    }, [targetNoticeId]);

    const handleReview = async (appId, status) => {
        setReviewingId(appId);
        setError(null);
        setSuccess(null);
        try {
            await recruitmentService.reviewApplication(appId, status);
            setSuccess(`Application status updated to ${status}.`);
            loadApplications();
        } catch (err) {
            setError(err.response?.data?.message || `Failed to review application.`);
        } finally {
            setReviewingId(null);
        }
    };

    // Calculate next intermediate stage for a given status
    const getNextIntermediateStage = (currentStatus) => {
        if (!notice || !notice.pipeline_stages) return null;
        const stages = notice.pipeline_stages;
        const keys = stages.map(s => s.key);
        const idx = keys.indexOf(currentStatus);
        if (idx !== -1 && idx + 1 < keys.length) {
            return stages[idx + 1];
        }
        return null;
    };

    // Filter applications
    const filteredApplications = applications.filter(app => {
        if (stageFilter !== 'all' && app.status !== stageFilter) {
            return false;
        }
        const q = searchQuery.toLowerCase().trim();
        if (q) {
            const nameMatch = app.user?.name?.toLowerCase().includes(q);
            const emailMatch = app.user?.email?.toLowerCase().includes(q);
            const deptMatch = app.user?.department?.toLowerCase().includes(q);
            if (!nameMatch && !emailMatch && !deptMatch) return false;
        }
        return true;
    });

    // Metric counts
    const totalCount = applications.length;
    const pendingCount = applications.filter(a => a.status !== 'accepted' && a.status !== 'rejected').length;
    const acceptedCount = applications.filter(a => a.status === 'accepted').length;
    const rejectedCount = applications.filter(a => a.status === 'rejected').length;

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
                <div>
                    <h1 className="text-2xl font-extrabold text-[#0b1c30] flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" /> Review Recruitment Applications
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                        {notice?.title ? `Managing applications for "${notice.title}"` : 'Track applicant progress across evaluation stages.'}
                    </p>
                </div>
                <Link to={clubId ? `/clubs/${clubId}/recruitment` : '/recruitment'}>
                    <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5">
                        <ArrowLeft className="w-4 h-4" /> Back to Recruitment
                    </button>
                </Link>
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            {/* Metrics Counters Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Applicants</span>
                    <span className="text-2xl font-black text-[#0b1c30] mt-1 block">{totalCount}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-xs">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">In Pipeline / Review</span>
                    <span className="text-2xl font-black text-blue-700 mt-1 block">{pendingCount}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Accepted / Admitted</span>
                    <span className="text-2xl font-black text-emerald-700 mt-1 block">{acceptedCount}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs">
                    <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Rejected</span>
                    <span className="text-2xl font-black text-rose-700 mt-1 block">{rejectedCount}</span>
                </div>
            </div>

            {/* Main Applications Section */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
                {/* Search and Stage Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 pb-4">
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by candidate name, email, department..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50/50"
                        />
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'submitted', label: 'Submitted' },
                            { key: 'shortlisted', label: 'Shortlisted' },
                            { key: 'interview', label: 'Interview' },
                            { key: 'accepted', label: 'Accepted' },
                            { key: 'rejected', label: 'Rejected' },
                        ].map(st => {
                            const count = st.key === 'all' ? applications.length : applications.filter(a => a.status === st.key).length;
                            return (
                                <button
                                    key={st.key}
                                    onClick={() => setStageFilter(st.key)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                                        stageFilter === st.key
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {st.label} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>

                {filteredApplications.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-8">
                        {applications.length === 0
                            ? 'No applications submitted for this recruitment notice yet.'
                            : 'No applicants match the selected filter criteria.'}
                    </p>
                ) : (
                    <div className="space-y-6 pt-2">
                        {filteredApplications.map((app) => (
                            <div key={app.id} className="border border-slate-200 p-6 rounded-xl bg-[#f8f9ff] space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                    <div>
                                        <h4 className="font-bold text-[#0b1c30] text-base">
                                            {app.user?.name || `Applicant #${app.user_id}`}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            <span>{app.user?.email}</span>
                                            {app.user?.department && (
                                                <>
                                                    <span>&bull;</span>
                                                    <span className="font-medium text-slate-700">{app.user.department}</span>
                                                </>
                                            )}
                                            {app.user?.session !== null && app.user?.session !== undefined && (
                                                <>
                                                    <span>&bull;</span>
                                                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                        Session: {formatSessionLabel(app.user.session)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {app.status && <Badge status={app.status} />}
                                        <span className="text-xs text-slate-400">
                                            {new Date(app.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Application Phase Stepper */}
                                <ApplicationPhaseStepper status={app.status} pipelineStages={notice?.pipeline_stages} />

                                {/* Answers breakdown */}
                                <div className="space-y-3 text-sm text-slate-700">
                                    {app.answers?.motivation && (
                                        <div>
                                            <span className="font-semibold text-[#0b1c30] block mb-1">Motivation:</span>
                                            <p className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700">{app.answers.motivation}</p>
                                        </div>
                                    )}
                                    {app.answers?.experience && (
                                        <div>
                                            <span className="font-semibold text-[#0b1c30] block mb-1">Experience:</span>
                                            <p className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700">{app.answers.experience}</p>
                                        </div>
                                    )}
                                    {app.answers?.portfolio_url && (
                                        <div>
                                            <span className="font-semibold text-[#0b1c30] block mb-1">Portfolio:</span>
                                            <a
                                                href={app.answers.portfolio_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[#2563eb] hover:underline text-xs"
                                            >
                                                {app.answers.portfolio_url}
                                            </a>
                                        </div>
                                    )}

                                    {/* Custom Text Answers */}
                                    {app.answers?.custom_text && Object.entries(app.answers.custom_text).map(([key, val]) => (
                                        <div key={key}>
                                            <span className="font-semibold text-[#0b1c30] block mb-1">{key}:</span>
                                            <p className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-pre-line">{val}</p>
                                        </div>
                                    ))}

                                    {/* Custom File Answers */}
                                    {app.answers?.custom_files && Object.entries(app.answers.custom_files).map(([key, fileObj]) => (
                                        <div key={key}>
                                            <span className="font-semibold text-[#0b1c30] block mb-1">{key}:</span>
                                            <a
                                                href={getImageUrl(fileObj.url || fileObj.path)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-[#2563eb] hover:bg-slate-50 transition-colors shadow-xs"
                                            >
                                                <FileText className="w-4 h-4 text-blue-600 inline shrink-0" />
                                                <span>{fileObj.name || 'View Uploaded Document'}</span>
                                                <ExternalLink className="w-3.5 h-3.5 inline shrink-0" />
                                            </a>
                                        </div>
                                    ))}
                                </div>

                                {/* Action Buttons depending on phase */}
                                {app.status !== 'accepted' && app.status !== 'rejected' && (
                                    <div className="pt-3 border-t border-slate-200 flex flex-wrap justify-end gap-2">
                                        {(() => {
                                            const nextStage = getNextIntermediateStage(app.status);
                                            if (!nextStage) return null;
                                            return (
                                                <button
                                                    disabled={reviewingId === app.id}
                                                    onClick={() => handleReview(app.id, nextStage.key)}
                                                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors"
                                                >
                                                    Advance to {nextStage.label}
                                                </button>
                                            );
                                        })()}
                                        <button
                                            disabled={reviewingId === app.id}
                                            onClick={() => handleReview(app.id, 'accepted')}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                                        >
                                            Accept & Admit Member
                                        </button>
                                        <button
                                            disabled={reviewingId === app.id}
                                            onClick={() => handleReview(app.id, 'rejected')}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const RecruitmentApplications = () => {
    const { clubId } = useParams();
    if (clubId) {
        return (
            <MainLayout>
                <ClubPermissionsProvider clubId={clubId}>
                    <RecruitmentApplicationsContent />
                </ClubPermissionsProvider>
            </MainLayout>
        );
    }
    return (
        <MainLayout>
            <RecruitmentApplicationsContent />
        </MainLayout>
    );
};

export default RecruitmentApplications;
