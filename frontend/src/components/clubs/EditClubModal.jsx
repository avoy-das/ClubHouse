import { useState, useEffect } from 'react';
import clubService from '../../services/clubService';
import { useAuth } from '../../context/AuthContext';
import compressImage from '../../utils/imageCompressor';
import { getImageUrl } from '../../utils/imageUrl';

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
    const { isAdmin } = useAuth();
    const userIsAdmin = isAdmin();

    const [formData, setFormData] = useState({
        name: '',
        category: 'Academic',
        department: '',
        description: '',
        contact_email: '',
        contact_phone: '',
        reason: '',
    });
    const [logoFile, setLogoFile] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [bannerPreview, setBannerPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && club) {
            setError(null);
            setLogoFile(null);
            setBannerFile(null);
            setLogoPreview(getImageUrl(club.logo_url || club.logo_path));
            setBannerPreview(getImageUrl(club.banner_url || club.banner_path));
            setFormData({
                name: club.name || '',
                category: club.category || 'Academic',
                department: club.department || '',
                description: club.description || '',
                contact_email: club.contact_email || '',
                contact_phone: club.contact_phone || '',
                reason: '',
            });
        }
    }, [isOpen, club]);

    if (!isOpen || !club) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const raw = e.target.files[0];
            const compressed = await compressImage(raw, { maxWidth: 400, maxHeight: 400, quality: 0.85 });
            setLogoFile(compressed);
            setLogoPreview(URL.createObjectURL(compressed));
        }
    };

    const handleBannerChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const raw = e.target.files[0];
            const compressed = await compressImage(raw, { maxWidth: 1200, maxHeight: 600, quality: 0.82 });
            setBannerFile(compressed);
            setBannerPreview(URL.createObjectURL(compressed));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const data = new FormData();
        data.append('name', formData.name);
        data.append('category', formData.category);
        data.append('department', formData.department);
        data.append('description', formData.description);
        data.append('contact_email', formData.contact_email);
        if (formData.contact_phone) data.append('contact_phone', formData.contact_phone);
        if (formData.reason) data.append('reason', formData.reason);
        if (logoFile) data.append('logo', logoFile);
        if (bannerFile) data.append('banner', bannerFile);

        try {
            if (userIsAdmin) {
                data.append('_method', 'PUT');
                const res = await clubService.updateClub(club.id, data);
                if (onSuccess) {
                    onSuccess(res.data.club, 'Club details updated directly!');
                }
            } else {
                const res = await clubService.submitEditRequest(club.id, data);
                if (onSuccess) {
                    onSuccess(club, res.data.message || 'Club edit request submitted for admin approval!');
                }
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit club update.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 relative animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {userIsAdmin ? 'Edit Club Details (Admin)' : 'Request Club Details Update'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {userIsAdmin
                                ? 'Directly update club details as a platform administrator.'
                                : 'Submit proposed club details to platform administrators for approval.'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
                    >
                        &times;
                    </button>
                </div>

                {!userIsAdmin && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-start gap-2">
                        <span className="font-bold shrink-0">ℹ Note:</span>
                        <span>Your updated information will be sent to platform admins as an edit request. Changes will take effect once approved by an admin.</span>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
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
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
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
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 bg-slate-50 outline-none"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Department (Optional)</label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                placeholder="e.g. Computer Science & Engineering"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
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
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
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
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
                        <textarea
                            name="description"
                            rows={3}
                            value={formData.description}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                    </div>

                    {/* Reason for Edit */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Reason for Update {userIsAdmin ? '(Optional)' : '*'}
                        </label>
                        <input
                            type="text"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            required={!userIsAdmin}
                            placeholder="State reason for updating club details..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                    </div>

                    {/* Image Uploads: Logo & Banner */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Update Club Logo (Optional)</label>
                            <div className="flex items-center gap-3">
                                {logoPreview && (
                                    <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg, image/webp"
                                    onChange={handleLogoChange}
                                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Update Club Banner Image (Optional)</label>
                            {bannerPreview && (
                                <div className="mb-2 h-20 w-full rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                onChange={handleBannerChange}
                                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                            />
                        </div>
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
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                        >
                            {loading
                                ? (userIsAdmin ? 'Saving...' : 'Submitting Request...')
                                : (userIsAdmin ? 'Save Changes (Direct)' : 'Submit Request to Admin')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditClubModal;
