import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, FileCheck } from 'lucide-react';
import MainLayout from '../../layouts/MainLayout';
import recruitmentService from '../../services/recruitmentService';
import { ClubPermissionsProvider } from '../../context/ClubPermissionsContext';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';

const RecruitmentDetailContent = () => {
    const { clubId, noticeId, id } = useParams();
    const targetNoticeId = noticeId || id;
    const { user } = useAuth();

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
            const res = await recruitmentService.get(targetNoticeId);
            setNotice(res.data || res);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load recruitment notice');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (targetNoticeId) loadNotice();
    }, [targetNoticeId]);

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
            const res = await recruitmentService.apply(targetNoticeId, answers);
            const createdApp = res.data || res;
            setNotice((prev) => ({
                ...prev,
                my_application: createdApp,
            }));
            setSuccess("Application submitted successfully!");
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
    const isAlreadyMember = notice.is_member || notice.club?.members?.some(m => m.user_id === user?.id && m.status === 'active');
    const hasApplied = Boolean(notice.my_application);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                Recruitment Campaign
                            </span>
                            {notice.session && (
                                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border">
                                    Session: {notice.session}
                                </span>
                            )}
                            {notice.status && <Badge status={notice.status} />}
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900">{notice.title}</h1>
                    </div>
                    <Link to="/recruitment">
                        <Button variant="secondary">← Back to Recruitment</Button>
                    </Link>
                </div>

                {error && <ErrorBanner message={error} />}
                {success && <SuccessBanner message={success} />}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {/* Notice Info */}
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg mb-1">Campaign Overview</h3>
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

                {/* Application Section */}
                {isOpen ? (
                    <div className="bg-white border rounded-lg p-6 mt-6 space-y-4">
                        {isAlreadyMember ? (
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-xl flex items-start gap-3.5">
                                <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-amber-900">Already a Club Member</h4>
                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        You are already an active member of {notice.club?.name || 'this club'}. Recruitment is reserved for new applicants.
                                    </p>
                                </div>
                            </div>
                        ) : hasApplied ? (
                            <div className="bg-blue-50 border border-blue-200 text-blue-900 p-6 rounded-xl space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/80 pb-3">
                                    <div className="flex items-center gap-2">
                                        <FileCheck className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-base font-bold text-blue-900">Application Already Submitted</h3>
                                    </div>
                                    {notice.my_application.status && <Badge status={notice.my_application.status} />}
                                </div>

                                <p className="text-sm font-medium text-blue-800 leading-relaxed">
                                    You have already submitted an application for this recruitment campaign. Candidates are permitted to submit only one application per recruitment campaign.
                                </p>

                                <div className="bg-white/90 backdrop-blur-xs p-4 rounded-lg border border-blue-100 space-y-2 text-xs text-slate-700">
                                    <div>
                                        <span className="font-semibold text-slate-500">Submitted: </span>
                                        <span className="font-medium text-slate-800">
                                            {notice.my_application.created_at ? new Date(notice.my_application.created_at).toLocaleString() : 'Just now'}
                                        </span>
                                    </div>
                                    {notice.my_application.answers?.motivation && (
                                        <div>
                                            <span className="font-semibold text-slate-500">Motivation: </span>
                                            <p className="text-slate-800 mt-0.5 whitespace-pre-line leading-relaxed">
                                                {notice.my_application.answers.motivation}
                                            </p>
                                        </div>
                                    )}
                                    {notice.my_application.answers?.experience && (
                                        <div>
                                            <span className="font-semibold text-slate-500">Experience / Skills: </span>
                                            <p className="text-slate-800 mt-0.5 whitespace-pre-line leading-relaxed">
                                                {notice.my_application.answers.experience}
                                            </p>
                                        </div>
                                    )}
                                    {notice.my_application.answers?.portfolio_url && (
                                        <div>
                                            <span className="font-semibold text-slate-500">Portfolio: </span>
                                            <a
                                                href={notice.my_application.answers.portfolio_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:underline break-all font-medium"
                                            >
                                                {notice.my_application.answers.portfolio_url}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                ) : (
                    <div className="bg-gray-100 p-6 rounded text-center text-gray-600 font-medium">
                        The application window for this recruitment campaign is currently closed.
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
            <MainLayout>
                <ClubPermissionsProvider clubId={clubId}>
                    <RecruitmentDetailContent />
                </ClubPermissionsProvider>
            </MainLayout>
        );
    }
    return (
        <MainLayout>
            <RecruitmentDetailContent />
        </MainLayout>
    );
};

export default RecruitmentDetail;
