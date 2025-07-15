const db = require('./backend/database/connection');

async function createAttendanceTable() {
    try {
        console.log('🔧 Setting up attendance_records table...');
        
        // Drop and recreate table to ensure correct structure
        console.log('⚠️ Dropping existing table if it exists...');
        await db.execute('DROP TABLE IF EXISTS attendance_records');
        
        console.log('✅ Creating attendance_records table with proper structure...');
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
                INDEX idx_date (date),
                INDEX idx_employee_date (employee_id, date)
            )
        `);
        
        console.log('✅ Table created successfully!');
        
        // Insert some sample data for testing
        console.log('📝 Inserting sample attendance data...');
        await db.execute(`
            INSERT INTO attendance_records (employee_id, date, time_in, time_out, hours_worked, status, notes) VALUES
            ('emp_001', '2025-07-15', '08:00:00', '17:00:00', 8.00, 'present', 'Regular work day'),
            ('emp_002', '2025-07-15', '09:00:00', '18:00:00', 8.00, 'present', 'Regular work day'),
            ('emp_001', '2025-07-14', '08:00:00', '17:30:00', 8.50, 'present', 'Overtime'),
            ('emp_002', '2025-07-14', '09:00:00', '17:00:00', 7.00, 'present', 'Left early')
        `);
        
        console.log('✅ Sample data inserted!');
        console.log('🎯 attendance_records table is ready for use!');
        
    } catch (error) {
        console.error('❌ Error setting up table:', error.message);
    } finally {
        process.exit(0);
    }
}

createAttendanceTable();
