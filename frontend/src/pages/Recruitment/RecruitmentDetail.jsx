import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import recruitmentService from '../../services/recruitmentService';
import { ClubPermissionsProvider } from '../../context/ClubPermissionsContext';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';

const RecruitmentDetailContent = () => {
    const { clubId, noticeId } = useParams();

    const [notice, setNotice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Application form answers
    const [motivation, setMotivation] = useState('');
    const [experience, setExperience] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');

    const loadNotice = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await recruitmentService.get(noticeId);
            setNotice(res.data || res);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load recruitment notice');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (noticeId) loadNotice();
    }, [noticeId]);

    const handleApply = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);
        try {
            const answers = {
                motivation,
                experience,
                portfolio_url: portfolioUrl,
            };
            await recruitmentService.apply(noticeId, answers);
            setSuccess('Application submitted successfully!');
            setMotivation('');
            setExperience('');
            setPortfolioUrl('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit application.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!notice) return <ErrorBanner message={error || 'Recruitment notice not found'} />;

    const isOpen = notice.status === 'open' && new Date() >= new Date(notice.opens_at) && new Date() <= new Date(notice.closes_at);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                Recruitment Drive
                            </span>
                            {notice.status && <Badge status={notice.status} />}
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900">{notice.title}</h1>
                    </div>
                    <Link to={`/clubs/${notice.club_id || clubId}/recruitment`}>
                        <Button variant="secondary">← Back to Recruitment</Button>
                    </Link>
                </div>

                {error && <ErrorBanner message={error} />}
                {success && <SuccessBanner message={success} />}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {/* Notice Info */}
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg mb-1">Drive Overview</h3>
                            <p className="text-gray-700 whitespace-pre-line leading-relaxed">{notice.description}</p>
                        </div>

                        {notice.requirements && (
                            <div className="bg-gray-50 p-4 rounded border">
                                <h4 className="font-bold text-gray-800 text-sm mb-1">Requirements & Qualifications</h4>
                                <p className="text-gray-700 text-sm whitespace-pre-line">{notice.requirements}</p>
                            </div>
                        )}
                    </div>

                    {/* Meta Sidebar */}
                    <div className="bg-gray-50 p-6 rounded-lg border space-y-3 text-sm">
                        <h4 className="font-bold text-gray-800 border-b pb-2">Timeline</h4>
                        <div>
                            <span className="text-gray-500 block">Opens:</span>
                            <span className="font-medium text-gray-900">{new Date(notice.opens_at).toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Closes:</span>
                            <span className="font-medium text-gray-900">{new Date(notice.closes_at).toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t">
                            <span className="text-gray-500 block">Application Status:</span>
                            <span className={`font-bold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                                {isOpen ? 'Currently Accepting Applications' : 'Applications Closed'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Application Form */}
                {isOpen ? (
                    <div className="bg-white border rounded-lg p-6 mt-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Submit Your Application</h3>
                        <form onSubmit={handleApply} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Why are you interested in joining?</label>
                                <textarea
                                    rows={3}
                                    required
                                    placeholder="Explain your motivation..."
                                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={motivation}
                                    onChange={(e) => setMotivation(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Relevant Experience / Skills</label>
                                <textarea
                                    rows={3}
                                    placeholder="Highlight previous projects, leadership roles, or technical skills..."
                                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={experience}
                                    onChange={(e) => setExperience(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Portfolio / LinkedIn / Resume URL (Optional)</label>
                                <input
                                    type="url"
                                    placeholder="https://github.com/username or LinkedIn link"
                                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={portfolioUrl}
                                    onChange={(e) => setPortfolioUrl(e.target.value)}
                                />
                            </div>

                            <Button variant="primary" type="submit" disabled={submitting}>
                                {submitting ? 'Submitting Application...' : 'Submit Application'}
                            </Button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-gray-100 p-6 rounded text-center text-gray-600 font-medium">
                        The application window for this recruitment drive is currently closed.
                    </div>
                )}
            </div>
        </div>
    );
};

const RecruitmentDetail = () => {
    const { clubId } = useParams();
    if (clubId) {
        return (
            <ClubPermissionsProvider clubId={clubId}>
                <RecruitmentDetailContent />
            </ClubPermissionsProvider>
        );
    }
    return <RecruitmentDetailContent />;
};

export default RecruitmentDetail;
