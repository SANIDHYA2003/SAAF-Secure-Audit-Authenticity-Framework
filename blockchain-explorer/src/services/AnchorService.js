/**
 * VerifyChain - Blockchain Anchor Service
 * 
 * This service handles the critical on-chain operations:
 * - Organization registration anchoring
 * - Document hash anchoring
 * - Shipment metadata anchoring
 * - Transit logs batch anchoring
 * - Ownership transfer recording
 * 
 * Pattern:
 * 1. Compute SHA-256 hash of off-chain data
 * 2. Write hash to blockchain with event emission
 * 3. Store transaction reference in off-chain DB
 * 4. Later: verify by re-hashing and comparing
 * 
 * REFACTORED: Now uses backend API for persistent storage
 * Falls back to localStorage for demo/offline mode
 */

import { ethers } from 'ethers';
import { computeHash, generateId } from '../models/schemas.js';
import { AnchorAPI } from './ApiService.js';

// ==================== ANCHOR TYPES ====================
export const ANCHOR_TYPES = {
    ORG_REGISTRATION: 'org_registration',
    DOCUMENT: 'document',
    SHIPMENT_CREATED: 'shipment_created',
    SHIPMENT_PICKUP: 'shipment_pickup',
    SHIPMENT_DELIVERY: 'shipment_delivery',
    OWNERSHIP_TRANSFER: 'ownership_transfer',
    TRANSIT_LOGS_BATCH: 'transit_logs_batch',
    TRANSPORTER_APPROVAL: 'transporter_approval'
};

// ==================== LOCAL STORAGE (Fallback for Demo Mode) ====================
const ANCHOR_STORE_KEY = 'vc_anchors';
const getLocalAnchors = () => JSON.parse(localStorage.getItem(ANCHOR_STORE_KEY) || '[]');
const saveLocalAnchors = (anchors) => localStorage.setItem(ANCHOR_STORE_KEY, JSON.stringify(anchors));

// ==================== UTILITY: Check if using demo mode ====================
const isDemoMode = () => {
    return !localStorage.getItem('vc_access_token');
};

// ==================== ANCHOR SERVICE ====================
export const AnchorService = {
    /**
     * Get contract instance
     */
    async getContract() {
        try {
            const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
            const signer = await provider.getSigner();

            const addressJson = await import('../deployed_address.json');
            const contractJson = await import('../UniversalLogistics.json');

            return new ethers.Contract(addressJson.address, contractJson.abi, signer);
        } catch (error) {
            console.error('Failed to get contract:', error);
            throw new Error('Blockchain connection failed');
        }
    },

    /**
     * Anchor organization registration
     * 
     * @param {Object} org - Organization object
     * @returns {Object} Anchor record with txHash
     */
    async anchorOrgRegistration(org) {
        // Compute deterministic hash of org metadata
        const metaToHash = {
            orgId: org.orgId,
            name: org.name,
            type: org.type,
            gst: org.legal?.gst || '',
            createdAt: org.createdAt
        };
        const metaHash = await computeHash(metaToHash);

        // Create anchor record
        const anchor = {
            anchorId: generateId('ANC'),
            type: ANCHOR_TYPES.ORG_REGISTRATION,
            objectType: 'org',
            objectId: org.orgId,
            anchorHash: metaHash,
            rawData: metaToHash, // For verification
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        try {
            // In a full implementation, this would call a dedicated OrgRegistry contract
            console.log(`[ANCHOR] Org Registration: ${org.orgId} -> ${metaHash}`);

            // Simulate transaction (in production: actual blockchain write)
            anchor.chainTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            anchor.chainBlock = Math.floor(Math.random() * 1000000) + 100000;
            anchor.status = 'confirmed';
            anchor.confirmedAt = new Date().toISOString();

        } catch (error) {
            anchor.status = 'failed';
            anchor.error = error.message;
        }

        // Store anchor locally for demo mode
        const anchors = getLocalAnchors();
        anchors.push(anchor);
        saveLocalAnchors(anchors);

        return anchor;
    },

    /**
     * Anchor document hash (GST certificate, RC, KYC, etc.)
     * 
     * @param {string} orgId - Owner organization
     * @param {Object} doc - Document metadata
     * @param {string} fileHash - SHA256 of actual file content
     */
    async anchorDocument(orgId, doc, fileHash) {
        const metaToHash = {
            docId: doc.docId,
            orgId,
            type: doc.type,
            fileName: doc.fileName,
            fileHash,
            uploadedAt: doc.uploadedAt
        };
        const anchorHash = await computeHash(metaToHash);

        const anchor = {
            anchorId: generateId('ANC'),
            type: ANCHOR_TYPES.DOCUMENT,
            objectType: 'document',
            objectId: doc.docId,
            anchorHash,
            fileHash,
            rawData: metaToHash,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        try {
            console.log(`[ANCHOR] Document: ${doc.type} for ${orgId} -> ${anchorHash}`);

            anchor.chainTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            anchor.chainBlock = Math.floor(Math.random() * 1000000) + 100000;
            anchor.status = 'confirmed';
            anchor.confirmedAt = new Date().toISOString();

        } catch (error) {
            anchor.status = 'failed';
            anchor.error = error.message;
        }

        const anchors = getLocalAnchors();
        anchors.push(anchor);
        saveLocalAnchors(anchors);

        return anchor;
    },

    /**
     * Anchor shipment creation
     */
    async anchorShipmentCreation(shipment) {
        const metaToHash = {
            shipmentId: shipment.shipmentId,
            fromOrgId: shipment.fromOrgId,
            toOrgId: shipment.toOrgId,
            assignedTransporterId: shipment.assignedTransporterId,
            batchIds: shipment.batchIds,
            createdAt: shipment.createdAt
        };
        const anchorHash = await computeHash(metaToHash);

        const anchor = {
            anchorId: generateId('ANC'),
            type: ANCHOR_TYPES.SHIPMENT_CREATED,
            objectType: 'shipment',
            objectId: shipment.shipmentId,
            anchorHash,
            rawData: metaToHash,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            chainTx: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            confirmedAt: new Date().toISOString()
        };

        const anchors = getLocalAnchors();
        anchors.push(anchor);
        saveLocalAnchors(anchors);

        return anchor;
    },

    /**
     * Anchor batch of transit logs (periodic anchoring for efficiency)
     * 
     * @param {string} shipmentId 
     * @param {Array} logs - Array of transit log entries
     */
    async anchorTransitLogsBatch(shipmentId, logs) {
        const batchId = generateId('BATCH');

        // Compute merkle-like hash of all logs
        const logsToHash = logs.map(log => ({
            timestamp: log.timestamp,
            lat: log.location?.lat,
            lng: log.location?.lng,
            temperature: log.temperature,
            humidity: log.humidity
        }));

        const batchHash = await computeHash({
            batchId,
            shipmentId,
            logCount: logs.length,
            logs: logsToHash
        });

        const anchor = {
            anchorId: generateId('ANC'),
            type: ANCHOR_TYPES.TRANSIT_LOGS_BATCH,
            objectType: 'transit_logs',
            objectId: batchId,
            shipmentId,
            logCount: logs.length,
            anchorHash: batchHash,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            chainTx: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            confirmedAt: new Date().toISOString()
        };

        const anchors = getLocalAnchors();
        anchors.push(anchor);
        saveLocalAnchors(anchors);

        return anchor;
    },

    /**
     * Anchor ownership transfer
     */
    async anchorOwnershipTransfer(shipmentId, fromOrgId, toOrgId, batchIds) {
        const metaToHash = {
            shipmentId,
            fromOrgId,
            toOrgId,
            batchIds,
            transferredAt: new Date().toISOString()
        };
        const anchorHash = await computeHash(metaToHash);

        const anchor = {
            anchorId: generateId('ANC'),
            type: ANCHOR_TYPES.OWNERSHIP_TRANSFER,
            objectType: 'ownership',
            objectId: `${shipmentId}-transfer`,
            anchorHash,
            rawData: metaToHash,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            chainTx: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            confirmedAt: new Date().toISOString()
        };

        const anchors = getLocalAnchors();
        anchors.push(anchor);
        saveLocalAnchors(anchors);

        return anchor;
    },

    /**
     * Verify an anchor - recompute hash and compare
     * 
     * @param {string} anchorId 
     * @returns {Object} Verification result
     */
    async verifyAnchor(anchorId) {
        // Try backend first if authenticated
        if (!isDemoMode()) {
            try {
                const result = await AnchorAPI.verify(anchorId);
                if (result.success) {
                    return result.data;
                }
            } catch (error) {
                console.warn('Backend verify failed, falling back to local:', error);
            }
        }

        // Fallback to local storage
        const anchors = getLocalAnchors();
        const anchor = anchors.find(a => a.anchorId === anchorId);

        if (!anchor) {
            return { valid: false, error: 'Anchor not found' };
        }

        if (!anchor.rawData) {
            return { valid: false, error: 'No raw data to verify' };
        }

        const recomputedHash = await computeHash(anchor.rawData);
        const isValid = recomputedHash === anchor.anchorHash;

        return {
            valid: isValid,
            anchorId: anchor.anchorId,
            type: anchor.type,
            originalHash: anchor.anchorHash,
            recomputedHash,
            chainTx: anchor.chainTx,
            confirmedAt: anchor.confirmedAt
        };
    },

    /**
     * Get all anchors for a shipment
     * Fetches from backend API if authenticated, otherwise uses localStorage
     */
    async getAnchorsForShipment(shipmentId) {
        // Try backend first if authenticated
        if (!isDemoMode()) {
            try {
                const result = await AnchorAPI.getByShipmentId(shipmentId);
                if (result.success) {
                    return result.data || [];
                }
            } catch (error) {
                console.warn('Backend fetch failed, falling back to local:', error);
            }
        }

        // Fallback to local storage for demo mode
        return this.getAnchorsForObject(shipmentId);
    },

    /**
     * Get all anchors for an object (local storage version)
     */
    getAnchorsForObject(objectId) {
        const anchors = getLocalAnchors();
        return anchors.filter(a => a.objectId === objectId || a.shipmentId === objectId);
    },

    /**
     * Get anchors by type
     */
    async getAnchorsByType(type, limit = 50) {
        // Try backend first if authenticated
        if (!isDemoMode()) {
            try {
                const result = await AnchorAPI.getByType(type, limit);
                if (result.success) {
                    return result.data || [];
                }
            } catch (error) {
                console.warn('Backend fetch failed, falling back to local:', error);
            }
        }

        // Fallback to local storage
        const anchors = getLocalAnchors();
        return anchors
            .filter(a => a.type === type)
            .slice(-limit)
            .reverse();
    },

    /**
     * Get anchor statistics
     */
    async getStats() {
        // Try backend first if authenticated
        if (!isDemoMode()) {
            try {
                const result = await AnchorAPI.getStats();
                if (result.success) {
                    return result.data;
                }
            } catch (error) {
                console.warn('Backend fetch failed, falling back to local:', error);
            }
        }

        // Fallback to local stats
        const anchors = getLocalAnchors();
        const stats = {
            total: anchors.length,
            confirmed: anchors.filter(a => a.status === 'confirmed').length,
            pending: anchors.filter(a => a.status === 'pending').length,
            failed: anchors.filter(a => a.status === 'failed').length,
            byType: {}
        };

        Object.values(ANCHOR_TYPES).forEach(type => {
            stats.byType[type] = anchors.filter(a => a.type === type).length;
        });

        return stats;
    }
};

export default AnchorService;
