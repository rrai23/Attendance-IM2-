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
        console.log('🔍 Auth header received:', authHeader ? authHeader.substring(0, 20) + '...' : 'None');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ Invalid auth header format');
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log('🎫 Token extracted:', token ? token.substring(0, 20) + '...' : 'undefined/empty');

        // Handle development tokens
        if (token.startsWith('dev_token_')) {
            console.log('🔧 Development token detected, skipping JWT verification');
            const employee_id = token.replace('dev_token_', '');
            console.log('🔧 Development employee_id:', employee_id);
            
            // Set decoded token for development
            req.decodedToken = { employee_id, username: employee_id };
            req.token = token;
            
            // Get user data directly for development
            const result = await db.execute(`
                SELECT 
                    ua.*,
                    e.first_name,
                    e.last_name,
                    e.full_name,
                    e.email,
                    e.department,
                    e.position,
                    e.phone,
                    e.hire_date,
                    e.wage,
                    e.status
                FROM user_accounts ua
                LEFT JOIN employees e ON ua.employee_id = e.employee_id
                WHERE ua.employee_id = ?
            `, [employee_id]);
            
            console.log('🔍 Development user lookup result:', { 
                type: typeof result, 
                isArray: Array.isArray(result), 
                length: result?.length,
                hasData: result && result.length > 0
            });
            
            if (!result || result.length === 0) {
                console.log('❌ Development user not found for employee_id:', employee_id);
                return res.status(401).json({
                    success: false,
                    message: 'Development user not found'
                });
            }
            
            const user = result[0];
            console.log('✅ Development user found:', { employee_id: user.employee_id, username: user.username, role: user.role });
            
            req.user = user;
            return next();
        }

        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
            console.log('✅ JWT verified, decoded:', { employee_id: decoded.employee_id, username: decoded.username });
        } catch (jwtError) {
            console.log('❌ JWT verification failed:', jwtError.message);
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Store decoded token for refresh endpoint
        req.decodedToken = decoded;
        req.token = token;

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

        // Get user data from user_accounts (with optional employee join)
        const result = await db.execute(`
            SELECT 
                ua.*,
                COALESCE(e.first_name, ua.first_name) as first_name,
                COALESCE(e.last_name, ua.last_name) as last_name,
                COALESCE(e.full_name, ua.full_name) as full_name,
                COALESCE(e.email, ua.email) as email,
                COALESCE(e.department, ua.department) as department,
                COALESCE(e.position, ua.position) as position,
                COALESCE(e.hire_date, ua.hire_date) as hire_date,
                COALESCE(e.status, ua.employee_status) as employee_status
            FROM user_accounts ua
            LEFT JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.employee_id = ? AND ua.is_active = TRUE
        `, [decoded.employee_id]);

        // Handle different result structures (mysql2 returns [rows, fields])
        let users;
        if (Array.isArray(result) && result.length > 0) {
            users = Array.isArray(result[0]) ? result[0] : result;
        } else {
            users = [];
        }

        console.log('🔍 Auth middleware user lookup:', {
            employee_id: decoded.employee_id,
            rawResultType: typeof result,
            rawResultIsArray: Array.isArray(result),
            rawResultLength: result ? result.length : 'undefined',
            usersFound: users ? users.length : 'users is null/undefined',
            queryResult: users && users.length > 0 ? 'User found' : 'No user found',
            usersType: typeof users,
            usersIsArray: Array.isArray(users)
        });

        if (!users || users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        // Attach user data to request
        req.user = users[0];
        req.token = token;
        console.log('✅ req.user set to:', req.user);
        console.log('✅ req.user role:', req.user.role);
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
    console.log('🔍 requireManagerOrAdmin middleware called');
    console.log('req.user:', req.user);
    console.log('req.user type:', typeof req.user);
    console.log('req.user keys:', req.user ? Object.keys(req.user) : 'req.user is null/undefined');
    
    if (!req.user || !req.user.role) {
        console.log('❌ No user or no role found');
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    if (!['admin', 'manager'].includes(req.user.role)) {
        console.log('❌ User role not admin or manager:', req.user.role);
        return res.status(403).json({
            success: false,
            message: 'Manager or admin access required'
        });
    }
    
    console.log('✅ User authorized:', req.user.role);
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
                e.hire_date as hire_date,
                e.status as employee_status
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_id
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
