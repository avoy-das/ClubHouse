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
        <div className="w-full my-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
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
                                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                                        : 'bg-slate-100 text-slate-400 border border-slate-300'
                                }`}
                            >
                                {isFailed ? (
                                    '✕'
                                ) : isCompleted ? (
                                    '✓'
                                ) : (
                                    idx + 1
                                )}
                            </div>
                            <span className={`text-xs font-semibold mt-1.5 ${
                                isCurrent || isCompleted ? 'text-slate-900' : 'text-slate-400'
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Review Recruitment Applications</h1>
                    <p className="text-gray-500 text-sm">Track applicant progress across phases (Application → Interview → Result) and manage memberships.</p>
                </div>
                <Link to="/recruitment">
                    <Button variant="secondary">← Back to Drives</Button>
                </Link>
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="font-bold text-gray-800 text-lg mb-4">Submitted Applications ({applications.length})</h3>

                {applications.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">No applications submitted for this drive yet.</p>
                ) : (
                    <div className="space-y-6">
                        {applications.map((app) => (
                            <div key={app.id} className="border p-6 rounded-lg bg-gray-50 space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-base">
                                            {app.user?.name || `Applicant #${app.user_id}`}
                                        </h4>
                                        <span className="text-xs text-gray-500">{app.user?.email}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {app.status && <Badge status={app.status} />}
                                        <span className="text-xs text-gray-400">
                                            {new Date(app.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Application Phase Stepper: Application -> Interview -> Result */}
                                <ApplicationPhaseStepper status={app.status} />

                                {/* Answers breakdown */}
                                <div className="space-y-2 text-sm text-gray-700">
                                    {app.answers?.motivation && (
                                        <div>
                                            <span className="font-semibold text-gray-900 block">Motivation:</span>
                                            <p className="bg-white p-3 rounded border text-xs">{app.answers.motivation}</p>
                                        </div>
                                    )}
                                    {app.answers?.experience && (
                                        <div>
                                            <span className="font-semibold text-gray-900 block">Experience:</span>
                                            <p className="bg-white p-3 rounded border text-xs">{app.answers.experience}</p>
                                        </div>
                                    )}
                                    {app.answers?.portfolio_url && (
                                        <div>
                                            <span className="font-semibold text-gray-900 block">Portfolio:</span>
                                            <a
                                                href={app.answers.portfolio_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 underline text-xs"
                                            >
                                                {app.answers.portfolio_url}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons depending on phase */}
                                {(app.status === 'pending' || app.status === 'interview') && (
                                    <div className="pt-3 border-t flex flex-wrap justify-end gap-2">
                                        {app.status === 'pending' && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                disabled={reviewingId === app.id}
                                                onClick={() => handleReview(app.id, 'interview')}
                                            >
                                                Advance to Interview
                                            </Button>
                                        )}
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            disabled={reviewingId === app.id}
                                            onClick={() => handleReview(app.id, 'accepted')}
                                        >
                                            Accept & Admit Member
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            disabled={reviewingId === app.id}
                                            onClick={() => handleReview(app.id, 'rejected')}
                                        >
                                            Reject
                                        </Button>
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
