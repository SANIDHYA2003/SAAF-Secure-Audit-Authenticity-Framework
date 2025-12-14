import React, { createContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BLOCKCHAIN_RPC_URL, BLOCKCHAIN_ENABLED } from './config';

// ==================== DEMO ADDRESSES (Hardhat local accounts) ====================
export const ADDRESSES = {
    MANUFACTURER: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    DISTRIBUTOR: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    LOGISTICS: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    RETAILER: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    REGULATOR: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    CONSUMER: "0x0000000000000000000000000000000000000000"
};

export const ROLES = {
    MANUFACTURER: "manufacturer",
    DISTRIBUTOR: "distributor",
    LOGISTICS: "transporter",
    RETAILER: "retailer",
    REGULATOR: "regulator",
    CONSUMER: "consumer"
};

const ROLE_TO_SIGNER_INDEX = {
    [ROLES.MANUFACTURER]: 1,
    [ROLES.DISTRIBUTOR]: 2,
    [ROLES.LOGISTICS]: 3,
    [ROLES.RETAILER]: 4,
    [ROLES.REGULATOR]: 5,
    [ROLES.CONSUMER]: 0
};

export const AppContext = createContext(null);

export function AppContextProvider({ children, isDemoMode = true, currentRole = ROLES.MANUFACTURER, currentOrg = null }) {
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [blockchainError, setBlockchainError] = useState(null);
    const [blockchainEnabled, setBlockchainEnabled] = useState(BLOCKCHAIN_ENABLED);

    // Initialize blockchain on mount - works for BOTH demo AND authenticated users
    useEffect(() => {
        // Skip blockchain init if not enabled (for Vercel deployment without blockchain)
        if (!BLOCKCHAIN_ENABLED) {
            console.log('⚠️ Blockchain disabled - running in API-only mode');
            setBlockchainError('Blockchain not configured - running in API-only mode');
            setBlockchainEnabled(false);
            return;
        }

        // ALWAYS reset contract when role/org changes So that we re-initialize with correct signer
        setContract(null);
        initializeBlockchain().catch(err => {
            console.error('Auto-init failed:', err);
        });
    }, [currentRole, currentOrg]);

    const initializeBlockchain = async () => {
        setLoading(true);
        setBlockchainError(null);
        try {
            const jsonProvider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);

            // Test connection first
            await jsonProvider.getNetwork();
            setProvider(jsonProvider);

            // Determine which wallet to use
            let signer;
            let signerAddress;

            if (currentOrg && currentOrg.onChain?.address) {
                // Use organization's unique wallet address (WORKS FOR BOTH PROD AND DEMO IF ORG IS SET)
                signerAddress = currentOrg.onChain.address;
                console.log('🏢 Using organization wallet:', signerAddress);

                // Find the signer index for this address
                const signerIndex = await findSignerIndexForAddress(jsonProvider, signerAddress);
                signer = await jsonProvider.getSigner(signerIndex);
            } else {
                // Fall back to role-based signer (ONLY if org is missing or has no wallet)
                const signerIndex = ROLE_TO_SIGNER_INDEX[currentRole] ?? 0;
                signer = await jsonProvider.getSigner(signerIndex);
                signerAddress = await signer.getAddress();
                console.log('🎭 Using role-based wallet:', signerAddress);
            }

            setAddress(signerAddress);

            // Load contract
            try {
                const addressJson = await import('../deployed_address.json');
                const contractJson = await import('../UniversalLogistics.json');

                const contractInstance = new ethers.Contract(
                    addressJson.address,
                    contractJson.abi,
                    signer
                );

                // Verify contract is deployed
                await contractInstance.getAddress();

                setContract(contractInstance);
                setBlockchainError(null);

                return contractInstance;
            } catch (contractError) {
                console.error('Contract loading error:', contractError);
                throw new Error('Contract not deployed. Run: npx hardhat run scripts/deploy.js --network localhost');
            }

        } catch (error) {
            console.error('Blockchain init error:', error);
            const errorMsg = error.message || 'Blockchain node not available';
            setBlockchainError(errorMsg);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Helper function to find signer index for a given address
    async function findSignerIndexForAddress(provider, targetAddress) {
        // Hardhat has 20 signers (0-19)
        for (let i = 0; i < 20; i++) {
            try {
                const signer = await provider.getSigner(i);
                const addr = await signer.getAddress();
                if (addr.toLowerCase() === targetAddress.toLowerCase()) {
                    return i;
                }
            } catch (e) {
                continue;
            }
        }
        // If not found, return role-based index as fallback
        return ROLE_TO_SIGNER_INDEX[currentRole] ?? 0;
    }

    const getContract = async () => {
        // If contract exists, return it
        if (contract) {
            return contract;
        }

        // Try to initialize
        try {
            const contractInstance = await initializeBlockchain();
            return contractInstance;
        } catch (error) {
            console.error('Failed to initialize blockchain:', error);
            const errorMsg = '❌ Blockchain Error:\n' +
                '1. Ensure Hardhat is running: npx hardhat node\n' +
                '2. Deploy contract: npx hardhat run scripts/deploy.js --network localhost\n' +
                '3. Refresh this page\n\n' +
                'Error: ' + error.message;
            throw new Error(errorMsg);
        }
    };

    const switchRole = async (newRole) => {
        console.log('Switch role requested:', newRole);
    };

    const value = {
        currentRole,
        address,
        provider,
        contract,
        getContract,
        switchRole,
        loading,
        isDemoMode,
        blockchainError,
        blockchainEnabled,
        ADDRESSES,
        ROLES
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

// Export alias for backward compatibility
export const AppProvider = AppContextProvider;

export default AppContext;
