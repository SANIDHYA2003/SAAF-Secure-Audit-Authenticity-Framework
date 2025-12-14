# VerifyChain - Enterprise Identity & Authentication System

## 🏗️ Architecture Overview

This document describes the multi-tenant identity management system for VerifyChain.

---

## 1. Core Components

### Smart Contracts

| Contract | Purpose |
|----------|---------|
| `UniversalLogistics.sol` | Product, Batch, Shipment management + Transporter Pool |
| `OrganizationRegistry.sol` | Organization registration, verification, invites, partnerships |

### Frontend Components

| Component | Purpose |
|-----------|---------|
| `AuthContext.jsx` | Authentication state, registration, login, invites |
| `LoginPage.jsx` | User authentication |
| `RegisterPage.jsx` | 2-step organization registration |

---

## 2. Identity Model

### Organizations (Primary Entities)

```
Organization {
    id: "ORG-123456789"
    name: "ABC Pharma Pvt Ltd"
    gstNumber: "22AAAAA0000A1Z5"
    orgType: "Manufacturer" | "Distributor" | "Transporter" | "Retailer"
    status: "pending" | "verified" | "suspended"
    walletAddress: "0x..."
    walletPrivateKey: "..." // In production: KMS/HSM
    createdAt: "2024-01-01T00:00:00Z"
    verifiedAt: null
}
```

### Users (Sub-Entities)

```
User {
    id: "USR-123456789"
    email: "admin@company.com"
    name: "John Doe"
    role: "OrgAdmin" | "Manager" | "Operator" | "Driver"
    orgId: "ORG-123456789"  // Linked organization
    createdAt: "2024-01-01T00:00:00Z"
}
```

### Invites

```
Invite {
    code: "INV-ABC12345"
    orgId: "ORG-123456789"
    email: "new-user@company.com"
    role: "Manager"
    status: "pending" | "claimed" | "expired"
    expiresAt: "2024-01-08T00:00:00Z"
}
```

---

## 3. Onboarding Flows

### A. Organization Self-Registration

1. User fills **Step 1**: Email + Password
2. User fills **Step 2**: Org Name, GST, Type, Address, Phone
3. System creates:
   - Organization record (status: pending)
   - Admin User record
   - Blockchain wallet (keypair)
4. User is auto-logged in
5. Platform admin verifies org → status: verified

### B. Invite-Based User Onboarding

1. Org Admin clicks "Invite Team Member"
2. Enters email + role (Admin/Manager/Operator/Driver)
3. System generates invite code: `INV-ABC12345`
4. Admin shares code with invitee
5. Invitee uses code to register → auto-linked to org

### C. Transporter Approval (MFG Pool)

1. **Manufacturer** adds transporter directly to their pool
   - OR **Distributor** requests transporter addition
2. Manufacturer reviews and approves/rejects
3. Approved transporters appear in dropdown when creating shipments

---

## 4. Association Model

### Partner Relationships

```
Manufacturer ←→ Distributor ←→ Retailer
           ↓                ↓
       Transporter      Transporter
```

### On-Chain Enforcement

- Shipment creation binds: `sender`, `receiver`, `transporter`
- Only assigned transporter can call `confirmPickup()`, `completeDelivery()`
- Only assigned receiver can call `acceptDelivery()`
- Wrong parties → Transaction reverts

---

## 5. Storage Architecture

### Current (Development)

| Data | Storage |
|------|---------|
| Organizations | LocalStorage (`verifychain_orgs`) |
| Users | LocalStorage (`verifychain_users`) |
| Invites | LocalStorage (`verifychain_invites`) |
| Session | LocalStorage (`verifychain_session`) |
| Wallet Map | LocalStorage (`verifychain_wallets`) |

### Production (Recommended)

| Data | Storage |
|------|---------|
| Organizations | PostgreSQL + IPFS for docs |
| Users | PostgreSQL + Redis session cache |
| Wallets/Keys | AWS KMS / HashiCorp Vault |
| Critical Events | Blockchain (on-chain) |
| Metadata | IPFS + hash on-chain |

---

## 6. Security Layers

### App Layer
- JWT-based sessions
- Password hashing (bcrypt in production)
- Email/OTP verification

### Blockchain Layer
- Org-level keypairs for signing
- Role-based access control (OpenZeppelin)
- Event emission for audit trail

### Production Additions
- HSM/KMS for key management
- 2FA/MFA
- IP whitelisting for enterprises
- API rate limiting

---

## 7. API Design (Production)

```
POST /api/organizations          # Register org
POST /api/organizations/:id/verify  # Admin verifies
POST /api/auth/login            # Login
POST /api/auth/logout           # Logout
POST /api/invites               # Create invite
POST /api/invites/:code/claim   # Claim invite
GET  /api/partners              # List partners
POST /api/partnerships/request  # Request partnership
POST /api/partnerships/approve/:id  # Approve partnership
POST /api/shipments             # Create shipment (calls blockchain)
```

---

## 8. Scaling Considerations

### Multi-Tenant Data Isolation
- All queries filter by `orgId`
- Partition database by organization

### High Throughput
- Cache frequently accessed data (Redis)
- Batch blockchain writes for logs
- Use Layer-2 or private chain for high TPS

### Global Distribution
- Use CDN for frontend
- Regional database replicas
- Consider Hyperledger Fabric for geo-distributed consensus

---

## 9. Demo Mode

For testing, click **"Continue with Demo Accounts"** on login page.
This uses hardcoded Hardhat accounts:

| Role | Address |
|------|---------|
| Manufacturer | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 |
| Distributor | 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC |
| Logistics | 0x90F79bf6EB2c4f870365E785982E1f101E93b906 |
| Retailer | 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 |

---

## 10. Next Steps

1. ☐ Add email verification (SendGrid/SES)
2. ☐ Implement document upload (S3 + IPFS)
3. ☐ Add GST API verification
4. ☐ Build admin dashboard for verification
5. ☐ Migrate storage to PostgreSQL
6. ☐ Implement KMS integration for production keys
7. ☐ Add partnership request/approval UI
8. ☐ Build driver mobile app with QR scanning
