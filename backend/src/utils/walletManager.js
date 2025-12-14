/**
 * Wallet Address Manager
 * Maps organization IDs to unique Hardhat wallet addresses
 */

// Hardhat default accounts (20 test accounts with 10000 ETH each)
const HARDHAT_ADDRESSES = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Account 0
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account 1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account 2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Account 3
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // Account 4
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", //Account 5
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9", // Account 6
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", // Account 7
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", // Account 8
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", // Account 9
    "0xBcd4042DE499D14e55001CcbB24a551F3b954096", // Account 10
    "0x71bE63f3384f5fb98995898A86B02Fb2426c5788", // Account 11
    "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a", // Account 12
    "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec", // Account 13
    "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097", // Account 14
    "0xcd3B766CCDd6AE721141F452C550Ca635964ce71", // Account 15
    "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", // Account 16
    "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E", // Account 17
    "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", // Account 18
    "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"  // Account 19
];

// Simple hash function to convert orgId to a number
function hashOrgId(orgId) {
    let hash = 0;
    for (let i = 0; i < orgId.length; i++) {
        const char = orgId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Get a deterministic wallet address for an organization
 * @param {string} orgId - Organization ID (e.g., "ORG-526581a5")
 * @param {string} type - Organization type (manufacturer, distributor, transporter, retailer)
 * @returns {string} Ethereum wallet address
 */
export function getWalletForOrg(orgId, type) {
    // Reserve first 6 addresses for demo/system accounts
    const RESERVED_ADDRESSES = 6;

    // Hash the orgId to get a consistent index
    const hash = hashOrgId(orgId);

    // Map to an available address (6-19)
    const availableAddresses = HARDHAT_ADDRESSES.length - RESERVED_ADDRESSES;
    const index = RESERVED_ADDRESSES + (hash % availableAddresses);

    return HARDHAT_ADDRESSES[index];
}

/**
 * Get signer index for an organization's wallet address
 * @param {string} address - Wallet address
 * @returns {number} Signer index (0-19)
 */
export function getSignerIndexForAddress(address) {
    const index = HARDHAT_ADDRESSES.findIndex(
        addr => addr.toLowerCase() === address.toLowerCase()
    );
    return index >= 0 ? index : 0;
}

export default {
    getWalletForOrg,
    getSignerIndexForAddress,
    HARDHAT_ADDRESSES
};
