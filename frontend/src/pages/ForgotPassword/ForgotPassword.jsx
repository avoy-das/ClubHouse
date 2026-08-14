import { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import { Building2, AtSign, ArrowRight, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import usePageTitle from '../../hooks/usePageTitle';

const ForgotPassword = () => {
    usePageTitle('Forgot Password');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setStatus('');
        setLoading(true);

        try {
            const res = await authService.forgotPassword(email);
            setStatus(res.message || 'Password reset link sent! Please check your email.');
        } catch (err) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else if (err.response?.data?.errors?.email?.[0]) {
                setError(err.response.data.errors.email[0]);
            } else {
                setError('Unable to send password reset link. Please verify your email.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fbf9f4] flex flex-col items-center justify-center p-4 font-sans text-[#1b1c19]">
            {/* Top Branding Header */}
            <div className="flex flex-col items-center text-center mb-6">
                <img src="/logo.png" alt="ClubHouse Logo" className="w-12 h-12 object-contain rounded-full shadow-xs" />
                <h1 className="text-3xl font-extrabold text-[#1b1c19] font-heading mt-3">
                    ClubHouse
                </h1>
                <p className="text-xs font-medium text-[#615e57] mt-1">
                    Password Recovery System
                </p>
            </div>

            {/* Forgot Password Card */}
            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-[#e4e2dd] w-full max-w-md">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#f0eee9]">
                    <div className="w-10 h-10 rounded-2xl bg-[#f5f3ee] text-[#1b1c19] flex items-center justify-center shrink-0">
                        <KeyRound className="w-5 h-5 text-[#615e57]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#1b1c19]">Reset Password</h2>
                        <p className="text-xs text-[#615e57]">Enter your account email to receive a password reset link.</p>
                    </div>
                </div>

                {error && (
                    <div data-testid="forgot-password-error-alert" className="bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb59f] px-4 py-3 rounded-2xl mb-6 text-xs font-semibold text-center">
                        {error}
                    </div>
                )}

                {status ? (
                    <div className="text-center py-4 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-[#1b1c19]">Check Your Inbox</h3>
                            <p className="text-xs text-[#615e57]">{status}</p>
                        </div>
                        <div className="pt-2">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-xs font-bold text-[#1c1b1b] hover:underline"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Return to Sign In
                            </Link>
                        </div>
                    </div>
                ) : (
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
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    data-testid="forgot-password-email-input"
                                    aria-label="Institutional Email"
                                    placeholder="hasan@student.nstu.edu.bd"
                                    className="w-full bg-[#f5f3ee] text-[#1b1c19] placeholder-[#a39f99] text-xs rounded-full pl-11 pr-4 py-3.5 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            data-testid="forgot-password-submit-btn"
                            className="w-full bg-[#1c1b1b] hover:bg-[#30312e] text-white font-bold py-3.5 rounded-full text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
                        >
                            <span>{loading ? 'Sending Reset Link...' : 'Send Reset Link'}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                )}

                <div className="pt-6 border-t border-[#f0eee9] mt-6 text-center">
                    <Link
                        to="/login"
                        data-testid="forgot-password-login-link"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#615e57] hover:text-[#1b1c19] transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
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

export default ForgotPassword;
