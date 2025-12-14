import { ethers } from "ethers";
import ContractABI from "../UniversalLogistics.json";

// Assuming standard hardhat node port
const RPC_URL = "http://127.0.0.1:8545";

// Match the new JSON file path
import addressData from "../deployed_address.json";
const CONTRACT_ADDRESS = addressData.address;

export const getProvider = () => {
    return new ethers.JsonRpcProvider(RPC_URL);
}

export const getContract = async (providerOrSigner) => {
    let signer;
    if (providerOrSigner) {
        signer = providerOrSigner;
    } else {
        const provider = getProvider();
        // Default to first signer for read-only if no signer provided
        try {
            signer = await provider.getSigner();
        } catch (e) {
            // Fallback to provider only (read-only) if no signer available (rare in simple JsonRpcProvider)
            return new ethers.Contract(CONTRACT_ADDRESS, ContractABI.abi, provider);
        }
    }

    return new ethers.Contract(CONTRACT_ADDRESS, ContractABI.abi, signer);
}
