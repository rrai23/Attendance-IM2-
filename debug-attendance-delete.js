const db = require('./backend/database/connection');

console.log('=== ATTENDANCE DELETE DEBUGGING ===');

async function debugAttendanceDelete() {
    try {
        console.log('\n1. Testing database connection...');
        const testQueryResult = await db.execute('SELECT COUNT(*) as count FROM attendance_records');
        console.log('Raw query result:', testQueryResult);
        console.log('Query result type:', typeof testQueryResult);
        console.log('Query result length:', testQueryResult.length);
        
        if (testQueryResult.length > 0 && testQueryResult[0].length > 0) {
            console.log('✅ Database connection working, attendance records count:', testQueryResult[0][0].count);
        } else {
            console.log('❌ Unexpected query result structure');
            return;
        }
        
        console.log('\n2. Testing attendance record existence check...');
        // Test the query that the DELETE route uses
        const testId = 1; // Test with ID 1
        const existing = await db.execute(
            'SELECT * FROM attendance_records WHERE id = ?',
            [testId]
        );
        
        console.log('Query result structure:', {
            type: typeof existing,
            isArray: Array.isArray(existing),
            length: existing.length,
            firstElementType: existing[0] ? typeof existing[0] : 'undefined',
            firstElementKeys: existing[0] ? Object.keys(existing[0]) : 'no first element'
        });
        
        if (existing.length > 0) {
            console.log('First result:', existing[0]);
        }
        
        console.log('\n3. Testing proper result destructuring...');
        const [rows, fields] = await db.execute(
            'SELECT * FROM attendance_records WHERE id = ?',
            [testId]
        );
        
        console.log('Destructured result:', {
            rowsType: typeof rows,
            rowsIsArray: Array.isArray(rows),
            rowsLength: rows.length,
            fieldsType: typeof fields,
            fieldsLength: fields ? fields.length : 'undefined'
        });
        
        if (rows.length > 0) {
            console.log('First row from destructured result:', rows[0]);
        }
        
        console.log('\n4. Testing attendance records with full data...');
        const [allRecords] = await db.execute(
            'SELECT ar.*, e.full_name FROM attendance_records ar LEFT JOIN employees e ON ar.employee_id = e.id LIMIT 5'
        );
        
        console.log('Sample attendance records:');
        allRecords.forEach((record, index) => {
            console.log(`Record ${index + 1}:`, {
                id: record.id,
                employee_id: record.employee_id,
                date: record.date,
                status: record.status,
                employee_name: record.full_name
            });
        });
        
        console.log('\n5. Testing auth token validation...');
        const token = 'Bearer dev_token_admin';
        console.log('Test token:', token);
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
    }
    
    process.exit(0);
}

debugAttendanceDelete();
