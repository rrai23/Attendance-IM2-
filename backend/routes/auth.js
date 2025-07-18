const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../database/connection');
const { auth, optionalAuth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Helper function to create JWT token with custom expiry
const createJWTToken = (payload, expiresIn = JWT_EXPIRES_IN) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Helper function to calculate expiry date from duration string
const calculateExpiryDate = (duration) => {
    const expiryDate = new Date();
    
    if (duration.includes('d')) {
        const days = parseInt(duration);
        expiryDate.setDate(expiryDate.getDate() + days);
    } else if (duration.includes('h')) {
        const hours = parseInt(duration);
        expiryDate.setHours(expiryDate.getHours() + hours);
    } else if (duration.includes('y')) {
        const years = parseInt(duration);
        expiryDate.setFullYear(expiryDate.getFullYear() + years);
    }
    
    return expiryDate;
};

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        console.log('🔐 Step 1: Login request received');
        const { username, password, rememberMe = false } = req.body;

        console.log('🔐 Step 2: Login attempt - Username:', username, 'Password length:', password ? password.length : 'undefined');

        if (!username || !password) {
            console.log('🔐 Step 3: Missing credentials');
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        console.log('🔐 Step 4: Executing database query');
        // Get user from user_accounts table joined with employees
        const users = await db.execute(`
            SELECT 
                ua.id,
                ua.employee_id,
                ua.username,
                ua.password_hash,
                ua.role,
                ua.is_active,
                ua.last_login,
                ua.failed_login_attempts,
                ua.account_locked_until,
                ua.password_reset_token,
                ua.password_reset_expires,
                ua.created_at,
                ua.updated_at,
                e.first_name,
                e.last_name,
                CONCAT(e.first_name, ' ', e.last_name) as full_name,
                COALESCE(e.email, ua.email) as email,
                COALESCE(ua.phone, e.phone) as phone,
                COALESCE(e.department, ua.department) as department,
                COALESCE(e.position, ua.position) as position,
                COALESCE(e.hire_date, ua.hire_date) as hire_date,
                COALESCE(e.status, ua.employee_status) as employee_status
            FROM user_accounts ua
            LEFT JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.username = ? AND ua.is_active = TRUE
        `, [username]);

        console.log('� Step 5: Database query completed, users found:', users.length);

        if (users.length === 0) {
            console.log('🔐 Step 6: No user found');
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = users[0];
        console.log('� Step 7: User found, verifying password');

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log('� Step 8: Password validation result:', isPasswordValid);
        
        if (!isPasswordValid) {
            console.log('🔐 Step 9: Password invalid');
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        console.log('🔐 Step 10: Creating JWT token');
        // Create JWT token
        const tokenPayload = {
            employee_id: user.employee_id,
            username: user.username,
            role: user.role
        };

        const expiresIn = rememberMe ? '30d' : JWT_EXPIRES_IN;
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn });

        console.log('🔐 Step 11: JWT token created, storing session');
        // Calculate expiry date
        const expiryDate = new Date();
        if (rememberMe) {
            expiryDate.setDate(expiryDate.getDate() + 30);
        } else {
            expiryDate.setHours(expiryDate.getHours() + 24);
        }

        // Store session in database
        try {
            await db.execute(`
                INSERT INTO user_sessions (employee_id, token_hash, expires_at, is_active, created_at)
                VALUES (?, ?, ?, TRUE, NOW())
            `, [user.employee_id, token, expiryDate]);
            console.log('🔐 Step 12: Session stored successfully');
        } catch (sessionError) {
            console.warn('🔐 Step 12: Could not store session:', sessionError.message);
        }

        console.log('🔐 Step 13: Updating last login');
        // Update last login in user_accounts table
        await db.execute(
            'UPDATE user_accounts SET last_login = NOW(), updated_at = NOW() WHERE id = ?',
            [user.id]
        );

        console.log('🔐 Step 14: Preparing response data');
        // Prepare user data for response (exclude sensitive data)
        const userData = {
            employee_id: user.employee_id,
            username: user.username,
            role: user.role,
            full_name: user.full_name,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            department: user.department,
            position: user.position,
            hire_date: user.hire_date,
            last_login: new Date()
        };

        console.log('🔐 Step 15: Sending successful response');
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userData,
                token,
                expiresIn: rememberMe ? '30d' : '24h'
            }
        });

    } catch (error) {
        console.error('🚨 Login error details:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);
        console.error('Error errno:', error.errno);
        console.error('Error sqlState:', error.sqlState);
        console.error('Error sqlMessage:', error.sqlMessage);
        
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Logout endpoint
router.post('/logout', auth, async (req, res) => {
    try {
        // Deactivate current session
        await db.execute(
            'UPDATE user_sessions SET is_active = FALSE WHERE token_hash = ?',
            [req.token]
        );

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout'
        });
    }
});

// Verify token endpoint
router.get('/verify', auth, async (req, res) => {
    try {
        // Check if user data exists (should be attached by auth middleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User data not found'
            });
        }

        // User data is already attached by auth middleware
        const userData = {
            employee_id: req.user.employee_id,
            username: req.user.username,
            role: req.user.role,
            first_name: req.user.first_name,
            last_name: req.user.last_name,
            email: req.user.email,
            department: req.user.department,
            position: req.user.position,
            hire_date: req.user.hire_date,
            last_login: req.user.last_login
        };

        res.json({
            success: true,
            message: 'Token valid',
            data: { user: userData }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during token verification'
        });
    }
});

// Change password endpoint
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Get current password hash
        const [users] = await db.execute(
            'SELECT password_hash FROM user_accounts WHERE employee_id = ?',
            [req.user.employee_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await db.execute(
            'UPDATE user_accounts SET password_hash = ?, updated_at = NOW() WHERE employee_id = ?',
            [newPasswordHash, req.user.employee_id]
        );

        // Invalidate all sessions except current one (force re-login on other devices)
        await db.execute(
            'UPDATE user_sessions SET is_active = FALSE WHERE employee_id = ? AND token_hash != ?',
            [req.user.employee_id, req.token]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during password change'
        });
    }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const userData = {
            employee_id: req.user.employee_id,
            username: req.user.username,
            role: req.user.role,
            first_name: req.user.first_name,
            last_name: req.user.last_name,
            email: req.user.email,
            department: req.user.department,
            position: req.user.position,
            hire_date: req.user.hire_date,
            last_login: req.user.last_login
        };

        res.json({
            success: true,
            data: { user: userData }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting profile'
        });
    }
});

// Logout all sessions endpoint
router.post('/logout-all', auth, async (req, res) => {
    try {
        // Deactivate all sessions for this user
        await db.execute(
            'UPDATE user_sessions SET is_active = FALSE WHERE employee_id = ?',
            [req.user.employee_id]
        );

        res.json({
            success: true,
            message: 'Logged out from all devices successfully'
        });

    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout all'
        });
    }
});

// JWT Refresh endpoint
router.post('/refresh', auth, async (req, res) => {
    try {
        const { rememberMe = false } = req.body;
        
        // Check if current token is close to expiry (refresh within 2 hours of expiry)
        const currentTime = Math.floor(Date.now() / 1000);
        const tokenExpiry = req.decodedToken.exp;
        const timeUntilExpiry = tokenExpiry - currentTime;
        const twoHoursInSeconds = 2 * 60 * 60;
        
        // Only refresh if token expires within 2 hours
        if (timeUntilExpiry > twoHoursInSeconds) {
            return res.json({
                success: true,
                message: 'Token still valid, no refresh needed',
                data: {
                    needsRefresh: false,
                    timeUntilExpiry: timeUntilExpiry
                }
            });
        }
        
        // Generate new token
        const tokenPayload = {
            employee_id: req.user.employee_id,
            username: req.user.username,
            role: req.user.role
        };
        
        const expiresIn = rememberMe ? '30d' : JWT_EXPIRES_IN;
        const newToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn });
        
        // Calculate new expiry date
        const expiryDate = new Date();
        if (rememberMe) {
            expiryDate.setDate(expiryDate.getDate() + 30);
        } else {
            expiryDate.setHours(expiryDate.getHours() + 24);
        }
        
        // Update session in database
        try {
            await db.execute(`
                UPDATE user_sessions 
                SET token_hash = ?, expires_at = ?, updated_at = NOW()
                WHERE employee_id = ? AND token_hash = ?
            `, [newToken, expiryDate, req.user.employee_id, req.token]);
        } catch (sessionError) {
            console.warn('Could not update session:', sessionError.message);
        }
        
        // Update last login
        await db.execute(
            'UPDATE user_accounts SET last_login = NOW(), updated_at = NOW() WHERE id = ?',
            [req.user.id]
        );
        
        console.log('🔄 Token refreshed for user:', req.user.username);
        
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken,
                expiresIn: rememberMe ? '30d' : '24h',
                needsRefresh: true
            }
        });
        
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during token refresh'
        });
    }
});

module.exports = router;

// Export helper functions for use in other routes
module.exports.createJWTToken = createJWTToken;
module.exports.calculateExpiryDate = calculateExpiryDate;
