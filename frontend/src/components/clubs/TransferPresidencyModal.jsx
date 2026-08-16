import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import clubService from '../../services/clubService';
import { ShieldCheck, UserCheck, AlertTriangle, Search, Check } from 'lucide-react';

const TransferPresidencyModal = ({ isOpen, onClose, clubId, members = [], currentPresidentId, onTransferred }) => {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [formerRole, setFormerRole] = useState('member');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    // Filter out current president
    const eligibleMembers = members.filter(
        (m) => m.user_id !== currentPresidentId && m.status === 'active'
    ).filter((m) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const name = (m.user?.name || '').toLowerCase();
        const email = (m.user?.email || '').toLowerCase();
        const studentId = (m.user?.student_id || '').toLowerCase();
        return name.includes(q) || email.includes(q) || studentId.includes(q);
    });

    const handleTransfer = async (e) => {
        e.preventDefault();
        if (!selectedUserId) {
            setError('Please select a member to transfer presidency to.');
            return;
        }

        const selectedMember = members.find((m) => m.user_id === parseInt(selectedUserId));
        const targetName = selectedMember?.user?.name || `User #${selectedUserId}`;

        if (!window.confirm(`Are you sure you want to transfer full Presidency of this club to ${targetName}?`)) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await clubService.transferPresidency(clubId, selectedUserId, formerRole);
            if (onTransferred) onTransferred();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to transfer presidency.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transfer Club Presidency"
        >
            <form onSubmit={handleTransfer} className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <strong className="block font-bold">Important Notice:</strong>
                        Transferring presidency immediately assigns full presidential leadership rights to the chosen member.
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                        {error}
                    </div>
                )}

                {/* Member Search & Selection */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                        Select New President *
                    </label>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filter members by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600 bg-white"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
                        {eligibleMembers.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                                {searchQuery ? 'No matching members found.' : 'No eligible members in club.'}
                            </div>
                        ) : (
                            eligibleMembers.map((m) => {
                                const isSelected = selectedUserId === String(m.user_id);
                                return (
                                    <div
                                        key={m.id}
                                        onClick={() => setSelectedUserId(String(m.user_id))}
                                        className={`p-2.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                            isSelected
                                                ? 'bg-blue-600 text-white font-semibold'
                                                : 'hover:bg-white text-slate-700'
                                        }`}
                                    >
                                        <div>
                                            <div className="font-bold">{m.user?.name || `User #${m.user_id}`}</div>
                                            <div className={`text-[11px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                {m.user?.student_id || m.user?.email} • {m.role || 'member'}
                                            </div>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Role for Former President */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                        Assign New Role to Former President
                    </label>
                    <select
                        value={formerRole}
                        onChange={(e) => setFormerRole(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                    >
                        <option value="member">General Member</option>
                        <option value="vice_president">Vice President</option>
                        <option value="secretary">Secretary</option>
                        <option value="treasurer">Treasurer</option>
                    </select>
                </div>

                <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-100">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading || !selectedUserId}>
                        {loading ? 'Transferring...' : 'Transfer Presidency'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default TransferPresidencyModal;
