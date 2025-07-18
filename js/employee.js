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

        // Don't auto-initialize - wait for DirectFlow
        this.initWhenReady();
    }

    /**
     * Initialize when DirectFlow is ready
     */
    async initWhenReady() {
        console.log('⏳ EmployeeController waiting for DirectFlow authentication...');
        
        const maxWait = 15000; // 15 seconds max wait
        const interval = 500; // Check every 500ms
        let waited = 0;
        
        while (waited < maxWait) {
            if (window.directFlowAuth && typeof window.directFlowAuth.isAuthenticated === 'function') {
                console.log('✅ DirectFlow authentication is available, initializing EmployeeController...');
                await this.init();
                return;
            }
            
            console.log(`⏳ DirectFlow not ready, waited ${waited/1000}s/${maxWait/1000}s`);
            await new Promise(resolve => setTimeout(resolve, interval));
            waited += interval;
        }
        
        console.error('❌ DirectFlow authentication timeout - proceeding with limited functionality');
        // Still try to initialize but with fallback
        await this.init();
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
     * Get consistent authentication service
     */
    getAuthService() {
        const authService = window.directFlowAuth || window.directFlow;
        if (!authService) {
            console.error('❌ No DirectFlow authentication service available');
            return null;
        }
        
        if (typeof authService.isAuthenticated !== 'function') {
            console.error('❌ Authentication service missing isAuthenticated method');
            return null;
        }
        
        return authService;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const authService = this.getAuthService();
        return authService && authService.isAuthenticated();
    }

    /**
     * Get current user from authentication service
     */
    getCurrentUser() {
        const authService = this.getAuthService();
        if (!authService || !authService.isAuthenticated()) {
            return null;
        }
        
        if (typeof authService.getCurrentUser === 'function') {
            return authService.getCurrentUser();
        }
        
        console.warn('⚠️ getCurrentUser method not available on auth service');
        return null;
    }

    /**
     * Verify user authentication and role using DirectFlow
     */
    verifyAuthentication() {
        console.log('🔐 Verifying authentication...');
        
        // Check DirectFlow authentication first
        const authService = this.getAuthService();
        if (authService && authService.isAuthenticated()) {
            const user = this.getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.employeeId = user.employee_id || user.id || user.username;
                console.log('✅ Authenticated via DirectFlow:', this.employeeId);
                console.log('👤 Current user:', user);
                return true;
            }
        }

        // Fallback: Check localStorage for existing user
        const storedUser = localStorage.getItem('directflow_user') || localStorage.getItem('demo_user');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                this.employeeId = this.currentUser.employee_id || this.currentUser.id || this.currentUser.username;
                console.log('✅ Authenticated via localStorage:', this.employeeId);
                return true;
            } catch (e) {
                console.error('Error parsing stored user:', e);
            }
        }

        // Last resort: Create demo user for development - but only in dev mode
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isDevelopment) {
            console.warn('⚠️ No authentication found, creating demo user for development');
            this.currentUser = {
                id: 'demo.user',
                username: 'demo.user',
                name: 'Demo User',
                email: 'demo@company.com',
                role: 'employee',
                department: 'General',
                employee_id: 'demo.user'
            };
            this.employeeId = 'demo.user';
            localStorage.setItem('directflow_user', JSON.stringify(this.currentUser));
            console.log('✅ Demo user created:', this.employeeId);
            return true;
        }

        // No authentication available
        console.error('❌ No authentication available');
        this.showError('Please log in to access the employee dashboard');
        // Redirect to login page
        setTimeout(() => {
            if (window.location.pathname !== '/login.html') {
                window.location.href = '/login.html';
            }
        }, 2000);
        return false;
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

        // Overtime buttons
        const requestOvertimeBtn = document.getElementById('request-overtime-btn');
        if (requestOvertimeBtn) {
            requestOvertimeBtn.addEventListener('click', () => this.showOvertimeForm());
        }
        
        const quickOvertimeBtn = document.getElementById('quickOvertimeBtn');
        if (quickOvertimeBtn) {
            quickOvertimeBtn.addEventListener('click', () => this.showOvertimeForm());
        }
        
        // Modal close buttons
        const overtimeModalClose = document.getElementById('overtime-modal-close');
        if (overtimeModalClose) {
            overtimeModalClose.addEventListener('click', () => this.hideOvertimeForm());
        }
        
        // Modal backdrop clicks
        const overtimeModal = document.getElementById('overtime-form-modal');
        if (overtimeModal) {
            overtimeModal.addEventListener('click', (e) => {
                if (e.target === overtimeModal) {
                    this.hideOvertimeForm();
                }
            });
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
     * Load initial data from proper attendance APIs
     */
    async loadInitialData() {
        this.showLoading(true);
        
        try {
            // Update user info display
            this.updateUserInfo();

            // Load data in parallel from proper attendance APIs
            const [
                attendanceData,
                recentEntries,
                personalStats,
                overtimeRequests,
                currentStatus
            ] = await Promise.all([
                this.loadAttendanceData(),
                this.loadRecentEntries(),
                this.loadPersonalStats(),
                this.loadOvertimeRequests(),
                this.loadCurrentStatus()
            ]);

            // Update UI with loaded data
            this.updateAttendanceSummary(attendanceData);
            this.updateRecentEntries(recentEntries);
            this.updatePersonalStats(personalStats);
            this.updateOvertimeRequests(overtimeRequests);
            this.updateClockStatus(currentStatus.status, currentStatus.current_record);

            console.log('Employee data loaded successfully from attendance APIs');
        } catch (error) {
            console.error('Error loading employee data:', error);
            this.showError('Failed to load employee data from backend');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Load current clock status
     */
    async loadCurrentStatus() {
        try {
            const authService = this.getAuthService();
            if (!authService || !authService.isAuthenticated()) {
                throw new Error('Authentication required');
            }

            const response = await authService.apiRequest('/api/attendance/status');
            
            if (!response.ok) {
                throw new Error(`Failed to load status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result && result.success && result.data) {
                return result.data;
            } else {
                return { status: 'clocked_out', current_record: null };
            }
        } catch (error) {
            console.error('Error loading current status:', error);
            return { status: 'clocked_out', current_record: null };
        }
    }

    /**
     * Load attendance data from proper attendance API
     */
    async loadAttendanceData() {
        try {
            const authService = this.getAuthService();
            if (!authService || !authService.isAuthenticated()) {
                throw new Error('Authentication required to load attendance data');
            }

            console.log('Loading attendance data for employee:', this.employeeId);
            
            // Use the proper attendance endpoint
            const response = await authService.apiRequest('/api/attendance');
            
            if (!response.ok) {
                throw new Error(`Failed to load attendance data: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result && result.success && result.data) {
                // The API returns data with pagination structure
                this.attendanceData = result.data.records || [];
                console.log(`✅ Loaded ${this.attendanceData.length} attendance records for employee ${this.employeeId}`);
                console.log('Sample record:', this.attendanceData[0]);
                return this.attendanceData;
            } else {
                console.warn('❌ Failed to load attendance data:', result?.message);
                this.attendanceData = [];
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading attendance data:', error);
            this.attendanceData = [];
            throw error;
        }
    }

    /**
     * Load recent time entries from DirectFlow backend
     */
    async loadRecentEntries() {
        try {
            if (!this.attendanceData || this.attendanceData.length === 0) {
                await this.loadAttendanceData();
            }

            // Get last 10 entries, sorted by date
            this.recentEntries = this.attendanceData
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10);

            console.log(`Loaded ${this.recentEntries.length} recent entries from DirectFlow`);
            return this.recentEntries;
        } catch (error) {
            console.error('Error loading recent entries from DirectFlow:', error);
            this.recentEntries = [];
            throw error;
        }
    }

    /**
     * Load personal statistics from DirectFlow backend
     */
    async loadPersonalStats() {
        try {
            if (!this.attendanceData || this.attendanceData.length === 0) {
                await this.loadAttendanceData();
            }

            // Calculate personal statistics from attendance data
            this.personalStats = this.calculatePersonalStats(this.attendanceData);
            
            console.log('Calculated personal stats from DirectFlow data');
            return this.personalStats;
        } catch (error) {
            console.error('Error loading personal stats from DirectFlow:', error);
            this.personalStats = {};
            throw error;
        }
    }

    /**
     * Load overtime requests from DirectFlow backend
     */
    async loadOvertimeRequests() {
        try {
            const authService = this.getAuthService();
            if (!authService || !authService.isAuthenticated()) {
                throw new Error('Authentication required to load overtime requests');
            }

            console.log('Loading overtime requests for employee:', this.employeeId);
            
            // Use the dedicated overtime API endpoint
            const response = await authService.apiRequest('/api/overtime/');
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('No overtime requests found');
                    this.overtimeRequests = [];
                    return [];
                }
                throw new Error(`Failed to load overtime requests: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result && result.success && result.data) {
                this.overtimeRequests = result.data.requests || [];
                console.log(`✅ Loaded ${this.overtimeRequests.length} overtime requests for employee ${this.employeeId}`);
                return this.overtimeRequests;
            } else {
                console.warn('❌ Failed to load overtime requests:', result?.message);
                this.overtimeRequests = [];
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading overtime requests from DirectFlow:', error);
            this.overtimeRequests = [];
            return [];
        }
    }

    /**
     * Calculate personal statistics from attendance data
     */
    calculatePersonalStats(attendanceData) {
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
        const totalRegularHours = currentMonthData.reduce((sum, r) => sum + (parseFloat(r.regular_hours) || parseFloat(r.regularHours) || 0), 0);
        const totalOvertimeHours = currentMonthData.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || parseFloat(r.overtimeHours) || 0), 0);
        const totalHours = totalRegularHours + totalOvertimeHours;
        
        // Calculate average times
        const checkinTimes = currentMonthData
            .filter(r => r.clock_in || r.timeIn)
            .map(r => this.timeToMinutes(r.clock_in || r.timeIn));
        
        const checkoutTimes = currentMonthData
            .filter(r => r.clock_out || r.timeOut)
            .map(r => this.timeToMinutes(r.clock_out || r.timeOut));
        
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
            performance: {
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
            
            // Handle different field naming conventions
            const clockIn = entry.clockIn || entry.timeIn || entry.clock_in || '--:--';
            const clockOut = entry.clockOut || entry.timeOut || entry.clock_out || '--:--';
            const regularHours = entry.hours || entry.hoursWorked || entry.regularHours || '0';
            const overtimeHours = entry.overtimeHours || entry.overtime_hours || '0';
            
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
                                <span class="time-value">${clockIn}</span>
                            </div>
                            <div class="time-item">
                                <span class="time-label">Out:</span>
                                <span class="time-value">${clockOut}</span>
                            </div>
                        </div>
                        
                        <div class="entry-hours">
                            <div class="hours-item">
                                <span class="hours-label">Regular:</span>
                                <span class="hours-value">${regularHours}h</span>
                            </div>
                            ${parseFloat(overtimeHours) > 0 ? `
                                <div class="hours-item overtime">
                                    <span class="hours-label">Overtime:</span>
                                    <span class="hours-value">${overtimeHours}h</span>
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
                    <div class="request-date">${this.formatDate(request.request_date)}</div>
                    <div class="request-status">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="status-text">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                    </div>
                </div>
                
                <div class="request-details">
                    <div class="detail-item">
                        <span class="detail-label">Hours:</span>
                        <span class="detail-value">${request.hours_requested}h</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Reason:</span>
                        <span class="detail-value">${request.reason}</span>
                    </div>
                    ${request.approved_by ? `
                        <div class="detail-item">
                            <span class="detail-label">Approved by:</span>
                            <span class="detail-value">${request.approved_by}</span>
                        </div>
                    ` : ''}
                    ${request.approved_at ? `
                        <div class="detail-item">
                            <span class="detail-label">Date processed:</span>
                            <span class="detail-value">${this.formatDate(request.approved_at)}</span>
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
     * Handle clock in using DirectFlow
     */
    /**
     * Handle clock in using proper attendance API
     */
    async handleClockIn() {
        try {
            this.showButtonLoading('clock-in-btn', true);
            
            // Use centralized authentication service
            const authService = this.getAuthService();
            if (!authService || !this.isAuthenticated()) {
                throw new Error('Authentication service not available or not authenticated. Please log in again.');
            }

            console.log(`🕐 Processing clock in for ${this.employeeId}...`);

            // Use proper attendance clock endpoint
            const response = await authService.apiRequest('/api/attendance/clock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'in',
                    notes: 'Clocked in via employee portal'
                })
            });

            console.log('� Clock in response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Clock in failed:', errorData);
                
                // Handle specific error codes
                if (response.status === 401) {
                    throw new Error('Authentication expired. Please log in again.');
                } else if (response.status === 400) {
                    throw new Error(errorData.message || 'Invalid clock in request');
                } else {
                    throw new Error(`Clock in failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
                }
            }

            const result = await response.json();
            console.log('✅ Clock in result:', result);
            
            if (result.success) {
                const clockInTime = result.data.time_in || new Date().toTimeString().slice(0, 8);
                this.showSuccess(`✅ Clocked in successfully at ${clockInTime}`);
                console.log('✅ Clock in successful, refreshing data...');
                
                // Update UI state immediately
                this.updateClockStatus('clocked_in', result.data);
                
                // Refresh attendance data
                await this.loadInitialData();
            } else {
                throw new Error(result.message || 'Clock in failed');
            }
            
        } catch (error) {
            console.error('❌ Clock in error:', error);
            if (error.message.includes('Authentication expired')) {
                this.showError('Authentication expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                this.showError('Failed to clock in: ' + error.message);
            }
        } finally {
            this.showButtonLoading('clock-in-btn', false);
        }
    }

    /**
     * Handle clock out using proper attendance API
     */
    async handleClockOut() {
        try {
            this.showButtonLoading('clock-out-btn', true);
            
            // Use centralized authentication service
            const authService = this.getAuthService();
            if (!authService || !this.isAuthenticated()) {
                throw new Error('Authentication service not available or not authenticated. Please log in again.');
            }

            console.log(`🕐 Processing clock out for ${this.employeeId}...`);

            // Use proper attendance clock endpoint
            const response = await authService.apiRequest('/api/attendance/clock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'out',
                    notes: 'Clocked out via employee portal'
                })
            });

            console.log('📥 Clock out response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Clock out failed:', errorData);
                
                // Handle specific error codes
                if (response.status === 401) {
                    throw new Error('Authentication expired. Please log in again.');
                } else if (response.status === 400) {
                    throw new Error(errorData.message || 'Invalid clock out request');
                } else {
                    throw new Error(`Clock out failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
                }
            }

            const result = await response.json();
            console.log('✅ Clock out result:', result);
            
            if (result.success) {
                const clockOutTime = result.data.time_out || new Date().toTimeString().slice(0, 8);
                const hoursWorked = result.data.total_hours || '0.00';
                this.showSuccess(`✅ Clocked out successfully at ${clockOutTime}. Hours worked: ${hoursWorked}`);
                console.log('✅ Clock out successful, refreshing data...');
                
                // Update UI state immediately
                this.updateClockStatus('clocked_out', result.data);
                
                // Refresh attendance data
                await this.loadInitialData();
            } else {
                throw new Error(result.message || 'Clock out failed');
            }
            
        } catch (error) {
            console.error('❌ Clock out error:', error);
            if (error.message.includes('Authentication expired')) {
                this.showError('Authentication expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                this.showError('Failed to clock out: ' + error.message);
            }
        } finally {
            this.showButtonLoading('clock-out-btn', false);
        }
    }

    /**
     * Update clock status UI
     */
    updateClockStatus(status, data) {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (statusIndicator && statusText) {
            if (status === 'clocked_in') {
                statusText.textContent = `Clocked In at ${data.time_in || '--:--'}`;
                statusIndicator.classList.add('status-active');
            } else if (status === 'clocked_out') {
                statusText.textContent = 'Ready to Clock In';
                statusIndicator.classList.remove('status-active');
            }
        }
        
        // Update button states
        this.updateTimeTrackingButtons();
    }

    /**
     * Handle lunch start using proper attendance API
     */
    async handleLunchStart() {
        try {
            this.showButtonLoading('lunch-start-btn', true);
            
            const authService = this.getAuthService();
            if (!authService || !authService.isAuthenticated()) {
                throw new Error('Authentication required for break tracking');
            }

            console.log(`🍽️ Processing lunch start for ${this.employeeId}...`);

            // Use proper attendance break endpoint
            const response = await authService.apiRequest('/api/attendance/break', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'start',
                    notes: 'Lunch break started via employee portal'
                })
            });

            console.log('📥 Lunch start response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Lunch start failed:', errorData);
                
                if (response.status === 401) {
                    throw new Error('Authentication expired. Please log in again.');
                } else if (response.status === 400) {
                    throw new Error(errorData.message || 'Invalid lunch start request');
                } else {
                    throw new Error(`Lunch start failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
                }
            }

            const result = await response.json();
            console.log('✅ Lunch start result:', result);
            
            if (result.success) {
                const breakTime = result.data.break_start || new Date().toTimeString().slice(0, 8);
                this.showSuccess(`✅ Lunch break started at ${breakTime}`);
                
                // Refresh attendance data
                await this.loadInitialData();
            } else {
                throw new Error(result.message || 'Lunch start failed');
            }
            
        } catch (error) {
            console.error('❌ Lunch start error:', error);
            if (error.message.includes('Authentication expired')) {
                this.showError('Authentication expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                this.showError('Failed to start lunch break: ' + error.message);
            }
        } finally {
            this.showButtonLoading('lunch-start-btn', false);
        }
    }

    /**
     * Handle lunch end using proper attendance API
     */
    async handleLunchEnd() {
        try {
            this.showButtonLoading('lunch-end-btn', true);
            
            const authService = this.getAuthService();
            if (!authService || !authService.isAuthenticated()) {
                throw new Error('Authentication required for break tracking');
            }

            console.log(`🍽️ Processing lunch end for ${this.employeeId}...`);

            // Use proper attendance break endpoint
            const response = await authService.apiRequest('/api/attendance/break', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'end',
                    notes: 'Lunch break ended via employee portal'
                })
            });

            console.log('📥 Lunch end response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Lunch end failed:', errorData);
                
                if (response.status === 401) {
                    throw new Error('Authentication expired. Please log in again.');
                } else if (response.status === 400) {
                    throw new Error(errorData.message || 'Invalid lunch end request');
                } else {
                    throw new Error(`Lunch end failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
                }
            }

            const result = await response.json();
            console.log('✅ Lunch end result:', result);
            
            if (result.success) {
                const breakTime = result.data.break_end || new Date().toTimeString().slice(0, 8);
                this.showSuccess(`✅ Lunch break ended at ${breakTime}`);
                
                // Refresh attendance data
                await this.loadInitialData();
            } else {
                throw new Error(result.message || 'Lunch end failed');
            }
            
        } catch (error) {
            console.error('❌ Lunch end error:', error);
            if (error.message.includes('Authentication expired')) {
                this.showError('Authentication expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                this.showError('Failed to end lunch break: ' + error.message);
            }
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
                request_date: formData.get('overtime-date'),
                hours_requested: parseFloat(formData.get('overtime-hours')),
                reason: formData.get('overtime-reason')
            };

            // Validate data
            if (!overtimeData.request_date || !overtimeData.hours_requested || !overtimeData.reason) {
                throw new Error('Please fill in all required fields');
            }

            if (overtimeData.hours_requested <= 0 || overtimeData.hours_requested > 12) {
                throw new Error('Hours must be between 0 and 12');
            }

            const authService = this.getAuthService();
            if (!authService || !authService.isAuthenticated()) {
                throw new Error('Authentication required for overtime requests');
            }

            console.log('Submitting overtime request:', overtimeData);
            
            // Submit to the dedicated overtime API endpoint
            const response = await authService.apiRequest('/api/overtime/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(overtimeData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Request failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Overtime request submitted successfully');
                event.target.reset();
                this.hideOvertimeForm();
                await this.loadOvertimeRequests();
                this.updateOvertimeRequests(this.overtimeRequests);
            } else {
                throw new Error(result.message || 'Failed to submit overtime request');
            }
            
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
            const authService = this.getAuthService();
            if (!authService || !authService.isAuthenticated()) {
                throw new Error('Authentication required for overtime management');
            }

            console.log('Cancelling overtime request:', requestId);
            
            // Delete the overtime request using the API
            const response = await authService.apiRequest(`/api/overtime/${requestId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Request failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Overtime request cancelled successfully');
                await this.loadOvertimeRequests();
                this.updateOvertimeRequests(this.overtimeRequests);
            } else {
                throw new Error(result.message || 'Failed to cancel overtime request');
            }
            
        } catch (error) {
            console.error('Cancel overtime error:', error);
            this.showError('Failed to cancel overtime request: ' + error.message);
        }
    }

    /**
     * Show overtime form modal
     */
    showOvertimeForm() {
        if (typeof window.modalManager !== 'undefined') {
            // Use the modal manager to show existing modal
            const modal = document.getElementById('overtime-form-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        } else {
            // Direct modal manipulation fallback
            const modal = document.getElementById('overtime-form-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        }
    }

    /**
     * Hide overtime form modal
     */
    hideOvertimeForm() {
        if (typeof window.modalManager !== 'undefined') {
            // Use the modal manager to hide existing modal
            const modal = document.getElementById('overtime-form-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        } else {
            // Direct modal manipulation fallback
            const modal = document.getElementById('overtime-form-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
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
     * Update current time display (required by employee.html)
     */
    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const dateString = now.toLocaleDateString();
        
        // Update time displays if they exist
        const timeElement = document.getElementById('current-time');
        const dateElement = document.getElementById('current-date');
        
        if (timeElement) {
            timeElement.textContent = timeString;
        }
        
        if (dateElement) {
            dateElement.textContent = dateString;
        }
        
        // Update any other time-related elements
        const clockDisplay = document.querySelector('.clock-display');
        if (clockDisplay) {
            clockDisplay.textContent = timeString;
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
            chartsManager.updateThemeColors();
            // Recreate charts with new theme
            this.updateCharts();
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

    /**
     * Update local attendance data immediately for better UX
     */
    updateLocalAttendanceData(newRecord) {
        try {
            // Update recent entries if available
            if (this.recentEntries && Array.isArray(this.recentEntries)) {
                // Check if today's record already exists in recent entries
                const todayIndex = this.recentEntries.findIndex(entry => 
                    entry.date === newRecord.date && 
                    (entry.employeeId === this.employeeId || entry.employee_id === this.employeeId)
                );
                
                if (todayIndex >= 0) {
                    // Update existing entry
                    this.recentEntries[todayIndex] = { ...this.recentEntries[todayIndex], ...newRecord };
                } else {
                    // Add new entry to the beginning
                    this.recentEntries.unshift(newRecord);
                    // Keep only the most recent 10 entries
                    if (this.recentEntries.length > 10) {
                        this.recentEntries = this.recentEntries.slice(0, 10);
                    }
                }
                
                // Re-render recent entries
                this.updateRecentEntries(this.recentEntries);
                console.log('✅ Local recent entries updated');
            }
            
            // Update attendance summary if today's data is being shown
            this.updatePersonalStats(this.calculatePersonalStats(this.attendanceData));
            this.updateAttendanceSummary(this.attendanceData);
            
        } catch (error) {
            console.error('Error updating local data:', error);
        }
    }

    // === UTILITY METHODS ===

    /**
     * Show loading state
     */
    showLoading(show = true) {
        const loadingElements = document.querySelectorAll('.loading-indicator');
        loadingElements.forEach(element => {
            element.style.display = show ? 'block' : 'none';
        });
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Create toast if toast system is available
        if (typeof showToast === 'function') {
            showToast(message, type);
            return;
        }

        // Fallback: Use browser alert or console
        if (type === 'error') {
            console.error(message);
        } else {
            console.log(message);
        }

        // Try to show in a notification area
        const notificationArea = document.querySelector('.notification-area') || 
                                document.querySelector('.alerts-container') ||
                                document.querySelector('#notifications');
        
        if (notificationArea) {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.remove()">×</button>
            `;
            notificationArea.appendChild(toast);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
        }
    }

    /**
     * Show button loading state
     */
    showButtonLoading(buttonId, isLoading = true) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
            const originalText = button.textContent;
            button.dataset.originalText = originalText;
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
     * Format date for display
     */
    formatDate(dateString, format = 'YYYY-MM-DD') {
        const date = new Date(dateString);
        
        switch (format) {
            case 'DD':
                return date.getDate().toString().padStart(2, '0');
            case 'MMM':
                return date.toLocaleDateString('en-US', { month: 'short' });
            case 'MMM DD':
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            case 'YYYY-MM-DD':
            default:
                return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        }
    }

    /**
     * Convert time string to minutes
     */
    timeToMinutes(timeString) {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Convert minutes to time string
     */
    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    /**
     * Get status CSS class
     */
    getStatusClass(status) {
        switch (status) {
            case 'present': return 'status-present';
            case 'late': return 'status-late';
            case 'absent': return 'status-absent';
            case 'on-leave': return 'status-leave';
            default: return 'status-unknown';
        }
    }

    /**
     * Get status icon
     */
    getStatusIcon(status) {
        switch (status) {
            case 'present': return '✅';
            case 'late': return '⏰';
            case 'absent': return '❌';
            case 'on-leave': return '🏖️';
            default: return '❓';
        }
    }

    /**
     * Get overtime status CSS class
     */
    getOvertimeStatusClass(status) {
        switch (status) {
            case 'pending': return 'overtime-pending';
            case 'approved': return 'overtime-approved';
            case 'rejected': return 'overtime-rejected';
            default: return 'overtime-unknown';
        }
    }

    /**
     * Get overtime status icon
     */
    getOvertimeStatusIcon(status) {
        switch (status) {
            case 'pending': return '⏳';
            case 'approved': return '✅';
            case 'rejected': return '❌';
            default: return '❓';
        }
    }

    /**
     * Setup auto refresh
     */
    setupAutoRefresh() {
        // Clear existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // Setup new interval if enabled
        if (this.autoRefreshEnabled) {
            this.refreshInterval = setInterval(() => {
                this.refreshData();
            }, this.refreshIntervalTime);
            console.log(`Auto-refresh enabled: ${this.refreshIntervalTime / 1000}s interval`);
        } else {
            console.log('Auto-refresh disabled');
        }
    }

    /**
     * Handle window focus
     */
    handleWindowFocus() {
        // Refresh data when window gains focus
        this.refreshData();
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
        // Update charts if theme changes
        if (this.charts.size > 0) {
            this.initializeCharts();
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clear intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // Clear charts
        this.charts.forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts.clear();

        console.log('EmployeeController cleanup completed');
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
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM ready, EmployeeController will auto-initialize when DirectFlow is ready');
        });
    } else {
        console.log('DOM already ready, EmployeeController will auto-initialize when DirectFlow is ready');
    }
}