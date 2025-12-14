/**
 * Grant ALL Missing Blockchain Roles
 * This script queries MongoDB for all organizations and grants appropriate roles
 */

const hre = require("hardhat");
const { MongoClient } = require('mongodb');

// Hardhat wallet addresses
const HARDHAT_ADDRESSES = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // 0
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // 1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // 2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // 3
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // 4
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", // 5
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9", // 6
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", // 7
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", // 8
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", // 9
    "0xBcd4042DE499D14e55001CcbB24a551F3b954096", // 10
    "0x71bE63f3384f5fb98995898A86B02Fb2426c5788", // 11
    "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a", // 12
    "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec", // 13
    "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097", // 14
    "0xcd3B766CCDd6AE721141F452C550Ca635964ce71", // 15
    "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", // 16
    "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E", // 17
    "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", // 18
    "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"  // 19
];

async function main() {
    let client;
    try {
        // Connect to MongoDB
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/verifychain';
        client = new MongoClient(uri);
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db('verifychain');
        const orgsCollection = db.collection('organizations');

        // Get deployer (account 0)
        const [deployer] = await hre.ethers.getSigners();
        console.log('👤 Using deployer:', deployer.address);

        // Get contract
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const UniversalLogistics = await hre.ethers.getContractAt("UniversalLogistics", contractAddress);
        console.log('✅ Connected to contract\n');

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

        // Get all organizations from MongoDB
        const orgs = await orgsCollection.find({}).toArray();
        console.log(`📋 Found ${orgs.length} organizations in database\n`);

        let granted = 0;
        let alreadyHad = 0;
        let skipped = 0;

        for (const org of orgs) {
            if (!org.onChain?.address) {
                console.log(`⚠️  ${org.name} - No wallet address`);
                skipped++;
                continue;
            }

            const address = org.onChain.address;
            const role = roleMap[org.type];

            if (!role) {
                console.log(`⚠️  ${org.name} - Unknown type: ${org.type}`);
                skipped++;
                continue;
            }

            // Check if address has the role
            const hasRole = await UniversalLogistics.hasRole(role, address);

            if (hasRole) {
                console.log(`✓ ${org.name} (${org.type})`);
                console.log(`  Already has role - ${address}\n`);
                alreadyHad++;
            } else {
                try {
                    // Grant the role
                    const tx = await UniversalLogistics.grantRole(role, address);
                    await tx.wait();
                    console.log(`✅ GRANTED ${org.type} role to ${org.name}`);
                    console.log(`   Address: ${address}`);
                    console.log(`   Tx: ${tx.hash}\n`);
                    granted++;
                } catch (error) {
                    console.error(`❌ Failed to grant role to ${org.name}:`, error.message, '\n');
                    skipped++;
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY:');
        console.log(`   ✅ Roles granted: ${granted}`);
        console.log(`   ✓ Already had roles: ${alreadyHad}`);
        console.log(`   ⚠️  Skipped: ${skipped}`);
        console.log('='.repeat(60));

        await client.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        if (client) await client.close();
        process.exit(1);
    }
}

main();
