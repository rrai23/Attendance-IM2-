const db = require('./backend/database/connection');

async function cleanupDuplicateSettings() {
    try {
        console.log('🧹 Starting settings cleanup...');
        
        // Define which version to keep (camelCase) and which to remove (snake_case and dotted)
        const settingsToRemove = [
            // Snake_case versions (keep camelCase)
            'absence_alerts',
            'auto_approve_regular', 
            'auto_calculate',
            'auto_clock_out',
            'auto_clock_out_time',
            'auto_deduct_lunch',
            'clock_in_grace',
            'clock_out_grace',
            'company_name',
            'cutoff_time',
            'date_format',
            'email_notifications',
            'lunch_break_duration',
            'max_login_attempts',
            'overtime_alerts',
            'overtime_rate',
            'overtime_threshold',
            'password_change_interval',
            'password_min_length',
            'pay_period',
            'payroll_reminders',
            'require_location',
            'require_notes',
            'require_numbers',
            'require_overtime_approval',
            'require_password_change',
            'require_special_chars',
            'require_uppercase',
            'rounding_rules',
            'session_timeout',
            'short_break_duration',
            'system_updates',
            'tardy_alerts',
            'time_format',
            'two_factor_auth',
            'working_hours_end',
            'working_hours_start',
            
            // Dotted versions (backend will handle these properly)
            'general.company_name',
            'general.date_format',
            'general.time_format',
            'general.working_hours_end',
            'general.working_hours_start'
        ];
        
        console.log(`🗑️  Will remove ${settingsToRemove.length} duplicate settings...`);
        
        for (const settingKey of settingsToRemove) {
            try {
                const result = await db.execute(
                    'DELETE FROM system_settings WHERE setting_key = ?',
                    [settingKey]
                );
                console.log(`✅ Removed: ${settingKey}`);
            } catch (error) {
                console.log(`⚠️  Failed to remove ${settingKey}: ${error.message}`);
            }
        }
        
        // Check remaining settings
        console.log('\n📋 Checking remaining settings...');
        const remainingSettings = await db.execute('SELECT setting_key FROM system_settings ORDER BY setting_key');
        
        console.log(`\n✅ Cleanup complete! Remaining settings: ${remainingSettings.length}`);
        console.log('\nRemaining setting keys:');
        remainingSettings.forEach(setting => {
            console.log(`  - ${setting.setting_key}`);
        });
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        process.exit(0);
    }
}

cleanupDuplicateSettings();
