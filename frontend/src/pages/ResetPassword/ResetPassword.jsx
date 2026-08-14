import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import authService from '../../services/authService';
import { Building2, Lock, Eye, EyeOff, AtSign, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import usePageTitle from '../../hooks/usePageTitle';

const ResetPassword = () => {
    usePageTitle('Reset Password');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [token, setToken] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const tokenParam = searchParams.get('token');
        const emailParam = searchParams.get('email');

        if (tokenParam) setToken(tokenParam);
        if (emailParam) setEmail(emailParam);
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setStatus('');

        if (password !== passwordConfirmation) {
            setError('Password confirmation does not match.');
            return;
        }

        setLoading(true);

        try {
            const res = await authService.resetPassword({
                token,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });

            setStatus(res.message || 'Your password has been reset successfully!');
        } catch (err) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else if (err.response?.data?.errors) {
                const firstError = Object.values(err.response.data.errors)[0]?.[0];
                setError(firstError || 'Failed to reset password. Token may be invalid or expired.');
            } else {
                setError('Failed to reset password. Please check your details and try again.');
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
                    Set New Password
                </p>
            </div>

            {/* Reset Password Card */}
            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-[#e4e2dd] w-full max-w-md">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#f0eee9]">
                    <div className="w-10 h-10 rounded-2xl bg-[#f5f3ee] text-[#1b1c19] flex items-center justify-center shrink-0">
                        <KeyRound className="w-5 h-5 text-[#615e57]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#1b1c19]">Create New Password</h2>
                        <p className="text-xs text-[#615e57]">Please enter and confirm your new password below.</p>
                    </div>
                </div>

                {error && (
                    <div data-testid="reset-password-error-alert" className="bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb59f] px-4 py-3 rounded-2xl mb-6 text-xs font-semibold text-center">
                        {error}
                    </div>
                )}

                {status ? (
                    <div className="text-center py-4 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-[#1b1c19]">Password Reset Complete</h3>
                            <p className="text-xs text-[#615e57]">{status}</p>
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={() => navigate('/login')}
                                data-testid="reset-password-success-login-btn"
                                className="w-full bg-[#1c1b1b] hover:bg-[#30312e] text-white font-bold py-3.5 rounded-full text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                            >
                                <span>Proceed to Sign In</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                                Institutional Email
                            </label>
                            <div className="relative flex items-center">
                                <AtSign className="w-4 h-4 text-[#615e57] absolute left-4 pointer-events-none" />
                                <input
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    data-testid="reset-password-email-input"
                                    aria-label="Institutional Email"
                                    placeholder="hasan@student.nstu.edu.bd"
                                    className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full pl-11 pr-4 py-3.5 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                                New Password
                            </label>
                            <div className="relative flex items-center">
                                <Lock className="w-4 h-4 text-[#615e57] absolute left-4 pointer-events-none" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    data-testid="reset-password-input"
                                    aria-label="New Password"
                                    placeholder="••••••••"
                                    className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full pl-11 pr-11 py-3.5 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                                />
                                <button
                                    type="button"
                                    data-testid="reset-password-show-btn"
                                    aria-label="Toggle password visibility"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 text-[#615e57] hover:text-[#1b1c19] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-bold text-[#1b1c19] mb-1.5 font-heading">
                                Confirm New Password
                            </label>
                            <div className="relative flex items-center">
                                <Lock className="w-4 h-4 text-[#615e57] absolute left-4 pointer-events-none" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="password_confirmation"
                                    value={passwordConfirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    required
                                    minLength={8}
                                    data-testid="reset-password-confirm-input"
                                    aria-label="Confirm New Password"
                                    placeholder="••••••••"
                                    className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full pl-11 pr-11 py-3.5 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                                />
                                <button
                                    type="button"
                                    data-testid="reset-confirm-password-show-btn"
                                    aria-label="Toggle confirm password visibility"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 text-[#615e57] hover:text-[#1b1c19] transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !token}
                            data-testid="reset-password-submit-btn"
                            className="w-full bg-[#1c1b1b] hover:bg-[#30312e] text-white font-bold py-3.5 rounded-full text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
                        >
                            <span>{loading ? 'Resetting Password...' : 'Reset Password'}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                )}

                <div className="pt-6 border-t border-[#f0eee9] mt-6 text-center">
                    <Link
                        to="/login"
                        data-testid="reset-password-login-link"
                        className="text-xs font-bold text-[#615e57] hover:text-[#1b1c19] transition-colors"
                    >
                        Back to Sign In
                    </Link>
                </div>
            </div>

            {/* Bottom Footer Links */}
            <div className="mt-8 text-center text-[11px] text-[#858383] space-y-1.5">
                <p>© 2026 ClubHouse . All systems normal.</p>
            </div>
        </div>
    );
};

export default ResetPassword;
