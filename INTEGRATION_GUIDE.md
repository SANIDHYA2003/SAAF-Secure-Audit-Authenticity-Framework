# 🔗 Backend & Hardhat Integration Guide

## 📋 Table of Contents
1. [MongoDB Collections Explained](#mongodb-collections)
2. [Blockchain Integration](#blockchain-integration)
3. [How to Use](#how-to-use)
4. [API Examples](#api-examples)

---

## 📊 MongoDB Collections Explained

### **Core Collections (KEEP)**

#### 1. **users** 👤
- **Purpose:** Individual user accounts
- **Use:** Login credentials, profile, 2FA
- **Example:** Admin user of "ABC Pharma"

#### 2. **organizations** 🏢
- **Purpose:** ALL organizations (manufacturers, distributors, transporters, retailers)
- **Use:** Company details, GST/PAN, blockchain address
- **Example:** "ABC Pharmaceuticals Pvt Ltd" (manufacturer)

#### 3. **invites** 📧
- **Purpose:** Team member invitations
- **Use:** Invite new users to join your organization
- **Example:** Invite a manager to your company

#### 4. **otps** 🔐
- **Purpose:** One-Time Passwords for verification
- **Use:** 2FA login, phone verification during registration
- **Example:** "123456" sent to your phone

#### 5. **sessions** 🔑
- **Purpose:** Active login sessions
- **Use:** JWT tokens, session management
- **Example:** Your current logged-in session

#### 6. **shipments** 📦
- **Purpose:** Product movement tracking
- **Use:** Track products moving between organizations
- **Example:** Batch moving from manufacturer to distributor

#### 7. **auditlogs** 📋
- **Purpose:** Action history
- **Use:** Track who did what and when
- **Example:** "User X created batch Y at time Z"

#### 8. **anchors** ⚓
- **Purpose:** Blockchain proof records
- **Use:** Link off-chain data to on-chain transactions
- **Example:** Shipment data hash stored on blockchain

### **Redundant Collections (REMOVE/MERGE)**  

#### ❌ **orgs** 
- **Issue:** Duplicate of `organizations`
- **Action:** DELETE or merge into `organizations`

#### ❌ **transporters**
- **Issue:** Should be in `organizations` with `type: "transporter"`
- **Action:** DELETE or merge into `organizations`

---

## 🔗 Blockchain Integration

### **Architecture:**

```
Frontend (React)
    ↓
Backend (Express + MongoDB)
    ↓
BlockchainService.js
    ↓
Hardhat Local Network (http://localhost:8545)
    ↓
Smart Contracts (VerifyChain, UniversalLogistics)
```

### **How It Works:**

1. **User Action** (e.g., create batch)
2. **Backend receives request** → Saves to MongoDB
3. **Backend calls blockchainService** → Writes to Hardhat
4. **Transaction confirmed** → Update MongoDB with tx hash
5. **Audit log created** → Track the action

### **Data Flow Example:**

```
Manufacturer creates batch:
  1. POST /api/v1/batches/create
  2. Save to MongoDB > batches collection
  3. Call blockchainService.createBatch()
  4. Hardhat executes smart contract
  5. Get tx hash back
  6. Update MongoDB batch with {blockchain: {txHash, blockNumber}}
  7. Create audit log
  8. Return success to frontend
```

---

## 🚀 How to Use

### **1. Start Services**

```bash
# Terminal 1: Start Hardhat local node
cd d:\besu-private-network
npx hardhat node

# Terminal 2: Start Backend
cd d:\besu-private-network\backend
npm run dev

# Terminal 3: Start Frontend
cd d:\besu-private-network\blockchain-explorer
npm run dev
```

### **2. Deploy Contracts (if not already)**

```bash
cd d:\besu-private-network
npx hardhat run scripts/deploy.js --network localhost
```

### **3. Backend will auto-connect to Hardhat**

Look for these logs:
```
🔗 Connecting to Hardhat network...
✅ Connected to network: hardhat (chainId: 31337)
✅ VerifyChain loaded at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ UniversalLogistics loaded at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

---

## 📡 API Examples

### **Register Organization**

```javascript
// POST /api/v1/auth/register
{
  "name": "ABC Pharmaceuticals",
  "type": "manufacturer",
  "email": "admin@abc.com",
  "phone": "+91 9876543210",
  "password": "securepass123",
  "gst": "22AAAAA0000A1Z5",
  "meta": {
    "factoryLicense": "FL/2024/12345",
    "productionCapacity": "10000 units/month"
  }
}

// Backend will:
// 1. Create user in MongoDB
// 2. Create organization in MongoDB
// 3. Generate blockchain address
// 4. Call blockchainService.registerOrganization()
// 5. Return success with org details
```

### **Create Batch**

```javascript
// POST /api/v1/batches/create
{
  "productId": "PRD-2024-001",
  "productName": "Paracetamol 500mg",
  "quantity": 10000,
  "manufacturingDate": "2024-12-08",
  "expiryDate": "2026-12-08"
}

// Backend will:
// 1. Save batch to MongoDB
// 2. Call blockchainService.createBatch()
// 3. Get batchId and txHash from blockchain
// 4. Update MongoDB with blockchain data
// 5. Create audit log
// 6. Return batch with blockchain proof
```

### **Create Shipment**

```javascript
// POST /api/v1/shipments/create
{
  "batchId": "BATCH-2024-001",
  "fromOrganization": "org123",
  "toOrganization": "org456",
  "transporter": "org789",
  "expectedDelivery": "2024-12-15"
}

// Backend will:
// 1. Save shipment to MongoDB
// 2. Call blockchainService.createShipment()
// 3. Get shipmentId and txHash
// 4. Update MongoDB
// 5. Notify transporter
// 6. Return shipment details
```

### **Log IoT Data**

```javascript
// POST /api/v1/shipments/:id/sensor-data
{
  "temperature": 4.5,
  "humidity": 45,
  "location": "Highway 99, KM 45"
}

// Backend will:
// 1. Validate shipment exists
// 2. Call blockchainService.logSensorData()
// 3. Store on blockchain for tamper-proof record
// 4. Update shipment in MongoDB
// 5. Check if temperature is within range
// 6. Alert if anomaly detected
```

### **Verify Product**

```javascript
// GET /api/v1/products/verify/:productId

// Backend will:
// 1. Call blockchainService.verifyProduct()
// 2. Get verification from smart contract
// 3. Fetch complete history from MongoDB
// 4. Return:
{
  "productId": "PRD-2024-001",
  "isValid": true,
  "batch": {...},
  "manufacturer": {...},
  "shipments": [...],
  "currentLocation": "Retailer ABC",
  "verifiedAt": "2024-12-08T18:58:00Z"
}
```

---

## 🔧 Service Methods

### **blockchainService.js Methods:**

```javascript
// Connection
await blockchainService.connect();

// Organization
await blockchainService.registerOrganization({
  name, orgType, blockchainAddress
});

// Batches
await blockchainService.createBatch({
  productId, quantity, manufacturerAddress
});
await blockchainService.getBatch(batchId);

// Shipments
await blockchainService.createShipment({
  batchId, from, to, transporter
});
await blockchainService.updateShipmentStatus(shipmentId, 'delivered');
await blockchainService.getShipment(shipmentId);

// IoT
await blockchainService.logSensorData(
  shipmentId, temperature, humidity, location
);

// Verification
await blockchainService.verifyProduct(productId);

// Network Info
await blockchainService.getNetworkInfo();
await blockchainService.getGasPrice();
```

---

## ✅ Setup Checklist

- [ ] MongoDB Atlas connected
- [ ] Hardhat node running on localhost:8545
- [ ] Contracts deployed to Hardhat
- [ ] Backend can connect to Hardhat
- [ ] Backend can create users/organizations
- [ ] Backend can create batches → blockchain
- [ ] Backend can create shipments → blockchain
- [ ] Backend can log IoT data → blockchain
- [ ] Frontend can fetch and display data
- [ ] Consumer can verify products

---

## 🐛 Troubleshooting

### **Backend can't connect to Hardhat:**
```bash
# Make sure Hardhat is running
npx hardhat node

# Check if contracts are deployed
# deployed_address.json should exist
```

### **Collections confusion:**
```javascript
// Use this mapping:
users → User accounts
organizations → ALL org types (manufacturers, distributors, transporters, retailers)
invites → Team invitations
otps → 2FA codes
sessions → Login sessions
shipments → Product tracking
auditlogs → Action history
anchors → Blockchain proof

// Delete these:
orgs → Duplicate
transporters → Duplicate
```

### **MongoDB queries:**
```javascript
// Get all manufacturers
db.organizations.find({ type: "manufacturer" })

// Get all shipments for an org
db.shipments.find({ 
  $or: [
    { "from.organizationId": "org123" },
    { "to.organizationId": "org123" }
  ]
})

// Get user's organization
db.users.findOne({ _id: "user123" })
db.organizations.findOne({ _id: user.organizationId })
```

---

## 🎯 Summary

**MongoDB Collections:**
- **10 total collections**
- **8 needed** (users, organizations, invites, otps, sessions, shipments, auditlogs, anchors)
- **2 redundant** (orgs, transporters) → DELETE

**Blockchain:**
- **BlockchainService** connects backend to Hardhat
- **Every major action** is recorded on blockchain
- **MongoDB stores details**, blockchain stores proof
- **Consumer can verify** using product ID or QR code

**Next Steps:**
1. Clean up redundant collections
2. Test blockchain integration
3. Create API endpoints that use blockchainService
4. Test end-to-end flow
