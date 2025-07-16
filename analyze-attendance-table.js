const db = require('./backend/database/connection');

async function analyzeAttendanceTable() {
    try {
        console.log('Analyzing attendance_records table structure...');
        
        // Get table structure
        const tableStructure = await db.execute(`
            DESCRIBE attendance_records
        `);
        
        console.log('\nTable Structure:');
        console.log('================');
        console.log('Raw response:', JSON.stringify(tableStructure, null, 2));
        
        const columns = tableStructure[0] || tableStructure;
        if (Array.isArray(columns)) {
            columns.forEach(column => {
                console.log(`${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${column.Key ? `[${column.Key}]` : ''} ${column.Default ? `Default: ${column.Default}` : ''}`);
            });
        } else {
            console.log('Unexpected table structure format');
        }
        
        // Check if there's any existing data
        const [existingData] = await db.execute(`
            SELECT COUNT(*) as count FROM attendance_records
        `);
        
        console.log(`\nExisting records count: ${existingData[0].count}`);
        
        // Get some sample employees to use for test data
        const [employees] = await db.execute(`
            SELECT employee_id, full_name, department FROM employees LIMIT 10
        `);
        
        console.log('\nAvailable employees for sample data:');
        console.log('===================================');
        employees.forEach(emp => {
            console.log(`ID: ${emp.employee_id}, Name: ${emp.full_name}, Department: ${emp.department}`);
        });
        
        // Check if employees table exists and has data
        if (employees.length === 0) {
            console.log('\nNo employees found! You may need to add employees first.');
        }
        
        await db.end();
        
    } catch (error) {
        console.error('Error analyzing attendance table:', error);
        process.exit(1);
    }
}

analyzeAttendanceTable();
