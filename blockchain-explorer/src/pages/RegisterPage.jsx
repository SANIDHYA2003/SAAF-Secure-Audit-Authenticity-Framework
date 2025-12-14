import React, { useState, useEffect } from 'react';
import AuthService from '../services/AuthService';
import {
    Building2, Mail, Lock, Phone, MapPin, FileText, Loader, ArrowRight,
    ArrowLeft, Package, Check, Eye, EyeOff, AlertCircle, Factory, Store, Truck,
    BadgeCheck, Warehouse, ShoppingCart, FileCheck, CreditCard, ClipboardCheck,
    CheckCircle, XCircle
} from 'lucide-react';
import './AuthPages.css';

export default function RegisterPage({ selectedRole, onSuccess, onSwitchToLogin, onBack }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordMatch, setPasswordMatch] = useState(null);

    const [form, setForm] = useState({
        // Step 1: Account
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        // Step 2: Organization
        name: '',
        handle: '',
        gst: '',
        pan: '',
        orgType: selectedRole || 'manufacturer',
        address: '',
        // Dynamic fields
        // Manufacturer
        factoryLicense: '',
        productionCapacity: '',
        productCategories: '',
        // Transporter
        transportLicense: '',
        vehicleFleet: '',
        insuranceNumber: '',
        // Distributor
        warehouseArea: '',
        storageCapacity: '',
        distributionRegions: '',
        // Retailer
        storeLicense: '',
        storeType: '',
        salesArea: ''
    });

    const [verificationOTP, setVerificationOTP] = useState('');
    const [sentOTP, setSentOTP] = useState('');

    const orgTypes = [
        {
            value: 'manufacturer',
            label: 'Manufacturer',
            icon: Factory,
            description: 'Product creation & batch management'
        },
        {
            value: 'distributor',
            label: 'Distributor',
            icon: Building2,
            description: 'Wholesale & inventory management'
        },
        {
            value: 'transporter',
            label: 'Transporter',
            icon: Truck,
            description: 'Logistics & delivery services'
        },
        {
            value: 'retailer',
            label: 'Retailer',
            icon: Store,
            description: 'Retail sales & customer service'
        }
    ];

    // Real-time password match validation
    useEffect(() => {
        if (form.confirmPassword) {
            setPasswordMatch(form.password === form.confirmPassword);
        } else {
            setPasswordMatch(null);
        }
    }, [form.password, form.confirmPassword]);

    const handleNext = async () => {
        setError('');

        if (step === 1) {
            if (!form.email || !form.password || !form.phone) {
                setError('Please fill all required fields');
                return;
            }
            if (form.password !== form.confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (form.password.length < 6) {
                setError('Password must be at least 6 characters');
                return;
            }
            const phoneRegex = /^[\d\s\+\-\(\)]+$/;
            if (!phoneRegex.test(form.phone)) {
                setError('Please enter a valid phone number');
                return;
            }
            setStep(2);
            return;
        }

        if (step === 2) {
            if (!form.name) {
                setError('Organization name is required');
                return;
            }
            if (!form.handle || form.handle.length < 3) {
                setError('Unique Username (Handle) is required (min 3 chars)');
                return;
            }
            if (form.name.length < 3) {
                setError('Organization name must be at least 3 characters');
                return;
            }

            setLoading(true);
            try {
                const payload = {
                    name: form.name,
                    handle: form.handle,
                    type: form.orgType,
                    email: form.email,
                    phone: form.phone,
                    password: form.password,
                    gst: form.gst,
                    pan: form.pan,
                    address: form.address
                };

                // Add dynamic fields based on org type
                if (form.orgType === 'manufacturer') {
                    payload.meta = {
                        factoryLicense: form.factoryLicense,
                        productionCapacity: form.productionCapacity,
                        productCategories: form.productCategories
                    };
                } else if (form.orgType === 'transporter') {
                    payload.meta = {
                        transportLicense: form.transportLicense,
                        vehicleFleet: form.vehicleFleet,
                        insuranceNumber: form.insuranceNumber
                    };
                } else if (form.orgType === 'distributor') {
                    payload.meta = {
                        warehouseArea: form.warehouseArea,
                        storageCapacity: form.storageCapacity,
                        distributionRegions: form.distributionRegions
                    };
                } else if (form.orgType === 'retailer') {
                    payload.meta = {
                        storeLicense: form.storeLicense,
                        storeType: form.storeType,
                        salesArea: form.salesArea
                    };
                }

                const result = await AuthService.registerOrg(payload);

                setSentOTP(result.otp);
                setStep(3);
            } catch (err) {
                setError(err.message || 'Registration failed. Please try again.');
            }
            setLoading(false);
            return;
        }

        if (step === 3) {
            if (verificationOTP.length !== 6) {
                setError('Please enter a valid 6-digit OTP');
                return;
            }

            setLoading(true);
            try {
                await AuthService.verifyOTP(form.phone, verificationOTP);
                const loginResult = await AuthService.login(form.email, form.password);
                onSuccess?.(loginResult);
            } catch (err) {
                setError(err.message || 'Invalid OTP. Please try again.');
            }
            setLoading(false);
        }
    };

    // Render dynamic fields based on organization type
    const renderDynamicFields = () => {
        switch (form.orgType) {
            case 'manufacturer':
                return (
                    <>
                        <div className="input-group">
                            <label className="input-label">Factory License Number</label>
                            <div className="input-wrapper">
                                <FileCheck className="input-icon" size={18} />
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="FL/2024/12345"
                                    value={form.factoryLicense}
                                    onChange={e => setForm({ ...form, factoryLicense: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Production Capacity</label>
                            <div className="input-wrapper">
                                <Package className="input-icon" size={18} />
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="10,000 units/month"
                                    value={form.productionCapacity}
                                    onChange={e => setForm({ ...form, productionCapacity: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="input-group auth-form-col-full">
                            <label className="input-label">Product Categories</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Electronics, Pharmaceuticals, FMCG"
                                value={form.productCategories}
                                onChange={e => setForm({ ...form, productCategories: e.target.value })}
                            />
                        </div>
                    </>
                );

            case 'transporter':
                return (
                    <>
                        <div className="input-group">
                            <label className="input-label required">Transport License</label>
                            <div className="input-wrapper">
                                <ClipboardCheck className="input-icon" size={18} />
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="TL/2024/ABC123"
                                    value={form.transportLicense}
                                    onChange={e => setForm({ ...form, transportLicense: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Vehicle Fleet Size</label>
                            <div className="input-wrapper">
                                <Truck className="input-icon" size={18} />
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="25 vehicles"
                                    value={form.vehicleFleet}
                                    onChange={e => setForm({ ...form, vehicleFleet: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="input-group auth-form-col-full">
                            <label className="input-label">Insurance Policy Number</label>
                            <div className="input-wrapper">
                                <CreditCard className="input-icon" size={18} />
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="INS/2024/123456789"
                                    value={form.insuranceNumber}
                                    onChange={e => setForm({ ...form, insuranceNumber: e.target.value })}
                                />
                            </div>
                        </div>
                    </>
                );

            case 'distributor':
                return (
                    <>
                        <div className="input-group">
                            <label className="input-label">Warehouse Area (sq ft)</label>
                            <div className="input-wrapper">
                                <Warehouse className="input-icon" size={18} />
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="50,000"
                                    value={form.warehouseArea}
                                    onChange={e => setForm({ ...form, warehouseArea: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Storage Capacity (units)</label>
                            <div className="input-wrapper">
                                <Package className="input-icon" size={18} />
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="100,000"
                                    value={form.storageCapacity}
                                    onChange={e => setForm({ ...form, storageCapacity: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="input-group auth-form-col-full">
                            <label className="input-label">Distribution Regions</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="North India, West India"
                                value={form.distributionRegions}
                                onChange={e => setForm({ ...form, distributionRegions: e.target.value })}
                            />
                        </div>
                    </>
                );

            case 'retailer':
                return (
                    <>
                        <div className="input-group">
                            <label className="input-label">Store License Number</label>
                            <div className="input-wrapper">
                                <FileCheck className="input-icon" size={18} />
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="SL/2024/12345"
                                    value={form.storeLicense}
                                    onChange={e => setForm({ ...form, storeLicense: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Store Type</label>
                            <select
                                className="input"
                                value={form.storeType}
                                onChange={e => setForm({ ...form, storeType: e.target.value })}
                            >
                                <option value="">Select Type</option>
                                <option value="supermarket">Supermarket</option>
                                <option value="pharmacy">Pharmacy</option>
                                <option value="electronics">Electronics Store</option>
                                <option value="general">General Store</option>
                                <option value="specialty">Specialty Store</option>
                            </select>
                        </div>
                        <div className="input-group auth-form-col-full">
                            <label className="input-label">Sales Floor Area (sq ft)</label>
                            <div className="input-wrapper">
                                <ShoppingCart className="input-icon" size={18} />
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="5,000"
                                    value={form.salesArea}
                                    onChange={e => setForm({ ...form, salesArea: e.target.value })}
                                />
                            </div>
                        </div>
                    </>
                );

            default:
                return null;
        }
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
            <button
                onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
                className="auth-back-btn"
            >
                <ArrowLeft size={20} />
                <span>Back</span>
            </button>

            {/* Main Content */}
            <div className="auth-container">
                <div className="auth-card auth-card-wide">
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
                        {/* Header */}
                        <div className="auth-header">
                            <h2 className="auth-title">
                                {step === 1 && 'Create Your Account'}
                                {step === 2 && 'Organization Details'}
                                {step === 3 && 'Verify Your Phone'}
                            </h2>
                            <p className="auth-subtitle">
                                {step === 1 && 'Start securing your supply chain today'}
                                {step === 2 && 'Tell us about your organization'}
                                {step === 3 && 'Almost there! Just verify your phone number'}
                            </p>
                        </div>

                        {/* Progress Indicator */}
                        <div className="auth-progress">
                            {[1, 2, 3].map(s => (
                                <div
                                    key={s}
                                    className={`auth-progress-step ${step >= s ? 'auth-progress-step-active' : ''}`}
                                >
                                    <div className="auth-progress-dot">
                                        {step > s ? <Check size={14} /> : <span>{s}</span>}
                                    </div>
                                    <span className="auth-progress-label">
                                        {s === 1 && 'Account'}
                                        {s === 2 && 'Organization'}
                                        {s === 3 && 'Verify'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle className="alert-icon" size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                            {/* Step 1: Account Details */}
                            {step === 1 && (
                                <div className="auth-form-grid">
                                    <div className="input-group auth-form-col-full">
                                        <label className="input-label required">Email Address</label>
                                        <div className="input-wrapper">
                                            <Mail className="input-icon" size={18} />
                                            <input
                                                type="email"
                                                className="input"
                                                placeholder="admin@yourcompany.com"
                                                value={form.email}
                                                onChange={e => setForm({ ...form, email: e.target.value })}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="input-group auth-form-col-full">
                                        <label className="input-label required">Phone Number</label>
                                        <div className="input-wrapper">
                                            <Phone className="input-icon" size={18} />
                                            <input
                                                type="tel"
                                                className="input"
                                                placeholder="+91 98765 43210"
                                                value={form.phone}
                                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label required">Password</label>
                                        <div className="input-wrapper">
                                            <Lock className="input-icon" size={18} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="input input-with-action"
                                                placeholder="Minimum 6 characters"
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

                                    <div className="input-group">
                                        <label className="input-label required">Confirm Password</label>
                                        <div className="input-wrapper">
                                            <Lock className="input-icon" size={18} />
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                className={`input input-with-action ${passwordMatch === false ? 'error' : ''}`}
                                                placeholder="Re-enter password"
                                                value={form.confirmPassword}
                                                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="input-action-btn"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                            {passwordMatch !== null && (
                                                <div className="input-validation-icon">
                                                    {passwordMatch ?
                                                        <CheckCircle size={18} className="text-success" /> :
                                                        <XCircle size={18} className="text-error" />
                                                    }
                                                </div>
                                            )}
                                        </div>
                                        {passwordMatch === false && (
                                            <span className="input-error-text">Passwords do not match</span>
                                        )}
                                        {passwordMatch === true && (
                                            <span className="input-success-text">Passwords match!</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Organization Details */}
                            {step === 2 && (
                                <div className="auth-form-grid">
                                    {/* Organization Type Selector */}
                                    <div className="input-group auth-form-col-full">
                                        <label className="input-label">Organization Type</label>
                                        <div className="auth-org-type-grid">
                                            {orgTypes.map(type => {
                                                const Icon = type.icon;
                                                return (
                                                    <button
                                                        key={type.value}
                                                        type="button"
                                                        onClick={() => setForm({ ...form, orgType: type.value })}
                                                        className={`auth-org-type-card ${form.orgType === type.value ? 'auth-org-type-card-active' : ''}`}
                                                    >
                                                        <Icon size={24} />
                                                        <div className="auth-org-type-content">
                                                            <div className="auth-org-type-title">{type.label}</div>
                                                            <div className="auth-org-type-desc">{type.description}</div>
                                                        </div>
                                                        {form.orgType === type.value && (
                                                            <div className="auth-org-type-check">
                                                                <Check size={16} />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="input-group auth-form-col-full">
                                        <label className="input-label required">Organization Name</label>
                                        <div className="input-wrapper">
                                            <Building2 className="input-icon" size={18} />
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="ABC Enterprises Pvt Ltd"
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="input-group auth-form-col-full">
                                        <label className="input-label required">Unique Username (Handle)</label>
                                        <div className="input-wrapper">
                                            <span className="input-icon text-gray-500 text-sm font-bold flex items-center justify-center w-10">@</span>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="pharmocorp_global"
                                                value={form.handle}
                                                onChange={e => setForm({ ...form, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '') })}
                                                required
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1">This will be your unique ID for others to find you.</span>
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">GST Number</label>
                                        <input
                                            type="text"
                                            className="input uppercase"
                                            placeholder="22AAAAA0000A1Z5"
                                            value={form.gst}
                                            onChange={e => setForm({ ...form, gst: e.target.value.toUpperCase() })}
                                            maxLength={15}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">PAN Number</label>
                                        <input
                                            type="text"
                                            className="input uppercase"
                                            placeholder="ABCDE1234F"
                                            value={form.pan}
                                            onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                                            maxLength={10}
                                        />
                                    </div>

                                    {/* Dynamic Fields Based on Organization Type */}
                                    {renderDynamicFields()}

                                    <div className="input-group auth-form-col-full">
                                        <label className="input-label">Business Address</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={18} style={{ top: '1rem' }} />
                                            <textarea
                                                className="textarea"
                                                rows="3"
                                                placeholder="123 Industrial Area, City, State - 400001"
                                                value={form.address}
                                                onChange={e => setForm({ ...form, address: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: OTP Verification */}
                            {step === 3 && (
                                <div className="auth-otp-container">
                                    <div className="auth-otp-icon">
                                        <BadgeCheck size={48} />
                                    </div>
                                    <p className="auth-otp-message">
                                        We've sent a 6-digit verification code to
                                        <strong className="auth-otp-phone">{form.phone}</strong>
                                    </p>

                                    {/* Dev OTP Display */}
                                    {sentOTP && (
                                        <div className="alert alert-warning">
                                            <span>[DEV] OTP: <strong className="font-mono">{sentOTP}</strong></span>
                                        </div>
                                    )}

                                    <div className="input-group">
                                        <input
                                            type="text"
                                            className="input input-otp"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={verificationOTP}
                                            onChange={e => setVerificationOTP(e.target.value.replace(/\D/g, ''))}
                                            autoFocus
                                        />
                                    </div>

                                    <button type="button" className="auth-resend-btn">
                                        Didn't receive code? <span>Resend OTP</span>
                                    </button>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || (step === 1 && passwordMatch === false)}
                                className="btn btn-primary btn-lg auth-submit-btn"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        <span>Processing...</span>
                                    </>
                                ) : step === 3 ? (
                                    <>
                                        <Check size={20} />
                                        <span>Verify & Complete</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Continue</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Switch to Login */}
                        <div className="auth-switch">
                            <span className="auth-switch-text">Already have an account?</span>
                            <button onClick={onSwitchToLogin} className="auth-switch-btn">
                                Sign In
                            </button>
                        </div>
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
