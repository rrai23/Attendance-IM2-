/**
 * Global System Synchronizer for Bricks Attendance System
 * Ensures all pages and components stay synchronized across the entire system
 * Links every page to reflect changes instantly throughout the system
 */

class GlobalSystemSync {
    constructor() {
        this.initialized = false;
        this.components = new Map();
        this.eventQueue = [];
        this.syncListeners = new Map();
        
        // Initialize immediately
        this.init();
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('Initializing Global System Synchronizer...');
            
            // Wait for DirectFlow to be ready
            await this.waitForDirectFlow();
            
            // Set up global event listeners
            this.setupGlobalEventListeners();
            
            // Set up cross-page synchronization
            this.setupCrossPageSync();
            
            // Register automatic page detection
            this.autoDetectAndRegisterPages();
            
            this.initialized = true;
            console.log('Global System Synchronizer initialized successfully');
            
            // Process any queued events
            this.processEventQueue();
            
        } catch (error) {
            console.error('Failed to initialize Global System Synchronizer:', error);
        }
    }

    async waitForDirectFlow() {
        console.log('🔄 Waiting for DirectFlow to initialize...');
        
        const maxWait = 30000; // 30 seconds
        const interval = 1000; // Check every 1 second
        let waited = 0;
        
        while (waited < maxWait) {
            try {
                // Check if DirectFlow exists (try both window.DirectFlow and window.directFlow)
                const directFlow = window.DirectFlow || window.directFlow;
                
                if (directFlow && directFlow.initialized) {
                    console.log('✅ DirectFlow is initialized');
                    this.directFlow = directFlow;
                    return;
                }
                
                // If DirectFlow exists but not initialized, try to reinitialize
                if (directFlow && typeof directFlow.reinitialize === 'function') {
                    console.log('🔄 DirectFlow found but not initialized, attempting reinitialize...');
                    const success = await directFlow.reinitialize();
                    if (success) {
                        console.log('✅ DirectFlow reinitialize successful');
                        this.directFlow = directFlow;
                        return;
                    }
                }
                
                console.log(`⏳ DirectFlow not ready, waited ${waited/1000}s/${maxWait/1000}s`);
                
            } catch (error) {
                console.error(`❌ Error checking DirectFlow (${waited/1000}s):`, error);
            }
            
            await new Promise(resolve => setTimeout(resolve, interval));
            waited += interval;
        }
        
        // Check if we're on a public page where DirectFlow might not be initialized
        const currentPage = window.location.pathname;
        const publicPages = ['/login.html', '/index.html', '/'];
        const isPublicPage = publicPages.some(page => currentPage.endsWith(page)) || currentPage === '/';
        
        if (isPublicPage) {
            console.log('Global System Sync: DirectFlow not initialized on public page - continuing with limited functionality');
            return;
        }
        
        console.error('❌ DirectFlow initialization timeout after 30 seconds');
        throw new Error('DirectFlow initialization timeout - max attempts reached, services not available');
    }

    /**
     * Set up global event listeners for system-wide events
     */
    setupGlobalEventListeners() {
        // Only set up DirectFlow events if DirectFlow is available
        if (this.directFlow) {
            // Listen to DirectFlow events
            this.directFlow.addEventListener('employeeDeleted', (data) => {
                this.broadcastToAllComponents('employeeDeleted', data);
            });

            this.directFlow.addEventListener('employeeAdded', (data) => {
                this.broadcastToAllComponents('employeeAdded', data);
            });

            this.directFlow.addEventListener('employeeUpdated', (data) => {
                this.broadcastToAllComponents('employeeUpdated', data);
            });

            this.directFlow.addEventListener('attendanceUpdate', (data) => {
                this.broadcastToAllComponents('attendanceUpdate', data);
            });

            this.directFlow.addEventListener('attendanceUpdated', (data) => {
                this.broadcastToAllComponents('attendanceUpdated', data);
            });

            this.directFlow.addEventListener('dataSync', (data) => {
                this.broadcastToAllComponents('dataSync', data);
            });
        }

        // Listen to system-wide DOM events
        document.addEventListener('bricksSystemUpdate', (event) => {
            this.handleSystemUpdate(event.detail);
        });

        // Listen to cross-tab events
        window.addEventListener('storage', (event) => {
            if (event.key === 'bricks-system-event' && event.newValue) {
                try {
                    const syncData = JSON.parse(event.newValue);
                    this.handleCrossTabUpdate(syncData);
                } catch (error) {
                    console.warn('Failed to parse cross-tab sync data:', error);
                }
            }
        });
    }

    /**
     * Set up cross-page synchronization using BroadcastChannel
     */
    setupCrossPageSync() {
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.broadcastChannel = new BroadcastChannel('bricks-global-sync');
                this.broadcastChannel.addEventListener('message', (event) => {
                    this.handleCrossPageMessage(event.data);
                });
            } catch (error) {
                console.warn('BroadcastChannel not available:', error);
            }
        }
    }

    /**
     * Automatically detect and register page components
     */
    autoDetectAndRegisterPages() {
        const currentPage = this.detectCurrentPage();
        console.log('Current page detected:', currentPage);

        // Register common components based on page
        this.registerPageComponents(currentPage);
    }

    detectCurrentPage() {
        const url = window.location.pathname;
        const filename = url.split('/').pop() || 'index.html';
        
        if (filename.includes('employee')) return 'employees';
        if (filename.includes('dashboard')) return 'dashboard';
        if (filename.includes('payroll')) return 'payroll';
        if (filename.includes('analytics')) return 'analytics';
        if (filename.includes('attendance')) return 'attendance';
        if (filename.includes('settings')) return 'settings';
        if (filename === 'index.html' || filename === '') return 'dashboard';
        
        return 'unknown';
    }

    registerPageComponents(pageType) {
        switch (pageType) {
            case 'employees':
                this.registerEmployeesPageComponents();
                break;
            case 'dashboard':
                this.registerDashboardComponents();
                break;
            case 'payroll':
                this.registerPayrollComponents();
                break;
            case 'analytics':
                this.registerAnalyticsComponents();
                break;
            case 'attendance':
                this.registerAttendanceComponents();
                break;
            default:
                this.registerCommonComponents();
        }
    }

    registerEmployeesPageComponents() {
        // Register employees page manager
        if (window.employeesPageManager) {
            this.registerComponent('employeesPageManager', window.employeesPageManager, {
                refreshData: 'refreshData',
                updateStats: 'updateStats',
                renderTable: 'renderTable',
                populateFilters: 'populateFilters'
            });
        }

        // Register user manager if available
        if (window.userManager) {
            this.registerComponent('userManager', window.userManager, {
                refreshData: 'loadEmployees',
                renderList: 'renderEmployeeList',
                applyFilters: 'applyFiltersAndSort'
            });
        }
    }

    registerDashboardComponents() {
        // Register dashboard controller
        if (window.dashboardController) {
            this.registerComponent('dashboardController', window.dashboardController, {
                refreshData: 'loadDashboardData',
                updateStats: 'updateEmployeeStats',
                updateCharts: 'updateAttendanceChart'
            });
        }

        // Register any chart components
        if (window.chartManager) {
            this.registerComponent('chartManager', window.chartManager, {
                refreshCharts: 'refreshAllCharts',
                updateData: 'updateChartData'
            });
        }
    }

    registerPayrollComponents() {
        // Register payroll controller
        if (window.payrollController) {
            this.registerComponent('payrollController', window.payrollController, {
                refreshData: 'refreshData',
                updateEmployeeList: 'loadEmployees',
                recalculatePayroll: 'calculatePayroll'
            });
        }
    }

    registerAnalyticsComponents() {
        // Register analytics manager
        if (window.analyticsManager) {
            this.registerComponent('analyticsManager', window.analyticsManager, {
                refreshData: 'refreshAnalyticsData',
                updateCharts: 'updateAllCharts',
                updateReports: 'generateReports'
            });
        }
    }

    registerAttendanceComponents() {
        // Register attendance manager
        if (window.attendanceManager || window.employeeAttendanceManager) {
            const manager = window.attendanceManager || window.employeeAttendanceManager;
            this.registerComponent('attendanceManager', manager, {
                refreshData: 'loadEmployees',
                renderRecords: 'renderAttendanceRecords',
                updateDropdowns: 'updateEmployeeDropdowns'
            });
        }
    }

    registerCommonComponents() {
        // Register sidebar if present
        if (window.sidebar) {
            this.registerComponent('sidebar', window.sidebar, {
                updateNotifications: 'updateNotificationCount'
            });
        }

        // Register any other common components
        if (window.headerManager) {
            this.registerComponent('headerManager', window.headerManager, {
                updateUserInfo: 'updateUserInfo'
            });
        }
    }

    /**
     * Register a component for automatic synchronization
     */
    registerComponent(name, component, methods = {}) {
        if (!component) {
            console.warn(`Component ${name} not found`);
            return;
        }

        this.components.set(name, {
            instance: component,
            methods: methods,
            lastUpdate: Date.now()
        });

        console.log(`Registered component: ${name}`, methods);
    }

    /**
     * Broadcast event to all registered components
     */
    broadcastToAllComponents(eventType, data) {
        console.log(`Broadcasting ${eventType} to all components:`, data);

        this.components.forEach((component, name) => {
            try {
                this.updateComponent(name, eventType, data);
            } catch (error) {
                console.error(`Error updating component ${name}:`, error);
            }
        });

        // Also broadcast to cross-page listeners
        this.broadcastCrossPage(eventType, data);
    }

    /**
     * Update a specific component based on event type
     */
    updateComponent(componentName, eventType, data) {
        const component = this.components.get(componentName);
        if (!component) return;

        const { instance, methods } = component;

        switch (eventType) {
            case 'employeeDeleted':
            case 'employeeAdded':
            case 'employeeUpdated':
                // Refresh employee-related data
                this.callMethod(instance, methods.refreshData);
                this.callMethod(instance, methods.updateStats);
                this.callMethod(instance, methods.renderTable);
                this.callMethod(instance, methods.renderList);
                this.callMethod(instance, methods.populateFilters);
                this.callMethod(instance, methods.updateEmployeeList);
                this.callMethod(instance, methods.applyFilters);
                break;

            case 'attendanceUpdated':
                // Refresh attendance-related data
                this.callMethod(instance, methods.renderRecords);
                this.callMethod(instance, methods.updateDropdowns);
                this.callMethod(instance, methods.updateStats);
                this.callMethod(instance, methods.updateCharts);
                break;

            case 'dataSync':
                // Full data refresh
                this.callMethod(instance, methods.refreshData);
                this.callMethod(instance, methods.refreshCharts);
                this.callMethod(instance, methods.updateData);
                break;
        }

        // Update last update timestamp
        component.lastUpdate = Date.now();
    }

    /**
     * Safely call a method on a component instance
     */
    callMethod(instance, methodName) {
        if (!instance || !methodName || typeof instance[methodName] !== 'function') {
            return;
        }

        try {
            instance[methodName]();
        } catch (error) {
            console.warn(`Error calling ${methodName}:`, error);
        }
    }

    /**
     * Broadcast event across pages/tabs
     */
    broadcastCrossPage(eventType, data) {
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage({
                    type: eventType,
                    data: data,
                    timestamp: new Date().toISOString(),
                    source: 'GlobalSystemSync'
                });
            } catch (error) {
                console.warn('BroadcastChannel send failed:', error);
            }
        }
    }

    /**
     * Handle cross-page messages
     */
    handleCrossPageMessage(message) {
        if (message.source === 'GlobalSystemSync') {
            // Avoid loops - only process messages from other pages
            return;
        }

        console.log('Received cross-page message:', message);
        this.broadcastToAllComponents(message.type, message.data);
    }

    /**
     * Handle system update events
     */
    handleSystemUpdate(detail) {
        console.log('Handling system update:', detail);
        this.broadcastToAllComponents(detail.type, detail.data);
    }

    /**
     * Handle cross-tab updates
     */
    handleCrossTabUpdate(syncData) {
        console.log('Handling cross-tab update:', syncData);
        this.broadcastToAllComponents(syncData.type, syncData.data);
    }

    /**
     * Process queued events
     */
    processEventQueue() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.broadcastToAllComponents(event.type, event.data);
        }
    }

    /**
     * Queue an event if system is not ready
     */
    queueEvent(eventType, data) {
        if (this.initialized) {
            this.broadcastToAllComponents(eventType, data);
        } else {
            this.eventQueue.push({ type: eventType, data });
        }
    }

    /**
     * Force refresh all components
     */
    forceRefreshAll() {
        console.log('Force refreshing all components...');
        this.broadcastToAllComponents('dataSync', { 
            action: 'forceRefresh', 
            timestamp: new Date().toISOString() 
        });
    }

    /**
     * Get synchronization status
     */
    getSyncStatus() {
        return {
            initialized: this.initialized,
            componentsCount: this.components.size,
            components: Array.from(this.components.keys()),
            directFlowReady: !!this.directFlow?.initialized,
            crossPageSupport: !!this.broadcastChannel
        };
    }
}

// Global instance
window.globalSystemSync = new GlobalSystemSync();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.globalSystemSync.initialized) {
            window.globalSystemSync.init().catch(console.error);
        }
    });
} else {
    if (!window.globalSystemSync.initialized) {
        window.globalSystemSync.init().catch(console.error);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalSystemSync;
}
