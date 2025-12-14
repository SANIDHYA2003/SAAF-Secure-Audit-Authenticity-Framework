/**
 * ⚠️ DANGER: DATABASE WIPE SCRIPT ⚠️
 * This script will DELETE ALL DATA from the database.
 * Use only for development/testing reset.
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
};

async function wipeDatabase() {
    try {
        console.log(`${colors.red}${colors.bright}⚠️  WARNING: THIS WILL DELETE ALL DATA! ⚠️${colors.reset}`);
        console.log('Connecting to MongoDB Atlas...');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`${colors.green}✓ Connected${colors.reset}`);

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            console.log('Database is already empty.');
            process.exit(0);
        }

        console.log(`\nFound ${collections.length} collections to clear...`);

        for (const collection of collections) {
            const name = collection.name;
            // Skip system collections if any
            if (name.startsWith('system.')) continue;

            const existingCount = await db.collection(name).countDocuments();
            if (existingCount > 0) {
                await db.collection(name).deleteMany({});
                console.log(`${colors.yellow}Deleted ${existingCount} documents from '${name}'${colors.reset}`);
            } else {
                console.log(`Collection '${name}' is already empty.`);
            }
        }

        console.log(`\n${colors.green}${colors.bright}✨ DATABASE WIPED SUCCESSFULLY ✨${colors.reset}`);
        console.log('You are ready for a fresh start.');

        process.exit(0);

    } catch (error) {
        console.error('Wipe failed:', error);
        process.exit(1);
    }
}

wipeDatabase();
