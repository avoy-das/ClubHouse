import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, FileCheck, AlertCircle, FileText, ExternalLink } from 'lucide-react';
import MainLayout from '../../layouts/MainLayout';
import recruitmentService from '../../services/recruitmentService';
import { ClubPermissionsProvider } from '../../context/ClubPermissionsContext';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';
import { formatSessionLabel } from '../../utils/sessionUtils';
import { getImageUrl } from '../../utils/imageUrl';

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
    const [customTextAnswers, setCustomTextAnswers] = useState({});
    const [customFileAnswers, setCustomFileAnswers] = useState({});

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
            const formData = new FormData();
            formData.append('answers[motivation]', motivation);
            formData.append('answers[experience]', experience);
            formData.append('answers[portfolio_url]', portfolioUrl);

            Object.entries(customTextAnswers).forEach(([key, val]) => {
                formData.append(`answers[custom_text][${key}]`, val);
            });

            Object.entries(customFileAnswers).forEach(([key, file]) => {
                if (file) {
                    formData.append(`answers_files[${key}]`, file);
                }
            });

            const res = await recruitmentService.apply(targetNoticeId, formData);
            const createdApp = res.data || res;
            setNotice((prev) => ({
                ...prev,
                my_application: createdApp,
            }));
            setSuccess("Application submitted successfully!");
            setMotivation('');
            setExperience('');
            setPortfolioUrl('');
            setCustomTextAnswers({});
            setCustomFileAnswers({});
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

    // Target sessions check
    const hasTargetSessions = Array.isArray(notice.target_sessions) && notice.target_sessions.length > 0;
    const isUserInTargetSession = !hasTargetSessions || (
        user?.session !== null &&
        user?.session !== undefined &&
        notice.target_sessions.map(Number).includes(Number(user.session))
    );

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
                    <Link to={clubId ? `/clubs/${clubId}/recruitment` : '/recruitment'}>
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
                        ) : !isUserInTargetSession ? (
                            <div className="bg-rose-50 border border-rose-200 text-rose-900 p-5 rounded-xl flex items-start gap-3.5">
                                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-rose-900">Application Restricted to Target Student Sessions</h4>
                                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                                        This recruitment campaign is open exclusively for students belonging to session(s):{' '}
                                        <span className="font-bold">
                                            {notice.target_sessions.map(s => formatSessionLabel(s) || s).join(', ')}
                                        </span>.
                                        {user?.session !== null && user?.session !== undefined ? (
                                            <> Your registered profile session is <span className="font-bold">{formatSessionLabel(user.session)}</span>.</>
                                        ) : (
                                            <> You currently have no session specified on your profile.</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ) : hasApplied ? (
                            <div className="bg-blue-50 border border-blue-200 text-blue-900 p-6 rounded-xl space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/80 pb-3">
                                    <div className="flex items-center gap-2">
                                        <FileCheck className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-base font-bold text-blue-900">Application Submitted</h3>
                                    </div>
                                    {notice.my_application.status && (
                                        <Badge status={
                                            notice.my_application.status === 'accepted' ? 'accepted' :
                                                notice.my_application.status === 'rejected' ? 'rejected' : 'open'
                                        } />
                                    )}
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
                                    {notice.my_application.answers?.custom_text && Object.entries(notice.my_application.answers.custom_text).map(([key, val]) => (
                                        <div key={key}>
                                            <span className="font-semibold text-slate-500">{key}: </span>
                                            <p className="text-slate-800 mt-0.5 whitespace-pre-line leading-relaxed">{val}</p>
                                        </div>
                                    ))}
                                    {notice.my_application.answers?.custom_files && Object.entries(notice.my_application.answers.custom_files).map(([key, fileObj]) => (
                                        <div key={key}>
                                            <span className="font-semibold text-slate-500">{key}: </span>
                                            <a
                                                href={getImageUrl(fileObj.url || fileObj.path)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:underline break-all font-semibold inline-flex items-center gap-1 mt-0.5"
                                            >
                                                <FileText className="w-4 h-4 text-blue-600 inline shrink-0" />
                                                <span>{fileObj.name || 'View Uploaded Document'}</span>
                                                <ExternalLink className="w-3.5 h-3.5 inline shrink-0" />
                                            </a>
                                        </div>
                                    ))}
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

                                    {/* Render Custom Fields created by Executive */}
                                    {Array.isArray(notice.custom_fields) && notice.custom_fields.length > 0 && (
                                        <div className="pt-3 border-t space-y-4">
                                            <h4 className="font-bold text-slate-800 text-sm">Additional Campaign Questions</h4>
                                            {notice.custom_fields.map((field, idx) => (
                                                <div key={field.id || idx}>
                                                    <label className="block text-sm font-medium mb-1">
                                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                                    </label>
                                                    {field.type === 'file' ? (
                                                        <input
                                                            type="file"
                                                            required={field.required}
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                setCustomFileAnswers(prev => ({
                                                                    ...prev,
                                                                    [field.label || `Field ${idx + 1}`]: file
                                                                }));
                                                            }}
                                                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                                                        />
                                                    ) : (
                                                        <textarea
                                                            rows={2}
                                                            required={field.required}
                                                            placeholder="Your answer..."
                                                            value={customTextAnswers[field.label || `Field ${idx + 1}`] || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setCustomTextAnswers(prev => ({
                                                                    ...prev,
                                                                    [field.label || `Field ${idx + 1}`]: val
                                                                }));
                                                            }}
                                                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

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
