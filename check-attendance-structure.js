const db = require('./backend/database/connection');

async function checkAttendanceStructure() {
    try {
        console.log('🔍 Checking attendance_records table structure...');
        
        // Check if table exists
        const [tables] = await db.execute(`
            SHOW TABLES LIKE 'attendance_records'
        `);
        
        if (tables.length === 0) {
            console.log('❌ attendance_records table does not exist!');
            console.log('Creating basic attendance_records table...');
            
            await db.execute(`
                CREATE TABLE attendance_records (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) NOT NULL,
                    date DATE NOT NULL,
                    time_in TIME,
                    time_out TIME,
                    hours_worked DECIMAL(4,2) DEFAULT 0,
                    overtime_hours DECIMAL(4,2) DEFAULT 0,
                    status VARCHAR(20) DEFAULT 'present',
                    notes TEXT,
                    location VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_employee_id (employee_id),
                    INDEX idx_date (date)
                )
            `);
            
            console.log('✅ Created attendance_records table');
        } else {
            // Check existing structure
            const [columns] = await db.execute(`
                DESCRIBE attendance_records
            `);
            
            console.log('📋 Current attendance_records columns:');
            if (Array.isArray(columns)) {
                columns.forEach(col => {
                    console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
                });
                
                // Check for required fields
                const fieldNames = columns.map(col => col.Field);
                const requiredFields = ['id', 'employee_id', 'date', 'time_in', 'time_out', 'hours_worked', 'overtime_hours', 'status'];
                
                console.log('\n📋 Field check:');
                requiredFields.forEach(field => {
                    const exists = fieldNames.includes(field);
                    console.log(`  ${exists ? '✅' : '❌'} ${field} ${exists ? 'exists' : 'MISSING'}`);
                });
            } else {
                console.log('⚠️ Unexpected result format:', typeof columns);
            }
        }
        
        // Check sample data
        const [count] = await db.execute(`
            SELECT COUNT(*) as total FROM attendance_records
        `);
        
        console.log(`\n📊 Total attendance records: ${count[0].total}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkAttendanceStructure();
