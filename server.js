const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
// const rateLimit = require('express-rate-limit'); // Rate limiting disabled
const path = require('path');
require('dotenv').config();

// Import database connection
const db = require('./backend/database/connection');

// Import middleware
// const customRateLimit = require('./backend/middleware/rateLimit'); // Rate limiting disabled

// Import routes
const authRoutes = require('./backend/routes/auth');
const employeeRoutes = require('./backend/routes/employees');
const attendanceRoutes = require('./backend/routes/attendance');
const payrollRoutes = require('./backend/routes/payroll');
const settingsRoutes = require('./backend/routes/settings');
const accountRoutes = require('./backend/routes/accounts');
const unifiedRoutes = require('./backend/routes/unified');

const app = express();
const PORT = process.env.PORT || 51250; // Using allowed port range 51250-51259

// Trust proxy - no longer needed for rate limiting but kept for other middleware
app.set('trust proxy', 1);

// Security middleware - CSP DISABLED
app.use(helmet({
    contentSecurityPolicy: false, // CSP completely disabled
    crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression());

// Rate limiting - DISABLED for better performance
/*
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Increased for development
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for static files to prevent issues
        return req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/) ||
               req.url.includes('/assets/');
    }
});
*/

// Rate limiters - DISABLED
// app.use(limiter);
// app.use('/api', customRateLimit);

// CORS configuration - Production ready
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:5500',
            'http://localhost:3000',
            'http://127.0.0.1:5500',
            'http://127.0.0.1:3000',
            'https://bricks.dcism.org', // Update with your actual domain
            'http://bricks.dcism.org'   // Update with your actual domain
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('CORS origin not allowed:', origin);
            // In production, be more strict
            if (process.env.NODE_ENV === 'production') {
                callback(new Error('Not allowed by CORS'));
            } else {
                callback(null, true); // Allow for development
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Serve static files (your frontend)
app.use(express.static(path.join(__dirname)));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/unified', unifiedRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        await db.execute('SELECT 1');
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: 'connected',
            version: require('./package.json').version
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
});

// API Info endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Bricks Attendance System API',
        version: require('./package.json').version,
        endpoints: {
            auth: '/api/auth',
            employees: '/api/employees',
            attendance: '/api/attendance',
            payroll: '/api/payroll',
            settings: '/api/settings',
            accounts: '/api/accounts',
            health: '/api/health'
        },
        documentation: '/api/docs'
    });
});

// Serve frontend routes (SPA routing)
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ 
            success: false,
            message: 'API endpoint not found',
            path: req.path 
        });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    // Handle specific error types
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ 
            success: false,
            message: 'Invalid JSON data' 
        });
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'File too large'
        });
    }
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors
        });
    }
    
    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong!' 
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { 
            stack: err.stack,
            error: err 
        })
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await db.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await db.end();
    process.exit(0);
});

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await db.execute('SELECT 1');
        console.log('✅ Database connection established');
        
        app.listen(PORT, () => {
            console.log(`
🚀 Bricks Attendance System Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://localhost:${PORT}
🔗 API: http://localhost:${PORT}/api
💾 Database: MySQL (${process.env.DB_HOST}:${process.env.DB_PORT})
📋 Health: http://localhost:${PORT}/api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            `);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
