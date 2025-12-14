/**
 * Anchor Routes
 * Handles blockchain anchor queries and verification
 */

import express from 'express';
import { Anchor } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { parsePagination, paginatedResponse, computeHash } from '../utils/helpers.js';

const router = express.Router();

// ==================== GET ANCHORS BY SHIPMENT ID ====================
router.get('/shipment/:shipmentId', authenticate, async (req, res) => {
    try {
        const { shipmentId } = req.params;

        const anchors = await Anchor.find({
            $or: [
                { objectId: shipmentId },
                { 'rawDataSnapshot.shipmentId': shipmentId }
            ]
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: anchors
        });

    } catch (error) {
        console.error('Get anchors by shipment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get anchors'
        });
    }
});

// ==================== GET ANCHOR BY ID ====================
router.get('/:anchorId', authenticate, async (req, res) => {
    try {
        const { anchorId } = req.params;

        const anchor = await Anchor.findOne({ anchorId });

        if (!anchor) {
            return res.status(404).json({
                success: false,
                error: 'Anchor not found'
            });
        }

        res.json({
            success: true,
            data: anchor
        });

    } catch (error) {
        console.error('Get anchor error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get anchor'
        });
    }
});

// ==================== LIST ANCHORS BY TYPE ====================
router.get('/', authenticate, async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const { type } = req.query;

        const query = {};
        if (type) {
            query.type = type;
        }

        const [anchors, total] = await Promise.all([
            Anchor.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Anchor.countDocuments(query)
        ]);

        res.json({
            success: true,
            ...paginatedResponse(anchors, total, { page, limit })
        });

    } catch (error) {
        console.error('List anchors error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list anchors'
        });
    }
});

// ==================== VERIFY ANCHOR ====================
router.post('/:anchorId/verify', authenticate, async (req, res) => {
    try {
        const { anchorId } = req.params;

        const anchor = await Anchor.findOne({ anchorId });

        if (!anchor) {
            return res.status(404).json({
                success: false,
                error: 'Anchor not found'
            });
        }

        if (!anchor.rawDataSnapshot) {
            return res.json({
                success: true,
                data: {
                    valid: false,
                    error: 'No raw data to verify',
                    anchorId: anchor.anchorId,
                    type: anchor.type
                }
            });
        }

        // Recompute hash
        const recomputedHash = computeHash(anchor.rawDataSnapshot);
        const isValid = recomputedHash === anchor.anchorHash;

        res.json({
            success: true,
            data: {
                valid: isValid,
                anchorId: anchor.anchorId,
                type: anchor.type,
                originalHash: anchor.anchorHash,
                recomputedHash,
                chainTx: anchor.chainTx,
                confirmedAt: anchor.confirmedAt
            }
        });

    } catch (error) {
        console.error('Verify anchor error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify anchor'
        });
    }
});

// ==================== GET ANCHOR STATS ====================
router.get('/stats', authenticate, async (req, res) => {
    try {
        const stats = await Anchor.aggregate([
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    byStatus: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    byType: [
                        { $group: { _id: '$type', count: { $sum: 1 } } }
                    ]
                }
            }
        ]);

        const result = {
            total: stats[0].total[0]?.count || 0,
            confirmed: 0,
            pending: 0,
            failed: 0,
            byType: {}
        };

        // Process by status
        stats[0].byStatus.forEach(s => {
            if (s._id === 'confirmed') result.confirmed = s.count;
            if (s._id === 'pending') result.pending = s.count;
            if (s._id === 'failed') result.failed = s.count;
        });

        // Process by type
        stats[0].byType.forEach(t => {
            result.byType[t._id] = t.count;
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats'
        });
    }
});

export default router;
