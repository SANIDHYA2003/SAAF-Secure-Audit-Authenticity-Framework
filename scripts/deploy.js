const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    try {
        console.log("Getting signers...");
        const signers = await hre.ethers.getSigners();
        console.log("Got", signers.length, "signers");

        const deployer = signers[0];
        const mfr = signers[1];
        const dist = signers[2];
        const logistics = signers[3];
        const retailer = signers[4];
        const regulator = signers[5];

        console.log("Deploying UniversalLogistics with account:", deployer.address);

        console.log("Getting contract factory...");
        const UniversalLogistics = await hre.ethers.getContractFactory("UniversalLogistics");

        console.log("Deploying contract...");
        const contract = await UniversalLogistics.deploy();

        console.log("Waiting for deployment...");
        await contract.waitForDeployment();
        const address = await contract.getAddress();

        console.log("UniversalLogistics deployed to:", address);

        // Grant Roles
        console.log("Granting roles...");
        await contract.grantManufacturerRole(mfr.address);
        console.log("  Manufacturer:", mfr.address);

        await contract.grantDistributorRole(dist.address);
        console.log("  Distributor:", dist.address);

        await contract.grantLogisticsRole(logistics.address);
        console.log("  Logistics:", logistics.address);

        await contract.grantRetailerRole(retailer.address);
        console.log("  Retailer:", retailer.address);

        const REGULATOR_ROLE = await contract.REGULATOR_ROLE();
        await contract.grantRole(REGULATOR_ROLE, regulator.address);
        console.log("  Regulator:", regulator.address);

        // Grant roles to additional accounts for registered organizations
        // These map to Hardhat accounts 6-19 which may be assigned to orgs during registration
        console.log("Granting roles to additional accounts for organizations...");
        for (let i = 6; i < Math.min(signers.length, 20); i++) {
            const addr = signers[i].address;
            // Grant all primary roles so any org can operate
            await contract.grantManufacturerRole(addr);
            await contract.grantDistributorRole(addr);
            await contract.grantLogisticsRole(addr);
            await contract.grantRetailerRole(addr);
            console.log(`  Account ${i}: ${addr} - All roles granted`);
        }

        // Add logistics as approved transporter in manufacturer's pool
        // We connect as manufacturer to add to their pool
        const mfrContract = contract.connect(mfr);
        await mfrContract.addTransporterToPool(
            logistics.address,
            "Demo Logistics Partner",
            "LIC-123456",
            "+91 98765 43210",
            true
        );
        console.log("Demo transporter added to manufacturer's pool");

        // Save Address to Root
        const addressPath = path.join(__dirname, "..", "deployed_address.txt");
        fs.writeFileSync(addressPath, address);

        // Save Address to Frontend Src (for Vite compatibility)
        const frontendAddressPath = path.join(__dirname, "..", "blockchain-explorer", "src", "deployed_address.json");
        fs.writeFileSync(frontendAddressPath, JSON.stringify({ address: address }, null, 2));

        // Save ABI to Frontend
        const artifact = await hre.artifacts.readArtifact("UniversalLogistics");
        const frontendPath = path.join(__dirname, "..", "blockchain-explorer", "src", "UniversalLogistics.json");
        fs.writeFileSync(frontendPath, JSON.stringify(artifact, null, 2));

        console.log("Contract deployed and artifacts saved!");
        console.log("Address:", address);

    } catch (error) {
        console.error("Deployment error:", error.message);
        console.error("Full error:", error);
        throw error;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
