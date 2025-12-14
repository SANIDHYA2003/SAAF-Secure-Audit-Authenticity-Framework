/**
 * Database Seed Script
 * Verifies connection and initializes collections with demo data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization, User, AuditLog } from '../src/models/index.js';
import { generateId, computeHash, generateOTP, hashOTP } from '../src/utils/helpers.js';

dotenv.config();

const seedDatabase = async () => {
    try {
        console.log('🔌 Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected successfully!');

        // Check if data exists
        const orgCount = await Organization.countDocuments();
        if (orgCount > 0) {
            console.log('ℹ️ Database already contains data. Skipping seed.');
            process.exit(0);
        }

        console.log('🌱 Database is empty. Seeding initial data...');

        // Create Demo Manufacturer
        const orgId = generateId('ORG');
        const userId = generateId('USR');
        const walletAddress = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

        const org = new Organization({
            orgId,
            name: "Pharma Global Ltd",
            type: "manufacturer",
            primaryContact: {
                name: "Admin User",
                email: "admin@globalpharma.com",
                phone: "+919876543210"
            },
            legal: {
                gst: "22AAAAA0000A1Z5",
                pan: "ABCDE1234F"
            },
            address: {
                line1: "123 Industrial Estate",
                city: "Mumbai",
                state: "Maharashtra",
                pincode: "400001",
                country: "India"
            },
            onChain: {
                address: walletAddress,
                status: 'verified',
                registeredAt: new Date(),
                metaHash: computeHash('demo-meta-hash')
            }
        });

        const user = new User({
            userId,
            orgId,
            profile: {
                name: "Admin User",
                email: "admin@globalpharma.com",
                phone: "+919876543210"
            },
            roles: ['OrgAdmin'],
            passwordHash: '$2a$12$JD2.7/x.X5.X5.X5.X5.X5.X5.X5.X5.X5.X5.X5.X5.X5.X5', // hash for 'password' (placeholder)
            status: 'active',
            verification: {
                emailVerified: true,
                phoneVerified: true
            }
        });

        const log = new AuditLog({
            logId: generateId('LOG'),
            actor: { userId: 'system', orgId: 'system' },
            action: 'DB_SEEDED',
            resource: { type: 'system', id: 'init' },
            result: 'success'
        });

        await Promise.all([
            org.save(),
            user.save(),
            log.save()
        ]);

        console.log(`
✅ Database setup complete!
----------------------------------------
Created Organization: Pharma Global Ltd
Created User: admin@globalpharma.com
----------------------------------------
Collections initialized:
- organizations
- users
- auditlogs
        `);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

seedDatabase();
