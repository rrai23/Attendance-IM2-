const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireAdmin } = require('../middleware/auth');

// Key mapping between frontend nested structure and database flat keys
const KEY_MAPPING = {
    // General settings
    'general.companyName': 'company_name',
    'general.timezone': 'timezone',
    'general.dateFormat': 'date_format',
    'general.timeFormat': 'time_format',
    'general.currency': 'currency',
    'general.language': 'language',
    
    // Payroll settings
    'payroll.payPeriod': 'payroll_frequency',
    'payroll.payday': 'payday',
    'payroll.overtimeRate': 'overtime_rate',
    'payroll.overtimeThreshold': 'overtime_threshold_hours',
    'payroll.roundingRules': 'rounding_rules',
    'payroll.autoCalculate': 'auto_calculate',
    
    // Attendance settings
    'attendance.clockInGrace': 'late_grace_period',
    'attendance.clockOutGrace': 'clock_out_grace',
    'attendance.lunchBreakDuration': 'lunch_break_duration',
    'attendance.autoClockOut': 'auto_clock_out',
    'attendance.autoClockOutTime': 'work_end_time',
    'attendance.requireNotes': 'require_notes',
    
    // Notification settings
    'notifications.emailNotifications': 'email_notifications',
    'notifications.tardyAlerts': 'tardy_alerts',
    'notifications.overtimeAlerts': 'overtime_alerts',
    'notifications.payrollReminders': 'payroll_reminders',
    'notifications.systemUpdates': 'system_updates',
    
    // Security settings
    'security.sessionTimeout': 'session_timeout',
    'security.passwordMinLength': 'password_min_length',
    'security.requirePasswordChange': 'require_password_change',
    'security.passwordChangeInterval': 'password_change_interval',
    'security.twoFactorAuth': 'two_factor_auth',
    
    // User settings
    'users.defaultRole': 'default_role',
    'users.defaultHourlyRate': 'default_hourly_rate',
    'users.autoEnableAccounts': 'auto_enable_accounts',
    'users.requireEmailVerification': 'require_email_verification',
    'users.lockoutAttempts': 'max_login_attempts',
    'users.lockoutDuration': 'lockout_duration',
    'users.autoInactivate': 'auto_inactivate',
    'users.inactiveThreshold': 'inactive_threshold'
};

// Reverse mapping for database to frontend
const REVERSE_KEY_MAPPING = {};
Object.keys(KEY_MAPPING).forEach(frontendKey => {
    REVERSE_KEY_MAPPING[KEY_MAPPING[frontendKey]] = frontendKey;
});

/**
 * Flatten nested settings object to database keys
 */
function flattenSettings(settings) {
    const flattened = {};
    
    function flatten(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                flatten(value, fullKey);
            } else {
                // Map frontend key to database key
                const dbKey = KEY_MAPPING[fullKey] || fullKey;
                flattened[dbKey] = value;
            }
        }
    }
    
    flatten(settings);
    return flattened;
}

/**
 * Unflatten database settings to nested frontend structure
 */
function unflattenSettings(flatSettings) {
    const nested = {};
    
    for (const [dbKey, value] of Object.entries(flatSettings)) {
        // Map database key to frontend key, or use as is
        const frontendKey = REVERSE_KEY_MAPPING[dbKey] || dbKey;
        
        if (frontendKey.includes('.')) {
            const keys = frontendKey.split('.');
            let current = nested;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
        } else {
            nested[frontendKey] = value;
        }
    }
    
    return nested;
}

// Get all system settings
router.get('/', auth, async (req, res) => {
    try {
        const settings = await db.execute(
            'SELECT setting_key, setting_value, setting_type FROM system_settings ORDER BY setting_key'
        );

        // Convert to flat object format with proper type conversion
        const flatSettings = {};
        settings.forEach(setting => {
            let value = setting.setting_value;
            
            // Convert based on setting_type
            try {
                switch (setting.setting_type) {
                    case 'number':
                        value = parseFloat(value);
                        break;
                    case 'boolean':
                        value = value === 'true' || value === '1' || value === 1;
                        break;
                    case 'json':
                        value = JSON.parse(value);
                        break;
                    default:
                        // Keep as string
                        break;
                }
            } catch (e) {
                console.warn(`Error parsing setting ${setting.setting_key}:`, e);
                // Keep original value if parsing fails
            }
            
            flatSettings[setting.setting_key] = value;
        });

        // Convert flat settings to nested structure for frontend
        const nestedSettings = unflattenSettings(flatSettings);

        res.json({
            success: true,
            data: nestedSettings
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
        console.log('PUT /settings called with:', req.body);
        const settings = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Settings object is required'
            });
        }

        // Process settings directly without flattening (frontend sends clean camelCase keys)
        console.log('Processing settings directly:', settings);

        const results = [];
        const errors = [];

        // Process each setting individually
        for (const [key, value] of Object.entries(settings)) {
            try {
                console.log(`Processing setting: ${key} = ${value}`);
                
                // Determine setting type and convert value appropriately
                let settingType = 'string';
                let stringValue = value;
                
                if (typeof value === 'number') {
                    settingType = 'number';
                    stringValue = value.toString();
                } else if (typeof value === 'boolean') {
                    settingType = 'boolean';
                    stringValue = value.toString();
                } else if (typeof value === 'object' && value !== null) {
                    settingType = 'json';
                    stringValue = JSON.stringify(value);
                } else {
                    stringValue = value.toString();
                }

                // Check if setting exists first
                const existing = await db.execute(
                    'SELECT id FROM system_settings WHERE setting_key = ?',
                    [key]
                );

                if (existing.length > 0) {
                    // Update existing setting
                    await db.execute(
                        'UPDATE system_settings SET setting_value = ?, setting_type = ?, updated_at = NOW() WHERE setting_key = ?',
                        [stringValue, settingType, key]
                    );
                    console.log(`Updated setting: ${key}`);
                } else {
                    // Create new setting
                    await db.execute(
                        'INSERT INTO system_settings (setting_key, setting_value, setting_type, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                        [key, stringValue, settingType]
                    );
                    console.log(`Created setting: ${key}`);
                }

                results.push({ key, status: 'updated' });

            } catch (error) {
                console.error(`Error processing setting ${key}:`, error);
                errors.push({ key, error: error.message });
            }
        }

        if (errors.length > 0) {
            console.error('Settings update errors:', errors);
            return res.status(500).json({
                success: false,
                message: 'Some settings failed to update',
                data: { errors }
            });
        }

        console.log('Settings update successful:', results);
        res.json({
            success: true,
            message: `Updated ${results.length} settings`,
            data: {
                updated: results,
                errors: errors
            }
        });

    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating settings: ' + error.message
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
            'SELECT id FROM system_settings WHERE setting_key = ?',
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

// Save multiple settings (admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        const settings = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Settings object is required'
            });
        }

        const results = [];
        const errors = [];

        // Process each setting individually
        for (const [key, value] of Object.entries(settings)) {
            try {
                // Convert value to JSON string
                const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);

                // Use INSERT ... ON DUPLICATE KEY UPDATE
                await db.execute(`
                    INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at)
                    VALUES (?, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                    setting_value = VALUES(setting_value), 
                    updated_at = NOW()
                `, [key, jsonValue]);

                results.push({ key, success: true });
            } catch (error) {
                console.error(`Error saving setting ${key}:`, error);
                errors.push({ key, error: error.message });
            }
        }

        res.json({
            success: errors.length === 0,
            message: errors.length === 0 ? 'Settings saved successfully' : 'Some settings failed to save',
            data: { results, errors }
        });

    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error saving settings'
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
