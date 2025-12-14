# MongoDB Database Schema - VerifyChain

## Database: `blockchainlogistics`

### 📦 **Collections Overview**

#### 1. **users** 👤
**Purpose:** Stores individual user accounts
**Contains:**
- User credentials (email, password hash)
- Personal information (name, phone)
- Authentication data (2FA settings)
- Role references (which organization they belong to)
- Login history

**Example Document:**
```json
{
  "_id": "user123",
  "email": "admin@manufacturer.com",
  "passwordHash": "...",
  "phone": "+91 9876543210",
  "profile": {
    "name": "John Doe",
    "role": "Admin"
  },
  "organizationId": "org456",
  "twoFA": {
    "enabled": true,
    "method": "sms"
  },
  "createdAt": "2024-12-08T..."
}
```

---

#### 2. **organizations** 🏢
**Purpose:** Main organization records for manufacturers, distributors, transporters, retailers
**Contains:**
- Organization details (name, type, address)
- Business info (GST, PAN)
- Blockchain address
- Verification status
- Metadata specific to org type

**Example Document:**
```json
{
  "_id": "org456",
  "name": "ABC Pharmaceuticals Pvt Ltd",
  "type": "manufacturer",
  "email": "contact@abc-pharma.com",
  "phone": "+91 1234567890",
  "gst": "22AAAAA0000A1Z5",
  "pan": "ABCDE1234F",
  "address": "123 Industrial Area, Mumbai",
  "blockchainAddress": "0x1234...",
  "verified": true,
  "meta": {
    "factoryLicense": "FL/2024/12345",
    "productionCapacity": "10000 units/month",
    "productCategories": "Pharmaceuticals"
  },
  "createdAt": "2024-12-08T..."
}
```

---

#### 3. **orgs** 🏭
**Purpose:** **(Duplicate/Legacy?)** - This seems redundant with `organizations`
**Action Needed:** This should probably be removed or merged with `organizations` to avoid confusion

---

#### 4. **invites** 📧
**Purpose:** Organization invitations for team members
**Contains:**
- Invitation tokens
- Sender and recipient info
- Organization reference
- Expiry dates
- Status (pending, accepted, expired)

**Example Document:**
```json
{
  "_id": "invite789",
  "organizationId": "org456",
  "invitedBy": "user123",
  "email": "newuser@example.com",
  "token": "abc123xyz",
  "role": "Manager",
  "status": "pending",
  "expiresAt": "2024-12-15T...",
  "createdAt": "2024-12-08T..."
}
```

---

#### 5. **otps** 🔐
**Purpose:** One-Time Passwords for 2FA and phone verification
**Contains:**
- OTP codes
- User reference
- Purpose (login, registration, reset)
- Expiry time
- Used status

**Example Document:**
```json
{
  "_id": "otp101",
  "userId": "user123",
  "phone": "+91 9876543210",
  "code": "123456",
  "purpose": "login",
  "expiresAt": "2024-12-08T12:15:00Z",
  "used": false,
  "createdAt": "2024-12-08T12:10:00Z"
}
```

---

#### 6. **sessions** 🔑
**Purpose:** Active user sessions for authentication
**Contains:**
- Session tokens
- User reference
- Device info
- IP address
- Expiry time

**Example Document:**
```json
{
  "_id": "session202",
  "userId": "user123",
  "token": "jwt_token_here",
  "deviceInfo": {
    "browser": "Chrome",
    "os": "Windows"
  },
  "ipAddress": "192.168.1.1",
  "expiresAt": "2024-12-15T...",
  "createdAt": "2024-12-08T..."
}
```

---

#### 7. **shipments** 📦
**Purpose:** Shipment records that track product movement
**Contains:**
- Product/batch information
- Source and destination
- Transporter details
- Status (in-transit, delivered, etc.)
- Blockchain transaction reference
- IOT sensor data

**Example Document:**
```json
{
  "_id": "ship303",
  "batchId": "BATCH-2024-001",
  "productId": "PRD-2024-ABC",
  "from": {
    "organizationId": "org456",
    "organizationType": "manufacturer"
  },
  "to": {
    "organizationId": "org789",
    "organizationType": "distributor"
  },
  "transporterId": "trans101",
  "status": "in-transit",
  "blockchain": {
    "txHash": "0xabc123...",
    "blockNumber": 12345
  },
  "iotData": {
    "temperature": 4.5,
    "humidity": 45,
    "location": "Highway 99, KM 45"
  },
  "createdAt": "2024-12-08T...",
  "deliveredAt": null
}
```

---

#### 8. **transporters** 🚚
**Purpose:** **(Seems Redundant)** - Transporter organizations should be in `organizations` collection
**Action Needed:** This should probably be merged into `organizations` where `type: "transporter"`

---

#### 9. **auditlogs** 📋
**Purpose:** Audit trail of all important actions in the system
**Contains:**
- Action type (create, update, delete, transfer)
- User who performed action
- Entity affected
- Timestamp
- IP address
- Changes made

**Example Document:**
```json
{
  "_id": "audit404",
  "userId": "user123",
  "action": "CREATE_BATCH",
  "entityType": "batch",
  "entityId": "BATCH-2024-001",
  "changes": {
    "quantity": 1000,
    "productId": "PRD-2024-ABC"
  },
  "ipAddress": "192.168.1.1",
  "timestamp": "2024-12-08T..."
}
```

---

#### 10. **anchors** ⚓
**Purpose:** Blockchain anchoring records (off-chain to on-chain mapping)
**Contains:**
- Hash of off-chain data
- Blockchain transaction reference
- Timestamp
- Data type

**Example Document:**
```json
{
  "_id": "anchor505",
  "dataHash": "sha256_hash_of_data",
  "dataType": "shipment",
  "dataId": "ship303",
  "blockchain": {
    "txHash": "0xdef456...",
    "blockNumber": 12346,
    "network": "hardhat-local"
  },
  "timestamp": "2024-12-08T..."
}
```

---

## 🎯 **Collection Relationships**

```
users
  └─ belongs to ──> organizations
                        └─ can have ──> shipments
                        └─ can send ──> invites
                        
shipments
  ├─ references ──> organizations (from/to)
  ├─ references ──> transporters (or organizations with type='transporter')
  └─ anchored to ──> anchors (blockchain proof)

otps
  └─ belongs to ──> users (for verification)

sessions
  └─ belongs to ──> users (for auth)

auditlogs
  └─ tracks actions by ──> users
                            └─ on entities like shipments, organizations
```

---

## ⚠️ **RECOMMENDATIONS:**

### **Issues Found:**
1. **Duplicate Collections:**
   - `orgs` and `organizations` - **Keep only `organizations`**
   - `transporters` and `organizations` - **Transporters should be in `organizations` with `type: "transporter"`**

2. **Naming Consistency:**
   - Use full names (`organizations` not `orgs`)
   - Use singular or plural consistently

### **Suggested Cleanup:**
```javascript
// Remove these redundant collections:
db.orgs.drop();
db.transporters.drop();

// Migrate any data from orgs to organizations if needed
// Migrate any transporter data to organizations with type="transporter"
```

---

## 📝 **Summary Table:**

| Collection | Purpose | Keep/Remove | Notes |
|------------|---------|-------------|-------|
| **users** | User accounts | ✅ Keep | Core collection |
| **organizations** | All org types | ✅ Keep | Core collection |
| **orgs** | Duplicate? | ❌ Remove | Merge into organizations |
| **invites** | Team invitations | ✅ Keep | For user management |
| **otps** | 2FA codes | ✅ Keep | For authentication |
| **sessions** | Login sessions | ✅ Keep | For auth tokens |
| **shipments** | Product tracking | ✅ Keep | Core supply chain data |
| **transporters** | Duplicate? | ❌ Remove | Merge into organizations |
| **auditlogs** | Action history | ✅ Keep | For compliance |
| **anchors** | Blockchain proof | ✅ Keep | For blockchain verification |

---

## 🚀 **Next Steps:**

1. Review and clean up duplicate collections
2. Ensure all models in backend match this schema
3. Add indexes for performance
4. Set up proper validation rules
5. Connect to Hardhat blockchain
