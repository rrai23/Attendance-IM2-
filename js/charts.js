/**
 * Charts and Data Visualization Module
 * Provides comprehensive chart functionality for the Bricks Attendance System
 * Uses Chart.js library with responsive design and theme support
 */

class ChartsManager {
    constructor() {
        this.charts = new Map();
        this.defaultOptions = {};
        this.themeColors = {};
        this.isInitialized = false;
        
        // Chart.js default configuration
        this.chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'start',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    padding: 12,
                    titleFont: {
                        family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                        size: 13,
                        weight: '600'
                    },
                    bodyFont: {
                        family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                        size: 12,
                        weight: '400'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        font: {
                            family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                            size: 11,
                            weight: '400'
                        },
                        padding: 8
                    }
                },
                y: {
                    grid: {
                        display: true,
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        font: {
                            family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                            size: 11,
                            weight: '400'
                        },
                        padding: 8
                    }
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 6,
                    borderWidth: 2
                },
                line: {
                    borderWidth: 2,
                    tension: 0.4
                },
                bar: {
                    borderRadius: 4,
                    borderSkipped: false
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        };

        this.init();
    }

    /**
     * Initialize the charts manager
     */
    async init() {
        this.setupThemeColors();
        this.setupThemeListener();
        try {
            await this.waitForChartJS();
            this.registerChartDefaults();
            this.isInitialized = true;
            console.log('ChartsManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ChartsManager:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Wait for Chart.js to be available
     */
    async waitForChartJS() {
        return new Promise((resolve, reject) => {
            const maxWait = 5000; // 5 seconds
            const checkInterval = 100;
            let waited = 0;

            const check = () => {
                console.log('ChartsManager checking for Chart.js...', typeof Chart);
                if (typeof Chart !== 'undefined' && Chart.register) {
                    console.log('Chart.js is available for ChartsManager');
                    resolve();
                } else if (waited >= maxWait) {
                    console.warn('Chart.js not available after 5 seconds - ChartsManager will run in fallback mode');
                    resolve(); // Resolve anyway to allow fallback mode
                } else {
                    waited += checkInterval;
                    setTimeout(check, checkInterval);
                }
            };
            check();
        });
    }

    /**
     * Setup theme colors for light and dark modes
     */
    setupThemeColors() {
        this.themeColors = {
            light: {
                background: '#ffffff',
                surface: '#f8f9fa',
                text: {
                    primary: '#1d1d1f',
                    secondary: '#6e6e73',
                    tertiary: '#8e8e93'
                },
                grid: '#e5e5e7',
                border: '#d2d2d7',
                accent: {
                    primary: 'var(--accent-primary, #007aff)',
                    light: 'var(--accent-light, rgba(0, 122, 255, 0.1))',
                    hover: 'var(--accent-hover, rgba(0, 122, 255, 0.8))'
                },
                success: '#34c759',
                warning: '#ff9500',
                error: '#ff3b30',
                info: '#5ac8fa'
            },
            dark: {
                background: '#1c1c1e',
                surface: '#2c2c2e',
                text: {
                    primary: '#ffffff',
                    secondary: '#ebebf5',
                    tertiary: '#ebebf599'
                },
                grid: '#38383a',
                border: '#48484a',
                accent: {
                    primary: 'var(--accent-primary, #0a84ff)',
                    light: 'var(--accent-light, rgba(10, 132, 255, 0.1))',
                    hover: 'var(--accent-hover, rgba(10, 132, 255, 0.8))'
                },
                success: '#30d158',
                warning: '#ff9f0a',
                error: '#ff453a',
                info: '#64d2ff'
            }
        };
    }

    /**
     * Setup theme change listener
     */
    setupThemeListener() {
        document.addEventListener('themechange', (event) => {
            this.updateAllChartsTheme(event.detail.theme);
        });

        // Also listen for manual theme changes
        if (window.themeManager) {
            const currentTheme = window.themeManager.getTheme();
            this.currentTheme = currentTheme;
        }
    }

    /**
     * Register Chart.js defaults
     */
    registerChartDefaults() {
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif';
            Chart.defaults.color = this.getCurrentThemeColors().text.secondary;
            console.log('Chart.js defaults registered');
        } else {
            console.error('Chart.js is not available when trying to register defaults');
        }
    }

    /**
     * Get current theme colors
     */
    getCurrentThemeColors() {
        const theme = window.themeManager ? window.themeManager.getTheme() : 'light';
        return this.themeColors[theme] || this.themeColors.light;
    }

    /**
     * Create attendance statistics chart
     */
    createAttendanceStatsChart(canvasId, data) {
        console.log('createAttendanceStatsChart called, Chart type:', typeof Chart, 'Manager initialized:', this.isInitialized);
        
        if (!this.isInitialized || typeof Chart === 'undefined' || !Chart.register) {
            console.error('Chart.js or ChartsManager not ready - creating fallback visualization');
            return this.createFallbackChart(canvasId, data);
        }

        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        const colors = this.getCurrentThemeColors();
        const config = {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Late', 'Absent', 'On Leave'],
                datasets: [{
                    data: [
                        data.present || 0,
                        data.late || 0,
                        data.absent || 0,
                        data.onLeave || 0
                    ],
                    backgroundColor: [
                        colors.success,
                        colors.warning,
                        colors.error,
                        colors.info
                    ],
                    borderColor: colors.background,
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                ...this.chartDefaults,
                cutout: '60%',
                plugins: {
                    ...this.chartDefaults.plugins,
                    legend: {
                        ...this.chartDefaults.plugins.legend,
                        position: 'bottom',
                        labels: {
                            ...this.chartDefaults.plugins.legend.labels,
                            color: colors.text.primary
                        }
                    },
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create tardiness trends chart
     */
    createTardinessTrendsChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        const colors = this.getCurrentThemeColors();
        const config = {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Late Arrivals',
                    data: data.lateArrivals || [],
                    borderColor: colors.warning,
                    backgroundColor: this.hexToRgba(colors.warning, 0.1),
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Average Delay (minutes)',
                    data: data.averageDelay || [],
                    borderColor: colors.error,
                    backgroundColor: this.hexToRgba(colors.error, 0.1),
                    fill: false,
                    yAxisID: 'y1'
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    x: {
                        ...this.chartDefaults.scales.x,
                        grid: {
                            ...this.chartDefaults.scales.x.grid,
                            color: colors.grid
                        },
                        ticks: {
                            ...this.chartDefaults.scales.x.ticks,
                            color: colors.text.secondary
                        }
                    },
                    y: {
                        ...this.chartDefaults.scales.y,
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Number of Late Arrivals',
                            color: colors.text.primary,
                            font: {
                                family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            ...this.chartDefaults.scales.y.grid,
                            color: colors.grid
                        },
                        ticks: {
                            ...this.chartDefaults.scales.y.ticks,
                            color: colors.text.secondary
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Average Delay (minutes)',
                            color: colors.text.primary,
                            font: {
                                family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                            color: colors.grid
                        },
                        ticks: {
                            color: colors.text.secondary,
                            font: {
                                family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                                size: 11,
                                weight: '400'
                            }
                        }
                    }
                },
                plugins: {
                    ...this.chartDefaults.plugins,
                    legend: {
                        ...this.chartDefaults.plugins.legend,
                        labels: {
                            ...this.chartDefaults.plugins.legend.labels,
                            color: colors.text.primary
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create presence patterns chart
     */
    createPresencePatternsChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        const colors = this.getCurrentThemeColors();
        const config = {
            type: 'bar',
            data: {
                labels: data.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Present',
                    data: data.present || [],
                    backgroundColor: colors.success,
                    borderColor: colors.success,
                    borderRadius: 4,
                    borderSkipped: false
                }, {
                    label: 'Late',
                    data: data.late || [],
                    backgroundColor: colors.warning,
                    borderColor: colors.warning,
                    borderRadius: 4,
                    borderSkipped: false
                }, {
                    label: 'Absent',
                    data: data.absent || [],
                    backgroundColor: colors.error,
                    borderColor: colors.error,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    x: {
                        ...this.chartDefaults.scales.x,
                        stacked: true,
                        grid: {
                            ...this.chartDefaults.scales.x.grid,
                            color: colors.grid
                        },
                        ticks: {
                            ...this.chartDefaults.scales.x.ticks,
                            color: colors.text.secondary
                        }
                    },
                    y: {
                        ...this.chartDefaults.scales.y,
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Number of Employees',
                            color: colors.text.primary,
                            font: {
                                family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            ...this.chartDefaults.scales.y.grid,
                            color: colors.grid
                        },
                        ticks: {
                            ...this.chartDefaults.scales.y.ticks,
                            color: colors.text.secondary
                        }
                    }
                },
                plugins: {
                    ...this.chartDefaults.plugins,
                    legend: {
                        ...this.chartDefaults.plugins.legend,
                        labels: {
                            ...this.chartDefaults.plugins.legend.labels,
                            color: colors.text.primary
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create payroll visualization chart
     */
    createPayrollChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        const colors = this.getCurrentThemeColors();
        const config = {
            type: 'bar',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Regular Hours',
                    data: data.regularHours || [],
                    backgroundColor: colors.accent.primary,
                    borderColor: colors.accent.primary,
                    borderRadius: 4,
                    borderSkipped: false
                }, {
                    label: 'Overtime Hours',
                    data: data.overtimeHours || [],
                    backgroundColor: colors.warning,
                    borderColor: colors.warning,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    x: {
                        ...this.chartDefaults.scales.x,
                        stacked: true,
                        grid: {
                            ...this.chartDefaults.scales.x.grid,
                            color: colors.grid
                        },
                        ticks: {
                            ...this.chartDefaults.scales.x.ticks,
                            color: colors.text.secondary
                        }
                    },
                    y: {
                        ...this.chartDefaults.scales.y,
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Hours Worked',
                            color: colors.text.primary,
                            font: {
                                family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            ...this.chartDefaults.scales.y.grid,
                            color: colors.grid
                        },
                        ticks: {
                            ...this.chartDefaults.scales.y.ticks,
                            color: colors.text.secondary
                        }
                    }
                },
                plugins: {
                    ...this.chartDefaults.plugins,
                    legend: {
                        ...this.chartDefaults.plugins.legend,
                        labels: {
                            ...this.chartDefaults.plugins.legend.labels,
                            color: colors.text.primary
                        }
                    },
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            afterLabel: (context) => {
                                if (context.datasetIndex === 0) {
                                    const regularRate = data.regularRate || 15;
                                    const amount = context.parsed.y * regularRate;
                                    return `Pay: $${amount.toFixed(2)}`;
                                } else if (context.datasetIndex === 1) {
                                    const overtimeRate = data.overtimeRate || 22.5;
                                    const amount = context.parsed.y * overtimeRate;
                                    return `Overtime Pay: $${amount.toFixed(2)}`;
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create performance metrics chart
     */
    createPerformanceChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        const colors = this.getCurrentThemeColors();
        const config = {
            type: 'radar',
            data: {
                labels: data.labels || ['Punctuality', 'Attendance', 'Overtime', 'Consistency', 'Reliability'],
                datasets: [{
                    label: data.employeeName || 'Employee Performance',
                    data: data.scores || [80, 90, 70, 85, 88],
                    borderColor: colors.accent.primary,
                    backgroundColor: this.hexToRgba(colors.accent.primary, 0.2),
                    pointBackgroundColor: colors.accent.primary,
                    pointBorderColor: colors.background,
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    r: {
                        angleLines: {
                            color: colors.grid
                        },
                        grid: {
                            color: colors.grid
                        },
                        pointLabels: {
                            color: colors.text.primary,
                            font: {
                                family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                                size: 12,
                                weight: '500'
                            }
                        },
                        ticks: {
                            color: colors.text.secondary,
                            backdropColor: 'transparent',
                            font: {
                                family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                                size: 10
                            }
                        },
                        min: 0,
                        max: 100,
                        stepSize: 20
                    }
                },
                plugins: {
                    ...this.chartDefaults.plugins,
                    legend: {
                        ...this.chartDefaults.plugins.legend,
                        display: false
                    },
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                return `${context.label}: ${context.parsed.r}%`;
                            }
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create time tracking chart
     */
    createTimeTrackingChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        const colors = this.getCurrentThemeColors();
        const config = {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Check-in Time',
                    data: data.checkinTimes || [],
                    borderColor: colors.success,
                    backgroundColor: this.hexToRgba(colors.success, 0.1),
                    fill: false,
                    tension: 0.4
                }, {
                    label: 'Check-out Time',
                    data: data.checkoutTimes || [],
                    borderColor: colors.error,
                    backgroundColor: this.hexToRgba(colors.error, 0.1),
                    fill: false,
                    tension: 0.4
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    x: {
                        ...this.chartDefaults.scales.x,
                        grid: {
                            ...this.chartDefaults.scales.x.grid,
                            color: colors.grid
                        },
                        ticks: {
                            ...this.chartDefaults.scales.x.ticks,
                            color: colors.text.secondary
                        }
                    },
                    y: {
                        ...this.chartDefaults.scales.y,
                        type: 'time',
                        time: {
                            unit: 'hour',
                            displayFormats: {
                                hour: 'HH:mm'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time',
                            color: colors.text.primary,
                            font: {
                                family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            ...this.chartDefaults.scales.y.grid,
                            color: colors.grid
                        },
                        ticks: {
                            ...this.chartDefaults.scales.y.ticks,
                            color: colors.text.secondary
                        }
                    }
                },
                plugins: {
                    ...this.chartDefaults.plugins,
                    legend: {
                        ...this.chartDefaults.plugins.legend,
                        labels: {
                            ...this.chartDefaults.plugins.legend.labels,
                            color: colors.text.primary
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create monthly attendance overview chart
     */
    createMonthlyOverviewChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        const colors = this.getCurrentThemeColors();
        const config = {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Attendance Rate',
                    data: data.attendanceRate || [],
                    borderColor: colors.accent.primary,
                    backgroundColor: this.hexToRgba(colors.accent.primary, 0.1),
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Target Rate',
                    data: data.targetRate || [],
                    borderColor: colors.text.tertiary,
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    x: {
                        ...this.chartDefaults.scales.x,
                        grid: {
                            ...this.chartDefaults.scales.x.grid,
                            color: colors.grid
                        },
                        ticks: {
                            ...this.chartDefaults.scales.x.ticks,
                            color: colors.text.secondary
                        }
                    },
                    y: {
                        ...this.chartDefaults.scales.y,
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Attendance Rate (%)',
                            color: colors.text.primary,
                            font: {
                                family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            ...this.chartDefaults.scales.y.grid,
                            color: colors.grid
                        },
                        ticks: {
                            ...this.chartDefaults.scales.y.ticks,
                            color: colors.text.secondary,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    ...this.chartDefaults.plugins,
                    legend: {
                        ...this.chartDefaults.plugins.legend,
                        labels: {
                            ...this.chartDefaults.plugins.legend.labels,
                            color: colors.text.primary
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create fallback visualization when Chart.js is not available
     */
    createFallbackChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        // Replace canvas with HTML-based visualization
        const container = canvas.parentElement;
        const fallbackHtml = `
            <div class="fallback-chart" data-canvas-id="${canvasId}">
                <div class="fallback-chart-title">Attendance Overview</div>
                <div class="fallback-chart-data">
                    <div class="fallback-stat present">
                        <span class="stat-dot"></span>
                        <span class="stat-label">Present</span>
                        <span class="stat-value">${data.present || 0}</span>
                    </div>
                    <div class="fallback-stat late">
                        <span class="stat-dot"></span>
                        <span class="stat-label">Late</span>
                        <span class="stat-value">${data.late || 0}</span>
                    </div>
                    <div class="fallback-stat absent">
                        <span class="stat-dot"></span>
                        <span class="stat-label">Absent</span>
                        <span class="stat-value">${data.absent || 0}</span>
                    </div>
                    <div class="fallback-stat on-leave">
                        <span class="stat-dot"></span>
                        <span class="stat-label">On Leave</span>
                        <span class="stat-value">${data.onLeave || 0}</span>
                    </div>
                </div>
                <div class="fallback-chart-note">
                    <small>Chart.js not available - showing simplified view</small>
                </div>
            </div>
            <style>
                .fallback-chart {
                    padding: 20px;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-md);
                    text-align: center;
                }
                .fallback-chart-title {
                    font-size: var(--font-size-lg);
                    font-weight: var(--font-weight-semibold);
                    margin-bottom: var(--spacing-lg);
                    color: var(--text-primary);
                }
                .fallback-chart-data {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-lg);
                }
                .fallback-stat {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    padding: var(--spacing-sm);
                    background: var(--bg-primary);
                    border-radius: var(--radius-sm);
                }
                .fallback-stat .stat-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                }
                .fallback-stat.present .stat-dot { background: #34c759; }
                .fallback-stat.late .stat-dot { background: #ff9500; }
                .fallback-stat.absent .stat-dot { background: #ff3b30; }
                .fallback-stat.on-leave .stat-dot { background: #5ac8fa; }
                .fallback-stat .stat-label {
                    flex: 1;
                    text-align: left;
                    font-size: var(--font-size-sm);
                    color: var(--text-secondary);
                }
                .fallback-stat .stat-value {
                    font-weight: var(--font-weight-semibold);
                    color: var(--text-primary);
                }
                .fallback-chart-note {
                    color: var(--text-tertiary);
                    font-style: italic;
                }
            </style>
        `;

        container.innerHTML = fallbackHtml;
        
        // Store fallback chart reference
        const fallbackChart = {
            type: 'fallback',
            canvasId: canvasId,
            data: data,
            update: function(newData) {
                // Update fallback chart data
                if (newData && newData.datasets && newData.datasets[0]) {
                    const values = newData.datasets[0].data;
                    const container = document.querySelector(`[data-canvas-id="${canvasId}"]`);
                    if (container && values) {
                        const stats = container.querySelectorAll('.stat-value');
                        if (stats[0]) stats[0].textContent = values[0] || 0;
                        if (stats[1]) stats[1].textContent = values[1] || 0;
                        if (stats[2]) stats[2].textContent = values[2] || 0;
                        if (stats[3]) stats[3].textContent = values[3] || 0;
                    }
                }
            },
            destroy: function() {
                const container = document.querySelector(`[data-canvas-id="${canvasId}"]`);
                if (container) {
                    container.remove();
                }
            }
        };
        
        this.charts.set(canvasId, fallbackChart);
        return fallbackChart;
    }

    /**
     * Update chart data
     */
    updateChart(canvasId, newData) {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`Chart with id '${canvasId}' not found`);
            return false;
        }

        // Update data
        if (newData.labels) {
            chart.data.labels = newData.labels;
        }
        
        if (newData.datasets) {
            newData.datasets.forEach((dataset, index) => {
                if (chart.data.datasets[index]) {
                    Object.assign(chart.data.datasets[index], dataset);
                }
            });
        }

        chart.update('active');
        return true;
    }

    /**
     * Update all charts theme
     */
    updateAllChartsTheme(theme) {
        const colors = this.themeColors[theme] || this.themeColors.light;
        
        this.charts.forEach((chart, canvasId) => {
            this.updateChartTheme(chart, colors);
        });
    }

    /**
     * Update individual chart theme
     */
    updateChartTheme(chart, colors) {
        // Update legend colors
        if (chart.options.plugins.legend.labels) {
            chart.options.plugins.legend.labels.color = colors.text.primary;
        }

        // Update scale colors
        if (chart.options.scales) {
            Object.keys(chart.options.scales).forEach(scaleKey => {
                const scale = chart.options.scales[scaleKey];
                if (scale.grid) {
                    scale.grid.color = colors.grid;
                }
                if (scale.ticks) {
                    scale.ticks.color = colors.text.secondary;
                }
                if (scale.title) {
                    scale.title.color = colors.text.primary;
                }
                if (scale.pointLabels) {
                    scale.pointLabels.color = colors.text.primary;
                }
            });
        }

        // Update tooltip colors
        if (chart.options.plugins.tooltip) {
            chart.options.plugins.tooltip.backgroundColor = colors.background === '#ffffff' 
                ? 'rgba(0, 0, 0, 0.8)' 
                : 'rgba(255, 255, 255, 0.9)';
            chart.options.plugins.tooltip.titleColor = colors.background === '#ffffff' 
                ? '#ffffff' 
                : '#000000';
            chart.options.plugins.tooltip.bodyColor = colors.background === '#ffffff' 
                ? '#ffffff' 
                : '#000000';
        }

        chart.update('none');
    }

    /**
     * Destroy a specific chart
     */
    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
            return true;
        }
        return false;
    }

    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        this.charts.forEach((chart, canvasId) => {
            chart.destroy();
        });
        this.charts.clear();
    }

    /**
     * Resize all charts
     */
    resizeAllCharts() {
        this.charts.forEach((chart) => {
            chart.resize();
        });
    }

    /**
     * Get chart instance
     */
    getChart(canvasId) {
        return this.charts.get(canvasId);
    }

    /**
     * Get all chart instances
     */
    getAllCharts() {
        return Array.from(this.charts.values());
    }

    /**
     * Convert hex color to rgba
     */
    hexToRgba(hex, alpha = 1) {
        // Handle CSS variables
        if (hex.startsWith('var(')) {
            const computedStyle = getComputedStyle(document.documentElement);
            const varName = hex.match(/var\(([^)]+)\)/)[1];
            hex = computedStyle.getPropertyValue(varName).trim();
        }

        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse hex values
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Generate gradient for chart backgrounds
     */
    createGradient(ctx, color1, color2, direction = 'vertical') {
        const gradient = direction === 'vertical' 
            ? ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
            : ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
        
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        return gradient;
    }

    /**
     * Export chart as image
     */
    exportChart(canvasId, format = 'png') {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`Chart with id '${canvasId}' not found`);
            return null;
        }

        return chart.toBase64Image(format);
    }

    /**
     * Print chart
     */
    printChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`Chart with id '${canvasId}' not found`);
            return false;
        }

        const imageData = chart.toBase64Image();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Chart Print</title>
                    <style>
                        body { margin: 0; padding: 20px; text-align: center; }
                        img { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
                    <img src="${imageData}" alt="Chart" />
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
        
        return true;
    }

    /**
     * Get chart statistics
     */
    getChartStats() {
        return {
            totalCharts: this.charts.size,
            chartIds: Array.from(this.charts.keys()),
            isInitialized: this.isInitialized,
            currentTheme: this.getCurrentThemeColors()
        };
    }
}

// Create and export charts manager instance
const chartsManager = new ChartsManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = chartsManager;
} else if (typeof window !== 'undefined') {
    window.chartsManager = chartsManager;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        if (!chartsManager.isInitialized) {
            await chartsManager.init();
        }
    });
} else {
    if (!chartsManager.isInitialized) {
        chartsManager.init().catch(console.error);
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    chartsManager.resizeAllCharts();
});

// Export utility functions for easy access
window.createAttendanceStatsChart = (canvasId, data) => chartsManager.createAttendanceStatsChart(canvasId, data);
window.createTardinessTrendsChart = (canvasId, data) => chartsManager.createTardinessTrendsChart(canvasId, data);
window.createPresencePatternsChart = (canvasId, data) => chartsManager.createPresencePatternsChart(canvasId, data);
window.createPayrollChart = (canvasId, data) => chartsManager.createPayrollChart(canvasId, data);
window.createPerformanceChart = (canvasId, data) => chartsManager.createPerformanceChart(canvasId, data);
window.createTimeTrackingChart = (canvasId, data) => chartsManager.createTimeTrackingChart(canvasId, data);
window.createMonthlyOverviewChart = (canvasId, data) => chartsManager.createMonthlyOverviewChart(canvasId, data);
window.updateChart = (canvasId, newData) => chartsManager.updateChart(canvasId, newData);
window.destroyChart = (canvasId) => chartsManager.destroyChart(canvasId);
window.exportChart = (canvasId, format) => chartsManager.exportChart(canvasId, format);
window.printChart = (canvasId) => chartsManager.printChart(canvasId);

// Export the class for advanced usage
window.ChartsManager = ChartsManager;