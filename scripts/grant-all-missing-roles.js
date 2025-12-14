/**
 * Grant ALL roles for all known addresses
 * Based on the migration output, grant roles to each address
 */

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Granting roles from deployer:", deployer.address, "\n");

    // Get contract
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const UniversalLogistics = await ethers.getContractAt("UniversalLogistics", contractAddress);

    // Get role hashes
    const MANUFACTURER_ROLE = await UniversalLogistics.MANUFACTURER_ROLE();
    const DISTRIBUTOR_ROLE = await UniversalLogistics.DISTRIBUTOR_ROLE();
    const LOGISTICS_ROLE = await UniversalLogistics.LOGISTICS_ROLE();
    const RETAILER_ROLE = await UniversalLogistics.RETAILER_ROLE();

    // All addresses and their roles (from migration + any retailers)
    const addressRoles = [
        { addr: "0x976EA74026E726554dB657fA54763abd0C3a0aa9", role: MANUFACTURER_ROLE, name: "MAA ENTERPRISES" },
        { addr: "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097", role: DISTRIBUTOR_ROLE, name: "LODHI" },
        { addr: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", role: MANUFACTURER_ROLE, name: "testmytest" },
        { addr: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", role: DISTRIBUTOR_ROLE, name: "steela (same addr)" },
        { addr: "0x976EA74026E726554dB657fA54763abd0C3a0aa9", role: LOGISTICS_ROLE, name: "tata (same as MAA)" },
        { addr: "0xBcd4042DE499D14e55001CcbB24a551F3b954096", role: MANUFACTURER_ROLE, name: "manufacturer number 1" },
        { addr: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", role: LOGISTICS_ROLE, name: "TRANSPORTER2" },
        { addr: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", role: RETAILER_ROLE, name: "RETAILER (if exists)" },
        // Add more retailer addresses if needed
        { addr: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", role: RETAILER_ROLE, name: "Potential Retailer 1" },
        { addr: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", role: RETAILER_ROLE, name: "Potential Retailer 2" },
    ];

    let granted = 0;
    let alreadyHad = 0;

    for (const { addr, role, name } of addressRoles) {
        const hasRole = await UniversalLogistics.hasRole(role, addr);

        if (hasRole) {
            console.log(`✓ ${name} - already has role`);
            alreadyHad++;
        } else {
            try {
                const tx = await UniversalLogistics.grantRole(role, addr);
                await tx.wait();
                console.log(`✅ Granted role to ${name} (${addr.slice(0, 10)}...)`);
                granted++;
            } catch (error) {
                console.error(`❌ Failed for ${name}:`, error.message);
            }
        }
    }

    console.log(`\n📊 Summary: ${granted} granted, ${alreadyHad} already had roles`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
