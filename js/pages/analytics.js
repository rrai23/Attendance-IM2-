// Analytics page functionality for the Bricks Attendance System
class AnalyticsPage {
    constructor() {
        this.dataStore = DataStore.getInstance();
        this.chartsInstance = Charts.create();
        
        // Chart instances
        this.trendChart = null;
        this.timeChart = null;
        
        // Current state
        this.selectedEmployeeId = null;
        this.currentFilters = {
            startDate: null,
            endDate: null
        };
        
        this.init();
    }

    /**
     * Initialize analytics page
     */
    async init() {
        // Check authentication
        Auth.requireAuth('admin');
        
        // Initialize components
        await this.initializeComponents();
        this.setupEventListeners();
        this.setDefaultDateRange();
        
        console.log('Analytics page initialized');
    }

    /**
     * Initialize page components
     */
    async initializeComponents() {
        // Set user name
        this.updateUserInfo();
        
        // Load employees
        await this.loadEmployees();
        
        // Initialize charts with empty data
        this.initializeCharts();
        
        // Store globally for theme updates
        window.chartsInstance = this.chartsInstance;
    }

    /**
     * Update user information in header
     */
    updateUserInfo() {
        const userName = document.getElementById('userName');
        const currentUser = Auth.getCurrentUser();
        
        if (userName && currentUser) {
            userName.textContent = currentUser.fullName || currentUser.username;
        }
    }

    /**
     * Load employees into selector
     */
    async loadEmployees() {
        try {
            const employees = await this.dataStore.getEmployees();
            const employeeSelect = document.getElementById('employeeSelect');
            
            if (employeeSelect) {
                employeeSelect.innerHTML = '<option value="">Select an employee...</option>';
                
                employees.forEach(employee => {
                    if (employee.role === 'employee') { // Only show employees, not admins
                        const option = document.createElement('option');
                        option.value = employee.id;
                        option.textContent = employee.fullName || employee.username;
                        employeeSelect.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        // Initialize trend chart
        this.trendChart = this.chartsInstance.createAttendanceTrendChart('trendChart', {
            labels: [],
            values: []
        });

        // Initialize time analysis chart
        this.timeChart = this.chartsInstance.createTimeAnalysisChart('timeChart', {
            labels: [],
            actual: [],
            target: []
        });
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

        // Employee selector
        const employeeSelect = document.getElementById('employeeSelect');
        if (employeeSelect) {
            employeeSelect.addEventListener('change', (e) => {
                this.handleEmployeeSelection(e.target.value);
            });
        }

        // Date filters
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        const applyFilters = document.getElementById('applyFilters');
        
        if (applyFilters) {
            applyFilters.addEventListener('click', () => {
                this.applyDateFilters();
            });
        }

        // Export button
        const exportData = document.getElementById('exportData');
        if (exportData) {
            exportData.addEventListener('click', () => {
                this.exportAnalyticsData();
            });
        }

        // Enter key support for date filters
        [startDate, endDate].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.applyDateFilters();
                    }
                });
            }
        });
    }

    /**
     * Set default date range (last 30 days)
     */
    setDefaultDateRange() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        if (startDateInput) {
            startDateInput.value = startDate.toISOString().split('T')[0];
        }
        if (endDateInput) {
            endDateInput.value = endDate.toISOString().split('T')[0];
        }

        this.currentFilters.startDate = startDate.toISOString().split('T')[0];
        this.currentFilters.endDate = endDate.toISOString().split('T')[0];
    }

    /**
     * Handle employee selection
     */
    async handleEmployeeSelection(employeeId) {
        this.selectedEmployeeId = employeeId;
        
        if (employeeId) {
            await this.loadEmployeeAnalytics(employeeId);
        } else {
            this.clearAnalyticsData();
        }
    }

    /**
     * Load analytics data for selected employee
     */
    async loadEmployeeAnalytics(employeeId) {
        try {
            // Show loading state
            this.showLoadingState(true);

            // Get employee info
            const employee = await this.dataStore.getEmployee(employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }

            // Update employee title
            this.updateEmployeeTitle(employee.fullName || employee.username);

            // Load and display analytics data
            await Promise.all([
                this.updateEmployeeStats(employeeId),
                this.updateAttendanceTable(employeeId),
                this.updateTrendChart(employeeId),
                this.updateTimeChart(employeeId)
            ]);

            this.showLoadingState(false);
        } catch (error) {
            console.error('Error loading employee analytics:', error);
            this.showLoadingState(false);
            this.showError('Error loading analytics data');
        }
    }

    /**
     * Update employee title
     */
    updateEmployeeTitle(employeeName) {
        const employeeTitle = document.getElementById('employeeTitle');
        if (employeeTitle) {
            employeeTitle.textContent = `Analytics for ${employeeName}`;
        }
    }

    /**
     * Update employee statistics
     */
    async updateEmployeeStats(employeeId) {
        try {
            const stats = await this.dataStore.getEmployeeStats(
                employeeId,
                this.currentFilters.startDate,
                this.currentFilters.endDate
            );

            // Update stat cards
            this.updateStatCard('totalDays', stats.totalDays);
            this.updateStatCard('presentDays', stats.presentDays);
            this.updateStatCard('absentDays', stats.absentDays);
            this.updateStatCard('attendanceRate', `${stats.attendanceRate}%`);
        } catch (error) {
            console.error('Error updating employee stats:', error);
        }
    }

    /**
     * Update stat card with animation
     */
    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Add animation
            element.style.transform = 'scale(1.1)';
            element.style.transition = 'transform 0.2s ease';
            
            setTimeout(() => {
                element.textContent = value;
                element.style.transform = 'scale(1)';
            }, 100);
        }
    }

    /**
     * Update attendance table
     */
    async updateAttendanceTable(employeeId) {
        try {
            const attendance = await this.dataStore.getAttendance({
                employeeId,
                startDate: this.currentFilters.startDate,
                endDate: this.currentFilters.endDate
            });

            const tableBody = document.getElementById('attendanceTableBody');
            if (!tableBody) return;

            if (attendance.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No attendance records found</td></tr>';
                return;
            }

            tableBody.innerHTML = attendance.map(record => `
                <tr>
                    <td>${this.formatDate(record.date)}</td>
                    <td>${record.timeIn || '-'}</td>
                    <td>${record.timeOut || '-'}</td>
                    <td>${record.hoursWorked || 0} hours</td>
                    <td>
                        <span class="status-badge status-${record.status}">
                            ${this.capitalizeFirst(record.status)}
                        </span>
                    </td>
                    <td>${record.notes || '-'}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error updating attendance table:', error);
        }
    }

    /**
     * Update trend chart
     */
    async updateTrendChart(employeeId) {
        try {
            const attendance = await this.dataStore.getAttendance({
                employeeId,
                startDate: this.currentFilters.startDate,
                endDate: this.currentFilters.endDate
            });

            // Group by week and calculate attendance rate
            const weeklyData = this.groupAttendanceByWeek(attendance);
            
            this.chartsInstance.updateChart('trendChart', {
                labels: weeklyData.labels,
                values: weeklyData.attendanceRates
            });
        } catch (error) {
            console.error('Error updating trend chart:', error);
        }
    }

    /**
     * Update time analysis chart
     */
    async updateTimeChart(employeeId) {
        try {
            const attendance = await this.dataStore.getAttendance({
                employeeId,
                startDate: this.currentFilters.startDate,
                endDate: this.currentFilters.endDate
            });

            // Get daily hours data
            const dailyData = this.processDailyHours(attendance);
            
            this.chartsInstance.updateChart('timeChart', {
                labels: dailyData.labels,
                actual: dailyData.actualHours,
                target: dailyData.targetHours
            });
        } catch (error) {
            console.error('Error updating time chart:', error);
        }
    }

    /**
     * Group attendance data by week
     */
    groupAttendanceByWeek(attendance) {
        const weeks = new Map();
        
        attendance.forEach(record => {
            const date = new Date(record.date);
            const weekStart = this.getWeekStart(date);
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeks.has(weekKey)) {
                weeks.set(weekKey, { total: 0, present: 0 });
            }
            
            const week = weeks.get(weekKey);
            week.total++;
            if (record.status === 'present') {
                week.present++;
            }
        });

        const labels = [];
        const attendanceRates = [];
        
        Array.from(weeks.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([weekKey, data]) => {
                const weekDate = new Date(weekKey);
                labels.push(weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                attendanceRates.push(data.total > 0 ? Math.round((data.present / data.total) * 100) : 0);
            });

        return { labels, attendanceRates };
    }

    /**
     * Process daily hours data
     */
    processDailyHours(attendance) {
        const labels = [];
        const actualHours = [];
        const targetHours = [];
        
        // Sort by date
        attendance.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        attendance.forEach(record => {
            const date = new Date(record.date);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            actualHours.push(record.hoursWorked || 0);
            targetHours.push(8); // Standard 8-hour workday
        });

        return { labels, actualHours, targetHours };
    }

    /**
     * Get week start date (Monday)
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    }

    /**
     * Apply date filters
     */
    async applyDateFilters() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (!startDateInput || !endDateInput) return;

        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        // Validate dates
        if (!startDate || !endDate) {
            this.showError('Please select both start and end dates');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            this.showError('Start date cannot be after end date');
            return;
        }

        // Update filters
        this.currentFilters.startDate = startDate;
        this.currentFilters.endDate = endDate;

        // Reload data if employee is selected
        if (this.selectedEmployeeId) {
            await this.loadEmployeeAnalytics(this.selectedEmployeeId);
        }
    }

    /**
     * Export analytics data
     */
    async exportAnalyticsData() {
        if (!this.selectedEmployeeId) {
            this.showError('Please select an employee first');
            return;
        }

        try {
            const employee = await this.dataStore.getEmployee(this.selectedEmployeeId);
            const attendance = await this.dataStore.getAttendance({
                employeeId: this.selectedEmployeeId,
                startDate: this.currentFilters.startDate,
                endDate: this.currentFilters.endDate
            });

            // Create CSV content
            const csvContent = this.generateCSV(employee, attendance);
            
            // Download CSV
            this.downloadCSV(csvContent, `${employee.fullName}_analytics.csv`);
            
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showError('Error exporting data');
        }
    }

    /**
     * Generate CSV content
     */
    generateCSV(employee, attendance) {
        const headers = ['Date', 'Time In', 'Time Out', 'Hours Worked', 'Status', 'Notes'];
        const rows = [headers];

        attendance.forEach(record => {
            rows.push([
                record.date,
                record.timeIn || '',
                record.timeOut || '',
                record.hoursWorked || 0,
                record.status,
                record.notes || ''
            ]);
        });

        return rows.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    }

    /**
     * Download CSV file
     */
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Clear analytics data
     */
    clearAnalyticsData() {
        // Reset employee title
        const employeeTitle = document.getElementById('employeeTitle');
        if (employeeTitle) {
            employeeTitle.textContent = 'Select an employee to view analytics';
        }

        // Reset stats
        this.updateStatCard('totalDays', '-');
        this.updateStatCard('presentDays', '-');
        this.updateStatCard('absentDays', '-');
        this.updateStatCard('attendanceRate', '-');

        // Clear table
        const tableBody = document.getElementById('attendanceTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="no-data">Select an employee to view records</td></tr>';
        }

        // Clear charts
        this.chartsInstance.updateChart('trendChart', { labels: [], values: [] });
        this.chartsInstance.updateChart('timeChart', { labels: [], actual: [], target: [] });
    }

    /**
     * Show loading state
     */
    showLoadingState(loading) {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            if (loading) {
                tile.style.opacity = '0.7';
            } else {
                tile.style.opacity = '1';
            }
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        // Could implement a toast notification system
        console.error(message);
        alert(message); // Temporary solution
    }

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Handle logout
     */
    handleLogout() {
        // Use specialized logout modal
        if (typeof confirmLogout !== 'undefined') {
            confirmLogout({
                onConfirm: () => {
                    this.cleanup();
                    Auth.logout();
                }
            });
        } else {
            // Fallback to browser confirm if modal system not available
            const confirmLogout = confirm('Are you sure you want to logout?');
            if (confirmLogout) {
                this.cleanup();
                Auth.logout();
            }
        }
    }

    /**
     * Cleanup when leaving page
     */
    cleanup() {
        if (this.chartsInstance) {
            this.chartsInstance.destroyAllCharts();
        }
    }
}

// Add CSS for status badges
const statusBadgeStyles = `
.status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
}

.status-present {
    background-color: var(--color-success);
    color: white;
}

.status-absent {
    background-color: var(--color-error);
    color: white;
}

.status-late {
    background-color: var(--color-warning);
    color: white;
}

.status-partial {
    background-color: var(--color-secondary);
    color: white;
}
`;

// Inject status badge styles
if (typeof window !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = statusBadgeStyles;
    document.head.appendChild(style);
}

// Initialize analytics page when DOM is ready
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.analyticsPage = new AnalyticsPage();
        
        // Handle before unload
        window.addEventListener('beforeunload', () => {
            if (window.analyticsPage) {
                window.analyticsPage.cleanup();
            }
        });
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsPage;
} else if (typeof window !== 'undefined') {
    window.AnalyticsPage = AnalyticsPage;
}
