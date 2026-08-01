import { useState, useEffect } from 'react';
import clubService from '../../services/clubService';

const CATEGORIES = [
    'Academic',
    'Technology',
    'Cultural',
    'Sports',
    'Arts & Media',
    'Business & Entrepreneurship',
    'Community Service',
    'Environment',
    'Health & Wellness',
    'Recreation & Hobby',
    'Other',
];

const EditClubModal = ({ isOpen, onClose, club, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: 'Academic',
        department: '',
        description: '',
        contact_email: '',
        contact_phone: '',
    });
    const [logoFile, setLogoFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && club) {
            setError(null);
            setLogoFile(null);
            setFormData({
                name: club.name || '',
                category: club.category || 'Academic',
                department: club.department || '',
                description: club.description || '',
                contact_email: club.contact_email || '',
                contact_phone: club.contact_phone || '',
            });
        }
    }, [isOpen, club]);

    if (!isOpen || !club) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const data = new FormData();
        data.append('_method', 'PUT');
        data.append('name', formData.name);
        data.append('category', formData.category);
        data.append('department', formData.department);
        data.append('description', formData.description);
        data.append('contact_email', formData.contact_email);
        if (formData.contact_phone) data.append('contact_phone', formData.contact_phone);
        if (logoFile) data.append('logo', logoFile);

        try {
            const res = await clubService.updateClub(club.id, data);
            if (onSuccess) {
                onSuccess(res.data.club, 'Club details updated successfully!');
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update club details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 relative animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">
                        Edit Club Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
                    >
                        &times;
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
                    {/* Club Name */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Club Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900"
                        />
                    </div>

                    {/* Category & Department */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 bg-slate-50"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Computer Science & Engineering"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900"
                            />
                        </div>
                    </div>

                    {/* Contact Email & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email *</label>
                            <input
                                type="email"
                                name="contact_email"
                                value={formData.contact_email}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                            <input
                                type="text"
                                name="contact_phone"
                                value={formData.contact_phone}
                                onChange={handleChange}
                                placeholder="+8801700000000"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
                        <textarea
                            name="description"
                            rows={4}
                            value={formData.description}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900"
                        />
                    </div>

                    {/* Logo Image Picker */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Update Club Logo (Optional)</label>
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleFileChange}
                            className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        />
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditClubModal;
