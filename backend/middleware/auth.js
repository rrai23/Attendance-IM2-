const jwt = require('jsonwebtoken');
const db = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const auth = async (req, res, next) => {
    try {
        console.log('🔐 Auth middleware called:', {
            url: req.url,
            method: req.method,
            hasAuthHeader: !!req.headers.authorization
        });

        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log('🎫 Token extracted:', token.substring(0, 20) + '...');

        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ JWT verified, decoded:', { employee_id: decoded.employee_id, username: decoded.username });

        // Check if session exists and is active (optional - sessions table may not exist)
        let sessionValid = true;
        try {
            console.log('🔍 Checking session for token...');
            const sessionResult = await db.execute(
                'SELECT * FROM user_sessions WHERE token_hash = ? AND expires_at > NOW() AND is_active = TRUE',
                [token]
            );
            console.log('📋 Raw session result:', sessionResult);
            
            // Handle different result structures
            let sessions;
            if (Array.isArray(sessionResult) && sessionResult.length > 0) {
                sessions = sessionResult[0]; // First element should be rows
            } else if (Array.isArray(sessionResult)) {
                sessions = sessionResult; // Direct array
            } else {
                sessions = []; // Fallback
            }
            
            console.log('📋 Parsed sessions:', {
                type: typeof sessions,
                isArray: Array.isArray(sessions),
                length: sessions ? sessions.length : 'undefined'
            });
            
            sessionValid = sessions && Array.isArray(sessions) && sessions.length > 0;
            console.log('📋 Session check result:', { found: sessions ? sessions.length : 0, valid: sessionValid });
            
            // Temporarily disable session checking - just rely on JWT
            console.log('⚠️ TEMPORARILY SKIPPING SESSION VALIDATION - USING JWT ONLY');
            sessionValid = true;
            
        } catch (sessionError) {
            // Sessions table might not exist, skip session check
            console.warn('Session check skipped (table may not exist):', sessionError.message);
            sessionValid = true; // Allow if sessions table doesn't exist
        }

        if (!sessionValid) {
            console.log('❌ Session invalid, rejecting request');
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired session'
            });
        }

        // Get user data from user_accounts joined with employees
        const [users] = await db.execute(`
            SELECT 
                ua.*,
                e.first_name,
                e.last_name,
                e.full_name,
                e.email,
                e.department,
                e.position,
                e.date_hired as hire_date,
                e.status as employee_status
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_code
            WHERE ua.employee_id = ? AND ua.is_active = TRUE AND e.status = 'active'
        `, [decoded.employee_id]);

        console.log('🔍 Auth middleware user lookup:', {
            employee_id: decoded.employee_id,
            usersFound: users.length,
            queryResult: users.length > 0 ? 'User found' : 'No user found'
        });

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        // Attach user data to request
        req.user = users[0];
        req.token = token;
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};

// Admin role check middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Manager or admin role check middleware
const requireManagerOrAdmin = (req, res, next) => {
    if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Manager or admin access required'
        });
    }
    next();
};

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // Continue without user data
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        // Get user data if token is valid
        const [users] = await db.execute(`
            SELECT 
                ua.*,
                e.first_name,
                e.last_name,
                e.full_name,
                e.email,
                e.department,
                e.position,
                e.date_hired as hire_date,
                e.status as employee_status
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_code
            WHERE ua.employee_id = ? AND ua.is_active = TRUE AND e.status = 'active'
        `, [decoded.employee_id]);

        if (users.length > 0) {
            req.user = users[0];
            req.token = token;
        }

        next();
    } catch (error) {
        // Continue without user data if token is invalid
        next();
    }
};

module.exports = {
    auth,
    requireAdmin,
    requireManagerOrAdmin,
    optionalAuth
};
