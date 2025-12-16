/**
 * Frontend Configuration
 * 
 * Centralized configuration for environment variables
 */

// API Configuration
// Default to relative URL for production (Vercel same-origin)
// For local development, set VITE_API_URL=http://localhost:5000/api/v1 in .env.local
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Blockchain Configuration
export const BLOCKCHAIN_RPC_URL = import.meta.env.VITE_BLOCKCHAIN_RPC_URL || '';
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

// Feature Flags
export const BLOCKCHAIN_ENABLED = !!BLOCKCHAIN_RPC_URL && BLOCKCHAIN_RPC_URL !== '';

export default {
    API_BASE_URL,
    BLOCKCHAIN_RPC_URL,
    CONTRACT_ADDRESS,
    BLOCKCHAIN_ENABLED
};
