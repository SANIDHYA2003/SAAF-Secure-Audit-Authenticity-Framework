/**
 * Shipment Model
 * Represents a shipment in transit between organizations
 */

import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
    address: { type: String },
    lat: { type: Number },
    lng: { type: Number }
}, { _id: false });

const proofSchema = new mongoose.Schema({
    timestamp: { type: Date },
    location: locationSchema,
    proofPhotoPath: { type: String },   // S3 path
    signedByDeviceKey: { type: String },
    signature: { type: String },
    userId: { type: String }
}, { _id: false });

const transitLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    location: locationSchema,
    temperature: { type: Number },       // Celsius
    humidity: { type: Number },          // Percentage
    notes: { type: String }
}, { _id: true });

const onChainDataSchema = new mongoose.Schema({
    createdTx: { type: String },
    pickupTx: { type: String },
    deliveryTx: { type: String },
    ownershipTransferTx: { type: String },
    metaHash: { type: String },
    logsAnchorHash: { type: String }
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
    shipmentId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    fromOrgId: {
        type: String,
        required: true,
        index: true
    },
    toOrgId: {
        type: String,
        required: true,
        index: true
    },
    assignedTransporterId: {
        type: String,
        index: true
    },
    batchIds: [{ type: String }],
    productIds: [{ type: String }],
    status: {
        type: String,
        enum: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'accepted', 'rejected'],
        default: 'created',
        index: true
    },
    meta: {
        description: { type: String },
        packageCount: { type: Number },
        weightKg: { type: Number },
        volumeCbm: { type: Number },
        invoiceNumber: { type: String },
        poNumber: { type: String },
        requiresColdChain: { type: Boolean, default: false },
        requiredTemp: {
            min: { type: Number },
            max: { type: Number }
        }
    },
    vehicle: {
        vehicleNumber: { type: String },
        driverName: { type: String },
        driverPhone: { type: String },
        driverId: { type: String }
    },
    pickup: proofSchema,
    delivery: proofSchema,
    transitLogs: [transitLogSchema],
    onChain: onChainDataSchema,
    selfDelivery: { type: Boolean, default: false },
    rejectionReason: { type: String }
}, {
    timestamps: true
});

// Indexes for common queries
shipmentSchema.index({ status: 1, createdAt: -1 });
shipmentSchema.index({ fromOrgId: 1, createdAt: -1 });
shipmentSchema.index({ toOrgId: 1, createdAt: -1 });
shipmentSchema.index({ assignedTransporterId: 1, status: 1 });

// Methods
shipmentSchema.methods.canPickup = function (transporterId) {
    return this.status === 'assigned' &&
        this.assignedTransporterId === transporterId;
};

shipmentSchema.methods.canDeliver = function (transporterId) {
    return (this.status === 'picked_up' || this.status === 'in_transit') &&
        this.assignedTransporterId === transporterId;
};

shipmentSchema.methods.canAccept = function (orgId) {
    return this.status === 'delivered' &&
        this.toOrgId === orgId;
};

shipmentSchema.methods.toPublicJSON = function () {
    return {
        shipmentId: this.shipmentId,
        fromOrgId: this.fromOrgId,
        toOrgId: this.toOrgId,
        assignedTransporterId: this.assignedTransporterId,
        status: this.status,
        meta: this.meta,
        vehicle: this.vehicle,
        pickup: this.pickup,
        delivery: this.delivery,
        transitLogsCount: this.transitLogs?.length || 0,
        selfDelivery: this.selfDelivery,
        onChain: {
            createdTx: this.onChain?.createdTx,
            pickupTx: this.onChain?.pickupTx,
            deliveryTx: this.onChain?.deliveryTx
        },
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

export default mongoose.model('Shipment', shipmentSchema);
