/**
 * User Model
 * Represents a user account within an organization
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const twoFASchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    method: { type: String, enum: ['otp', 'totp', 'webauthn'] },
    secret: { type: String },           // Encrypted TOTP secret
    backupCodes: [{ type: String }],    // Hashed backup codes
    webauthnCredentials: [{
        credentialId: { type: String },
        publicKey: { type: String },
        counter: { type: Number }
    }]
}, { _id: false });

const verificationSchema = new mongoose.Schema({
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    phoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: { type: Date },
    emailVerificationToken: { type: String },
    emailTokenExpires: { type: Date }
}, { _id: false });

const deviceSchema = new mongoose.Schema({
    deviceId: { type: String },
    publicKey: { type: String },        // For driver device binding
    platform: { type: String },
    registeredAt: { type: Date }
}, { _id: false });

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    orgId: {
        type: String,
        required: true,
        index: true
    },
    profile: {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        phone: {
            type: String,
            index: true
        },
        avatar: { type: String }        // S3 path
    },
    roles: [{
        type: String,
        enum: ['OrgAdmin', 'Manager', 'WarehouseOp', 'Driver', 'ShopOwner', 'Viewer'],
        default: ['Viewer']
    }],
    passwordHash: { type: String, required: true, select: false },
    twoFA: twoFASchema,
    verification: verificationSchema,
    device: deviceSchema,
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'pending',
        index: true
    },
    security: {
        failedLoginAttempts: { type: Number, default: 0 },
        lockedUntil: { type: Date },
        lastPasswordChange: { type: Date },
        passwordResetToken: { type: String },
        passwordResetExpires: { type: Date }
    },
    lastLogin: { type: Date },
    lastLoginIp: { type: String }
}, {
    timestamps: true
});

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();

    // If it's already hashed (starts with $2), skip
    if (this.passwordHash.startsWith('$2')) return next();

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Check if account is locked
userSchema.methods.isLocked = function () {
    return this.security.lockedUntil && this.security.lockedUntil > new Date();
};

// Increment failed login attempts
userSchema.methods.incFailedAttempts = async function () {
    const MAX_ATTEMPTS = 5;
    const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

    this.security.failedLoginAttempts += 1;

    if (this.security.failedLoginAttempts >= MAX_ATTEMPTS) {
        this.security.lockedUntil = new Date(Date.now() + LOCK_TIME);
    }

    await this.save();
};

// Reset failed attempts
userSchema.methods.resetFailedAttempts = async function () {
    this.security.failedLoginAttempts = 0;
    this.security.lockedUntil = null;
    this.lastLogin = new Date();
    await this.save();
};

// Public JSON (hide sensitive fields)
userSchema.methods.toPublicJSON = function () {
    return {
        userId: this.userId,
        orgId: this.orgId,
        profile: {
            name: this.profile.name,
            email: this.profile.email,
            phone: this.profile.phone,
            avatar: this.profile.avatar
        },
        roles: this.roles,
        status: this.status,
        verification: {
            emailVerified: this.verification?.emailVerified || false,
            phoneVerified: this.verification?.phoneVerified || false
        },
        twoFAEnabled: this.twoFA?.enabled || false,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt
    };
};

export default mongoose.model('User', userSchema);
