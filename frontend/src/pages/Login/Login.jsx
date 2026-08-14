import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, AtSign, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import usePageTitle from '../../hooks/usePageTitle';

const Login = () => {
    usePageTitle('Sign In');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const data = {
            email: e.target.email.value,
            password: e.target.password.value,
        };

        try {
            await login(data);
            navigate('/dashboard');
        } catch (err) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Invalid email or password.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fbf9f4] flex flex-col items-center justify-center p-4 font-sans text-[#1b1c19]">
            {/* Top Branding Header */}
            <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[#1c1b1b] text-white flex items-center justify-center shadow-xs">
                    <Building2 className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-extrabold text-[#1b1c19] tracking-tight font-heading mt-3">
                    ClubHouse
                </h1>
                <p className="text-xs font-medium text-[#615e57] mt-1">
                    Central hub for university clubs
                </p>
            </div>

            {/* Login Card */}
            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-[#e4e2dd] w-full max-w-md">
                {error && (
                    <div data-testid="login-error-alert" className="bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb59f] px-4 py-3 rounded-2xl mb-6 text-xs font-semibold text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                            Institutional Email
                        </label>
                        <div className="relative flex items-center">
                            <AtSign className="w-4 h-4 text-[#615e57] absolute left-4 pointer-events-none" />
                            <input
                                type="email"
                                name="email"
                                required
                                data-testid="login-email-input"
                                aria-label="Institutional Email"
                                placeholder="hasan@student.nstu.edu.bd"
                                className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full pl-11 pr-4 py-3.5 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                            Password
                        </label>
                        <div className="relative flex items-center">
                            <Lock className="w-4 h-4 text-[#615e57] absolute left-4 pointer-events-none" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                required
                                data-testid="login-password-input"
                                aria-label="Password"
                                placeholder="••••••••"
                                className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full pl-11 pr-11 py-3.5 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                            />
                            <button
                                type="button"
                                data-testid="login-show-password-btn"
                                aria-label="Toggle password visibility"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 text-[#615e57] hover:text-[#1b1c19] transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="text-right mt-2">
                            <Link
                                to="/forgot-password"
                                data-testid="login-forgot-password-link"
                                className="text-[11px] font-semibold text-[#615e57] hover:text-[#1b1c19] transition-colors"
                            >
                                Forgot Password?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        data-testid="login-submit-btn"
                        className="w-full bg-[#1c1b1b] hover:bg-[#30312e] text-white font-bold py-3.5 rounded-full text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
                    >
                        <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                <p className="text-xs text-center text-[#615e57] pt-6 border-t border-[#f0eee9] mt-6">
                    Don't have an account?{' '}
                    <Link to="/register" data-testid="login-register-link" className="font-bold text-[#1b1c19] hover:underline">
                        Register for an account
                    </Link>
                </p>
            </div>

            {/* Bottom Footer Links */}
            <div className="mt-8 text-center text-[11px] text-[#858383] space-y-1.5">
                <p className="space-x-3">
                    <span className="hover:text-[#1b1c19] cursor-pointer">Terms of Service</span>
                    <span>•</span>
                    <span className="hover:text-[#1b1c19] cursor-pointer">Privacy Policy</span>
                    <span>•</span>
                    <span className="hover:text-[#1b1c19] cursor-pointer">Support</span>
                </p>
                <p>© 2026 ClubHouse . All systems normal.</p>
            </div>
        </div>
    );
};

export default Login;