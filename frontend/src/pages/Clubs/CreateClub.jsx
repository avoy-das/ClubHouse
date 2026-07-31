import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';

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
    const [form, setForm]       = useState({
        name:          '',
        category:      '',
        description:   '',
        department:    '',
        contact_email: '',
        contact_phone: '',
        reason:        '',
        logo:          null,
    });

    const handleChange = e => {
        const { name, value, files } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: files ? files[0] : value,
        }));
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

    const field = (label, name, type = 'text', placeholder = '') => (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {label}
            </label>
            <input
                type={type}
                name={name}
                value={type === 'file' ? undefined : form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                className="text-sm text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-1"
            >
                ← Back to Clubs
            </button>

            <div className="max-w-2xl">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Request a New Club</h1>
                <p className="text-slate-500 text-sm mb-8">
                    Fill in the details below. Your request will be reviewed by an admin.
                </p>

                {errors.general && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {errors.general}
                    </div>
                )}

                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">

                    {field('Club Name', 'name', 'text', 'e.g. Robotics Club')}

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Category
                        </label>
                        <select
                            name="category"
                            value={form.category}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="What is this club about?"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                        />
                        {errors.description && (
                            <p className="text-red-500 text-xs mt-1">{errors.description[0]}</p>
                        )}
                    </div>

                    {field('Department', 'department', 'text', 'e.g. Computer Science')}
                    {field('Contact Email', 'contact_email', 'email', 'e.g. club@university.edu')}
                    {field('Contact Phone', 'contact_phone', 'text', 'e.g. 01700000000')}

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Reason for Creation
                        </label>
                        <textarea
                            name="reason"
                            value={form.reason}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Why should this club be created?"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                        />
                        {errors.reason && (
                            <p className="text-red-500 text-xs mt-1">{errors.reason[0]}</p>
                        )}
                    </div>

                    {/* Logo */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Club Logo <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="file"
                            name="logo"
                            accept="image/png, image/jpeg"
                            onChange={handleChange}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        />
                        {errors.logo && (
                            <p className="text-red-500 text-xs mt-1">{errors.logo[0]}</p>
                        )}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </div>
        </MainLayout>
    );
};

export default CreateClub;