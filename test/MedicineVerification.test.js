const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MedicineVerification", function () {
    let medicineVerification;
    let owner, distributor, pharmacy, customer;

    beforeEach(async function () {
        [owner, distributor, pharmacy, customer] = await ethers.getSigners();
        const MedicineVerificationFactory = await ethers.getContractFactory("MedicineVerification");
        medicineVerification = await MedicineVerificationFactory.deploy();
        await medicineVerification.waitForDeployment();
    });

    it("Should register a medicine", async function () {
        const id = 1;
        const name = "Paracetamol";
        const manufacturer = "PharmaInc";
        const batchId = "BATCH001";
        const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

        await medicineVerification.registerMedicine(id, name, manufacturer, batchId, expiryDate);

        const details = await medicineVerification.verifyMedicine(id);
        expect(details.name).to.equal(name);
        // details.status is a BigInt used by ethers v6
        expect(details.status).to.equal(0n);
        expect(details.currentHandler).to.equal(owner.address);
    });

    it("Should update status and transfer ownership", async function () {
        const id = 1;
        await medicineVerification.registerMedicine(id, "Aspirin", "PharmaInc", "BATCH002", 0);

        // Transfer to Distributor (Status 1 = Shipped)
        await medicineVerification.updateStatus(id, 1, distributor.address);

        const details = await medicineVerification.verifyMedicine(id);
        expect(details.currentHandler).to.equal(distributor.address);
        expect(details.status).to.equal(1n);
    });

    it("Should fail if unauthorized user tries to update status", async function () {
        const id = 1;
        await medicineVerification.registerMedicine(id, "Aspirin", "PharmaInc", "BATCH002", 0);

        let error;
        try {
            await medicineVerification.connect(distributor).updateStatus(id, 1, pharmacy.address);
        } catch (e) {
            error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.include("Unauthorized");
    });
});
