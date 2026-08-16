import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import clubService from '../../services/clubService';
import { UserCheck, Mail, Building, Briefcase, AlertCircle } from 'lucide-react';

const EditAdvisorModal = ({ isOpen, onClose, clubId, currentAdvisors = [], advisorToEdit = null, editIndex = null, onAdvisorsUpdated }) => {
    const [formData, setFormData] = useState({
        name: '',
        title: '',
        department: '',
        contact_email: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (advisorToEdit) {
            setFormData({
                name: advisorToEdit.name || '',
                title: advisorToEdit.title || '',
                department: advisorToEdit.department || '',
                contact_email: advisorToEdit.contact_email || '',
            });
        } else {
            setFormData({ name: '', title: '', department: '', contact_email: '' });
        }
        setError(null);
    }, [advisorToEdit, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let updatedList = [...currentAdvisors];
            const newAdvisorObj = {
                id: advisorToEdit?.id || Date.now().toString(),
                ...formData,
            };

            if (editIndex !== null && editIndex >= 0 && editIndex < updatedList.length) {
                updatedList[editIndex] = newAdvisorObj;
            } else {
                updatedList.push(newAdvisorObj);
            }

            const res = await clubService.updateAdvisor(clubId, { advisors: updatedList });
            const savedAdvisors = res.data?.advisors || updatedList;

            if (onAdvisorsUpdated) {
                onAdvisorsUpdated(savedAdvisors);
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update advisor information.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={advisorToEdit ? 'Edit Advisor Details' : 'Add New Advisor'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Advisor Full Name *
                    </label>
                    <input
                        type="text"
                        name="name"
                        required
                        placeholder="e.g. Dr. Jane Doe"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-blue-600" /> Academic / Professional Title
                    </label>
                    <input
                        type="text"
                        name="title"
                        placeholder="e.g. Professor & Faculty Advisor"
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-blue-600" /> Department / Academic Unit
                    </label>
                    <input
                        type="text"
                        name="department"
                        placeholder="e.g. Computer Science & Engineering"
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600" /> Official Contact Email
                    </label>
                    <input
                        type="email"
                        name="contact_email"
                        placeholder="e.g. advisor@university.edu"
                        value={formData.contact_email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white font-mono"
                    />
                </div>

                <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-100">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Saving...' : advisorToEdit ? 'Save Changes' : 'Add Advisor'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default EditAdvisorModal;
