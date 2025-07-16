/**
 * Dashboard Page Controller for Bricks Attendance System
 * Handles dashboard functionality including statistics, calendar, charts, and payday countdown
 */

class DashboardController {
    constructor() {
        this.isInitialized = false;
        this.refreshInterval = null;
        this.countdownInterval = null;
        this.calendar = null;
        this.charts = new Map();
        this.currentStats = null;
        this.paydayData = null;
        
        // Initialize data object for storing all dashboard data
        this.data = {
            attendanceStats: null,
            employees: null,
            attendanceRecords: null
        };
        
        // Configuration
        this.config = {
            refreshRate: 30000, // 30 seconds
            countdownUpdateRate: 1000, // 1 second
            animationDuration: 300,
            chartUpdateDelay: 500
        };

        // Tile configurations
        this.tiles = {
            attendanceCount: {
                id: 'attendance-count-tile',
                title: 'Today\'s Attendance',
                refreshable: true
            },
            attendanceChart: {
                id: 'attendance-chart-tile',
                title: 'Attendance Statistics',
                refreshable: true
            },
            departmentStatus: {
                id: 'department-status-tile',
                title: 'Department Status',
                refreshable: true
            },
            recentActivity: {
                id: 'recent-activity-tile',
                title: 'Recent Activity',
                refreshable: true
            },
            calendar: {
                id: 'calendar-tile',
                title: 'Calendar & Notes',
                refreshable: false
            },
            paydayCountdown: {
                id: 'payday-countdown-tile',
                title: 'Next Payday',
                refreshable: true
            }
        };

        this.init();
    }

    /**
     * Initialize the dashboard controller
     */
    async init() {
        try {
            await this.waitForDependencies();
            this.setupEventListeners();
            await this.loadInitialData();
            this.renderTiles();
            this.initializeComponents();
            this.startAutoRefresh();
            this.isInitialized = true;
            
            console.log('Dashboard controller initialized successfully');
        } catch (error) {
            console.error('Failed to initialize dashboard controller:', error);
            this.showErrorState();
        }
    }

    /**
     * Wait for required dependencies to be available
     */
    async waitForDependencies() {
        const maxWait = 20000; // Increased to 20 seconds
        const checkInterval = 500; // Increased to 500ms for better stability
        let waited = 0;

        return new Promise((resolve, reject) => {
            // Set up event listener for DirectFlow initialization
            const directFlowInitListener = () => {
                console.log('📡 DirectFlow initialization event received');
                checkDependencies();
            };
            
            // Add event listener for DirectFlow initialization
            if (window.directFlow) {
                window.directFlow.addEventListener('initialized', directFlowInitListener);
            } else {
                // Listen for DirectFlow to be created
                const directFlowCreatedListener = () => {
                    console.log('📡 DirectFlow object created');
                    window.directFlow.addEventListener('initialized', directFlowInitListener);
                };
                
                // Check periodically for DirectFlow creation
                const checkForDirectFlow = setInterval(() => {
                    if (window.directFlow) {
                        clearInterval(checkForDirectFlow);
                        window.directFlow.addEventListener('initialized', directFlowInitListener);
                        checkDependencies();
                    }
                }, 100);
            }
            
            const checkDependencies = () => {
                const dependencies = {
                    // Check for DirectFlow (primary data manager)
                    directFlow: typeof window.directFlow !== 'undefined' && window.directFlow.initialized,
                    // Other dependencies
                    chartsManager: typeof chartsManager !== 'undefined' || typeof window.chartsManager !== 'undefined',
                    DashboardCalendar: typeof DashboardCalendar !== 'undefined',
                    ApexCharts: typeof ApexCharts !== 'undefined'
                };
                
                console.log('DashboardController checking dependencies...', dependencies);
                console.log('window.directFlow:', window.directFlow ? 'exists' : 'undefined');
                console.log('DirectFlow.initialized:', window.directFlow?.initialized);
                console.log(`Waited: ${waited}ms / ${maxWait}ms`);
                
                if (dependencies.directFlow && dependencies.DashboardCalendar && dependencies.ApexCharts) {
                    console.log('✅ Core dependencies available - proceeding with dashboard initialization');
                    // Remove event listener
                    if (window.directFlow) {
                        window.directFlow.removeEventListener('initialized', directFlowInitListener);
                    }
                    resolve();
                    return true;
                } else if (waited >= maxWait) {
                    console.warn('⚠️ Dependencies not available after timeout:', dependencies);
                    
                    // Remove event listener
                    if (window.directFlow) {
                        window.directFlow.removeEventListener('initialized', directFlowInitListener);
                    }
                    
                    // Check if DirectFlow exists but isn't initialized (likely authentication issue)
                    if (window.directFlow && !window.directFlow.initialized) {
                        console.error('❌ DirectFlow exists but not initialized - authentication required');
                        window.location.href = '/login.html';
                        return true;
                    }
                    
                    // Try to proceed with minimal functionality
                    if (dependencies.directFlow) {
                        console.log('📊 Proceeding with minimal functionality (no charts)');
                        resolve();
                    } else {
                        reject(new Error('Critical dependencies missing: DirectFlow not available'));
                    }
                    return true;
                }
                return false;
            };
            
            const check = () => {
                if (!checkDependencies()) {
                    waited += checkInterval;
                    setTimeout(check, checkInterval);
                }
            };
            
            // Start checking immediately
            check();
        });
    }

    /**
     * Setup event listeners for dashboard interactions
     */
    setupEventListeners() {
        // Listen for DirectFlow updates
        if (window.directFlow) {
            console.log('[DATA SYNC] Dashboard setting up DirectFlow event listeners');
            
            window.directFlow.addEventListener('attendanceUpdate', (data) => {
                console.log('[DATA SYNC] Dashboard received attendance update from DirectFlow:', data);
                this.handleDataUpdate();
            });
            
            window.directFlow.addEventListener('employeeUpdate', (data) => {
                console.log('[DATA SYNC] Dashboard received employee update from DirectFlow:', data);
                this.handleDataUpdate();
            });
            
            window.directFlow.addEventListener('employeeDeleted', (data) => {
                console.log('[DATA SYNC] Dashboard received employee deletion from DirectFlow:', data);
                this.handleDataUpdate();
            });
            
            window.directFlow.addEventListener('employeeAdded', (data) => {
                console.log('[DATA SYNC] Dashboard received employee addition from DirectFlow:', data);
                this.handleDataUpdate();
            });
            
            window.directFlow.addEventListener('dataSync', (data) => {
                console.log('[DATA SYNC] Dashboard received data sync from DirectFlow:', data);
                if (data && (data.action === 'delete' || data.action === 'add' || data.action === 'update' || data.action === 'forceCleanup')) {
                    this.handleDataUpdate();
                }
            });
            
            // Listen for system-wide broadcasts
            document.addEventListener('bricksSystemUpdate', (event) => {
                const { type, data } = event.detail;
                console.log('[DATA SYNC] Dashboard received system update:', type, data);
                if (type.includes('employee') || type.includes('Employee') || type.includes('attendance') || type.includes('Attendance')) {
                    this.handleDataUpdate();
                }
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshDashboard();
            });
        }

        // Tile minimize/maximize handlers
        this.setupTileEventListeners();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Visibility change handler for pause/resume
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoRefresh();
            } else {
                this.resumeAutoRefresh();
            }
        });
    }

    /**
     * Handle data updates from any data source (unified service, data manager, etc.)
     */
    async handleDataUpdate() {
        try {
            console.log('Dashboard handling data update');
            
            // Reload all data
            await this.loadAttendanceStats();
            await this.loadPaydayData();
            
            // Update UI components
            this.updateQuickStats();
            this.updateAttendanceCountTile();
            this.updateCharts();
            this.updatePaydayCountdown();
            
            console.log('Dashboard data update complete');
        } catch (error) {
            console.error('Error handling data update:', error);
        }
    }

    /**
     * Load initial data for dashboard
     */
    async loadInitialData() {
        try {
            // Load attendance statistics
            await this.loadAttendanceStats();
            
            // Load payday information
            await this.loadPaydayData();
            
            // Update quick stats after loading data
            this.updateQuickStats();
            
            // Note: Chart will be initialized after tiles are rendered
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            throw error;
        }
    }

    /**
     * Load attendance statistics
     */
    async loadAttendanceStats() {
        try {
            // Ensure data object is initialized
            if (!this.data) {
                this.data = {
                    attendanceStats: null,
                    employees: null,
                    attendanceRecords: null
                };
            }
            
            // Use DirectFlow for all data operations
            if (window.directFlow && window.directFlow.initialized) {
                console.log('Loading attendance stats from DirectFlow');
                
                // Get attendance stats directly from backend (this uses server's "today" calculation)
                this.currentStats = await window.directFlow.getAttendanceStats();
                console.log('Received stats from DirectFlow:', this.currentStats);
                
                // Store in data object for attendance overview
                this.data.attendanceStats = this.currentStats;
                
                // Update attendance overview with new data
                this.populateAttendanceOverview();
                
                console.log('Dashboard loaded stats from DirectFlow:', this.currentStats);
            } else {
                console.error('DirectFlow not available for loading attendance stats');
                this.currentStats = this.getDefaultStats();
                this.data.attendanceStats = this.currentStats;
            }
            
        } catch (error) {
            console.error('Error loading attendance stats:', error);
            this.currentStats = this.getDefaultStats();
            if (this.data) {
                this.data.attendanceStats = this.currentStats;
            }
        }
    }

    /**
     * Process today's attendance data
     */
    async processTodayAttendance(records) {
        try {
            // Get total number of active employees using DirectFlow
            let totalEmployees = 0;
            
            if (window.directFlow && window.directFlow.initialized) {
                // Use DirectFlow for consistent data access
                const employees = await window.directFlow.getEmployees();
                totalEmployees = employees.filter(emp => emp.status === 'active').length;
                console.log('[DATA INTEGRITY] Dashboard using DirectFlow for employee count:', totalEmployees);
            } else {
                // Fallback: assume a reasonable number if we can't get the actual count
                totalEmployees = Math.max(6, records.length);
                console.warn('[DATA INTEGRITY] Dashboard using fallback employee count:', totalEmployees);
            }
            
            let present = 0;
            let late = 0;
            let absent = 0;

            // Count attendance statuses
            records.forEach(record => {
                switch(record.status) {
                    case 'present':
                        present++;
                        break;
                    case 'late':
                    case 'tardy':
                        late++;
                        break;
                    case 'absent':
                        absent++;
                        break;
                    default:
                        // If status is unclear, assume present if they have a timeIn
                        if (record.timeIn) {
                            present++;
                        } else {
                            absent++;
                        }
                }
            });

            // If we have fewer records than employees, the missing ones are considered absent
            const recordedEmployees = records.length;
            if (recordedEmployees < totalEmployees) {
                absent += (totalEmployees - recordedEmployees);
            }

            const attendanceRate = totalEmployees > 0 ? ((present + late) / totalEmployees) * 100 : 0;

            console.log('Processed today\'s attendance:', {
                totalEmployees,
                present,
                late,
                absent,
                attendanceRate,
                recordsProcessed: records.length
            });

            return {
                total: totalEmployees,
                present,
                late,
                absent,
                attendanceRate: Math.round(attendanceRate * 10) / 10,
                dataFullyLoaded: true  // 🎯 Mark that attendance data is fully processed
            };
        } catch (error) {
            console.error('Error processing today\'s attendance:', error);
            return {
                total: 0,
                present: 0,
                late: 0,
                absent: 0,
                attendanceRate: 0,
                dataFullyLoaded: false  // 🎯 Mark that data failed to load
            };
        }
    }

    /**
     * Load payday data
     */
    async loadPaydayData() {
        try {
            // Use DirectFlow for payday data
            if (window.directFlow && window.directFlow.initialized) {
                console.log('Loading payday data from DirectFlow');
                this.paydayData = await window.directFlow.getNextPayday();
            } else {
                console.error('DirectFlow not available for loading payday data');
                this.paydayData = this.getDefaultPaydayData();
            }
        } catch (error) {
            console.error('Error loading payday data:', error);
            this.paydayData = this.getDefaultPaydayData();
        }
    }

    /**
     * Get default statistics for error states
     */
    getDefaultStats() {
        return {
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
            total: 0,
            totalHours: 0,
            averageHours: 0,
            today: {
                present: 0,
                absent: 0,
                late: 0,
                leave: 0,
                dataFullyLoaded: false  // 🎯 Default stats are not fully loaded
            },
            weekly: {
                days: [],
                counts: []
            },
            monthly: {
                days: [],
                counts: []
            }
        };
    }

    /**
     * Get default payday data
     */
    getDefaultPaydayData() {
        const today = new Date();
        // Set the next payday to 15 days from now
        const nextPayday = new Date(today);
        nextPayday.setDate(today.getDate() + 15);
        
        return {
            nextPayday: nextPayday.toISOString().split('T')[0],
            frequency: 'biweekly',
            daysRemaining: 15,
            hoursRemaining: 15 * 24,
            lastPayday: new Date(today.setDate(today.getDate() - 15)).toISOString().split('T')[0]
        };
    }

    /**
     * Render all dashboard tiles
     */
    renderTiles() {
        this.renderAttendanceCountTile();
        this.renderAttendanceChartTile();
        this.renderDepartmentStatusTile();
        this.renderRecentActivityTile();
        this.renderCalendarTile();
        this.renderPaydayCountdownTile();
    }

    /**
     * Render attendance count tile
     */
    renderAttendanceCountTile() {
        const tile = document.getElementById(this.tiles.attendanceCount.id);
        if (!tile) return;

        // Use backend stats directly
        const stats = this.currentStats || this.getDefaultStats();
        
        // Ensure all values are numbers, not objects
        const present = Number(stats.present) || 0;
        const late = Number(stats.late) || 0;
        const absent = Number(stats.absent) || 0;
        const total = Number(stats.total) || 0;
        const attendanceRate = Number(stats.attendanceRate) || 0;
        
        console.log('Rendering attendance count tile with values:', { present, late, absent, total, attendanceRate });
        
        tile.innerHTML = `
            <div class="tile-header">
                <h3 class="tile-title">${this.tiles.attendanceCount.title}</h3>
                <button class="tile-refresh-btn" title="Refresh data">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"></polyline>
                        <polyline points="1,20 1,14 7,14"></polyline>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                    </svg>
                </button>
            </div>
            <div class="tile-content">
                <div class="attendance-overview">
                    <div class="attendance-main-stat">
                        <div class="stat-number">${present + late}</div>
                        <div class="stat-label">Present Today</div>
                        <div class="stat-sublabel">out of ${total} employees</div>
                    </div>
                    <div class="attendance-rate">
                        <div class="rate-circle" data-rate="${attendanceRate}">
                            <svg viewBox="0 0 36 36" class="circular-chart">
                                <path class="circle-bg" d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path class="circle" stroke-dasharray="${attendanceRate}, 100" d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <text x="18" y="20.35" class="percentage">${attendanceRate}%</text>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="attendance-breakdown">
                    <div class="breakdown-item present">
                        <span class="breakdown-dot"></span>
                        <span class="breakdown-label">On Time</span>
                        <span class="breakdown-value">${present}</span>
                    </div>
                    <div class="breakdown-item late">
                        <span class="breakdown-dot"></span>
                        <span class="breakdown-label">Late</span>
                        <span class="breakdown-value">${late}</span>
                    </div>
                    <div class="breakdown-item absent">
                        <span class="breakdown-dot"></span>
                        <span class="breakdown-label">Absent</span>
                        <span class="breakdown-value">${absent}</span>
                    </div>
                </div>
            </div>
        `;

        // Animate the circular progress
        setTimeout(() => {
            this.animateCircularProgress(tile.querySelector('.rate-circle'));
        }, 100);
    }

    /**
     * Render attendance overview tile
     */
    renderAttendanceChartTile() {
        const tile = document.getElementById(this.tiles.attendanceChart.id);
        if (!tile) return;

        // The HTML structure is already in the dashboard.html, now populate it with data
        this.populateAttendanceOverview();
    }

    /**
     * Populate attendance overview with real data
     */
    populateAttendanceOverview() {
        try {
            // Safety check to ensure data object exists
            if (!this.data) {
                console.warn('Data object not initialized, skipping attendance overview population');
                return;
            }
            
            // Get the attendance stats from the loaded data
            const stats = this.data.attendanceStats || {};
            
            // Update key metrics
            this.updateMetric('total-employees', stats.totalEmployees || 0);
            this.updateMetric('present-today', stats.presentToday || 0);
            this.updateMetric('late-arrivals', stats.lateToday || 0);
            
            // Calculate attendance rate
            const attendanceRate = stats.totalEmployees > 0 ? 
                Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0;
            this.updateMetric('attendance-rate', `${attendanceRate}%`);
            
            // Update department breakdown in both overview and separate tile
            this.updateDepartmentBreakdown(stats);
            
            // Update recent activity in both overview and separate tile
            this.updateRecentActivity(stats);
            
        } catch (error) {
            console.error('Error populating attendance overview:', error);
            this.showOverviewError();
        }
    }

    /**
     * Update a metric display
     */
    updateMetric(metricId, value) {
        const element = document.getElementById(metricId);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Update department breakdown
     */
    updateDepartmentBreakdown(stats) {
        const departmentList = document.getElementById('department-breakdown');
        if (!departmentList) return;

        // Sample department data - in real app, this would come from API
        const departments = [
            { name: 'Engineering', present: Math.floor((stats.presentToday || 0) * 0.4), total: Math.floor((stats.totalEmployees || 0) * 0.35) },
            { name: 'Sales', present: Math.floor((stats.presentToday || 0) * 0.3), total: Math.floor((stats.totalEmployees || 0) * 0.25) },
            { name: 'Marketing', present: Math.floor((stats.presentToday || 0) * 0.2), total: Math.floor((stats.totalEmployees || 0) * 0.2) },
            { name: 'HR', present: Math.floor((stats.presentToday || 0) * 0.1), total: Math.floor((stats.totalEmployees || 0) * 0.2) }
        ];

        departmentList.innerHTML = departments.map(dept => {
            const percentage = dept.total > 0 ? Math.round((dept.present / dept.total) * 100) : 0;
            return `
                <div class="department-item">
                    <div class="department-info">
                        <span class="department-name">${dept.name}</span>
                        <span class="department-stats">${dept.present}/${dept.total}</span>
                    </div>
                    <div class="department-progress">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                    </div>
                    <span class="department-percentage">${percentage}%</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Update recent activity
     */
    updateRecentActivity(stats) {
        const activityList = document.getElementById('recent-activity');
        if (!activityList) return;

        // Sample recent activity data - in real app, this would come from API
        const activities = [
            { name: 'John Smith', action: 'Checked in', time: '9:15 AM', status: 'present' },
            { name: 'Sarah Johnson', action: 'Checked in', time: '9:05 AM', status: 'present' },
            { name: 'Mike Wilson', action: 'Late arrival', time: '9:45 AM', status: 'late' },
            { name: 'Lisa Brown', action: 'On leave', time: 'Today', status: 'leave' },
            { name: 'Tom Davis', action: 'Checked in', time: '8:55 AM', status: 'present' }
        ];

        activityList.innerHTML = activities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="activity-info">
                    <span class="activity-name">${activity.name}</span>
                    <span class="activity-action">${activity.action}</span>
                </div>
                <div class="activity-meta">
                    <span class="activity-time">${activity.time}</span>
                    <span class="activity-status ${activity.status}"></span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Show overview error fallback
     */
    showOverviewError() {
        const tile = document.getElementById(this.tiles.attendanceChart.id);
        if (tile) {
            tile.innerHTML = `
                <div class="tile-header">
                    <h3 class="tile-title">${this.tiles.attendanceChart.title}</h3>
                </div>
                <div class="tile-content">
                    <div class="overview-error">
                        <div class="error-icon">⚠️</div>
                        <div class="error-message">Unable to load attendance overview</div>
                        <button class="retry-button" onclick="dashboard.populateAttendanceOverview()">Retry</button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Render department status tile
     */
    renderDepartmentStatusTile() {
        const tile = document.getElementById(this.tiles.departmentStatus.id);
        if (!tile) return;

        // The HTML structure is already in place, just populate with data
        this.updateDepartmentBreakdown(this.data?.attendanceStats || {});
    }

    /**
     * Render recent activity tile
     */
    renderRecentActivityTile() {
        const tile = document.getElementById(this.tiles.recentActivity.id);
        if (!tile) return;

        // The HTML structure is already in place, just populate with data
        this.updateRecentActivity(this.data?.attendanceStats || {});
    }

    /**
     * Render calendar tile
     */
    renderCalendarTile() {
        // Calendar HTML is already in place in dashboard.html
        // Just setup the expand button and initialize calendar
        const tile = document.getElementById(this.tiles.calendar.id);
        if (!tile) return;

        // Setup expand button if it exists
        const expandBtn = tile.querySelector('.tile-expand-btn');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                this.expandCalendar();
            });
        }

        // Initialize calendar component
        setTimeout(() => {
            this.initializeCalendar();
        }, 100);
    }

    /**
     * Render payday countdown tile
     */
    renderPaydayCountdownTile() {
        const tile = document.getElementById(this.tiles.paydayCountdown.id);
        if (!tile) return;

        const payday = this.paydayData || this.getDefaultPaydayData();
        
        tile.innerHTML = `
            <div class="tile-header">
                <h3 class="tile-title">${this.tiles.paydayCountdown.title}</h3>
                <button class="tile-refresh-btn" title="Refresh countdown">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"></polyline>
                        <polyline points="1,20 1,14 7,14"></polyline>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                    </svg>
                </button>
            </div>
            <div class="tile-content">
                <div class="countdown-container">
                    <div class="countdown-main">
                        <div class="countdown-number" id="countdown-days">${payday.daysRemaining}</div>
                        <div class="countdown-label">Days Remaining</div>
                    </div>
                    <div class="countdown-details">
                        <div class="countdown-date">
                            <span class="detail-label">Date:</span>
                            <span class="detail-value" id="payday-date">${this.formatPaydayDate(payday.date)}</span>
                        </div>
                        <div class="countdown-period">
                            <span class="detail-label">Period:</span>
                            <span class="detail-value">${payday.period}</span>
                        </div>
                        ${payday.amount > 0 ? `
                            <div class="countdown-amount">
                                <span class="detail-label">Est. Amount:</span>
                                <span class="detail-value">₱${payday.amount.toLocaleString()}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="countdown-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="payday-progress"></div>
                        </div>
                        <div class="progress-text">
                            <span id="countdown-time"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Start countdown timer
        this.startPaydayCountdown();
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        // Calendar is initialized in renderCalendarTile
        // Charts are initialized in renderAttendanceChartTile
    }

    /**
     * Initialize calendar component
     */
    initializeCalendar() {
        try {
            const container = document.getElementById('dashboard-calendar');
            if (!container) return;

            // Initialize the new calendar implementation
            this.calendar = new DashboardCalendar();
            this.calendar.init();

            console.log('Dashboard calendar initialized successfully');

        } catch (error) {
            console.error('Error initializing calendar:', error);
            this.showCalendarError();
        }
    }

    /**
     * Show calendar error state
     */
    showCalendarError() {
        const container = document.getElementById('dashboard-calendar');
        if (container) {
            container.innerHTML = `
                <div class="calendar-error">
                    <div class="error-icon">📅</div>
                    <div class="error-message">
                        <h4>Calendar Unavailable</h4>
                        <p>Unable to load calendar. Please refresh the page.</p>
                        <button class="btn btn-sm btn-primary" onclick="location.reload()">Refresh</button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Initialize attendance chart
     */
    initializeAttendanceChart() {
        try {
            console.log('Attempting to initialize attendance chart...');
            
            if (!chartsManager) {
                console.warn('Charts manager not available, retrying in 500ms');
                setTimeout(() => this.initializeAttendanceChart(), 500);
                return;
            }

            const canvas = document.getElementById('attendance-stats-chart');
            if (!canvas) {
                console.error('Chart canvas element not found');
                return;
            }

            const chartData = this.prepareAttendanceChartData();
            console.log('Chart data prepared:', chartData);
            
            // Try to create chart, fallback if Chart.js not available
            const chart = chartsManager.createAttendanceStatsChart('attendance-stats-chart', chartData);
            
            if (chart) {
                this.charts.set('attendance-stats', chart);
                console.log('Attendance chart initialized successfully');
                
                // Hide loading indicator
                const loadingElement = document.querySelector('.chart-loading');
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            } else {
                console.error('Failed to create attendance chart');
                this.showChartError();
            }
        } catch (error) {
            console.error('Error initializing attendance chart:', error);
            this.showChartError();
        }
    }
    
    /**
     * Show chart error fallback
     */
    showChartError() {
        const canvas = document.getElementById('attendance-stats-chart');
        if (canvas) {
            const container = canvas.parentElement;
            container.innerHTML = `
                <div class="chart-error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">Chart unavailable</div>
                    <div class="error-detail">Unable to load visualization</div>
                </div>
                <style>
                    .chart-error {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 40px 20px;
                        color: var(--text-tertiary);
                        text-align: center;
                    }
                    .chart-error .error-icon {
                        font-size: 2rem;
                        margin-bottom: var(--spacing-md);
                        opacity: 0.5;
                    }
                    .chart-error .error-message {
                        font-size: var(--font-size-lg);
                        margin-bottom: var(--spacing-sm);
                        color: var(--text-secondary);
                    }
                    .chart-error .error-detail {
                        font-size: var(--font-size-sm);
                    }
                </style>
            `;
        }
    }

    /**
     * Check if chart containers are ready in DOM
     */
    checkChartContainers() {
        const canvas = document.getElementById('attendance-stats-chart');
        if (!canvas) {
            console.warn('Chart canvas not found in DOM');
            return false;
        }
        
        const container = canvas.closest('.chart-container');
        if (!container) {
            console.warn('Chart container not found');
            return false;
        }
        
        // Check if container has dimensions
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            console.warn('Chart container has no dimensions');
            return false;
        }
        
        return true;
    }

    /**
     * Prepare chart data based on period
     */
    prepareChartData(period) {
        const stats = this.currentStats;
        
        switch (period) {
            case 'week':
                return {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    attendanceRate: stats.weekly?.attendanceRate || [85, 92, 88, 90, 87, 75, 70],
                    targetRate: new Array(7).fill(85)
                };
            
            case 'month':
                return {
                    labels: this.generateMonthLabels(),
                    attendanceRate: stats.monthly?.attendanceRate || this.generateSampleData(30, 80, 95),
                    targetRate: new Array(30).fill(85)
                };
            
            case 'quarter':
                return {
                    labels: this.generateQuarterLabels(),
                    attendanceRate: stats.quarterly?.attendanceRate || this.generateSampleData(12, 75, 90),
                    targetRate: new Array(12).fill(85)
                };
            
            default:
                return this.prepareChartData('month');
        }
    }

    /**
     * Generate month labels for current month
     */
    generateMonthLabels() {
        const labels = [];
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            labels.push(i.toString());
        }
        
        return labels;
    }

    /**
     * Generate quarter labels
     */
    generateQuarterLabels() {
        const labels = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const quarterStart = Math.floor(currentMonth / 3) * 3;
        
        for (let i = 0; i < 12; i++) {
            const monthIndex = (quarterStart + i) % 12;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            labels.push(monthNames[monthIndex]);
        }
        
        return labels.slice(0, 3); // Current quarter only
    }

    /**
     * Generate sample data for demonstration
     */
    generateSampleData(count, min, max) {
        const data = [];
        for (let i = 0; i < count; i++) {
            data.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return data;
    }

    /**
     * Prepare attendance chart data for doughnut chart
     */
    prepareAttendanceChartData() {
        const stats = this.currentStats?.today || this.getDefaultStats().today;
        
        return {
            present: stats.present || 0,
            late: stats.late || 0,
            absent: stats.absent || 0,
            onLeave: 0 // Add if you have leave data
        };
    }

    /**
     * Update attendance count tile
     */
    updateAttendanceCountTile() {
        try {
            if (!this.currentStats) return;

            const tile = document.getElementById('attendance-count-tile');
            if (!tile) return;

            const content = tile.querySelector('.tile-content');
            if (!content) return;

            // Use .today stats if available, otherwise fallback to main stats
            const stats = this.currentStats.today || this.currentStats;
            
            // Ensure all values are numbers, not objects
            const present = Number(stats.present) || 0;
            const late = Number(stats.late) || 0;
            const absent = Number(stats.absent) || 0;
            const overtime = Number(stats.overtime) || 0;
            const presentPercentage = Number(stats.presentPercentage || stats.attendanceRate) || 0;
            
            console.log('Updating attendance count tile with values:', { present, late, absent, overtime, presentPercentage });

            content.innerHTML = `
                <div class="attendance-summary">
                    <div class="stat-item">
                        <span class="stat-number">${present}</span>
                        <span class="stat-label">Present</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${late}</span>
                        <span class="stat-label">Late</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${absent}</span>
                        <span class="stat-label">Absent</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${overtime}</span>
                        <span class="stat-label">Overtime</span>
                    </div>
                </div>
                <div class="attendance-percentage">
                    <span class="percentage-text">${presentPercentage}%</span>
                    <span class="percentage-label">Present Today</span>
                </div>
            `;
        } catch (error) {
            console.error('Error updating attendance count tile:', error);
        }
    }

    /**
     * Update charts
     */
    updateCharts() {
        try {
            if (window.chartsManager && this.currentStats) {
                const chartData = this.formatChartData(this.currentStats);
                window.chartsManager.updateChart('attendance-stats-chart', chartData);
            }
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }

    /**
     * Format data for charts
     */
    formatChartData(stats) {
        return {
            series: [stats.present || 0, stats.late || 0, stats.absent || 0, stats.overtime || 0],
            labels: ['Present', 'Late', 'Absent', 'Overtime'],
            colors: ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
        };
    }

    /**
     * Update payday countdown
     */
    updatePaydayCountdown() {
        try {
            const tile = document.getElementById('payday-countdown-tile');
            if (!tile) return;

            const content = tile.querySelector('.tile-content');
            if (!content) return;

            // Calculate next payday (assume 15th and last day of month)
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            let nextPayday;
            if (today.getDate() <= 15) {
                nextPayday = new Date(currentYear, currentMonth, 15);
            } else {
                const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
                nextPayday = new Date(currentYear, currentMonth, lastDay);
            }

            const timeDiff = nextPayday.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            content.innerHTML = `
                <div class="payday-info">
                    <div class="payday-date">${nextPayday.toLocaleDateString()}</div>
                    <div class="payday-countdown">${daysDiff} days remaining</div>
                </div>
            `;
        } catch (error) {
            console.error('Error updating payday countdown:', error);
        }
    }

    /**
     * Start auto-refresh functionality
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            if (this.isInitialized && !document.hidden) {
                this.handleDataUpdate();
            }
        }, this.config.refreshRate);

        console.log('Dashboard auto-refresh started');
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        // Calendar is initialized in renderCalendarTile
        // Charts are initialized in renderAttendanceChartTile
    }

    /**
     * Initialize calendar component
     */
    initializeCalendar() {
        try {
            const container = document.getElementById('dashboard-calendar');
            if (!container) return;

            // Initialize the new calendar implementation
            this.calendar = new DashboardCalendar();
            this.calendar.init();

            console.log('Dashboard calendar initialized successfully');

        } catch (error) {
            console.error('Error initializing calendar:', error);
            this.showCalendarError();
        }
    }

    /**
     * Show calendar error state
     */
    showCalendarError() {
        const container = document.getElementById('dashboard-calendar');
        if (container) {
            container.innerHTML = `
                <div class="calendar-error">
                    <div class="error-icon">📅</div>
                    <div class="error-message">
                        <h4>Calendar Unavailable</h4>
                        <p>Unable to load calendar. Please refresh the page.</p>
                        <button class="btn btn-sm btn-primary" onclick="location.reload()">Refresh</button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Initialize attendance chart
     */
    initializeAttendanceChart() {
        try {
            console.log('Attempting to initialize attendance chart...');
            
            if (!chartsManager) {
                console.warn('Charts manager not available, retrying in 500ms');
                setTimeout(() => this.initializeAttendanceChart(), 500);
                return;
            }

            const canvas = document.getElementById('attendance-stats-chart');
            if (!canvas) {
                console.error('Chart canvas element not found');
                return;
            }

            const chartData = this.prepareAttendanceChartData();
            console.log('Chart data prepared:', chartData);
            
            // Try to create chart, fallback if Chart.js not available
            const chart = chartsManager.createAttendanceStatsChart('attendance-stats-chart', chartData);
            
            if (chart) {
                this.charts.set('attendance-stats', chart);
                console.log('Attendance chart initialized successfully');
                
                // Hide loading indicator
                const loadingElement = document.querySelector('.chart-loading');
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            } else {
                console.error('Failed to create attendance chart');
                this.showChartError();
            }
        } catch (error) {
            console.error('Error initializing attendance chart:', error);
            this.showChartError();
        }
    }
    
    /**
     * Show chart error fallback
     */
    showChartError() {
        const canvas = document.getElementById('attendance-stats-chart');
        if (canvas) {
            const container = canvas.parentElement;
            container.innerHTML = `
                <div class="chart-error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">Chart unavailable</div>
                    <div class="error-detail">Unable to load visualization</div>
                </div>
                <style>
                    .chart-error {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 40px 20px;
                        color: var(--text-tertiary);
                        text-align: center;
                    }
                    .chart-error .error-icon {
                        font-size: 2rem;
                        margin-bottom: var(--spacing-md);
                        opacity: 0.5;
                    }
                    .chart-error .error-message {
                        font-size: var(--font-size-lg);
                        margin-bottom: var(--spacing-sm);
                        color: var(--text-secondary);
                    }
                    .chart-error .error-detail {
                        font-size: var(--font-size-sm);
                    }
                </style>
            `;
        }
    }

    /**
     * Check if chart containers are ready in DOM
     */
    checkChartContainers() {
        const canvas = document.getElementById('attendance-stats-chart');
        if (!canvas) {
            console.warn('Chart canvas not found in DOM');
            return false;
        }
        
        const container = canvas.closest('.chart-container');
        if (!container) {
            console.warn('Chart container not found');
            return false;
        }
        
        // Check if container has dimensions
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            console.warn('Chart container has no dimensions');
            return false;
        }
        
        return true;
    }

    /**
     * Prepare chart data based on period
     */
    prepareChartData(period) {
        const stats = this.currentStats;
        
        switch (period) {
            case 'week':
                return {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    attendanceRate: stats.weekly?.attendanceRate || [85, 92, 88, 90, 87, 75, 70],
                    targetRate: new Array(7).fill(85)
                };
            
            case 'month':
                return {
                    labels: this.generateMonthLabels(),
                    attendanceRate: stats.monthly?.attendanceRate || this.generateSampleData(30, 80, 95),
                    targetRate: new Array(30).fill(85)
                };
            
            case 'quarter':
                return {
                    labels: this.generateQuarterLabels(),
                    attendanceRate: stats.quarterly?.attendanceRate || this.generateSampleData(12, 75, 90),
                    targetRate: new Array(12).fill(85)
                };
            
            default:
                return this.prepareChartData('month');
        }
    }

    /**
     * Generate month labels for current month
     */
    generateMonthLabels() {
        const labels = [];
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            labels.push(i.toString());
        }
        
        return labels;
    }

    /**
     * Generate quarter labels
     */
    generateQuarterLabels() {
        const labels = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const quarterStart = Math.floor(currentMonth / 3) * 3;
        
        for (let i = 0; i < 12; i++) {
            const monthIndex = (quarterStart + i) % 12;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            labels.push(monthNames[monthIndex]);
        }
        
        return labels.slice(0, 3); // Current quarter only
    }

    /**
     * Generate sample data for demonstration
     */
    generateSampleData(count, min, max) {
        const data = [];
        for (let i = 0; i < count; i++) {
            data.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return data;
    }

    /**
     * Prepare attendance chart data for doughnut chart
     */
    prepareAttendanceChartData() {
        const stats = this.currentStats?.today || this.getDefaultStats().today;
        
        return {
            present: stats.present || 0,
            late: stats.late || 0,
            absent: stats.absent || 0,
            onLeave: 0 // Add if you have leave data
        };
    }

    /**
     * Update attendance chart with new period
     */
    async updateAttendanceChart(period) {
        try {
            const chartContainer = document.querySelector('.chart-container');
            const loadingElement = document.querySelector('.chart-loading');
            
            // Show loading
            if (chartContainer && loadingElement) {
                chartContainer.style.opacity = '0.5';
                loadingElement.style.display = 'flex';
            }

            // For now, just refresh the current doughnut chart data
            // In a real app, you might load different period data
            const chartData = this.prepareAttendanceChartData();
            
            // Update chart
            const chart = this.charts.get('attendance-stats');
            if (chart) {
                chart.data.datasets[0].data = [
                    chartData.present,
                    chartData.late,
                    chartData.absent,
                    chartData.onLeave
                ];
                chart.update();
            }

            // Hide loading
            setTimeout(() => {
                if (chartContainer && loadingElement) {
                    chartContainer.style.opacity = '1';
                    loadingElement.style.display = 'none';
                }
            }, 500);

        } catch (error) {
            console.error('Error updating attendance chart:', error);
        }
    }

    /**
     * Refresh chart with loaded data
     */
    refreshChartWithData() {
        try {
            const chart = this.charts.get('attendance-stats');
            if (chart && this.currentStats) {
                const chartData = this.prepareAttendanceChartData();
                chart.data.datasets[0].data = [
                    chartData.present,
                    chartData.late,
                    chartData.absent,
                    chartData.onLeave
                ];
                chart.update();
                console.log('Chart updated with loaded data');
            } else if (!chart && this.checkChartContainers()) {
                // Chart doesn't exist yet but containers are ready, try to initialize it
                console.log('Chart containers ready, initializing chart with data');
                this.initializeAttendanceChart();
            } else if (!chart) {
                // Chart containers not ready, try again later
                console.log('Chart containers not ready, retrying in 500ms');
                setTimeout(() => this.refreshChartWithData(), 500);
            }
        } catch (error) {
            console.error('Error refreshing chart with data:', error);
        }
    }

    /**
     * Start payday countdown timer
     */
    startPaydayCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        this.updatePaydayCountdown();
        
        this.countdownInterval = setInterval(() => {
            this.updatePaydayCountdown();
        }, this.config.countdownUpdateRate);
    }

    /**
     * Update payday countdown display
     */
    updatePaydayCountdown() {
        const payday = this.paydayData || this.getDefaultPaydayData();
        if (!payday || !payday.date) return;

        const now = new Date();
        const paydayDate = new Date(payday.date);
        
        // Validate dates
        if (isNaN(now.getTime()) || isNaN(paydayDate.getTime())) {
            console.warn('Invalid date detected in payday countdown');
            return;
        }

        const timeDiff = paydayDate - now;

        if (timeDiff <= 0) {
            // Payday has passed, reload data
            this.loadPaydayData().then(() => {
                this.renderPaydayCountdownTile();
            });
            return;
        }

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        // Validate calculated values
        const safeDays = isNaN(days) ? 0 : days;
        const safeHours = isNaN(hours) ? 0 : hours;
        const safeMinutes = isNaN(minutes) ? 0 : minutes;
        const safeSeconds = isNaN(seconds) ? 0 : seconds;

        // Update countdown display
        const daysElement = document.getElementById('countdown-days');
        const timeElement = document.getElementById('countdown-time');
        const progressElement = document.getElementById('payday-progress');

        if (daysElement) {
            daysElement.textContent = safeDays;
        }

        if (timeElement) {
            timeElement.textContent = `${safeHours.toString().padStart(2, '0')}:${safeMinutes.toString().padStart(2, '0')}:${safeSeconds.toString().padStart(2, '0')}`;
        }

        if (progressElement) {
            // Calculate progress (assuming 7-day pay period for weekly pay)
            const totalPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            const elapsed = totalPeriod - timeDiff;
            const progress = Math.max(0, Math.min(100, (elapsed / totalPeriod) * 100));
            
            if (!isNaN(progress)) {
                progressElement.style.width = `${progress}%`;
            }
        }
    }

    /**
     * Format payday date for display
     */
    formatPaydayDate(dateStr) {
        const date = new Date(dateStr);
        const options = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Animate circular progress indicator
     */
    animateCircularProgress(element) {
        if (!element) return;

        const rate = parseFloat(element.dataset.rate) || 0;
        const circle = element.querySelector('.circle');
        const percentage = element.querySelector('.percentage');
        
        if (circle && percentage) {
            // Animate from 0 to target rate
            let current = 0;
            const increment = rate / 30; // 30 frames for smooth animation
            
            const animate = () => {
                current += increment;
                if (current >= rate) {
                    current = rate;
                }
                
                circle.style.strokeDasharray = `${current}, 100`;
                percentage.textContent = `${Math.round(current)}%`;
                
                if (current < rate) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        }
    }

    /**
     * Handle calendar date selection
     */
    handleCalendarDateSelect(date, dateStr) {
        console.log('Calendar date selected:', dateStr);
        // Could trigger additional actions like showing attendance details for that date
    }

    /**
     * Handle calendar note addition
     */
    handleCalendarNoteAdd(note) {
        console.log('Calendar note added:', note);
        // Could trigger notifications or updates to other components
    }

    /**
     * Handle calendar note updates
     */
    handleCalendarNoteUpdate(note) {
        console.log('Calendar note updated:', note);
    }

    /**
     * Handle calendar note deletion
     */
    handleCalendarNoteDelete(note) {
        console.log('Calendar note deleted:', note);
    }

    /**
     * Expand calendar to full view
     */
    expandCalendar() {
        // Could open calendar in a modal or navigate to a dedicated calendar page
        console.log('Expanding calendar view');
        
        // For now, just re-render the calendar
        if (this.calendar) {
            this.calendar.renderCalendar();
        }
    }

    /**
     * Update quick stats in the header and tiles
     */
    updateQuickStats() {
        console.log('Updating quick stats with currentStats:', this.currentStats);
        
        // Backend stats API returns data directly (not nested under 'today')
        const stats = this.currentStats || this.getDefaultStats();
        
        console.log('Stats being used for display:', stats);
        
        // Use backend stats directly
        const totalEmployees = Number(stats.total || stats.totalEmployees) || 0;
        const present = Number(stats.present || stats.presentToday) || 0;
        const late = Number(stats.late || stats.tardyToday) || 0;
        const attendanceRate = Number(stats.attendanceRate || stats.presentPercentage) || 0;
        
        console.log('Processed stats:', { totalEmployees, present, late, attendanceRate });
        
        // Update main header quick stats
        const totalEmployeesEl = document.getElementById('total-employees');
        const presentTodayEl = document.getElementById('present-today');
        const lateTodayEl = document.getElementById('late-today');
        const attendanceRateEl = document.getElementById('attendance-rate');
        
        console.log('Values being set:', { totalEmployees, present, late, attendanceRate });
        
        if (totalEmployeesEl) {
            totalEmployeesEl.textContent = totalEmployees.toString();
            console.log('Set total employees to:', totalEmployees);
        }
        if (presentTodayEl) {
            presentTodayEl.textContent = (present + late).toString();
            console.log('Set present today to:', present + late);
        }
        if (lateTodayEl) {
            lateTodayEl.textContent = late.toString();
            console.log('Set late today to:', late);
        }
        if (attendanceRateEl) {
            attendanceRateEl.textContent = `${attendanceRate.toFixed(1)}%`;
            console.log('Set attendance rate to:', `${attendanceRate.toFixed(1)}%`);
        }
        
        // Update existing tile elements if they exist (for static HTML)
        const mainAttendanceCountEl = document.getElementById('main-attendance-count');
        const totalEmployeeCountEl = document.getElementById('total-employee-count');
        const onTimeCountEl = document.getElementById('on-time-count');
        const lateCountEl = document.getElementById('late-count');
        const absentCountEl = document.getElementById('absent-count');
        
        if (mainAttendanceCountEl) {
            mainAttendanceCountEl.textContent = (present + late).toString();
            console.log('Set main attendance count to:', present + late);
        }
        if (totalEmployeeCountEl) {
            totalEmployeeCountEl.textContent = totalEmployees.toString();
            console.log('Set total employee count to:', totalEmployees);
        }
        if (onTimeCountEl) {
            onTimeCountEl.textContent = present.toString();
            console.log('Set on time count to:', present);
        }
        if (lateCountEl) {
            lateCountEl.textContent = late.toString();
            console.log('Set late count to:', late);
        }
        if (absentCountEl) {
            const absent = Number(stats.absent || stats.absentToday) || Math.max(0, totalEmployees - present - late);
            absentCountEl.textContent = Math.max(0, absent).toString();
            console.log('Set absent count to:', Math.max(0, absent));
        }
        
        // Update circular progress if it exists in static HTML
        const rateCircle = document.querySelector('.rate-circle');
        if (rateCircle) {
            rateCircle.setAttribute('data-rate', attendanceRate.toString());
            const circleElement = rateCircle.querySelector('.circle');
            const percentageElement = rateCircle.querySelector('.percentage');
            
            if (circleElement) {
                circleElement.setAttribute('stroke-dasharray', `${attendanceRate}, 100`);
            }
            if (percentageElement) {
                percentageElement.textContent = `${attendanceRate.toFixed(1)}%`;
            }
        }
        
        console.log('Quick stats update completed');
    }

    /**
     * Refresh a specific tile
     */
    async refreshTile(tileId) {
        try {
            console.log(`Refreshing tile: ${tileId}`);
            
            switch (tileId) {
                case 'attendance-count-tile':
                    await this.loadAttendanceStats();
                    this.updateQuickStats();
                    this.renderAttendanceCountTile();
                    break;
                    
                case 'attendance-chart-tile':
                    await this.loadAttendanceStats();
                    this.renderAttendanceChartTile();
                    // Add delay to ensure DOM is ready before chart initialization
                    setTimeout(() => {
                        this.refreshChartWithData();
                    }, 100);
                    break;
                    
                case 'payday-countdown-tile':
                    await this.loadPaydayData();
                    this.renderPaydayCountdownTile();
                    break;
                    
                case 'calendar-tile':
                    this.renderCalendarTile();
                    break;
                    
                default:
                    console.warn(`Unknown tile ID: ${tileId}`);
            }
        } catch (error) {
            console.error(`Error refreshing tile ${tileId}:`, error);
        }
    }

    /**
     * Setup tile-specific event listeners
     */
    setupTileEventListeners() {
        // Minimize/maximize tile handlers
        document.querySelectorAll('.tile-minimize').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tile = e.target.closest('.tile');
                if (tile) {
                    this.toggleTile(tile);
                }
            });
        });

        // Refresh tile handlers
        document.querySelectorAll('.tile-refresh').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tile = e.target.closest('.tile');
                if (tile) {
                    this.refreshTile(tile);
                }
            });
        });

        // Settings tile handlers
        document.querySelectorAll('.tile-settings').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tile = e.target.closest('.tile');
                if (tile) {
                    this.openTileSettings(tile);
                }
            });
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + R for refresh
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refreshDashboard();
            }

            // F5 for refresh
            if (e.key === 'F5') {
                e.preventDefault();
                this.refreshDashboard();
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    /**
     * Toggle tile minimize/maximize
     */
    toggleTile(tile) {
        const content = tile.querySelector('.tile-content');
        const btn = tile.querySelector('.tile-minimize');
        
        if (content && btn) {
            const isMinimized = content.classList.contains('hidden');
            
            if (isMinimized) {
                content.classList.remove('hidden');
                btn.textContent = '−';
                btn.title = 'Minimize';
            } else {
                content.classList.add('hidden');
                btn.textContent = '+';
                btn.title = 'Maximize';
            }
        }
    }

    /**
     * Refresh a specific tile
     */
    async refreshTile(tile) {
        if (!tile) return;

        const tileId = tile.id;
        const refreshBtn = tile.querySelector('.tile-refresh');
        
        if (refreshBtn) {
            refreshBtn.classList.add('spinning');
        }

        try {
            switch (tileId) {
                case 'attendance-count-tile':
                    await this.updateAttendanceCountTile();
                    break;
                case 'attendance-chart-tile':
                    await this.updateCharts();
                    break;
                case 'calendar-tile':
                    if (this.calendar && typeof this.calendar.refresh === 'function') {
                        this.calendar.refresh();
                    }
                    break;
                case 'payday-countdown-tile':
                    await this.updatePaydayCountdown();
                    break;
                default:
                    console.log('Unknown tile refresh:', tileId);
            }
        } catch (error) {
            console.error('Error refreshing tile:', error);
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('spinning');
            }
        }
    }

    /**
     * Open tile settings
     */
    openTileSettings(tile) {
        console.log('Opening settings for tile:', tile.id);
        // Placeholder for future tile settings functionality
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    /**
     * Pause auto-refresh
     */
    pauseAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Dashboard auto-refresh paused');
        }
    }

    /**
     * Resume auto-refresh
     */
    resumeAutoRefresh() {
        if (!this.refreshInterval && this.isInitialized) {
            this.startAutoRefresh();
            console.log('Dashboard auto-refresh resumed');
        }
    }

    /**
     * Refresh entire dashboard
     */
    async refreshDashboard() {
        try {
            console.log('Refreshing dashboard...');
            
            // Show loading state
            this.showLoadingState(true);
            
            // Reload data
            await this.loadInitialData();
            
            // Update all components
            this.updateQuickStats();
            this.updateAttendanceCountTile();
            this.updateCharts();
            this.updatePaydayCountdown();
            
            // Hide loading state
            this.showLoadingState(false);
            
            console.log('Dashboard refreshed successfully');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showLoadingState(false);
        }
    }

    /**
     * Show/hide loading state
     */
    showLoadingState(loading) {
        // Add loading indicators to tiles
        document.querySelectorAll('.tile').forEach(tile => {
            if (loading) {
                tile.classList.add('loading');
            } else {
                tile.classList.remove('loading');
            }
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Debounce resize handler
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.resizeCharts();
        }, 150);
    }

    /**
     * Resize all charts
     */
    resizeCharts() {
        this.charts.forEach((chart) => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    /**
     * Refresh data without full reload
     */
    async refreshData() {
        try {
            await this.loadAttendanceStats();
            await this.loadPaydayData();
            this.updateQuickStats();
            this.refreshChartWithData();
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    /**
     * Handle user change (login/logout)
     */
    handleUserChange() {
        // Reload dashboard data when user changes
        this.loadInitialData().catch(error => {
            console.error('Error reloading data after user change:', error);
        });
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        // Destroy charts
        this.charts.forEach((chart) => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts.clear();
        
        this.isInitialized = false;
    }

    /**
     * Show error state when dashboard fails to load
     */
    showErrorState() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="error-state" style="
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-secondary);
                ">
                    <div style="font-size: 3rem; margin-bottom: 20px;">❌</div>
                    <h2>Dashboard Loading Error</h2>
                    <p>Failed to initialize the dashboard. Please refresh the page to try again.</p>
                    <button onclick="window.location.reload()" style="
                        margin-top: 20px;
                        padding: 10px 20px;
                        background: var(--accent-primary);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Refresh Page</button>
                </div>
            `;
        }
    }
}

// Global dashboard controller instance
window.dashboardController = null;

// Initialize dashboard when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeDashboard();
    });
} else {
    initializeDashboard();
}

async function initializeDashboard() {
    try {
        console.log('Starting dashboard initialization...');
        
        // Create dashboard controller instance
        window.dashboardController = new DashboardController();
        
        // Register with global synchronization system
        setTimeout(() => {
            if (window.globalSystemSync && window.globalSystemSync.initialized) {
                window.globalSystemSync.registerComponent('dashboardController', window.dashboardController, {
                    refreshData: 'loadDashboardData',
                    updateStats: 'updateEmployeeStats',
                    updateCharts: 'updateAttendanceChart',
                    loadEmployees: 'loadEmployees',
                    updateAttendance: 'updateTodayAttendance'
                });
                console.log('Dashboard registered with global sync');
            }
        }, 500);
        
        console.log('Dashboard initialization completed');
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
    }
}
