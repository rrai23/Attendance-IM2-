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

        // Window resize for responsive charts
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Load initial data for dropdowns and filters
     */
    async loadInitialData() {
        try {
            console.log('Loading initial data...');
            
            // Load employees for dropdown
            const employeesResponse = await this.apiRequest('employees', {
                method: 'GET'
            });
            
            if (employeesResponse.success) {
                this.populateEmployeeDropdown(employeesResponse.data);
                
                // Extract departments for filter
                const departments = [...new Set(employeesResponse.data.map(emp => emp.department).filter(dept => dept))];
                this.populateDepartmentFilter(departments);
            }
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load employee data');
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
            option.value = employee.employee_id || employee.id;
            option.textContent = `${employee.first_name} ${employee.last_name} (${employee.employee_id})`;
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
            option.value = dept;
            option.textContent = dept;
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
            
            this.currentEmployee = employeeId ? employeeId : null;
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
            
            // Reload data with new date range
            await this.loadAnalyticsData();
            this.renderCharts();
            this.updateAnalyticsSummary();
            
        } catch (error) {
            console.error('Failed to apply custom date range:', error);
            this.showError('Failed to load data for selected date range.');
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
            
            // Filter employees dropdown by department if needed
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
        try {
            const employeesResponse = await this.apiRequest(`employees?department=${departmentId || ''}`, {
                method: 'GET'
            });
            
            if (employeesResponse.success) {
                this.populateEmployeeDropdown(employeesResponse.data);
                
                // Reset employee selection if current employee is not in filtered list
                if (this.currentEmployee && departmentId) {
                    const currentEmployeeInList = employeesResponse.data.find(
                        emp => (emp.employee_id || emp.id) === this.currentEmployee
                    );
                    if (!currentEmployeeInList) {
                        this.currentEmployee = null;
                        const employeeSelect = document.getElementById('employeeSelect');
                        if (employeeSelect) {
                            employeeSelect.value = '';
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to filter employees by department:', error);
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
     * Load analytics data from backend APIs
     */
    async loadAnalyticsData() {
        try {
            console.log('Loading analytics data from backend...');
            
            // Build query parameters
            const params = new URLSearchParams();
            if (this.filters.employeeId) {
                params.append('employee_id', this.filters.employeeId);
            }
            if (this.filters.startDate) {
                params.append('start_date', this.filters.startDate);
            }
            if (this.filters.endDate) {
                params.append('end_date', this.filters.endDate);
            }
            if (this.filters.department) {
                params.append('department', this.filters.department);
            }

            // Load attendance records
            const attendanceResponse = await this.apiRequest(`attendance?${params.toString()}`, {
                method: 'GET'
            });

            // Load attendance statistics
            const statsResponse = await this.apiRequest('attendance/stats', {
                method: 'GET'
            });

            let attendanceRecords = [];
            let attendanceStats = {};

            if (attendanceResponse.success) {
                attendanceRecords = attendanceResponse.data.records || attendanceResponse.data;
            }

            if (statsResponse.success) {
                attendanceStats = statsResponse.data;
            }

            console.log('Analytics: Loaded data:', {
                records: attendanceRecords.length,
                stats: attendanceStats,
                filters: this.filters
            });

            // Process and structure the data for charts
            this.analyticsData = this.processAnalyticsData(attendanceRecords, attendanceStats);

            // Update analytics summary tiles with the new data
            this.updateAnalyticsSummary();

            return this.analyticsData;
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            throw error;
        }
    }

    /**
     * Process raw data into chart-ready format
     */
    processAnalyticsData(attendanceRecords, attendanceStats) {
        const data = {
            tardinessTrends: this.processTardinessTrends(attendanceRecords),
            presenceStats: this.processPresenceStats(attendanceRecords, attendanceStats),
            weeklyPatterns: this.processWeeklyPatterns(attendanceRecords),
            performance: this.processPerformanceData(attendanceRecords),
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
            if (!record.date || !record.status) return;
            
            const date = new Date(record.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = {
                    total: 0,
                    late: 0,
                    totalDelay: 0
                };
            }
            
            weeklyData[weekKey].total++;
            
            if (record.status === 'late' || record.status === 'tardy') {
                weeklyData[weekKey].late++;
                // Calculate delay in minutes (simplified)
                if (record.time_in) {
                    const expectedTime = new Date(`${record.date} 09:00:00`);
                    const actualTime = new Date(`${record.date} ${record.time_in}`);
                    const delay = Math.max(0, (actualTime - expectedTime) / (1000 * 60));
                    weeklyData[weekKey].totalDelay += delay;
                }
            }
        });

        // Prepare chart data
        Object.keys(weeklyData).sort().forEach(week => {
            const data = weeklyData[week];
            trends.labels.push(new Date(week).toLocaleDateString());
            trends.lateArrivals.push(data.late);
            trends.averageDelay.push(data.late > 0 ? Math.round(data.totalDelay / data.late) : 0);
        });

        return trends;
    }

    /**
     * Process presence statistics
     */
    processPresenceStats(records, stats) {
        // Use backend stats if available, otherwise calculate from records
        if (stats && Object.keys(stats).length > 0) {
            return {
                present: parseInt(stats.present || 0),
                late: parseInt(stats.late || 0),
                absent: parseInt(stats.absent || 0),
                onLeave: parseInt(stats.onLeave || 0),
                total: parseInt(stats.total || 0)
            };
        }

        // Fallback to calculating from records
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late' || r.status === 'tardy').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const onLeave = records.filter(r => r.status === 'on_leave' || r.status === 'leave').length;

        return {
            present,
            late,
            absent,
            onLeave,
            total: records.length
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
            if (!record.date || !record.status) return;
            
            const date = new Date(record.date);
            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0 format
            
            switch (record.status) {
                case 'present':
                    patterns.present[adjustedDay]++;
                    break;
                case 'late':
                case 'tardy':
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
    processPerformanceData(records) {
        if (!records || records.length === 0) {
            return {
                labels: ['Punctuality', 'Attendance', 'Overtime', 'Consistency', 'Reliability'],
                scores: [0, 0, 0, 0, 0],
                employeeName: 'No Data'
            };
        }

        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late' || r.status === 'tardy').length;
        const overtime = records.filter(r => r.overtime_hours && parseFloat(r.overtime_hours) > 0).length;
        
        // Calculate performance scores (0-100)
        const punctuality = total > 0 ? Math.round((present / total) * 100) : 0;
        const attendance = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
        const overtimeScore = total > 0 ? Math.min(100, Math.round((overtime / total) * 200)) : 0;
        const consistency = punctuality; // Simplified
        const reliability = attendance; // Simplified

        const employeeName = this.currentEmployee ? 
            `Employee ${this.currentEmployee}` : 
            'All Employees Average';

        return {
            labels: ['Punctuality', 'Attendance', 'Overtime', 'Consistency', 'Reliability'],
            scores: [punctuality, attendance, overtimeScore, consistency, reliability],
            employeeName
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
            if (!record.date) return;
            
            const date = new Date(record.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    total: 0,
                    present: 0,
                    late: 0
                };
            }
            
            monthlyData[monthKey].total++;
            
            if (record.status === 'present') {
                monthlyData[monthKey].present++;
            } else if (record.status === 'late' || record.status === 'tardy') {
                monthlyData[monthKey].late++;
            }
        });

        // Calculate attendance rates
        Object.keys(monthlyData).sort().forEach(month => {
            const data = monthlyData[month];
            const attendanceRate = data.total > 0 ? 
                Math.round(((data.present + data.late) / data.total) * 100) : 0;
            
            overview.labels.push(new Date(month + '-01').toLocaleDateString('en-US', { 
                month: 'short', 
                year: 'numeric' 
            }));
            overview.attendanceRate.push(attendanceRate);
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
        const late = records.filter(r => r.status === 'late' || r.status === 'tardy').length;
        const absent = records.filter(r => r.status === 'absent').length;
        
        const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;
        const punctualityRate = total > 0 ? (present / total) * 100 : 0;
        const absenteeismRate = total > 0 ? (absent / total) * 100 : 0;
        
        const totalHours = records.reduce((sum, record) => {
            return sum + (parseFloat(record.total_hours) || 0);
        }, 0);
        
        const overtimeHours = records.reduce((sum, record) => {
            return sum + (parseFloat(record.overtime_hours) || 0);
        }, 0);
        
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

        console.log('Rendering analytics charts...');
        this.createAllFallbackCharts();
    }

    /**
     * Create fallback charts for all chart configurations
     */
    createAllFallbackCharts() {
        Object.keys(this.chartConfigs).forEach(chartKey => {
            const config = this.chartConfigs[chartKey];
            this.createFallbackChart(config.canvasId, config.title, chartKey);
        });
    }

    /**
     * Create a fallback chart when Chart.js fails or is not available
     */
    createFallbackChart(canvasId, title, chartKey) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const container = canvas.parentElement;
        if (!container) return;

        const data = this.analyticsData[chartKey];

        if (data) {
            container.innerHTML = this.createDataVisualization(chartKey, data, title);
        } else {
            container.innerHTML = this.createGenericVisualization(data, title);
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
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <div style="height: 100px; display: flex; align-items: end; gap: 2px;">
                        <div style="width: 15px; height: ${lateHeight}%; background: #FF9800; border-radius: 2px 2px 0 0;" title="${data.lateArrivals[index]} late arrivals"></div>
                        <div style="width: 15px; height: ${delayHeight}%; background: #F44336; border-radius: 2px 2px 0 0;" title="${data.averageDelay[index]} min avg delay"></div>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; transform: rotate(-45deg); margin-top: 10px;">${label}</div>
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
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <div style="height: 100px; display: flex; align-items: end; gap: 1px;">
                        <div style="width: 12px; height: ${presentHeight}%; background: #4CAF50; border-radius: 2px 2px 0 0;" title="${data.present[index]} present"></div>
                        <div style="width: 12px; height: ${lateHeight}%; background: #FF9800; border-radius: 2px 2px 0 0;" title="${data.late[index]} late"></div>
                        <div style="width: 12px; height: ${absentHeight}%; background: #F44336; border-radius: 2px 2px 0 0;" title="${data.absent[index]} absent"></div>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center;">${label.slice(0, 3)}</div>
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
            const color = score >= 80 ? '#4CAF50' : score >= 60 ? '#FF9800' : '#F44336';
            
            return `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 80px; font-size: 0.9rem; color: var(--text-secondary);">${label}</div>
                    <div style="flex: 1; height: 20px; background: var(--bg-secondary); border-radius: 10px; overflow: hidden;">
                        <div style="height: 100%; width: ${score}%; background: ${color}; border-radius: 10px; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="width: 40px; text-align: right; font-weight: bold; color: ${color};">${score}%</div>
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
            const color = rate >= target ? '#4CAF50' : rate >= target - 10 ? '#FF9800' : '#F44336';
            const height = Math.max(10, rate);
            
            return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <div style="height: 100px; display: flex; align-items: end;">
                        <div style="width: 20px; height: ${height}%; background: ${color}; border-radius: 2px 2px 0 0;" title="${rate}% attendance"></div>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center;">${label}</div>
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
            
            let text = 'No change';
            switch (trend) {
                case 'positive':
                    text = 'Improving';
                    break;
                case 'negative':
                    text = 'Declining';
                    break;
                case 'warning':
                    text = 'Attention needed';
                    break;
            }
            
            const textElement = trendElement.querySelector('.trend-text');
            if (textElement) {
                textElement.textContent = text;
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
            
            // Reset filters
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
            this.updateFilterDisplay();
            
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
            this.showError('No data available to export');
            return;
        }

        try {
            const dataToExport = {
                exportDate: new Date().toISOString(),
                filters: this.filters,
                summary: this.analyticsData.summary,
                data: this.analyticsData
            };

            const dataStr = JSON.stringify(dataToExport, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            this.showSuccess('Analytics data exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Failed to export analytics data');
        }
    }

    /**
     * Print analytics report
     */
    printAnalytics() {
        window.print();
    }

    /**
     * Refresh all data
     */
    async refreshData() {
        try {
            this.showLoading(true);
            await this.loadInitialData();
            await this.loadAnalyticsData();
            this.renderCharts();
            this.updateAnalyticsSummary();
            this.showSuccess('Data refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.showError('Failed to refresh data');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Setup auto-refresh functionality
     */
    setupAutoRefresh() {
        // Auto-refresh every 5 minutes
        setInterval(() => {
            this.refreshData();
        }, 5 * 60 * 1000);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Re-render charts on resize
        if (this.isInitialized && this.analyticsData) {
            this.renderCharts();
        }
    }

    /**
     * Update URL with current filters (for bookmarking)
     */
    updateURL() {
        const params = new URLSearchParams();
        
        if (this.filters.employeeId) {
            params.set('employee', this.filters.employeeId);
        }
        if (this.selectedDateRange) {
            params.set('range', this.selectedDateRange);
        }
        if (this.filters.department) {
            params.set('department', this.filters.department);
        }
        
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
    }

    /**
     * Update filter display
     */
    updateFilterDisplay() {
        const filterStatus = document.getElementById('filterStatus');
        if (!filterStatus) return;

        const activeFilters = [];
        
        if (this.filters.employeeId) {
            activeFilters.push('Employee');
        }
        if (this.filters.department) {
            activeFilters.push('Department');
        }
        if (this.selectedDateRange !== 'last30days') {
            activeFilters.push('Date Range');
        }

        if (activeFilters.length > 0) {
            filterStatus.textContent = `Active filters: ${activeFilters.join(', ')}`;
        } else {
            filterStatus.textContent = 'No filters active';
        }
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        const loadingOverlay = document.getElementById('analyticsLoading');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
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
     * Get current state for debugging
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            currentEmployee: this.currentEmployee,
            selectedDateRange: this.selectedDateRange,
            filters: this.filters,
            hasData: !!this.analyticsData,
            chartsCount: this.charts.size
        };
    }

    /**
     * Cleanup and destroy controller
     */
    destroy() {
        this.charts.clear();
        this.isInitialized = false;
        this.analyticsData = null;
        console.log('Analytics controller destroyed');
    }
}

// Create analytics controller instance
const analyticsController = new AnalyticsController();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = analyticsController;
} else if (typeof window !== 'undefined') {
    window.analyticsController = analyticsController;
}

// Wait for DirectFlow auth to be ready before initializing
function initializeWhenReady() {
    if (typeof window.directFlowAuth !== 'undefined' && window.directFlowAuth.initialized) {
        console.log('DirectFlow auth ready, initializing analytics...');
        analyticsController.init().catch(error => {
            console.error('Failed to initialize analytics:', error);
        });
    } else {
        console.log('Waiting for DirectFlow auth...');
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
