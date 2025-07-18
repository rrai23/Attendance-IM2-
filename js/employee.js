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

            // Initialize payroll data cards
            this.initializePayrollCards();

            // Force refresh payroll data after a short delay to ensure all data is loaded
            setTimeout(() => {
                this.refreshPayrollData();
            }, 1000);

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
            
            // Payroll Data Cards
            monthlyEarnings: document.getElementById('monthly-earnings'),
            hoursBreakdown: document.getElementById('hours-breakdown'),
            payrollSummary: document.getElementById('payroll-summary'),
            
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
        
        // Security form event listeners
        this.setupSecurityEventListeners();
    }
    
    /**
     * Setup security-related event listeners
     */
    setupSecurityEventListeners() {
        // Username change form
        const usernameForm = document.getElementById('username-form');
        if (usernameForm) {
            usernameForm.addEventListener('submit', (e) => this.handleUsernameChange(e));
        }
        
        // Password change form
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }
        
        // Additional click handler for password change button to prevent any unwanted behavior
        const passwordChangeBtn = document.getElementById('password-change-btn');
        if (passwordChangeBtn) {
            passwordChangeBtn.addEventListener('click', (e) => {
                console.log('🔧 Password change button clicked - preventing any unwanted popups');
                // Ensure no browser autofill or autocomplete interference
                const currentUser = window.directFlowAuth?.getCurrentUser?.();
                if (!currentUser) {
                    console.warn('❌ No current user found when clicking password change button');
                    e.preventDefault();
                    alert('You must be logged in to change your password');
                    return;
                }
                console.log('✅ Current user confirmed for password change:', currentUser.employee_id);
            });
        }
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
        
        console.log('📊 Calculating personal stats from', attendanceData.length, 'records');
        console.log('📊 Sample attendance record:', attendanceData[0]);
        
        // Filter current month data
        const currentMonthData = attendanceData.filter(record => {
            const recordDate = new Date(record.date || record.attendance_date || record.work_date);
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });

        console.log('📊 Current month data:', currentMonthData.length, 'records');

        // Calculate basic stats
        const totalDays = currentMonthData.length;
        const presentDays = currentMonthData.filter(r => 
            r.status === 'present' || r.status === 'late' || 
            r.attendance_status === 'present' || r.attendance_status === 'late' ||
            (r.clock_in && r.clock_out) || (r.time_in && r.time_out)
        ).length;
        const lateDays = currentMonthData.filter(r => 
            r.status === 'late' || r.attendance_status === 'late'
        ).length;
        const absentDays = currentMonthData.filter(r => 
            r.status === 'absent' || r.attendance_status === 'absent' ||
            (!r.clock_in && !r.time_in)
        ).length;
        
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
        const punctualityRate = presentDays > 0 ? ((presentDays - lateDays) / presentDays) * 100 : 0;
        
        // Enhanced hours calculation with multiple field name support
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        
        currentMonthData.forEach(record => {
            // Try different field names for regular hours
            const regularHours = parseFloat(
                record.regular_hours || 
                record.regularHours || 
                record.hours_worked ||
                record.hoursWorked ||
                record.work_hours ||
                record.total_hours ||
                this.calculateHoursFromTimes(record) ||
                0
            );
            
            // Try different field names for overtime hours
            const overtimeHours = parseFloat(
                record.overtime_hours || 
                record.overtimeHours || 
                record.ot_hours ||
                record.overtime ||
                0
            );
            
            totalRegularHours += regularHours;
            totalOvertimeHours += overtimeHours;
        });
        
        const totalHours = totalRegularHours + totalOvertimeHours;
        
        console.log('📊 Calculated hours - Regular:', totalRegularHours, 'Overtime:', totalOvertimeHours, 'Total:', totalHours);
        
        // Calculate average times with enhanced field name support
        const checkinTimes = currentMonthData
            .filter(r => r.clock_in || r.timeIn || r.time_in || r.check_in)
            .map(r => this.timeToMinutes(r.clock_in || r.timeIn || r.time_in || r.check_in));
        
        const checkoutTimes = currentMonthData
            .filter(r => r.clock_out || r.timeOut || r.time_out || r.check_out)
            .map(r => this.timeToMinutes(r.clock_out || r.timeOut || r.time_out || r.check_out));
        
        const avgCheckinTime = checkinTimes.length > 0 
            ? this.minutesToTime(checkinTimes.reduce((a, b) => a + b, 0) / checkinTimes.length)
            : '--:--';
            
        const avgCheckoutTime = checkoutTimes.length > 0
            ? this.minutesToTime(checkoutTimes.reduce((a, b) => a + b, 0) / checkoutTimes.length)
            : '--:--';

        const stats = {
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

        console.log('📊 Final calculated stats:', stats);
        return stats;
    }

    /**
     * Calculate hours worked from clock in/out times when hours not directly provided
     */
    calculateHoursFromTimes(record) {
        try {
            const clockIn = record.clock_in || record.timeIn || record.time_in || record.check_in;
            const clockOut = record.clock_out || record.timeOut || record.time_out || record.check_out;
            
            if (!clockIn || !clockOut) {
                return 0;
            }
            
            const inMinutes = this.timeToMinutes(clockIn);
            const outMinutes = this.timeToMinutes(clockOut);
            
            if (inMinutes === null || outMinutes === null) {
                return 0;
            }
            
            // Handle overnight shifts
            let totalMinutes = outMinutes - inMinutes;
            if (totalMinutes < 0) {
                totalMinutes += 24 * 60; // Add 24 hours
            }
            
            // Convert to hours and subtract lunch break (assuming 1 hour)
            const totalHours = (totalMinutes / 60);
            return totalHours > 8 ? totalHours - 1 : totalHours; // Subtract lunch if more than 8 hours
        } catch (error) {
            console.warn('Error calculating hours from times:', error);
            return 0;
        }
    }

    /**
     * Get employee hourly rate with multiple field name support
     */
    getEmployeeHourlyRate() {
        try {
            // Try different field names for hourly rate
            const rate = parseFloat(
                this.currentUser?.employee?.hourlyRate ||
                this.currentUser?.employee?.hourly_rate ||
                this.currentUser?.employee?.rate ||
                this.currentUser?.employee?.payRate ||
                this.currentUser?.employee?.pay_rate ||
                this.currentUser?.employee?.wage ||
                this.currentUser?.hourlyRate ||
                this.currentUser?.hourly_rate ||
                this.currentUser?.rate ||
                15 // Default fallback
            );
            
            console.log('💰 Employee hourly rate:', rate);
            return rate > 0 ? rate : 15; // Ensure positive rate
        } catch (error) {
            console.warn('Error getting hourly rate, using default:', error);
            return 15;
        }
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
            
            // Debug: Log the entry structure to identify field names
            console.log('📋 Entry data structure:', {
                date: entry.date,
                status: entry.status,
                fields: Object.keys(entry),
                clockIn_variants: {
                    clockIn: entry.clockIn,
                    timeIn: entry.timeIn,
                    clock_in: entry.clock_in,
                    time_in: entry.time_in,
                    check_in: entry.check_in
                },
                clockOut_variants: {
                    clockOut: entry.clockOut,
                    timeOut: entry.timeOut,
                    clock_out: entry.clock_out,
                    time_out: entry.time_out,
                    check_out: entry.check_out
                }
            });
            
            // Handle different field naming conventions with comprehensive fallbacks
            const clockIn = entry.clockIn || entry.timeIn || entry.clock_in || entry.time_in || entry.check_in;
            const clockOut = entry.clockOut || entry.timeOut || entry.clock_out || entry.time_out || entry.check_out;
            
            // Format time values properly
            const formattedClockIn = this.formatTimeValue(clockIn);
            const formattedClockOut = this.formatTimeValue(clockOut);
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
                                <span class="time-value">${formattedClockIn}</span>
                            </div>
                            <div class="time-item">
                                <span class="time-label">Out:</span>
                                <span class="time-value">${formattedClockOut}</span>
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
     * Initialize payroll data cards
     */
    initializePayrollCards() {
        console.log('Initializing payroll data cards...');

        // Render monthly earnings card
        if (this.elements.monthlyEarnings) {
            this.renderMonthlyEarnings();
        }

        // Render hours breakdown card
        if (this.elements.hoursBreakdown) {
            this.renderHoursBreakdown();
        }

        // Render payroll summary card
        if (this.elements.payrollSummary) {
            this.renderPayrollSummary();
        }
    }

    /**
     * Refresh payroll data cards with latest information
     */
    async refreshPayrollData() {
        try {
            console.log('🔄 Refreshing payroll data...');
            
            // Reload attendance data to get latest information
            await this.loadAttendanceData();
            
            // Recalculate personal stats
            if (this.attendanceData && this.attendanceData.length > 0) {
                this.personalStats = this.calculatePersonalStats(this.attendanceData);
                console.log('📊 Updated personal stats:', this.personalStats);
            }
            
            // Re-render all payroll cards
            this.initializePayrollCards();
            
            console.log('✅ Payroll data refreshed successfully');
        } catch (error) {
            console.error('❌ Error refreshing payroll data:', error);
        }
    }

    /**
     * Render monthly earnings card
     */
    renderMonthlyEarnings() {
        const container = this.elements.monthlyEarnings;
        if (!container) {
            console.warn('⚠️ Monthly earnings container not found');
            return;
        }

        console.log('📊 Rendering monthly earnings...');
        console.log('📊 Current attendance data:', this.attendanceData?.length || 0, 'records');
        console.log('📊 Current user data:', this.currentUser?.employee);

        // Ensure we have personal stats or provide defaults
        if (!this.personalStats || !this.personalStats.hours) {
            console.warn('⚠️ Personal stats not available, calculating from attendance data...');
            if (this.attendanceData && this.attendanceData.length > 0) {
                this.personalStats = this.calculatePersonalStats(this.attendanceData);
            } else {
                // Provide default stats structure
                this.personalStats = {
                    hours: {
                        totalRegularHours: 0,
                        totalOvertimeHours: 0,
                        totalHours: 0,
                        avgDailyHours: 0
                    }
                };
            }
        }

        const stats = this.personalStats.hours;
        
        // Enhanced hourly rate retrieval with multiple field support
        const hourlyRate = this.getEmployeeHourlyRate();
        const overtimeRate = hourlyRate * 1.5;

        // Calculate earnings with safe defaults
        const regularPay = (stats.totalRegularHours || 0) * hourlyRate;
        const overtimePay = (stats.totalOvertimeHours || 0) * overtimeRate;
        const totalEarnings = regularPay + overtimePay;

        console.log('📊 Earnings calculation:', { 
            regularHours: stats.totalRegularHours,
            overtimeHours: stats.totalOvertimeHours,
            hourlyRate,
            regularPay,
            overtimePay,
            totalEarnings
        });

        container.innerHTML = `
            <div class="earnings-card">
                <div class="earnings-total">$${totalEarnings.toFixed(2)}</div>
                <div class="earnings-label">Monthly Earnings</div>
                <div class="earnings-breakdown">
                    <div class="breakdown-item">
                        <div class="breakdown-value">$${regularPay.toFixed(2)}</div>
                        <div class="breakdown-label">Regular Pay</div>
                    </div>
                    <div class="breakdown-item">
                        <div class="breakdown-value">$${overtimePay.toFixed(2)}</div>
                        <div class="breakdown-label">Overtime Pay</div>
                    </div>
                    <div class="breakdown-item">
                        <div class="breakdown-value">${(stats.totalHours || 0).toFixed(1)}h</div>
                        <div class="breakdown-label">Total Hours</div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('✅ Monthly earnings rendered successfully');
    }

    /**
     * Render hours breakdown card
     */
    renderHoursBreakdown() {
        const container = this.elements.hoursBreakdown;
        if (!container) {
            console.warn('⚠️ Hours breakdown container not found');
            return;
        }

        console.log('📊 Rendering hours breakdown...');

        // Ensure we have personal stats or provide defaults
        if (!this.personalStats || !this.personalStats.hours) {
            console.warn('⚠️ Personal stats not available for hours breakdown, using defaults...');
            if (this.attendanceData && this.attendanceData.length > 0) {
                this.personalStats = this.calculatePersonalStats(this.attendanceData);
            } else {
                this.personalStats = {
                    hours: {
                        totalRegularHours: 0,
                        totalOvertimeHours: 0,
                        totalHours: 0,
                        avgDailyHours: 0
                    }
                };
            }
        }

        const stats = this.personalStats.hours;
        
        // Enhanced hourly rate retrieval
        const hourlyRate = this.getEmployeeHourlyRate();
        const overtimeRate = hourlyRate * 1.5;

        container.innerHTML = `
            <div class="pay-breakdown">
                <div class="pay-row regular">
                    <div class="pay-description">
                        <div class="pay-type">Regular Hours</div>
                        <div class="pay-details">${(stats.totalRegularHours || 0).toFixed(1)}h @ $${hourlyRate.toFixed(2)}/hr</div>
                    </div>
                    <div class="pay-amount">$${((stats.totalRegularHours || 0) * hourlyRate).toFixed(2)}</div>
                </div>
                <div class="pay-row overtime">
                    <div class="pay-description">
                        <div class="pay-type">Overtime Hours</div>
                        <div class="pay-details">${(stats.totalOvertimeHours || 0).toFixed(1)}h @ $${overtimeRate.toFixed(2)}/hr</div>
                    </div>
                    <div class="pay-amount">$${((stats.totalOvertimeHours || 0) * overtimeRate).toFixed(2)}</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-value">${(stats.avgDailyHours || 0).toFixed(1)}h</div>
                    <div class="breakdown-label">Avg Daily Hours</div>
                </div>
            </div>
        `;
        
        console.log('✅ Hours breakdown rendered successfully');
    }

    /**
     * Render payroll summary card
     */
    renderPayrollSummary() {
        const container = this.elements.payrollSummary;
        if (!container) {
            console.warn('⚠️ Payroll summary container not found');
            return;
        }

        console.log('📊 Rendering payroll summary...');

        // Ensure we have personal stats or provide defaults
        if (!this.personalStats || !this.personalStats.hours || !this.personalStats.currentMonth) {
            console.warn('⚠️ Personal stats not available for payroll summary, using defaults...');
            if (this.attendanceData && this.attendanceData.length > 0) {
                this.personalStats = this.calculatePersonalStats(this.attendanceData);
            } else {
                this.personalStats = {
                    hours: {
                        totalRegularHours: 0,
                        totalOvertimeHours: 0,
                        totalHours: 0,
                        avgDailyHours: 0
                    },
                    currentMonth: {
                        totalDays: 0,
                        presentDays: 0,
                        lateDays: 0,
                        absentDays: 0,
                        attendanceRate: 0,
                        punctualityRate: 0
                    }
                };
            }
        }

        const stats = this.personalStats;
        
        // Enhanced hourly rate retrieval
        const hourlyRate = this.getEmployeeHourlyRate();
        
        // Calculate monthly projection (assuming 22 working days)
        const workingDaysInMonth = 22;
        const totalDays = stats.currentMonth.totalDays || 1; // Avoid division by zero
        const totalHours = stats.hours.totalHours || 0;
        const avgDailyEarnings = totalDays > 0 ? (totalHours * hourlyRate) / totalDays : 0;
        const monthlyProjection = avgDailyEarnings * workingDaysInMonth;

        container.innerHTML = `
            <div class="summary-stats">
                <div class="summary-stat">
                    <div class="stat-number">${stats.currentMonth.totalDays}</div>
                    <div class="stat-description">Days Worked</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-number">$${hourlyRate.toFixed(2)}</div>
                    <div class="stat-description">Hourly Rate</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-number">${stats.currentMonth.attendanceRate}%</div>
                    <div class="stat-description">Attendance Rate</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-number">$${monthlyProjection.toFixed(0)}</div>
                    <div class="stat-description">Monthly Projection</div>
                </div>
            </div>
            <div class="projection-note">
                <p><strong>Note:</strong> Monthly projection based on current attendance and hourly rate for ${workingDaysInMonth} working days.</p>
            </div>
        `;
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
            this.updatePayrollCards();
            
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
            this.updatePayrollCards();
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
     * Update all payroll cards with new data
     */
    updatePayrollCards() {
        console.log('Updating payroll cards with new data...');

        // Re-render all payroll cards with updated data
        this.renderMonthlyEarnings();
        this.renderHoursBreakdown();
        this.renderPayrollSummary();
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
        // Update payroll cards for theme change
        this.updatePayrollCards();
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
     * Format time value for display
     */
    formatTimeValue(timeValue) {
        if (!timeValue || timeValue === '' || timeValue === null || timeValue === undefined) {
            return '--:--';
        }
        
        // If it's already in HH:MM format, return as is
        if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeValue)) {
            // Convert HH:MM:SS to HH:MM if needed
            return timeValue.split(':').slice(0, 2).join(':');
        }
        
        // If it's a Date object or timestamp
        if (timeValue instanceof Date || (!isNaN(Date.parse(timeValue)))) {
            const date = new Date(timeValue);
            return date.toTimeString().slice(0, 5); // HH:MM format
        }
        
        // Return as is if we can't format it
        return String(timeValue);
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
     * Show success state on a card
     */
    showCardSuccess(formId, message, duration = 3000) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Find the parent tile/card element
        const card = form.closest('.tile');
        if (!card) return;

        // Store original state
        const originalClassName = card.className;
        const originalBorder = card.style.border;
        const originalBackground = card.style.background;
        const originalPosition = card.style.position;

        // Make card relative positioned for overlay
        card.style.position = 'relative';

        // Add success styling
        card.style.border = '2px solid #28a745';
        card.style.background = 'linear-gradient(135deg, #d4edda 0%, #f8f9fa 100%)';
        card.classList.add('success-state');

        // Create overlay success indicator
        let successOverlay = card.querySelector('.success-overlay');
        if (!successOverlay) {
            successOverlay = document.createElement('div');
            successOverlay.className = 'success-overlay';
            successOverlay.innerHTML = `
                <div class="success-message">
                    <span style="font-size: 20px;">✅</span>
                    <span>${message}</span>
                </div>
            `;
            card.appendChild(successOverlay);
        } else {
            successOverlay.innerHTML = `
                <div class="success-message">
                    <span style="font-size: 20px;">✅</span>
                    <span>${message}</span>
                </div>
            `;
        }

        // Remove success state after duration
        setTimeout(() => {
            card.className = originalClassName;
            card.style.border = originalBorder;
            card.style.background = originalBackground;
            card.style.position = originalPosition;
            if (successOverlay) {
                successOverlay.remove();
            }
        }, duration);
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
        // Update payroll cards if theme changes
        this.initializePayrollCards();
    }
    
    // === SECURITY METHODS ===
    
    /**
     * Load security information for current user
     */
    async loadSecurityInfo() {
        try {
            console.log('Loading security information...');
            
            // Update current username field
            const currentUsernameInput = document.getElementById('current-username');
            if (currentUsernameInput && this.currentUser) {
                currentUsernameInput.value = this.currentUser.username || this.currentUser.employee_id || '';
            }
            
            // Load account information from backend
            if (this.currentUser && this.currentUser.employee_id) {
                const response = await this.apiRequest(`accounts/${this.currentUser.employee_id}`);
                
                if (response.success && response.data && response.data.account) {
                    const account = response.data.account;
                    
                    // Update account created date
                    const accountCreatedElement = document.getElementById('account-created');
                    if (accountCreatedElement && account.created_at) {
                        accountCreatedElement.textContent = new Date(account.created_at).toLocaleDateString();
                    }
                    
                    // Update last login info if available
                    const lastLoginElement = document.getElementById('last-login');
                    if (lastLoginElement && account.last_login) {
                        lastLoginElement.textContent = new Date(account.last_login).toLocaleDateString();
                    }
                }
            }
            
            console.log('Security information loaded successfully');
            
        } catch (error) {
            console.error('Failed to load security info:', error);
        }
    }
    
    /**
     * Handle username change form submission
     */
    async handleUsernameChange(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            const newUsername = formData.get('new-username');
            const confirmPassword = formData.get('confirm-password-username');
            
            // Debug logging
            console.log('🔧 Username change debug:');
            console.log('- Raw newUsername:', newUsername);
            console.log('- Trimmed newUsername:', newUsername ? newUsername.trim() : 'null');
            console.log('- Trimmed length:', newUsername ? newUsername.trim().length : 0);
            console.log('- Has confirmPassword:', !!confirmPassword);
            
            // Validation
            if (!newUsername || newUsername.trim().length < 3) {
                console.error('❌ Username validation failed - length:', newUsername ? newUsername.trim().length : 0);
                this.showError('Username must be at least 3 characters long');
                return;
            }
            
            if (!confirmPassword) {
                this.showError('Please enter your current password to confirm');
                return;
            }
            
            if (confirmPassword.length < 6) {
                this.showError('Password confirmation appears to be too short');
                return;
            }
            
            if (!this.currentUser || !this.currentUser.employee_id) {
                this.showError('User information not available');
                return;
            }
            
            this.showButtonLoading('username-change-btn', true);
            
            // Make API request to change username
            const response = await this.apiRequest(`accounts/${this.currentUser.employee_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: newUsername.trim(),
                    currentPassword: confirmPassword
                })
            });
            
            console.log('Username change API response:', response);
            
            if (response.success) {
                this.showSuccess('Username updated successfully!');
                
                // Show visual success feedback on the card
                this.showCardSuccess('username-form', 'Username updated successfully!');
                
                // Update current user data
                if (this.currentUser) {
                    this.currentUser.username = newUsername.trim();
                }
                
                // Clear form
                event.target.reset();
                
                // Refresh security info with a small delay to ensure DOM is ready
                setTimeout(async () => {
                    await this.loadSecurityInfo();
                }, 100);
                
            } else {
                // Handle specific error cases
                if (response.message && response.message.toLowerCase().includes('password')) {
                    this.showError('Incorrect current password. Please try again.');
                } else if (response.message && response.message.toLowerCase().includes('unauthorized')) {
                    this.showError('Authentication failed. Please check your current password.');
                } else {
                    this.showError(response.message || 'Failed to update username. Please verify your current password.');
                }
            }
            
        } catch (error) {
            console.error('Username change error:', error);
            
            // Handle specific error types
            if (error.message && error.message.includes('401')) {
                this.showError('Authentication failed. Please check your current password.');
            } else if (error.message && error.message.includes('403')) {
                this.showError('Access denied. Please verify your current password.');
            } else {
                this.showError('Failed to update username. Please check your internet connection and try again.');
            }
        } finally {
            this.showButtonLoading('username-change-btn', false);
        }
    }
    
    /**
     * Handle password change form submission
     */
    async handlePasswordChange(event) {
        console.log('🔧 Password change form submitted');
        event.preventDefault();
        event.stopPropagation();
        
        try {
            const formData = new FormData(event.target);
            const currentPassword = formData.get('current-password');
            const newPassword = formData.get('new-password');
            const confirmPassword = formData.get('confirm-password');
            
            console.log('🔧 Form data extracted:', {
                currentPasswordLength: currentPassword ? currentPassword.length : 0,
                newPasswordLength: newPassword ? newPassword.length : 0,
                confirmPasswordLength: confirmPassword ? confirmPassword.length : 0
            });
            
            // Validation
            if (!currentPassword) {
                console.log('❌ Current password missing');
                this.showError('Please enter your current password');
                return;
            }
            
            if (!newPassword || newPassword.length < 6) {
                console.log('❌ New password validation failed');
                this.showError('New password must be at least 6 characters long');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                console.log('❌ Password confirmation mismatch');
                this.showError('New passwords do not match');
                return;
            }
            
            if (!this.currentUser || !this.currentUser.employee_id) {
                console.log('❌ User information not available');
                console.log('🔧 Current user object:', this.currentUser);
                console.log('🔧 Available properties:', this.currentUser ? Object.keys(this.currentUser) : 'null');
                this.showError('User information not available');
                return;
            }
            
            console.log('✅ Validation passed, making API request...');
            console.log('🔧 Using employee ID:', this.currentUser.employee_id);
            this.showButtonLoading('password-change-btn', true);
            
            // Make API request to change password
            const response = await this.apiRequest(`accounts/${this.currentUser.employee_id}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });
            
            console.log('🔧 API Response:', response);
            
            if (response.success) {
                console.log('✅ Password change successful');
                this.showSuccess('Password updated successfully! You will need to log in again.');
                
                // Show visual success feedback on the card
                this.showCardSuccess('password-form', 'Password updated successfully!');
                
                // Clear form
                event.target.reset();
                
                // Show logout message and redirect after a delay
                setTimeout(() => {
                    if (window.directFlowAuth && typeof window.directFlowAuth.logout === 'function') {
                        window.directFlowAuth.logout();
                    } else {
                        window.location.href = '/login.html';
                    }
                }, 2000);
                
            } else {
                console.log('❌ Password change failed:', response.message);
                this.showError(response.message || 'Failed to update password');
            }
            
        } catch (error) {
            console.error('Password change error:', error);
            
            // Handle specific error types
            if (error.message && error.message.includes('401')) {
                this.showError('Authentication failed. Please check your current password.');
            } else if (error.message && error.message.includes('403')) {
                this.showError('Access denied. Please verify your current password.');
            } else if (error.message && error.message.includes('400')) {
                this.showError('Current password is incorrect. Please try again.');
            } else {
                this.showError('Failed to update password. Please check your internet connection and try again.');
            }
        } finally {
            this.showButtonLoading('password-change-btn', false);
        }
    }
    
    /**
     * Make authenticated API request
     */
    async apiRequest(endpoint, options = {}) {
        try {
            const authService = this.getAuthService();
            if (!authService || !authService.isAuthenticated()) {
                throw new Error('Not authenticated');
            }
            
            const token = authService.getToken();
            if (!token) {
                throw new Error('No authentication token available');
            }
            
            const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                // Try to get error message from response body
                let errorMessage = `API request failed: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (parseError) {
                    // If JSON parsing fails, use default message
                }
                
                if (response.status === 401) {
                    // Token expired or invalid
                    if (authService.logout) {
                        authService.logout();
                    }
                    throw new Error('Authentication failed - please log in again');
                } else if (response.status === 403) {
                    throw new Error(errorMessage || 'Access denied - incorrect password');
                } else if (response.status === 400) {
                    throw new Error(errorMessage || 'Invalid request - please check your input');
                }
                
                throw new Error(errorMessage);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }
    
    /**
     * Navigate to a specific section (called from sidebar)
     */
    navigateToSection(section) {
        console.log('🧭 Navigating to section:', section);
        
        if (section === 'security') {
            // Hide main content sections
            const pageHeader = document.querySelector('.page-header');
            const quickActions = document.querySelector('.quick-actions');
            const tilesGrids = document.querySelectorAll('.tiles-grid');
            const chartsSection = document.querySelector('.charts-section');
            const securitySection = document.getElementById('security-section');
            
            // Hide main sections immediately
            if (pageHeader) pageHeader.style.display = 'none';
            if (quickActions) quickActions.style.display = 'none';
            
            tilesGrids.forEach(grid => {
                if (grid && !grid.closest('#security-section')) {
                    grid.style.display = 'none';
                }
            });
            
            if (chartsSection) chartsSection.style.display = 'none';
            
            // Show security section
            if (securitySection) {
                securitySection.style.display = 'block';
                this.loadSecurityInfo();
            }
            
            console.log('✅ Security section activated');
            
        } else {
            // Show main sections for default view
            const pageHeader = document.querySelector('.page-header');
            const quickActions = document.querySelector('.quick-actions');
            const tilesGrids = document.querySelectorAll('.tiles-grid');
            const chartsSection = document.querySelector('.charts-section');
            const securitySection = document.getElementById('security-section');
            
            if (pageHeader) pageHeader.style.display = 'block';
            if (quickActions) quickActions.style.display = 'block';
            
            tilesGrids.forEach(grid => {
                if (grid && !grid.closest('#security-section')) {
                    grid.style.display = 'block';
                }
            });
            
            if (chartsSection) chartsSection.style.display = 'block';
            
            // Hide security section
            if (securitySection) {
                securitySection.style.display = 'none';
            }
            
            console.log('✅ Attendance section activated');
        }
        
        // Update URL hash without triggering navigation
        if (section === 'security') {
            history.replaceState(null, null, '#security');
        } else {
            history.replaceState(null, null, '#');
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
    // Also create employeePage object for navigation compatibility
    window.employeePage = employeeController;
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