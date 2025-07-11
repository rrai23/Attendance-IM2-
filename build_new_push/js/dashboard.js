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
        const checkInterval = 100;
        let waited = 0;

        return new Promise((resolve, reject) => {
            const check = () => {
                if (typeof dataService !== 'undefined' && 
                    typeof chartsManager !== 'undefined' && 
                    typeof DashboardCalendar !== 'undefined') {
                    resolve();
                } else if (waited >= maxWait) {
                    reject(new Error('Required dependencies not available'));
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
        // Tile refresh buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tile-refresh-btn')) {
                const tileId = e.target.closest('.dashboard-tile').id;
                this.refreshTile(tileId);
            }
        });

        // Window focus/blur for auto-refresh management
        window.addEventListener('focus', () => {
            if (!this.refreshInterval) {
                this.startAutoRefresh();
            }
        });

        window.addEventListener('blur', () => {
            this.pauseAutoRefresh();
        });

        // Visibility change for performance optimization
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoRefresh();
            } else {
                this.startAutoRefresh();
            }
        });

        // Listen for auth events
        document.addEventListener('auth:login', () => {
            this.handleUserChange();
        });

        document.addEventListener('auth:logout', () => {
            this.cleanup();
        });

        // Listen for theme changes
        document.addEventListener('themechange', (e) => {
            this.updateChartsTheme(e.detail.theme);
        });

        // Listen for sidebar events
        document.addEventListener('sidebar:toggle', () => {
            setTimeout(() => this.resizeCharts(), 300);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
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
            
            // Load calendar data (will be handled by calendar component)
            
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
            this.currentStats = await dataService.getAttendanceStats();
            
            // Also get today's specific data
            const today = new Date().toISOString().split('T')[0];
            const todayRecords = await dataService.getAttendanceRecords(null, today, today);
            
            // Process today's data
            this.currentStats.today = this.processTodayAttendance(todayRecords);
            
        } catch (error) {
            console.error('Error loading attendance stats:', error);
            this.currentStats = this.getDefaultStats();
        }
    }

    /**
     * Process today's attendance data
     */
    processTodayAttendance(records) {
        const employees = new Set();
        let present = 0;
        let late = 0;
        let absent = 0;

        records.forEach(record => {
            employees.add(record.employeeId);
            
            switch (record.status) {
                case 'present':
                    if (record.isLate) late++;
                    else present++;
                    break;
                case 'absent':
                    absent++;
                    break;
            }
        });

        const total = employees.size;
        const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;

        return {
            total,
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
            amount: 1250, // Default weekly amount
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

        // Initialize chart
        setTimeout(() => {
            this.initializeAttendanceChart();
        }, this.config.chartUpdateDelay);
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
                                <span class="detail-value">$${payday.amount.toLocaleString()}</span>
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
            if (!this.currentStats || !chartsManager) return;

            const chartData = this.prepareChartData('month');
            const chart = chartsManager.createMonthlyOverviewChart('attendance-stats-chart', chartData);
            
            if (chart) {
                this.charts.set('attendance-stats', chart);
            }
        } catch (error) {
            console.error('Error initializing attendance chart:', error);
        }
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

            // Prepare new data
            const chartData = this.prepareChartData(period);
            
            // Update chart
            const chart = this.charts.get('attendance-stats');
            if (chart && chartsManager) {
                chartsManager.updateChart('attendance-stats-chart', chartData);
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
     * Refresh specific tile
     */
    async refreshTile(tileId) {
        const refreshBtn = document.querySelector(`#${tileId} .tile-refresh-btn`);
        
        // Add loading state
        if (refreshBtn) {
            refreshBtn.classList.add('loading');
        }

        try {
            switch (tileId) {
                case this.tiles.attendanceCount.id:
                    await this.loadAttendanceStats();
                    this.renderAttendanceCountTile();
                    break;
                
                case this.tiles.attendanceChart.id:
                    await this.loadAttendanceStats();
                    const period = document.getElementById('chart-period')?.value || 'month';
                    await this.updateAttendanceChart(period);
                    break;
                
                case this.tiles.paydayCountdown.id:
                    await this.loadPaydayData();
                    this.renderPaydayCountdownTile();
                    break;
                
                default:
                    console.warn('Unknown tile ID for refresh:', tileId);
            }
        } catch (error) {
            console.error('Error refreshing tile:', error);
        } finally {
            // Remove loading state
            if (refreshBtn) {
                refreshBtn.classList.remove('loading');
            }
        }
    }

    /**
     * Start auto-refresh for dashboard data
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadAttendanceStats();
                this.renderAttendanceCountTile();
                
                // Update chart if visible
                const chartTile = document.getElementById(this.tiles.attendanceChart.id);
                if (chartTile && this.isElementVisible(chartTile)) {
                    const period = document.getElementById('chart-period')?.value || 'month';
                    await this.updateAttendanceChart(period);
                }
            } catch (error) {
                console.error('Error during auto-refresh:', error);
            }
        }, this.config.refreshRate);
    }

    /**
     * Pause auto-refresh
     */
    pauseAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Check if element is visible in viewport
     */
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Handle user authentication changes
     */
    handleUserChange() {
        // Reload data for new user
        this.loadInitialData().then(() => {
            this.renderTiles();
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Debounce resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            this.resizeCharts();
        }, 250);
    }

    /**
     * Resize all charts
     */
    resizeCharts() {
        if (chartsManager) {
            chartsManager.resizeAllCharts();
        }
    }

    /**
     * Update charts theme
     */
    updateChartsTheme(theme) {
        if (chartsManager) {
            chartsManager.updateAllChartsTheme(theme);
        }
    }

    /**
     * Show error state for dashboard
     */
    showErrorState() {
        const dashboardContainer = document.querySelector('.dashboard-content');
        if (dashboardContainer) {
            dashboardContainer.innerHTML = `
                <div class="dashboard-error">
                    <div class="error-icon">⚠️</div>
                    <h3>Dashboard Unavailable</h3>
                    <p>Unable to load dashboard data. Please check your connection and try again.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Get dashboard state for debugging
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            currentStats: this.currentStats,
            paydayData: this.paydayData,
            refreshInterval: !!this.refreshInterval,
            countdownInterval: !!this.countdownInterval,
            chartsCount: this.charts.size,
            calendarInitialized: !!this.calendar
        };
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

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }

        // Destroy charts
        this.charts.forEach((chart, id) => {
            if (chartsManager) {
                chartsManager.destroyChart(id);
            }
        });
        this.charts.clear();

        // Destroy calendar
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }

        this.isInitialized = false;
    }

    /**
     * Destroy dashboard controller
     */
    destroy() {
        this.cleanup();
        
        // Remove event listeners
        window.removeEventListener('focus', this.startAutoRefresh);
        window.removeEventListener('blur', this.pauseAutoRefresh);
        window.removeEventListener('resize', this.handleResize);
    }
}

// Create and export dashboard controller instance
const dashboardController = new DashboardController();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dashboardController;
} else if (typeof window !== 'undefined') {
    window.dashboardController = dashboardController;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!dashboardController.isInitialized) {
            dashboardController.init();
        }
    });
} else {
    if (!dashboardController.isInitialized) {
        dashboardController.init();
    }
}

// Utility functions for easy access
window.refreshDashboard = () => {
    dashboardController.loadInitialData().then(() => {
        dashboardController.renderTiles();
    });
};

window.getDashboardState = () => dashboardController.getState();

// Handle page unload
window.addEventListener('beforeunload', () => {
    dashboardController.cleanup();
});