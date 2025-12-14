const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("MedicineVerificationEnterprise", function () {
    let medicineContract;
    let admin, manufacturer, distributor, pharmacy, regulator, otherAccount;

    beforeEach(async function () {
        [admin, manufacturer, distributor, pharmacy, regulator, otherAccount] = await ethers.getSigners();

        const MedicineVerificationEnterprise = await ethers.getContractFactory("MedicineVerificationEnterprise");

        // Deploy Upgradeable Proxy
        medicineContract = await upgrades.deployProxy(MedicineVerificationEnterprise, [], { initializer: 'initialize', kind: 'uups' });
        await medicineContract.waitForDeployment();

        // Setup Roles
        const MAN_ROLE = await medicineContract.MANUFACTURER_ROLE();
        const DIST_ROLE = await medicineContract.DISTRIBUTOR_ROLE();
        const PHARM_ROLE = await medicineContract.PHARMACY_ROLE();
        const REG_ROLE = await medicineContract.REGULATOR_ROLE();

        await medicineContract.grantRole(MAN_ROLE, manufacturer.address);
        await medicineContract.grantRole(DIST_ROLE, distributor.address);
        await medicineContract.grantRole(PHARM_ROLE, pharmacy.address);
        await medicineContract.grantRole(REG_ROLE, regulator.address);
    });

    it("Should allow manufacturer to register a batch", async function () {
        const batchId = "BATCH-001";
        const uids = ["MED-101", "MED-102"];

        await medicineContract.connect(manufacturer).registerBatch(
            batchId,
            "Vaccine X",
            20260101,
            uids
        );

        const [isValid, name, bid, status] = await medicineContract.verifyMedicine("MED-101");
        expect(isValid).to.equal(true);
        expect(name).to.equal("Vaccine X");
        expect(status).to.equal(0n); // Manufactured
    });

    it("Should track custody chain properly", async function () {
        // 1. Register
        await medicineContract.connect(manufacturer).registerBatch("B1", "M1", 9999999999, ["U1"]);

        // 2. Manufacture -> Ship (Update)
        // struct Location { lat, long, hash }
        const loc = { lat: "10.0", long: "20.0", locationHash: "0xLocHash" };

        await medicineContract.connect(manufacturer).updateStatus(
            "U1",
            1, // Shipped
            distributor.address,
            loc,
            "0xTempHash",
            "Shipped to Dist"
        );

        const info = await medicineContract.verifyMedicine("U1");
        expect(info.currentHandler).to.equal(distributor.address);

        // 3. Distributor -> Pharmacy
        await medicineContract.connect(distributor).updateStatus(
            "U1",
            3, // Received by Distributor (skipping InTransit for brevity)
            distributor.address, // Holder stays dist until they ship it out
            loc,
            "",
            "Received at warehouse"
        );

        // 4. Pharmacy sells
        await medicineContract.connect(distributor).updateStatus("U1", 1, pharmacy.address, loc, "", "Ship to Pharm");

        // Pharmacy sells
        // Note: In real flow, Pharmacy would need to 'receive' it first or we assume auto-receive logic.
        // Based on code: require(currentHandler == msg.sender).
        // Distributor set nextHandler = Pharmacy. So Pharmacy IS currentHandler now.

        await medicineContract.connect(pharmacy).sellMedicine("U1", "Prescription #123");

        const finalInfo = await medicineContract.verifyMedicine("U1");
        expect(finalInfo.status).to.equal(4n); // Sold
    });

    it("Should enforce Recall logic", async function () {
        await medicineContract.connect(manufacturer).registerBatch("B_BAD", "Bad Med", 9999, ["U_BAD"]);

        // Regulator Recalls
        await medicineContract.connect(regulator).recallBatch("B_BAD", "Failed Lab Test");

        const info = await medicineContract.verifyMedicine("U_BAD");
        expect(info.isRecalled).to.equal(true);

        // Try to move it
        const loc = { lat: "0", long: "0", locationHash: "" };
        await expect(
            medicineContract.connect(manufacturer).updateStatus("U_BAD", 1, distributor.address, loc, "", "")
        ).to.be.revertedWith("Batch is RECALLED. Operation execution blocked.");
    });

    it("Should allow upgrades", async function () {
        const MedicineVerificationEnterprise = await ethers.getContractFactory("MedicineVerificationEnterprise");
        // Just upgrade to same implementation to test the flow
        const upgraded = await upgrades.upgradeProxy(await medicineContract.getAddress(), MedicineVerificationEnterprise);
        expect(await upgraded.getAddress()).to.equal(await medicineContract.getAddress());
    });
});
