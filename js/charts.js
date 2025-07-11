/**
 * Charts and Data Visualization Module
 * Provides comprehensive chart functionality for the Bricks Attendance System
 * Uses ApexCharts library with responsive design and theme support
 */

class ChartsManager {
    constructor() {
        this.charts = new Map();
        this.defaultOptions = {};
        this.themeColors = {};
        this.isInitialized = false;
        
        // ApexCharts default configuration
        this.chartDefaults = {
            chart: {
                fontFamily: '"San Francisco", -apple-system, BlinkMacSystemFont, sans-serif',
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                },
                toolbar: {
                    show: false
                },
                zoom: {
                    enabled: false
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            grid: {
                borderColor: '#e0e6ed',
                strokeDashArray: 5,
                xaxis: {
                    lines: {
                        show: false
                    }
                },
                yaxis: {
                    lines: {
                        show: true
                    }
                },
                padding: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'left',
                fontSize: '12px',
                fontWeight: 500,
                markers: {
                    width: 12,
                    height: 12,
                    strokeWidth: 0,
                    radius: 12
                },
                itemMargin: {
                    horizontal: 20,
                    vertical: 8
                }
            },
            tooltip: {
                enabled: true,
                style: {
                    fontSize: '12px',
                    fontFamily: '"San Francisco", -apple-system, BlinkMacSystemFont, sans-serif'
                },
                x: {
                    show: true
                },
                y: {
                    formatter: function(val) {
                        return val;
                    }
                },
                marker: {
                    show: true
                }
            },
            responsive: [{
                breakpoint: 768,
                options: {
                    chart: {
                        height: 300
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };
        
        this.init();
    }

    init() {
        this.updateThemeColors();
        this.isInitialized = true;
        console.log('ApexCharts Manager initialized');
    }

    updateThemeColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        this.themeColors = {
            primary: isDark ? '#007aff' : '#007aff',
            secondary: isDark ? '#34c759' : '#34c759',
            tertiary: isDark ? '#af52de' : '#af52de',
            warning: isDark ? '#ff9500' : '#ff9500',
            danger: isDark ? '#ff3b30' : '#ff3b30',
            info: isDark ? '#5ac8fa' : '#5ac8fa',
            
            text: isDark ? '#ffffff' : '#1f2937',
            textSecondary: isDark ? '#a1a1aa' : '#6b7280',
            background: isDark ? '#1f2937' : '#ffffff',
            surface: isDark ? '#374151' : '#f9fafb',
            border: isDark ? '#4b5563' : '#e5e7eb'
        };

        // Update default grid colors based on theme
        this.chartDefaults.grid.borderColor = this.themeColors.border;
        this.chartDefaults.theme = {
            mode: isDark ? 'dark' : 'light'
        };
    }

    getColorPalette() {
        return [
            this.themeColors.primary,
            this.themeColors.secondary,
            this.themeColors.tertiary,
            this.themeColors.warning,
            this.themeColors.danger,
            this.themeColors.info,
            '#6366f1', // indigo
            '#8b5cf6', // violet
            '#ec4899', // pink
            '#06b6d4'  // cyan
        ];
    }

    createChart(containerId, chartType, data, customOptions = {}) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Container with ID '${containerId}' not found`);
                return null;
            }

            // Destroy existing chart if it exists
            this.destroyChart(containerId);

            // Merge default options with custom options
            const options = this.mergeOptions(chartType, data, customOptions);
            
            // Create new chart
            const chart = new ApexCharts(container, options);
            chart.render();
            
            // Store chart reference
            this.charts.set(containerId, chart);
            
            console.log(`Chart created: ${containerId} (${chartType})`);
            return chart;
            
        } catch (error) {
            console.error(`Error creating chart ${containerId}:`, error);
            this.createFallbackChart(containerId, chartType, data);
            return null;
        }
    }

    mergeOptions(chartType, data, customOptions) {
        let typeSpecificOptions = {};
        
        switch (chartType) {
            case 'line':
                typeSpecificOptions = this.getLineChartOptions(data);
                break;
            case 'bar':
                typeSpecificOptions = this.getBarChartOptions(data);
                break;
            case 'pie':
            case 'donut':
                typeSpecificOptions = this.getPieChartOptions(data, chartType);
                break;
            case 'area':
                typeSpecificOptions = this.getAreaChartOptions(data);
                break;
            case 'radar':
                typeSpecificOptions = this.getRadarChartOptions(data);
                break;
            case 'radialBar':
                typeSpecificOptions = this.getRadialBarOptions(data);
                break;
            default:
                typeSpecificOptions = this.getLineChartOptions(data);
        }
        
        // Deep merge all options
        return this.deepMerge(this.chartDefaults, typeSpecificOptions, customOptions);
    }

    getLineChartOptions(data) {
        return {
            chart: {
                type: 'line',
                height: 350
            },
            series: data.datasets.map(dataset => ({
                name: dataset.label,
                data: dataset.data
            })),
            xaxis: {
                categories: data.labels,
                labels: {
                    style: {
                        colors: this.themeColors.textSecondary,
                        fontSize: '11px'
                    }
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: this.themeColors.textSecondary,
                        fontSize: '11px'
                    }
                }
            },
            colors: this.getColorPalette()
        };
    }

    getBarChartOptions(data) {
        return {
            chart: {
                type: 'bar',
                height: 350
            },
            series: data.datasets.map(dataset => ({
                name: dataset.label,
                data: dataset.data
            })),
            xaxis: {
                categories: data.labels,
                labels: {
                    style: {
                        colors: this.themeColors.textSecondary,
                        fontSize: '11px'
                    }
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: this.themeColors.textSecondary,
                        fontSize: '11px'
                    }
                }
            },
            colors: this.getColorPalette(),
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    columnWidth: '60%'
                }
            }
        };
    }

    getPieChartOptions(data, type = 'pie') {
        return {
            chart: {
                type: type,
                height: 350
            },
            series: data.datasets[0].data,
            labels: data.labels,
            colors: this.getColorPalette(),
            plotOptions: {
                pie: {
                    donut: {
                        size: type === 'donut' ? '60%' : '0%'
                    }
                }
            }
        };
    }

    getAreaChartOptions(data) {
        return {
            chart: {
                type: 'area',
                height: 350
            },
            series: data.datasets.map(dataset => ({
                name: dataset.label,
                data: dataset.data
            })),
            xaxis: {
                categories: data.labels,
                labels: {
                    style: {
                        colors: this.themeColors.textSecondary,
                        fontSize: '11px'
                    }
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: this.themeColors.textSecondary,
                        fontSize: '11px'
                    }
                }
            },
            colors: this.getColorPalette(),
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    type: 'vertical',
                    colorStops: [
                        {
                            offset: 0,
                            color: this.themeColors.primary,
                            opacity: 0.4
                        },
                        {
                            offset: 100,
                            color: this.themeColors.primary,
                            opacity: 0.1
                        }
                    ]
                }
            }
        };
    }

    getRadarChartOptions(data) {
        return {
            chart: {
                type: 'radar',
                height: 350
            },
            series: data.datasets.map(dataset => ({
                name: dataset.label,
                data: dataset.data
            })),
            xaxis: {
                categories: data.labels
            },
            colors: this.getColorPalette(),
            markers: {
                size: 4
            }
        };
    }

    getRadialBarOptions(data) {
        return {
            chart: {
                type: 'radialBar',
                height: 350
            },
            series: data.datasets[0].data,
            labels: data.labels,
            colors: this.getColorPalette(),
            plotOptions: {
                radialBar: {
                    dataLabels: {
                        name: {
                            fontSize: '22px'
                        },
                        value: {
                            fontSize: '16px'
                        },
                        total: {
                            show: true,
                            label: 'Total',
                            formatter: function (w) {
                                return w.globals.seriesTotals.reduce((a, b) => {
                                    return a + b;
                                }, 0);
                            }
                        }
                    }
                }
            }
        };
    }

    updateChart(containerId, newData, newOptions = {}) {
        const chart = this.charts.get(containerId);
        if (!chart) {
            console.error(`Chart with ID '${containerId}' not found`);
            return;
        }

        try {
            if (newData.series) {
                chart.updateSeries(newData.series);
            }
            
            if (newData.labels || newData.categories) {
                chart.updateOptions({
                    xaxis: {
                        categories: newData.labels || newData.categories
                    }
                });
            }
            
            if (Object.keys(newOptions).length > 0) {
                chart.updateOptions(newOptions);
            }
        } catch (error) {
            console.error(`Error updating chart ${containerId}:`, error);
        }
    }

    destroyChart(containerId) {
        const chart = this.charts.get(containerId);
        if (chart) {
            chart.destroy();
            this.charts.delete(containerId);
        }
    }

    destroyAllCharts() {
        this.charts.forEach((chart, containerId) => {
            this.destroyChart(containerId);
        });
    }

    onThemeChange() {
        this.updateThemeColors();
        
        // Update all existing charts
        this.charts.forEach((chart, containerId) => {
            const options = {
                theme: {
                    mode: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
                },
                grid: {
                    borderColor: this.themeColors.border
                }
            };
            
            chart.updateOptions(options);
        });
    }

    createFallbackChart(containerId, chartType, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="chart-fallback">
                <div class="chart-fallback-content">
                    <div class="chart-fallback-icon">📊</div>
                    <h3>Chart Unavailable</h3>
                    <p>Unable to render ${chartType} chart</p>
                    <details>
                        <summary>View Data</summary>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    </details>
                </div>
            </div>
        `;
    }

    // Chart.js compatibility methods
    createAttendanceStatsChart(canvasId, data) {
        const chartData = {
            labels: ['Present', 'Late', 'Absent', 'On Leave'],
            datasets: [{
                data: [
                    data.present || 0,
                    data.late || 0,
                    data.absent || 0,
                    data.onLeave || 0
                ]
            }]
        };
        
        return this.createChart(canvasId, 'donut', chartData);
    }

    createTardinessTrendsChart(canvasId, data) {
        const chartData = {
            labels: data.labels || [],
            datasets: [{
                label: 'Late Arrivals',
                data: data.lateArrivals || []
            }, {
                label: 'Average Delay (minutes)',
                data: data.averageDelay || []
            }]
        };
        
        return this.createChart(canvasId, 'line', chartData);
    }

    createPresencePatternsChart(canvasId, data) {
        const chartData = {
            labels: data.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Present',
                data: data.present || []
            }, {
                label: 'Late',
                data: data.late || []
            }, {
                label: 'Absent',
                data: data.absent || []
            }]
        };
        
        return this.createChart(canvasId, 'bar', chartData, {
            chart: {
                stacked: true
            }
        });
    }

    createPayrollChart(canvasId, data) {
        const chartData = {
            labels: data.labels || [],
            datasets: [{
                label: 'Regular Hours',
                data: data.regularHours || []
            }, {
                label: 'Overtime Hours',
                data: data.overtimeHours || []
            }]
        };
        
        return this.createChart(canvasId, 'bar', chartData, {
            chart: {
                stacked: true
            }
        });
    }

    createPerformanceChart(canvasId, data) {
        const chartData = {
            labels: data.labels || ['Punctuality', 'Attendance', 'Overtime', 'Consistency', 'Reliability'],
            datasets: [{
                label: data.employeeName || 'Employee Performance',
                data: data.scores || [80, 90, 70, 85, 88]
            }]
        };
        
        return this.createChart(canvasId, 'radar', chartData);
    }

    createTimeTrackingChart(canvasId, data) {
        const chartData = {
            labels: data.labels || [],
            datasets: [{
                label: 'Check-in Time',
                data: data.checkinTimes || []
            }, {
                label: 'Check-out Time',
                data: data.checkoutTimes || []
            }]
        };
        
        return this.createChart(canvasId, 'line', chartData);
    }

    createMonthlyOverviewChart(canvasId, data) {
        const chartData = {
            labels: data.labels || [],
            datasets: [{
                label: 'Attendance Rate',
                data: data.attendanceRate || []
            }, {
                label: 'Target Rate',
                data: data.targetRate || []
            }]
        };
        
        return this.createChart(canvasId, 'area', chartData);
    }

    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    // Factory methods for common chart types
    createAttendanceChart(containerId, attendanceData) {
        return this.createChart(containerId, 'line', {
            labels: attendanceData.labels,
            datasets: [{
                label: 'Present',
                data: attendanceData.present
            }, {
                label: 'Absent',
                data: attendanceData.absent
            }, {
                label: 'Late',
                data: attendanceData.late
            }]
        });
    }

    createDashboardChart(containerId, dashboardData) {
        return this.createChart(containerId, 'area', {
            labels: dashboardData.labels,
            datasets: [{
                label: 'Trends',
                data: dashboardData.values
            }]
        });
    }
}

// Global instance - create immediately to avoid temporal dead zone issues
let chartsManager = null;

// Safe initialization function
const initializeChartsManager = () => {
    if (!chartsManager && typeof ApexCharts !== 'undefined') {
        chartsManager = new ChartsManager();
        window.chartsManager = chartsManager;
        console.log('Charts Manager initialized with ApexCharts');
        return true;
    } else if (!chartsManager) {
        console.warn('ApexCharts library not loaded - charts manager not initialized');
        return false;
    }
    return true;
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeChartsManager();
});

// Also try to initialize immediately if ApexCharts is already available
if (typeof ApexCharts !== 'undefined') {
    initializeChartsManager();
}

// Theme change handler
document.addEventListener('themeChanged', () => {
    if (chartsManager) {
        chartsManager.onThemeChange();
    }
});

// Initialize immediately if DOM is already ready
if (document.readyState === 'loading') {
    // Wait for DOMContentLoaded event
} else {
    // DOM is already ready, try to initialize
    initializeChartsManager();
}

// Export for global access and provide fallback
window.chartsManager = chartsManager;

// Provide a getter for safe access
Object.defineProperty(window, 'getChartsManager', {
    value: function() {
        if (!chartsManager) {
            initializeChartsManager();
        }
        return chartsManager;
    },
    writable: false,
    configurable: false
});