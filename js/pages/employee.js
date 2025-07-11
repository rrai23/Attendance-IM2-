// Employee page functionality for the Bricks Attendance System
class EmployeePage {
    constructor() {
        this.dataStore = DataStore.getInstance();
        this.payroll = new Payroll();
        this.calendarInstance = null;
        
        // Current user info
        this.currentUser = null;
        this.currentEmployee = null;
        
        // Clock status
        this.isClocked = false;
        this.clockInTime = null;
        
        // Update intervals
        this.updateIntervals = [];
        
        this.init();
    }

    /**
     * Initialize employee page
     */
    async init() {
        // Check authentication (both admin and employee can access this page)
        Auth.requireAuth();
        
        // Get current user and employee data
        await this.initializeUserData();
        
        // Initialize components
        await this.initializeComponents();
        this.setupEventListeners();
        this.setupAutoUpdates();
        
        console.log('Employee page initialized');
    }

    /**
     * Initialize user data
     */
    async initializeUserData() {
        try {
            this.currentUser = Auth.getCurrentUser();
            if (!this.currentUser) {
                throw new Error('No authenticated user found');
            }

            // Find employee record
            const employees = await this.dataStore.getEmployees();
            this.currentEmployee = employees.find(emp => emp.username === this.currentUser.username);
            
            if (!this.currentEmployee) {
                throw new Error('Employee record not found');
            }
        } catch (error) {
            console.error('Error initializing user data:', error);
            Auth.logout();
        }
    }

    /**
     * Initialize page components
     */
    async initializeComponents() {
        // Update user info
        this.updateUserInfo();
        
        // Initialize clock
        await this.initializeClock();
        
        // Initialize calendar
        this.initializeCalendar();
        
        // Load employee data
        await this.loadEmployeeData();
        
        // Start time display
        this.startTimeDisplay();
    }

    /**
     * Update user information in header
     */
    updateUserInfo() {
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = this.currentEmployee?.fullName || this.currentUser?.fullName || this.currentUser?.username || 'Employee';
        }
    }

    /**
     * Initialize clock functionality
     */
    async initializeClock() {
        try {
            // Check if already clocked in today
            const todayAttendance = await this.dataStore.getTodayAttendance(this.currentEmployee.id);
            
            if (todayAttendance && todayAttendance.timeIn && !todayAttendance.timeOut) {
                this.isClocked = true;
                this.clockInTime = todayAttendance.timeIn;
                this.updateClockStatus('Clocked in since ' + this.clockInTime);
                this.updateClockButtons(true);
            } else {
                this.isClocked = false;
                this.updateClockStatus('Ready to clock in');
                this.updateClockButtons(false);
            }
        } catch (error) {
            console.error('Error initializing clock:', error);
        }
    }

    /**
     * Initialize personal calendar
     */
    initializeCalendar() {
        this.calendarInstance = Calendar.create('personalCalendarContainer', {
            showNotes: false, // Employees can't create notes, only view attendance
            enableNoteCreation: false,
            onDateClick: (date) => {
                this.showDateAttendance(date);
            }
        });
    }

    /**
     * Start time display update
     */
    startTimeDisplay() {
        this.updateTimeDisplay();
        
        // Update every second
        const timeInterval = setInterval(() => {
            this.updateTimeDisplay();
        }, 1000);
        
        this.updateIntervals.push(timeInterval);
    }

    /**
     * Update time display
     */
    updateTimeDisplay() {
        const currentTime = document.getElementById('currentTime');
        const currentDate = document.getElementById('currentDate');
        
        const now = new Date();
        
        if (currentTime) {
            currentTime.textContent = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        
        if (currentDate) {
            currentDate.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Logout button
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }

        // Clock in/out buttons
        const clockInButton = document.getElementById('clockInButton');
        const clockOutButton = document.getElementById('clockOutButton');
        
        if (clockInButton) {
            clockInButton.addEventListener('click', () => this.handleClockIn());
        }
        
        if (clockOutButton) {
            clockOutButton.addEventListener('click', () => this.handleClockOut());
        }

        // Overtime form
        const overtimeForm = document.getElementById('overtimeForm');
        if (overtimeForm) {
            overtimeForm.addEventListener('submit', (e) => this.handleOvertimeRequest(e));
        }

        // Payroll history button
        const viewPayrollHistory = document.getElementById('viewPayrollHistory');
        if (viewPayrollHistory) {
            viewPayrollHistory.addEventListener('click', () => this.showPayrollHistoryModal());
        }

        // Payroll modal close
        const payrollModalClose = document.getElementById('payrollModalClose');
        if (payrollModalClose) {
            payrollModalClose.addEventListener('click', () => this.hidePayrollHistoryModal());
        }
    }

    /**
     * Load employee data
     */
    async loadEmployeeData() {
        try {
            await Promise.all([
                this.updatePersonalStats(),
                this.updatePayrollSummary(),
                this.updateRecentAttendance()
            ]);
        } catch (error) {
            console.error('Error loading employee data:', error);
        }
    }

    /**
     * Update personal statistics
     */
    async updatePersonalStats() {
        try {
            // Get stats for current month
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startDate = startOfMonth.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];
            
            const stats = await this.dataStore.getEmployeeStats(
                this.currentEmployee.id,
                startDate,
                endDate
            );

            // Update stat displays
            this.updateStatDisplay('myPresentDays', stats.presentDays);
            this.updateStatDisplay('myAbsentDays', stats.absentDays);
            this.updateStatDisplay('myAttendanceRate', `${stats.attendanceRate}%`);
            
            // Calculate hours for current week
            const weekStart = this.getWeekStart(today);
            const weekStartStr = weekStart.toISOString().split('T')[0];
            
            const weeklyAttendance = await this.dataStore.getAttendance({
                employeeId: this.currentEmployee.id,
                startDate: weekStartStr,
                endDate: endDate
            });
            
            const weeklyHours = weeklyAttendance.reduce((sum, record) => sum + (record.hoursWorked || 0), 0);
            this.updateStatDisplay('myHoursWorked', Math.round(weeklyHours * 10) / 10);
            
        } catch (error) {
            console.error('Error updating personal stats:', error);
        }
    }

    /**
     * Update payroll summary
     */
    async updatePayrollSummary() {
        try {
            const currentPeriodSummary = await this.payroll.getCurrentPeriodSummary(this.currentEmployee.id);
            const payrollHistory = await this.payroll.getPayrollHistory(this.currentEmployee.id, 1);
            
            // Update current period
            const currentPeriodAmount = document.getElementById('currentPeriodAmount');
            if (currentPeriodAmount) {
                currentPeriodAmount.textContent = this.payroll.formatCurrency(currentPeriodSummary.estimatedPay);
            }
            
            // Update last payment
            const lastPaymentAmount = document.getElementById('lastPaymentAmount');
            if (lastPaymentAmount) {
                const lastPayment = payrollHistory.length > 0 ? payrollHistory[0] : null;
                lastPaymentAmount.textContent = lastPayment ? 
                    this.payroll.formatCurrency(lastPayment.netPay) : '₱0.00';
            }
            
        } catch (error) {
            console.error('Error updating payroll summary:', error);
        }
    }

    /**
     * Update recent attendance table
     */
    async updateRecentAttendance() {
        try {
            const today = new Date();
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(today.getDate() - 14);
            
            const attendance = await this.dataStore.getAttendance({
                employeeId: this.currentEmployee.id,
                startDate: twoWeeksAgo.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
            });

            const tableBody = document.getElementById('recentAttendanceBody');
            if (!tableBody) return;

            if (attendance.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="no-data">No recent attendance records</td></tr>';
                return;
            }

            tableBody.innerHTML = attendance.slice(0, 10).map(record => `
                <tr>
                    <td>${this.formatDate(record.date)}</td>
                    <td>${record.timeIn || '-'}</td>
                    <td>${record.timeOut || '-'}</td>
                    <td>${record.hoursWorked || 0} hrs</td>
                    <td>
                        <span class="status-badge status-${record.status}">
                            ${this.capitalizeFirst(record.status)}
                        </span>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error updating recent attendance:', error);
        }
    }

    /**
     * Handle clock in
     */
    async handleClockIn() {
        try {
            // Show loading state
            this.setClockButtonLoading(true);
            
            await this.dataStore.clockIn(this.currentEmployee.id);
            
            this.isClocked = true;
            this.clockInTime = new Date().toTimeString().split(' ')[0];
            
            this.updateClockStatus('Clocked in at ' + this.clockInTime);
            this.updateClockButtons(true);
            
            // Refresh data
            await this.updatePersonalStats();
            await this.updateRecentAttendance();
            
            this.showSuccessMessage('Clocked in successfully!');
            
        } catch (error) {
            console.error('Error clocking in:', error);
            this.showError(error.message || 'Error clocking in');
        } finally {
            this.setClockButtonLoading(false);
        }
    }

    /**
     * Handle clock out
     */
    async handleClockOut() {
        try {
            // Show loading state
            this.setClockButtonLoading(true);
            
            await this.dataStore.clockOut(this.currentEmployee.id);
            
            this.isClocked = false;
            this.clockInTime = null;
            
            this.updateClockStatus('Clocked out successfully');
            this.updateClockButtons(false);
            
            // Refresh data
            await this.updatePersonalStats();
            await this.updateRecentAttendance();
            await this.updatePayrollSummary();
            
            this.showSuccessMessage('Clocked out successfully!');
            
            // Reset status after a few seconds
            setTimeout(() => {
                this.updateClockStatus('Ready to clock in');
            }, 3000);
            
        } catch (error) {
            console.error('Error clocking out:', error);
            this.showError(error.message || 'Error clocking out');
        } finally {
            this.setClockButtonLoading(false);
        }
    }

    /**
     * Update clock status display
     */
    updateClockStatus(statusText) {
        const clockStatus = document.getElementById('clockStatus');
        if (clockStatus) {
            const statusElement = clockStatus.querySelector('.status-text');
            if (statusElement) {
                statusElement.textContent = statusText;
            }
        }
    }

    /**
     * Update clock button states
     */
    updateClockButtons(isClockedIn) {
        const clockInButton = document.getElementById('clockInButton');
        const clockOutButton = document.getElementById('clockOutButton');
        
        if (clockInButton) {
            clockInButton.disabled = isClockedIn;
        }
        
        if (clockOutButton) {
            clockOutButton.disabled = !isClockedIn;
        }
    }

    /**
     * Set clock button loading state
     */
    setClockButtonLoading(loading) {
        const clockInButton = document.getElementById('clockInButton');
        const clockOutButton = document.getElementById('clockOutButton');
        
        [clockInButton, clockOutButton].forEach(button => {
            if (button) {
                button.disabled = loading;
                if (loading) {
                    button.textContent = 'Processing...';
                } else {
                    button.textContent = button.id === 'clockInButton' ? 'Clock In' : 'Clock Out';
                }
            }
        });
    }

    /**
     * Handle overtime request submission
     */
    async handleOvertimeRequest(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const overtimeData = {
                employeeId: this.currentEmployee.id,
                date: formData.get('overtimeDate'),
                hours: parseFloat(formData.get('overtimeHours')),
                reason: formData.get('overtimeReason'),
                status: 'pending',
                requestedAt: new Date().toISOString()
            };

            // Validate data
            if (!overtimeData.date || !overtimeData.hours || !overtimeData.reason) {
                this.showError('Please fill in all fields');
                return;
            }

            if (overtimeData.hours <= 0 || overtimeData.hours > 12) {
                this.showError('Hours must be between 0.5 and 12');
                return;
            }

            // Save overtime request (this would typically go to a separate collection)
            console.log('Overtime request submitted:', overtimeData);
            
            // Clear form
            e.target.reset();
            
            this.showSuccessMessage('Overtime request submitted successfully!');
            
        } catch (error) {
            console.error('Error submitting overtime request:', error);
            this.showError('Error submitting overtime request');
        }
    }

    /**
     * Show payroll history modal
     */
    async showPayrollHistoryModal() {
        try {
            const modal = document.getElementById('payrollHistoryModal');
            if (!modal) return;

            // Load payroll history
            const payrollHistory = await this.payroll.getPayrollHistory(this.currentEmployee.id, 12);
            const tableBody = document.getElementById('payrollHistoryBody');
            
            if (tableBody) {
                if (payrollHistory.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No payroll history available</td></tr>';
                } else {
                    tableBody.innerHTML = payrollHistory.map(record => `
                        <tr>
                            <td>${this.formatDateRange(record.payPeriodStart, record.payPeriodEnd)}</td>
                            <td>${record.regularHours || 0} hrs</td>
                            <td>${record.overtimeHours || 0} hrs</td>
                            <td>${this.payroll.formatCurrency(record.grossPay || 0)}</td>
                            <td>${this.payroll.formatCurrency(record.netPay || 0)}</td>
                            <td>${this.formatDate(record.payDate)}</td>
                        </tr>
                    `).join('');
                }
            }

            modal.classList.add('show');
        } catch (error) {
            console.error('Error showing payroll history:', error);
            this.showError('Error loading payroll history');
        }
    }

    /**
     * Hide payroll history modal
     */
    hidePayrollHistoryModal() {
        const modal = document.getElementById('payrollHistoryModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Show date attendance details
     */
    async showDateAttendance(dateStr) {
        try {
            const attendance = await this.dataStore.getAttendance({
                employeeId: this.currentEmployee.id,
                startDate: dateStr,
                endDate: dateStr
            });

            if (attendance.length > 0) {
                const record = attendance[0];
                const message = `
                    Date: ${this.formatDate(record.date)}
                    Time In: ${record.timeIn || 'Not clocked in'}
                    Time Out: ${record.timeOut || 'Not clocked out'}
                    Hours Worked: ${record.hoursWorked || 0} hours
                    Status: ${this.capitalizeFirst(record.status)}
                    ${record.notes ? 'Notes: ' + record.notes : ''}
                `;
                alert(message);
            } else {
                alert(`No attendance record for ${this.formatDate(dateStr)}`);
            }
        } catch (error) {
            console.error('Error showing date attendance:', error);
        }
    }

    /**
     * Setup automatic updates
     */
    setupAutoUpdates() {
        // Update stats every 5 minutes
        const statsInterval = setInterval(() => {
            this.updatePersonalStats();
        }, 5 * 60 * 1000);
        
        // Update payroll every 10 minutes
        const payrollInterval = setInterval(() => {
            this.updatePayrollSummary();
        }, 10 * 60 * 1000);

        this.updateIntervals.push(statsInterval, payrollInterval);
    }

    /**
     * Update stat display with animation
     */
    updateStatDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.transform = 'scale(1.1)';
            element.style.transition = 'transform 0.2s ease';
            
            setTimeout(() => {
                element.textContent = value;
                element.style.transform = 'scale(1)';
            }, 100);
        }
    }

    /**
     * Get week start date (Monday)
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /**
     * Format date range
     */
    formatDateRange(startDate, endDate) {
        return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
    }

    /**
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        console.log('Success:', message);
        // Could implement a toast notification system
        alert(message); // Temporary solution
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('Error:', message);
        alert(message); // Temporary solution
    }

    /**
     * Handle logout
     */
    handleLogout() {
        const confirmLogout = confirm('Are you sure you want to logout?');
        if (confirmLogout) {
            this.cleanup();
            Auth.logout();
        }
    }

    /**
     * Cleanup when leaving page
     */
    cleanup() {
        // Clear intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals = [];
        
        // Cleanup calendar
        if (this.calendarInstance) {
            this.calendarInstance.destroy();
        }
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause updates (except time)
            this.updateIntervals.slice(1).forEach(interval => clearInterval(interval));
        } else {
            // Page is visible, resume updates
            this.setupAutoUpdates();
            this.loadEmployeeData();
        }
    }
}

// Initialize employee page when DOM is ready
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.employeePage = new EmployeePage();
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (window.employeePage) {
                window.employeePage.handleVisibilityChange();
            }
        });
        
        // Handle before unload
        window.addEventListener('beforeunload', () => {
            if (window.employeePage) {
                window.employeePage.cleanup();
            }
        });
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmployeePage;
} else if (typeof window !== 'undefined') {
    window.EmployeePage = EmployeePage;
}
