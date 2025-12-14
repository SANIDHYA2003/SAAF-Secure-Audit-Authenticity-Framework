import React, { useState } from 'react';
import AuthService from '../services/AuthService';
import { Mail, Lock, Loader, Package, LogIn, ArrowLeft, Phone, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './AuthPages.css';

export default function LoginPage({ onSuccess, onSwitchToRegister, onBack }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showOTP, setShowOTP] = useState(false);
    const [otp, setOtp] = useState('');
    const [sentOTP, setSentOTP] = useState('');

    const [form, setForm] = useState({
        emailOrPhone: '',
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await AuthService.login(form.emailOrPhone, form.password);

            // Check if 2FA is enabled (simulated)
            if (result.user?.twoFA?.enabled) {
                const sentCode = await AuthService.sendOTP(result.user.profile.phone, 'login');
                setSentOTP(sentCode);
                setShowOTP(true);
            } else {
                onSuccess?.(result);
            }
        } catch (err) {
            setError(err.message || 'Invalid credentials. Please try again.');
        }
        setLoading(false);
    };

    const handleOTPVerify = async () => {
        setLoading(true);
        try {
            await AuthService.verifyOTP(form.emailOrPhone, otp);
            const result = await AuthService.login(form.emailOrPhone, form.password);
            onSuccess?.(result);
        } catch (err) {
            setError(err.message || 'Invalid OTP. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            {/* Animated Background */}
            <div className="auth-bg">
                <div className="auth-bg-gradient auth-bg-gradient-1"></div>
                <div className="auth-bg-gradient auth-bg-gradient-2"></div>
                <div className="auth-bg-gradient auth-bg-gradient-3"></div>
            </div>

            {/* Back Button */}
            <button onClick={onBack} className="auth-back-btn">
                <ArrowLeft size={20} />
                <span>Back</span>
            </button>

            {/* Main Content */}
            <div className="auth-container">
                <div className="auth-card">
                    {/* Logo */}
                    <div className="auth-logo">
                        <div className="auth-logo-icon">
                            <Package size={32} />
                        </div>
                        <div className="auth-logo-text">
                            <h1 className="auth-logo-title">VerifyChain</h1>
                            <p className="auth-logo-subtitle">Enterprise Platform</p>
                        </div>
                    </div>

                    <div className="auth-content">
                        {!showOTP ? (
                            <>
                                {/* Header */}
                                <div className="auth-header">
                                    <h2 className="auth-title">Welcome Back</h2>
                                    <p className="auth-subtitle">Sign in to access your dashboard</p>
                                </div>

                                {/* Error Alert */}
                                {error && (
                                    <div className="alert alert-error">
                                        <AlertCircle className="alert-icon" size={18} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Login Form */}
                                <form onSubmit={handleSubmit} className="auth-form">
                                    {/* Email/Phone Input */}
                                    <div className="input-group">
                                        <label className="input-label">Email or Phone</label>
                                        <div className="input-wrapper">
                                            <Mail className="input-icon" size={18} />
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="admin@company.com or +91..."
                                                value={form.emailOrPhone}
                                                onChange={e => setForm({ ...form, emailOrPhone: e.target.value })}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* Password Input */}
                                    <div className="input-group">
                                        <label className="input-label">Password</label>
                                        <div className="input-wrapper">
                                            <Lock className="input-icon" size={18} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="input input-with-action"
                                                placeholder="Enter your password"
                                                value={form.password}
                                                onChange={e => setForm({ ...form, password: e.target.value })}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="input-action-btn"
                                                onClick={() => setShowPassword(!showPassword)}
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Forgot Password */}
                                    <div className="auth-forgot">
                                        <button type="button" className="auth-forgot-btn">
                                            Forgot password?
                                        </button>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn btn-primary btn-lg auth-submit-btn"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader className="animate-spin" size={20} />
                                                <span>Signing in...</span>
                                            </>
                                        ) : (
                                            <>
                                                <LogIn size={20} />
                                                <span>Sign In</span>
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* Switch to Register */}
                                <div className="auth-switch">
                                    <span className="auth-switch-text">Don't have an account?</span>
                                    <button onClick={onSwitchToRegister} className="auth-switch-btn">
                                        Register Organization
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="auth-divider">
                                    <span>or</span>
                                </div>

                                {/* Demo Mode */}
                                <button
                                    type="button"
                                    onClick={() => onSuccess?.('demo')}
                                    className="btn btn-ghost btn-lg"
                                >
                                    Continue with Demo Mode
                                </button>
                            </>
                        ) : (
                            <>
                                {/* OTP Verification */}
                                <div className="auth-header">
                                    <div className="auth-otp-icon">
                                        <Phone size={32} />
                                    </div>
                                    <h2 className="auth-title">Verify OTP</h2>
                                    <p className="auth-subtitle">Enter the verification code sent to your phone</p>
                                </div>

                                {/* Error Alert */}
                                {error && (
                                    <div className="alert alert-error">
                                        <AlertCircle className="alert-icon" size={18} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Dev OTP Display */}
                                {sentOTP && (
                                    <div className="alert alert-warning">
                                        <span>[DEV] OTP: <strong className="font-mono">{sentOTP}</strong></span>
                                    </div>
                                )}

                                {/* OTP Input */}
                                <div className="auth-form">
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            className="input input-otp"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={otp}
                                            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                            autoFocus
                                        />
                                    </div>

                                    <button
                                        onClick={handleOTPVerify}
                                        disabled={loading || otp.length !== 6}
                                        className="btn btn-primary btn-lg auth-submit-btn"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader className="animate-spin" size={20} />
                                                <span>Verifying...</span>
                                            </>
                                        ) : (
                                            <span>Verify OTP</span>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowOTP(false)}
                                        className="btn btn-ghost"
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="auth-footer">
                    <p>© 2024 VerifyChain. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
