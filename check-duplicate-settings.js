const db = require('./backend/database/connection');

async function checkDuplicateSettings() {
    try {
        console.log('🔍 Checking for duplicate settings in database...');
        
        // Get all settings
        const allSettings = await db.execute('SELECT setting_key, setting_value FROM system_settings ORDER BY setting_key');
        
        console.log('\n📋 All settings in database:');
        console.log('=' .repeat(60));
        
        const settingGroups = {};
        
        for (const setting of allSettings) {
            const key = setting.setting_key;
            const value = setting.setting_value;
            
            console.log(`${key}: ${value}`);
            
            // Group similar keys to find duplicates
            const normalizedKey = key.toLowerCase().replace(/[_\.]/g, '');
            if (!settingGroups[normalizedKey]) {
                settingGroups[normalizedKey] = [];
            }
            settingGroups[normalizedKey].push(key);
        }
        
        console.log('\n🔍 Checking for potential duplicates:');
        console.log('=' .repeat(60));
        
        let duplicatesFound = false;
        for (const [normalized, keys] of Object.entries(settingGroups)) {
            if (keys.length > 1) {
                console.log(`⚠️  DUPLICATE GROUP: ${keys.join(', ')}`);
                duplicatesFound = true;
            }
        }
        
        if (!duplicatesFound) {
            console.log('✅ No obvious duplicates found');
        }
        
        console.log(`\n📊 Total settings: ${allSettings.length}`);
        
    } catch (error) {
        console.error('❌ Error checking settings:', error);
    } finally {
        process.exit(0);
    }
}

checkDuplicateSettings();
