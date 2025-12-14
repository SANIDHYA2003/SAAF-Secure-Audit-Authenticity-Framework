# Enterprise Medicine Verification System

A blockchain-based pharmaceutical supply chain & verification system using **Hyperledger Besu** and **Hardhat**.

## Features Implemented
- **Role-Based Access Control (RBAC)**: Distinct roles for Manufacturer, Distributor, Pharmacy, Logistics, Regulator.
- **Batch Management**: Manufacturers register medicines in batches for efficiency.
- **Full Custody Chain**: Tracks every status change (Manufactured -> Shipped -> Sold) with handler, timestamp, and location.
- **Recall System**: Regulators or Manufacturers can recall faulty batches, instantly freezing further transfers.
- **Upgradeable (UUPS)**: The contract logic can be upgraded without changing the contract address (Crucial for enterprise compliance).
- **Fallback Verification**: Supports verification via **Manual Entry of UID** (Unique Alphanumeric String) if QR code scanning fails.
- **Crypto-Free Execution**: Configured for zero-gas networks (private Besu).

## Contracts
- `contracts/MedicineVerificationEnterprise.sol`: The main logic.

## Setup & Running

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Compile**
   ```bash
   npx hardhat compile
   ```

3. **Run Tests** (Verifies all logic)
   ```bash
   npx hardhat test test/MedicineVerificationEnterprise.test.js
   ```

4. **Deploy to Besu Network**
   *Ensure your Besu nodes are running on port 8545.*
   ```bash
   npx hardhat run scripts/deploy_enterprise.js --network besu
   ```

## Roles Setup (Post-Deployment)
After deployment, the `deployer` account has `DEFAULT_ADMIN_ROLE`.
You should grant roles to other addresses using a script or console:
```javascript
// Example in Hardhat Console
let factory = await ethers.getContractAt("MedicineVerificationEnterprise", "PROXY_ADDRESS");
await factory.grantRole(await factory.MANUFACTURER_ROLE(), "0xManufacturerAddress...");
```

## How to Verify (Frontend Logic)
1. **Scan QR Code**: App extracts the `uid` string.Calls `verifyMedicine(uid)`.
2. **Fallback**: If scanner fails, User types `uid` string manually. App calls `verifyMedicine(uid)`.
   - Returns: Validity, Name, Batch, Status, Handler, Recall Status.
