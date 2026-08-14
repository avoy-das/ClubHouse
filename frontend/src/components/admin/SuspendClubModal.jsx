import { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

const SuspendClubModal = ({ isOpen, onClose, clubName, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setReason('');
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = reason.trim();
        if (!trimmed) {
            setError('A suspension reason is required.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await onConfirm(trimmed);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to suspend club.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col overflow-hidden my-auto relative">
                {/* Header */}
                <div className="flex items-start gap-3 p-6 pb-4 border-b border-slate-100 shrink-0 bg-white">
                    <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700 shrink-0">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-[#0b1c30]">
                            Suspend Club
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {clubName ? `Suspending '${clubName}'` : 'Official Club Suspension'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 overflow-y-auto flex-1 space-y-4">
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                            <p className="font-medium">
                                Suspending this club will halt operations, cancel active events, and disable executive controls until reactivated.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 text-xs rounded-xl font-semibold">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Official Reason for Suspension *
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                required
                                placeholder="Provide the official administrative reason for suspending this club..."
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none bg-[#f8f9ff]"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 p-6 pt-4 border-t border-slate-100 shrink-0 bg-white">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !reason.trim()}
                            className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-xs"
                        >
                            {loading ? 'Suspending...' : 'Confirm Suspension'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SuspendClubModal;
