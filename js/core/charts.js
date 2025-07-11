// Chart utilities for the Bricks Attendance System using Chart.js
class Charts {
    constructor() {
        this.chartInstances = new Map();
        this.defaultOptions = this.getDefaultChartOptions();
    }

    /**
     * Get default chart options with theme support
     */
    getDefaultChartOptions() {
        const theming = window.BricksTheming || window.Theming;
        const colors = theming ? theming.getChartColorPalette() : this.getFallbackColors();

        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    labels: {
                        color: colors.text,
                        font: {
                            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: colors.tooltip.background,
                    titleColor: colors.tooltip.text,
                    bodyColor: colors.tooltip.text,
                    borderColor: colors.tooltip.border,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    font: {
                        family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: colors.grid,
                        borderColor: colors.grid
                    },
                    ticks: {
                        color: colors.text,
                        font: {
                            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }
                    }
                },
                y: {
                    grid: {
                        color: colors.grid,
                        borderColor: colors.grid
                    },
                    ticks: {
                        color: colors.text,
                        font: {
                            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }
                    }
                }
            }
        };
    }

    /**
     * Get fallback colors if theming is not available
     */
    getFallbackColors() {
        return {
            primary: ['#007AFF', '#5856D6', '#AF52DE', '#FF9500', '#34C759', '#FF9F0A'],
            background: '#FFFFFF',
            text: '#000000',
            grid: '#E5E5EA',
            tooltip: {
                background: '#FFFFFF',
                text: '#000000',
                border: '#C6C6C8'
            }
        };
    }

    /**
     * Create attendance trend chart
     */
    createAttendanceTrendChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with id '${canvasId}' not found`);
            return null;
        }

        // Destroy existing chart if it exists
        this.destroyChart(canvasId);

        const chartOptions = {
            ...this.defaultOptions,
            ...options,
            scales: {
                ...this.defaultOptions.scales,
                y: {
                    ...this.defaultOptions.scales.y,
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        ...this.defaultOptions.scales.y.ticks,
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        };

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Attendance Rate',
                    data: data.values || [],
                    borderColor: this.getThemeColor('primary'),
                    backgroundColor: this.getThemeColor('primary') + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: this.getThemeColor('primary'),
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: chartOptions
        });

        this.chartInstances.set(canvasId, chart);
        return chart;
    }

    /**
     * Create weekly attendance chart
     */
    createWeeklyAttendanceChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const chartOptions = {
            ...this.defaultOptions,
            ...options,
            scales: {
                ...this.defaultOptions.scales,
                y: {
                    ...this.defaultOptions.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...this.defaultOptions.scales.y.ticks,
                        stepSize: 1
                    }
                }
            }
        };

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Present',
                    data: data.present || [],
                    backgroundColor: this.getThemeColor('success'),
                    borderColor: this.getThemeColor('success'),
                    borderWidth: 1,
                    borderRadius: 4
                }, {
                    label: 'Absent',
                    data: data.absent || [],
                    backgroundColor: this.getThemeColor('error'),
                    borderColor: this.getThemeColor('error'),
                    borderWidth: 1,
                    borderRadius: 4
                }, {
                    label: 'Late',
                    data: data.late || [],
                    backgroundColor: this.getThemeColor('warning'),
                    borderColor: this.getThemeColor('warning'),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: chartOptions
        });

        this.chartInstances.set(canvasId, chart);
        return chart;
    }

    /**
     * Create time analysis chart (hours worked vs target)
     */
    createTimeAnalysisChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const chartOptions = {
            ...this.defaultOptions,
            ...options,
            scales: {
                ...this.defaultOptions.scales,
                y: {
                    ...this.defaultOptions.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...this.defaultOptions.scales.y.ticks,
                        callback: function(value) {
                            return value + 'h';
                        }
                    }
                }
            }
        };

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Hours Worked',
                    data: data.actual || [],
                    borderColor: this.getThemeColor('primary'),
                    backgroundColor: this.getThemeColor('primary') + '20',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 3
                }, {
                    label: 'Target Hours',
                    data: data.target || [],
                    borderColor: this.getThemeColor('tertiary'),
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: chartOptions
        });

        this.chartInstances.set(canvasId, chart);
        return chart;
    }

    /**
     * Create attendance status pie chart
     */
    createAttendanceStatusChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const chartOptions = {
            ...this.defaultOptions,
            ...options,
            plugins: {
                ...this.defaultOptions.plugins,
                legend: {
                    ...this.defaultOptions.plugins.legend,
                    position: 'bottom'
                }
            }
        };

        const chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Absent', 'Late'],
                datasets: [{
                    data: [
                        data.present || 0,
                        data.absent || 0,
                        data.late || 0
                    ],
                    backgroundColor: [
                        this.getThemeColor('success'),
                        this.getThemeColor('error'),
                        this.getThemeColor('warning')
                    ],
                    borderColor: [
                        this.getThemeColor('success'),
                        this.getThemeColor('error'),
                        this.getThemeColor('warning')
                    ],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: chartOptions
        });

        this.chartInstances.set(canvasId, chart);
        return chart;
    }

    /**
     * Create payroll overview chart
     */
    createPayrollChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const chartOptions = {
            ...this.defaultOptions,
            ...options,
            scales: {
                ...this.defaultOptions.scales,
                y: {
                    ...this.defaultOptions.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...this.defaultOptions.scales.y.ticks,
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        };

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Regular Pay',
                    data: data.regularPay || [],
                    backgroundColor: this.getThemeColor('primary'),
                    borderColor: this.getThemeColor('primary'),
                    borderWidth: 1,
                    borderRadius: 4
                }, {
                    label: 'Overtime Pay',
                    data: data.overtimePay || [],
                    backgroundColor: this.getThemeColor('quaternary'),
                    borderColor: this.getThemeColor('quaternary'),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: chartOptions
        });

        this.chartInstances.set(canvasId, chart);
        return chart;
    }

    /**
     * Create monthly overview chart
     */
    createMonthlyOverviewChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const chartOptions = {
            ...this.defaultOptions,
            ...options,
            scales: {
                y: {
                    ...this.defaultOptions.scales.y,
                    beginAtZero: true,
                    position: 'left',
                    ticks: {
                        ...this.defaultOptions.scales.y.ticks,
                        stepSize: 1
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: this.getThemeColor('text'),
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        };

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Total Employees',
                    data: data.totalEmployees || [],
                    borderColor: this.getThemeColor('primary'),
                    backgroundColor: this.getThemeColor('primary') + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: 'Average Attendance',
                    data: data.averageAttendance || [],
                    borderColor: this.getThemeColor('secondary'),
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: chartOptions
        });

        this.chartInstances.set(canvasId, chart);
        return chart;
    }

    /**
     * Update chart data
     */
    updateChart(canvasId, newData) {
        const chart = this.chartInstances.get(canvasId);
        if (!chart) {
            console.error(`Chart with id '${canvasId}' not found`);
            return;
        }

        // Update labels if provided
        if (newData.labels) {
            chart.data.labels = newData.labels;
        }

        // Update datasets
        if (newData.datasets) {
            newData.datasets.forEach((dataset, index) => {
                if (chart.data.datasets[index]) {
                    Object.assign(chart.data.datasets[index], dataset);
                }
            });
        }

        // Update individual dataset data
        if (newData.values && chart.data.datasets[0]) {
            chart.data.datasets[0].data = newData.values;
        }

        chart.update('none'); // Update without animation for better performance
    }

    /**
     * Destroy chart instance
     */
    destroyChart(canvasId) {
        const chart = this.chartInstances.get(canvasId);
        if (chart) {
            chart.destroy();
            this.chartInstances.delete(canvasId);
        }
    }

    /**
     * Destroy all chart instances
     */
    destroyAllCharts() {
        this.chartInstances.forEach((chart, id) => {
            chart.destroy();
        });
        this.chartInstances.clear();
    }

    /**
     * Get theme color
     */
    getThemeColor(colorName) {
        const theming = window.BricksTheming || window.Theming;
        if (theming && typeof theming.getThemeColor === 'function') {
            return theming.getThemeColor(colorName);
        }
        
        // Fallback colors
        const fallbackColors = {
            primary: '#007AFF',
            secondary: '#5856D6',
            tertiary: '#AF52DE',
            quaternary: '#FF9500',
            success: '#34C759',
            warning: '#FF9F0A',
            error: '#FF3B30',
            text: '#000000'
        };
        
        return fallbackColors[colorName] || fallbackColors.primary;
    }

    /**
     * Resize all charts
     */
    resizeCharts() {
        this.chartInstances.forEach(chart => {
            chart.resize();
        });
    }

    /**
     * Update chart themes
     */
    updateChartThemes() {
        this.defaultOptions = this.getDefaultChartOptions();
        
        this.chartInstances.forEach((chart, id) => {
            // Update chart options with new theme
            Object.assign(chart.options, this.defaultOptions);
            chart.update('none');
        });
    }

    /**
     * Generate sample data for testing
     */
    generateSampleData(type, days = 7) {
        const labels = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }

        switch (type) {
            case 'attendance':
                return {
                    labels,
                    values: Array.from({ length: days }, () => Math.floor(Math.random() * 40) + 60)
                };
            
            case 'weekly':
                return {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    present: [8, 7, 8, 6, 8],
                    absent: [0, 1, 0, 2, 0],
                    late: [1, 0, 1, 0, 1]
                };
            
            case 'timeAnalysis':
                return {
                    labels,
                    actual: Array.from({ length: days }, () => Math.floor(Math.random() * 4) + 6),
                    target: Array.from({ length: days }, () => 8)
                };
            
            default:
                return { labels: [], values: [] };
        }
    }

    /**
     * Export chart as image
     */
    exportChart(canvasId, filename = 'chart.png') {
        const chart = this.chartInstances.get(canvasId);
        if (!chart) {
            console.error(`Chart with id '${canvasId}' not found`);
            return;
        }

        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
    }

    /**
     * Static method to create Charts instance
     */
    static create() {
        return new Charts();
    }
}

// Setup theme change listener
if (typeof window !== 'undefined') {
    window.addEventListener('themeChanged', () => {
        if (window.chartsInstance) {
            window.chartsInstance.updateChartThemes();
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.chartsInstance) {
            setTimeout(() => {
                window.chartsInstance.resizeCharts();
            }, 100);
        }
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Charts;
} else if (typeof window !== 'undefined') {
    window.Charts = Charts;
}
