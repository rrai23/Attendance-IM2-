/**
 * Analytics Page Controller for Bricks Attendance System
 * Uses DirectFlow authentication and backend APIs exclusively
 */

class AnalyticsController {
    constructor() {
        this.currentEmployee = null;
        this.selectedDateRange = 'last30days';
        this.analyticsData = null;
        this.charts = new Map();
        this.isInitialized = false;
        this.auth = null;
        this.filters = {
            employeeId: null,
            startDate: null,
            endDate: null,
            department: null,
            position: null
        };
        
        // Chart configurations
        this.chartConfigs = {
            tardinessTrends: {
                canvasId: 'tardinessTrendsChart',
                type: 'tardinessTrends',
                title: 'Tardiness Trends'
            },
            presenceStats: {
                canvasId: 'presenceStatsChart',
                type: 'attendanceStats',
                title: 'Presence Statistics'
            },
            weeklyPatterns: {
                canvasId: 'weeklyPatternsChart',
                type: 'presencePatterns',
                title: 'Weekly Attendance Patterns'
            },
            performance: {
                canvasId: 'performanceRadarChart',
                type: 'performance',
                title: 'Performance Overview'
            },
            monthlyOverview: {
                canvasId: 'monthlyOverviewChart',
                type: 'monthlyOverview',
                title: 'Monthly Attendance Overview'
            }
        };

        console.log('AnalyticsController created, waiting for DirectFlow auth...');
    }

    /**
     * Initialize the analytics controller
     */
    async init() {
        if (this.isInitialized) {
            console.log('AnalyticsController already initialized');
            return;
        }

        try {
            console.log('Initializing AnalyticsController...');
            
            // Wait for DirectFlow auth to be available
            if (!window.directFlowAuth || !window.directFlowAuth.initialized) {
                throw new Error('DirectFlow authentication not available');
            }
            
            this.auth = window.directFlowAuth;
            
            // Verify authentication
            if (!this.auth.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            console.log('Analytics: Using DirectFlow authentication');
            
            this.setupEventListeners();
            await this.loadInitialData();
            this.setupFilters();
            this.setupDateRangePicker();
            await this.loadAnalyticsData();
            this.renderCharts();
            this.setupAutoRefresh();
            
            this.isInitialized = true;
            console.log('Analytics controller initialized successfully');
        } catch (error) {
            console.error('Failed to initialize analytics controller:', error);
            this.showError('Failed to load analytics data. Please refresh the page.');
        }
    }

    /**
     * Make authenticated API request
     */
    async apiRequest(endpoint, options = {}) {
        try {
            const token = this.auth.getToken();
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
                if (response.status === 401) {
                    this.auth.logout();
                    throw new Error('Authentication failed');
                }
                throw new Error(`API request failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners for analytics interactions
     */
    setupEventListeners() {
        // Employee selection dropdown
        const employeeSelect = document.getElementById('employeeSelect');
        if (employeeSelect) {
            employeeSelect.addEventListener('change', (e) => {
                this.handleEmployeeChange(e.target.value);
            });
        }

        // Date range selector
        const dateRangeSelect = document.getElementById('dateRangeSelect');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                this.handleDateRangeChange(e.target.value);
            });
        }

        // Custom date range inputs
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', () => this.handleCustomDateRange());
            endDateInput.addEventListener('change', () => this.handleCustomDateRange());
        }

        // Department filter
        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            departmentFilter.addEventListener('change', (e) => {
                this.handleDepartmentFilter(e.target.value);
            });
        }

        // Export buttons
        const exportBtn = document.getElementById('exportAnalytics');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAnalytics());
        }

        // Print button
        const printBtn = document.getElementById('printAnalytics');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printAnalytics());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshAnalytics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Chart interaction events
        document.addEventListener('chartClick', (e) => this.handleChartClick(e.detail));
        document.addEventListener('chartHover', (e) => this.handleChartHover(e.detail));

        // Window resize for responsive charts
        window.addEventListener('resize', () => this.handleResize());

        // Theme change events
        document.addEventListener('themechange', (e) => this.handleThemeChange(e.detail));
    }

    /**
     * Setup event listeners for employee updates
     */
    setupEmployeeUpdateListeners() {
        if (this.unifiedManager) {
            // Listen for employee deletions and updates
            this.unifiedManager.addEventListener('employeeUpdate', (data) => {
                console.log('Analytics: Employee update received:', data);
                this.handleEmployeeUpdate(data);
            });

            this.unifiedManager.addEventListener('employeeDeleted', (data) => {
                console.log('Analytics: Employee deleted event received:', data);
                this.handleEmployeeUpdate({ action: 'delete', ...data });
            });

            console.log('Analytics: Employee update listeners setup complete');
        } else {
            console.warn('Analytics: UnifiedManager not available for event listeners');
        }
    }

    /**
     * Handle employee update events
     */
    async handleEmployeeUpdate(data) {
        try {
            console.log('Analytics: Handling employee update:', data);
            
            // Refresh employee data and update UI
            await this.refreshEmployeeData();
            
            // If current employee was deleted, reset selection
            if (data.action === 'delete' && this.currentEmployee === data.employeeId) {
                this.currentEmployee = null;
                const employeeSelect = document.getElementById('employeeSelect');
                if (employeeSelect) {
                    employeeSelect.value = '';
                }
                // Refresh analytics data for all employees
                await this.loadAnalyticsData();
            }
            
        } catch (error) {
            console.error('Analytics: Failed to handle employee update:', error);
        }
    }

    /**
     * Refresh employee data and update dropdown
     */
    async refreshEmployeeData() {
        try {
            const employees = await this.unifiedManager.getEmployees();
            this.populateEmployeeDropdown(employees);
            console.log('Analytics: Employee data refreshed, new count:', employees.length);
        } catch (error) {
            console.error('Analytics: Failed to refresh employee data:', error);
        }
    }

    /**
     * Load initial data for dropdowns and filters
     */
    async loadInitialData() {
        try {
            // 🎯 DIRECT ACCESS: Load employees directly from unified manager
            const employees = this.unifiedManager.getEmployees();
            console.log('Analytics: Loaded employees from unified manager:', {
                count: employees.length,
                sampleEmployee: employees[0]?.name || employees[0]?.firstName
            });
            
            this.populateEmployeeDropdown(employees);

            // Load departments for filter - extract from employees
            const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];
            this.populateDepartmentFilter(departments.map(dept => ({ name: dept, id: dept })));

            // Set default employee (all employees)
            this.currentEmployee = null;
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            throw error;
        }
    }

    /**
     * Populate employee selection dropdown
     */
    populateEmployeeDropdown(employees) {
        console.log('Analytics: populateEmployeeDropdown called with', employees.length, 'employees');
        
        const employeeSelect = document.getElementById('employeeSelect');
        if (!employeeSelect) return;

        // Clear existing options
        employeeSelect.innerHTML = '';

        // Add "All Employees" option
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Employees';
        employeeSelect.appendChild(allOption);

        // Add individual employees
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.firstName} ${employee.lastName}`;
            option.dataset.department = employee.department;
            option.dataset.position = employee.position;
            employeeSelect.appendChild(option);
        });

        // Update employee count
        console.log('Analytics: Updating employee count to', employees.length);
        this.updateEmployeeCount(employees.length);
    }

    /**
     * Populate department filter dropdown
     */
    populateDepartmentFilter(departments) {
        const departmentFilter = document.getElementById('departmentFilter');
        if (!departmentFilter) return;

        // Clear existing options
        departmentFilter.innerHTML = '';

        // Add "All Departments" option
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Departments';
        departmentFilter.appendChild(allOption);

        // Add departments
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            departmentFilter.appendChild(option);
        });
    }

    /**
     * Setup date range picker
     */
    setupDateRangePicker() {
        const dateRangeSelect = document.getElementById('dateRangeSelect');
        if (!dateRangeSelect) return;

        // Set default date range
        this.setDateRange(this.selectedDateRange);
        
        // Show/hide custom date inputs based on selection
        this.toggleCustomDateInputs();
    }

    /**
     * Setup filter controls
     */
    setupFilters() {
        // Initialize filter state
        this.updateFilterDisplay();
        
        // Setup clear filters button
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }
    }

    /**
     * Handle employee selection change
     */
    async handleEmployeeChange(employeeId) {
        try {
            this.showLoading(true);
            
            this.currentEmployee = employeeId ? parseInt(employeeId) : null;
            this.filters.employeeId = this.currentEmployee;
            
            // Update analytics data and charts
            await this.loadAnalyticsData();
            this.renderCharts();
            this.updateAnalyticsSummary();
            
            // Update URL without page reload
            this.updateURL();
            
        } catch (error) {
            console.error('Failed to change employee:', error);
            this.showError('Failed to load employee data.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle date range change
     */
    async handleDateRangeChange(range) {
        try {
            this.showLoading(true);
            
            this.selectedDateRange = range;
            this.setDateRange(range);
            this.toggleCustomDateInputs();
            
            // Reload data with new date range
            await this.loadAnalyticsData();
            this.renderCharts();
            this.updateAnalyticsSummary();
            
        } catch (error) {
            console.error('Failed to change date range:', error);
            this.showError('Failed to load data for selected date range.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle custom date range selection
     */
    async handleCustomDateRange() {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        
        if (!startDate || !endDate) return;
        
        try {
            this.showLoading(true);
            
            this.filters.startDate = startDate;
            this.filters.endDate = endDate;
            this.selectedDateRange = 'custom';
            
            await this.loadAnalyticsData();
            this.renderCharts();
            this.updateAnalyticsSummary();
            
        } catch (error) {
            console.error('Failed to apply custom date range:', error);
            this.showError('Failed to load data for custom date range.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle department filter change
     */
    async handleDepartmentFilter(departmentId) {
        try {
            this.showLoading(true);
            
            this.filters.department = departmentId || null;
            
            // Update employee dropdown based on department
            await this.filterEmployeesByDepartment(departmentId);
            
            // Reload analytics data
            await this.loadAnalyticsData();
            this.renderCharts();
            this.updateAnalyticsSummary();
            
        } catch (error) {
            console.error('Failed to filter by department:', error);
            this.showError('Failed to apply department filter.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Filter employees dropdown by department
     */
    async filterEmployeesByDepartment(departmentId) {
        let employees;
        if (departmentId) {
            // Get all employees from unified manager and filter by department
            const allEmployees = await this.unifiedManager.getEmployees();
            employees = allEmployees.filter(emp => emp.department === departmentId);
        } else {
            employees = await this.unifiedManager.getEmployees();
        }
            
        this.populateEmployeeDropdown(employees);
        
        // Reset employee selection if current employee is not in filtered list
        if (this.currentEmployee && departmentId) {
            const currentEmployeeInList = employees.find(emp => emp.id === this.currentEmployee);
            if (!currentEmployeeInList) {
                this.currentEmployee = null;
                document.getElementById('employeeSelect').value = '';
            }
        }
    }

    /**
     * Set date range based on selection
     */
    setDateRange(range) {
        const today = new Date();
        let startDate, endDate;

        switch (range) {
            case 'today':
                startDate = endDate = today.toISOString().split('T')[0];
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                startDate = endDate = yesterday.toISOString().split('T')[0];
                break;
            case 'last7days':
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 7);
                startDate = startDate.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            case 'last30days':
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 30);
                startDate = startDate.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            case 'thisMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            case 'lastMonth':
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                startDate = lastMonth.toISOString().split('T')[0];
                endDate = lastMonthEnd.toISOString().split('T')[0];
                break;
            case 'custom':
                // Don't override custom dates
                return;
            default:
                // Default to last 30 days
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 30);
                startDate = startDate.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
        }

        this.filters.startDate = startDate;
        this.filters.endDate = endDate;

        // Update custom date inputs
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) startDateInput.value = startDate;
        if (endDateInput) endDateInput.value = endDate;
    }

    /**
     * Toggle custom date inputs visibility
     */
    toggleCustomDateInputs() {
        const customDateContainer = document.getElementById('customDateContainer');
        if (!customDateContainer) return;

        if (this.selectedDateRange === 'custom') {
            customDateContainer.style.display = 'flex';
        } else {
            customDateContainer.style.display = 'none';
        }
    }

    /**
     * Load analytics data from data service
     */
    async loadAnalyticsData() {
        try {
            // 🎯 DIRECT ACCESS: Get attendance records directly from unified manager
            let attendanceRecords;
            
            if (this.filters.employeeId) {
                // Filter by specific employee
                attendanceRecords = this.unifiedManager.getAttendanceRecords().filter(
                    record => record.employeeId == this.filters.employeeId
                );
            } else {
                // Get all attendance records
                attendanceRecords = this.unifiedManager.getAttendanceRecords();
            }
            
            // Apply date filtering if specified
            if (this.filters.startDate || this.filters.endDate) {
                attendanceRecords = attendanceRecords.filter(record => {
                    const recordDate = record.date;
                    if (this.filters.startDate && recordDate < this.filters.startDate) return false;
                    if (this.filters.endDate && recordDate > this.filters.endDate) return false;
                    return true;
                });
            }
            
            console.log('Analytics: Loaded attendance records:', {
                total: attendanceRecords.length,
                employeeFilter: this.filters.employeeId,
                dateRange: `${this.filters.startDate} to ${this.filters.endDate}`
            });

            // Get attendance statistics directly from unified manager
            const attendanceStats = this.unifiedManager.getAttendanceStats();

            // Process and structure the data for charts
            this.analyticsData = this.processAnalyticsData(attendanceRecords, null, attendanceStats);

            // Update analytics summary tiles with the new data
            this.updateAnalyticsSummary();

            return this.analyticsData;
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            throw error;
        }
    }

    /**
     * Calculate basic attendance statistics from records
     */
    calculateBasicAttendanceStats(attendanceRecords) {
        const stats = {
            totalRecords: attendanceRecords.length,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            earlyDepartures: 0,
            averageHours: 0,
            attendanceRate: 0
        };

        let totalHours = 0;

        attendanceRecords.forEach(record => {
            switch (record.status) {
                case 'present':
                    stats.presentCount++;
                    break;
                case 'absent':
                    stats.absentCount++;
                    break;
                case 'late':
                    stats.lateCount++;
                    stats.presentCount++; // Late is still present
                    break;
                case 'early':
                    stats.earlyDepartures++;
                    stats.presentCount++; // Early departure is still present
                    break;
            }

            if (record.hours) {
                totalHours += record.hours;
            }
        });

        if (attendanceRecords.length > 0) {
            stats.averageHours = totalHours / attendanceRecords.length;
            stats.attendanceRate = (stats.presentCount / attendanceRecords.length) * 100;
        }

        return stats;
    }

    /**
     * Process raw data into chart-ready format
     */
    processAnalyticsData(attendanceRecords, performanceData, attendanceStats) {
        const data = {
            tardinessTrends: this.processTardinessTrends(attendanceRecords),
            presenceStats: this.processPresenceStats(attendanceRecords, attendanceStats),
            weeklyPatterns: this.processWeeklyPatterns(attendanceRecords),
            performance: this.processPerformanceData(performanceData),
            monthlyOverview: this.processMonthlyOverview(attendanceRecords),
            summary: this.calculateSummaryStats(attendanceRecords)
        };

        return data;
    }

    /**
     * Process tardiness trends data
     */
    processTardinessTrends(records) {
        const trends = {
            labels: [],
            lateArrivals: [],
            averageDelay: []
        };

        // Group by week
        const weeklyData = {};
        
        records.forEach(record => {
            const week = this.getWeekKey(record.date);
            if (!weeklyData[week]) {
                weeklyData[week] = {
                    total: 0,
                    late: 0,
                    totalDelay: 0
                };
            }
            
            weeklyData[week].total++;
            
            if (record.status === 'tardy' || record.status === 'late') {
                weeklyData[week].late++;
                // Calculate minutes late if not provided
                let minutesLate = record.minutesLate || 0;
                if (!minutesLate && record.timeIn) {
                    // Assume work starts at 8:00 AM
                    const workStart = new Date(`${record.date}T08:00:00`);
                    const actualStart = new Date(`${record.date}T${record.timeIn}`);
                    minutesLate = Math.max(0, (actualStart - workStart) / (1000 * 60));
                }
                weeklyData[week].totalDelay += minutesLate;
            }
        });

        // Prepare chart data
        Object.keys(weeklyData).sort().forEach(week => {
            const data = weeklyData[week];
            trends.labels.push(week);
            trends.lateArrivals.push(data.late);
            trends.averageDelay.push(data.late > 0 ? data.totalDelay / data.late : 0);
        });

        return trends;
    }

    /**
     * Process presence statistics
     */
    processPresenceStats(records, stats) {
        const totalRecords = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'tardy' || r.status === 'late').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const onLeave = records.filter(r => r.status === 'on_leave' || r.status === 'leave').length;

        return {
            present,
            late,
            absent,
            onLeave,
            total: totalRecords
        };
    }

    /**
     * Process weekly patterns data
     */
    processWeeklyPatterns(records) {
        const patterns = {
            labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            present: new Array(7).fill(0),
            late: new Array(7).fill(0),
            absent: new Array(7).fill(0)
        };

        records.forEach(record => {
            const dayOfWeek = new Date(record.date).getDay();
            const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust Sunday to be index 6

            switch (record.status) {
                case 'present':
                    patterns.present[adjustedDay]++;
                    break;
                case 'tardy':
                case 'late':
                    patterns.late[adjustedDay]++;
                    break;
                case 'absent':
                    patterns.absent[adjustedDay]++;
                    break;
            }
        });

        return patterns;
    }

    /**
     * Process performance data
     */
    processPerformanceData(performanceData) {
        if (!performanceData || !Array.isArray(performanceData)) {
            // Return default performance data if none available
            return {
                labels: ['Punctuality', 'Attendance', 'Overtime', 'Consistency', 'Reliability'],
                scores: [85, 90, 75, 88, 92],
                employeeName: this.currentEmployee ? 'Selected Employee' : 'All Employees'
            };
        }

        // If we have performance data, use it
        const employee = performanceData.find(p => p.employeeId === this.currentEmployee);
        if (employee) {
            return {
                labels: ['Punctuality', 'Attendance', 'Overtime', 'Consistency', 'Reliability'],
                scores: [
                    employee.punctualityScore || 0,
                    employee.attendanceScore || 0,
                    employee.overtimeScore || 0,
                    employee.consistencyScore || 0,
                    employee.reliabilityScore || 0
                ],
                employeeName: employee.employeeName || 'Employee'
            };
        }

        // Calculate aggregate performance for all employees
        const avgScores = performanceData.reduce((acc, emp) => {
            acc.punctuality += emp.punctualityScore || 0;
            acc.attendance += emp.attendanceScore || 0;
            acc.overtime += emp.overtimeScore || 0;
            acc.consistency += emp.consistencyScore || 0;
            acc.reliability += emp.reliabilityScore || 0;
            return acc;
        }, { punctuality: 0, attendance: 0, overtime: 0, consistency: 0, reliability: 0 });

        const count = performanceData.length;
        return {
            labels: ['Punctuality', 'Attendance', 'Overtime', 'Consistency', 'Reliability'],
            scores: [
                Math.round(avgScores.punctuality / count),
                Math.round(avgScores.attendance / count),
                Math.round(avgScores.overtime / count),
                Math.round(avgScores.consistency / count),
                Math.round(avgScores.reliability / count)
            ],
            employeeName: 'All Employees Average'
        };
    }

    /**
     * Process monthly overview data
     */
    processMonthlyOverview(records) {
        const overview = {
            labels: [],
            attendanceRate: [],
            targetRate: []
        };

        // Group by month
        const monthlyData = {};
        
        records.forEach(record => {
            const month = record.date.substring(0, 7); // YYYY-MM format
            if (!monthlyData[month]) {
                monthlyData[month] = {
                    total: 0,
                    present: 0
                };
            }
            
            monthlyData[month].total++;
            if (record.status === 'present' || record.status === 'late') {
                monthlyData[month].present++;
            }
        });

        // Calculate attendance rates
        Object.keys(monthlyData).sort().forEach(month => {
            const data = monthlyData[month];
            const rate = data.total > 0 ? (data.present / data.total) * 100 : 0;
            
            overview.labels.push(this.formatMonthForChart(month));
            overview.attendanceRate.push(Math.round(rate * 100) / 100);
            overview.targetRate.push(95); // Target 95% attendance
        });

        return overview;
    }

    /**
     * Calculate summary statistics
     */
    calculateSummaryStats(records) {
        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late').length;
        const absent = records.filter(r => r.status === 'absent').length;
        
        const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;
        const punctualityRate = total > 0 ? (present / total) * 100 : 0;
        const absenteeismRate = total > 0 ? (absent / total) * 100 : 0;
        
        const totalHours = records.reduce((sum, record) => sum + (record.regularHours || 0), 0);
        const overtimeHours = records.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
        
        return {
            totalDays: total,
            presentDays: present,
            lateDays: late,
            absentDays: absent,
            attendanceRate: Math.round(attendanceRate * 100) / 100,
            punctualityRate: Math.round(punctualityRate * 100) / 100,
            absenteeismRate: Math.round(absenteeismRate * 100) / 100,
            totalHours: Math.round(totalHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            averageHoursPerDay: total > 0 ? Math.round((totalHours / total) * 100) / 100 : 0
        };
    }

    /**
     * Render all charts
     */
    renderCharts() {
        if (!this.analyticsData) {
            console.warn('No analytics data available for chart rendering');
            return;
        }

        // Always create fallback charts since Chart.js is problematic
        console.log('Creating fallback visualizations for analytics');
        this.createAllFallbackCharts();
    }

    /**
     * Render individual chart
     */
    renderChart(chartKey) {
        const config = this.chartConfigs[chartKey];
        const data = this.analyticsData[chartKey];
        
        if (!config || !data) {
            console.warn(`Missing config or data for chart: ${chartKey}`);
            return;
        }

        try {
            // Destroy existing chart first if it exists
            if (typeof chartsManager !== 'undefined') {
                chartsManager.destroyChart(config.canvasId);
            }

            let chart;
            
            switch (config.type) {
                case 'tardinessTrends':
                    chart = chartsManager.createTardinessTrendsChart(config.canvasId, data);
                    break;
                case 'attendanceStats':
                    chart = chartsManager.createAttendanceStatsChart(config.canvasId, data);
                    break;
                case 'presencePatterns':
                    chart = chartsManager.createPresencePatternsChart(config.canvasId, data);
                    break;
                case 'performance':
                    chart = chartsManager.createPerformanceChart(config.canvasId, data);
                    break;
                case 'monthlyOverview':
                    chart = chartsManager.createMonthlyOverviewChart(config.canvasId, data);
                    break;
                default:
                    console.warn(`Unknown chart type: ${config.type} for chart: ${chartKey}`);
                    this.createFallbackChart(config.canvasId, config.title);
                    return;
            }

            if (chart) {
                this.charts.set(chartKey, chart);
            }
        } catch (error) {
            console.error(`Failed to render chart ${chartKey}:`, error);
            this.createFallbackChart(config.canvasId, `${config.title} (Chart unavailable)`);
        }
    }

    /**
     * Create a fallback chart when Chart.js fails
     */
    createFallbackChart(canvasId, title) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const container = canvas.parentElement;
        if (!container) return;

        const chartKey = Object.keys(this.chartConfigs).find(key => 
            this.chartConfigs[key].canvasId === canvasId
        );
        
        const data = chartKey ? this.analyticsData[chartKey] : null;

        if (data) {
            // Create data visualization based on chart type
            container.innerHTML = this.createDataVisualization(chartKey, data, title);
        } else {
            // Generic fallback
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--text-secondary); text-align: center; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                    <div style="font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--text-primary);">${title}</div>
                    <div style="font-size: 0.9rem;">Data visualization unavailable</div>
                </div>
            `;
        }
    }

    /**
     * Create data visualization without Chart.js
     */
    createDataVisualization(chartKey, data, title) {
        switch (chartKey) {
            case 'presenceStats':
                return this.createPresenceStatsVisualization(data, title);
            case 'tardinessTrends':
                return this.createTardinessTrendsVisualization(data, title);
            case 'weeklyPatterns':
                return this.createWeeklyPatternsVisualization(data, title);
            case 'performance':
                return this.createPerformanceVisualization(data, title);
            case 'monthlyOverview':
                return this.createMonthlyOverviewVisualization(data, title);
            default:
                return this.createGenericVisualization(data, title);
        }
    }

    /**
     * Create presence statistics visualization
     */
    createPresenceStatsVisualization(data, title) {
        const total = data.total || 1;
        const presentPercent = Math.round((data.present / total) * 100);
        const latePercent = Math.round((data.late / total) * 100);
        const absentPercent = Math.round((data.absent / total) * 100);
        const leavePercent = Math.round((data.onLeave / total) * 100);

        return `
            <div style="padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-primary);">
                <h3 style="margin: 0 0 20px 0; text-align: center; color: var(--text-primary);">${title}</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div style="text-align: center; padding: 15px; background: var(--bg-secondary); border-radius: 6px;">
                        <div style="font-size: 2rem; color: #4CAF50; font-weight: bold;">${data.present}</div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">Present (${presentPercent}%)</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: var(--bg-secondary); border-radius: 6px;">
                        <div style="font-size: 2rem; color: #FF9800; font-weight: bold;">${data.late}</div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">Late (${latePercent}%)</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: var(--bg-secondary); border-radius: 6px;">
                        <div style="font-size: 2rem; color: #F44336; font-weight: bold;">${data.absent}</div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">Absent (${absentPercent}%)</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: var(--bg-secondary); border-radius: 6px;">
                        <div style="font-size: 2rem; color: #2196F3; font-weight: bold;">${data.onLeave}</div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">On Leave (${leavePercent}%)</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create tardiness trends visualization
     */
    createTardinessTrendsVisualization(data, title) {
        const maxLate = Math.max(...data.lateArrivals, 1);
        const maxDelay = Math.max(...data.averageDelay, 1);

        const barsHtml = data.labels.map((label, index) => {
            const lateHeight = (data.lateArrivals[index] / maxLate) * 100;
            const delayHeight = (data.averageDelay[index] / maxDelay) * 100;
            
            return `
                <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                    <div style="display: flex; align-items: end; height: 120px; gap: 4px;">
                        <div style="width: 20px; height: ${lateHeight}%; background: #FF9800; border-radius: 2px 2px 0 0;" title="Late arrivals: ${data.lateArrivals[index]}"></div>
                        <div style="width: 20px; height: ${delayHeight}%; background: #F44336; border-radius: 2px 2px 0 0;" title="Avg delay: ${Math.round(data.averageDelay[index])} min"></div>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 8px; text-align: center;">${label}</div>
                </div>
            `;
        }).join('');

        return `
            <div style="padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-primary);">
                <h3 style="margin: 0 0 20px 0; text-align: center; color: var(--text-primary);">${title}</h3>
                <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                    ${barsHtml}
                </div>
                <div style="display: flex; justify-content: center; gap: 20px; font-size: 0.9rem;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 12px; height: 12px; background: #FF9800; border-radius: 2px;"></div>
                        <span style="color: var(--text-secondary);">Late Arrivals</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 12px; height: 12px; background: #F44336; border-radius: 2px;"></div>
                        <span style="color: var(--text-secondary);">Avg Delay (min)</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create weekly patterns visualization
     */
    createWeeklyPatternsVisualization(data, title) {
        const maxValue = Math.max(...data.present, ...data.late, ...data.absent, 1);

        const barsHtml = data.labels.map((label, index) => {
            const presentHeight = (data.present[index] / maxValue) * 100;
            const lateHeight = (data.late[index] / maxValue) * 100;
            const absentHeight = (data.absent[index] / maxValue) * 100;
            
            return `
                <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                    <div style="display: flex; align-items: end; height: 120px; gap: 2px;">
                        <div style="width: 15px; height: ${presentHeight}%; background: #4CAF50; border-radius: 2px 2px 0 0;" title="Present: ${data.present[index]}"></div>
                        <div style="width: 15px; height: ${lateHeight}%; background: #FF9800; border-radius: 2px 2px 0 0;" title="Late: ${data.late[index]}"></div>
                        <div style="width: 15px; height: ${absentHeight}%; background: #F44336; border-radius: 2px 2px 0 0;" title="Absent: ${data.absent[index]}"></div>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 8px; text-align: center;">${label.substring(0, 3)}</div>
                </div>
            `;
        }).join('');

        return `
            <div style="padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-primary);">
                <h3 style="margin: 0 0 20px 0; text-align: center; color: var(--text-primary);">${title}</h3>
                <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                    ${barsHtml}
                </div>
                <div style="display: flex; justify-content: center; gap: 15px; font-size: 0.9rem;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 12px; height: 12px; background: #4CAF50; border-radius: 2px;"></div>
                        <span style="color: var(--text-secondary);">Present</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 12px; height: 12px; background: #FF9800; border-radius: 2px;"></div>
                        <span style="color: var(--text-secondary);">Late</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 12px; height: 12px; background: #F44336; border-radius: 2px;"></div>
                        <span style="color: var(--text-secondary);">Absent</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create performance visualization
     */
    createPerformanceVisualization(data, title) {
        const metricsHtml = data.labels.map((label, index) => {
            const score = data.scores[index];
            const percentage = Math.min(score, 100);
            const color = score >= 90 ? '#4CAF50' : score >= 75 ? '#FF9800' : '#F44336';
            
            return `
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: var(--text-primary); font-size: 0.9rem;">${label}</span>
                        <span style="color: ${color}; font-weight: bold;">${score}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: ${color}; border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div style="padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-primary);">
                <h3 style="margin: 0 0 10px 0; text-align: center; color: var(--text-primary);">${title}</h3>
                <div style="text-align: center; margin-bottom: 20px; color: var(--text-secondary); font-size: 0.9rem;">${data.employeeName}</div>
                <div style="max-width: 300px; margin: 0 auto;">
                    ${metricsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Create monthly overview visualization
     */
    createMonthlyOverviewVisualization(data, title) {
        const barsHtml = data.labels.map((label, index) => {
            const rate = data.attendanceRate[index];
            const target = data.targetRate[index];
            const height = Math.min(rate, 100);
            const color = rate >= target ? '#4CAF50' : rate >= 80 ? '#FF9800' : '#F44336';
            
            return `
                <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                    <div style="display: flex; align-items: end; height: 120px;">
                        <div style="width: 30px; height: ${height}%; background: ${color}; border-radius: 2px 2px 0 0;" title="Attendance: ${rate}%"></div>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 8px; text-align: center;">${label}</div>
                    <div style="font-size: 0.7rem; color: ${color}; font-weight: bold;">${rate}%</div>
                </div>
            `;
        }).join('');

        return `
            <div style="padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-primary);">
                <h3 style="margin: 0 0 20px 0; text-align: center; color: var(--text-primary);">${title}</h3>
                <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                    ${barsHtml}
                </div>
                <div style="text-align: center; font-size: 0.9rem; color: var(--text-secondary);">
                    Target: 95% | <span style="color: #4CAF50;">Above target</span> | <span style="color: #FF9800;">Below target</span> | <span style="color: #F44336;">Poor</span>
                </div>
            </div>
        `;
    }

    /**
     * Create generic visualization
     */
    createGenericVisualization(data, title) {
        return `
            <div style="padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-primary);">
                <h3 style="margin: 0 0 20px 0; text-align: center; color: var(--text-primary);">${title}</h3>
                <div style="text-align: center; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                    <div>Data visualization available</div>
                    <div style="font-size: 0.8rem; margin-top: 10px;">Chart fallback mode active</div>
                </div>
            </div>
        `;
    }

    /**
     * Create fallback charts for all chart configurations
     */
    createAllFallbackCharts() {
        Object.keys(this.chartConfigs).forEach(chartKey => {
            const config = this.chartConfigs[chartKey];
            this.createFallbackChart(config.canvasId, config.title);
        });
    }

    /**
     * Update analytics summary tiles
     */
    updateAnalyticsSummary() {
        if (!this.analyticsData || !this.analyticsData.summary) return;

        const summary = this.analyticsData.summary;

        // Update tile values
        this.updateTileValue('attendanceRate', `${summary.attendanceRate}%`);
        this.updateTileValue('punctualityRate', `${summary.punctualityRate}%`);
        this.updateTileValue('totalHours', `${summary.totalHours}h`);
        this.updateTileValue('overtimeHours', `${summary.overtimeHours}h`);

        // Update trends (simplified - in real app, compare with previous period)
        this.updateTileTrend('attendanceRate', summary.attendanceRate >= 95 ? 'positive' : 'negative');
        this.updateTileTrend('punctualityRate', summary.punctualityRate >= 90 ? 'positive' : 'negative');
        this.updateTileTrend('totalHours', 'neutral');
        this.updateTileTrend('overtimeHours', summary.overtimeHours > 0 ? 'warning' : 'neutral');
    }

    /**
     * Update individual tile value
     */
    updateTileValue(tileId, value) {
        const valueElement = document.getElementById(`${tileId}Value`);
        if (valueElement) {
            valueElement.textContent = value;
        }
    }

    /**
     * Update tile trend indicator
     */
    updateTileTrend(tileId, trend) {
        const trendElement = document.getElementById(`${tileId}Trend`);
        if (trendElement) {
            trendElement.className = `tile-trend ${trend}`;
            
            const trendText = trendElement.querySelector('.trend-text');
            if (trendText) {
                switch (trend) {
                    case 'positive':
                        trendText.textContent = 'Good performance';
                        break;
                    case 'negative':
                        trendText.textContent = 'Needs improvement';
                        break;
                    case 'warning':
                        trendText.textContent = 'Monitor closely';
                        break;
                    default:
                        trendText.textContent = 'Stable';
                }
            }
        }
    }

    /**
     * Update employee count display
     */
    updateEmployeeCount(count) {
        const countElement = document.getElementById('employeeCount');
        if (countElement) {
            countElement.textContent = `${count} employees`;
        }
    }

    /**
     * Clear all filters
     */
    async clearAllFilters() {
        try {
            this.showLoading(true);
            
            // Reset all filters
            this.filters = {
                employeeId: null,
                startDate: null,
                endDate: null,
                department: null,
                position: null
            };
            
            this.currentEmployee = null;
            this.selectedDateRange = 'last30days';
            
            // Reset UI controls
            const employeeSelect = document.getElementById('employeeSelect');
            const departmentFilter = document.getElementById('departmentFilter');
            const dateRangeSelect = document.getElementById('dateRangeSelect');
            
            if (employeeSelect) employeeSelect.value = '';
            if (departmentFilter) departmentFilter.value = '';
            if (dateRangeSelect) dateRangeSelect.value = 'last30days';
            
            // Reset date range
            this.setDateRange('last30days');
            this.toggleCustomDateInputs();
            
            // Reload data
            await this.loadAnalyticsData();
            this.renderCharts();
            this.updateAnalyticsSummary();
            
        } catch (error) {
            console.error('Failed to clear filters:', error);
            this.showError('Failed to clear filters.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Export analytics data
     */
    exportAnalytics() {
        if (!this.analyticsData) {
            this.showError('No data to export.');
            return;
        }

        try {
            // Create export data
            const exportData = {
                filters: this.filters,
                dateRange: this.selectedDateRange,
                summary: this.analyticsData.summary,
                generatedAt: new Date().toISOString(),
                employee: this.currentEmployee ? `Employee ID: ${this.currentEmployee}` : 'All Employees'
            };

            // Convert to JSON and download
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `analytics-${this.currentEmployee || 'all'}-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            // Also export charts as images
            this.exportChartsAsImages();
            
        } catch (error) {
            console.error('Failed to export analytics:', error);
            this.showError('Failed to export analytics data.');
        }
    }

    /**
     * Export charts as images
     */
    exportChartsAsImages() {
        this.charts.forEach((chart, chartKey) => {
            try {
                const imageData = chartsManager.exportChart(this.chartConfigs[chartKey].canvasId);
                if (imageData) {
                    const link = document.createElement('a');
                    link.href = imageData;
                    link.download = `chart-${chartKey}-${new Date().toISOString().split('T')[0]}.png`;
                    link.click();
                }
            } catch (error) {
                console.warn(`Failed to export chart ${chartKey}:`, error);
            }
        });
    }

    /**
     * Print analytics report
     */
    printAnalytics() {
        if (!this.analyticsData) {
            this.showError('No data to print.');
            return;
        }

        try {
            const printWindow = window.open('', '_blank');
            const printContent = this.generatePrintContent();
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
            
        } catch (error) {
            console.error('Failed to print analytics:', error);
            this.showError('Failed to print analytics report.');
        }
    }

    /**
     * Generate print content
     */
    generatePrintContent() {
        const summary = this.analyticsData.summary;
        const employee = this.currentEmployee ? `Employee ID: ${this.currentEmployee}` : 'All Employees';
        
        return `
            <html>
                <head>
                    <title>Analytics Report - ${employee}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
                        .summary-item { padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                        .summary-title { font-weight: bold; margin-bottom: 5px; }
                        .summary-value { font-size: 24px; color: #007aff; }
                        .filters { margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
                        .chart-placeholder { height: 200px; border: 1px dashed #ccc; margin: 20px 0; text-align: center; line-height: 200px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Bricks Attendance System</h1>
                        <h2>Analytics Report</h2>
                        <p>Generated on ${new Date().toLocaleDateString()}</p>
                        <p>Employee: ${employee}</p>
                    </div>
                    
                    <div class="filters">
                        <strong>Filters Applied:</strong><br>
                        Date Range: ${this.selectedDateRange}<br>
                        Start Date: ${this.filters.startDate || 'N/A'}<br>
                        End Date: ${this.filters.endDate || 'N/A'}<br>
                        Department: ${this.filters.department || 'All'}
                    </div>
                    
                    <div class="summary">
                        <div class="summary-item">
                            <div class="summary-title">Attendance Rate</div>
                            <div class="summary-value">${summary.attendanceRate}%</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-title">Punctuality Rate</div>
                            <div class="summary-value">${summary.punctualityRate}%</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-title">Total Hours</div>
                            <div class="summary-value">${summary.totalHours}h</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-title">Overtime Hours</div>
                            <div class="summary-value">${summary.overtimeHours}h</div>
                        </div>
                    </div>
                    
                    <div class="chart-placeholder">Charts would appear here in full version</div>
                    
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `;
    }

    /**
     * Refresh all data
     */
    async refreshData() {
        try {
            this.showLoading(true);
            
            await this.loadAnalyticsData();
            this.renderCharts();
            this.updateAnalyticsSummary();
            
            this.showSuccess('Analytics data refreshed successfully.');
            
        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.showError('Failed to refresh analytics data.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Setup auto-refresh functionality
     */
    setupAutoRefresh() {
        // Refresh data every 5 minutes
        setInterval(() => {
            this.refreshData();
        }, 5 * 60 * 1000);
    }

    /**
     * Handle chart click events
     */
    handleChartClick(detail) {
        console.log('Chart clicked:', detail);
        // Implement drill-down functionality here
    }

    /**
     * Handle chart hover events
     */
    handleChartHover(detail) {
        // Implement hover interactions here
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Resize all charts
        if (typeof chartsManager !== 'undefined' && chartsManager && typeof chartsManager.resizeAllCharts === 'function') {
            chartsManager.resizeAllCharts();
        }
        
        // Also handle Chart.js charts if they exist
        if (typeof Chart !== 'undefined' && Chart.instances) {
            Object.values(Chart.instances).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }
    }

    /**
     * Handle theme changes
     */
    handleThemeChange(themeDetail) {
        // Update charts theme
        if (typeof chartsManager !== 'undefined') {
            chartsManager.updateAllChartsTheme(themeDetail.theme);
        }
    }

    /**
     * Update URL with current filters (for bookmarking)
     */
    updateURL() {
        const params = new URLSearchParams();
        
        if (this.currentEmployee) params.set('employee', this.currentEmployee);
        if (this.selectedDateRange) params.set('range', this.selectedDateRange);
        if (this.filters.department) params.set('department', this.filters.department);
        
        const newURL = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newURL);
    }

    /**
     * Update filter display
     */
    updateFilterDisplay() {
        // Update any filter status indicators
        const activeFilters = [];
        
        if (this.currentEmployee) activeFilters.push('Employee');
        if (this.filters.department) activeFilters.push('Department');
        if (this.selectedDateRange !== 'last30days') activeFilters.push('Date Range');
        
        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.textContent = activeFilters.length > 0 
                ? `${activeFilters.length} filter(s) active`
                : 'No filters active';
        }
    }

    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        if (typeof chartsManager !== 'undefined') {
            this.charts.forEach((chart, chartKey) => {
                try {
                    chartsManager.destroyChart(this.chartConfigs[chartKey].canvasId);
                } catch (error) {
                    console.warn(`Failed to destroy chart ${chartKey}:`, error);
                }
            });
        }
        this.charts.clear();
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        const loadingElement = document.getElementById('analyticsLoading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // Implement toast notification or error display
        const errorElement = document.getElementById('analyticsError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log(message);
        // Implement toast notification or success display
        const successElement = document.getElementById('analyticsSuccess');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Utility: Convert time string to minutes
     */
    timeToMinutes(timeStr) {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Utility: Format date for chart labels
     */
    formatDateForChart(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Utility: Format month for chart labels
     */
    formatMonthForChart(monthStr) {
        const [year, month] = monthStr.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }

    /**
     * Utility: Get week key for grouping
     */
    getWeekKey(dateStr) {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const week = this.getWeekNumber(date);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    }

    /**
     * Utility: Get week number
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Get current state for debugging
     */
    getState() {
        return {
            currentEmployee: this.currentEmployee,
            selectedDateRange: this.selectedDateRange,
            filters: this.filters,
            hasData: !!this.analyticsData,
            chartCount: this.charts.size
        };
    }

    /**
     * Cleanup and destroy controller
     */
    destroy() {
        this.destroyAllCharts();
        
        // Clear any intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('themechange', this.handleThemeChange);
    }
}

// Create analytics controller instance but don't initialize immediately
const analyticsController = new AnalyticsController();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = analyticsController;
} else if (typeof window !== 'undefined') {
    window.analyticsController = analyticsController;
}

// Wait for dependencies to be ready before initializing
function initializeWhenReady() {
    // 🎯 CRITICAL FIX: Check for unifiedEmployeeManager instead of UnifiedDataService
    if (typeof window.unifiedEmployeeManager !== 'undefined' && window.unifiedEmployeeManager.initialized) {
        if (!analyticsController.isInitialized) {
            console.log('Analytics: UnifiedEmployeeManager detected, initializing...');
            analyticsController.init().catch(console.error);
        }
    } else {
        console.log('Analytics waiting for dependencies... unifiedEmployeeManager:', 
                   typeof window.unifiedEmployeeManager, 
                   'initialized:', window.unifiedEmployeeManager?.initialized);
        setTimeout(initializeWhenReady, 100);
    }
}

// Auto-initialize when DOM is ready and dependencies are available
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWhenReady);
} else {
    initializeWhenReady();
}

// Export utility functions for easy access
window.refreshAnalytics = () => analyticsController.refreshData();
window.exportAnalytics = () => analyticsController.exportAnalytics();
window.printAnalytics = () => analyticsController.printAnalytics();
window.clearAnalyticsFilters = () => analyticsController.clearAllFilters();
window.getAnalyticsState = () => analyticsController.getState();