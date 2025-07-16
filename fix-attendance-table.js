const db = require('./backend/database/connection');

async function fixAttendanceTable() {
    try {
        console.log('🔧 Fixing attendance_records table structure...');
        
        // First, let's check the current structure
        console.log('📋 Checking current table structure...');
        
        try {
            const [results] = await db.execute('DESCRIBE attendance_records');
            console.log('Current table structure:');
            results.forEach(row => {
                console.log(`  - ${row.Field}: ${row.Type} ${row.Key ? '(Key)' : ''}`);
            });
        } catch (error) {
            console.log('❌ Table does not exist or cannot be accessed');
        }
        
        // Drop and recreate table with the correct structure that matches backend expectations
        console.log('⚠️ Dropping existing table if it exists...');
        await db.execute('DROP TABLE IF EXISTS attendance_records');
        
        console.log('✅ Creating attendance_records table with correct structure...');
        await db.execute(`
            CREATE TABLE attendance_records (
                id INT PRIMARY KEY AUTO_INCREMENT,
                attendance_id VARCHAR(50) UNIQUE NOT NULL,
                employee_id VARCHAR(50) NOT NULL,
                date DATE NOT NULL,
                time_in DATETIME,
                time_out DATETIME,
                hours_worked DECIMAL(4,2) DEFAULT 0,
                overtime_hours DECIMAL(4,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'present',
                notes TEXT,
                location VARCHAR(100),
                manual_entry BOOLEAN DEFAULT FALSE,
                manual_entry_by VARCHAR(50),
                manual_entry_reason TEXT,
                clock_in_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_employee_id (employee_id),
                INDEX idx_date (date),
                INDEX idx_employee_date (employee_id, date),
                INDEX idx_attendance_id (attendance_id)
            )
        `);
        
        console.log('✅ Table created successfully!');
        
        // Insert some sample data for testing
        console.log('📝 Inserting sample attendance data...');
        await db.execute(`
            INSERT INTO attendance_records (attendance_id, employee_id, date, time_in, time_out, hours_worked, status, notes) VALUES
            ('ATT172634567890001', 'emp_001', '2025-07-15', '2025-07-15 08:00:00', '2025-07-15 17:00:00', 8.00, 'present', 'Regular work day'),
            ('ATT172634567890002', 'emp_002', '2025-07-15', '2025-07-15 09:00:00', '2025-07-15 18:00:00', 8.00, 'present', 'Regular work day'),
            ('ATT172634567890003', 'emp_001', '2025-07-14', '2025-07-14 08:00:00', '2025-07-14 17:30:00', 8.50, 'present', 'Overtime'),
            ('ATT172634567890004', 'emp_002', '2025-07-14', '2025-07-14 09:00:00', '2025-07-14 17:00:00', 7.00, 'present', 'Left early')
        `);
        
        console.log('✅ Sample data inserted!');
        
        // Verify the new structure
        console.log('📋 Verifying new table structure...');
        const [results] = await db.execute('DESCRIBE attendance_records');
        console.log('New table structure:');
        results.forEach(row => {
            console.log(`  - ${row.Field}: ${row.Type} ${row.Key ? '(Key)' : ''}`);
        });
        
        console.log('🎯 attendance_records table is ready for use!');
        
    } catch (error) {
        console.error('❌ Error fixing table:', error.message);
    } finally {
        process.exit(0);
    }
}

fixAttendanceTable();
