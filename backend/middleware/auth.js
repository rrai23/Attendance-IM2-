const jwt = require('jsonwebtoken');
const db = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if session exists and is active
        const sessions = await db.execute(
            'SELECT * FROM user_sessions WHERE token_hash = ? AND expires_at > NOW() AND is_active = TRUE',
            [token]
        );

        if (sessions.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Get user data with account information
        const users = await db.execute(`
            SELECT 
                e.*,
                ua.username,
                ua.role,
                ua.is_active as account_active,
                ua.last_login
            FROM employees e
            JOIN user_accounts ua ON e.employee_id = ua.employee_id
            WHERE e.employee_id = ? AND e.status = 'active' AND ua.is_active = TRUE
        `, [decoded.employee_id]);

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
        const users = await db.execute(`
            SELECT 
                e.*,
                ua.username,
                ua.role,
                ua.is_active as account_active
            FROM employees e
            JOIN user_accounts ua ON e.employee_id = ua.employee_id
            WHERE e.employee_id = ? AND e.status = 'active' AND ua.is_active = TRUE
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
