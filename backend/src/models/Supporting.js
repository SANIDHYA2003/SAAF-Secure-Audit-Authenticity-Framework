/**
 * Invite, Session, Anchor, AuditLog Models
 * Supporting models for auth, tracking, and blockchain anchoring
 */

import mongoose from 'mongoose';

// ==================== INVITE ====================
const inviteSchema = new mongoose.Schema({
    inviteId: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true
    },
    orgId: {
        type: String,
        required: true,
        index: true
    },
    email: { type: String, lowercase: true },
    phone: { type: String },
    role: {
        type: String,
        required: true,
        enum: ['OrgAdmin', 'Manager', 'WarehouseOp', 'Driver', 'ShopOwner', 'Viewer']
    },
    invitedBy: { type: String },        // userId
    status: {
        type: String,
        enum: ['pending', 'claimed', 'expired', 'revoked'],
        default: 'pending',
        index: true
    },
    claimedBy: { type: String },        // userId
    claimedAt: { type: Date },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Auto-expire invites
inviteSchema.pre('find', function () {
    this.where({
        $or: [
            { status: { $ne: 'pending' } },
            { expiresAt: { $gt: new Date() } }
        ]
    });
});

export const Invite = mongoose.model('Invite', inviteSchema);

// ==================== SESSION ====================
const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    refreshToken: { type: String, required: true },
    deviceInfo: {
        userAgent: { type: String },
        ip: { type: String },
        deviceId: { type: String },
        platform: { type: String }
    },
    isRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    revokedReason: { type: String },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Index for cleanup
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, isRevoked: 1 });

export const Session = mongoose.model('Session', sessionSchema);

// ==================== ANCHOR (On-chain references) ====================
const anchorSchema = new mongoose.Schema({
    anchorId: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: [
            'org_registration',
            'document',
            'shipment_created',
            'shipment_pickup',
            'shipment_delivery',
            'ownership_transfer',
            'transit_logs_batch',
            'transporter_approval'
        ],
        required: true,
        index: true
    },
    objectType: { type: String },       // 'org', 'shipment', 'document'
    objectId: {
        type: String,
        index: true
    },
    anchorHash: { type: String, required: true },
    rawDataSnapshot: { type: mongoose.Schema.Types.Mixed },  // For verification
    chainNetwork: { type: String, default: 'besu' },
    chainTx: { type: String },
    chainBlock: { type: Number },
    gasUsed: { type: Number },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'failed'],
        default: 'pending',
        index: true
    },
    errorMessage: { type: String },
    confirmedAt: { type: Date }
}, { timestamps: true });

// Indexes
anchorSchema.index({ objectId: 1, type: 1 });
anchorSchema.index({ chainTx: 1 });

export const Anchor = mongoose.model('Anchor', anchorSchema);

// ==================== AUDIT LOG ====================
const auditLogSchema = new mongoose.Schema({
    logId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    actor: {
        userId: { type: String },
        orgId: { type: String },
        ip: { type: String },
        userAgent: { type: String }
    },
    action: {
        type: String,
        required: true,
        index: true
    },
    resource: {
        type: { type: String },
        id: { type: String }
    },
    details: { type: mongoose.Schema.Types.Mixed },
    result: {
        type: String,
        enum: ['success', 'failure', 'blocked'],
        required: true
    },
    errorMessage: { type: String }
}, { timestamps: false });

// Compound index for querying
auditLogSchema.index({ 'actor.orgId': 1, timestamp: -1 });
auditLogSchema.index({ action: 1, result: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// ==================== OTP (Ephemeral) ====================
const otpSchema = new mongoose.Schema({
    phone: { type: String, required: true, index: true },
    hashedOTP: { type: String, required: true },
    purpose: {
        type: String,
        enum: ['registration', 'login', 'password_reset', 'verification'],
        required: true
    },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

// TTL index - auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model('OTP', otpSchema);

// ==================== TRANSPORTER ====================
const transporterSchema = new mongoose.Schema({
    transporterId: {
        type: String,
        required: true,
        unique: true
    },
    transporterCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true
    },
    orgId: { type: String },            // If transporter is an org
    name: { type: String, required: true },
    contactNumber: { type: String },
    licenseNumber: { type: String },
    vehicles: [{
        vehicleId: { type: String },
        vehicleNumber: { type: String },
        type: {
            type: String,
            enum: ['truck', 'van', 'refrigerated', 'bike', 'other']
        },
        capacity: { type: String },
        rcDocPath: { type: String },
        rcDocHash: { type: String },
        insuranceExpiry: { type: Date }
    }],
    drivers: [{
        driverId: { type: String },
        userId: { type: String },       // Reference to User
        name: { type: String },
        phone: { type: String },
        licenseNumber: { type: String },
        devicePublicKey: { type: String }
    }],
    serviceRegions: [{ type: String }],
    coldChainCapable: { type: Boolean, default: false },
    approvals: [{
        manufacturerOrgId: { type: String },
        approvedAt: { type: Date },
        approvedBy: { type: String },
        onChainTx: { type: String },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'revoked'],
            default: 'pending'
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'pending'
    }
}, { timestamps: true });

transporterSchema.index({ 'approvals.manufacturerOrgId': 1 });

export const Transporter = mongoose.model('Transporter', transporterSchema);

export default {
    Invite,
    Session,
    Anchor,
    AuditLog,
    OTP,
    Transporter
};
