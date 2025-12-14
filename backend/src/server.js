/**
 * VerifyChain Backend API Server
 * 
 * Enterprise supply chain verification platform
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import orgRoutes from './routes/organizations.js';
import inviteRoutes from './routes/invites.js';
import shipmentRoutes from './routes/shipments.js';
import anchorRoutes from './routes/anchors.js';

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

// Security headers
app.use(helmet());

// CORS - Dynamic origin for Vercel deployments
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow any Vercel preview URLs
        if (origin.includes('.vercel.app')) {
            return callback(null, true);
        }

        // Deny other origins
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        error: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// ==================== DATABASE ====================

// ==================== DATABASE ====================

// Cache the database connection
let cachedDb = null;

const connectDB = async () => {
    // If we have a cached connection, reuse it
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }

    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/verifychain';

        // Optimizations for serverless
        const opts = {
            bufferCommands: false, // Don't buffer commands if driver is not connected
            maxPoolSize: 10,       // Limit pool size in serverless
            serverSelectionTimeoutMS: 5000, // Fail fast if can't connect
            socketTimeoutMS: 45000, // Close sockets after inactivity
        };

        console.log('Connecting to MongoDB...');
        const conn = await mongoose.connect(uri, opts);

        cachedDb = conn;
        console.log('✅ MongoDB connected');

        // Connection event handlers
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            cachedDb = null;
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
            cachedDb = null;
        });

        return conn;

    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        cachedDb = null;
        throw error;
    }
};

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// API version prefix
const API_PREFIX = '/api/v1';

// Mount routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/orgs`, orgRoutes);
app.use(`${API_PREFIX}/invites`, inviteRoutes);
app.use(`${API_PREFIX}/shipments`, shipmentRoutes);
app.use(`${API_PREFIX}/anchors`, anchorRoutes);

// API documentation endpoint
app.get(`${API_PREFIX}`, (req, res) => {
    res.json({
        name: 'VerifyChain API',
        version: '1.0.0',
        documentation: '/api/v1/docs',
        endpoints: {
            auth: {
                register: 'POST /api/v1/auth/register',
                login: 'POST /api/v1/auth/login',
                verifyOTP: 'POST /api/v1/auth/otp/verify',
                resendOTP: 'POST /api/v1/auth/otp/resend',
                refresh: 'POST /api/v1/auth/refresh',
                logout: 'POST /api/v1/auth/logout',
                me: 'GET /api/v1/auth/me'
            },
            organizations: {
                getMyOrg: 'GET /api/v1/orgs/me',
                updateMyOrg: 'PATCH /api/v1/orgs/me',
                getMembers: 'GET /api/v1/orgs/me/members',
                listOrgs: 'GET /api/v1/orgs',
                getOrg: 'GET /api/v1/orgs/:orgId',
                verifyOrg: 'POST /api/v1/orgs/:orgId/verify',
                suspendOrg: 'POST /api/v1/orgs/:orgId/suspend'
            },
            invites: {
                create: 'POST /api/v1/invites',
                list: 'GET /api/v1/invites',
                validate: 'GET /api/v1/invites/validate/:code',
                claim: 'POST /api/v1/invites/claim/:code',
                revoke: 'DELETE /api/v1/invites/:inviteId'
            },
            shipments: {
                create: 'POST /api/v1/shipments',
                list: 'GET /api/v1/shipments',
                get: 'GET /api/v1/shipments/:shipmentId',
                pickup: 'POST /api/v1/shipments/:shipmentId/pickup',
                addLog: 'POST /api/v1/shipments/:shipmentId/logs',
                deliver: 'POST /api/v1/shipments/:shipmentId/deliver',
                accept: 'POST /api/v1/shipments/:shipmentId/accept',
                reject: 'POST /api/v1/shipments/:shipmentId/reject',
                assignments: 'GET /api/v1/shipments/transporter/assignments'
            }
        }
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            error: 'Duplicate entry'
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// ==================== START SERVER ====================

// For Vercel serverless, we export the app without starting
// For local development, we start the server
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

if (!isVercel) {
    const startServer = async () => {
        // Connect to database
        await connectDB();

        // Start listening
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 VerifyChain API Server                               ║
║                                                           ║
║   Port:     ${PORT}                                          ║
║   Mode:     ${process.env.NODE_ENV || 'development'}                                 ║
║   API:      http://localhost:${PORT}/api/v1                   ║
║   Health:   http://localhost:${PORT}/health                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
            `);
        });
    };

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received. Shutting down gracefully...');
        await mongoose.connection.close();
        process.exit(0);
    });

    // Start the server
    startServer();
} else {
    // For Vercel: Connect to DB on first request (lazy loading)
    // We export the app, but we also need a middleware to ensure connection on every request
    app.use(async (req, res, next) => {
        // Skip DB connection for Health Check to identify if it's app or DB issue
        if (req.path === '/health' || req.path === '/api/v1/health') {
            // Check if DB happens to be connected but don't force it
            return next();
        }

        try {
            await connectDB();
            next();
        } catch (error) {
            console.error("Critical DB Error:", error);
            res.status(500).json({
                success: false,
                error: 'Database connection failed',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });
}

export default app;

