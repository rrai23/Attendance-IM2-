/**
 * Employee Management Module for Bricks Attendance System
 * Handles employee attendance management, status overrides, and time tracking
 */

class EmployeeAttendanceManager {
    constructor() {
        this.attendanceRecords = [];
        this.employees = [];
        this.currentViewingRecord = null;
        this.statusTypes = {
            present: { label: 'Present', icon: '✅', color: '#22c55e' },
            late: { label: 'Late', icon: '⏰', color: '#f59e0b' },
            absent: { label: 'Absent', icon: '❌', color: '#ef4444' },
            overtime: { label: 'Overtime', icon: '🌙', color: '#8b5cf6' },
            sick: { label: 'Sick Leave', icon: '🤒', color: '#f87171' },
            vacation: { label: 'Vacation', icon: '🏖️', color: '#3b82f6' },
            halfday: { label: 'Half Day', icon: '⏱️', color: '#06b6d4' }
        };
        
        this.workSettings = {
            standardHours: 8,
            lateThreshold: 15, // minutes
            overtimeThreshold: 8.5, // hours
            workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        };
    }

    /**
     * Initialize the employee attendance manager
     */
    async init() {
        try {
            await this.loadEmployees();
            await this.loadAttendanceRecords();
            this.setupEventHandlers();
            return true;
        } catch (error) {
            console.error('Failed to initialize employee attendance manager:', error);
            throw error;
        }
    }

    /**
     * Load employee data
     */
    async loadEmployees() {
        try {
            // In a real application, this would fetch from an API
            this.employees = [
                {
                    id: 1,
                    employeeId: 'EMP001',
                    name: 'John Doe',
                    department: 'Engineering',
                    position: 'Senior Developer',
                    email: 'john.doe@company.com',
                    schedule: {
                        monday: { start: '09:00', end: '17:00' },
                        tuesday: { start: '09:00', end: '17:00' },
                        wednesday: { start: '09:00', end: '17:00' },
                        thursday: { start: '09:00', end: '17:00' },
                        friday: { start: '09:00', end: '17:00' }
                    }
                },
                {
                    id: 2,
                    employeeId: 'EMP002',
                    name: 'Jane Smith',
                    department: 'Marketing',
                    position: 'Marketing Manager',
                    email: 'jane.smith@company.com',
                    schedule: {
                        monday: { start: '08:30', end: '16:30' },
                        tuesday: { start: '08:30', end: '16:30' },
                        wednesday: { start: '08:30', end: '16:30' },
                        thursday: { start: '08:30', end: '16:30' },
                        friday: { start: '08:30', end: '16:30' }
                    }
                },
                {
                    id: 3,
                    employeeId: 'EMP003',
                    name: 'Bob Johnson',
                    department: 'Sales',
                    position: 'Sales Representative',
                    email: 'bob.johnson@company.com',
                    schedule: {
                        monday: { start: '09:00', end: '17:00' },
                        tuesday: { start: '09:00', end: '17:00' },
                        wednesday: { start: '09:00', end: '17:00' },
                        thursday: { start: '09:00', end: '17:00' },
                        friday: { start: '09:00', end: '17:00' }
                    }
                },
                {
                    id: 4,
                    employeeId: 'EMP004',
                    name: 'Alice Brown',
                    department: 'HR',
                    position: 'HR Coordinator',
                    email: 'alice.brown@company.com',
                    schedule: {
                        monday: { start: '08:00', end: '16:00' },
                        tuesday: { start: '08:00', end: '16:00' },
                        wednesday: { start: '08:00', end: '16:00' },
                        thursday: { start: '08:00', end: '16:00' },
                        friday: { start: '08:00', end: '16:00' }
                    }
                },
                {
                    id: 5,
                    employeeId: 'EMP005',
                    name: 'Charlie Wilson',
                    department: 'Engineering',
                    position: 'Lead Developer',
                    email: 'charlie.wilson@company.com',
                    schedule: {
                        monday: { start: '10:00', end: '18:00' },
                        tuesday: { start: '10:00', end: '18:00' },
                        wednesday: { start: '10:00', end: '18:00' },
                        thursday: { start: '10:00', end: '18:00' },
                        friday: { start: '10:00', end: '18:00' }
                    }
                }
            ];
            
            console.log(`Loaded ${this.employees.length} employees`);
            return this.employees;
        } catch (error) {
            console.error('Error loading employees:', error);
            throw new Error('Failed to load employee data');
        }
    }

    /**
     * Load attendance records
     */
    async loadAttendanceRecords() {
        try {
            // Generate sample attendance data for the current week
            this.attendanceRecords = this.generateSampleAttendance();
            console.log(`Loaded ${this.attendanceRecords.length} attendance records`);
            return this.attendanceRecords;
        } catch (error) {
            console.error('Error loading attendance records:', error);
            throw new Error('Failed to load attendance data');
        }
    }

    /**
     * Generate sample attendance data
     */
    generateSampleAttendance() {
        const records = [];
        const today = new Date();
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

        // Generate records for the past 7 days
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + dayOffset);
            const dateString = date.toISOString().split('T')[0];

            this.employees.forEach((employee, empIndex) => {
                // Skip weekends for most employees
                if (date.getDay() === 0 || date.getDay() === 6) {
                    return; // Skip Sunday and Saturday
                }

                // Randomly generate attendance scenarios
                const scenarios = [
                    { status: 'present', probability: 0.7 },
                    { status: 'late', probability: 0.15 },
                    { status: 'absent', probability: 0.1 },
                    { status: 'overtime', probability: 0.05 }
                ];

                const randomValue = Math.random();
                let cumulativeProbability = 0;
                let selectedStatus = 'present';

                for (const scenario of scenarios) {
                    cumulativeProbability += scenario.probability;
                    if (randomValue <= cumulativeProbability) {
                        selectedStatus = scenario.status;
                        break;
                    }
                }

                // Generate times based on status
                let clockIn = null;
                let clockOut = null;
                let hours = 0;

                if (selectedStatus !== 'absent') {
                    const schedule = employee.schedule[this.getDayName(date.getDay())];
                    if (schedule) {
                        // Generate clock-in time
                        const baseClockIn = new Date(`2000-01-01T${schedule.start}`);
                        let clockInVariation = 0;

                        if (selectedStatus === 'late') {
                            clockInVariation = Math.random() * 60 + 15; // 15-75 minutes late
                        } else {
                            clockInVariation = (Math.random() - 0.5) * 30; // ±15 minutes variation
                        }

                        baseClockIn.setMinutes(baseClockIn.getMinutes() + clockInVariation);
                        clockIn = baseClockIn.toTimeString().substring(0, 5);

                        // Generate clock-out time
                        const baseClockOut = new Date(`2000-01-01T${schedule.end}`);
                        let clockOutVariation = 0;

                        if (selectedStatus === 'overtime') {
                            clockOutVariation = Math.random() * 120 + 60; // 1-3 hours overtime
                        } else {
                            clockOutVariation = (Math.random() - 0.5) * 30; // ±15 minutes variation
                        }

                        baseClockOut.setMinutes(baseClockOut.getMinutes() + clockOutVariation);
                        clockOut = baseClockOut.toTimeString().substring(0, 5);

                        // Calculate hours
                        hours = this.calculateWorkHours(clockIn, clockOut);
                    }
                }

                const record = {
                    id: `${employee.id}-${dateString}`,
                    employeeId: employee.id,
                    employeeName: employee.name,
                    employeeCode: employee.employeeId,
                    department: employee.department,
                    date: dateString,
                    clockIn: clockIn,
                    clockOut: clockOut,
                    status: selectedStatus,
                    hours: hours,
                    overtimeHours: Math.max(0, hours - this.workSettings.standardHours),
                    notes: this.generateNotes(selectedStatus),
                    lastModified: new Date().toISOString(),
                    modifiedBy: 'System'
                };

                records.push(record);
            });
        }

        return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Get day name from day number
     */
    getDayName(dayNumber) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[dayNumber];
    }

    /**
     * Calculate work hours between clock in and clock out
     */
    calculateWorkHours(clockIn, clockOut) {
        if (!clockIn || !clockOut) return 0;

        const start = new Date(`2000-01-01T${clockIn}`);
        const end = new Date(`2000-01-01T${clockOut}`);
        
        // Handle cases where clock out is next day
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }

        const diffMs = end - start;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Calculate hours worked between clock in and clock out times
     */
    calculateHours(clockIn, clockOut) {
        if (!clockIn || !clockOut) {
            return '0.0h';
        }

        try {
            const start = new Date(`2000-01-01T${clockIn}`);
            const end = new Date(`2000-01-01T${clockOut}`);
            const diffMs = end - start;
            
            if (diffMs < 0) {
                return '0.0h'; // Handle cases where clock out is before clock in
            }
            
            const hours = diffMs / (1000 * 60 * 60);
            return `${hours.toFixed(1)}h`;
        } catch (error) {
            console.error('Error calculating hours:', error);
            return '0.0h';
        }
    }

    /**
     * Generate appropriate notes based on status
     */
    generateNotes(status) {
        const noteOptions = {
            present: ['', '', '', 'On time'],
            late: ['Traffic delay', 'Public transport delay', 'Personal emergency', 'Overslept'],
            absent: ['Sick leave', 'Family emergency', 'Medical appointment', 'Personal leave'],
            overtime: ['Project deadline', 'Client meeting', 'System maintenance', 'Urgent task']
        };

        const options = noteOptions[status] || [''];
        return options[Math.floor(Math.random() * options.length)];
    }

    /**
     * Get employee by ID
     */
    getEmployee(employeeId) {
        return this.employees.find(emp => emp.id === employeeId);
    }

    /**
     * Get attendance records for a specific employee
     */
    getEmployeeAttendance(employeeId, startDate = null, endDate = null) {
        let records = this.attendanceRecords.filter(record => record.employeeId === employeeId);

        if (startDate) {
            records = records.filter(record => record.date >= startDate);
        }

        if (endDate) {
            records = records.filter(record => record.date <= endDate);
        }

        return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Get attendance records for a specific date
     */
    getDateAttendance(date) {
        return this.attendanceRecords.filter(record => record.date === date);
    }

    /**
     * Add or update attendance record
     */
    async saveAttendanceRecord(recordData) {
        try {
            const existingRecordIndex = this.attendanceRecords.findIndex(
                record => record.employeeId === recordData.employeeId && record.date === recordData.date
            );

            const employee = this.getEmployee(recordData.employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }

            // Calculate hours if clock times are provided
            let hours = 0;
            let overtimeHours = 0;
            
            if (recordData.clockIn && recordData.clockOut) {
                hours = this.calculateWorkHours(recordData.clockIn, recordData.clockOut);
                overtimeHours = Math.max(0, hours - this.workSettings.standardHours);
            }

            const record = {
                id: recordData.id || `${recordData.employeeId}-${recordData.date}`,
                employeeId: recordData.employeeId,
                employeeName: employee.name,
                employeeCode: employee.employeeId,
                department: employee.department,
                date: recordData.date,
                clockIn: recordData.clockIn || null,
                clockOut: recordData.clockOut || null,
                status: recordData.status,
                hours: hours,
                overtimeHours: overtimeHours,
                notes: recordData.notes || '',
                lastModified: new Date().toISOString(),
                modifiedBy: 'Admin' // In a real app, this would be the current user
            };

            if (existingRecordIndex >= 0) {
                this.attendanceRecords[existingRecordIndex] = record;
            } else {
                this.attendanceRecords.push(record);
            }

            // Sort records by date (newest first)
            this.attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

            console.log('Attendance record saved:', record);
            return record;
        } catch (error) {
            console.error('Error saving attendance record:', error);
            throw error;
        }
    }

    /**
     * Delete attendance record
     */
    async deleteAttendanceRecord(employeeId, date) {
        try {
            const recordIndex = this.attendanceRecords.findIndex(
                record => record.employeeId === employeeId && record.date === date
            );

            if (recordIndex === -1) {
                throw new Error('Attendance record not found');
            }

            const deletedRecord = this.attendanceRecords.splice(recordIndex, 1)[0];
            console.log('Attendance record deleted:', deletedRecord);
            return deletedRecord;
        } catch (error) {
            console.error('Error deleting attendance record:', error);
            throw error;
        }
    }

    /**
     * Override employee status for a specific date
     */
    async overrideStatus(employeeId, date, newStatus, notes = '') {
        try {
            const employee = this.getEmployee(employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }

            const existingRecord = this.attendanceRecords.find(
                record => record.employeeId === employeeId && record.date === date
            );

            if (existingRecord) {
                existingRecord.status = newStatus;
                existingRecord.notes = notes;
                existingRecord.lastModified = new Date().toISOString();
                existingRecord.modifiedBy = 'Admin';
            } else {
                // Create new record with status override
                const record = {
                    id: `${employeeId}-${date}`,
                    employeeId: employeeId,
                    employeeName: employee.name,
                    employeeCode: employee.employeeId,
                    department: employee.department,
                    date: date,
                    clockIn: null,
                    clockOut: null,
                    status: newStatus,
                    hours: 0,
                    overtimeHours: 0,
                    notes: notes,
                    lastModified: new Date().toISOString(),
                    modifiedBy: 'Admin'
                };

                this.attendanceRecords.push(record);
                this.attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            }

            console.log(`Status override applied: Employee ${employeeId}, Date ${date}, Status: ${newStatus}`);
            return true;
        } catch (error) {
            console.error('Error overriding status:', error);
            throw error;
        }
    }

    /**
     * Override attendance status for a specific employee and date
     */
    async overrideStatus(employeeId, date, newStatus, notes = '') {
        try {
            const recordIndex = this.attendanceRecords.findIndex(
                record => record.employeeId === employeeId && record.date === date
            );

            if (recordIndex === -1) {
                throw new Error('Attendance record not found');
            }

            const record = this.attendanceRecords[recordIndex];
            const oldStatus = record.status;
            
            // Update the record
            record.status = newStatus;
            record.notes = notes || `Status overridden from ${oldStatus} to ${newStatus} on ${new Date().toLocaleString()}`;
            record.lastModified = new Date().toISOString();
            record.modifiedBy = 'Admin';

            console.log('Status overridden:', record);
            this.broadcastAttendanceUpdate(record);
            return record;
        } catch (error) {
            console.error('Error overriding status:', error);
            throw error;
        }
    }

    /**
     * Get attendance statistics for a date range
     */
    getAttendanceStats(startDate = null, endDate = null) {
        let records = this.attendanceRecords;

        if (startDate) {
            records = records.filter(record => record.date >= startDate);
        }

        if (endDate) {
            records = records.filter(record => record.date <= endDate);
        }

        const stats = {
            total: records.length,
            present: records.filter(r => r.status === 'present').length,
            late: records.filter(r => r.status === 'late').length,
            absent: records.filter(r => r.status === 'absent').length,
            overtime: records.filter(r => r.status === 'overtime').length,
            sick: records.filter(r => r.status === 'sick').length,
            vacation: records.filter(r => r.status === 'vacation').length,
            totalHours: records.reduce((sum, record) => sum + record.hours, 0),
            totalOvertimeHours: records.reduce((sum, record) => sum + record.overtimeHours, 0)
        };

        stats.attendanceRate = stats.total > 0 ? ((stats.present + stats.late + stats.overtime) / stats.total * 100) : 0;
        stats.avgHoursPerDay = stats.total > 0 ? (stats.totalHours / stats.total) : 0;

        return stats;
    }

    /**
     * Export attendance data to CSV
     */
    exportToCSV(records = null) {
        const data = records || this.attendanceRecords;
        
        const headers = [
            'Employee ID',
            'Employee Name',
            'Department',
            'Date',
            'Clock In',
            'Clock Out',
            'Status',
            'Hours',
            'Overtime Hours',
            'Notes',
            'Last Modified',
            'Modified By'
        ];

        const rows = data.map(record => [
            record.employeeCode,
            record.employeeName,
            record.department,
            record.date,
            record.clockIn || '',
            record.clockOut || '',
            record.status,
            record.hours,
            record.overtimeHours,
            record.notes || '',
            record.lastModified,
            record.modifiedBy
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    /**
     * Setup event handlers for real-time updates
     */
    setupEventHandlers() {
        // Listen for attendance updates from other parts of the system
        document.addEventListener('attendanceUpdate', (event) => {
            console.log('Attendance update received:', event.detail);
            // Refresh data if needed
        });

        // Listen for employee updates
        document.addEventListener('employeeUpdate', (event) => {
            console.log('Employee update received:', event.detail);
            // Refresh employee data if needed
        });

        // Setup modal event handlers
        this.setupModalEventHandlers();
    }

    /**
     * Setup modal event handlers
     */
    setupModalEventHandlers() {
        // View modal close handlers
        const closeViewModal = document.getElementById('closeViewModal');
        const closeViewBtn = document.getElementById('closeViewBtn');
        const editFromViewBtn = document.getElementById('editFromViewBtn');

        if (closeViewModal) {
            closeViewModal.addEventListener('click', () => this.closeViewModal());
        }

        if (closeViewBtn) {
            closeViewBtn.addEventListener('click', () => this.closeViewModal());
        }

        if (editFromViewBtn) {
            editFromViewBtn.addEventListener('click', () => {
                this.closeViewModal();
                // Get the record ID from the view modal and edit it
                const recordId = this.currentViewingRecord?.id;
                if (recordId && window.employeeManagement) {
                    window.employeeManagement.editRecord(recordId);
                }
            });
        }

        // Close modal on overlay click
        const viewModal = document.getElementById('viewAttendanceModal');
        if (viewModal) {
            viewModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.closeViewModal();
                }
            });
        }
    }

    /**
     * Broadcast attendance update event
     */
    broadcastAttendanceUpdate(record) {
        const event = new CustomEvent('attendanceUpdate', {
            detail: {
                type: 'recordUpdated',
                record: record,
                timestamp: new Date().toISOString()
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Open view modal for an attendance record
     */
    openViewModal(record) {
        const modal = document.getElementById('viewAttendanceModal');
        if (!modal) return;

        // Store the current record for editing from view modal
        this.currentViewingRecord = record;

        const employee = this.employees.find(emp => emp.id === record.employeeId);
        
        document.getElementById('viewEmployeeName').textContent = employee ? employee.name : 'Unknown';
        document.getElementById('viewEmployeeCode').textContent = employee ? employee.employeeId : 'Unknown';
        document.getElementById('viewDate').textContent = this.formatDate(record.date);
        document.getElementById('viewStatus').textContent = this.statusTypes[record.status]?.label || record.status;
        document.getElementById('viewClockIn').textContent = record.clockIn || 'Not clocked in';
        document.getElementById('viewClockOut').textContent = record.clockOut || 'Not clocked out';
        document.getElementById('viewHours').textContent = this.calculateHours(record.clockIn, record.clockOut);
        document.getElementById('viewNotes').textContent = record.notes || 'No notes';

        // Style status badge
        const statusElement = document.getElementById('viewStatus');
        const statusInfo = this.statusTypes[record.status];
        if (statusInfo) {
            statusElement.style.color = statusInfo.color;
            statusElement.textContent = `${statusInfo.icon} ${statusInfo.label}`;
        }

        modal.classList.remove('hidden');
    }

    /**
     * Close view modal
     */
    closeViewModal() {
        const modal = document.getElementById('viewAttendanceModal');
        if (modal) {
            modal.classList.add('hidden');
            this.currentViewingRecord = null;
        }
    }

    /**
     * Open delete confirmation modal
     */
    openDeleteModal(record) {
        const modal = document.getElementById('deleteAttendanceModal');
        if (!modal) return;

        const employee = this.employees.find(emp => emp.id === record.employeeId);
        
        document.getElementById('deleteEmployeeName').textContent = employee ? employee.name : 'Unknown';
        document.getElementById('deleteDate').textContent = this.formatDate(record.date);
        
        // Store record ID for deletion
        modal.dataset.recordId = record.id;
        
        modal.classList.remove('hidden');
    }

    /**
     * Close delete modal
     */
    closeDeleteModal() {
        const modal = document.getElementById('deleteAttendanceModal');
        if (modal) {
            modal.classList.add('hidden');
            delete modal.dataset.recordId;
        }
    }

    /**
     * Delete an attendance record
     */
    async deleteAttendanceRecord(recordId) {
        try {
            const deleteBtn = document.getElementById('confirmDeleteBtn');
            if (deleteBtn) {
                this.setButtonLoading(deleteBtn, true);
            }

            // In a real app, this would make an API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            const recordIndex = this.attendanceRecords.findIndex(record => record.id === recordId);
            if (recordIndex !== -1) {
                this.attendanceRecords.splice(recordIndex, 1);
                this.closeDeleteModal();
                this.notifyDataChange();
                this.showNotification('Attendance record deleted successfully', 'success');
            } else {
                throw new Error('Record not found');
            }
        } catch (error) {
            console.error('Failed to delete attendance record:', error);
            this.showNotification('Failed to delete record', 'error');
        } finally {
            const deleteBtn = document.getElementById('confirmDeleteBtn');
            if (deleteBtn) {
                this.setButtonLoading(deleteBtn, false);
            }
        }
    }

    /**
     * Setup event handlers for modals
     */
    setupModalEventHandlers() {
        // View modal handlers
        const closeViewModal = document.getElementById('closeViewModal');
        const closeViewBtn = document.getElementById('closeViewBtn');
        const editFromViewBtn = document.getElementById('editFromViewBtn');
        
        if (closeViewModal) closeViewModal.addEventListener('click', () => this.closeViewModal());
        if (closeViewBtn) closeViewBtn.addEventListener('click', () => this.closeViewModal());
        if (editFromViewBtn) {
            editFromViewBtn.addEventListener('click', () => {
                this.closeViewModal();
                // Open edit modal - this would need the record data
                // Implementation depends on how the main page handles editing
            });
        }

        // Delete modal handlers
        const closeDeleteModal = document.getElementById('closeDeleteModal');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        
        if (closeDeleteModal) closeDeleteModal.addEventListener('click', () => this.closeDeleteModal());
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                const modal = document.getElementById('deleteAttendanceModal');
                const recordId = modal?.dataset.recordId;
                if (recordId) {
                    this.deleteAttendanceRecord(parseInt(recordId));
                }
            });
        }

        // Close modals on overlay click
        const viewModal = document.getElementById('viewAttendanceModal');
        const deleteModal = document.getElementById('deleteAttendanceModal');
        
        if (viewModal) {
            viewModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.closeViewModal();
                }
            });
        }
        
        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.closeDeleteModal();
                }
            });
        }
    }

    /**
     * Helper method to format date
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    /**
     * Helper method to calculate hours worked
     */
    calculateHours(clockIn, clockOut) {
        if (!clockIn || !clockOut) {
            return '0.0h';
        }

        try {
            const start = new Date(`2000-01-01T${clockIn}`);
            const end = new Date(`2000-01-01T${clockOut}`);
            const diffMs = end - start;
            
            if (diffMs < 0) {
                return '0.0h'; // Handle cases where clock out is before clock in
            }
            
            const hours = diffMs / (1000 * 60 * 60);
            return `${hours.toFixed(1)}h`;
        } catch (error) {
            console.error('Error calculating hours:', error);
            return '0.0h';
        }
    }

    /**
     * Helper method to show notifications
     */
    showNotification(message, type = 'info') {
        // Simple notification - can be enhanced with a proper notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 6px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * Helper method to set button loading state
     */
    setButtonLoading(button, loading) {
        if (!button) return;
        
        const textSpan = button.querySelector('.btn-text');
        const loadingSpan = button.querySelector('.btn-loading');
        
        if (loading) {
            if (textSpan) textSpan.classList.add('hidden');
            if (loadingSpan) loadingSpan.classList.remove('hidden');
            button.disabled = true;
        } else {
            if (textSpan) textSpan.classList.remove('hidden');
            if (loadingSpan) loadingSpan.classList.add('hidden');
            button.disabled = false;
        }
    }
}

// Global instance for use in other modules
window.employeeAttendanceManager = new EmployeeAttendanceManager();

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.employeeAttendanceManager.init().catch(console.error);
    });
} else {
    window.employeeAttendanceManager.init().catch(console.error);
}
