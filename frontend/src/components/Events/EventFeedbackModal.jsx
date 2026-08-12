import { useState, useEffect } from 'react';
import { Star, X, MessageSquare, Trash2, AlertCircle } from 'lucide-react';
import eventService from '../../services/eventService';

const EventFeedbackModal = ({ isOpen, onClose, eventId, eventTitle, existingFeedback, onSuccess }) => {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (existingFeedback) {
            setRating(existingFeedback.rating || 5);
            setComment(existingFeedback.comment || existingFeedback.comments || '');
        } else {
            setRating(5);
            setComment('');
        }
        setError(null);
    }, [existingFeedback, isOpen]);

    if (!isOpen) return null;

    const isEdit = Boolean(existingFeedback);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);

        setSubmitting(true);
        const payload = {
            rating,
            comment,
        };

        const apiCall = isEdit
            ? eventService.updateFeedback(eventId, payload)
            : eventService.submitFeedback(eventId, payload);

        apiCall
            .then(() => {
                setSubmitting(false);
                onSuccess(isEdit ? 'Feedback updated successfully!' : 'Thank you for your feedback!');
                onClose();
            })
            .catch((err) => {
                setSubmitting(false);
                const msg = err.response?.data?.message || err.response?.data?.errors?.comment?.[0] || 'Failed to submit feedback.';
                setError(msg);
            });
    };

    const handleDelete = () => {
        if (!window.confirm('Are you sure you want to delete your feedback for this event?')) return;
        setDeleting(true);
        setError(null);

        eventService.deleteFeedback(eventId)
            .then(() => {
                setDeleting(false);
                onSuccess('Feedback removed.');
                onClose();
            })
            .catch((err) => {
                setDeleting(false);
                const msg = err.response?.data?.message || 'Failed to delete feedback.';
                setError(msg);
            });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-slate-800">
                            {isEdit ? 'Edit Event Feedback' : 'Event Feedback'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <p className="text-sm font-medium text-slate-600 mb-1">Event</p>
                        <p className="text-base font-semibold text-slate-900">{eventTitle}</p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
                            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Overall Rating
                        </label>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="p-1 focus:outline-none transition transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-8 h-8 ${
                                            (hoverRating || rating) >= star
                                                ? 'fill-amber-400 text-amber-400'
                                                : 'text-slate-300'
                                        }`}
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm font-semibold text-slate-700">
                                {hoverRating || rating} / 5
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Your Comments (Optional)
                        </label>
                        <textarea
                            rows={4}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="What went well? What could be improved?"
                            maxLength={2000}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
                        />
                        <div className="flex justify-between items-center mt-1 text-xs text-slate-400">
                            <span>{comment.length} / 2000 characters</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        {isEdit ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting || submitting}
                                className="px-4 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-sm font-medium transition flex items-center gap-1.5"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        ) : (
                            <div />
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting || deleting}
                                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || deleting}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : isEdit ? 'Update Feedback' : 'Submit Feedback'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventFeedbackModal;
