/**
 * Frontend Configuration
 * 
 * Centralized configuration for environment variables
 */

// API Configuration
// In production (Vercel), use relative URL to avoid CORS
// In development, use localhost backend
const isProduction = import.meta.env.PROD;
export const API_BASE_URL = import.meta.env.VITE_API_URL || (isProduction ? '/api/v1' : 'http://localhost:5000/api/v1');

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
