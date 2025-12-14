# VerifyChain: Complete Workflow & Manual

## 1. System Overview
**VerifyChain** is a decentralized supply chain verification platform. It allows Manufacturers to register products and mint batches, which are then tracked through Distributors and Retailers until they are sold to a Consumer.

**Key Roles:**
- **Manufacturer**: Registers products, Creates Batches.
- **Distributor**: Receives and Forwards stock.
- **Logistics**: (Optional) Transports goods.
- **Retailer**: Sells to Consumers.
- **Regulator**: Initiates recalls.
- **Public/Consumer**: Verifies authenticity.

---

## 2. Quick Start (Current Status)
Your system is currently **fully deployed and running**.

- **Blockchain Node**: Localhost:8545 (Hardhat)
- **Frontend**: Localhost:5173 (Vite)
- **Contract Address**: Loaded automatically from `deployed_address.txt`

---

## 3. Complete Step-by-Step Workflow

### Phase 1: Manufacturing (Producer)
1.  **Register a Product**
    *   Navigate to **Product Registry**.
    *   Fill in product details (e.g., GTIN: `890105`, Name: `Organic Honey`).
    *   Click **Register**.
2.  **Mint a Batch**
    *   Navigate to **Production**.
    *   Enter the Product ID you just registered.
    *   Enter Batch ID (e.g., `B-5001`), Quantity, and Expiry.
    *   Click **Create Batch**.
    *   *Result*: Batch appears in "My Active Batches" with status `Created`.

### Phase 2: Supply Chain (Distribution)
1.  **Transfer to Distributor**
    *   Still in **Production** (or **Logistics**).
    *   Find the batch `B-5001`.
    *   Click **Transfer**.
    *   Select **Distributor** from the dropdown.
    *   Click **Confirm**.
    *   *Result*: Ownership transfers to the Distributor account.

### Phase 3: Retail (Last Mile)
1.  **Distributor Action**
    *   (Optional) Switch Role to **Distributor** (via code/context simulation if testing manually, or use automation).
    *   Navigate to **Logistics**.
    *   Select Batch `B-5001` (now owned by Distributor).
    *   Transfer to **Retailer**.
2.  **Retailer Sale**
    *   Switch Role to **Retailer**.
    *   Navigate to **Inventory**.
    *   You will see Batch `B-5001` in stock.
    *   Click **Sell / Consumer**.
    *   Enter Quantity (e.g., 1 unit).
    *   Click **Confirm Sale**.
    *   *Result*: A receipt is generated.

### Phase 4: Public Verification
1.  **Verify Authenticity**
    *   Navigate to **Verify Product** (Sidebar).
    *   Enter Batch ID `B-5001`.
    *   Click **Verify**.
    *   *Result*: You see the full timeline: Created -> Transferred -> Sold. status is `AUTHENTIC`.

---

## 4. Administrative Actions
-   **Emergency Recall**:
    *   Navigate to **Administration** (Regulator Role).
    *   Enter Batch ID.
    *   Select Reason.
    *   Click **Broadcast Recall**.
    *   *Result*: Verify Product page now shows **RECALLED / UNSAFE** in red.

---

## 5. Automated Verification
You can run the end-to-end test script to verify all contract logic instantly:
```bash
npx hardhat run scripts/test_verifychain.js --network localhost
```
