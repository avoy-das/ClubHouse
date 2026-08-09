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
import { Check, X, ArrowLeft, Users, FileText } from 'lucide-react';
import { formatSessionLabel } from '../../utils/sessionUtils';
import { getImageUrl } from '../../utils/imageUrl';

const ApplicationPhaseStepper = ({ status }) => {
    // Determine active phase step index: 0 = Application, 1 = Interview, 2 = Result
    let currentStep = 0;
    if (status === 'interview') currentStep = 1;
    if (status === 'accepted' || status === 'rejected') currentStep = 2;

    const steps = [
        { label: 'Application', desc: 'Submitted' },
        { label: 'Interview', desc: status === 'interview' ? 'In Progress' : currentStep > 1 ? 'Completed' : 'Screening' },
        { 
            label: 'Result', 
            desc: status === 'accepted' ? 'Accepted' : status === 'rejected' ? 'Rejected' : 'Decision Pending' 
        },
    ];

    return (
        <div className="w-full my-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between relative">
                {steps.map((step, idx) => {
                    const isCompleted = idx < currentStep || (idx === 2 && (status === 'accepted' || status === 'rejected'));
                    const isCurrent = idx === currentStep && !(idx === 2 && (status === 'accepted' || status === 'rejected'));
                    const isFailed = idx === 2 && status === 'rejected';

                    return (
                        <div key={step.label} className="flex-1 flex flex-col items-center relative z-10">
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
                            <span className={`text-xs font-semibold mt-1.5 ${
                                isCurrent || isCompleted ? 'text-[#0b1c30]' : 'text-slate-400'
                            }`}>
                                {step.label}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                                {step.desc}
                            </span>
                        </div>
                    );
                })}

                <div className="absolute top-4 left-12 right-12 h-0.5 bg-slate-200 -z-0">
                    <div
                        className="h-full transition-all duration-300"
                        style={{
                            width: currentStep === 0 ? '0%' : currentStep === 1 ? '50%' : '100%',
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

    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [reviewingId, setReviewingId] = useState(null);

    const loadApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await recruitmentService.listApplications(targetNoticeId);
            const list = res.data || res;
            setApplications(Array.isArray(list) ? list : []);
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

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" /> Review Recruitment Applications
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Track applicant progress across phases (Application → Interview → Result) and manage memberships.</p>
                </div>
                <Link to={clubId ? `/clubs/${clubId}/recruitment` : '/recruitment'}>
                    <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5">
                        <ArrowLeft className="w-4 h-4" /> Back to Recruitment
                    </button>
                </Link>
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                <h3 className="font-bold text-[#0b1c30] text-lg mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" /> Submitted Applications ({applications.length})
                </h3>

                {applications.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">No applications submitted for this recruitment notice yet.</p>
                ) : (
                    <div className="space-y-6">
                        {applications.map((app) => (
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

                                {/* Application Phase Stepper: Application -> Interview -> Result */}
                                <ApplicationPhaseStepper status={app.status} />

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
                                                📄 {fileObj.name || 'View Uploaded Document'} ↗
                                            </a>
                                        </div>
                                    ))}
                                </div>

                                {/* Action Buttons depending on phase */}
                                {(app.status === 'pending' || app.status === 'interview') && (
                                    <div className="pt-3 border-t border-slate-200 flex flex-wrap justify-end gap-2">
                                        {app.status === 'pending' && (
                                            <button
                                                disabled={reviewingId === app.id}
                                                onClick={() => handleReview(app.id, 'interview')}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors"
                                            >
                                                Advance to Interview
                                            </button>
                                        )}
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
