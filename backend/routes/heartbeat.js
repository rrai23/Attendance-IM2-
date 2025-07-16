const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Heartbeat endpoint to maintain session activity
router.get('/heartbeat', auth, async (req, res) => {
    try {
        console.log('💓 Heartbeat request from:', req.user.username);
        
        // Simply respond with current user info to confirm session is active
        res.json({
            success: true,
            message: 'Session active',
            data: {
                user: {
                    employee_id: req.user.employee_id,
                    username: req.user.username,
                    full_name: req.user.full_name,
                    role: req.user.role
                },
                timestamp: new Date().toISOString(),
                session_status: 'active'
            }
        });
        
    } catch (error) {
        console.error('❌ Heartbeat error:', error);
        res.status(500).json({
            success: false,
            message: 'Heartbeat failed',
            error: error.message
        });
    }
});

module.exports = router;
