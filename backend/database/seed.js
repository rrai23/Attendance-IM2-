const db = require('./connection');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const seedDatabase = async () => {
    try {
        console.log('🌱 Seeding database with initial data...');

        // Load mock data
        const mockDataPath = path.join(__dirname, '../../mock/data.json');
        const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

        // Clear existing data (in correct order due to foreign key constraints)
        await db.execute('DELETE FROM attendance_records');
        await db.execute('DELETE FROM payroll_records');
        await db.execute('DELETE FROM employees');

        // Reset auto increment
        await db.execute('ALTER TABLE employees AUTO_INCREMENT = 1');
        await db.execute('ALTER TABLE attendance_records AUTO_INCREMENT = 1');
        await db.execute('ALTER TABLE payroll_records AUTO_INCREMENT = 1');

        console.log('🗑️ Cleared existing data');

        // Insert employees
        console.log('👥 Inserting employees...');
        const employeeInsertQuery = `
            INSERT INTO employees (
                id, employee_id, username, password, role, first_name, last_name, 
                email, department, position, hire_date, status, 
                wage, overtime_rate, avatar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const employee of mockData.employees) {
            // Hash password if it exists
            const hashedPassword = employee.password ? 
                await bcrypt.hash(employee.password, 12) : null;
                
            // Split fullName into first_name and last_name
            const nameParts = employee.fullName ? employee.fullName.split(' ') : ['', ''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            await db.execute(employeeInsertQuery, [
                employee.id,
                employee.employeeId,
                employee.username,
                hashedPassword,
                employee.role,
                firstName,
                lastName,
                employee.email,
                employee.department,
                employee.position,
                employee.dateHired,
                employee.status,
                employee.wage,
                employee.overtimeRate || 1.5,
                employee.avatar
            ]);
        }

        console.log(`✅ Inserted ${mockData.employees.length} employees`);

        // Insert attendance records
        console.log('📋 Inserting attendance records...');
        const attendanceInsertQuery = `
            INSERT INTO attendance_records (
                id, employee_id, date, time_in, time_out, 
                hours_worked, overtime_hours, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const record of mockData.attendance) {
            await db.execute(attendanceInsertQuery, [
                record.id,
                record.employeeId,
                record.date,
                record.timeIn,
                record.timeOut,
                record.hoursWorked,
                record.overtimeHours,
                record.status,
                record.notes
            ]);
        }

        console.log(`✅ Inserted ${mockData.attendance.length} attendance records`);

        // Insert payroll records if they exist
        if (mockData.payroll && mockData.payroll.length > 0) {
            console.log('💰 Inserting payroll records...');
            const payrollInsertQuery = `
                INSERT INTO payroll_records (
                    id, employee_id, pay_period_start, pay_period_end,
                    regular_hours, overtime_hours, gross_pay, net_pay, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            for (const payroll of mockData.payroll) {
                await db.execute(payrollInsertQuery, [
                    payroll.id,
                    payroll.employeeId,
                    payroll.payPeriodStart,
                    payroll.payPeriodEnd,
                    payroll.regularHours,
                    payroll.overtimeHours,
                    payroll.grossPay,
                    payroll.netPay,
                    payroll.status || 'draft'
                ]);
            }

            console.log(`✅ Inserted ${mockData.payroll.length} payroll records`);
        }

        console.log('🎉 Database seeding completed successfully!');

        // Display summary
        const [employeeCount] = await db.execute('SELECT COUNT(*) as count FROM employees');
        const [attendanceCount] = await db.execute('SELECT COUNT(*) as count FROM attendance_records');
        const [payrollCount] = await db.execute('SELECT COUNT(*) as count FROM payroll_records');

        console.log('\n📊 Database Summary:');
        console.log(`- Employees: ${employeeCount[0].count}`);
        console.log(`- Attendance Records: ${attendanceCount[0].count}`);
        console.log(`- Payroll Records: ${payrollCount[0].count}`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
};

// Run seeding if called directly
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log('✅ Seeding completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        });
}

module.exports = { seedDatabase };
