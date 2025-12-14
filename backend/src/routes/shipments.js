/**
 * Shipment Routes
 * Handles shipment creation, tracking, and lifecycle
 */

import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { Shipment, Organization, Transporter, Anchor, AuditLog } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { generateId, computeHash, parsePagination, paginatedResponse } from '../utils/helpers.js';

const router = express.Router();

// ==================== CREATE SHIPMENT ====================
router.post('/',
    authenticate,
    authorize('OrgAdmin', 'Manager', 'WarehouseOp'),
    [
        body('toOrgId').notEmpty(),
        body('batchIds').optional().isArray(),
        body('productIds').optional().isArray(),
        body('meta').optional().isObject()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const {
                toOrgId, assignedTransporterId, batchIds, productIds,
                meta, vehicle, selfDelivery
            } = req.body;

            // Verify destination org exists
            const toOrg = await Organization.findOne({ orgId: toOrgId });
            if (!toOrg) {
                return res.status(404).json({
                    success: false,
                    error: 'Destination organization not found'
                });
            }

            // Create shipment
            const shipmentId = generateId('SHP');
            const shipment = await Shipment.create({
                shipmentId,
                fromOrgId: req.orgId,
                toOrgId,
                assignedTransporterId,
                batchIds: batchIds || [],
                productIds: productIds || [],
                status: selfDelivery ? 'delivered' : (assignedTransporterId ? 'assigned' : 'created'),
                meta,
                vehicle,
                selfDelivery: selfDelivery || false
            });

            // Create anchor
            const metaHash = computeHash({
                shipmentId,
                fromOrgId: req.orgId,
                toOrgId,
                batchIds,
                createdAt: shipment.createdAt
            });

            await Anchor.create({
                anchorId: generateId('ANC'),
                type: 'shipment_created',
                objectType: 'shipment',
                objectId: shipmentId,
                anchorHash: metaHash,
                rawDataSnapshot: { shipmentId, fromOrgId: req.orgId, toOrgId },
                status: 'confirmed',
                confirmedAt: new Date()
            });

            shipment.onChain = { metaHash };
            await shipment.save();

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: req.userId, orgId: req.orgId },
                action: 'SHIPMENT_CREATED',
                resource: { type: 'shipment', id: shipmentId },
                result: 'success',
                details: { toOrgId, selfDelivery }
            });

            res.status(201).json({
                success: true,
                data: shipment.toPublicJSON()
            });

        } catch (error) {
            console.error('Create shipment error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create shipment'
            });
        }
    }
);

// ==================== LIST SHIPMENTS ====================
router.get('/', authenticate, async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const { status, direction } = req.query;

        let query = {};

        // Filter by direction
        if (direction === 'outbound') {
            query.fromOrgId = req.orgId;
        } else if (direction === 'inbound') {
            query.toOrgId = req.orgId;
        } else {
            query.$or = [{ fromOrgId: req.orgId }, { toOrgId: req.orgId }];
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        const [shipments, total] = await Promise.all([
            Shipment.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Shipment.countDocuments(query)
        ]);

        res.json({
            success: true,
            ...paginatedResponse(shipments.map(s => s.toPublicJSON()), total, { page, limit })
        });

    } catch (error) {
        console.error('List shipments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list shipments'
        });
    }
});

// ==================== GET SHIPMENT BY ID ====================
router.get('/:shipmentId', authenticate, async (req, res) => {
    try {
        const { shipmentId } = req.params;
        const { includeLogs } = req.query;

        const shipment = await Shipment.findOne({ shipmentId });

        if (!shipment) {
            return res.status(404).json({
                success: false,
                error: 'Shipment not found'
            });
        }

        // Check access
        if (shipment.fromOrgId !== req.orgId &&
            shipment.toOrgId !== req.orgId &&
            shipment.assignedTransporterId !== req.orgId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view this shipment'
            });
        }

        const result = shipment.toPublicJSON();

        if (includeLogs === 'true') {
            result.transitLogs = shipment.transitLogs;
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Get shipment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get shipment'
        });
    }
});

// ==================== CONFIRM PICKUP (Transporter) ====================
router.post('/:shipmentId/pickup',
    authenticate,
    [
        body('location').optional().isObject(),
        body('proofPhotoPath').optional()
    ],
    async (req, res) => {
        try {
            const { shipmentId } = req.params;
            const { location, proofPhotoPath, signature } = req.body;

            const shipment = await Shipment.findOne({ shipmentId });

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            if (!shipment.canPickup(req.orgId) && shipment.assignedTransporterId !== req.orgId) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to pickup this shipment'
                });
            }

            shipment.status = 'picked_up';
            shipment.pickup = {
                timestamp: new Date(),
                location,
                proofPhotoPath,
                signature,
                userId: req.userId
            };
            await shipment.save();

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: req.userId, orgId: req.orgId },
                action: 'SHIPMENT_PICKED_UP',
                resource: { type: 'shipment', id: shipmentId },
                result: 'success'
            });

            res.json({
                success: true,
                message: 'Pickup confirmed',
                data: shipment.toPublicJSON()
            });

        } catch (error) {
            console.error('Pickup error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to confirm pickup'
            });
        }
    }
);

// ==================== ADD TRANSIT LOG ====================
router.post('/:shipmentId/logs',
    authenticate,
    [
        body('temperature').optional().isNumeric(),
        body('humidity').optional().isNumeric(),
        body('location').optional().isObject()
    ],
    async (req, res) => {
        try {
            const { shipmentId } = req.params;
            const { temperature, humidity, location, notes } = req.body;

            const shipment = await Shipment.findOne({ shipmentId });

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            if (shipment.assignedTransporterId !== req.orgId) {
                return res.status(403).json({
                    success: false,
                    error: 'Only assigned transporter can add logs'
                });
            }

            shipment.transitLogs.push({
                timestamp: new Date(),
                location,
                temperature,
                humidity,
                notes
            });

            if (shipment.status === 'picked_up') {
                shipment.status = 'in_transit';
            }

            await shipment.save();

            res.json({
                success: true,
                message: 'Log added',
                logsCount: shipment.transitLogs.length
            });

        } catch (error) {
            console.error('Add log error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add transit log'
            });
        }
    }
);

// ==================== COMPLETE DELIVERY (Transporter) ====================
router.post('/:shipmentId/deliver',
    authenticate,
    [
        body('location').optional().isObject(),
        body('proofPhotoPath').optional()
    ],
    async (req, res) => {
        try {
            const { shipmentId } = req.params;
            const { location, proofPhotoPath, receivedBy, signature } = req.body;

            const shipment = await Shipment.findOne({ shipmentId });

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            if (!shipment.canDeliver(req.orgId) && shipment.assignedTransporterId !== req.orgId) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to deliver this shipment'
                });
            }

            shipment.status = 'delivered';
            shipment.delivery = {
                timestamp: new Date(),
                location,
                proofPhotoPath,
                receivedBy,
                signature,
                userId: req.userId
            };
            await shipment.save();

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: req.userId, orgId: req.orgId },
                action: 'SHIPMENT_DELIVERED',
                resource: { type: 'shipment', id: shipmentId },
                result: 'success'
            });

            res.json({
                success: true,
                message: 'Delivery completed',
                data: shipment.toPublicJSON()
            });

        } catch (error) {
            console.error('Delivery error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to complete delivery'
            });
        }
    }
);

// ==================== ACCEPT DELIVERY (Receiver) ====================
router.post('/:shipmentId/accept',
    authenticate,
    async (req, res) => {
        try {
            const { shipmentId } = req.params;

            const shipment = await Shipment.findOne({ shipmentId });

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            if (shipment.toOrgId !== req.orgId) {
                return res.status(403).json({
                    success: false,
                    error: 'Only receiver can accept delivery'
                });
            }

            if (shipment.status !== 'delivered') {
                return res.status(400).json({
                    success: false,
                    error: 'Shipment must be delivered first'
                });
            }

            shipment.status = 'accepted';
            await shipment.save();

            // Create ownership transfer anchor
            const anchorHash = computeHash({
                shipmentId,
                fromOrgId: shipment.fromOrgId,
                toOrgId: shipment.toOrgId,
                acceptedAt: new Date().toISOString()
            });

            await Anchor.create({
                anchorId: generateId('ANC'),
                type: 'ownership_transfer',
                objectType: 'shipment',
                objectId: shipmentId,
                anchorHash,
                status: 'confirmed',
                confirmedAt: new Date()
            });

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: req.userId, orgId: req.orgId },
                action: 'SHIPMENT_ACCEPTED',
                resource: { type: 'shipment', id: shipmentId },
                result: 'success'
            });

            res.json({
                success: true,
                message: 'Delivery accepted. Ownership transferred.',
                data: shipment.toPublicJSON()
            });

        } catch (error) {
            console.error('Accept error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to accept delivery'
            });
        }
    }
);

// ==================== REJECT DELIVERY (Receiver) ====================
router.post('/:shipmentId/reject',
    authenticate,
    [body('reason').notEmpty()],
    async (req, res) => {
        try {
            const { shipmentId } = req.params;
            const { reason } = req.body;

            const shipment = await Shipment.findOne({ shipmentId });

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            if (shipment.toOrgId !== req.orgId) {
                return res.status(403).json({
                    success: false,
                    error: 'Only receiver can reject delivery'
                });
            }

            shipment.status = 'rejected';
            shipment.rejectionReason = reason;
            await shipment.save();

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: req.userId, orgId: req.orgId },
                action: 'SHIPMENT_REJECTED',
                resource: { type: 'shipment', id: shipmentId },
                result: 'success',
                details: { reason }
            });

            res.json({
                success: true,
                message: 'Delivery rejected',
                data: shipment.toPublicJSON()
            });

        } catch (error) {
            console.error('Reject error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to reject delivery'
            });
        }
    }
);

// ==================== TRANSPORTER: GET ASSIGNMENTS ====================
router.get('/transporter/assignments', authenticate, async (req, res) => {
    try {
        const { status } = req.query;

        const query = { assignedTransporterId: req.orgId };
        if (status) query.status = status;

        const shipments = await Shipment.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            data: shipments.map(s => s.toPublicJSON())
        });

    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get assignments'
        });
    }
});

export default router;
