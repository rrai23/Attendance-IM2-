// Test script to verify statistics calculation logic
console.log('Testing Analytics Statistics Calculation Logic...\n');

// Mock data that might come from the backend
const mockAttendanceRecords = [
    { employee_id: 'EMP001', status: 'present', total_hours: 8.0, overtime_hours: 0 },
    { employee_id: 'EMP002', status: 'late', total_hours: 7.5, overtime_hours: 0 },
    { employee_id: 'EMP003', status: 'absent', total_hours: 0, overtime_hours: 0 },
    { employee_id: 'EMP004', status: 'present', total_hours: 9.0, overtime_hours: 1.0 },
    { employee_id: 'EMP005', status: 'present', total_hours: 8.5, overtime_hours: 0.5 },
    { employee_id: 'EMP006', status: 'late', total_hours: 6.5, overtime_hours: 0 },
    { employee_id: 'EMP007', status: 'present', total_hours: 8.0, overtime_hours: 0 },
    { employee_id: 'EMP008', status: 'absent', total_hours: 0, overtime_hours: 0 },
    { employee_id: 'EMP009', status: 'present', total_hours: 10.0, overtime_hours: 2.0 },
    { employee_id: 'EMP010', status: 'present', total_hours: 8.0, overtime_hours: 0 }
];

// Test the calculation logic from analytics.js
function calculateSummaryStats(records) {
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late' || r.status === 'tardy').length;
    const absent = records.filter(r => r.status === 'absent').length;
    
    const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;
    const punctualityRate = total > 0 ? (present / total) * 100 : 0;
    const absenteeismRate = total > 0 ? (absent / total) * 100 : 0;
    
    const totalHours = records.reduce((sum, record) => {
        return sum + (parseFloat(record.total_hours) || 0);
    }, 0);
    
    const overtimeHours = records.reduce((sum, record) => {
        return sum + (parseFloat(record.overtime_hours) || 0);
    }, 0);
    
    return {
        totalDays: total,
        presentDays: present,
        lateDays: late,
        absentDays: absent,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        punctualityRate: Math.round(punctualityRate * 100) / 100,
        absenteeismRate: Math.round(absenteeismRate * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        averageHoursPerDay: total > 0 ? Math.round((totalHours / total) * 100) / 100 : 0
    };
}

console.log('Mock Attendance Records:');
console.log('Total records:', mockAttendanceRecords.length);
console.log('Present:', mockAttendanceRecords.filter(r => r.status === 'present').length);
console.log('Late:', mockAttendanceRecords.filter(r => r.status === 'late').length);
console.log('Absent:', mockAttendanceRecords.filter(r => r.status === 'absent').length);
console.log('');

const calculatedStats = calculateSummaryStats(mockAttendanceRecords);

console.log('Calculated Statistics:');
console.log('Attendance Rate:', calculatedStats.attendanceRate + '%', '(Present + Late / Total)');
console.log('Punctuality Rate:', calculatedStats.punctualityRate + '%', '(Present / Total)');
console.log('Absenteeism Rate:', calculatedStats.absenteeismRate + '%', '(Absent / Total)');
console.log('Total Hours:', calculatedStats.totalHours + 'h');
console.log('Overtime Hours:', calculatedStats.overtimeHours + 'h');
console.log('Average Hours/Day:', calculatedStats.averageHoursPerDay + 'h');
console.log('');

// Manual verification
const manualAttendanceRate = ((6 + 2) / 10) * 100; // (present + late) / total
const manualPunctualityRate = (6 / 10) * 100; // present / total
const manualAbsenteeismRate = (2 / 10) * 100; // absent / total
const manualTotalHours = 8.0 + 7.5 + 0 + 9.0 + 8.5 + 6.5 + 8.0 + 0 + 10.0 + 8.0;
const manualOvertimeHours = 0 + 0 + 0 + 1.0 + 0.5 + 0 + 0 + 0 + 2.0 + 0;

console.log('Manual Verification:');
console.log('Expected Attendance Rate:', manualAttendanceRate + '%');
console.log('Expected Punctuality Rate:', manualPunctualityRate + '%');
console.log('Expected Absenteeism Rate:', manualAbsenteeismRate + '%');
console.log('Expected Total Hours:', manualTotalHours + 'h');
console.log('Expected Overtime Hours:', manualOvertimeHours + 'h');
console.log('');

console.log('✓ Calculations are', 
    calculatedStats.attendanceRate === manualAttendanceRate &&
    calculatedStats.punctualityRate === manualPunctualityRate &&
    calculatedStats.absenteeismRate === manualAbsenteeismRate &&
    calculatedStats.totalHours === manualTotalHours &&
    calculatedStats.overtimeHours === manualOvertimeHours 
    ? 'CORRECT' : 'INCORRECT');

// Test filtering logic
console.log('\n--- Testing Filter Logic ---');
const itDepartmentRecords = mockAttendanceRecords.slice(0, 5); // First 5 employees are "IT"
const itStats = calculateSummaryStats(itDepartmentRecords);

console.log('IT Department (filtered) Statistics:');
console.log('Records:', itDepartmentRecords.length);
console.log('Attendance Rate:', itStats.attendanceRate + '%');
console.log('Total Hours:', itStats.totalHours + 'h');

console.log('\nThe filtering should work if:');
console.log('1. Department dropdown is populated');
console.log('2. Event listeners are attached');
console.log('3. API requests include correct query parameters');
console.log('4. Backend responds with filtered data');
console.log('5. Frontend processes the filtered data correctly');
