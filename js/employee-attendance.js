/**
 * Employee Management Module for Bricks Attendance System
 * Handles employee attendance management, status overrides, and time tracking
 */

class EmployeeAttendanceManager {
    constructor() {
        this.attendanceRecords = [];
        this.employees = [];
        this.currentViewingRecord = null;
        this.currentEditingRecord = null;
        this.directFlow = null;
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
            console.log('Initializing EmployeeAttendanceManager...');
            
            // Initialize DirectFlow API service
            await this.initializeDataService();
            
            // Load data in parallel for better performance - don't fail if employees fail to load
            const [employees, attendanceRecords] = await Promise.allSettled([
                this.loadEmployees(),
                this.loadAttendanceRecords()
            ]);
            
            // Check results
            if (employees.status === 'rejected') {
                console.warn('Employee loading failed, continuing with empty employee list');
                this.employees = [];
            }
            
            if (attendanceRecords.status === 'rejected') {
                console.warn('Attendance loading failed, continuing with empty attendance list');
                this.attendanceRecords = [];
            }
            
            this.setupEventHandlers();
            
            console.log('EmployeeAttendanceManager initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize employee attendance manager:', error);
            // Don't throw error - just log it and continue
            console.warn('Continuing with partial initialization');
            return false;
        }
    }

    /**
     * Initialize the data service
     */
    async initializeDataService() {
        try {
            // Wait for DirectFlow to be ready - optimized with shorter intervals
            let waitCount = 0;
            const maxWait = 50; // 5 seconds max wait
            
            while ((!window.directFlow || !window.directFlow.initialized) && waitCount < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }
            
            if (!window.directFlow || !window.directFlow.initialized) {
                throw new Error('DirectFlow not available or not initialized');
            }
            
            this.directFlow = window.directFlow;
            console.log('Employee Attendance using DirectFlow API');
        } catch (error) {
            console.error('Failed to initialize DirectFlow:', error);
            throw error;
        }
    }

    /**
     * Load employee data
     */
    async loadEmployees() {
        try {
            console.log('Loading employees from DirectFlow API...');
            
            // Get employees from DirectFlow
            const employeesResponse = await this.directFlow.getEmployees();
            
            if (!employeesResponse.success) {
                console.warn('Failed to load employees from DirectFlow, using empty employee list');
                this.employees = [];
                return this.employees;
            }
            
            // Handle nested data structure
            const employeesData = employeesResponse.data.employees || employeesResponse.data || [];
            
            // Transform data to match the expected format for this module
            this.employees = employeesData.map(emp => ({
                id: emp.id,
                employeeId: emp.employee_id || emp.id,
                name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                department: emp.department,
                position: emp.position,
                email: emp.email,
                phone: emp.phone,
                role: emp.role,
                schedule: this.getEmployeeSchedule(emp)
            }));
            
            console.log(`Loaded ${this.employees.length} employees from DirectFlow API`);
            return this.employees;
        } catch (error) {
            console.error('Error loading employees:', error);
            console.warn('Continuing with empty employee list due to error');
            this.employees = [];
            return this.employees;
        }
    }

    /**
     * Get employee schedule from employee data
     */
    getEmployeeSchedule(emp) {
        // If employee has schedule data, use it; otherwise use default
        if (emp.schedule) {
            return emp.schedule;
        }
        
        // Default schedule based on position/role
        const defaultStart = emp.role === 'manager' ? '07:30' : '08:00';
        const defaultEnd = emp.role === 'manager' ? '16:30' : '17:00';
        
        return {
            monday: { start: defaultStart, end: defaultEnd },
            tuesday: { start: defaultStart, end: defaultEnd },
            wednesday: { start: defaultStart, end: defaultEnd },
            thursday: { start: defaultStart, end: defaultEnd },
            friday: { start: defaultStart, end: defaultEnd }
        };
    }

    /**
     * Load attendance records
     */
    async loadAttendanceRecords() {
        try {
            console.log('Loading attendance records from DirectFlow API...');
            
            // Get all attendance records from DirectFlow
            const attendanceResponse = await this.directFlow.getAttendanceRecords();
            
            console.log('DirectFlow attendance response:', attendanceResponse);
            
            let records = [];
            
            // Handle different response formats
            if (Array.isArray(attendanceResponse)) {
                // Direct array response
                records = attendanceResponse;
            } else if (attendanceResponse && attendanceResponse.success) {
                // Standard response object format
                records = attendanceResponse.data.attendance || attendanceResponse.data || [];
            } else if (attendanceResponse && attendanceResponse.data) {
                // Response object without success flag
                records = attendanceResponse.data.attendance || attendanceResponse.data || [];
            } else {
                throw new Error(attendanceResponse?.message || 'Failed to load attendance records');
            }
            
            // Transform data to match the expected format for this module
            this.attendanceRecords = records.map(record => ({
                id: record.id,
                employeeId: record.employee_id || record.employeeId,
                date: record.date,
                clockIn: record.clock_in || record.timeIn,
                clockOut: record.clock_out || record.timeOut,
                lunchStart: record.lunch_start || record.lunchStart,
                lunchEnd: record.lunch_end || record.lunchEnd,
                hours: record.hours_worked || record.hoursWorked || 0,
                regularHours: record.regular_hours || record.regularHours || 0,
                overtimeHours: record.overtime_hours || record.overtimeHours || 0,
                status: record.status,
                notes: record.notes || '',
                employee: this.employees.find(emp => emp.id === record.employee_id || emp.employeeId === record.employee_id)
            }));
            
            console.log(`Loaded ${this.attendanceRecords.length} attendance records from DirectFlow API`);
            return this.attendanceRecords;
        } catch (error) {
            console.error('Error loading attendance records:', error);
            throw error;
        }
    }

    /**
     * Calculate work hours between clock in and clock out (returns numeric value)
     */
    calculateWorkHours(clockIn, clockOut) {
        if (!clockIn || !clockOut) return 0;

        try {
            const start = new Date(`2000-01-01T${clockIn}`);
            const end = new Date(`2000-01-01T${clockOut}`);
            
            // Handle cases where clock out is next day
            if (end < start) {
                end.setDate(end.getDate() + 1);
            }

            const diffMs = end - start;
            const diffHours = diffMs / (1000 * 60 * 60);
            
            return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
        } catch (error) {
            console.error('Error calculating work hours:', error);
            return 0;
        }
    }

    /**
     * Calculate hours worked between clock in and clock out times (returns formatted string)
     */
    calculateHours(clockIn, clockOut) {
        const hours = this.calculateWorkHours(clockIn, clockOut);
        return `${hours.toFixed(1)}h`;
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
                timeIn: recordData.clockIn || null,
                timeOut: recordData.clockOut || null,
                status: recordData.status,
                hoursWorked: hours,
                overtimeHours: overtimeHours,
                notes: recordData.notes || '',
                lastModified: new Date().toISOString(),
                modifiedBy: 'Admin' // In a real app, this would be the current user
            };

            // Save to DirectFlow API
            try {
                const response = await this.directFlow.addAttendanceRecord(record);
                if (response.success) {
                    console.log('Attendance record saved to DirectFlow API');
                } else {
                    console.warn('Failed to save to DirectFlow API:', response.message);
                }
            } catch (error) {
                console.warn('Failed to save to DirectFlow API:', error);
            }

            // Update local records
            if (existingRecordIndex >= 0) {
                this.attendanceRecords[existingRecordIndex] = {
                    ...this.attendanceRecords[existingRecordIndex],
                    clockIn: record.timeIn,
                    clockOut: record.timeOut,
                    hours: record.hoursWorked,
                    overtimeHours: record.overtimeHours,
                    status: record.status,
                    notes: record.notes
                };
            } else {
                this.attendanceRecords.push({
                    id: record.id,
                    employeeId: record.employeeId,
                    date: record.date,
                    clockIn: record.timeIn,
                    clockOut: record.timeOut,
                    hours: record.hoursWorked,
                    overtimeHours: record.overtimeHours,
                    status: record.status,
                    notes: record.notes,
                    employee: employee
                });
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

            const record = this.attendanceRecords[recordIndex];
            
            // Delete via DirectFlow API
            const response = await this.directFlow.deleteAttendanceRecord(record.id);
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete attendance record');
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

            let record;
            if (existingRecord) {
                existingRecord.status = newStatus;
                existingRecord.notes = notes;
                existingRecord.lastModified = new Date().toISOString();
                existingRecord.modifiedBy = 'Admin';
                record = existingRecord;
            } else {
                // Create new record with status override
                record = {
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

            // Save to DirectFlow API
            const response = await this.directFlow.updateAttendanceRecord(record);
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to override status');
            }

            console.log(`Status override applied: Employee ${employeeId}, Date ${date}, Status: ${newStatus}`);
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

        // Add Entry button handler
        const addAttendanceBtn = document.getElementById('addAttendanceBtn');
        if (addAttendanceBtn) {
            addAttendanceBtn.addEventListener('click', () => this.openModal());
        }
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

        // Edit/Add modal handlers
        const closeEditModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const attendanceForm = document.getElementById('attendanceForm');

        if (closeEditModal) {
            closeEditModal.addEventListener('click', () => this.closeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        if (attendanceForm) {
            attendanceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAttendance();
            });
        }

        // Close modals on overlay click
        const editModal = document.getElementById('editAttendanceModal');
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.closeModal();
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

            // Delete via DirectFlow API
            const response = await this.directFlow.deleteAttendanceRecord(recordId);
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete attendance record');
            }

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
     * Open modal for adding/editing attendance record
     */
    openModal(record = null) {
        const modal = document.getElementById('editAttendanceModal');
        if (!modal) {
            console.error('Edit attendance modal not found');
            return;
        }

        // Store current record being edited (null for new entry)
        this.currentEditingRecord = record;

        // Update modal title
        const titleElement = document.getElementById('modalTitle');
        if (titleElement) {
            titleElement.textContent = record ? 'Edit Attendance Record' : 'Add Attendance Entry';
        }

        // Populate employee dropdown
        this.populateEmployeeDropdown();

        if (record) {
            // Editing existing record - populate form with current data
            this.populateFormWithRecord(record);
        } else {
            // Adding new record - clear form and set defaults
            this.clearForm();
            this.setDefaultFormValues();
        }

        // Show the modal
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Populate employee dropdown in the modal
     */
    populateEmployeeDropdown() {
        const employeeSelect = document.getElementById('employeeSelect');
        if (!employeeSelect) return;

        // Clear existing options
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';

        // Add employee options
        this.employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.name} (${employee.employeeId})`;
            employeeSelect.appendChild(option);
        });
    }

    /**
     * Populate form with existing record data
     */
    populateFormWithRecord(record) {
        const form = document.getElementById('attendanceForm');
        if (!form) return;

        // Set form values
        this.setFormValue('employeeSelect', record.employeeId);
        this.setFormValue('attendanceDate', record.date);
        this.setFormValue('clockInTime', record.clockIn || '');
        this.setFormValue('clockOutTime', record.clockOut || '');
        this.setFormValue('attendanceStatus', record.status);
        this.setFormValue('notes', record.notes || '');
    }

    /**
     * Clear form and set default values for new entry
     */
    clearForm() {
        const form = document.getElementById('attendanceForm');
        if (!form) return;

        form.reset();
    }

    /**
     * Set default form values for new entry
     */
    setDefaultFormValues() {
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        this.setFormValue('attendanceDate', today);
        
        // Set default status to present
        this.setFormValue('attendanceStatus', 'present');
    }

    /**
     * Helper method to set form value
     */
    setFormValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        }
    }

    /**
     * Close the edit/add modal
     */
    closeModal() {
        const modal = document.getElementById('editAttendanceModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        this.currentEditingRecord = null;
    }

    /**
     * Save attendance from form
     */
    async saveAttendance() {
        try {
            const form = document.getElementById('attendanceForm');
            if (!form) {
                throw new Error('Form not found');
            }

            // Get form data
            const formData = new FormData(form);
            const employeeId = parseInt(formData.get('employeeSelect'));
            const date = formData.get('attendanceDate');
            const clockIn = formData.get('clockInTime') || null;
            const clockOut = formData.get('clockOutTime') || null;
            const status = formData.get('attendanceStatus');
            const notes = document.getElementById('notes')?.value || '';

            // Validate required fields
            if (!employeeId) {
                throw new Error('Please select an employee');
            }
            if (!date) {
                throw new Error('Please select a date');
            }
            if (!status) {
                throw new Error('Please select a status');
            }

            // Validate clock times if both are provided
            if (clockIn && clockOut && clockIn >= clockOut) {
                throw new Error('Clock out time must be after clock in time');
            }

            // Prepare record data
            const recordData = {
                employeeId: employeeId,
                date: date,
                clockIn: clockIn,
                clockOut: clockOut,
                status: status,
                notes: notes
            };

            // If editing existing record, include the ID
            if (this.currentEditingRecord) {
                recordData.id = this.currentEditingRecord.id;
            }

            // Save the record
            const savedRecord = await this.saveAttendanceRecord(recordData);

            // Close modal and refresh display
            this.closeModal();
            this.renderAttendanceRecords();
            
            // Show success message
            this.showToast(
                this.currentEditingRecord ? 'Attendance record updated successfully!' : 'Attendance entry added successfully!',
                'success'
            );

            console.log('Attendance saved:', savedRecord);

        } catch (error) {
            console.error('Error saving attendance:', error);
            this.showToast('Error: ' + error.message, 'error');
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
        window.employeeAttendanceManager.init().then(() => {
            // Register with global synchronization system
            setTimeout(() => {
                if (window.globalSystemSync && window.globalSystemSync.initialized) {
                    window.globalSystemSync.registerComponent('attendanceManager', window.employeeAttendanceManager, {
                        refreshData: 'loadEmployees',
                        renderRecords: 'renderAttendanceRecords',
                        updateDropdowns: 'updateEmployeeDropdowns',
                        loadEmployees: 'loadEmployees'
                    });
                    console.log('Employee attendance manager registered with global sync');
                }
            }, 500);
        }).catch(console.error);
    });
} else {
    window.employeeAttendanceManager.init().then(() => {
        // Register with global synchronization system
        setTimeout(() => {
            if (window.globalSystemSync && window.globalSystemSync.initialized) {
                window.globalSystemSync.registerComponent('attendanceManager', window.employeeAttendanceManager, {
                    refreshData: 'loadEmployees',
                    renderRecords: 'renderAttendanceRecords',
                    updateDropdowns: 'updateEmployeeDropdowns',
                    loadEmployees: 'loadEmployees'
                });
                console.log('Employee attendance manager registered with global sync');
            }
        }, 500);
    }).catch(console.error);
}
