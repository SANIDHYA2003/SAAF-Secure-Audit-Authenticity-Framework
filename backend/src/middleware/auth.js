/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user to request
 */

import jwt from 'jsonwebtoken';
import { User, Session } from '../models/index.js';

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        // Check if session is still valid (not revoked)
        const session = await Session.findOne({
            userId: decoded.userId,
            isRevoked: false,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Session invalid or expired'
            });
        }

        // Get user
        const user = await User.findOne({ userId: decoded.userId });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({
                success: false,
                error: 'Account suspended'
            });
        }

        // Attach to request
        req.user = user;
        req.userId = user.userId;
        req.orgId = user.orgId;
        req.roles = user.roles;
        req.sessionId = session.sessionId;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

/**
 * Role-based authorization
 * Usage: authorize('OrgAdmin', 'Manager')
 */
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.roles) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        const hasRole = req.roles.some(role => allowedRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                required: allowedRoles,
                have: req.roles
            });
        }

        next();
    };
};

/**
 * Optional authentication
 * Attaches user if token present, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({ userId: decoded.userId });
        if (user && user.status !== 'suspended') {
            req.user = user;
            req.userId = user.userId;
            req.orgId = user.orgId;
            req.roles = user.roles;
        }
    } catch (err) {
        // Ignore invalid tokens for optional auth
    }

    next();
};

/**
 * Org ownership check
 * Ensures user belongs to the specified organization
 */
export const requireOrgAccess = (paramName = 'orgId') => {
    return (req, res, next) => {
        const targetOrgId = req.params[paramName] || req.body[paramName];

        if (req.orgId !== targetOrgId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized for this organization'
            });
        }

        next();
    };
};

export default authenticate;
