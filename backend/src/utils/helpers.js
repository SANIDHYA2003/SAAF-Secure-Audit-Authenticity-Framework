/**
 * Utility Functions
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate unique ID with optional prefix
 */
export const generateId = (prefix = '') => {
    const uuid = uuidv4();
    return prefix ? `${prefix}-${uuid.split('-')[0]}` : uuid;
};

/**
 * Generate short code (for invites)
 */
export const generateCode = (length = 8) => {
    return crypto.randomBytes(length)
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, length)
        .toUpperCase();
};

/**
 * Generate 6-digit OTP
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Compute SHA-256 hash
 */
export const computeHash = (data) => {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Hash OTP for storage (simple SHA-256)
 */
export const hashOTP = (otp) => {
    return computeHash(otp);
};

/**
 * Format phone number (basic normalization)
 */
export const normalizePhone = (phone) => {
    if (!phone) return '';
    // Remove all non-numeric except leading +
    let normalized = phone.replace(/[^\d+]/g, '');
    // Ensure Indian number format
    if (normalized.length === 10) {
        normalized = '+91' + normalized;
    }
    return normalized;
};

/**
 * Validate GST number format
 */
export const isValidGST = (gst) => {
    if (!gst) return false;
    // GST format: 2 digits + 10 char PAN + 1 digit + Z + 1 alphanumeric
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Mask sensitive data for logging
 */
export const maskSensitive = (str, showFirst = 3, showLast = 3) => {
    if (!str || str.length <= showFirst + showLast) return str;
    const first = str.substring(0, showFirst);
    const last = str.substring(str.length - showLast);
    const masked = '*'.repeat(Math.min(str.length - showFirst - showLast, 5));
    return `${first}${masked}${last}`;
};

/**
 * Parse pagination params
 */
export const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

/**
 * Create pagination response
 */
export const paginatedResponse = (data, total, { page, limit }) => {
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasMore: page * limit < total
        }
    };
};

/**
 * Sleep utility
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
    generateId,
    generateCode,
    generateOTP,
    computeHash,
    hashOTP,
    normalizePhone,
    isValidGST,
    isValidEmail,
    maskSensitive,
    parsePagination,
    paginatedResponse,
    sleep
};
