import React, { createContext, useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';

// ==================== STORAGE SERVICE ====================
// In production, replace with API calls to your backend

const StorageService = {
    // Organizations
    getOrgs: () => JSON.parse(localStorage.getItem('verifychain_orgs') || '[]'),
    saveOrg: (org) => {
        const orgs = StorageService.getOrgs();
        orgs.push(org);
        localStorage.setItem('verifychain_orgs', JSON.stringify(orgs));
        return org;
    },
    getOrgByGST: (gst) => StorageService.getOrgs().find(o => o.gstNumber === gst),
    getOrgById: (id) => StorageService.getOrgs().find(o => o.id === id),
    updateOrg: (id, updates) => {
        const orgs = StorageService.getOrgs().map(o => o.id === id ? { ...o, ...updates } : o);
        localStorage.setItem('verifychain_orgs', JSON.stringify(orgs));
    },

    // Users
    getUsers: () => JSON.parse(localStorage.getItem('verifychain_users') || '[]'),
    saveUser: (user) => {
        const users = StorageService.getUsers();
        users.push(user);
        localStorage.setItem('verifychain_users', JSON.stringify(users));
        return user;
    },
    getUserByEmail: (email) => StorageService.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()),
    getUserById: (id) => StorageService.getUsers().find(u => u.id === id),
    updateUser: (id, updates) => {
        const users = StorageService.getUsers().map(u => u.id === id ? { ...u, ...updates } : u);
        localStorage.setItem('verifychain_users', JSON.stringify(users));
    },

    // Invites
    getInvites: () => JSON.parse(localStorage.getItem('verifychain_invites') || '[]'),
    saveInvite: (invite) => {
        const invites = StorageService.getInvites();
        invites.push(invite);
        localStorage.setItem('verifychain_invites', JSON.stringify(invites));
        return invite;
    },
    getInviteByCode: (code) => StorageService.getInvites().find(i => i.code === code),
    updateInvite: (code, updates) => {
        const invites = StorageService.getInvites().map(i => i.code === code ? { ...i, ...updates } : i);
        localStorage.setItem('verifychain_invites', JSON.stringify(invites));
    },

    // Session
    getSession: () => JSON.parse(localStorage.getItem('verifychain_session') || 'null'),
    saveSession: (session) => localStorage.setItem('verifychain_session', JSON.stringify(session)),
    clearSession: () => localStorage.removeItem('verifychain_session'),

    // Wallet Mapping
    getWalletMap: () => JSON.parse(localStorage.getItem('verifychain_wallets') || '{}'),
    linkWallet: (userId, walletAddress) => {
        const map = StorageService.getWalletMap();
        map[walletAddress.toLowerCase()] = userId;
        localStorage.setItem('verifychain_wallets', JSON.stringify(map));
    },
    getUserByWallet: (walletAddress) => {
        const map = StorageService.getWalletMap();
        const userId = map[walletAddress?.toLowerCase()];
        return userId ? StorageService.getUserById(userId) : null;
    }
};

// ==================== AUTH CONTEXT ====================

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentOrg, setCurrentOrg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [walletAddress, setWalletAddress] = useState(null);

    // Check session on mount
    useEffect(() => {
        const session = StorageService.getSession();
        if (session?.userId) {
            const user = StorageService.getUserById(session.userId);
            if (user) {
                setCurrentUser(user);
                if (user.orgId) {
                    setCurrentOrg(StorageService.getOrgById(user.orgId));
                }
            }
        }
        setLoading(false);
    }, []);

    // ==================== ORGANIZATION REGISTRATION ====================
    const registerOrganization = async ({ name, gstNumber, email, password, orgType, address, phone }) => {
        // Check if GST already registered
        if (StorageService.getOrgByGST(gstNumber)) {
            throw new Error('Organization with this GST already exists');
        }
        if (StorageService.getUserByEmail(email)) {
            throw new Error('Email already registered');
        }

        // Generate IDs
        const orgId = 'ORG-' + Date.now();
        const userId = 'USR-' + Date.now();

        // Create wallet for the org (in production, use KMS)
        const wallet = ethers.Wallet.createRandom();

        // Create Organization
        const org = StorageService.saveOrg({
            id: orgId,
            name,
            gstNumber,
            email,
            phone,
            address,
            orgType,
            status: 'pending', // pending | verified | suspended
            walletAddress: wallet.address,
            walletPrivateKey: wallet.privateKey, // In production: store in KMS!
            createdAt: new Date().toISOString(),
            verifiedAt: null
        });

        // Create Admin User
        const user = StorageService.saveUser({
            id: userId,
            email,
            passwordHash: btoa(password), // In production: use bcrypt!
            name: name + ' Admin',
            role: 'OrgAdmin',
            orgId: orgId,
            createdAt: new Date().toISOString()
        });

        // Link wallet
        StorageService.linkWallet(userId, wallet.address);

        // Auto-login
        StorageService.saveSession({ userId: user.id, orgId: org.id });
        setCurrentUser(user);
        setCurrentOrg(org);
        setWalletAddress(wallet.address);

        return { user, org };
    };

    // ==================== LOGIN ====================
    const login = async (email, password) => {
        const user = StorageService.getUserByEmail(email);
        if (!user) throw new Error('User not found');
        if (user.passwordHash !== btoa(password)) throw new Error('Invalid password');

        const org = user.orgId ? StorageService.getOrgById(user.orgId) : null;

        StorageService.saveSession({ userId: user.id, orgId: org?.id });
        setCurrentUser(user);
        setCurrentOrg(org);
        if (org?.walletAddress) setWalletAddress(org.walletAddress);

        return { user, org };
    };

    // ==================== LOGOUT ====================
    const logout = () => {
        StorageService.clearSession();
        setCurrentUser(null);
        setCurrentOrg(null);
        setWalletAddress(null);
    };

    // ==================== INVITE MEMBER ====================
    const inviteMember = async (email, role) => {
        if (!currentOrg) throw new Error('No organization');

        const code = 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const invite = StorageService.saveInvite({
            code,
            orgId: currentOrg.id,
            email,
            role,
            status: 'pending',
            createdBy: currentUser.id,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

        return invite;
    };

    // ==================== CLAIM INVITE ====================
    const claimInvite = async (code, { name, email, password }) => {
        const invite = StorageService.getInviteByCode(code);
        if (!invite) throw new Error('Invalid invite code');
        if (invite.status !== 'pending') throw new Error('Invite already used or expired');
        if (new Date(invite.expiresAt) < new Date()) throw new Error('Invite expired');

        const org = StorageService.getOrgById(invite.orgId);
        if (!org) throw new Error('Organization not found');

        // Create user
        const userId = 'USR-' + Date.now();
        const user = StorageService.saveUser({
            id: userId,
            email,
            passwordHash: btoa(password),
            name,
            role: invite.role,
            orgId: invite.orgId,
            createdAt: new Date().toISOString()
        });

        // Update invite
        StorageService.updateInvite(code, { status: 'claimed', claimedBy: userId });

        // Auto-login
        StorageService.saveSession({ userId: user.id, orgId: org.id });
        setCurrentUser(user);
        setCurrentOrg(org);
        if (org.walletAddress) setWalletAddress(org.walletAddress);

        return { user, org };
    };

    // ==================== GET CONTRACT (with org wallet) ====================
    const getContract = async () => {
        if (!currentOrg?.walletPrivateKey) {
            throw new Error('No wallet configured for organization');
        }

        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const wallet = new ethers.Wallet(currentOrg.walletPrivateKey, provider);

        const addressJson = await import('../deployed_address.json');
        const contractJson = await import('../UniversalLogistics.json');

        return new ethers.Contract(addressJson.address, contractJson.abi, wallet);
    };

    const value = {
        currentUser,
        currentOrg,
        walletAddress,
        loading,
        isAuthenticated: !!currentUser,
        isOrgVerified: currentOrg?.status === 'verified',

        // Actions
        registerOrganization,
        login,
        logout,
        inviteMember,
        claimInvite,
        getContract,

        // Storage service for direct access
        StorageService
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
