const db = require('./backend/database/connection');

async function debugOvertimeDelete() {
    try {
        console.log('🔍 Debugging overtime delete query...');
        
        // Check all records for employee
        console.log('\n1. All overtime requests for EMP250012:');
        const allRecords = await db.execute('SELECT * FROM overtime_requests WHERE employee_id = ?', ['EMP250012']);
        console.log(allRecords[0]);
        
        // Check specific record by ID
        console.log('\n2. Check specific record by ID 4:');
        const specificRecord = await db.execute('SELECT * FROM overtime_requests WHERE id = ?', [4]);
        console.log(specificRecord[0]);
        
        // Check with both conditions
        console.log('\n3. Check with both ID and employee_id:');
        const bothConditions = await db.execute('SELECT * FROM overtime_requests WHERE id = ? AND employee_id = ?', [4, 'EMP250012']);
        console.log('Raw result:', bothConditions);
        console.log('First element:', bothConditions[0]);
        console.log('Is array?', Array.isArray(bothConditions[0]));
        
        if (bothConditions[0]) {
            const processedRecords = Array.isArray(bothConditions[0]) ? bothConditions[0] : (bothConditions[0] ? [bothConditions[0]] : []);
            console.log('Processed records:', processedRecords);
            console.log('Length:', processedRecords.length);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

debugOvertimeDelete();
