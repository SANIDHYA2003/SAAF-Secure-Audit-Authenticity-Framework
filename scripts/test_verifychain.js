const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("Testing VerifyChain E2E Workflow...");

    // 1. Setup
    const address = fs.readFileSync("deployed_address.txt", "utf8").trim();
    const VerifyChain = await ethers.getContractFactory("VerifyChain");
    const contract = VerifyChain.attach(address);
    const [deployer, mfr, dist, log, ret, consumer] = await ethers.getSigners();

    // 2. Register Product
    const prodId = "GTIN-890123";
    console.log(`\n1. Registering Product as Manufacturer (${mfr.address})...`);
    try {
        let tx = await contract.connect(mfr).registerProduct(
            prodId, "Premium Basmati Rice", "Food", "Top Quality Rice", "India Gate"
        );
        await tx.wait();
        console.log("✓ Product Registered");
    } catch (e) {
        if (e.message.includes("Product ID exists")) console.log("✓ Product already registered");
        else throw e;
    }

    // 3. Mint Batch
    const batchId = "B-" + Math.floor(Math.random() * 10000);
    console.log(`\n2. Minting Batch ${batchId}...`);
    let tx = await contract.connect(mfr).createBatch(
        batchId, prodId, 500, Math.floor(Date.now() / 1000) + 365 * 24 * 3600, "Factory Punjab"
    );
    await tx.wait();
    console.log("✓ Batch Created");

    // 4. Transfer to Distributor
    console.log("\n3. Transferring to Distributor...");
    tx = await contract.connect(mfr).transferBatch(batchId, dist.address, 2, "Distributor Warehouse", "Dispatched");
    await tx.wait();

    let b = await contract.batches(batchId);
    if (b.currentOwner === dist.address) console.log("✓ Ownership transferred to Distributor");
    else throw new Error("Ownership transfer failed");

    // 5. Transfer to Retailer
    console.log("\n4. Transferring to Retailer...");
    tx = await contract.connect(dist).transferBatch(batchId, ret.address, 3, "City Shop", "Delivery");
    await tx.wait();

    b = await contract.batches(batchId);
    if (b.currentOwner === ret.address) console.log("✓ Ownership transferred to Retailer");
    else throw new Error("Ownership transfer failed");

    // 6. Sell to Consumer
    console.log("\n5. Selling to Consumer...");
    tx = await contract.connect(ret).sellToConsumer(batchId, 1, "Counter Sale");
    await tx.wait();

    b = await contract.batches(batchId);
    console.log(`✓ Sold 1 unit. Remaining: ${b.quantity}`);

    console.log("\n✅ VerifyChain Workflow Verified!");
}

main().catch(console.error);
