import { useState, useEffect } from 'react';
import { X, Star, ShieldCheck, UserCheck, MessageSquare } from 'lucide-react';
import eventService from '../../services/eventService';

const FeedbackListModal = ({ isOpen, onClose, eventId, eventTitle }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && eventId) {
            setLoading(true);
            setError(null);
            eventService.getEventFeedback(eventId)
                .then((res) => {
                    setFeedbacks(res.data || []);
                    setLoading(false);
                })
                .catch((err) => {
                    setError(err.response?.data?.message || 'Failed to load feedback details.');
                    setLoading(false);
                });
        }
    }, [isOpen, eventId]);

    if (!isOpen) return null;

    const totalReviews = feedbacks.length;
    const avgRating = totalReviews > 0
        ? (feedbacks.reduce((sum, item) => sum + (item.rating || 0), 0) / totalReviews).toFixed(1)
        : '0.0';

    const distribution = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: feedbacks.filter((f) => f.rating === star).length,
        percentage: totalReviews > 0 ? (feedbacks.filter((f) => f.rating === star).length / totalReviews) * 100 : 0,
    }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Event Feedback Responses</h3>
                            <p className="text-xs text-slate-500">{eventTitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                            <p className="text-sm">Loading feedback details...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
                            {error}
                        </div>
                    ) : (
                        <>
                            {/* Summary metrics header */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4 items-center">
                                <div className="text-center md:border-r md:border-slate-200 pr-2">
                                    <span className="text-4xl font-bold text-slate-900">{avgRating}</span>
                                    <div className="flex justify-center gap-1 my-1">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`w-4 h-4 ${
                                                    s <= Math.round(Number(avgRating))
                                                        ? 'fill-amber-400 text-amber-400'
                                                        : 'text-slate-300'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500">{totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}</p>
                                </div>

                                <div className="col-span-2 space-y-1.5 pl-2">
                                    {distribution.map((item) => (
                                        <div key={item.star} className="flex items-center text-xs gap-2">
                                            <span className="w-3 font-medium text-slate-600">{item.star}</span>
                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                            <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-amber-400 h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                            <span className="w-8 text-right font-medium text-slate-500">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Responses list */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-800 mb-3">Individual Submissions</h4>
                                {feedbacks.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic py-6 text-center">No feedback submissions recorded yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {feedbacks.map((fb) => {
                                            const authorName = fb.user?.name || 'Attendee';
                                            return (
                                                <div key={fb.id} className="p-4 bg-white border border-slate-100 rounded-xl space-y-2 hover:border-slate-200 transition">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                                                                <UserCheck className="w-3.5 h-3.5" />
                                                                {authorName}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <Star
                                                                    key={s}
                                                                    className={`w-3.5 h-3.5 ${
                                                                        s <= fb.rating
                                                                            ? 'fill-amber-400 text-amber-400'
                                                                            : 'text-slate-200'
                                                                    }`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {fb.comment && (
                                                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                                            {fb.comment}
                                                        </p>
                                                    )}

                                                    <div className="text-right text-xs text-slate-400">
                                                        {new Date(fb.created_at).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackListModal;
