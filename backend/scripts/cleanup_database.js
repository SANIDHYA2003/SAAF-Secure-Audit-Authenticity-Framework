/**
 * Database Cleanup and Migration Script (Fixed)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    step: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`)
};

async function cleanupDatabase() {
    try {
        log.step('🚀 Starting Database Cleanup...');

        log.info('Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        log.success('Connected to MongoDB Atlas');

        const db = mongoose.connection.db;

        // Get all collections
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        log.info(`Found collections: ${collectionNames.join(', ')}`);

        // Step 1: Drop all existing indexes to avoid conflicts
        log.step('🔥 Step 1: Dropping old indexes...');

        for (const collName of collectionNames) {
            try {
                const indexes = await db.collection(collName).indexes();
                for (const index of indexes) {
                    if (index.name !== '_id_') { // Don't drop the default _id index
                        try {
                            await db.collection(collName).dropIndex(index.name);
                            log.info(`Dropped index ${index.name} from ${collName}`);
                        } catch (e) {
                            // Index already dropped, ignore
                        }
                    }
                }
            } catch (e) {
                log.warning(`Could not drop indexes for ${collName}: ${e.message}`);
            }
        }

        // Step 2: Handle redundant collections
        log.step('📦 Step 2: Handling redundant collections...');

        if (collectionNames.includes('orgs')) {
            const orgsCount = await db.collection('orgs').countDocuments();
            log.warning(`Found 'orgs' collection with ${orgsCount} documents`);
            await db.collection('orgs').drop();
            log.success('Dropped redundant "orgs" collection');
        }

        if (collectionNames.includes('transporters')) {
            const transportersCount = await db.collection('transporters').countDocuments();
            log.warning(`Found 'transporters' collection with ${transportersCount} documents`);
            await db.collection('transporters').drop();
            log.success('Dropped redundant "transporters" collection');
        }

        // Step 3: Ensure required collections exist
        log.step('📁 Step 3: Ensuring required collections exist...');

        const requiredCollections = [
            'users',
            'organizations',
            'invites',
            'otps',
            'sessions',
            'shipments',
            'auditlogs',
            'anchors'
        ];

        const currentCollections = (await db.listCollections().toArray()).map(c => c.name);

        for (const collName of requiredCollections) {
            if (!currentCollections.includes(collName)) {
                await db.createCollection(collName);
                log.success(`Created collection: ${collName}`);
            } else {
                log.info(`Collection ${collName} already exists`);
            }
        }

        // Step 4: Clean up duplicate emails in users and organizations
        log.step('🧹 Step 4: Cleaning up duplicates...');

        // Remove duplicate users by email
        const users = await db.collection('users').find({}).toArray();
        const seenEmails = new Set();
        let removedUsers = 0;

        for (const user of users) {
            if (user.email) {
                if (seenEmails.has(user.email)) {
                    await db.collection('users').deleteOne({ _id: user._id });
                    removedUsers++;
                } else {
                    seenEmails.add(user.email);
                }
            }
        }

        if (removedUsers > 0) {
            log.warning(`Removed ${removedUsers} duplicate users`);
        }

        // Remove duplicate organizations by email
        const orgs = await db.collection('organizations').find({}).toArray();
        const seenOrgEmails = new Set();
        let removedOrgs = 0;

        for (const org of orgs) {
            if (org.email) {
                if (seenOrgEmails.has(org.email)) {
                    await db.collection('organizations').deleteOne({ _id: org._id });
                    removedOrgs++;
                } else {
                    seenOrgEmails.add(org.email);
                }
            }
        }

        if (removedOrgs > 0) {
            log.warning(`Removed ${removedOrgs} duplicate organizations`);
        }

        // Step 5: Create proper indexes
        log.step('🔍 Step 5: Creating production indexes...');

        try {
            // Users indexes
            await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
            await db.collection('users').createIndex({ phone: 1 }, { sparse: true });
            await db.collection('users').createIndex({ organizationId: 1 });
            log.success('Created users indexes');
        } catch (e) {
            log.warning(`Users indexes: ${e.message}`);
        }

        try {
            // Organizations indexes
            await db.collection('organizations').createIndex({ email: 1 }, { unique: true, sparse: true });
            await db.collection('organizations').createIndex({ type: 1 });
            await db.collection('organizations').createIndex({ gst: 1 }, { sparse: true });
            await db.collection('organizations').createIndex({ pan: 1 }, { sparse: true });
            await db.collection('organizations').createIndex({ blockchainAddress: 1 }, { sparse: true });
            log.success('Created organizations indexes');
        } catch (e) {
            log.warning(`Organizations indexes: ${e.message}`);
        }

        try {
            // Shipments indexes
            await db.collection('shipments').createIndex({ batchId: 1 });
            await db.collection('shipments').createIndex({ 'from.organizationId': 1 });
            await db.collection('shipments').createIndex({ 'to.organizationId': 1 });
            await db.collection('shipments').createIndex({ transporterId: 1 });
            await db.collection('shipments').createIndex({ status: 1 });
            await db.collection('shipments').createIndex({ createdAt: -1 });
            log.success('Created shipments indexes');
        } catch (e) {
            log.warning(`Shipments indexes: ${e.message}`);
        }

        try {
            // Sessions indexes with TTL
            await db.collection('sessions').createIndex({ token: 1 }, { unique: true, sparse: true });
            await db.collection('sessions').createIndex({ userId: 1 });
            await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
            log.success('Created sessions indexes (with TTL)');
        } catch (e) {
            log.warning(`Sessions indexes: ${e.message}`);
        }

        try {
            // OTPs indexes with TTL
            await db.collection('otps').createIndex({ phone: 1, code: 1 });
            await db.collection('otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
            log.success('Created otps indexes (with TTL)');
        } catch (e) {
            log.warning(`OTPs indexes: ${e.message}`);
        }

        try {
            // Invites indexes with TTL
            await db.collection('invites').createIndex({ email: 1 });
            await db.collection('invites').createIndex({ token: 1 }, { unique: true, sparse: true });
            await db.collection('invites').createIndex({ organizationId: 1 });
            await db.collection('invites').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
            log.success('Created invites indexes (with TTL)');
        } catch (e) {
            log.warning(`Invites indexes: ${e.message}`);
        }

        try {
            // Audit logs indexes
            await db.collection('auditlogs').createIndex({ userId: 1 });
            await db.collection('auditlogs').createIndex({ entityType: 1, entityId: 1 });
            await db.collection('auditlogs').createIndex({ timestamp: -1 });
            log.success('Created auditlogs indexes');
        } catch (e) {
            log.warning(`Auditlogs indexes: ${e.message}`);
        }

        try {
            // Anchors indexes
            await db.collection('anchors').createIndex({ dataHash: 1 }, { unique: true, sparse: true });
            await db.collection('anchors').createIndex({ dataType: 1, dataId: 1 });
            await db.collection('anchors').createIndex({ 'blockchain.txHash': 1 });
            log.success('Created anchors indexes');
        } catch (e) {
            log.warning(`Anchors indexes: ${e.message}`);
        }

        // Step 6: Clean up expired data
        log.step('🗑️  Step 6: Cleaning up expired data...');

        const now = new Date();

        const deletedSessions = await db.collection('sessions').deleteMany({
            expiresAt: { $lt: now }
        });
        log.info(`Deleted ${deletedSessions.deletedCount} expired sessions`);

        const deletedOTPs = await db.collection('otps').deleteMany({
            expiresAt: { $lt: now }
        });
        log.info(`Deleted ${deletedOTPs.deletedCount} expired OTPs`);

        const deletedInvites = await db.collection('invites').deleteMany({
            expiresAt: { $lt: now }
        });
        log.info(`Deleted ${deletedInvites.deletedCount} expired invites`);

        // Step 7: Summary
        log.step('📊 Database Summary:');

        const finalCollections = await db.listCollections().toArray();
        log.info(`\nFinal collections (${finalCollections.length}):`);

        for (const collection of finalCollections) {
            const count = await db.collection(collection.name).countDocuments();
            const indexes = await db.collection(collection.name).indexes();
            log.info(`  ✓ ${collection.name}: ${count} documents, ${indexes.length} indexes`);
        }

        log.step('✨ Database cleanup completed successfully!');
        log.success('Your MongoDB Atlas database is now production-ready!');
        log.info('\nNext steps:');
        log.info('  1. Restart your backend server');
        log.info('  2. Test registration and login');
        log.info('  3. Create batches and shipments');
        log.info('  4. Verify blockchain integration\n');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        log.error(`❌ Error during cleanup: ${error.message}`);
        console.error(error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run cleanup
cleanupDatabase();
