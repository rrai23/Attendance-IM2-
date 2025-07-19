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
        this.activeAnimations = new Set(); // Track active animations
        
        // Configuration
        this.config = {
            refreshRate: 60000, // 60 seconds (increased from 30)
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
            },
            employeeOverview: {
                id: 'employee-overview-tile',
                title: 'Employee Overview',
                refreshable: true
            },
            payrollSummary: {
                id: 'payroll-summary-tile',
                title: 'Payroll Summary',
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
            await this.renderTiles();
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

        // View All Activity button
        const viewAllActivityBtn = document.getElementById('view-all-activity');
        if (viewAllActivityBtn) {
            viewAllActivityBtn.addEventListener('click', () => {
                this.showAllActivity();
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
            await this.updateAttendanceCountTile();
            this.updateCharts();
            this.updatePaydayCountdown();
            await this.updateRecentActivity();
            
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
            
            // Update recent activity after loading data
            await this.updateRecentActivity();
            
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
            const today = new Date().toISOString().split('T')[0];
            console.log('Loading attendance stats for date:', today);
            
            // Use DirectFlow for all data operations
            if (window.directFlow && window.directFlow.initialized) {
                console.log('Loading attendance stats from DirectFlow');
                
                // Get attendance stats directly from backend
                this.currentStats = await window.directFlow.getAttendanceStats();
                console.log('Received stats from DirectFlow:', this.currentStats);
                
                // Get today's attendance records
                const todayRecordsResponse = await window.directFlow.getAttendanceRecords({ date: today });
                console.log('Today\'s attendance records response:', todayRecordsResponse);
                
                // Extract the actual records from the response
                let todayRecords;
                if (Array.isArray(todayRecordsResponse)) {
                    // New method returns array directly
                    todayRecords = todayRecordsResponse;
                } else if (todayRecordsResponse?.success && todayRecordsResponse?.data) {
                    // Old method returns response object
                    todayRecords = todayRecordsResponse.data.records || todayRecordsResponse.data || [];
                } else {
                    todayRecords = [];
                }
                console.log('Processed today\'s attendance records:', todayRecords);
                
                // Get employee count for calculations
                // Force refresh by adding timestamp to avoid caching issues
                const employeesResponse = await window.directFlow.getEmployees();
                console.log('Raw employees response from DirectFlow:', employeesResponse);
                const employees = employeesResponse?.success ? employeesResponse.data.employees : [];
                console.log('Extracted employees array:', employees);
                console.log('Total employees in array:', employees.length);
                
                // Let's also check what employee IDs we have
                if (Array.isArray(employees)) {
                    console.log('Employee IDs found:', employees.map(emp => `${emp.employee_id} (status: ${emp.status})`));
                }
                
                const activeEmployees = Array.isArray(employees) ? employees.filter(emp => emp.status === 'active').length : 0;
                console.log('Active employees count:', activeEmployees);
                
                // Override the total count from stats with the actual employee count
                // The stats endpoint only counts employees with user accounts, but we want ALL employees
                if (this.currentStats && activeEmployees > 0) {
                    console.log('📊 Original stats total:', this.currentStats.total);
                    this.currentStats.total = activeEmployees;
                    console.log('📊 Corrected total employee count to:', activeEmployees);
                    
                    // Recalculate attendance rate with correct total
                    const presentCount = parseInt(this.currentStats.present || 0);
                    const lateCount = parseInt(this.currentStats.late || 0);
                    this.currentStats.attendanceRate = activeEmployees > 0 
                        ? ((presentCount + lateCount) / activeEmployees * 100).toFixed(1)
                        : '0.0';
                    console.log('📊 Recalculated attendance rate:', this.currentStats.attendanceRate + '%');
                }
                
                // Enhance stats with additional data
                this.currentStats.totalEmployees = activeEmployees;
                this.currentStats.todayRecords = todayRecords;
                
                console.log('Dashboard loaded stats from DirectFlow:', this.currentStats);
            } else {
                console.error('DirectFlow not available for loading attendance stats');
                this.currentStats = this.getDefaultStats();
            }
            
        } catch (error) {
            console.error('Error loading attendance stats:', error);
            this.currentStats = this.getDefaultStats();
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
     * Get yesterday's attendance data for comparison
     */
    async getYesterdayComparison() {
        try {
            // Get yesterday's date
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            console.log('Loading yesterday\'s attendance data for comparison:', yesterdayStr);
            
            // Default comparison data
            let comparisonData = {
                present: 0,
                late: 0,
                absent: 0,
                total: 0,
                attendanceRate: 0,
                hasData: false
            };

            if (window.directFlow && window.directFlow.initialized) {
                // Get yesterday's attendance records
                const yesterdayResponse = await window.directFlow.getAttendance(null, yesterdayStr);
                
                let yesterdayRecords = [];
                if (Array.isArray(yesterdayResponse)) {
                    yesterdayRecords = yesterdayResponse;
                } else if (yesterdayResponse?.success && yesterdayResponse?.data) {
                    yesterdayRecords = yesterdayResponse.data.records || yesterdayResponse.data || [];
                }
                
                // Get employee count (should be same as today)
                const stats = this.currentStats || this.getDefaultStats();
                const totalEmployees = Number(stats.total) || Number(stats.totalEmployees) || 0;
                
                console.log('Yesterday comparison - employee count debug:', {
                    statsTotal: stats.total,
                    statsTotalEmployees: stats.totalEmployees,
                    finalTotalEmployees: totalEmployees,
                    yesterdayRecordsLength: yesterdayRecords.length
                });
                
                if (yesterdayRecords.length > 0 && totalEmployees > 0) {
                    // Process yesterday's data
                    let present = 0, late = 0, absent = 0;
                    
                    yesterdayRecords.forEach(record => {
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
                                if (record.timeIn) {
                                    present++;
                                } else {
                                    absent++;
                                }
                        }
                    });
                    
                    // Account for employees without records
                    if (yesterdayRecords.length < totalEmployees) {
                        absent += (totalEmployees - yesterdayRecords.length);
                    }
                    
                    // Sanity check: total present + late should not exceed total employees
                    const totalAttended = present + late;
                    if (totalAttended > totalEmployees) {
                        console.warn('Yesterday data issue: attended count exceeds total employees', {
                            present, late, totalAttended, totalEmployees
                        });
                        // Adjust if there's an issue with the data
                        const ratio = totalEmployees / totalAttended;
                        present = Math.floor(present * ratio);
                        late = Math.floor(late * ratio);
                    }
                    
                    const attendanceRate = totalEmployees > 0 ? ((present + late) / totalEmployees) * 100 : 0;
                    
                    console.log('Yesterday attendance rate calculation:', {
                        present,
                        late,
                        totalPresent: present + late,
                        totalEmployees,
                        rawRate: ((present + late) / totalEmployees) * 100,
                        roundedRate: Math.round(attendanceRate * 10) / 10
                    });
                    
                    // Safety check: attendance rate should never exceed 100%
                    const safeAttendanceRate = Math.min(100, Math.max(0, Math.round(attendanceRate * 10) / 10));
                    
                    comparisonData = {
                        present,
                        late,
                        absent,
                        total: totalEmployees,
                        attendanceRate: safeAttendanceRate, // Safe bounded rate
                        hasData: true
                    };
                    
                    console.log('Yesterday\'s attendance processed:', comparisonData);
                }
            }
            
            // Generate comparison HTML
            const todayStats = this.currentStats || this.getDefaultStats();
            const todayPresent = Number(todayStats.present) || 0;
            const todayLate = Number(todayStats.late) || 0;
            const todayTotal = todayPresent + todayLate;
            const yesterdayTotal = (comparisonData.present || 0) + (comparisonData.late || 0);
            
            console.log('Comparison calculation debug:', {
                todayPresent,
                todayLate,
                todayTotal,
                yesterdayPresent: comparisonData.present || 0,
                yesterdayLate: comparisonData.late || 0,
                yesterdayTotal,
                hasYesterdayData: comparisonData.hasData,
                comparisonData
            });
            
            const difference = todayTotal - yesterdayTotal;
            const diffText = difference > 0 ? `+${difference}` : `${difference}`;
            const diffClass = difference > 0 ? 'positive' : difference < 0 ? 'negative' : 'neutral';
            const diffIcon = difference > 0 ? '↗' : difference < 0 ? '↘' : '→';
            
            const html = comparisonData.hasData ? `
                <div class="attendance-comparison">
                    <div class="comparison-header">
                        <span class="comparison-title">Yesterday vs Today</span>
                        <span class="comparison-change ${diffClass}">
                            ${diffIcon} ${diffText}
                        </span>
                    </div>
                    <div class="comparison-metrics">
                        <div class="comparison-item">
                            <span class="comparison-label">Yesterday</span>
                            <span class="comparison-value">${yesterdayTotal}/${comparisonData.total || 0}</span>
                        </div>
                        <div class="comparison-item">
                            <span class="comparison-label">Yest. Rate</span>
                            <span class="comparison-value">${comparisonData.attendanceRate || 0}%</span>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="attendance-comparison no-data">
                    <div class="comparison-header">
                        <span class="comparison-title">Yesterday vs Today</span>
                    </div>
                    <div class="no-data-message">
                        <span>No yesterday data available</span>
                    </div>
                </div>
            `;
            
            return { html, data: comparisonData };
            
        } catch (error) {
            console.error('Error getting yesterday comparison:', error);
            return {
                html: `
                    <div class="attendance-comparison error">
                        <div class="comparison-header">
                            <span class="comparison-title">Yesterday vs Today</span>
                        </div>
                        <div class="error-message">
                            <span>Unable to load comparison</span>
                        </div>
                    </div>
                `,
                data: null
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
                
                // Get settings first to know the configured pay period
                const settings = await window.directFlow.getSettings();
                const payPeriod = settings?.payroll?.payPeriod || 'monthly';
                const payday = settings?.payroll?.payday || 'friday';
                
                console.log('📅 Pay period settings:', { payPeriod, payday });
                
                const backendPaydayData = await window.directFlow.getNextPayday();
                
                // Transform backend response to expected format
                if (backendPaydayData && backendPaydayData.nextPayday) {
                    const nextPayday = new Date(backendPaydayData.nextPayday);
                    const today = new Date();
                    
                    // Calculate period string based on actual pay period setting
                    let periodString;
                    if (payPeriod === 'weekly') {
                        // For weekly: show current week
                        const startOfWeek = new Date(today);
                        startOfWeek.setDate(today.getDate() - today.getDay());
                        const endOfWeek = new Date(startOfWeek);
                        endOfWeek.setDate(startOfWeek.getDate() + 6);
                        periodString = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                    } else if (payPeriod === 'biweekly') {
                        // For bi-weekly: show 2-week period
                        const startOfPeriod = new Date(today);
                        startOfPeriod.setDate(today.getDate() - (today.getDate() % 14));
                        const endOfPeriod = new Date(startOfPeriod);
                        endOfPeriod.setDate(startOfPeriod.getDate() + 13);
                        periodString = `${startOfPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                    } else {
                        // For monthly: show current month
                        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
                        const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        periodString = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                    }
                    
                    this.paydayData = {
                        date: backendPaydayData.nextPayday,
                        nextPayday: backendPaydayData.nextPayday, // Keep for backward compatibility
                        daysRemaining: backendPaydayData.daysUntilPayday || 0,
                        frequency: payPeriod, // Use actual setting instead of backend frequency
                        period: periodString,
                        hoursRemaining: (backendPaydayData.daysUntilPayday || 0) * 24,
                        amount: 0, // Default amount
                        lastPayday: null, // Will be filled from settings if available
                        payday: payday // Store the configured payday for display
                    };
                    
                    console.log('Transformed payday data with settings:', this.paydayData);
                } else {
                    console.warn('Invalid payday data from backend:', backendPaydayData);
                    this.paydayData = this.getDefaultPaydayData();
                }
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
        // Set the next payday to 7 days from now for default weekly
        const nextPayday = new Date(today);
        nextPayday.setDate(today.getDate() + 7);
        
        // Calculate period string for weekly (default assumption)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const periodString = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        return {
            date: nextPayday.toISOString().split('T')[0],
            nextPayday: nextPayday.toISOString().split('T')[0], // Keep for backward compatibility
            frequency: 'weekly', // Default to weekly for better UX
            period: periodString,
            daysRemaining: 7,
            hoursRemaining: 7 * 24,
            amount: 0, // Added amount to prevent template errors
            lastPayday: new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0],
            payday: 'friday' // Default payday
        };
    }

    /**
     * Render all dashboard tiles
     */
    async renderTiles() {
        console.log('📱 Rendering all dashboard tiles...');
        await this.renderAttendanceCountTile();
        this.renderAttendanceChartTile();
        this.renderCalendarTile();
        this.updatePaydayCountdown();
        await this.renderEmployeeOverviewTile();
        await this.renderPayrollSummaryTile();
        console.log('📱 All dashboard tiles rendered');
    }

    /**
     * Render attendance count tile
     */
    async renderAttendanceCountTile() {
        const tile = document.getElementById(this.tiles.attendanceCount.id);
        if (!tile) return;

        // Use currentStats directly since it contains the corrected data
        const stats = this.currentStats || this.getDefaultStats();
        
        // Ensure all values are numbers, not objects
        const present = Number(stats.present) || 0;
        const late = Number(stats.late) || 0;
        const absent = Number(stats.absent) || 0;
        const total = Number(stats.total) || Number(stats.totalEmployees) || 0;
        const attendanceRate = Number(stats.attendanceRate) || 0;
        
        console.log('Rendering attendance count tile with values:', { present, late, absent, total, attendanceRate });
        
        // Get yesterday's data for comparison
        const comparisonData = await this.getYesterdayComparison();
        
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
                        <div class="rate-circle" data-rate="${attendanceRate}" id="attendance-rate-circle">
                            <svg viewBox="0 0 36 36" class="circular-chart">
                                <path class="circle-bg" d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path class="circle" stroke-dasharray="0, 100" d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <text x="18" y="20.35" class="percentage">0%</text>
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
                ${comparisonData.html}
            </div>
        `;

        // Animate the circular progress
        setTimeout(() => {
            this.animateCircularProgress(tile.querySelector('.rate-circle'));
        }, 200);
    }

    /**
     * Render attendance chart tile
     */
    renderAttendanceChartTile() {
        console.log('📊 Rendering attendance insights tile...');
        const tile = document.getElementById(this.tiles.attendanceChart.id);
        if (!tile) {
            console.warn('📊 Attendance insights tile element not found');
            return;
        }

        // Get real attendance data from currentStats
        const stats = this.currentStats || this.getDefaultStats();
        const today = new Date().toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });

        // Calculate metrics from real data
        const totalPresent = Number(stats.present) || 0;
        const totalLate = Number(stats.late) || 0;
        const totalAbsent = Number(stats.absent) || 0;
        const totalEmployees = Number(stats.total) || 0;
        
        const tardinessRate = totalEmployees > 0 ? 
            Math.round((totalLate / totalEmployees) * 100) : 0;
        const onTimeRate = (totalPresent + totalLate) > 0 ? 
            Math.round((totalPresent / (totalPresent + totalLate)) * 100) : 0;

        // Determine data status
        const isDataLoaded = stats.dataFullyLoaded || (totalEmployees > 0);
        const statusClass = isDataLoaded ? 'success' : 'loading';
        const statusText = isDataLoaded ? 
            `Data updated • ${totalEmployees} employees` : 
            'Loading attendance data...';

        tile.innerHTML = `
            <div class="tile-header">
                <div class="tile-title-group">
                    <h3 class="tile-title">${this.tiles.attendanceChart.title}</h3>
                    <p class="tile-subtitle">Real-time insights and actions</p>
                </div>
                <button class="tile-refresh-btn" title="Refresh insights">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"></polyline>
                        <polyline points="1,20 1,14 7,14"></polyline>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                    </svg>
                </button>
            </div>
            <div class="tile-content">
                <div class="attendance-insights">
                    <!-- Today's Summary -->
                    <div class="insight-section">
                        <div class="insight-header">
                            <h4 class="insight-title">Today's Summary</h4>
                            <span class="insight-date">${today}</span>
                        </div>
                        <div class="insight-metrics">
                            <div class="metric-item">
                                <div class="metric-icon present">✓</div>
                                <div class="metric-details">
                                    <span class="metric-value">${totalPresent}</span>
                                    <span class="metric-label">Present</span>
                                </div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-icon late">⏰</div>
                                <div class="metric-details">
                                    <span class="metric-value">${totalLate}</span>
                                    <span class="metric-label">Late</span>
                                </div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-icon absent">✗</div>
                                <div class="metric-details">
                                    <span class="metric-value">${totalAbsent}</span>
                                    <span class="metric-label">Absent</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Performance Metrics -->
                    <div class="insight-section">
                        <div class="insight-header">
                            <h4 class="insight-title">Performance</h4>
                        </div>
                        <div class="performance-grid">
                            <div class="performance-item">
                                <div class="performance-label">Tardiness Rate</div>
                                <div class="performance-value warning">${tardinessRate}%</div>
                            </div>
                            <div class="performance-item">
                                <div class="performance-label">On-Time Rate</div>
                                <div class="performance-value success">${onTimeRate}%</div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Status -->
                    <div class="data-status">
                        <span class="status-indicator ${statusClass}"></span>
                        <span class="status-text">${statusText}</span>
                    </div>
                </div>
            </div>
        `;

        console.log('📊 Attendance insights rendered with real data:', {
            totalPresent,
            totalLate,
            totalAbsent,
            tardinessRate,
            onTimeRate,
            isDataLoaded
        });
    }

    /**
     * Render calendar tile
     */
    renderCalendarTile() {
        console.log('📅 Rendering calendar tile...');
        // Calendar HTML is already in place in dashboard.html
        // Just setup the expand button and initialize calendar
        const tile = document.getElementById(this.tiles.calendar.id);
        if (!tile) {
            console.warn('📅 Calendar tile element not found');
            return;
        }

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
        console.log('📅 Calendar tile setup complete');
    }

    /**
     * Render payday countdown tile (DISABLED - using HTML structure instead)
     */
    /*
    renderPaydayCountdownTile() {
        console.log('📅 Rendering payday countdown tile...');
        const tile = document.getElementById(this.tiles.paydayCountdown.id);
        if (!tile) {
            console.warn('📅 Payday countdown tile element not found');
            return;
        }

        const payday = this.paydayData || this.getDefaultPaydayData();
        console.log('📅 Payday data for rendering:', payday);
        
        tile.innerHTML = `
            <div class="tile-header">
                <div class="tile-title-group">
                    <h3 class="tile-title">Payday Tracker</h3>
                    <p class="tile-subtitle">Payment schedule & countdown</p>
                </div>
                <button class="tile-refresh-btn" title="Refresh payday data">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"></polyline>
                        <polyline points="1,20 1,14 7,14"></polyline>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                    </svg>
                </button>
            </div>
            <div class="tile-content">
                <div class="payday-tracker-container">
                    <div class="tracker-main">
                        <div class="tracker-number" id="countdown-days">${payday.daysRemaining}</div>
                        <div class="tracker-label">Days Remaining</div>
                        <div class="tracker-sublabel">until next payment</div>
                    </div>
                    
                    <div class="tracker-summary-box">
                        <div class="summary-content">
                            <div class="summary-number" id="countdown-days-summary">${payday.daysRemaining}</div>
                            <div class="summary-label">Days Left</div>
                        </div>
                        <div class="summary-date">
                            <div class="date-value" id="payday-date">${this.formatPaydayDate(payday.date)}</div>
                            <div class="date-label">Next Payment</div>
                        </div>
                    </div>
                    
                    <div class="payday-details">
                        <div class="detail-row">
                            <span class="detail-dot frequency"></span>
                            <span class="detail-label">Pay Schedule</span>
                            <span class="detail-value">${payday.period}</span>
                        </div>
                        ${payday.amount > 0 ? `
                            <div class="detail-row">
                                <span class="detail-dot amount"></span>
                                <span class="detail-label">Expected Amount</span>
                                <span class="detail-value">₱${payday.amount.toLocaleString()}</span>
                            </div>
                        ` : ''}
                        <div class="detail-row">
                            <span class="detail-dot timer"></span>
                            <span class="detail-label">Precise Timer</span>
                            <span class="detail-value" id="countdown-time">Loading...</span>
                        </div>
                    </div>
                    
                    <div class="progress-section">
                        <div class="progress-header">
                            <span class="progress-title">Payment Progress</span>
                            <span class="progress-percentage" id="progress-percent">0%</span>
                        </div>
                        <div class="progress-track">
                            <div class="progress-fill" id="payday-progress"></div>
                        </div>
                    </div>
                    
                    <div class="data-status">
                        <span class="status-indicator success"></span>
                        <span class="status-text">Tracker updated ${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        `;

        // Start countdown timer
        this.startPaydayCountdown();
    }
    */

    /**
     * Render employee overview tile
     */
    async renderEmployeeOverviewTile() {
        console.log('👥 Rendering employee overview tile...');
        const tile = document.getElementById(this.tiles.employeeOverview.id);
        if (!tile) {
            console.warn('👥 Employee overview tile element not found');
            return;
        }

        try {
            // Get data from dashboard - use the same pattern as injection
            const stats = this.currentStats || { total: 0, present: 0, late: 0, absent: 0 };
            const totalEmployees = Number(stats.total) || 0;
            const presentToday = Number(stats.present) || 0;
            const lateToday = Number(stats.late) || 0;
            const absentToday = Number(stats.absent) || 0;
            
            console.log('👥 Using stats:', { totalEmployees, presentToday, lateToday, absentToday });
            
            // Render tile with real data (same as working injection)
            tile.innerHTML = `
                <div class="tile-header">
                    <div class="tile-title-group">
                        <h3 class="tile-title">Employee Overview</h3>
                        <p class="tile-subtitle">Workforce insights & analytics</p>
                    </div>
                    <button class="tile-refresh-btn" title="Refresh employee data">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23,4 23,10 17,10"></polyline>
                            <polyline points="1,20 1,14 7,14"></polyline>
                            <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                        </svg>
                    </button>
                </div>
                <div class="tile-content">
                    <div class="employee-overview-container">
                        <div class="overview-main">
                            <div class="overview-number">${totalEmployees}</div>
                            <div class="overview-label">Total Employees</div>
                            <div class="overview-sublabel">active workforce</div>
                        </div>
                        
                        <div class="employee-breakdown">
                            <div class="breakdown-item">
                                <span class="breakdown-dot present"></span>
                                <span class="breakdown-label">On Time Today</span>
                                <span class="breakdown-value">${presentToday}</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-dot late"></span>
                                <span class="breakdown-label">Late Today</span>
                                <span class="breakdown-value">${lateToday}</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-dot absent"></span>
                                <span class="breakdown-label">Absent Today</span>
                                <span class="breakdown-value">${absentToday}</span>
                            </div>
                        </div>
                        
                        <div class="data-status">
                            <span class="status-indicator success"></span>
                            <span class="status-text">Data updated ${new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('👥 Employee overview tile rendered');

        } catch (error) {
            console.error('👥 Error rendering employee overview tile:', error);
            
            // Show error state
            tile.innerHTML = `
                <div class="tile-header">
                    <div class="tile-title-group">
                        <h3 class="tile-title">Employee Overview</h3>
                        <p class="tile-subtitle">Workforce insights & analytics</p>
                    </div>
                </div>
                <div class="tile-content">
                    <div class="employee-overview-container">
                        <div class="overview-main">
                            <div class="overview-number">--</div>
                            <div class="overview-label">Total Employees</div>
                            <div class="overview-sublabel">Error: ${error.message}</div>
                        </div>
                        <div class="data-status">
                            <span class="status-indicator error"></span>
                            <span class="status-text">Failed to load employee data</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Render payroll summary tile
     */
    async renderPayrollSummaryTile() {
        console.log('💰 Rendering payroll summary tile...');
        const tile = document.getElementById(this.tiles.payrollSummary.id);
        if (!tile) {
            console.warn('💰 Payroll summary tile element not found');
            return;
        }

        try {
            // Get data from dashboard - use the same pattern as injection
            const stats = this.currentStats || { total: 0 };
            const payday = this.paydayData || {};
            const totalEmployees = Number(stats.total) || 0;
            const estimatedTotal = totalEmployees * 25000; // 25k average
            
            // Format payday info
            let nextPaydayDate = 'Not set';
            let payFrequency = 'Not set';
            
            if (payday.date) {
                try {
                    nextPaydayDate = new Date(payday.date).toLocaleDateString();
                } catch (e) {
                    nextPaydayDate = 'Invalid date';
                }
            }
            
            if (payday.period) {
                payFrequency = payday.period.charAt(0).toUpperCase() + payday.period.slice(1);
            }
            
            console.log('💰 Using data:', { totalEmployees, estimatedTotal, nextPaydayDate, payFrequency });
            
            // Render tile with real data (same as working injection)
            tile.innerHTML = `
                <div class="tile-header">
                    <div class="tile-title-group">
                        <h3 class="tile-title">Payroll Summary</h3>
                        <p class="tile-subtitle">Financial insights & analytics</p>
                    </div>
                    <button class="tile-refresh-btn" title="Refresh payroll data">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23,4 23,10 17,10"></polyline>
                            <polyline points="1,20 1,14 7,14"></polyline>
                            <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                        </svg>
                    </button>
                </div>
                <div class="tile-content">
                    <div class="payroll-summary-container">
                        <div class="payroll-main">
                            <div class="payroll-amount">₱${estimatedTotal.toLocaleString()}</div>
                            <div class="payroll-label">Estimated Monthly Total</div>
                            <div class="payroll-sublabel">based on current rates</div>
                        </div>
                        
                        <div class="payroll-breakdown">
                            <div class="breakdown-item">
                                <span class="breakdown-dot payroll"></span>
                                <span class="breakdown-label">Next Payday</span>
                                <span class="breakdown-value">${nextPaydayDate}</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-dot frequency"></span>
                                <span class="breakdown-label">Pay Frequency</span>
                                <span class="breakdown-value">${payFrequency}</span>
                            </div>
                        </div>
                        
                        <div class="data-status">
                            <span class="status-indicator success"></span>
                            <span class="status-text">Data updated ${new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('💰 Payroll summary tile rendered');

        } catch (error) {
            console.error('💰 Error rendering payroll summary tile:', error);
            
            // Show error state
            tile.innerHTML = `
                <div class="tile-header">
                    <div class="tile-title-group">
                        <h3 class="tile-title">Payroll Summary</h3>
                        <p class="tile-subtitle">Financial insights & analytics</p>
                    </div>
                </div>
                <div class="tile-content">
                    <div class="payroll-summary-container">
                        <div class="payroll-main">
                            <div class="payroll-amount">₱--</div>
                            <div class="payroll-label">Estimated Monthly Total</div>
                            <div class="payroll-sublabel">Error: ${error.message}</div>
                        </div>
                        <div class="data-status">
                            <span class="status-indicator error"></span>
                            <span class="status-text">Failed to load payroll data</span>
                        </div>
                    </div>
                </div>
            `;
        }
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
        // Use currentStats directly since it contains the corrected data
        const stats = this.currentStats || this.getDefaultStats();
        
        return {
            present: Number(stats.present) || 0,
            late: Number(stats.late) || 0,
            absent: Number(stats.absent) || 0,
            onLeave: Number(stats.onLeave) || 0
        };
    }

    /**
     * Update attendance count tile
     */
    async updateAttendanceCountTile() {
        try {
            const tile = document.getElementById('attendance-count-tile');
            if (!tile) {
                // If tile doesn't exist, render it completely
                await this.renderAttendanceCountTile();
                return;
            }

            // Check if tile has content - if not, render completely
            const existingContent = tile.querySelector('.tile-content');
            if (!existingContent) {
                await this.renderAttendanceCountTile();
                return;
            }

            // If tile exists and has content, just update the values without rebuilding HTML
            const stats = this.currentStats || this.getDefaultStats();
            const present = Number(stats.present) || 0;
            const late = Number(stats.late) || 0;
            const absent = Number(stats.absent) || 0;
            const total = Number(stats.total) || Number(stats.totalEmployees) || 0;
            const attendanceRate = Number(stats.attendanceRate) || 0;

            // Update the main stat number
            const statNumber = tile.querySelector('.stat-number');
            if (statNumber) statNumber.textContent = present + late;

            const statSublabel = tile.querySelector('.stat-sublabel');
            if (statSublabel) statSublabel.textContent = `out of ${total} employees`;

            // Update breakdown values
            const presentValue = tile.querySelector('.breakdown-item.present .breakdown-value');
            if (presentValue) presentValue.textContent = present;

            const lateValue = tile.querySelector('.breakdown-item.late .breakdown-value');
            if (lateValue) lateValue.textContent = late;

            const absentValue = tile.querySelector('.breakdown-item.absent .breakdown-value');
            if (absentValue) absentValue.textContent = absent;

            // Update the circle rate data attribute and animate if rate changed
            const rateCircle = tile.querySelector('.rate-circle');
            const currentRate = parseFloat(rateCircle?.dataset.rate) || 0;
            
            if (rateCircle && Math.abs(currentRate - attendanceRate) > 0.1) {
                rateCircle.dataset.rate = attendanceRate;
                // Only animate if there's a significant change
                setTimeout(() => {
                    this.animateCircularProgress(rateCircle);
                }, 100);
            }

            // Update comparison data
            const comparisonData = await this.getYesterdayComparison();
            const comparisonContainer = tile.querySelector('.attendance-comparison');
            if (comparisonContainer && comparisonData.html) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = comparisonData.html;
                const newComparison = tempDiv.firstElementChild;
                if (newComparison) {
                    comparisonContainer.replaceWith(newComparison);
                }
            }

            console.log('Updated attendance count tile values without full re-render');
        } catch (error) {
            console.error('Error updating attendance count tile, falling back to full render:', error);
            await this.renderAttendanceCountTile();
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
     * Update payday countdown - uses the same data as other cards
     */
    async updatePaydayCountdown() {
        try {
            const tile = document.getElementById('payday-countdown-tile');
            if (!tile) return;

            // Use the same payday data that other cards use
            const payday = this.paydayData || this.getDefaultPaydayData();
            
            console.log('📅 Using payday data for countdown:', payday);

            // Get settings for period display
            const settings = await window.directFlow.getSettings();
            const payPeriod = settings?.payroll?.payPeriod || settings?.payPeriod || 'biweekly';

            // Update the existing countdown elements
            const countdownNumber = tile.querySelector('#countdown-days');
            const paydayDate = tile.querySelector('#payday-date');
            const paydayPeriodEl = tile.querySelector('#payday-period');
            const progressFill = tile.querySelector('#payday-progress');
            const countdownTime = tile.querySelector('#countdown-time');

            // Use the days remaining from the loaded data
            if (countdownNumber) {
                countdownNumber.textContent = payday.daysRemaining || 0;
            }

            // Use the payday date from the loaded data
            if (paydayDate) {
                if (payday.date || payday.nextPayday) {
                    const nextPaydayDate = new Date(payday.date || payday.nextPayday);
                    paydayDate.textContent = nextPaydayDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                    });
                } else {
                    paydayDate.textContent = 'Not available';
                }
            }

            // Use the period from settings
            if (paydayPeriodEl) {
                const periodDisplayNames = {
                    'weekly': 'Weekly',
                    'biweekly': 'Bi-weekly',
                    'monthly': 'Monthly'
                };
                paydayPeriodEl.textContent = periodDisplayNames[payPeriod] || periodDisplayNames[payday.frequency] || 'Bi-weekly';
            }

            // Calculate progress based on the current pay period
            let progressPercent = 0;
            const today = new Date();
            
            if (payPeriod === 'weekly') {
                const dayOfWeek = today.getDay();
                progressPercent = (dayOfWeek / 7) * 100;
            } else if (payPeriod === 'biweekly') {
                // Use utils to get pay period if available
                if (window.utils && window.utils.getPayPeriod) {
                    const period = window.utils.getPayPeriod(today, 'biweekly');
                    const totalDays = Math.ceil((period.end - period.start) / (1000 * 60 * 60 * 24));
                    const elapsedDays = Math.floor((today - period.start) / (1000 * 60 * 60 * 24));
                    progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
                } else {
                    // Fallback calculation
                    const dayOfMonth = today.getDate();
                    progressPercent = Math.min(100, (dayOfMonth / 30) * 100);
                }
            } else if (payPeriod === 'monthly') {
                const dayOfMonth = today.getDate();
                const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                progressPercent = (dayOfMonth / daysInMonth) * 100;
            }

            if (progressFill) {
                progressFill.style.width = `${progressPercent.toFixed(1)}%`;
            }

            // Update countdown timer (hours:minutes:seconds until midnight)
            const updateTimer = () => {
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                
                const timeLeft = tomorrow.getTime() - now.getTime();
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                if (countdownTime) {
                    countdownTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            };

            updateTimer();
            
            // Update timer every second
            if (this.countdownTimer) {
                clearInterval(this.countdownTimer);
            }
            this.countdownTimer = setInterval(updateTimer, 1000);

        } catch (error) {
            console.error('Error updating payday countdown:', error);
        }
    }

    /**
     * Get next occurrence of a specific weekday
     * @param {Date} fromDate - Starting date
     * @param {string} weekday - Target weekday ('monday', 'tuesday', etc.)
     * @returns {Date} Next occurrence of the weekday
     */
    getNextWeekday(fromDate, weekday) {
        const weekdays = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
        };
        
        const targetDay = weekdays[weekday.toLowerCase()] || 5; // Default to Friday
        const date = new Date(fromDate);
        const currentDay = date.getDay();
        
        // Calculate days until next occurrence
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) {
            daysUntil += 7; // Next week
        }
        
        date.setDate(date.getDate() + daysUntil);
        return date;
    }

    /**
     * Update recent activity panel with real-time data
     */
    async updateRecentActivity() {
        try {
            console.log('📋 Updating recent activity...');
            console.log('📋 Current payday data:', this.paydayData);
            console.log('📋 Current stats:', this.currentStats);
            
            const activityList = document.getElementById('activity-list');
            if (!activityList) {
                console.warn('Activity list element not found');
                return;
            }

            // Generate activity items from various data sources
            const activities = await this.generateRecentActivities();
            console.log('📋 Generated activities:', activities);
            
            // Clear current content
            activityList.innerHTML = '';
            
            // Add each activity item
            activities.forEach(activity => {
                const activityItem = this.createActivityItem(activity);
                activityList.appendChild(activityItem);
            });
            
            console.log(`📋 Updated recent activity with ${activities.length} items`);
            
        } catch (error) {
            console.error('Error updating recent activity:', error);
            // Show error state
            const activityList = document.getElementById('activity-list');
            if (activityList) {
                activityList.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-icon">⚠️</div>
                        <div class="activity-content">
                            <div class="activity-text">Unable to load recent activity</div>
                            <div class="activity-time">Just now</div>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Generate recent activity items from various data sources
     */
    async generateRecentActivities() {
        const activities = [];
        
        try {
            console.log('📋 Generating activities with data:', {
                paydayData: this.paydayData,
                currentStats: this.currentStats
            });

            // Activity 1: Payday information
            if (this.paydayData && this.paydayData.daysRemaining !== undefined) {
                const daysLeft = this.paydayData.daysRemaining;
                let paydayIcon = '💰';
                let paydayText = '';
                let paydayTime = '';
                
                if (daysLeft === 0) {
                    paydayIcon = '🎉';
                    paydayText = 'Payday is today!';
                    paydayTime = 'Today';
                } else if (daysLeft === 1) {
                    paydayIcon = '📅';
                    paydayText = 'Payday is tomorrow';
                    paydayTime = '1 day left';
                } else if (daysLeft <= 7) {
                    paydayIcon = '📅';
                    paydayText = `Payday in ${daysLeft} days`;
                    paydayTime = `${daysLeft} days left`;
                } else {
                    paydayIcon = '💼';
                    paydayText = `Next payday in ${daysLeft} days`;
                    paydayTime = `${daysLeft} days left`;
                }
                
                activities.push({
                    icon: paydayIcon,
                    text: paydayText,
                    time: paydayTime,
                    priority: daysLeft <= 1 ? 'high' : 'normal'
                });
                console.log('📋 Added payday activity:', activities[activities.length - 1]);
            } else {
                // Add default payday activity when data is missing
                activities.push({
                    icon: '💼',
                    text: 'Payday information loading...',
                    time: 'Checking...',
                    priority: 'normal'
                });
                console.log('📋 Added default payday activity (no data)');
            }

            // Activity 2: Employee attendance status
            if (this.currentStats && this.currentStats.total) {
                const totalEmployees = this.currentStats.total;
                const presentToday = this.currentStats.present || 0;
                const absentToday = totalEmployees - presentToday;
                
                if (absentToday > 0) {
                    activities.push({
                        icon: '👥',
                        text: `${absentToday} employee${absentToday > 1 ? 's' : ''} absent today`,
                        time: 'Today',
                        priority: absentToday > 3 ? 'high' : 'normal'
                    });
                    console.log('📋 Added absence activity');
                }
                
                if (presentToday > 0) {
                    activities.push({
                        icon: '✅',
                        text: `${presentToday} employee${presentToday > 1 ? 's' : ''} present today`,
                        time: 'Today',
                        priority: 'normal'
                    });
                    console.log('📋 Added present activity');
                }
            } else {
                // Add default attendance activity when data is missing
                activities.push({
                    icon: '👥',
                    text: 'Attendance data loading...',
                    time: 'Checking...',
                    priority: 'normal'
                });
                console.log('📋 Added default attendance activity (no data)');
            }

            // Activity 3: System status
            const now = new Date();
            const currentHour = now.getHours();
            
            if (currentHour >= 9 && currentHour < 10) {
                activities.push({
                    icon: '🌅',
                    text: 'Morning shift check-in period',
                    time: 'Now',
                    priority: 'normal'
                });
            } else if (currentHour >= 17 && currentHour < 18) {
                activities.push({
                    icon: '🌆',
                    text: 'Evening shift check-out period',
                    time: 'Now',
                    priority: 'normal'
                });
            }

            // Activity 4: Weekly/Monthly insights
            const dayOfWeek = now.getDay();
            if (dayOfWeek === 1) { // Monday
                activities.push({
                    icon: '📊',
                    text: 'Weekly attendance report available',
                    time: 'This week',
                    priority: 'normal'
                });
            }
            
            if (now.getDate() === 1) { // First day of month
                activities.push({
                    icon: '📈',
                    text: 'Monthly payroll summary ready',
                    time: 'This month',
                    priority: 'normal'
                });
            }

            // Activity 5: Settings & maintenance
            if (window.directFlow && window.directFlow.initialized) {
                activities.push({
                    icon: '⚡',
                    text: 'System running smoothly',
                    time: 'Real-time',
                    priority: 'low'
                });
            } else {
                activities.push({
                    icon: '⚠️',
                    text: 'System connection issue',
                    time: 'Just now',
                    priority: 'high'
                });
            }

            // Sort by priority (high first) and limit to 5 items
            activities.sort((a, b) => {
                const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });

            // Ensure we always have at least one activity
            if (activities.length === 0) {
                activities.push({
                    icon: '🔄',
                    text: 'Dashboard is ready',
                    time: 'Just now',
                    priority: 'normal'
                });
                console.log('📋 Added fallback activity (empty list)');
            }

            console.log('📋 Final activities list:', activities);
            return activities.slice(0, 5);
            
        } catch (error) {
            console.error('Error generating activities:', error);
            // Return default activity
            return [{
                icon: '🔄',
                text: 'Dashboard loaded successfully',
                time: 'Just now',
                priority: 'normal'
            }];
        }
    }

    /**
     * Create HTML element for activity item
     */
    createActivityItem(activity) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-item';
        
        // Add priority class if high priority
        if (activity.priority === 'high') {
            activityDiv.classList.add('activity-high-priority');
        }
        
        activityDiv.innerHTML = `
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `;
        
        return activityDiv;
    }

    /**
     * Show all activity in an expanded view
     */
    async showAllActivity() {
        try {
            console.log('📋 Showing all activity...');
            
            // Generate more comprehensive activities
            const allActivities = await this.generateAllActivities();
            
            // Create modal or expanded view
            const modal = document.createElement('div');
            modal.className = 'activity-modal';
            modal.innerHTML = `
                <div class="activity-modal-content">
                    <div class="activity-modal-header">
                        <h3>All Recent Activity</h3>
                        <button class="activity-modal-close">&times;</button>
                    </div>
                    <div class="activity-modal-body">
                        ${allActivities.map(activity => `
                            <div class="activity-item ${activity.priority === 'high' ? 'activity-high-priority' : ''}">
                                <div class="activity-icon">${activity.icon}</div>
                                <div class="activity-content">
                                    <div class="activity-text">${activity.text}</div>
                                    <div class="activity-time">${activity.time}</div>
                                    ${activity.description ? `<div class="activity-description">${activity.description}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            // Add modal styles
            const style = document.createElement('style');
            style.textContent = `
                .activity-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .activity-modal-content {
                    background: var(--bg-primary);
                    border-radius: var(--radius-lg);
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow: hidden;
                    box-shadow: var(--shadow-lg);
                }
                .activity-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-lg);
                    border-bottom: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                }
                .activity-modal-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                }
                .activity-modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-secondary);
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-sm);
                    transition: all var(--transition-fast);
                }
                .activity-modal-close:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }
                .activity-modal-body {
                    padding: 0;
                    max-height: 60vh;
                    overflow-y: auto;
                }
                .activity-description {
                    font-size: var(--font-size-sm);
                    color: var(--text-secondary);
                    margin-top: var(--spacing-xs);
                    font-style: italic;
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(modal);
            
            // Close modal functionality
            const closeBtn = modal.querySelector('.activity-modal-close');
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                document.head.removeChild(style);
            });
            
            // Close on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    document.head.removeChild(style);
                }
            });
            
        } catch (error) {
            console.error('Error showing all activity:', error);
            alert('Unable to load all activities at this time.');
        }
    }

    /**
     * Generate comprehensive activity list for expanded view
     */
    async generateAllActivities() {
        const activities = await this.generateRecentActivities();
        
        // Add more detailed activities
        const additionalActivities = [
            {
                icon: '🛠️',
                text: 'Dashboard initialized',
                time: 'On page load',
                description: 'All dashboard components loaded successfully',
                priority: 'low'
            },
            {
                icon: '📊',
                text: 'Data synchronization active',
                time: 'Continuous',
                description: 'Real-time updates from attendance system',
                priority: 'normal'
            },
            {
                icon: '🔒',
                text: 'Security check completed',
                time: 'Session start',
                description: 'User authentication verified',
                priority: 'normal'
            }
        ];
        
        return [...activities, ...additionalActivities];
    }

    /**
     * Get next biweekly payday
     * @param {Date} fromDate - Starting date
     * @param {string} weekday - Payday weekday
     * @returns {Date} Next biweekly payday
     */
    getNextBiweeklyPayday(fromDate, weekday) {
        // Use a reference date (e.g., first payday of 2025)
        const referenceDate = new Date(2025, 0, 3); // January 3, 2025 (Friday)
        const weekdays = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
        };
        
        // Adjust reference date to match the desired weekday
        const targetDay = weekdays[weekday.toLowerCase()] || 5;
        const refDay = referenceDate.getDay();
        let adjustment = targetDay - refDay;
        if (adjustment !== 0) {
            referenceDate.setDate(referenceDate.getDate() + adjustment);
        }
        
        // Calculate weeks since reference date
        const daysDiff = Math.floor((fromDate - referenceDate) / (1000 * 60 * 60 * 24));
        const weeksSinceRef = Math.floor(daysDiff / 7);
        const biweeksSinceRef = Math.floor(weeksSinceRef / 2);
        
        // Calculate next biweekly payday
        let nextPayday = new Date(referenceDate);
        nextPayday.setDate(referenceDate.getDate() + (biweeksSinceRef * 14));
        
        // If this payday has already passed, get the next one
        if (nextPayday <= fromDate) {
            nextPayday.setDate(nextPayday.getDate() + 14);
        }
        
        return nextPayday;
    }

    /**
     * Get next monthly payday (last working day of month)
     * @param {Date} fromDate - Starting date
     * @returns {Date} Next monthly payday
     */
    getNextMonthlyPayday(fromDate) {
        const date = new Date(fromDate);
        
        // Get last day of current month
        let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        // If last day is weekend, move to previous Friday
        while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
            lastDay.setDate(lastDay.getDate() - 1);
        }
        
        // If this month's payday has passed, get next month's
        if (lastDay <= fromDate) {
            lastDay = new Date(date.getFullYear(), date.getMonth() + 2, 0);
            while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
                lastDay.setDate(lastDay.getDate() - 1);
            }
        }
        
        return lastDay;
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
        // Use currentStats directly since it contains the corrected data
        const stats = this.currentStats || this.getDefaultStats();
        
        return {
            present: Number(stats.present) || 0,
            late: Number(stats.late) || 0,
            absent: Number(stats.absent) || 0,
            onLeave: Number(stats.onLeave) || 0
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

        // Check if animation is already running for this element
        const elementId = element.id || element.className;
        if (this.activeAnimations.has(elementId)) {
            console.log('Animation already running for', elementId);
            return;
        }

        const rate = parseFloat(element.dataset.rate) || 0;
        const circle = element.querySelector('.circle');
        const percentage = element.querySelector('.percentage');
        
        if (!circle || !percentage) return;

        // Mark animation as active
        this.activeAnimations.add(elementId);

        // Ensure clean initial state by forcing a reflow
        circle.style.strokeDasharray = '0, 100';
        percentage.textContent = '0%';
        
        // Force reflow to ensure the initial state is applied
        element.offsetHeight;
        
        // Use a more consistent animation approach
        const duration = 1200; // Slightly longer for smoother feel
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easeOutQuart for even smoother animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentRate = rate * easeOutQuart;
            
            // Update circle stroke
            circle.style.strokeDasharray = `${currentRate}, 100`;
            
            // Update percentage text
            percentage.textContent = `${Math.round(currentRate)}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete, remove from active set
                this.activeAnimations.delete(elementId);
            }
        };
        
        // Start animation immediately
        requestAnimationFrame(animate);
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
        
        // Get stats from currentStats.today or fall back to the main currentStats
        const stats = this.currentStats?.today || this.currentStats || this.getDefaultStats().today;
        
        console.log('Stats being used for display:', stats);
        
        // 🎯 CRITICAL FIX: Don't update UI if attendance data isn't fully loaded yet
        // This prevents the brief flash of incorrect "absent" counts
        const totalEmployees = Number(stats.total || stats.totalEmployees) || 0;
        const present = Number(stats.present || stats.presentToday) || 0;
        const late = Number(stats.late || stats.tardyToday) || 0;
        const attendanceRate = Number(stats.attendanceRate || stats.presentPercentage) || 0;
        
        // If we have employees but no attendance data processed yet, don't update the UI
        // This prevents showing "1 absent" when data is still loading
        if (totalEmployees > 0 && present === 0 && late === 0 && !stats.dataFullyLoaded) {
            console.log('🎯 Skipping UI update - attendance data not fully loaded yet');
            console.log('Current state:', { totalEmployees, present, late, dataFullyLoaded: stats.dataFullyLoaded });
            return;
        }
        
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
                    await this.renderAttendanceCountTile();
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
                    this.updatePaydayCountdown();
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
            await this.updateAttendanceCountTile();
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
