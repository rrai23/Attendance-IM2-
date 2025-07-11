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
        const maxWait = 10000; // 10 seconds
        const checkInterval = 200;
        let waited = 0;

        return new Promise((resolve, reject) => {
            const check = () => {
                const dependencies = {
                    dataManager: typeof window.dataManager !== 'undefined' && window.dataManager.initialized,
                    dataService: typeof dataService !== 'undefined',
                    chartsManager: typeof chartsManager !== 'undefined' || typeof window.chartsManager !== 'undefined',
                    DashboardCalendar: typeof DashboardCalendar !== 'undefined',
                    ApexCharts: typeof ApexCharts !== 'undefined'
                };
                
                console.log('DashboardController checking dependencies...', dependencies);
                
                // Prefer data manager, but allow fallback to dataService
                const hasDataSource = dependencies.dataManager || dependencies.dataService;
                
                if (hasDataSource && dependencies.DashboardCalendar && dependencies.ApexCharts) {
                    console.log('Core dependencies available');
                    resolve();
                } else if (waited >= maxWait) {
                    console.warn('Dependencies not available after 10 seconds:', dependencies);
                    
                    // Try to proceed with minimal functionality
                    if (hasDataSource) {
                        console.log('Proceeding with minimal functionality');
                        resolve();
                    } else {
                        reject(new Error('Critical dependencies missing: No data source available'));
                    }
                } else {
                    waited += checkInterval;
                    setTimeout(check, checkInterval);
                }
            };
            check();
        });
    }

    /**
     * Setup event listeners for dashboard interactions
     */
    setupEventListeners() {
        // Listen for data manager updates
        if (window.dataManager) {
            window.dataManager.addEventListener('attendanceUpdate', (data) => {
                console.log('Dashboard received attendance update:', data);
                this.handleDataUpdate();
            });
            
            window.dataManager.addEventListener('dataSync', (data) => {
                console.log('Dashboard received data sync:', data);
                this.handleDataUpdate();
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
     * Handle data updates from data manager
     */
    async handleDataUpdate() {
        try {
            await this.loadAttendanceStats();
            this.updateQuickStats();
            this.updateAttendanceCountTile();
            this.updateCharts();
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
            // Use data manager if available, otherwise fallback to dataService
            if (window.dataManager && window.dataManager.initialized) {
                const today = new Date().toISOString().split('T')[0];
                this.currentStats = window.dataManager.getAttendanceStats(today);
                
                // Get today's records for detailed processing
                const todayRecords = window.dataManager.getTodayAttendance();
                this.currentStats.today = this.processTodayAttendance(todayRecords);
                
                console.log('Dashboard loaded stats from data manager:', this.currentStats);
            } else {
                // Fallback to original dataService
                this.currentStats = await dataService.getAttendanceStats();
                
                // Also get today's specific data
                const today = new Date().toISOString().split('T')[0];
                const todayRecords = await dataService.getAttendanceRecords(null, today, today);
                
                // Process today's data
                this.currentStats.today = this.processTodayAttendance(todayRecords);
                
                console.log('Dashboard loaded stats from dataService:', this.currentStats);
            }
            
        } catch (error) {
            console.error('Error loading attendance stats:', error);
            this.currentStats = this.getDefaultStats();
        }
    }

    /**
     * Process today's attendance data
     */
    processTodayAttendance(records) {
        // Get total number of employees from the data service
        // There are 6 employees in the mock-data.js users array
        const totalEmployees = 6; // This matches the number of employees in mock-data.js
        
        let present = 0;
        let late = 0;
        let absent = 0;

        records.forEach(record => {
            if (record.status === 'present') {
                if (record.isLate) {
                    late++;
                } else {
                    present++;
                }
            } else if (record.status === 'absent') {
                absent++;
            }
        });

        // If we have fewer records than employees, the missing ones are considered absent
        const recordedEmployees = records.length;
        if (recordedEmployees < totalEmployees) {
            absent += (totalEmployees - recordedEmployees);
        }

        const attendanceRate = totalEmployees > 0 ? ((present + late) / totalEmployees) * 100 : 0;

        return {
            total: totalEmployees,
            present,
            late,
            absent,
            attendanceRate: Math.round(attendanceRate * 10) / 10
        };
    }

    /**
     * Load payday data
     */
    async loadPaydayData() {
        try {
            this.paydayData = await dataService.getNextPayday();
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
            today: {
                total: 0,
                present: 0,
                late: 0,
                absent: 0,
                attendanceRate: 0
            },
            weekly: {
                present: 0,
                late: 0,
                absent: 0,
                onLeave: 0
            },
            trends: {
                labels: [],
                attendanceRate: [],
                targetRate: []
            }
        };
    }

    /**
     * Get default payday data
     */
    getDefaultPaydayData() {
        const today = new Date();
        const nextFriday = new Date(today);
        
        // Calculate days until next Friday (5 = Friday)
        const daysUntilFriday = (5 - today.getDay() + 7) % 7;
        
        // If today is Friday, get next Friday (7 days from now)
        if (daysUntilFriday === 0) {
            nextFriday.setDate(today.getDate() + 7);
        } else {
            nextFriday.setDate(today.getDate() + daysUntilFriday);
        }
        
        // Ensure we have a valid date
        if (isNaN(nextFriday.getTime())) {
            nextFriday.setTime(today.getTime() + (7 * 24 * 60 * 60 * 1000)); // fallback to 7 days from today
        }
        
        const daysRemaining = Math.max(1, Math.ceil((nextFriday - today) / (1000 * 60 * 60 * 24)));
        
        return {
            date: nextFriday.toISOString().split('T')[0],
            daysRemaining: daysRemaining,
            amount: 15000, // Default weekly amount in PHP
            period: 'Weekly'
        };
    }

    /**
     * Render all dashboard tiles
     */
    renderTiles() {
        this.renderAttendanceCountTile();
        this.renderAttendanceChartTile();
        this.renderCalendarTile();
        this.renderPaydayCountdownTile();
    }

    /**
     * Render attendance count tile
     */
    renderAttendanceCountTile() {
        const tile = document.getElementById(this.tiles.attendanceCount.id);
        if (!tile) return;

        const stats = this.currentStats?.today || this.getDefaultStats().today;
        
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
                        <div class="stat-number">${stats.present + stats.late}</div>
                        <div class="stat-label">Present Today</div>
                        <div class="stat-sublabel">out of ${stats.total} employees</div>
                    </div>
                    <div class="attendance-rate">
                        <div class="rate-circle" data-rate="${stats.attendanceRate}">
                            <svg viewBox="0 0 36 36" class="circular-chart">
                                <path class="circle-bg" d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path class="circle" stroke-dasharray="${stats.attendanceRate}, 100" d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <text x="18" y="20.35" class="percentage">${stats.attendanceRate}%</text>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="attendance-breakdown">
                    <div class="breakdown-item present">
                        <span class="breakdown-dot"></span>
                        <span class="breakdown-label">On Time</span>
                        <span class="breakdown-value">${stats.present}</span>
                    </div>
                    <div class="breakdown-item late">
                        <span class="breakdown-dot"></span>
                        <span class="breakdown-label">Late</span>
                        <span class="breakdown-value">${stats.late}</span>
                    </div>
                    <div class="breakdown-item absent">
                        <span class="breakdown-dot"></span>
                        <span class="breakdown-label">Absent</span>
                        <span class="breakdown-value">${stats.absent}</span>
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
     * Render attendance chart tile
     */
    renderAttendanceChartTile() {
        const tile = document.getElementById(this.tiles.attendanceChart.id);
        if (!tile) return;

        tile.innerHTML = `
            <div class="tile-header">
                <h3 class="tile-title">${this.tiles.attendanceChart.title}</h3>
                <div class="tile-actions">
                    <select class="chart-period-select" id="chart-period">
                        <option value="week">This Week</option>
                        <option value="month" selected>This Month</option>
                        <option value="quarter">This Quarter</option>
                    </select>
                    <button class="tile-refresh-btn" title="Refresh chart">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23,4 23,10 17,10"></polyline>
                            <polyline points="1,20 1,14 7,14"></polyline>
                            <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="tile-content">
                <div class="chart-container">
                    <canvas id="attendance-stats-chart"></canvas>
                </div>
                <div class="chart-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <span>Loading chart data...</span>
                </div>
            </div>
        `;

        // Setup chart period change handler
        const periodSelect = tile.querySelector('#chart-period');
        periodSelect.addEventListener('change', () => {
            this.updateAttendanceChart(periodSelect.value);
        });

        // Initialize chart with a short delay to ensure DOM is ready
        setTimeout(() => {
            this.initializeAttendanceChart();
        }, 300); // Reduced delay since data is already loaded
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

            content.innerHTML = `
                <div class="attendance-summary">
                    <div class="stat-item">
                        <span class="stat-number">${this.currentStats.present || 0}</span>
                        <span class="stat-label">Present</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.currentStats.late || 0}</span>
                        <span class="stat-label">Late</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.currentStats.absent || 0}</span>
                        <span class="stat-label">Absent</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.currentStats.overtime || 0}</span>
                        <span class="stat-label">Overtime</span>
                    </div>
                </div>
                <div class="attendance-percentage">
                    <span class="percentage-text">${this.currentStats.presentPercentage || 0}%</span>
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
                window.chartsManager.updateChart('attendance-chart', chartData);
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
        const stats = this.currentStats?.today || this.getDefaultStats().today;
        
        // Update main header quick stats
        const totalEmployeesEl = document.getElementById('total-employees');
        const presentTodayEl = document.getElementById('present-today');
        const lateTodayEl = document.getElementById('late-today');
        const attendanceRateEl = document.getElementById('attendance-rate');
        
        if (totalEmployeesEl) totalEmployeesEl.textContent = stats.total;
        if (presentTodayEl) presentTodayEl.textContent = stats.present + stats.late;
        if (lateTodayEl) lateTodayEl.textContent = stats.late;
        if (attendanceRateEl) attendanceRateEl.textContent = `${stats.attendanceRate}%`;
        
        // Update existing tile elements if they exist (for static HTML)
        const mainAttendanceCountEl = document.getElementById('main-attendance-count');
        const totalEmployeeCountEl = document.getElementById('total-employee-count');
        const onTimeCountEl = document.getElementById('on-time-count');
        const lateCountEl = document.getElementById('late-count');
        const absentCountEl = document.getElementById('absent-count');
        
        if (mainAttendanceCountEl) mainAttendanceCountEl.textContent = stats.present + stats.late;
        if (totalEmployeeCountEl) totalEmployeeCountEl.textContent = stats.total;
        if (onTimeCountEl) onTimeCountEl.textContent = stats.present;
        if (lateCountEl) lateCountEl.textContent = stats.late;
        if (absentCountEl) absentCountEl.textContent = stats.absent;
        
        // Update circular progress if it exists in static HTML
        const rateCircle = document.querySelector('.rate-circle');
        if (rateCircle) {
            rateCircle.setAttribute('data-rate', stats.attendanceRate);
            const circleElement = rateCircle.querySelector('.circle');
            const percentageElement = rateCircle.querySelector('.percentage');
            
            if (circleElement) {
                circleElement.setAttribute('stroke-dasharray', `${stats.attendanceRate}, 100`);
            }
            if (percentageElement) {
                percentageElement.textContent = `${stats.attendanceRate}%`;
            }
        }
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
        
        console.log('Dashboard initialization completed');
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
    }
}
