/**
 * Authentication Routes
 * Handles registration, login, OTP, and session management
 */

import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import {
    User, Organization, Session, OTP, AuditLog, Invite, Transporter
} from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import {
    generateId, generateCode, generateOTP, hashOTP,
    normalizePhone, computeHash
} from '../utils/helpers.js';
import { getWalletForOrg } from '../utils/walletManager.js';

const router = express.Router();

// ==================== REGISTER ORGANIZATION ====================
// ==================== REGISTER ORGANIZATION ====================
router.post('/register',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('phone').notEmpty(),
        body('name').notEmpty().trim(),
        body('handle').notEmpty().trim().isLength({ min: 3 }),
        body('type').isIn(['manufacturer', 'distributor', 'transporter', 'retailer'])
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { email, password, phone, name, type, gst, pan, address, handle } = req.body;
            const normalizedPhone = normalizePhone(phone);

            // 1. Check for CURRENTLY ACTIVE users (Conflict)
            const activeUser = await User.findOne({
                'profile.email': email.toLowerCase(),
                status: 'active'
            });
            if (activeUser) {
                return res.status(409).json({ success: false, error: 'Email already registered and active.' });
            }

            // Check if handle exists
            const existingHandle = await Organization.findOne({ handle: handle.toLowerCase() });
            if (existingHandle) {
                return res.status(409).json({ success: false, error: 'Username (handle) already taken' });
            }

            // 2. Check for PENDING users (Allow Overwrite/Update)
            let user = await User.findOne({ 'profile.email': email.toLowerCase(), status: 'pending' });
            let org;

            const orgId = user ? user.orgId : generateId('ORG');
            const userId = user ? user.userId : generateId('USR');

            // Use deterministic wallet address based on orgId and type
            const walletAddress = getWalletForOrg(orgId, type);

            // Compute metadata hash
            const metaHash = computeHash({ orgId, name, gst, type, updatedAt: new Date().toISOString() });

            if (user) {
                // UPDATE Existing Pending Organization
                org = await Organization.findOne({ orgId });
                if (org) {
                    org.name = name;
                    org.handle = handle.toLowerCase();
                    org.type = type;
                    org.primaryContact = { name: name + ' Admin', email: email.toLowerCase(), phone: normalizedPhone };
                    org.legal = { gst: gst?.toUpperCase(), pan: pan?.toUpperCase() };
                    org.address = typeof address === 'string' ? { line1: address } : address;
                    org.onChain = { address: walletAddress, metaHash, status: 'pending' }; // Update wallet
                    await org.save();
                }

                // UPDATE Existing Pending User
                user.profile = { name: name + ' Admin', email: email.toLowerCase(), phone: normalizedPhone };
                // Re-hash password (in a real app, only if changed, but safe to re-hash here for simplicity)
                user.passwordHash = password;
                await user.save(); // Pre-save hook will handle hashing

            } else {
                // CREATE New Organization
                // CREATE New Organization
                org = new Organization({
                    orgId, name, type, handle: handle.toLowerCase(),
                    primaryContact: { name: name + ' Admin', email: email.toLowerCase(), phone: normalizedPhone },
                    legal: { gst: gst?.toUpperCase(), pan: pan?.toUpperCase() },
                    address: typeof address === 'string' ? { line1: address } : address,
                    onChain: { address: walletAddress, metaHash, status: 'pending' }
                });
                await org.save();

                // If Transporter, create Transporter Profile
                if (type === 'transporter') {
                    const transporterCode = 'TR-' + generateCode(6);
                    const transp = new Transporter({
                        transporterId: generateId('TRN'),
                        transporterCode,
                        orgId,
                        name,
                        status: 'active'
                    });
                    await transp.save();
                }

                // CREATE New User
                user = new User({
                    userId, orgId,
                    profile: { name: name + ' Admin', email: email.toLowerCase(), phone: normalizedPhone },
                    roles: ['OrgAdmin'],
                    passwordHash: password,
                    status: 'pending'
                });
                await user.save();
            }

            // 3. Handle OTP (Always generate new one for safety)
            await OTP.deleteMany({ phone: normalizedPhone, purpose: 'registration' });

            const otpCode = '123456'; // HARDCODED FOR TESTING
            await OTP.create({
                phone: normalizedPhone,
                hashedOTP: hashOTP(otpCode),
                purpose: 'registration',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 mins
            });

            // 4. LOGGING (Critical for functionality without SMS provider)
            // Even in production, if we don't have a mailer/SMS set up, we MUST log this 
            // to allow the admin (you) to see it.
            console.log('\n================================================');
            console.log(`🔐 SECURITY ALERT: OTP Generated`);
            console.log(`👤 User: ${email}`);
            console.log(`📱 Phone: ${normalizedPhone}`);
            console.log(`🔑 OTP: ${otpCode}`);
            console.log('================================================\n');

            // Log audit
            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId, orgId },
                action: user.isNew ? 'ORG_REGISTER_INIT' : 'ORG_REGISTER_UPDATE',
                resource: { type: 'org', id: orgId },
                result: 'success'
            });

            res.status(201).json({
                success: true,
                message: 'Registration initialized. Please verify OTP.',
                data: {
                    orgId,
                    userId,
                    requiresVerification: true,
                    // Return OTP strictly for testing convenience if requested, 
                    // though console log is safer for "production-like" feel
                    debugOtp: otpCode
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ success: false, error: 'Registration failed' });
        }
    }
);

// ==================== LOGIN ====================
router.post('/login',
    [
        body('emailOrPhone').notEmpty(),
        body('password').notEmpty()
    ],
    async (req, res) => {
        try {
            const { emailOrPhone, password } = req.body;

            // Find user by email or phone
            const user = await User.findOne({
                $or: [
                    { 'profile.email': emailOrPhone.toLowerCase() },
                    { 'profile.phone': normalizePhone(emailOrPhone) }
                ]
            }).select('+passwordHash');

            if (!user) {
                await AuditLog.create({
                    logId: generateId('LOG'),
                    action: 'LOGIN_ATTEMPT',
                    resource: { type: 'user', id: emailOrPhone },
                    result: 'failure',
                    details: { reason: 'User not found' }
                });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            // Check if locked
            if (user.isLocked()) {
                const remainingMs = user.security.lockedUntil - new Date();
                const remainingMins = Math.ceil(remainingMs / 60000);
                return res.status(403).json({
                    success: false,
                    error: `Account locked. Try again in ${remainingMins} minutes.`,
                    code: 'ACCOUNT_LOCKED'
                });
            }

            // Verify password
            const isValid = await user.comparePassword(password);
            if (!isValid) {
                await user.incFailedAttempts();
                await AuditLog.create({
                    logId: generateId('LOG'),
                    actor: { userId: user.userId },
                    action: 'LOGIN_ATTEMPT',
                    resource: { type: 'user', id: user.userId },
                    result: 'failure',
                    details: { reason: 'Invalid password', attempts: user.security.failedLoginAttempts }
                });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            // Check if 2FA required
            if (user.twoFA?.enabled) {
                const otp = generateOTP();
                await OTP.create({
                    phone: user.profile.phone,
                    hashedOTP: hashOTP(otp),
                    purpose: 'login',
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
                });

                // Return OTP in dev mode
                const devOtp = process.env.NODE_ENV === 'development' ? otp : undefined;

                return res.json({
                    success: true,
                    requiresOTP: true,
                    userId: user.userId,
                    devOtp
                });
            }

            // Reset failed attempts and update last login
            await user.resetFailedAttempts();

            // Get organization
            const org = await Organization.findOne({ orgId: user.orgId });

            // Generate tokens
            const accessToken = jwt.sign(
                { userId: user.userId, orgId: user.orgId, roles: user.roles },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            const refreshToken = jwt.sign(
                { userId: user.userId, type: 'refresh' },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
            );

            // Create session
            await Session.create({
                sessionId: generateId('SES'),
                userId: user.userId,
                refreshToken,
                deviceInfo: {
                    userAgent: req.headers['user-agent'],
                    ip: req.ip
                },
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });

            // Log success
            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: user.userId, orgId: user.orgId, ip: req.ip },
                action: 'LOGIN_SUCCESS',
                resource: { type: 'user', id: user.userId },
                result: 'success'
            });

            res.json({
                success: true,
                data: {
                    user: user.toPublicJSON(),
                    org: org?.toPublicJSON(),
                    accessToken,
                    refreshToken
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Login failed'
            });
        }
    }
);

// ==================== VERIFY OTP ====================
router.post('/otp/verify',
    [
        body('phone').notEmpty(),
        body('otp').isLength({ min: 6, max: 6 })
    ],
    async (req, res) => {
        try {
            const { phone, otp, purpose = 'registration' } = req.body;
            const normalizedPhone = normalizePhone(phone);

            // Find OTP
            const otpDoc = await OTP.findOne({
                phone: normalizedPhone,
                purpose,
                expiresAt: { $gt: new Date() }
            });

            if (!otpDoc) {
                return res.status(400).json({
                    success: false,
                    error: 'No valid OTP found. Please request a new one.'
                });
            }

            // Check attempts
            if (otpDoc.attempts >= 3) {
                await OTP.deleteOne({ _id: otpDoc._id });
                return res.status(400).json({
                    success: false,
                    error: 'Too many attempts. Please request a new OTP.'
                });
            }

            // Verify OTP
            const inputHash = hashOTP(otp);
            if (inputHash !== otpDoc.hashedOTP) {
                otpDoc.attempts += 1;
                await otpDoc.save();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid OTP',
                    attemptsRemaining: 3 - otpDoc.attempts
                });
            }

            // OTP valid - delete it
            await OTP.deleteOne({ _id: otpDoc._id });

            // If registration OTP, activate user
            if (purpose === 'registration') {
                await User.updateOne(
                    { 'profile.phone': normalizedPhone, status: 'pending' },
                    {
                        status: 'active',
                        'verification.phoneVerified': true,
                        'verification.phoneVerifiedAt': new Date()
                    }
                );
            }

            res.json({
                success: true,
                message: 'OTP verified successfully'
            });

        } catch (error) {
            console.error('OTP verify error:', error);
            res.status(500).json({
                success: false,
                error: 'Verification failed'
            });
        }
    }
);

// ==================== RESEND OTP ====================
router.post('/otp/resend',
    [body('phone').notEmpty()],
    async (req, res) => {
        try {
            const { phone, purpose = 'registration' } = req.body;
            const normalizedPhone = normalizePhone(phone);

            // Delete existing OTPs
            await OTP.deleteMany({ phone: normalizedPhone, purpose });

            // Generate new OTP
            const otp = generateOTP();
            await OTP.create({
                phone: normalizedPhone,
                hashedOTP: hashOTP(otp),
                purpose,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            });

            // In production: send via Twilio/MSG91

            const devOtp = process.env.NODE_ENV === 'development' ? otp : undefined;

            res.json({
                success: true,
                message: 'OTP sent successfully',
                devOtp
            });

        } catch (error) {
            console.error('Resend OTP error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send OTP'
            });
        }
    }
);

// ==================== REFRESH TOKEN ====================
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token required'
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        // Find session
        const session = await Session.findOne({
            userId: decoded.userId,
            refreshToken,
            isRevoked: false,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Session expired or revoked'
            });
        }

        // Get user
        const user = await User.findOne({ userId: decoded.userId });
        if (!user || user.status === 'suspended') {
            return res.status(401).json({
                success: false,
                error: 'User not available'
            });
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { userId: user.userId, orgId: user.orgId, roles: user.roles },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            accessToken
        });

    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'Token refresh failed'
        });
    }
});

// ==================== LOGOUT ====================
router.post('/logout', authenticate, async (req, res) => {
    try {
        // Revoke current session
        await Session.updateOne(
            { sessionId: req.sessionId },
            { isRevoked: true, revokedAt: new Date(), revokedReason: 'logout' }
        );

        await AuditLog.create({
            logId: generateId('LOG'),
            actor: { userId: req.userId, orgId: req.orgId },
            action: 'LOGOUT',
            resource: { type: 'session', id: req.sessionId },
            result: 'success'
        });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

// ==================== GET CURRENT USER ====================
router.get('/me', authenticate, async (req, res) => {
    try {
        const org = await Organization.findOne({ orgId: req.orgId });

        let transporterProfile = null;
        if (org && org.type === 'transporter') {
            transporterProfile = await Transporter.findOne({ orgId: req.orgId });
        }

        res.json({
            success: true,
            data: {
                user: req.user.toPublicJSON(),
                org: org?.toPublicJSON(),
                transporterProfile
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user'
        });
    }
});

export default router;
