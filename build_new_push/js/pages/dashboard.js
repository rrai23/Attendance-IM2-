// Dashboard page functionality for the Bricks Attendance System
class DashboardPage {
    constructor() {
        this.dataStore = DataStore.getInstance();
        this.payroll = new Payroll();
        this.chartsInstance = Charts.create();
        this.calendarInstance = null;
        
        // Store chart instances
        this.attendanceChart = null;
        
        // Update intervals
        this.updateIntervals = [];
        
        this.init();
    }

    /**
     * Initialize dashboard
     */
    async init() {
        // Check authentication
        Auth.requireAuth('admin');
        
        // Initialize components
        await this.initializeComponents();
        await this.loadDashboardData();
        this.setupEventListeners();
        this.setupAutoUpdates();
        
        console.log('Dashboard initialized');
    }

    /**
     * Initialize dashboard components
     */
    async initializeComponents() {
        // Initialize calendar
        this.initializeCalendar();
        
        // Set user name
        this.updateUserInfo();
        
        // Initialize charts
        this.initializeCharts();
    }

    /**
     * Initialize calendar component
     */
    initializeCalendar() {
        this.calendarInstance = Calendar.create('calendarContainer', {
            showNotes: true,
            enableNoteCreation: true,
            onDateClick: (date, notes) => {
                console.log('Date clicked:', date, notes);
            },
            onNoteAdd: (date, content) => {
                console.log('Note added:', date, content);
            },
            onNoteUpdate: (date, content) => {
                console.log('Note updated:', date, content);
            },
            onNoteDelete: (date) => {
                console.log('Note deleted:', date);
            }
        });
        
        // Store globally for modal access
        window.calendarInstance = this.calendarInstance;
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        // Initialize attendance chart with sample data
        const sampleData = this.chartsInstance.generateSampleData('weekly');
        this.attendanceChart = this.chartsInstance.createWeeklyAttendanceChart('attendanceChart', sampleData);
        
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
     * Setup event listeners
     */
    setupEventListeners() {
        // Logout button
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }

        // Tile click handlers
        this.setupTileClickHandlers();
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            // Theme toggle is handled by the theming system
            console.log('Theme toggle found and will be handled by theming system');
        }
    }

    /**
     * Setup tile click handlers for interactive elements
     */
    setupTileClickHandlers() {
        // Attendance count tile - could navigate to detailed view
        const attendanceCountTile = document.getElementById('attendanceCountTile');
        if (attendanceCountTile) {
            attendanceCountTile.addEventListener('click', () => {
                // Could navigate to a detailed attendance view
                console.log('Attendance count tile clicked');
            });
        }

        // Statistics chart tile - could expand or show details
        const statisticsChartTile = document.getElementById('statisticsChartTile');
        if (statisticsChartTile) {
            statisticsChartTile.addEventListener('click', () => {
                // Could show expanded chart view
                console.log('Statistics chart tile clicked');
            });
        }

        // Payday tile - could show detailed payroll info
        const paydayTile = document.getElementById('paydayTile');
        if (paydayTile) {
            paydayTile.addEventListener('click', () => {
                // Could navigate to payroll details
                console.log('Payday tile clicked');
            });
        }
    }

    /**
     * Load and display dashboard data
     */
    async loadDashboardData() {
        try {
            await Promise.all([
                this.updateAttendanceStats(),
                this.updateAttendanceChart(),
                this.updatePaydayCountdown()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    /**
     * Update attendance statistics
     */
    async updateAttendanceStats() {
        try {
            const stats = await this.dataStore.getOverallStats();
            
            // Update present count
            const presentCount = document.getElementById('presentCount');
            if (presentCount) {
                this.animateNumber(presentCount, stats.presentCount || 0);
            }

            // Update absent count
            const absentCount = document.getElementById('absentCount');
            if (absentCount) {
                this.animateNumber(absentCount, stats.absentCount || 0);
            }

            // Update late count
            const lateCount = document.getElementById('lateCount');
            if (lateCount) {
                this.animateNumber(lateCount, stats.lateCount || 0);
            }
        } catch (error) {
            console.error('Error updating attendance stats:', error);
        }
    }

    /**
     * Update attendance chart
     */
    async updateAttendanceChart() {
        try {
            // Generate or load real attendance data
            const chartData = await this.generateAttendanceChartData();
            
            if (this.attendanceChart) {
                this.chartsInstance.updateChart('attendanceChart', chartData);
            } else {
                this.attendanceChart = this.chartsInstance.createWeeklyAttendanceChart('attendanceChart', chartData);
            }
        } catch (error) {
            console.error('Error updating attendance chart:', error);
            // Fallback to sample data
            const sampleData = this.chartsInstance.generateSampleData('weekly');
            if (this.attendanceChart) {
                this.chartsInstance.updateChart('attendanceChart', sampleData);
            }
        }
    }

    /**
     * Generate attendance chart data from real data
     */
    async generateAttendanceChartData() {
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 6); // Last 7 days
        
        const attendanceData = await this.dataStore.getAttendance({
            startDate: lastWeek.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
        });

        // Group by day of week
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const presentData = new Array(5).fill(0);
        const absentData = new Array(5).fill(0);
        const lateData = new Array(5).fill(0);

        attendanceData.forEach(record => {
            const recordDate = new Date(record.date);
            const dayIndex = recordDate.getDay() - 1; // Convert to 0-4 (Mon-Fri)
            
            if (dayIndex >= 0 && dayIndex < 5) {
                switch (record.status) {
                    case 'present':
                        presentData[dayIndex]++;
                        break;
                    case 'absent':
                        absentData[dayIndex]++;
                        break;
                    case 'late':
                        lateData[dayIndex]++;
                        break;
                }
            }
        });

        return {
            labels: dayLabels,
            present: presentData,
            absent: absentData,
            late: lateData
        };
    }

    /**
     * Update payday countdown
     */
    async updatePaydayCountdown() {
        try {
            const paydayInfo = await this.payroll.calculatePaydayCountdown();
            
            // Update days left
            const daysLeft = document.getElementById('daysLeft');
            if (daysLeft) {
                this.animateNumber(daysLeft, paydayInfo.daysUntilPayday);
            }

            // Update payday date
            const paydayDate = document.getElementById('paydayDate');
            if (paydayDate) {
                const date = new Date(paydayInfo.nextPayday);
                paydayDate.textContent = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                });
            }

            // Update estimated amount
            const paydayAmount = document.getElementById('paydayAmount');
            if (paydayAmount) {
                paydayAmount.textContent = this.payroll.formatCurrency(paydayInfo.estimatedAmount);
            }
        } catch (error) {
            console.error('Error updating payday countdown:', error);
            
            // Fallback values
            const daysLeft = document.getElementById('daysLeft');
            const paydayDate = document.getElementById('paydayDate');
            const paydayAmount = document.getElementById('paydayAmount');
            
            if (daysLeft) daysLeft.textContent = '0';
            if (paydayDate) paydayDate.textContent = 'Not available';
            if (paydayAmount) paydayAmount.textContent = '₱0.00';
        }
    }

    /**
     * Animate number changes
     */
    animateNumber(element, targetValue, duration = 1000) {
        const startValue = parseInt(element.textContent) || 0;
        const difference = targetValue - startValue;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (difference * easeOut));
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Setup automatic updates
     */
    setupAutoUpdates() {
        // Update attendance stats every 5 minutes
        const statsInterval = setInterval(() => {
            this.updateAttendanceStats();
        }, 5 * 60 * 1000);
        
        // Update chart every 10 minutes
        const chartInterval = setInterval(() => {
            this.updateAttendanceChart();
        }, 10 * 60 * 1000);
        
        // Update payday countdown every hour
        const paydayInterval = setInterval(() => {
            this.updatePaydayCountdown();
        }, 60 * 60 * 1000);

        // Store intervals for cleanup
        this.updateIntervals.push(statsInterval, chartInterval, paydayInterval);
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
     * Refresh dashboard data
     */
    async refreshDashboard() {
        try {
            // Show loading state on tiles
            this.showLoadingState(true);
            
            // Reload all data
            await this.loadDashboardData();
            
            // Refresh calendar
            if (this.calendarInstance) {
                await this.calendarInstance.refresh();
            }
            
            // Hide loading state
            this.showLoadingState(false);
            
            console.log('Dashboard refreshed');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showLoadingState(false);
        }
    }

    /**
     * Show/hide loading state
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
     * Get dashboard summary for other components
     */
    async getDashboardSummary() {
        try {
            const stats = await this.dataStore.getOverallStats();
            const paydayInfo = await this.payroll.calculatePaydayCountdown();
            
            return {
                attendance: {
                    present: stats.presentCount,
                    absent: stats.absentCount,
                    late: stats.lateCount,
                    total: stats.totalEmployees
                },
                payday: {
                    daysLeft: paydayInfo.daysUntilPayday,
                    nextDate: paydayInfo.nextPayday,
                    estimatedAmount: paydayInfo.estimatedAmount
                }
            };
        } catch (error) {
            console.error('Error getting dashboard summary:', error);
            return null;
        }
    }

    /**
     * Navigate to other pages
     */
    navigateToAnalytics() {
        window.location.href = 'analytics.html';
    }

    navigateToSettings() {
        window.location.href = 'settings.html';
    }

    /**
     * Cleanup when leaving page
     */
    cleanup() {
        // Clear intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals = [];
        
        // Destroy charts
        if (this.chartsInstance) {
            this.chartsInstance.destroyAllCharts();
        }
        
        // Cleanup calendar
        if (this.calendarInstance) {
            this.calendarInstance.destroy();
        }
    }

    /**
     * Handle visibility change (tab switching)
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause updates
            this.cleanup();
        } else {
            // Page is visible, resume updates
            this.setupAutoUpdates();
            this.refreshDashboard();
        }
    }
}

// Initialize dashboard page when DOM is ready
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dashboardPage = new DashboardPage();
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (window.dashboardPage) {
                window.dashboardPage.handleVisibilityChange();
            }
        });
        
        // Handle before unload
        window.addEventListener('beforeunload', () => {
            if (window.dashboardPage) {
                window.dashboardPage.cleanup();
            }
        });
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardPage;
} else if (typeof window !== 'undefined') {
    window.DashboardPage = DashboardPage;
}
