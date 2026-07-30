import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import recruitmentService from '../../services/recruitmentService';
import { ClubPermissionsProvider } from '../../context/ClubPermissionsContext';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';

const RecruitmentApplicationsContent = () => {
    const { clubId, noticeId } = useParams();

    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [reviewingId, setReviewingId] = useState(null);

    const loadApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await recruitmentService.listApplications(noticeId);
            const list = res.data || res;
            setApplications(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (noticeId) loadApplications();
    }, [noticeId]);

    const handleReview = async (appId, status) => {
        setReviewingId(appId);
        setError(null);
        setSuccess(null);
        try {
            await recruitmentService.reviewApplication(appId, status);
            setSuccess(`Application marked as ${status}.`);
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
                    <p className="text-gray-500 text-sm">Accepting an application admits the applicant as a club member.</p>
                </div>
                <Link to={`/clubs/${clubId}/recruitment/${noticeId}`}>
                    <Button variant="secondary">← Back to Drive</Button>
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
                            <div key={app.id} className="border p-6 rounded-lg bg-gray-50 space-y-3">
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

                                {app.status === 'pending' && (
                                    <div className="pt-3 border-t flex justify-end space-x-3">
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
    return (
        <ClubPermissionsProvider clubId={clubId}>
            <RecruitmentApplicationsContent />
        </ClubPermissionsProvider>
    );
};

export default RecruitmentApplications;
