/**
 * Employee Self-Service Page Controller
 * Handles personal attendance data, time entries, statistics, and overtime requests
 * Ensures data access is restricted to the logged-in employee only
 */

class EmployeeController {
    constructor() {
        this.currentUser = null;
        this.employeeId = null;
        this.attendanceData = [];
        this.recentEntries = [];
        this.personalStats = {};
        this.overtimeRequests = [];
        this.charts = new Map();
        this.refreshInterval = null;
        this.autoRefreshEnabled = true;
        this.refreshIntervalTime = 30000; // 30 seconds

        // UI elements cache
        this.elements = {
            attendanceSummary: null,
            recentEntriesContainer: null,
            statsContainer: null,
            overtimeContainer: null,
            loadingIndicators: [],
            errorContainers: []
        };

        this.init();
    }

    /**
     * Initialize the employee controller
     */
    async init() {
        try {
            // Verify authentication and get current user
            if (!this.verifyAuthentication()) {
                return;
            }

            // Cache DOM elements
            this.cacheElements();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadInitialData();

            // Setup auto-refresh
            this.setupAutoRefresh();

            // Initialize charts
            this.initializeCharts();

            console.log('Employee controller initialized successfully');
        } catch (error) {
            console.error('Error initializing employee controller:', error);
            this.showError('Failed to initialize employee dashboard');
        }
    }

    /**
     * Verify user authentication and role
     */
    verifyAuthentication() {
        if (typeof authService === 'undefined') {
            console.error('Auth service not available');
            return false;
        }

        if (!authService.isAuthenticated()) {
            authService.logout('not_authenticated');
            return false;
        }

        this.currentUser = authService.getCurrentUser();
        
        if (!this.currentUser) {
            authService.logout('invalid_user');
            return false;
        }

        // Ensure user is an employee
        if (this.currentUser.role !== 'employee') {
            window.location.href = authService.getRedirectUrl(this.currentUser.role);
            return false;
        }

        this.employeeId = this.currentUser.employee ? this.currentUser.employee.id : this.currentUser.id;
        
        if (!this.employeeId) {
            console.error('Employee ID not found');
            this.showError('Employee information not available');
            return false;
        }

        return true;
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        this.elements = {
            // Main containers
            attendanceSummary: document.getElementById('attendance-summary'),
            recentEntriesContainer: document.getElementById('recent-entries'),
            statsContainer: document.getElementById('personal-stats'),
            overtimeContainer: document.getElementById('overtime-requests'),
            
            // Charts
            attendanceChart: document.getElementById('attendance-chart'),
            hoursChart: document.getElementById('hours-chart'),
            performanceChart: document.getElementById('performance-chart'),
            
            // Forms
            overtimeForm: document.getElementById('overtime-form'),
            clockInBtn: document.getElementById('clock-in-btn'),
            clockOutBtn: document.getElementById('clock-out-btn'),
            lunchStartBtn: document.getElementById('lunch-start-btn'),
            lunchEndBtn: document.getElementById('lunch-end-btn'),
            
            // Filters and controls
            dateRangeSelect: document.getElementById('date-range-select'),
            refreshBtn: document.getElementById('refresh-btn'),
            autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
            
            // Loading and error states
            loadingIndicators: document.querySelectorAll('.loading-indicator'),
            errorContainers: document.querySelectorAll('.error-container'),
            
            // User info
            employeeName: document.getElementById('employee-name'),
            employeeId: document.getElementById('employee-id'),
            employeeDepartment: document.getElementById('employee-department')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Time tracking buttons
        if (this.elements.clockInBtn) {
            this.elements.clockInBtn.addEventListener('click', () => this.handleClockIn());
        }
        
        if (this.elements.clockOutBtn) {
            this.elements.clockOutBtn.addEventListener('click', () => this.handleClockOut());
        }
        
        if (this.elements.lunchStartBtn) {
            this.elements.lunchStartBtn.addEventListener('click', () => this.handleLunchStart());
        }
        
        if (this.elements.lunchEndBtn) {
            this.elements.lunchEndBtn.addEventListener('click', () => this.handleLunchEnd());
        }

        // Overtime form
        if (this.elements.overtimeForm) {
            this.elements.overtimeForm.addEventListener('submit', (e) => this.handleOvertimeSubmission(e));
        }

        // Date range filter
        if (this.elements.dateRangeSelect) {
            this.elements.dateRangeSelect.addEventListener('change', () => this.handleDateRangeChange());
        }

        // Refresh controls
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.refreshData());
        }
        
        if (this.elements.autoRefreshToggle) {
            this.elements.autoRefreshToggle.addEventListener('change', (e) => {
                this.autoRefreshEnabled = e.target.checked;
                this.setupAutoRefresh();
            });
        }

        // Window events
        window.addEventListener('focus', () => this.handleWindowFocus());
        window.addEventListener('beforeunload', () => this.cleanup());

        // Auth events
        if (typeof authService !== 'undefined') {
            authService.onAuthEvent('logout', () => this.cleanup());
            authService.onAuthEvent('user_updated', (user) => this.handleUserUpdate(user));
        }

        // Theme events
        document.addEventListener('themechange', (e) => this.handleThemeChange(e.detail));
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        this.showLoading(true);
        
        try {
            // Update user info display
            this.updateUserInfo();

            // Load data in parallel
            const [
                attendanceData,
                recentEntries,
                personalStats,
                overtimeRequests
            ] = await Promise.all([
                this.loadAttendanceData(),
                this.loadRecentEntries(),
                this.loadPersonalStats(),
                this.loadOvertimeRequests()
            ]);

            // Update UI with loaded data
            this.updateAttendanceSummary(attendanceData);
            this.updateRecentEntries(recentEntries);
            this.updatePersonalStats(personalStats);
            this.updateOvertimeRequests(overtimeRequests);

            // Update time tracking button states
            this.updateTimeTrackingButtons();

        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load employee data');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Load attendance data for the employee
     */
    async loadAttendanceData() {
        try {
            if (typeof dataService === 'undefined') {
                throw new Error('Data service not available');
            }

            const dateRange = this.getSelectedDateRange();
            const data = await dataService.getAttendanceRecords(
                this.employeeId,
                dateRange.startDate,
                dateRange.endDate
            );

            this.attendanceData = data || [];
            return this.attendanceData;
        } catch (error) {
            console.error('Error loading attendance data:', error);
            throw error;
        }
    }

    /**
     * Load recent time entries
     */
    async loadRecentEntries() {
        try {
            if (typeof dataService === 'undefined') {
                throw new Error('Data service not available');
            }

            // Get last 10 entries
            const allEntries = await dataService.getAttendanceRecords(this.employeeId);
            this.recentEntries = (allEntries || [])
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10);

            return this.recentEntries;
        } catch (error) {
            console.error('Error loading recent entries:', error);
            throw error;
        }
    }

    /**
     * Load personal statistics
     */
    async loadPersonalStats() {
        try {
            if (typeof dataService === 'undefined') {
                throw new Error('Data service not available');
            }

            const performance = await dataService.getEmployeePerformance(this.employeeId);
            const attendanceStats = await dataService.getAttendanceStats();
            
            // Calculate personal statistics
            this.personalStats = this.calculatePersonalStats(this.attendanceData, performance, attendanceStats);
            
            return this.personalStats;
        } catch (error) {
            console.error('Error loading personal stats:', error);
            throw error;
        }
    }

    /**
     * Load overtime requests
     */
    async loadOvertimeRequests() {
        try {
            if (typeof dataService === 'undefined') {
                throw new Error('Data service not available');
            }

            const requests = await dataService.getOvertimeRequests(this.employeeId);
            this.overtimeRequests = requests || [];
            
            return this.overtimeRequests;
        } catch (error) {
            console.error('Error loading overtime requests:', error);
            throw error;
        }
    }

    /**
     * Calculate personal statistics from attendance data
     */
    calculatePersonalStats(attendanceData, performance, globalStats) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Filter current month data
        const currentMonthData = attendanceData.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });

        // Calculate basic stats
        const totalDays = currentMonthData.length;
        const presentDays = currentMonthData.filter(r => r.status === 'present' || r.status === 'late').length;
        const lateDays = currentMonthData.filter(r => r.status === 'late').length;
        const absentDays = currentMonthData.filter(r => r.status === 'absent').length;
        
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
        const punctualityRate = presentDays > 0 ? ((presentDays - lateDays) / presentDays) * 100 : 0;
        
        // Calculate hours
        const totalRegularHours = currentMonthData.reduce((sum, r) => sum + (r.regularHours || 0), 0);
        const totalOvertimeHours = currentMonthData.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
        const totalHours = totalRegularHours + totalOvertimeHours;
        
        // Calculate average times
        const checkinTimes = currentMonthData
            .filter(r => r.clockIn)
            .map(r => this.timeToMinutes(r.clockIn));
        
        const checkoutTimes = currentMonthData
            .filter(r => r.clockOut)
            .map(r => this.timeToMinutes(r.clockOut));
        
        const avgCheckinTime = checkinTimes.length > 0 
            ? this.minutesToTime(checkinTimes.reduce((a, b) => a + b, 0) / checkinTimes.length)
            : '--:--';
            
        const avgCheckoutTime = checkoutTimes.length > 0
            ? this.minutesToTime(checkoutTimes.reduce((a, b) => a + b, 0) / checkoutTimes.length)
            : '--:--';

        return {
            currentMonth: {
                totalDays,
                presentDays,
                lateDays,
                absentDays,
                attendanceRate: Math.round(attendanceRate * 10) / 10,
                punctualityRate: Math.round(punctualityRate * 10) / 10
            },
            hours: {
                totalRegularHours: Math.round(totalRegularHours * 10) / 10,
                totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
                totalHours: Math.round(totalHours * 10) / 10,
                avgDailyHours: totalDays > 0 ? Math.round((totalHours / totalDays) * 10) / 10 : 0
            },
            timing: {
                avgCheckinTime,
                avgCheckoutTime,
                lateCount: lateDays,
                onTimeCount: presentDays - lateDays
            },
            performance: performance || {
                punctuality: punctualityRate,
                attendance: attendanceRate,
                overtime: totalOvertimeHours > 0 ? 85 : 70,
                consistency: attendanceRate > 90 ? 90 : attendanceRate,
                reliability: (attendanceRate + punctualityRate) / 2
            }
        };
    }

    /**
     * Update user information display
     */
    updateUserInfo() {
        if (this.elements.employeeName && this.currentUser.employee) {
            const fullName = `${this.currentUser.employee.firstName} ${this.currentUser.employee.lastName}`;
            this.elements.employeeName.textContent = fullName;
        }
        
        if (this.elements.employeeId) {
            this.elements.employeeId.textContent = `ID: ${this.employeeId}`;
        }
        
        if (this.elements.employeeDepartment && this.currentUser.employee) {
            this.elements.employeeDepartment.textContent = this.currentUser.employee.department || 'General';
        }
    }

    /**
     * Update attendance summary display
     */
    updateAttendanceSummary(data) {
        if (!this.elements.attendanceSummary) return;

        const stats = this.personalStats.currentMonth;
        
        const summaryHTML = `
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-icon">📅</div>
                    <div class="summary-content">
                        <div class="summary-value">${stats.totalDays}</div>
                        <div class="summary-label">Total Days</div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-icon">✅</div>
                    <div class="summary-content">
                        <div class="summary-value">${stats.presentDays}</div>
                        <div class="summary-label">Present</div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-icon">⏰</div>
                    <div class="summary-content">
                        <div class="summary-value">${stats.lateDays}</div>
                        <div class="summary-label">Late</div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-icon">❌</div>
                    <div class="summary-content">
                        <div class="summary-value">${stats.absentDays}</div>
                        <div class="summary-label">Absent</div>
                    </div>
                </div>
                
                <div class="summary-card highlight">
                    <div class="summary-icon">📊</div>
                    <div class="summary-content">
                        <div class="summary-value">${stats.attendanceRate}%</div>
                        <div class="summary-label">Attendance Rate</div>
                    </div>
                </div>
                
                <div class="summary-card highlight">
                    <div class="summary-icon">🎯</div>
                    <div class="summary-content">
                        <div class="summary-value">${stats.punctualityRate}%</div>
                        <div class="summary-label">Punctuality</div>
                    </div>
                </div>
            </div>
        `;
        
        this.elements.attendanceSummary.innerHTML = summaryHTML;
    }

    /**
     * Update recent entries display
     */
    updateRecentEntries(entries) {
        if (!this.elements.recentEntriesContainer) return;

        if (!entries || entries.length === 0) {
            this.elements.recentEntriesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <div class="empty-message">No recent entries found</div>
                </div>
            `;
            return;
        }

        const entriesHTML = entries.map(entry => {
            const statusClass = this.getStatusClass(entry.status);
            const statusIcon = this.getStatusIcon(entry.status);
            
            return `
                <div class="entry-card ${statusClass}">
                    <div class="entry-date">
                        <div class="date-day">${this.formatDate(entry.date, 'DD')}</div>
                        <div class="date-month">${this.formatDate(entry.date, 'MMM')}</div>
                    </div>
                    
                    <div class="entry-details">
                        <div class="entry-status">
                            <span class="status-icon">${statusIcon}</span>
                            <span class="status-text">${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}</span>
                        </div>
                        
                        <div class="entry-times">
                            <div class="time-item">
                                <span class="time-label">In:</span>
                                <span class="time-value">${entry.clockIn || '--:--'}</span>
                            </div>
                            <div class="time-item">
                                <span class="time-label">Out:</span>
                                <span class="time-value">${entry.clockOut || '--:--'}</span>
                            </div>
                        </div>
                        
                        <div class="entry-hours">
                            <div class="hours-item">
                                <span class="hours-label">Regular:</span>
                                <span class="hours-value">${entry.regularHours || 0}h</span>
                            </div>
                            ${entry.overtimeHours > 0 ? `
                                <div class="hours-item overtime">
                                    <span class="hours-label">Overtime:</span>
                                    <span class="hours-value">${entry.overtimeHours}h</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.recentEntriesContainer.innerHTML = entriesHTML;
    }

    /**
     * Update personal statistics display
     */
    updatePersonalStats(stats) {
        if (!this.elements.statsContainer) return;

        const statsHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Hours Summary</h3>
                    <div class="stat-items">
                        <div class="stat-item">
                            <span class="stat-label">Regular Hours:</span>
                            <span class="stat-value">${stats.hours.totalRegularHours}h</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Overtime Hours:</span>
                            <span class="stat-value">${stats.hours.totalOvertimeHours}h</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Total Hours:</span>
                            <span class="stat-value highlight">${stats.hours.totalHours}h</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Avg Daily:</span>
                            <span class="stat-value">${stats.hours.avgDailyHours}h</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3>Timing Patterns</h3>
                    <div class="stat-items">
                        <div class="stat-item">
                            <span class="stat-label">Avg Check-in:</span>
                            <span class="stat-value">${stats.timing.avgCheckinTime}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Avg Check-out:</span>
                            <span class="stat-value">${stats.timing.avgCheckoutTime}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">On Time:</span>
                            <span class="stat-value success">${stats.timing.onTimeCount} days</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Late:</span>
                            <span class="stat-value warning">${stats.timing.lateCount} days</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.elements.statsContainer.innerHTML = statsHTML;
    }

    /**
     * Update overtime requests display
     */
    updateOvertimeRequests(requests) {
        if (!this.elements.overtimeContainer) return;

        const pendingRequests = requests.filter(r => r.status === 'pending');
        const recentRequests = requests.slice(0, 5);

        const requestsHTML = `
            <div class="overtime-section">
                <div class="section-header">
                    <h3>Overtime Requests</h3>
                    <button class="btn-secondary" onclick="employeeController.showOvertimeForm()">
                        New Request
                    </button>
                </div>
                
                ${pendingRequests.length > 0 ? `
                    <div class="pending-requests">
                        <h4>Pending Requests (${pendingRequests.length})</h4>
                        ${pendingRequests.map(request => this.renderOvertimeRequest(request)).join('')}
                    </div>
                ` : ''}
                
                <div class="recent-requests">
                    <h4>Recent Requests</h4>
                    ${recentRequests.length > 0 ? 
                        recentRequests.map(request => this.renderOvertimeRequest(request)).join('') :
                        '<div class="empty-state">No overtime requests found</div>'
                    }
                </div>
            </div>
        `;

        this.elements.overtimeContainer.innerHTML = requestsHTML;
    }

    /**
     * Render individual overtime request
     */
    renderOvertimeRequest(request) {
        const statusClass = this.getOvertimeStatusClass(request.status);
        const statusIcon = this.getOvertimeStatusIcon(request.status);

        return `
            <div class="overtime-request ${statusClass}">
                <div class="request-header">
                    <div class="request-date">${this.formatDate(request.date)}</div>
                    <div class="request-status">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="status-text">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                    </div>
                </div>
                
                <div class="request-details">
                    <div class="detail-item">
                        <span class="detail-label">Hours:</span>
                        <span class="detail-value">${request.hours}h</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Reason:</span>
                        <span class="detail-value">${request.reason}</span>
                    </div>
                    ${request.notes ? `
                        <div class="detail-item">
                            <span class="detail-label">Notes:</span>
                            <span class="detail-value">${request.notes}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${request.status === 'pending' ? `
                    <div class="request-actions">
                        <button class="btn-danger btn-sm" onclick="employeeController.cancelOvertimeRequest(${request.id})">
                            Cancel
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        if (typeof chartsManager === 'undefined') {
            console.warn('Charts manager not available');
            return;
        }

        // Attendance overview chart
        if (this.elements.attendanceChart) {
            this.createAttendanceChart();
        }

        // Hours tracking chart
        if (this.elements.hoursChart) {
            this.createHoursChart();
        }

        // Performance radar chart
        if (this.elements.performanceChart) {
            this.createPerformanceChart();
        }
    }

    /**
     * Create attendance overview chart
     */
    createAttendanceChart() {
        const stats = this.personalStats.currentMonth;
        const data = {
            present: stats.presentDays - stats.lateDays,
            late: stats.lateDays,
            absent: stats.absentDays,
            onLeave: 0 // Could be calculated from attendance data
        };

        this.charts.set('attendance', chartsManager.createAttendanceStatsChart('attendance-chart', data));
    }

    /**
     * Create hours tracking chart
     */
    createHoursChart() {
        // Get last 7 days of data
        const last7Days = this.attendanceData
            .slice(-7)
            .map(record => ({
                date: this.formatDate(record.date, 'MMM DD'),
                regular: record.regularHours || 0,
                overtime: record.overtimeHours || 0
            }));

        const data = {
            labels: last7Days.map(d => d.date),
            regularHours: last7Days.map(d => d.regular),
            overtimeHours: last7Days.map(d => d.overtime),
            regularRate: this.currentUser.employee?.hourlyRate || 15,
            overtimeRate: (this.currentUser.employee?.hourlyRate || 15) * 1.5
        };

        this.charts.set('hours', chartsManager.createPayrollChart('hours-chart', data));
    }

    /**
     * Create performance radar chart
     */
    createPerformanceChart() {
        const performance = this.personalStats.performance;
        const data = {
            labels: ['Punctuality', 'Attendance', 'Overtime', 'Consistency', 'Reliability'],
            scores: [
                performance.punctuality || 0,
                performance.attendance || 0,
                performance.overtime || 0,
                performance.consistency || 0,
                performance.reliability || 0
            ],
            employeeName: this.currentUser.employee ? 
                `${this.currentUser.employee.firstName} ${this.currentUser.employee.lastName}` : 
                'Employee Performance'
        };

        this.charts.set('performance', chartsManager.createPerformanceChart('performance-chart', data));
    }

    /**
     * Handle clock in
     */
    async handleClockIn() {
        try {
            this.showButtonLoading('clock-in-btn', true);
            
            if (typeof dataService === 'undefined') {
                throw new Error('Data service not available');
            }

            await dataService.clockIn(this.employeeId);
            
            this.showSuccess('Clocked in successfully');
            await this.refreshData();
            
        } catch (error) {
            console.error('Clock in error:', error);
            this.showError('Failed to clock in');
        } finally {
            this.showButtonLoading('clock-in-btn', false);
        }
    }

    /**
     * Handle clock out
     */
    async handleClockOut() {
        try {
            this.showButtonLoading('clock-out-btn', true);
            
            if (typeof dataService === 'undefined') {
                throw new Error('Data service not available');
            }

            await dataService.clockOut(this.employeeId);
            
            this.showSuccess('Clocked out successfully');
            await this.refreshData();
            
        } catch (error) {
            console.error('Clock out error:', error);
            this.showError('Failed to clock out');
        } finally {
            this.showButtonLoading('clock-out-btn', false);
        }
    }

    /**
     * Handle lunch start
     */
    async handleLunchStart() {
        try {
            this.showButtonLoading('lunch-start-btn', true);
            
            if (typeof dataService === 'undefined') {
                throw new Error('Data service not available');
            }

            await dataService.startLunch(this.employeeId);
            
            this.showSuccess('Lunch break started');
            await this.refreshData();
            
        } catch (error) {
            console.error('Lunch start error:', error);
            this.showError('Failed to start lunch break');
        } finally {
            this.showButtonLoading('lunch-start-btn', false);
        }
    }

    /**
     * Handle lunch end
     */
    async handleLunchEnd() {
        try {
            this.showButtonLoading('lunch-end-btn', true);
            
            if (typeof dataService === 'undefined') {
                throw new Error('Data service not available');
            }

            await dataService.endLunch(this.employeeId);
            
            this.showSuccess('Lunch break ended');
            await this.refreshData();
            
        } catch (error) {
            console.error('Lunch end error:', error);
            this.showError('Failed to end lunch break');
        } finally {
            this.showButtonLoading('lunch-end-btn', false);
        }
    }

    /**
     * Handle overtime form submission
     */
    async handleOvertimeSubmission(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            const overtimeData = {
                employeeId: this.employeeId,
                date: formData.get('overtime-date'),
                hours: parseFloat(formData.get('overtime-hours')),
                reason: formData.get('overtime-reason'),
                description: formData.get('overtime-description') || ''
            };

            // Validate data
            if (!overtimeData.date || !overtimeData.hours || !overtimeData.reason) {
                throw new Error('Please fill in all required fields');
            }

            if (overtimeData.hours <= 0 || overtimeData.hours > 12) {
                throw new Error('Hours must be between 0 and 12');
            }

            if (typeof dataService === 'undefined') {
                throw new Error('Data service not available');
            }

            await dataService.createOvertimeRequest(overtimeData);
            
            this.showSuccess('Overtime request submitted successfully');
            event.target.reset();
            this.hideOvertimeForm();
            await this.loadOvertimeRequests();
            this.updateOvertimeRequests(this.overtimeRequests);
            
        } catch (error) {
            console.error('Overtime submission error:', error);
            this.showError(error.message || 'Failed to submit overtime request');
        }
    }

    /**
     * Cancel overtime request
     */
    async cancelOvertimeRequest(requestId) {
        if (!confirm('Are you sure you want to cancel this overtime request?')) {
            return;
        }

        try {
            if (typeof dataService === 'undefined') {
                throw new Error('Data service not available');
            }

            await dataService.updateOvertimeRequest(requestId, { status: 'cancelled' });
            
            this.showSuccess('Overtime request cancelled');
            await this.loadOvertimeRequests();
            this.updateOvertimeRequests(this.overtimeRequests);
            
        } catch (error) {
            console.error('Cancel overtime error:', error);
            this.showError('Failed to cancel overtime request');
        }
    }

    /**
     * Show overtime form modal
     */
    showOvertimeForm() {
        if (typeof modalsManager !== 'undefined') {
            modalsManager.showModal('overtime-form-modal');
        } else {
            // Fallback: show form inline
            const formContainer = document.getElementById('overtime-form-container');
            if (formContainer) {
                formContainer.style.display = 'block';
            }
        }
    }

    /**
     * Hide overtime form modal
     */
    hideOvertimeForm() {
        if (typeof modalsManager !== 'undefined') {
            modalsManager.hideModal('overtime-form-modal');
        } else {
            // Fallback: hide form inline
            const formContainer = document.getElementById('overtime-form-container');
            if (formContainer) {
                formContainer.style.display = 'none';
            }
        }
    }

    /**
     * Update time tracking button states
     */
    updateTimeTrackingButtons() {
        // Get today's attendance record
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = this.attendanceData.find(record => record.date === today);

        // Update button states based on current status
        if (todayRecord) {
            this.updateButtonState('clock-in-btn', !!todayRecord.clockIn, 'Clocked In');
            this.updateButtonState('clock-out-btn', !!todayRecord.clockOut, 'Clocked Out');
            this.updateButtonState('lunch-start-btn', !!todayRecord.lunchStart, 'Lunch Started');
            this.updateButtonState('lunch-end-btn', !!todayRecord.lunchEnd, 'Lunch Ended');
        } else {
            // Reset all buttons for new day
            this.updateButtonState('clock-in-btn', false, 'Clock In');
            this.updateButtonState('clock-out-btn', false, 'Clock Out');
            this.updateButtonState('lunch-start-btn', false, 'Start Lunch');
            this.updateButtonState('lunch-end-btn', false, 'End Lunch');
        }
    }

    /**
     * Update individual button state
     */
    updateButtonState(buttonId, isCompleted, completedText) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        if (isCompleted) {
            button.classList.add('completed');
            button.disabled = true;
            button.textContent = completedText;
        } else {
            button.classList.remove('completed');
            button.disabled = false;
            // Reset to original text based on button ID
            const originalTexts = {
                'clock-in-btn': 'Clock In',
                'clock-out-btn': 'Clock Out',
                'lunch-start-btn': 'Start Lunch',
                'lunch-end-btn': 'End Lunch'
            };
            button.textContent = originalTexts[buttonId] || button.textContent;
        }
    }

    /**
     * Handle date range change
     */
    async handleDateRangeChange() {
        try {
            this.showLoading(true);
            await this.loadAttendanceData();
            await this.loadPersonalStats();
            
            this.updateAttendanceSummary(this.attendanceData);
            this.updatePersonalStats(this.personalStats);
            this.updateCharts();
            
        } catch (error) {
            console.error('Date range change error:', error);
            this.showError('Failed to update data for selected date range');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Get selected date range
     */
    getSelectedDateRange() {
        const select = this.elements.dateRangeSelect;
        const range = select ? select.value : 'current-month';
        
        const now = new Date();
        let startDate, endDate;

        switch (range) {
            case 'last-week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                endDate = now;
                break;
            case 'last-month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'last-3-months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                endDate = now;
                break;
            case 'current-month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                break;
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    }

    /**
     * Refresh all data
     */
    async refreshData() {
        try {
            this.showLoading(true);
            await this.loadInitialData();
            this.updateCharts();
            this.showSuccess('Data refreshed successfully');
        } catch (error) {
            console.error('Refresh error:', error);
            this.showError('Failed to refresh data');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Update all charts with new data
     */
    updateCharts() {
        if (typeof chartsManager === 'undefined') return;

        // Update attendance chart
        if (this.charts.has('attendance')) {
            const stats = this.personalStats.currentMonth;
            const data = {
                datasets: [{
                    data: [
                        stats.presentDays - stats.lateDays,
                        stats.lateDays,
                        stats.absentDays,
                        0
                    ]
                }]
            };
            chartsManager.updateChart('attendance-chart', data);
        }

        // Update hours chart
        if (this.charts.has('hours')) {
            const last7Days = this.attendanceData
                .slice(-7)
                .map(record => ({
                    date: this.formatDate(record.date, 'MMM DD'),
                    regular: record.regularHours || 0,
                    overtime: record.overtimeHours || 0
                }));

            const data = {
                labels: last7Days.map(d => d.date),
                datasets: [
                    { data: last7Days.map(d => d.regular) },
                    { data: last7Days.map(d => d.overtime) }
                ]
            };
            chartsManager.updateChart('hours-chart', data);
        }

        // Update performance chart
        if (this.charts.has('performance')) {
            const performance = this.personalStats.performance;
            const data = {
                datasets: [{
                    data: [
                        performance.punctuality || 0,
                        performance.attendance || 0,
                        performance.overtime || 0,
                        performance.consistency || 0,
                        performance.reliability || 0
                    ]
                }]
            };
            chartsManager.updateChart('performance-chart', data);
        }
    }

    /**
     * Setup auto-refresh functionality
     */
    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        if (this.autoRefreshEnabled) {
            this.refreshInterval = setInterval(() => {
                this.refreshData();
            }, this.refreshIntervalTime);
        }
    }

    /**
     * Handle window focus (refresh data when user returns)
     */
    handleWindowFocus() {
        if (this.autoRefreshEnabled) {
            this.refreshData();
        }
    }

    /**
     * Handle user update
     */
    handleUserUpdate(user) {
        this.currentUser = user;
        this.updateUserInfo();
    }

    /**
     * Handle theme change
     */
    handleThemeChange(themeData) {
        // Update charts theme if available
        if (typeof chartsManager !== 'undefined') {
            chartsManager.updateAllChartsTheme(themeData.theme);
        }
    }

    /**
     * Utility: Convert time string to minutes
     */
    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Utility: Convert minutes to time string
     */
    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    /**
     * Utility: Format date
     */
    formatDate(dateStr, format = 'MMM DD, YYYY') {
        const date = new Date(dateStr);
        
        const formats = {
            'DD': date.getDate().toString().padStart(2, '0'),
            'MMM': date.toLocaleDateString('en-US', { month: 'short' }),
            'YYYY': date.getFullYear(),
            'MMM DD': date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            'MMM DD, YYYY': date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            })
        };

        return formats[format] || date.toLocaleDateString();
    }

    /**
     * Utility: Get status class for styling
     */
    getStatusClass(status) {
        const classes = {
            'present': 'status-present',
            'late': 'status-late',
            'absent': 'status-absent',
            'waiting': 'status-waiting',
            'on-leave': 'status-leave'
        };
        return classes[status] || 'status-unknown';
    }

    /**
     * Utility: Get status icon
     */
    getStatusIcon(status) {
        const icons = {
            'present': '✅',
            'late': '⏰',
            'absent': '❌',
            'waiting': '⏳',
            'on-leave': '🏖️'
        };
        return icons[status] || '❓';
    }

    /**
     * Utility: Get overtime status class
     */
    getOvertimeStatusClass(status) {
        const classes = {
            'pending': 'overtime-pending',
            'approved': 'overtime-approved',
            'denied': 'overtime-denied',
            'cancelled': 'overtime-cancelled'
        };
        return classes[status] || 'overtime-unknown';
    }

    /**
     * Utility: Get overtime status icon
     */
    getOvertimeStatusIcon(status) {
        const icons = {
            'pending': '⏳',
            'approved': '✅',
            'denied': '❌',
            'cancelled': '🚫'
        };
        return icons[status] || '❓';
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        this.elements.loadingIndicators.forEach(indicator => {
            if (show) {
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        });
    }

    /**
     * Show button loading state
     */
    showButtonLoading(buttonId, show) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        if (show) {
            button.disabled = true;
            button.classList.add('loading');
            button.dataset.originalText = button.textContent;
            button.textContent = 'Loading...';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add to page
        document.body.appendChild(notification);

        // Show with animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clear intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Destroy charts
        if (typeof chartsManager !== 'undefined') {
            this.charts.forEach((chart, id) => {
                chartsManager.destroyChart(id);
            });
        }
        this.charts.clear();

        // Remove event listeners
        window.removeEventListener('focus', this.handleWindowFocus);
        window.removeEventListener('beforeunload', this.cleanup);
    }

    /**
     * Get controller state for debugging
     */
    getState() {
        return {
            currentUser: this.currentUser,
            employeeId: this.employeeId,
            attendanceDataCount: this.attendanceData.length,
            recentEntriesCount: this.recentEntries.length,
            overtimeRequestsCount: this.overtimeRequests.length,
            personalStats: this.personalStats,
            autoRefreshEnabled: this.autoRefreshEnabled,
            chartsCount: this.charts.size
        };
    }
}

// Create and export controller instance
const employeeController = new EmployeeController();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = employeeController;
} else if (typeof window !== 'undefined') {
    window.employeeController = employeeController;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!employeeController.currentUser) {
            employeeController.init();
        }
    });
} else {
    if (!employeeController.currentUser) {
        employeeController.init();
    }
}