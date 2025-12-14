/**
 * Grant Blockchain Roles to Organization Wallets
 * Run: npx hardhat run scripts/grant-roles.js --network localhost
 */

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Granting roles from deployer:", deployer.address);

    // Get contract
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const UniversalLogistics = await ethers.getContractAt("UniversalLogistics", contractAddress);

    // Organization wallet addresses from migration
    const orgs = [
        { name: "MAA ENTERPRISES", type: "manufacturer", address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9" },
        { name: "LODHI", type: "distributor", address: "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097" },
        { name: "testmytest", type: "manufacturer", address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30" },
        { name: "steela", type: "distributor", address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30" }, // Same as testmytest!
        { name: "tata", type: "transporter", address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9" }, // Same as MAA!
        { name: "manufacturer number 1", type: "manufacturer", address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096" },
        { name: "TRANSPORTER2", type: "transporter", address: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199" }
    ];

    // Get role hashes
    const MANUFACTURER_ROLE = await UniversalLogistics.MANUFACTURER_ROLE();
    const DISTRIBUTOR_ROLE = await UniversalLogistics.DISTRIBUTOR_ROLE();
    const LOGISTICS_ROLE = await UniversalLogistics.LOGISTICS_ROLE();
    const RETAILER_ROLE = await UniversalLogistics.RETAILER_ROLE();

    const roleMap = {
        'manufacturer': MANUFACTURER_ROLE,
        'distributor': DISTRIBUTOR_ROLE,
        'transporter': LOGISTICS_ROLE,
        'retailer': RETAILER_ROLE
    };

    // Track which addresses we've already granted roles to
    const processedAddresses = new Set();

    for (const org of orgs) {
        const address = org.address;
        const role = roleMap[org.type];

        // Skip if we already processed this address for this role
        const key = `${address}-${org.type}`;
        if (processedAddresses.has(key)) {
            console.log(`⏭️  Skipping ${org.name} - address already processed for ${org.type} role`);
            continue;
        }
        processedAddresses.add(key);

        // Check if already has role
        const hasRole = await UniversalLogistics.hasRole(role, address);

        if (hasRole) {
            console.log(`✓ ${org.name} (${org.type}) already has role`);
            console.log(`  Address: ${address}\n`);
        } else {
            try {
                // Grant role
                const tx = await UniversalLogistics.grantRole(role, address);
                await tx.wait();
                console.log(`✅ Granted ${org.type} role to ${org.name}`);
                console.log(`   Address: ${address}`);
                console.log(`   Tx: ${tx.hash}\n`);
            } catch (error) {
                console.error(`❌ Failed to grant role to ${org.name}:`, error.message, '\n');
            }
        }
    }

    console.log('🎉 Role grants complete!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
