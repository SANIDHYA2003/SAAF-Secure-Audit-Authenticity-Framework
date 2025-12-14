/**
 * VerifyChain - MongoDB Schema Definitions
 * 
 * These schemas are designed for:
 * - MongoDB Atlas (production)
 * - LocalStorage simulation (development)
 * - Mongoose ODM compatibility
 * 
 * On-Chain vs Off-Chain:
 * - credentials, PII, documents → OFF-CHAIN (MongoDB + S3/IPFS)
 * - hashes, addresses, approvals, transfers → ON-CHAIN (blockchain)
 */

// ==================== ORGANIZATION SCHEMA ====================
export const OrgSchema = {
    _id: "ObjectId",
    orgId: { type: "string", unique: true, required: true },  // UUID
    name: { type: "string", required: true },
    type: {
        type: "string",
        enum: ["manufacturer", "distributor", "transporter", "retailer"],
        required: true
    },
    primaryContact: {
        name: { type: "string", required: true },
        email: { type: "string", required: true },
        phone: { type: "string", required: true }
    },
    legal: {
        gst: { type: "string" },
        pan: { type: "string" },
        registrationNumber: { type: "string" }
    },
    address: {
        line1: { type: "string" },
        line2: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        pincode: { type: "string" },
        country: { type: "string", default: "India" }
    },
    onChain: {
        address: { type: "string" },           // 0x... blockchain address
        metaHash: { type: "string" },          // SHA256 of off-chain metadata
        registeredTx: { type: "string" },      // Registration transaction hash
        registeredAt: { type: "Date" },
        status: {
            type: "string",
            enum: ["pending", "verified", "suspended", "rejected"],
            default: "pending"
        }
    },
    documents: [{
        docId: { type: "string" },             // UUID
        type: { type: "string", enum: ["GST", "PAN", "RC", "KYC", "LICENSE", "OTHER"] },
        fileName: { type: "string" },
        storagePath: { type: "string" },       // s3://... or ipfs://...
        sha256: { type: "string" },            // Hash for integrity
        anchoredOnChain: { type: "boolean", default: false },
        anchorTx: { type: "string" },
        uploadedAt: { type: "Date" }
    }],
    settings: {
        twoFARequired: { type: "boolean", default: false },
        ipWhitelist: [{ type: "string" }],
        notificationPrefs: {
            email: { type: "boolean", default: true },
            sms: { type: "boolean", default: true }
        }
    },
    createdAt: { type: "Date", default: "Date.now" },
    updatedAt: { type: "Date", default: "Date.now" }
};

// Indexes: orgId(unique), legal.gst, primaryContact.email, type, onChain.address

// ==================== USER SCHEMA ====================
export const UserSchema = {
    _id: "ObjectId",
    userId: { type: "string", unique: true, required: true },  // UUID
    orgId: { type: "string", required: true },                  // Reference to orgs.orgId
    profile: {
        name: { type: "string", required: true },
        email: { type: "string", required: true, unique: true },
        phone: { type: "string" },
        avatar: { type: "string" }                              // S3 path
    },
    roles: [{
        type: "string",
        enum: ["OrgAdmin", "Manager", "WarehouseOp", "Driver", "ShopOwner", "Viewer"]
    }],
    auth: {
        passwordHash: { type: "string" },       // Argon2id / bcrypt hash
        salt: { type: "string" },               // If using manual salt
        algorithm: { type: "string", default: "argon2id" },
        lastPasswordChange: { type: "Date" },
        failedAttempts: { type: "number", default: 0 },
        lockedUntil: { type: "Date" }
    },
    twoFA: {
        enabled: { type: "boolean", default: false },
        method: { type: "string", enum: ["otp", "webauthn", "totp"] },
        secret: { type: "string" },             // Encrypted TOTP secret
        backupCodes: [{ type: "string" }],      // Hashed backup codes
        webauthnCredentials: [{
            credentialId: { type: "string" },
            publicKey: { type: "string" },
            counter: { type: "number" }
        }]
    },
    device: {
        publicKey: { type: "string" },          // For driver device binding
        deviceId: { type: "string" },
        registeredAt: { type: "Date" }
    },
    verification: {
        emailVerified: { type: "boolean", default: false },
        phoneVerified: { type: "boolean", default: false },
        emailVerificationToken: { type: "string" },
        phoneOTP: { type: "string" },           // Hashed OTP
        otpExpiresAt: { type: "Date" }
    },
    status: {
        type: "string",
        enum: ["pending", "active", "suspended"],
        default: "pending"
    },
    lastLogin: { type: "Date" },
    createdAt: { type: "Date", default: "Date.now" },
    updatedAt: { type: "Date", default: "Date.now" }
};

// Indexes: userId(unique), profile.email(unique), profile.phone, orgId

// ==================== TRANSPORTER SCHEMA ====================
export const TransporterSchema = {
    _id: "ObjectId",
    transporterId: { type: "string", unique: true, required: true },
    orgId: { type: "string" },                  // If transporter is an org
    name: { type: "string", required: true },
    contactNumber: { type: "string" },
    licenseNumber: { type: "string" },
    vehicles: [{
        vehicleId: { type: "string" },          // UUID
        vehicleNumber: { type: "string" },
        type: { type: "string", enum: ["truck", "van", "refrigerated", "bike"] },
        capacity: { type: "string" },
        rcDocPath: { type: "string" },
        rcDocHash: { type: "string" },
        insuranceExpiry: { type: "Date" },
        assignedDriverIds: [{ type: "string" }]
    }],
    drivers: [{
        driverId: { type: "string" },           // Reference to users.userId
        name: { type: "string" },
        phone: { type: "string" },
        licenseNumber: { type: "string" },
        licenseDocPath: { type: "string" },
        devicePublicKey: { type: "string" }
    }],
    serviceRegions: [{ type: "string" }],       // ["Mumbai", "Pune", "Delhi"]
    coldChainCapable: { type: "boolean", default: false },
    certifications: [{
        type: { type: "string" },
        docPath: { type: "string" },
        validUntil: { type: "Date" }
    }],
    approvals: [{
        manufacturerOrgId: { type: "string" },
        approvedAt: { type: "Date" },
        approvedBy: { type: "string" },         // userId
        onChainTx: { type: "string" },
        status: { type: "string", enum: ["pending", "approved", "rejected", "revoked"] }
    }],
    status: {
        type: "string",
        enum: ["pending", "active", "suspended"],
        default: "pending"
    },
    createdAt: { type: "Date" },
    updatedAt: { type: "Date" }
};

// Indexes: transporterId(unique), orgId, approvals.manufacturerOrgId

// ==================== SHIPMENT SCHEMA ====================
export const ShipmentSchema = {
    _id: "ObjectId",
    shipmentId: { type: "string", unique: true, required: true },
    fromOrgId: { type: "string", required: true },
    toOrgId: { type: "string", required: true },
    assignedTransporterId: { type: "string" },
    batchIds: [{ type: "string" }],             // Product batch references
    status: {
        type: "string",
        enum: ["created", "assigned", "picked_up", "in_transit", "delivered", "accepted", "rejected"],
        default: "created"
    },
    meta: {
        description: { type: "string" },
        packageCount: { type: "number" },
        weightKg: { type: "number" },
        volumeCbm: { type: "number" },
        requiresColdChain: { type: "boolean", default: false },
        requiredTemp: { min: { type: "number" }, max: { type: "number" } }
    },
    vehicle: {
        vehicleNumber: { type: "string" },
        driverName: { type: "string" },
        driverPhone: { type: "string" }
    },
    pickup: {
        scheduledAt: { type: "Date" },
        actualAt: { type: "Date" },
        location: {
            address: { type: "string" },
            lat: { type: "number" },
            lng: { type: "number" }
        },
        proofPhotoPath: { type: "string" },
        signedByDeviceKey: { type: "string" },
        signature: { type: "string" }           // Cryptographic signature
    },
    delivery: {
        scheduledAt: { type: "Date" },
        actualAt: { type: "Date" },
        location: {
            address: { type: "string" },
            lat: { type: "number" },
            lng: { type: "number" }
        },
        proofPhotoPath: { type: "string" },
        receivedBy: { type: "string" },         // userId or name
        signature: { type: "string" }
    },
    transitLogs: [{
        timestamp: { type: "Date" },
        location: { lat: { type: "number" }, lng: { type: "number" } },
        temperature: { type: "number" },
        humidity: { type: "number" },
        notes: { type: "string" }
    }],
    onChain: {
        createdTx: { type: "string" },
        pickupTx: { type: "string" },
        deliveryTx: { type: "string" },
        ownershipTransferTx: { type: "string" },
        metaHash: { type: "string" },
        logsAnchorHash: { type: "string" }      // Batched logs hash
    },
    createdAt: { type: "Date" },
    updatedAt: { type: "Date" }
};

// Indexes: shipmentId(unique), fromOrgId, toOrgId, assignedTransporterId, status

// ==================== INVITE SCHEMA ====================
export const InviteSchema = {
    _id: "ObjectId",
    inviteId: { type: "string", unique: true },
    code: { type: "string", unique: true },     // Short code for sharing
    orgId: { type: "string", required: true },
    email: { type: "string" },
    phone: { type: "string" },
    role: { type: "string", required: true },
    invitedBy: { type: "string" },              // userId
    status: {
        type: "string",
        enum: ["pending", "claimed", "expired", "revoked"],
        default: "pending"
    },
    claimedBy: { type: "string" },              // userId who claimed
    claimedAt: { type: "Date" },
    expiresAt: { type: "Date", required: true },
    createdAt: { type: "Date" }
};

// ==================== SESSION SCHEMA ====================
export const SessionSchema = {
    _id: "ObjectId",
    sessionId: { type: "string", unique: true },
    userId: { type: "string", required: true },
    refreshToken: { type: "string" },
    deviceInfo: {
        userAgent: { type: "string" },
        ip: { type: "string" },
        deviceId: { type: "string" }
    },
    isRevoked: { type: "boolean", default: false },
    revokedAt: { type: "Date" },
    expiresAt: { type: "Date", required: true },
    createdAt: { type: "Date" }
};

// ==================== ANCHOR SCHEMA (On-chain references) ====================
export const AnchorSchema = {
    _id: "ObjectId",
    anchorId: { type: "string", unique: true },
    type: {
        type: "string",
        enum: ["org_registration", "document", "shipment", "transit_logs_batch", "ownership_transfer"]
    },
    objectType: { type: "string" },             // "org", "shipment", "document"
    objectId: { type: "string" },               // Reference to the object
    anchorHash: { type: "string", required: true },  // SHA256 hash anchored
    chainNetwork: { type: "string", default: "besu" },
    chainTx: { type: "string" },                // Transaction hash
    chainBlock: { type: "number" },
    gasUsed: { type: "number" },
    status: {
        type: "string",
        enum: ["pending", "confirmed", "failed"],
        default: "pending"
    },
    createdAt: { type: "Date" },
    confirmedAt: { type: "Date" }
};

// ==================== AUDIT LOG SCHEMA ====================
export const AuditLogSchema = {
    _id: "ObjectId",
    logId: { type: "string" },
    timestamp: { type: "Date", default: "Date.now" },
    actor: {
        userId: { type: "string" },
        orgId: { type: "string" },
        ip: { type: "string" },
        userAgent: { type: "string" }
    },
    action: { type: "string", required: true }, // "LOGIN", "CREATE_SHIPMENT", "APPROVE_TRANSPORTER"
    resource: {
        type: { type: "string" },               // "org", "user", "shipment"
        id: { type: "string" }
    },
    details: { type: "object" },                // Action-specific details
    result: {
        type: "string",
        enum: ["success", "failure", "blocked"]
    },
    errorMessage: { type: "string" }
};

// ==================== HELPER: Generate UUIDs ====================
export const generateId = (prefix = '') => {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    return prefix ? `${prefix}-${uuid.split('-')[0]}` : uuid;
};

// ==================== HELPER: Compute SHA256 Hash ====================
export const computeHash = async (data) => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(typeof data === 'string' ? data : JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export default {
    OrgSchema,
    UserSchema,
    TransporterSchema,
    ShipmentSchema,
    InviteSchema,
    SessionSchema,
    AnchorSchema,
    AuditLogSchema,
    generateId,
    computeHash
};
