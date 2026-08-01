import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';
import { Users, ArrowRight, Eye, EyeOff } from 'lucide-react';

const Register = () => {
    const navigate             = useNavigate();
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const data = {
            name:                  e.target.name.value,
            student_id:            e.target.student_id.value,
            email:                 e.target.email.value,
            password:              e.target.password.value,
            password_confirmation: e.target.password_confirmation.value,
            department:            e.target.department.value,
            phone:                 e.target.phone.value,
        };

        try {
            await authService.register(data);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fbf9f4] flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-[#1b1c19]">
            {/* Card Container */}
            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-[#e4e2dd] w-full max-w-2xl my-6">
                
                {/* Header Icon & Title */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-12 h-12 rounded-full bg-[#1c1b1b] text-white flex items-center justify-center shadow-xs mb-4">
                        <Users className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1b1c19] tracking-tight font-heading">
                        Create ClubHouse Account
                    </h1>
                    <p className="text-xs text-[#615e57] max-w-md mx-auto mt-2 leading-relaxed font-sans">
                        Join your university's premier community platform. Connect with clubs, manage events, and grow your network.
                    </p>
                </div>

                {error && (
                    <div className="bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb59f] px-4 py-3 rounded-2xl mb-6 text-xs font-semibold text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="Alex Rivera"
                                className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full px-4 py-3 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                            />
                        </div>

                        {/* Student ID */}
                        <div>
                            <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                                Student ID
                            </label>
                            <input
                                type="text"
                                name="student_id"
                                required
                                placeholder="ID-2024-0000"
                                className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full px-4 py-3 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                            />
                        </div>

                        {/* Department */}
                        <div>
                            <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                                Department
                            </label>
                            <input
                                type="text"
                                name="department"
                                placeholder="Computer Science & Engineering"
                                className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full px-4 py-3 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                            />
                        </div>

                        {/* Email Address */}
                        <div>
                            <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="alex.rivera@university.edu"
                                className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full px-4 py-3 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                                Password
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full pl-4 pr-10 py-3 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 text-[#615e57] hover:text-[#1b1c19] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                name="password_confirmation"
                                required
                                placeholder="••••••••"
                                className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full px-4 py-3 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* Phone (Optional) */}
                    <div>
                        <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                            Phone Number <span className="text-[#858383] font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            name="phone"
                            placeholder="+1 (555) 019-2834"
                            className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full px-4 py-3 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                        />
                    </div>

                    {/* Checkbox agreement */}
                    <div className="pt-2">
                        <label className="flex items-start gap-2.5 text-xs text-[#615e57] cursor-pointer">
                            <input
                                type="checkbox"
                                required
                                className="mt-0.5 rounded-md border-[#cbc6bd] text-[#1c1b1b] focus:ring-0 cursor-pointer"
                            />
                            <span className="leading-relaxed">
                                I agree to the <span className="font-bold text-[#1b1c19]">Terms of Service</span> and{' '}
                                <span className="font-bold text-[#1b1c19]">Privacy Policy</span>. I understand my data will be used to personalize my campus experience.
                            </span>
                        </label>
                    </div>

                    {/* Primary Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1c1b1b] hover:bg-[#30312e] text-white font-bold py-3.5 rounded-full text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-4"
                    >
                        <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                {/* Card Footer Link */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-[#f0eee9] mt-6">
                    <span className="text-xs text-[#615e57]">Already part of the community?</span>
                    <Link
                        to="/login"
                        className="px-4 py-2 bg-[#f5f3ee] hover:bg-[#e8e2d9] text-[#1b1c19] border border-[#e4e2dd] rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                        <span>Back to Login</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;