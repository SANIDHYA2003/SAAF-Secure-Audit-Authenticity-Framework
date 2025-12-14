/**
 * VerifyChain - Authentication Service
 * 
 * Bridges the frontend to the backend API via ApiService.
 * Replaces previous local storage simulation.
 */

import { AuthAPI, OrgAPI, InviteAPI } from './ApiService';

export const AuthService = {
    // ==================== ORGANIZATION REGISTRATION ====================
    async registerOrg(payload) {
        const result = await AuthAPI.register(payload);

        if (!result.success) {
            throw new Error(result.error || 'Registration failed');
        }

        // Return expected format
        return {
            org: { orgId: result.data.orgId }, // Minimum data needed
            user: { userId: result.data.userId },
            otp: result.data.devOtp // only present in dev mode
        };
    },

    // ==================== LOGIN ====================
    async login(emailOrPhone, password) {
        const result = await AuthAPI.login(emailOrPhone, password);

        if (!result.success) {
            throw new Error(result.error || 'Login failed');
        }

        if (result.requiresOTP) {
            // Return intermediate state
            return {
                requiresOTP: true,
                user: {
                    userId: result.userId,
                    profile: { phone: emailOrPhone } // Approximation for UI
                },
                devOtp: result.devOtp
            };
        }

        return {
            user: result.data.user,
            org: result.data.org,
            accessToken: result.data.accessToken,
            refreshToken: result.data.refreshToken
        };
    },

    // ==================== OTP MANAGEMENT ====================
    async sendOTP(phone, purpose = 'login') {
        const result = await AuthAPI.resendOTP(phone, purpose);
        if (!result.success) throw new Error(result.error);
        return result.devOtp; // For dev display
    },

    async verifyOTP(phone, inputOTP) {
        const result = await AuthAPI.verifyOTP(phone, inputOTP);
        if (!result.success) throw new Error(result.error);
        return true;
    },

    // ==================== SESSION MANAGEMENT ====================
    async validateSession(accessToken) {
        // We trust the token if it's there, but verify with /me
        // This is slightly different from local sync check
        try {
            const result = await AuthAPI.getMe();
            if (result.success) {
                return {
                    user: result.data.user,
                    org: result.data.org
                };
            }
            return null;
        } catch {
            return null;
        }
    },

    logout(accessToken) {
        AuthAPI.logout().catch(console.error);
    },

    // ==================== INVITE MANAGEMENT ====================
    async createInvite(orgId, email, role, invitedBy) {
        // orgId and invitedBy are inferred by backend from token
        const result = await InviteAPI.create(email, role);
        if (!result.success) throw new Error(result.error);

        return {
            inviteId: result.data.inviteId,
            code: result.data.code
        };
    },

    async claimInvite(code, { name, email, phone, password }) {
        const result = await InviteAPI.claim(code, { name, email, phone, password });
        if (!result.success) throw new Error(result.error);

        // After claiming, we need to login
        const loginResult = await this.login(email, password);
        return loginResult;
    },

    async validateInvite(code) {
        const result = await InviteAPI.validate(code);
        if (!result.success) throw new Error(result.error);
        return result.data;
    },

    // ==================== DATA ACCESS (New methods for backend) ====================

    async getMyOrg() {
        const result = await OrgAPI.getMyOrg();
        if (!result.success) throw new Error(result.error);
        return result.data;
    },

    async getOrgMembers() {
        const result = await OrgAPI.getMembers();
        if (!result.success) throw new Error(result.error);
        return result.data;
    },

    // ==================== UTILITY (Legacy support where possible) ====================
    // Note: Some synchronous getters are now async or removed

    clearAll() {
        AuthAPI.logout();
    }
};

export default AuthService;
