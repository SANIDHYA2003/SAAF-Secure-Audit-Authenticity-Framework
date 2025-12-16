/**
 * API Service for VerifyChain Backend
 * 
 * Handles all HTTP requests to the backend API
 */

import { API_BASE_URL } from '../config.js';

// ==================== HTTP CLIENT ====================

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.accessToken = localStorage.getItem('vc_access_token');
        this.refreshToken = localStorage.getItem('vc_refresh_token');
    }

    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        if (accessToken) localStorage.setItem('vc_access_token', accessToken);
        if (refreshToken) localStorage.setItem('vc_refresh_token', refreshToken);
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('vc_access_token');
        localStorage.removeItem('vc_refresh_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.accessToken && !options.noAuth) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            const data = await response.json();

            // Handle token expiration
            if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry the request with new token
                    headers['Authorization'] = `Bearer ${this.accessToken}`;
                    const retryResponse = await fetch(url, { ...options, headers });
                    return retryResponse.json();
                }
            }

            if (!response.ok) {
                throw new ApiError(data.error || 'Request failed', response.status, data);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(error.message || 'Network error', 0);
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) return false;

        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (!response.ok) {
                this.clearTokens();
                return false;
            }

            const data = await response.json();
            this.accessToken = data.accessToken;
            localStorage.setItem('vc_access_token', data.accessToken);
            return true;
        } catch {
            this.clearTokens();
            return false;
        }
    }

    get(endpoint, options = {}) {
        return this.request(endpoint, { method: 'GET', ...options });
    }

    post(endpoint, body, options = {}) {
        return this.request(endpoint, { method: 'POST', body, ...options });
    }

    patch(endpoint, body, options = {}) {
        return this.request(endpoint, { method: 'PATCH', body, ...options });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { method: 'DELETE', ...options });
    }
}

class ApiError extends Error {
    constructor(message, status, data = {}) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

// ==================== API SINGLETON ====================
const api = new ApiClient();

// ==================== AUTH API ====================
export const AuthAPI = {
    async register(data) {
        const result = await api.post('/auth/register', data, { noAuth: true });
        return result;
    },

    async login(emailOrPhone, password) {
        const result = await api.post('/auth/login', { emailOrPhone, password }, { noAuth: true });
        if (result.success && result.data) {
            api.setTokens(result.data.accessToken, result.data.refreshToken);
        }
        return result;
    },

    async verifyOTP(phone, otp, purpose = 'registration') {
        return api.post('/auth/otp/verify', { phone, otp, purpose }, { noAuth: true });
    },

    async resendOTP(phone, purpose = 'registration') {
        return api.post('/auth/otp/resend', { phone, purpose }, { noAuth: true });
    },

    async logout() {
        try {
            await api.post('/auth/logout', {});
        } finally {
            api.clearTokens();
        }
    },

    async getMe() {
        return api.get('/auth/me');
    },

    isAuthenticated() {
        return !!api.accessToken;
    }
};

// ==================== ORGANIZATION API ====================
export const OrgAPI = {
    async getMyOrg() {
        return api.get('/orgs/me');
    },

    async updateMyOrg(data) {
        return api.patch('/orgs/me', data);
    },

    async getMembers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return api.get(`/orgs/me/members${query ? '?' + query : ''}`);
    },

    async listOrgs(params = {}) {
        const query = new URLSearchParams(params).toString();
        return api.get(`/orgs${query ? '?' + query : ''}`);
    },

    async getOrg(orgId) {
        return api.get(`/orgs/${orgId}`);
    },

    async verifyOrg(orgId, status, notes) {
        return api.post(`/orgs/${orgId}/verify`, { status, notes });
    },

    async suspendOrg(orgId, reason) {
        return api.post(`/orgs/${orgId}/suspend`, { reason });
    }
};

// ==================== INVITE API ====================
export const InviteAPI = {
    async create(email, role, phone) {
        return api.post('/invites', { email, role, phone });
    },

    async list() {
        return api.get('/invites');
    },

    async validate(code) {
        return api.get(`/invites/validate/${code}`, { noAuth: true });
    },

    async claim(code, data) {
        return api.post(`/invites/claim/${code}`, data, { noAuth: true });
    },

    async revoke(inviteId) {
        return api.delete(`/invites/${inviteId}`);
    }
};

// ==================== SHIPMENT API ====================
export const ShipmentAPI = {
    async create(data) {
        return api.post('/shipments', data);
    },

    async list(params = {}) {
        const query = new URLSearchParams(params).toString();
        return api.get(`/shipments${query ? '?' + query : ''}`);
    },

    async get(shipmentId, includeLogs = false) {
        return api.get(`/shipments/${shipmentId}?includeLogs=${includeLogs}`);
    },

    async confirmPickup(shipmentId, data) {
        return api.post(`/shipments/${shipmentId}/pickup`, data);
    },

    async addTransitLog(shipmentId, data) {
        return api.post(`/shipments/${shipmentId}/logs`, data);
    },

    async completeDelivery(shipmentId, data) {
        return api.post(`/shipments/${shipmentId}/deliver`, data);
    },

    async acceptDelivery(shipmentId) {
        return api.post(`/shipments/${shipmentId}/accept`, {});
    },

    async rejectDelivery(shipmentId, reason) {
        return api.post(`/shipments/${shipmentId}/reject`, { reason });
    },

    async getTransporterAssignments(status) {
        const query = status ? `?status=${status}` : '';
        return api.get(`/shipments/transporter/assignments${query}`);
    }
};

// ==================== ANCHOR API ====================
export const AnchorAPI = {
    async getByShipmentId(shipmentId) {
        return api.get(`/anchors/shipment/${shipmentId}`);
    },

    async getById(anchorId) {
        return api.get(`/anchors/${anchorId}`);
    },

    async getByType(type, limit = 50) {
        return api.get(`/anchors?type=${type}&limit=${limit}`);
    },

    async verify(anchorId) {
        return api.post(`/anchors/${anchorId}/verify`, {});
    },

    async getStats() {
        return api.get('/anchors/stats');
    }
};

// ==================== HEALTH CHECK ====================
export const checkHealth = async () => {
    try {
        const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
        return response.ok;
    } catch {
        return false;
    }
};

export default {
    AuthAPI,
    OrgAPI,
    InviteAPI,
    ShipmentAPI,
    AnchorAPI,
    checkHealth,
    api
};
