/**
 * Grant RETAILER role to specific address
 */

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Granting roles from deployer:", deployer.address);

    // Get contract
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const UniversalLogistics = await ethers.getContractAt("UniversalLogistics", contractAddress);

    // The address that's failing
    const retailerAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";

    // Get RETAILER_ROLE hash
    const RETAILER_ROLE = await UniversalLogistics.RETAILER_ROLE();

    // Check if already has role
    const hasRole = await UniversalLogistics.hasRole(RETAILER_ROLE, retailerAddress);

    if (hasRole) {
        console.log("✓ Address already has RETAILER_ROLE");
    } else {
        console.log("Granting RETAILER_ROLE to:", retailerAddress);
        const tx = await UniversalLogistics.grantRole(RETAILER_ROLE, retailerAddress);
        await tx.wait();
        console.log("✅ RETAILER_ROLE granted!");
        console.log("Tx:", tx.hash);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
