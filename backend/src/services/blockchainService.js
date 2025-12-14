const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

class BlockchainService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contracts = {};
        this.connected = false;
    }

    /**
     * Initialize connection to Hardhat local network
     */
    async connect() {
        try {
            console.log('🔗 Connecting to Hardhat network...');

            // Connect to local Hardhat node
            this.provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

            // Get the first signer (default account)
            const accounts = await this.provider.listAccounts();
            if (accounts.length === 0) {
                throw new Error('No accounts found on Hardhat network');
            }

            this.signer = accounts[0];

            // Test connection
            const network = await this.provider.getNetwork();
            console.log(`✅ Connected to network: ${network.name} (chainId: ${network.chainId})`);

            // Load deployed contracts
            await this.loadContracts();

            this.connected = true;
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to Hardhat:', error.message);
            this.connected = false;
            throw error;
        }
    }

    /**
     * Load deployed contract addresses and ABIs
     */
    async loadContracts() {
        try {
            // Paths to contract artifacts
            const contractsPath = path.join(__dirname, '../../blockchain-explorer/src');

            // Load VerifyChain contract
            const verifyChainABI = JSON.parse(
                fs.readFileSync(path.join(contractsPath, 'VerifyChain.json'), 'utf8')
            );

            // Load UniversalLogistics contract
            const logisticsABI = JSON.parse(
                fs.readFileSync(path.join(contractsPath, 'UniversalLogistics.json'), 'utf8')
            );

            // Load deployed addresses
            const deployedAddresses = JSON.parse(
                fs.readFileSync(path.join(contractsPath, 'deployed_address.json'), 'utf8')
            );

            // Initialize contract instances
            if (deployedAddresses.VerifyChain) {
                this.contracts.verifyChain = new ethers.Contract(
                    deployedAddresses.VerifyChain,
                    verifyChainABI.abi,
                    this.signer
                );
                console.log(`✅ VerifyChain loaded at: ${deployedAddresses.VerifyChain}`);
            }

            if (deployedAddresses.UniversalLogistics) {
                this.contracts.logistics = new ethers.Contract(
                    deployedAddresses.UniversalLogistics,
                    logisticsABI.abi,
                    this.signer
                );
                console.log(`✅ UniversalLogistics loaded at: ${deployedAddresses.UniversalLogistics}`);
            }

        } catch (error) {
            console.warn('⚠️  Could not load all contracts:', error.message);
            console.warn('   Make sure contracts are deployed first');
        }
    }

    /**
     * Register an organization on blockchain
     */
    async registerOrganization(orgData) {
        if (!this.connected) {
            throw new Error('Blockchain not connected');
        }

        try {
            const { name, orgType, blockchainAddress } = orgData;

            // Convert orgType to number (0=Manufacturer, 1=Distributor, 2=Transporter, 3=Retailer)
            const typeMap = {
                'manufacturer': 0,
                'distributor': 1,
                'transporter': 2,
                'retailer': 3
            };

            const orgTypeNum = typeMap[orgType.toLowerCase()] || 0;

            console.log(`📝 Registering organization: ${name} (${orgType})`);

            const tx = await this.contracts.verifyChain.registerOrganization(
                blockchainAddress,
                name,
                orgTypeNum
            );

            const receipt = await tx.wait();

            console.log(`✅ Organization registered. Tx: ${receipt.hash}`);

            return {
                success: true,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error('❌ Failed to register organization:', error);
            throw error;
        }
    }

    /**
     * Create a batch on blockchain
     */
    async createBatch(batchData) {
        try {
            const { productId, quantity, manufacturerAddress } = batchData;

            console.log(`📦 Creating batch for product: ${productId}`);

            const tx = await this.contracts.verifyChain.createBatch(
                productId,
                quantity,
                manufacturerAddress
            );

            const receipt = await tx.wait();

            // Get batch ID from event
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.contracts.verifyChain.interface.parseLog(log);
                    return parsed.name === 'BatchCreated';
                } catch {
                    return false;
                }
            });

            const batchId = event ?
                this.contracts.verifyChain.interface.parseLog(event).args.batchId.toString() :
                null;

            console.log(`✅ Batch created. ID: ${batchId}, Tx: ${receipt.hash}`);

            return {
                success: true,
                batchId,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('❌ Failed to create batch:', error);
            throw error;
        }
    }

    /**
     * Create shipment on blockchain
     */
    async createShipment(shipmentData) {
        try {
            const { batchId, from, to, transporter } = shipmentData;

            console.log(`🚚 Creating shipment for batch: ${batchId}`);

            const tx = await this.contracts.logistics.createShipment(
                batchId,
                from,
                to,
                transporter
            );

            const receipt = await tx.wait();

            // Get shipment ID from event
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.contracts.logistics.interface.parseLog(log);
                    return parsed.name === 'ShipmentCreated';
                } catch {
                    return false;
                }
            });

            const shipmentId = event ?
                this.contracts.logistics.interface.parseLog(event).args.shipmentId.toString() :
                null;

            console.log(`✅ Shipment created. ID: ${shipmentId}, Tx: ${receipt.hash}`);

            return {
                success: true,
                shipmentId,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('❌ Failed to create shipment:', error);
            throw error;
        }
    }

    /**
     * Update shipment status
     */
    async updateShipmentStatus(shipmentId, status) {
        try {
            console.log(`📝 Updating shipment ${shipmentId} status to: ${status}`);

            // Status codes: 0=Pending, 1=InTransit, 2=Delivered, 3=Cancelled
            const statusMap = {
                'pending': 0,
                'in-transit': 1,
                'delivered': 2,
                'cancelled': 3
            };

            const statusCode = statusMap[status.toLowerCase()] || 0;

            const tx = await this.contracts.logistics.updateShipmentStatus(
                shipmentId,
                statusCode
            );

            const receipt = await tx.wait();

            console.log(`✅ Shipment status updated. Tx: ${receipt.hash}`);

            return {
                success: true,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('❌ Failed to update shipment status:', error);
            throw error;
        }
    }

    /**
     * Log IoT sensor data
     */
    async logSensorData(shipmentId, temperature, humidity, location) {
        try {
            console.log(`📊 Logging sensor data for shipment: ${shipmentId}`);

            const tx = await this.contracts.logistics.logSensorData(
                shipmentId,
                Math.round(temperature * 10), // Convert to 0.1 degree precision
                Math.round(humidity * 10),     // Convert to 0.1% precision
                location
            );

            const receipt = await tx.wait();

            console.log(`✅ Sensor data logged. Tx: ${receipt.hash}`);

            return {
                success: true,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('❌ Failed to log sensor data:', error);
            throw error;
        }
    }

    /**
     * Get batch details from blockchain
     */
    async getBatch(batchId) {
        try {
            const batch = await this.contracts.verifyChain.getBatch(batchId);

            return {
                batchId: batch.batchId.toString(),
                productId: batch.productId,
                quantity: batch.quantity.toString(),
                manufacturer: batch.manufacturer,
                createdAt: new Date(Number(batch.timestamp) * 1000),
                verified: batch.verified
            };
        } catch (error) {
            console.error('❌ Failed to get batch:', error);
            throw error;
        }
    }

    /**
     * Get shipment details from blockchain
     */
    async getShipment(shipmentId) {
        try {
            const shipment = await this.contracts.logistics.getShipment(shipmentId);

            return {
                shipmentId: shipment.shipmentId.toString(),
                batchId: shipment.batchId.toString(),
                from: shipment.from,
                to: shipment.to,
                transporter: shipment.transporter,
                status: shipment.status,
                createdAt: new Date(Number(shipment.createdAt) * 1000),
                updatedAt: Number(shipment.updatedAt) > 0 ?
                    new Date(Number(shipment.updatedAt) * 1000) : null
            };
        } catch (error) {
            console.error('❌ Failed to get shipment:', error);
            throw error;
        }
    }

    /**
     * Verify product authenticity
     */
    async verifyProduct(productId) {
        try {
            const isValid = await this.contracts.verifyChain.verifyProduct(productId);

            return {
                productId,
                isValid,
                verifiedAt: new Date()
            };
        } catch (error) {
            console.error('❌ Failed to verify product:', error);
            throw error;
        }
    }

    /**
     * Get current gas price
     */
    async getGasPrice() {
        const gasPrice = await this.provider.getFeeData();
        return {
            gasPrice: gasPrice.gasPrice.toString(),
            maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString()
        };
    }

    /**
     * Get blockchain network info
     */
    async getNetworkInfo() {
        const network = await this.provider.getNetwork();
        const blockNumber = await this.provider.getBlockNumber();
        const gasPrice = await this.getGasPrice();

        return {
            chainId: network.chainId.toString(),
            name: network.name,
            blockNumber,
            gasPrice,
            connected: this.connected
        };
    }
}

// Singleton instance
const blockchainService = new BlockchainService();

module.exports = blockchainService;
