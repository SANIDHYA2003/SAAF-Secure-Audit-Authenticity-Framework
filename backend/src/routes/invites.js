/**
 * Invite Routes
 * Handles team member invitations
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { Invite, User, Organization, AuditLog } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { generateId, generateCode, normalizePhone } from '../utils/helpers.js';

const router = express.Router();

// ==================== CREATE INVITE ====================
router.post('/',
    authenticate,
    authorize('OrgAdmin', 'Manager'),
    [
        body('email').optional().isEmail().normalizeEmail(),
        body('phone').optional(),
        body('role').isIn(['OrgAdmin', 'Manager', 'WarehouseOp', 'Driver', 'ShopOwner', 'Viewer'])
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

            const { email, phone, role } = req.body;

            if (!email && !phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Email or phone required'
                });
            }

            // Check if already a member
            if (email) {
                const existingUser = await User.findOne({
                    'profile.email': email.toLowerCase(),
                    orgId: req.orgId
                });
                if (existingUser) {
                    return res.status(409).json({
                        success: false,
                        error: 'User already a member of this organization'
                    });
                }
            }

            // Generate invite
            const invite = await Invite.create({
                inviteId: generateId('INV'),
                code: generateCode(8),
                orgId: req.orgId,
                email: email?.toLowerCase(),
                phone: phone ? normalizePhone(phone) : undefined,
                role,
                invitedBy: req.userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: req.userId, orgId: req.orgId },
                action: 'INVITE_CREATED',
                resource: { type: 'invite', id: invite.inviteId },
                result: 'success',
                details: { email, phone, role }
            });

            // In production: send invite via email/SMS

            res.status(201).json({
                success: true,
                data: {
                    inviteId: invite.inviteId,
                    code: invite.code,
                    expiresAt: invite.expiresAt
                }
            });

        } catch (error) {
            console.error('Create invite error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create invite'
            });
        }
    }
);

// ==================== LIST INVITES ====================
router.get('/', authenticate, authorize('OrgAdmin', 'Manager'), async (req, res) => {
    try {
        const invites = await Invite.find({ orgId: req.orgId })
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({
            success: true,
            data: invites.map(i => ({
                inviteId: i.inviteId,
                code: i.code,
                email: i.email,
                phone: i.phone,
                role: i.role,
                status: i.status,
                expiresAt: i.expiresAt,
                claimedAt: i.claimedAt,
                createdAt: i.createdAt
            }))
        });

    } catch (error) {
        console.error('List invites error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list invites'
        });
    }
});

// ==================== VALIDATE INVITE CODE ====================
router.get('/validate/:code', async (req, res) => {
    try {
        const { code } = req.params;

        const invite = await Invite.findOne({
            code: code.toUpperCase(),
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (!invite) {
            return res.status(404).json({
                success: false,
                error: 'Invalid or expired invite code'
            });
        }

        const org = await Organization.findOne({ orgId: invite.orgId });

        res.json({
            success: true,
            data: {
                valid: true,
                role: invite.role,
                organization: {
                    name: org?.name,
                    type: org?.type
                },
                expiresAt: invite.expiresAt
            }
        });

    } catch (error) {
        console.error('Validate invite error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate invite'
        });
    }
});

// ==================== CLAIM INVITE ====================
router.post('/claim/:code',
    [
        body('name').notEmpty().trim(),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('phone').optional()
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

            const { code } = req.params;
            const { name, email, password, phone } = req.body;

            // Find invite
            const invite = await Invite.findOne({
                code: code.toUpperCase(),
                status: 'pending',
                expiresAt: { $gt: new Date() }
            });

            if (!invite) {
                return res.status(404).json({
                    success: false,
                    error: 'Invalid or expired invite code'
                });
            }

            // Check if email already registered
            const existingUser = await User.findOne({ 'profile.email': email.toLowerCase() });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'Email already registered'
                });
            }

            // Create user
            const userId = generateId('USR');
            const user = await User.create({
                userId,
                orgId: invite.orgId,
                profile: {
                    name,
                    email: email.toLowerCase(),
                    phone: phone ? normalizePhone(phone) : undefined
                },
                roles: [invite.role],
                passwordHash: password,
                status: 'active'
            });

            // Update invite
            await Invite.updateOne(
                { _id: invite._id },
                {
                    status: 'claimed',
                    claimedBy: userId,
                    claimedAt: new Date()
                }
            );

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId, orgId: invite.orgId },
                action: 'INVITE_CLAIMED',
                resource: { type: 'invite', id: invite.inviteId },
                result: 'success'
            });

            // Get org
            const org = await Organization.findOne({ orgId: invite.orgId });

            res.status(201).json({
                success: true,
                message: 'Invite claimed successfully. Please login.',
                data: {
                    userId,
                    organization: org?.name
                }
            });

        } catch (error) {
            console.error('Claim invite error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to claim invite'
            });
        }
    }
);

// ==================== REVOKE INVITE ====================
router.delete('/:inviteId',
    authenticate,
    authorize('OrgAdmin', 'Manager'),
    async (req, res) => {
        try {
            const { inviteId } = req.params;

            const invite = await Invite.findOneAndUpdate(
                { inviteId, orgId: req.orgId, status: 'pending' },
                { status: 'revoked' },
                { new: true }
            );

            if (!invite) {
                return res.status(404).json({
                    success: false,
                    error: 'Invite not found or already claimed'
                });
            }

            await AuditLog.create({
                logId: generateId('LOG'),
                actor: { userId: req.userId, orgId: req.orgId },
                action: 'INVITE_REVOKED',
                resource: { type: 'invite', id: inviteId },
                result: 'success'
            });

            res.json({
                success: true,
                message: 'Invite revoked'
            });

        } catch (error) {
            console.error('Revoke invite error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to revoke invite'
            });
        }
    }
);

export default router;
