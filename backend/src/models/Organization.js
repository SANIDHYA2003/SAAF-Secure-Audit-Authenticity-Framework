/**
 * Organization Model
 * Represents a business entity in the supply chain
 */

import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    docId: { type: String, required: true },
    type: {
        type: String,
        enum: ['GST', 'PAN', 'RC', 'KYC', 'LICENSE', 'INVOICE', 'OTHER'],
        required: true
    },
    fileName: { type: String },
    storagePath: { type: String },      // S3/IPFS path
    sha256: { type: String },           // Hash for integrity
    anchoredOnChain: { type: Boolean, default: false },
    anchorTx: { type: String },
    uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const onChainSchema = new mongoose.Schema({
    address: { type: String },          // Blockchain wallet address
    privateKeyEncrypted: { type: String }, // Encrypted with KMS in production
    metaHash: { type: String },         // SHA256 of metadata
    registeredTx: { type: String },     // Registration tx hash
    registeredAt: { type: Date },
    status: {
        type: String,
        enum: ['pending', 'verified', 'suspended', 'rejected'],
        default: 'pending'
    }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
    twoFARequired: { type: Boolean, default: false },
    ipWhitelist: [{ type: String }],
    notificationPrefs: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true }
    }
}, { _id: false });

const organizationSchema = new mongoose.Schema({
    orgId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    handle: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['manufacturer', 'distributor', 'transporter', 'retailer'],
        required: true,
        index: true
    },
    primaryContact: {
        name: { type: String, required: true },
        email: { type: String, required: true, lowercase: true },
        phone: { type: String, required: true }
    },
    legal: {
        gst: { type: String, uppercase: true, index: true },
        pan: { type: String, uppercase: true },
        registrationNumber: { type: String }
    },
    address: {
        line1: { type: String },
        line2: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        country: { type: String, default: 'India' }
    },
    onChain: onChainSchema,
    documents: [documentSchema],
    settings: settingsSchema
}, {
    timestamps: true
});

// Indexes
organizationSchema.index({ 'primaryContact.email': 1 });
organizationSchema.index({ 'onChain.address': 1 });

// Virtual for full address
organizationSchema.virtual('fullAddress').get(function () {
    const addr = this.address;
    return [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
        .filter(Boolean)
        .join(', ');
});

// Methods
organizationSchema.methods.toPublicJSON = function () {
    return {
        orgId: this.orgId,
        handle: this.handle,
        name: this.name,
        type: this.type,
        primaryContact: {
            name: this.primaryContact.name,
            email: this.primaryContact.email
        },
        legal: {
            gst: this.legal.gst
        },
        address: this.address,
        onChain: {
            address: this.onChain?.address,
            status: this.onChain?.status || 'pending'
        },
        status: this.onChain?.status || 'pending',
        createdAt: this.createdAt
    };
};

export default mongoose.model('Organization', organizationSchema);
