/**
 * Organization Routes
 * Handles organization management and verification
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { Organization, User, AuditLog, Transporter } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { generateId, parsePagination, paginatedResponse } from '../utils/helpers.js';

const router = express.Router();

// ==================== GET MY ORGANIZATION ====================
router.get('/me', authenticate, async (req, res) => {
    try {
        const org = await Organization.findOne({ orgId: req.orgId });

        if (!org) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found'
            });
        }

        res.json({
            success: true,
            data: org
        });

    } catch (error) {
        console.error('Get org error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get organization'
        });
    }
});

// ==================== UPDATE ORGANIZATION ====================
router.patch('/me',
    authenticate,
    authorize('OrgAdmin'),
    async (req, res) => {
        try {
            const allowedFields = ['name', 'address', 'primaryContact', 'settings'];
            const updates = {};

            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            const org = await Organization.findOneAndUpdate(
                { orgId: req.orgId },
                { $set: updates },
                { new: true }
            );

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: req.userId, orgId: req.orgId },
                action: 'ORG_UPDATED',
                resource: { type: 'org', id: req.orgId },
                result: 'success',
                details: { fieldsUpdated: Object.keys(updates) }
            });

            res.json({
                success: true,
                data: org
            });

        } catch (error) {
            console.error('Update org error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update organization'
            });
        }
    }
);

// ==================== GET ORGANIZATION MEMBERS ====================
router.get('/me/members', authenticate, async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);

        const [users, total] = await Promise.all([
            User.find({ orgId: req.orgId })
                .select('-passwordHash')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            User.countDocuments({ orgId: req.orgId })
        ]);

        res.json({
            success: true,
            ...paginatedResponse(users.map(u => u.toPublicJSON()), total, { page, limit })
        });

    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get members'
        });
    }
});

// ==================== SEARCH ORGANIZATIONS ====================
router.get('/search', async (req, res) => {
    try {
        const { q, type } = req.query;

        if (!q && !type) {
            return res.status(400).json({ success: false, error: 'Query required' });
        }

        // Allow searching both verified and pending for smoother testing flow
        const query = { 'onChain.status': { $in: ['verified', 'pending'] } };

        if (q) {
            const cleanQ = q.replace(/^@/, '').trim(); // Remove leading @

            // 1. First check if it matches a Transporter Code
            const transMatches = await Transporter.find({
                transporterCode: { $regex: cleanQ, $options: 'i' }
            }).select('orgId');

            const transOrgIds = transMatches.map(t => t.orgId);

            // 2. Check if it matches a User ID
            const userMatches = await User.find({
                userId: { $regex: cleanQ, $options: 'i' }
            }).select('orgId');
            const userOrgIds = userMatches.map(u => u.orgId);

            // Combine IDs
            const relatedOrgIds = [...transOrgIds, ...userOrgIds];

            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { handle: { $regex: cleanQ, $options: 'i' } },
                { 'legal.gst': { $regex: cleanQ, $options: 'i' } },
                { orgId: { $in: relatedOrgIds } } // Include matches by Transporter Code OR User ID
            ];
        }

        if (type) {
            query.type = type;
        }

        const orgs = await Organization.find(query)
            .select('orgId name handle type primaryContact.name legal.gst address onChain.status onChain.address')
            .limit(20);

        res.json({
            success: true,
            data: orgs.map(o => o.toPublicJSON())
        });

    } catch (error) {
        console.error('Search orgs error:', error);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
});

// ==================== LIST ORGANIZATIONS (Public/Limited) ====================
router.get('/', async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const { type, status } = req.query;

        const query = { 'onChain.status': 'verified' };
        if (type) query.type = type;
        if (status) query['onChain.status'] = status;

        const [orgs, total] = await Promise.all([
            Organization.find(query)
                .select('orgId name type primaryContact.name legal.gst address onChain.status createdAt')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Organization.countDocuments(query)
        ]);

        res.json({
            success: true,
            ...paginatedResponse(orgs.map(o => o.toPublicJSON()), total, { page, limit })
        });

    } catch (error) {
        console.error('List orgs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list organizations'
        });
    }
});

// ==================== GET ORGANIZATION BY ID ====================
router.get('/:orgId', async (req, res) => {
    try {
        const org = await Organization.findOne({
            orgId: req.params.orgId
        });

        if (!org) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found'
            });
        }

        res.json({
            success: true,
            data: org.toPublicJSON()
        });

    } catch (error) {
        console.error('Get org error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get organization'
        });
    }
});

// ==================== GET TRANSPORTER PROFILE BY ORG ID ====================
router.get('/:orgId/transporter-profile', async (req, res) => {
    try {
        const profile = await Transporter.findOne({ orgId: req.params.orgId });

        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Transporter profile not found'
            });
        }

        res.json({
            success: true,
            data: profile
        });

    } catch (error) {
        console.error('Get transporter profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get transporter profile'
        });
    }
});

// ==================== ADMIN: VERIFY ORGANIZATION ====================
router.post('/:orgId/verify',
    authenticate,
    authorize('OrgAdmin'), // In production: PlatformAdmin role
    async (req, res) => {
        try {
            const { orgId } = req.params;
            const { status, notes } = req.body;

            if (!['verified', 'rejected'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Status must be "verified" or "rejected"'
                });
            }

            const org = await Organization.findOneAndUpdate(
                { orgId },
                {
                    'onChain.status': status,
                    'onChain.registeredAt': status === 'verified' ? new Date() : undefined
                },
                { new: true }
            );

            if (!org) {
                return res.status(404).json({
                    success: false,
                    error: 'Organization not found'
                });
            }

            // Activate users if org verified
            if (status === 'verified') {
                await User.updateMany(
                    { orgId, status: 'pending' },
                    { status: 'active' }
                );
            }

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: req.userId, orgId: req.orgId },
                action: status === 'verified' ? 'ORG_VERIFIED' : 'ORG_REJECTED',
                resource: { type: 'org', id: orgId },
                result: 'success',
                details: { notes }
            });

            res.json({
                success: true,
                message: `Organization ${status}`,
                data: org.toPublicJSON()
            });

        } catch (error) {
            console.error('Verify org error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to verify organization'
            });
        }
    }
);

// ==================== ADMIN: SUSPEND ORGANIZATION ====================
router.post('/:orgId/suspend',
    authenticate,
    authorize('OrgAdmin'), // In production: PlatformAdmin role
    async (req, res) => {
        try {
            const { orgId } = req.params;
            const { reason } = req.body;

            const org = await Organization.findOneAndUpdate(
                { orgId },
                { 'onChain.status': 'suspended' },
                { new: true }
            );

            if (!org) {
                return res.status(404).json({
                    success: false,
                    error: 'Organization not found'
                });
            }

            // Suspend all users
            await User.updateMany(
                { orgId },
                { status: 'suspended' }
            );

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: req.userId, orgId: req.orgId },
                action: 'ORG_SUSPENDED',
                resource: { type: 'org', id: orgId },
                result: 'success',
                details: { reason }
            });

            res.json({
                success: true,
                message: 'Organization suspended',
                data: org.toPublicJSON()
            });

        } catch (error) {
            console.error('Suspend org error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to suspend organization'
            });
        }
    }
);

export default router;
