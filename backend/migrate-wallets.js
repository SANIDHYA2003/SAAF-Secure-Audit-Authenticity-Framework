/**
 * Migration Script: Assign Wallet Addresses to Existing Organizations
 * Run this once to update existing organizations with deterministic wallet addresses
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization } from './src/models/index.js';
import { getWalletForOrg } from './src/utils/walletManager.js';

dotenv.config();

async function migrateWalletAddresses() {
    try {
        // Connect to MongoDB
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/verifychain';
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        // Get all organizations
        const orgs = await Organization.find({});
        console.log(`Found ${orgs.length} organizations to update`);

        let updated = 0;
        for (const org of orgs) {
            // Generate deterministic wallet address
            const walletAddress = getWalletForOrg(org.orgId, org.type);

            // Update organization directly
            await Organization.updateOne(
                { orgId: org.orgId },
                { $set: { 'onChain.address': walletAddress } }
            );

            console.log(`✅ Updated ${org.name} (${org.orgId})`);
            console.log(`   Type: ${org.type}`);
            console.log(`   Wallet: ${walletAddress}`);
            console.log('');

            updated++;
        }

        console.log(`\n🎉 Migration complete! Updated ${updated} organizations.`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateWalletAddresses();
