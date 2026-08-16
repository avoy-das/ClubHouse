import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';
import compressImage from '../../utils/imageCompressor';
import { ArrowLeft, Building2, Image as ImageIcon } from 'lucide-react';

const categories = [
    'Academic', 'Technology', 'Cultural', 'Sports',
    'Arts & Media', 'Business & Entrepreneurship',
    'Community Service', 'Environment', 'Health & Wellness',
    'Recreation & Hobby', 'Other',
];

const CreateClub = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors]   = useState({});
    const [logoPreview, setLogoPreview]     = useState(null);
    const [bannerPreview, setBannerPreview] = useState(null);
    const [form, setForm]       = useState({
        name:          '',
        category:      '',
        description:   '',
        department:    '',
        contact_email: '',
        contact_phone: '',
        reason:        '',
        logo:          null,
        banner:        null,
        permission_document: null,
    });

    const handleChange = async e => {
        const { name, value, files } = e.target;
        if (files && files[0]) {
            const rawFile = files[0];

            if (name === 'logo') {
                const compressed = await compressImage(rawFile, { maxWidth: 400, maxHeight: 400, quality: 0.85 });
                setForm(prev => ({ ...prev, logo: compressed }));
                setLogoPreview(URL.createObjectURL(compressed));
            } else if (name === 'banner') {
                const compressed = await compressImage(rawFile, { maxWidth: 1200, maxHeight: 600, quality: 0.82 });
                setForm(prev => ({ ...prev, banner: compressed }));
                setBannerPreview(URL.createObjectURL(compressed));
            } else {
                setForm(prev => ({ ...prev, [name]: rawFile }));
            }
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setErrors({});

        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => {
            if (value !== null && value !== '') {
                formData.append(key, value);
            }
        });

        try {
            await clubService.createClub(formData);
            navigate('/clubs');
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {});
            } else {
                setErrors({ general: 'Something went wrong. Please try again.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const field = (label, name, type = 'text', placeholder = '', isOptional = false) => (
        <div>
            <label className="block text-sm font-medium text-[#0b1c30] mb-1">
                {label} {isOptional && <span className="text-slate-400 font-normal">(optional)</span>}
            </label>
            <input
                type={type}
                name={name}
                value={type === 'file' ? undefined : form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] bg-white"
            />
            {errors[name] && (
                <p className="text-red-500 text-xs mt-1">{errors[name][0]}</p>
            )}
        </div>
    );

    return (
        <MainLayout>
            <button
                onClick={() => navigate('/clubs')}
                className="text-sm font-medium text-slate-500 hover:text-[#0b1c30] mb-6 flex items-center gap-1.5 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Clubs
            </button>

            <div className="max-w-2xl">
                <h1 className="text-2xl font-bold text-[#0b1c30] mb-1 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-600" /> Request a New Club
                </h1>
                <p className="text-slate-500 text-sm mb-8">
                    Fill in the details below. Your request will be reviewed by an admin.
                </p>

                {errors.general && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {errors.general}
                    </div>
                )}

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">

                    {field('Club Name', 'name', 'text', 'e.g. Robotics Club')}

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-[#0b1c30] mb-1">
                            Category
                        </label>
                        <select
                            name="category"
                            value={form.category}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] bg-white"
                        >
                            <option value="">Select a category</option>
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        {errors.category && (
                            <p className="text-red-500 text-xs mt-1">{errors.category[0]}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-[#0b1c30] mb-1">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="What is this club about?"
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] resize-none bg-white"
                        />
                        {errors.description && (
                            <p className="text-red-500 text-xs mt-1">{errors.description[0]}</p>
                        )}
                    </div>

                    {field('Department', 'department', 'text', 'e.g. Computer Science', true)}
                    {field('Contact Email', 'contact_email', 'email', 'e.g. club@university.edu')}
                    {field('Contact Phone', 'contact_phone', 'text', 'e.g. 01700000000', true)}

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-[#0b1c30] mb-1">
                            Reason for Creation
                        </label>
                        <textarea
                            name="reason"
                            value={form.reason}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Why should this club be created?"
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] resize-none bg-white"
                        />
                        {errors.reason && (
                            <p className="text-red-500 text-xs mt-1">{errors.reason[0]}</p>
                        )}
                    </div>

                    {/* Permission Attachment from Authority */}
                    <div>
                        <label className="block text-sm font-medium text-[#0b1c30] mb-1">
                            Authority Approval / Permission Attachment <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <p className="text-xs text-slate-500 mb-2">Upload official permission letter or approval document from university authority (PDF, Image, or Word document).</p>
                        <input
                            type="file"
                            name="permission_document"
                            accept="application/pdf, image/png, image/jpeg, .doc, .docx"
                            onChange={handleChange}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[#f8f9ff] file:text-[#0b1c30] hover:file:bg-slate-200"
                        />
                        {errors.permission_document && (
                            <p className="text-red-500 text-xs mt-1">{errors.permission_document[0]}</p>
                        )}
                    </div>

                    {/* Logo & Banner Section */}
                    <div className="pt-2 border-t border-slate-100 space-y-4">
                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-[#0b1c30] mb-1">
                                Club Logo <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <div className="flex items-center gap-4 mt-1">
                                {logoPreview ? (
                                    <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0 bg-slate-50">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    name="logo"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleChange}
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[#f8f9ff] file:text-[#0b1c30] hover:file:bg-slate-200"
                                />
                            </div>
                            {errors.logo && (
                                <p className="text-red-500 text-xs mt-1">{errors.logo[0]}</p>
                            )}
                        </div>

                        {/* Banner Upload */}
                        <div>
                            <label className="block text-sm font-medium text-[#0b1c30] mb-1">
                                Club Banner Image <span className="text-slate-400 font-normal">(optional - 3:1 aspect ratio recommended)</span>
                            </label>
                            {bannerPreview && (
                                <div className="mb-2 h-24 w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-50 relative">
                                    <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    name="banner"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleChange}
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[#f8f9ff] file:text-[#0b1c30] hover:file:bg-slate-200"
                                />
                            </div>
                            {errors.banner && (
                                <p className="text-red-500 text-xs mt-1">{errors.banner[0]}</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-3 bg-[#2563eb] hover:bg-[#0051d5] text-white text-sm font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </div>
        </MainLayout>
    );
};

export default CreateClub;