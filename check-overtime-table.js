const db = require('./backend/database/connection');

async function checkOvertimeTable() {
    try {
        console.log('🔍 Checking overtime_requests table...');
        
        // Check if table exists
        const tables = await db.execute('SHOW TABLES LIKE "overtime_requests"');
        
        if (tables[0].length === 0) {
            console.log('❌ Table overtime_requests does not exist');
            return;
        }
        
        console.log('✅ Table overtime_requests exists');
        
        // Get table structure
        const structure = await db.execute('SHOW COLUMNS FROM overtime_requests');
        console.log('\n📋 Raw structure result:');
        console.log('Type:', typeof structure);
        console.log('Array?', Array.isArray(structure));
        console.log('Length:', structure?.length);
        console.log('Content:', structure);
        
        console.log('\n📋 Table structure:');
        if (structure && structure[0]) {
            const fields = Array.isArray(structure[0]) ? structure[0] : [structure[0]];
            console.log('Fields array:', fields);
            fields.forEach((field, index) => {
                console.log(`  ${index + 1}. ${field.Field}: ${field.Type} ${field.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${field.Key ? `(${field.Key})` : ''}`);
            });
        } else {
            console.log('  ❌ No structure data returned');
        }
        
        // Check for any existing data
        const count = await db.execute('SELECT COUNT(*) as count FROM overtime_requests');
        const countResult = Array.isArray(count[0]) ? count[0][0] : count[0];
        console.log(`\n📊 Records in table: ${countResult?.count || 0}`);
        
        if (countResult?.count > 0) {
            const sample = await db.execute('SELECT * FROM overtime_requests LIMIT 3');
            console.log('\n📄 Sample records:');
            console.log(sample[0]);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkOvertimeTable();
