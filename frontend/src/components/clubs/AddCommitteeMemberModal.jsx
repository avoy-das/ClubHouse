import { useState, useEffect } from 'react';
import clubService from '../../services/clubService';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ErrorBanner from '../ui/ErrorBanner';
import SuccessBanner from '../ui/SuccessBanner';
import { UserPlus, Shield, PlusCircle, Trash2, CheckCircle } from 'lucide-react';

const AddCommitteeMemberModal = ({ isOpen, onClose, clubId, onMemberAdded }) => {
    const [email, setEmail] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('');
    const [positions, setPositions] = useState([]);
    
    // Custom Designation creation state
    const [newDesignationTitle, setNewDesignationTitle] = useState('');
    const [isCreatingDesignation, setIsCreatingDesignation] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const defaultDesignations = [
        'Chief Advisor',
        'Advisor',
        'President',
        'Vice President',
        'General Secretary',
        'Treasurer'
    ];

    const loadPositions = async () => {
        try {
            const data = await clubService.listPositions(clubId);
            const list = data.data || data || [];
            setPositions(list);
            
            // Check missing default positions and create them if empty
            const existingTitles = list.map(p => p.title.toLowerCase());
            for (const defTitle of defaultDesignations) {
                if (!existingTitles.includes(defTitle.toLowerCase())) {
                    try {
                        await clubService.createPosition(clubId, {
                            title: defTitle,
                            is_executive: true,
                            can_manage_members: ['President', 'Vice President', 'General Secretary'].includes(defTitle)
                        });
                    } catch (e) {
                        // Ignore standard duplication error
                    }
                }
            }

            // Reload after auto-seeding standard designations
            const updated = await clubService.listPositions(clubId);
            setPositions(updated.data || updated || []);
        } catch (err) {
            console.error('Failed to load positions', err);
        }
    };

    useEffect(() => {
        if (isOpen && clubId) {
            loadPositions();
            setError(null);
            setSuccess(null);
            setEmail('');
            setSelectedPosition('');
            setNewDesignationTitle('');
        }
    }, [isOpen, clubId]);

    const handleAddCommitteeMember = async (e) => {
        e.preventDefault();
        if (!email.trim() || !selectedPosition) {
            setError('Please enter a valid user email and select a designation.');
            return;
        }
        setError(null);
        setSuccess(null);
        setLoading(true);
        try {
            await clubService.addCommitteeMemberByEmail(clubId, {
                email: email.trim(),
                position_id: selectedPosition
            });
            setSuccess(`Member successfully added to committee!`);
            setEmail('');
            setSelectedPosition('');
            if (onMemberAdded) onMemberAdded();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add committee member. Make sure the user is registered in the system.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDesignation = async (e) => {
        e.preventDefault();
        if (!newDesignationTitle.trim()) return;
        setError(null);
        setSuccess(null);
        setIsCreatingDesignation(true);
        try {
            await clubService.createPosition(clubId, {
                title: newDesignationTitle.trim(),
                is_executive: true,
                can_manage_members: false
            });
            setSuccess(`Custom designation "${newDesignationTitle}" added!`);
            setNewDesignationTitle('');
            await loadPositions();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create new designation.');
        } finally {
            setIsCreatingDesignation(false);
        }
    };

    const handleDeleteDesignation = async (posId, title) => {
        if (!window.confirm(`Are you sure you want to delete the designation "${title}"?`)) return;
        setError(null);
        setSuccess(null);
        try {
            await clubService.removePosition(posId);
            setSuccess(`Designation "${title}" removed.`);
            await loadPositions();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete designation.');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Committee Member & Designations" maxWidth="max-w-4xl">
            <div className="space-y-4">
                {error && <ErrorBanner message={error} />}
                {success && <SuccessBanner message={success} />}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Side: Add Person Info Form */}
                    <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                            <UserPlus className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-[#0b1c30] text-sm">Admit Person to Committee</h3>
                        </div>

                        <form onSubmit={handleAddCommitteeMember} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Person's Email Address <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g. member@nstu.edu.bd"
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <span className="text-[11px] text-slate-500 mt-1 block">
                                    Enter the registered email of the user to assign.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Select Designation <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedPosition}
                                    onChange={(e) => setSelectedPosition(e.target.value)}
                                >
                                    <option value="">-- Select Designation --</option>
                                    {positions.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.title} {['chief advisor', 'president', 'vice president', 'general secretary', 'treasurer'].includes(p.title.toLowerCase()) ? '(Only 1 person)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2">
                                <Button variant="primary" type="submit" loading={loading} className="w-full justify-center">
                                    Add New Committee Member
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Right Side: List of Designations & Add New Designation */}
                    <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-bold text-[#0b1c30] text-sm">Club Personnel Designations</h3>
                                </div>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                                    {positions.length} Positions
                                </span>
                            </div>

                            <p className="text-xs text-slate-500">
                                List of designations available in the dropdown menu. Custom designations can be added below by the President.
                            </p>

                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {positions.map((p) => {
                                    const isRestricted = ['chief advisor', 'president', 'vice president', 'general secretary', 'treasurer'].includes(p.title.toLowerCase());
                                    return (
                                        <div
                                            key={p.id}
                                            className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                                        >
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                <span>{p.title}</span>
                                                {isRestricted && (
                                                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                                                        Single Occupant
                                                    </span>
                                                )}
                                            </div>
                                            {!isRestricted && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteDesignation(p.id, p.title)}
                                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                                    title="Delete Custom Designation"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Bottom: New Designation Button / Form */}
                        <form onSubmit={handleCreateDesignation} className="pt-3 border-t border-slate-200 space-y-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Create Customized Designation
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="e.g. Executive Director, Event Lead"
                                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newDesignationTitle}
                                    onChange={(e) => setNewDesignationTitle(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={isCreatingDesignation || !newDesignationTitle.trim()}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                                >
                                    <PlusCircle className="w-3.5 h-3.5" /> New Designation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-200">
                    <Button variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default AddCommitteeMemberModal;
