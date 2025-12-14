# Medicine Verification System - Smart Contract Setup

This project uses Hyperledger Besu and Hardhat to verify medicine authenticity.

## Project Structure
- **contracts/MedicineVerification.sol**: The smart contract (Solidity 0.8.24).
- **test/MedicineVerification.test.js**: Tests ensuring the contract logic is sound (Register, Update Status, Verify).
- **scripts/deploy.js**: Deployment script to deploy the contract to the Besu network.
- **hardhat.config.js**: Configuration for Hardhat (ChainID 2025, RPC port 8545).

## Prerequisites
- Node.js (Installed)
- Hyperledger Besu Nodes (Must be running with RPC enabled)

## How to Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Compile Contracts
```bash
npx hardhat compile
```

### 3. Run Tests
Running tests on the local Hardhat network (simulates exact blockchain logic):
```bash
npx hardhat test
```

### 4. Deploy to Besu
Ensure your Besu nodes are running. Default configuration assumes Node 1 is at `http://127.0.0.1:8545`.

If your node is on a different port (e.g., 8546), update `hardhat.config.js`.

To deploy:
```bash
npx hardhat run scripts/deploy.js --network besu
```

## "Crypto Free" Execution
The `hardhat.config.js` is configured with `gasPrice: 0`. This allow transactions to be processed without ETH cost, provided the Besu network allows zero gas price (common in private networks).
