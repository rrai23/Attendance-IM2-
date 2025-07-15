const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireAdmin } = require('../middleware/auth');

// Get all system settings
router.get('/', auth, async (req, res) => {
    try {
        const settings = await db.execute(
            'SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key'
        );

        // Convert to object format
        const settingsObject = {};
        settings.forEach(setting => {
            try {
                // Try to parse as JSON, fallback to string
                settingsObject[setting.setting_key] = JSON.parse(setting.setting_value);
            } catch {
                settingsObject[setting.setting_key] = setting.setting_value;
            }
        });

        res.json({
            success: true,
            data: { settings: settingsObject }
        });

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting settings'
        });
    }
});

// Get specific setting
router.get('/:key', auth, async (req, res) => {
    try {
        const { key } = req.params;

        const settings = await db.execute(
            'SELECT setting_key, setting_value, description FROM system_settings WHERE setting_key = ?',
            [key]
        );

        if (settings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        const setting = settings[0];
        let value;
        try {
            value = JSON.parse(setting.setting_value);
        } catch {
            value = setting.setting_value;
        }

        res.json({
            success: true,
            data: {
                key: setting.setting_key,
                value: value,
                description: setting.description
            }
        });

    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting setting'
        });
    }
});

// Update system settings (admin only)
router.put('/', auth, requireAdmin, async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Settings object is required'
            });
        }

        const results = [];
        const errors = [];

        await db.beginTransaction();

        try {
            for (const [key, value] of Object.entries(settings)) {
                try {
                    // Convert value to JSON string
                    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);

                    // Check if setting exists
                    const existing = await db.execute(
                        'SELECT setting_id FROM system_settings WHERE setting_key = ?',
                        [key]
                    );

                    if (existing.length > 0) {
                        // Update existing setting
                        await db.execute(`
                            UPDATE system_settings 
                            SET setting_value = ?, updated_at = NOW() 
                            WHERE setting_key = ?
                        `, [jsonValue, key]);
                    } else {
                        // Create new setting
                        await db.execute(`
                            INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at)
                            VALUES (?, ?, NOW(), NOW())
                        `, [key, jsonValue]);
                    }

                    results.push({ key, status: 'updated' });

                } catch (error) {
                    console.error(`Error updating setting ${key}:`, error);
                    errors.push({ key, error: 'Failed to update setting' });
                }
            }

            await db.commit();

            res.json({
                success: true,
                message: `Updated ${results.length} settings`,
                data: {
                    updated: results,
                    errors: errors
                }
            });

        } catch (error) {
            await db.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating settings'
        });
    }
});

// Update single setting (admin only)
router.put('/:key', auth, requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value, description } = req.body;

        if (value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Value is required'
            });
        }

        // Convert value to JSON string
        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);

        // Check if setting exists
        const existing = await db.execute(
            'SELECT setting_id FROM system_settings WHERE setting_key = ?',
            [key]
        );

        if (existing.length > 0) {
            // Update existing setting
            const updateFields = ['setting_value = ?', 'updated_at = NOW()'];
            const updateParams = [jsonValue];

            if (description !== undefined) {
                updateFields.push('description = ?');
                updateParams.push(description);
            }

            updateParams.push(key);

            await db.execute(
                `UPDATE system_settings SET ${updateFields.join(', ')} WHERE setting_key = ?`,
                updateParams
            );
        } else {
            // Create new setting
            await db.execute(`
                INSERT INTO system_settings (setting_key, setting_value, description, created_at, updated_at)
                VALUES (?, ?, ?, NOW(), NOW())
            `, [key, jsonValue, description || null]);
        }

        res.json({
            success: true,
            message: 'Setting updated successfully',
            data: {
                key,
                value: typeof value === 'string' ? value : value,
                description: description || null
            }
        });

    } catch (error) {
        console.error('Update single setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating setting'
        });
    }
});

// Reset settings to defaults (admin only)
router.post('/reset', requireAdmin, async (req, res) => {
    try {
        const { keys } = req.body; // array of setting keys to reset, or null for all

        const defaultSettings = {
            'company_name': 'Your Company Name',
            'company_address': 'Your Company Address',
            'work_hours_start': '09:00',
            'work_hours_end': '17:00',
            'lunch_break_start': '12:00',
            'lunch_break_end': '13:00',
            'overtime_multiplier': 1.5,
            'holiday_multiplier': 2.0,
            'currency': 'PHP',
            'timezone': 'Asia/Manila',
            'date_format': 'YYYY-MM-DD',
            'time_format': '24h',
            'payroll_frequency': 'monthly',
            'minimum_wage': 15000,
            'sss_rate': 0.045,
            'philhealth_rate': 0.015,
            'pagibig_rate': 0.02,
            'tax_rate': 0.15,
            'late_grace_period': 15,
            'attendance_required_fields': ['time_in', 'time_out'],
            'notification_settings': {
                'email_notifications': true,
                'sms_notifications': false,
                'system_notifications': true
            },
            'security_settings': {
                'session_timeout': 24,
                'password_min_length': 6,
                'require_password_change': false,
                'max_login_attempts': 5
            }
        };

        const targetKeys = keys && Array.isArray(keys) ? keys : Object.keys(defaultSettings);
        const results = [];
        const errors = [];

        await db.beginTransaction();

        try {
            for (const key of targetKeys) {
                if (defaultSettings.hasOwnProperty(key)) {
                    try {
                        const value = defaultSettings[key];
                        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);

                        // Check if setting exists
                        const existing = await db.execute(
                            'SELECT setting_id FROM system_settings WHERE setting_key = ?',
                            [key]
                        );

                        if (existing.length > 0) {
                            // Update to default value
                            await db.execute(`
                                UPDATE system_settings 
                                SET setting_value = ?, updated_at = NOW() 
                                WHERE setting_key = ?
                            `, [jsonValue, key]);
                        } else {
                            // Create with default value
                            await db.execute(`
                                INSERT INTO system_settings (setting_key, setting_value, is_active, created_at, updated_at)
                                VALUES (?, ?, TRUE, NOW(), NOW())
                            `, [key, jsonValue]);
                        }

                        results.push({ key, status: 'reset', value });

                    } catch (error) {
                        console.error(`Error resetting setting ${key}:`, error);
                        errors.push({ key, error: 'Failed to reset setting' });
                    }
                } else {
                    errors.push({ key, error: 'No default value available' });
                }
            }

            await db.commit();

            res.json({
                success: true,
                message: `Reset ${results.length} settings to defaults`,
                data: {
                    reset: results,
                    errors: errors
                }
            });

        } catch (error) {
            await db.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Reset settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error resetting settings'
        });
    }
});

// Delete setting (admin only)
router.delete('/:key', requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;

        // Check if setting exists
        const existing = await db.execute(
            'SELECT setting_id FROM system_settings WHERE setting_key = ?',
            [key]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        // Soft delete by setting is_active to false
        await db.execute(
            'UPDATE system_settings SET is_active = FALSE, updated_at = NOW() WHERE setting_key = ?',
            [key]
        );

        res.json({
            success: true,
            message: 'Setting deleted successfully'
        });

    } catch (error) {
        console.error('Delete setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting setting'
        });
    }
});

// Get system information (admin only)
router.get('/system/info', requireAdmin, async (req, res) => {
    try {
        const systemInfo = await Promise.all([
            // Database info
            db.execute('SELECT COUNT(*) as employee_count FROM employees WHERE status = ?', ['active']),
            db.execute('SELECT COUNT(*) as user_count FROM user_accounts WHERE is_active = TRUE'),
            db.execute('SELECT COUNT(*) as attendance_count FROM attendance_records WHERE date >= DATE_SUB(NOW(), INTERVAL 30 DAY)'),
            db.execute('SELECT COUNT(*) as payroll_count FROM payroll_records WHERE pay_period_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)'),
            
            // System settings count
            db.execute('SELECT COUNT(*) as settings_count FROM system_settings WHERE is_active = TRUE'),
            
            // Recent activity
            db.execute('SELECT COUNT(*) as recent_logins FROM user_sessions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)')
        ]);

        res.json({
            success: true,
            data: {
                system_info: {
                    active_employees: systemInfo[0][0].employee_count,
                    active_users: systemInfo[1][0].user_count,
                    recent_attendance: systemInfo[2][0].attendance_count,
                    recent_payroll: systemInfo[3][0].payroll_count,
                    total_settings: systemInfo[4][0].settings_count,
                    recent_logins: systemInfo[5][0].recent_logins,
                    server_time: new Date(),
                    version: '1.0.0'
                }
            }
        });

    } catch (error) {
        console.error('Get system info error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting system information'
        });
    }
});

// Export settings (admin only)
router.get('/export/backup', requireAdmin, async (req, res) => {
    try {
        const settings = await db.execute(
            'SELECT setting_key, setting_value, description, created_at, updated_at FROM system_settings WHERE is_active = TRUE ORDER BY setting_key'
        );

        const backup = {
            export_date: new Date(),
            version: '1.0.0',
            settings: settings.map(setting => ({
                key: setting.setting_key,
                value: setting.setting_value,
                description: setting.description,
                created_at: setting.created_at,
                updated_at: setting.updated_at
            }))
        };

        res.json({
            success: true,
            data: { backup }
        });

    } catch (error) {
        console.error('Export settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error exporting settings'
        });
    }
});

// Import settings (admin only)
router.post('/import/backup', requireAdmin, async (req, res) => {
    try {
        const { backup, overwrite = false } = req.body;

        if (!backup || !backup.settings || !Array.isArray(backup.settings)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid backup format'
            });
        }

        const results = [];
        const errors = [];

        await db.beginTransaction();

        try {
            for (const setting of backup.settings) {
                try {
                    const { key, value, description } = setting;

                    if (!key || value === undefined) {
                        errors.push({ key, error: 'Invalid setting format' });
                        continue;
                    }

                    // Check if setting exists
                    const existing = await db.execute(
                        'SELECT setting_id FROM system_settings WHERE setting_key = ?',
                        [key]
                    );

                    if (existing.length > 0) {
                        if (overwrite) {
                            // Update existing setting
                            await db.execute(`
                                UPDATE system_settings 
                                SET setting_value = ?, description = ?, updated_at = NOW() 
                                WHERE setting_key = ?
                            `, [value, description, key]);
                            results.push({ key, status: 'updated' });
                        } else {
                            results.push({ key, status: 'skipped (exists)' });
                        }
                    } else {
                        // Create new setting
                        await db.execute(`
                            INSERT INTO system_settings (setting_key, setting_value, description, is_active, created_at, updated_at)
                            VALUES (?, ?, ?, TRUE, NOW(), NOW())
                        `, [key, value, description]);
                        results.push({ key, status: 'created' });
                    }

                } catch (error) {
                    console.error(`Error importing setting ${setting.key}:`, error);
                    errors.push({ key: setting.key, error: 'Failed to import setting' });
                }
            }

            await db.commit();

            res.json({
                success: true,
                message: `Imported ${results.filter(r => r.status !== 'skipped (exists)').length} settings`,
                data: {
                    imported: results,
                    errors: errors
                }
            });

        } catch (error) {
            await db.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Import settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error importing settings'
        });
    }
});

module.exports = router;
