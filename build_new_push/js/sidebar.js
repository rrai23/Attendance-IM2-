/**
 * Sidebar Component for Bricks Attendance System
 * Handles navigation, role-based menu items, active page highlighting, and smooth transitions
 */

class SidebarManager {
    constructor() {
        this.currentPage = '';
        this.userRole = 'admin';
        this.isCollapsed = false;
        this.isToggling = false; // Prevent rapid toggling
        this.animationDuration = 300;
        
        // Menu items configuration based on role
        this.menuItems = {
            admin: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: '📊',
                    url: '/dashboard.html',
                    description: 'Overview and statistics'
                },
                {
                    id: 'analytics',
                    label: 'Analytics',
                    icon: '📈',
                    url: '/analytics.html',
                    description: 'Detailed attendance analytics'
                },
                {
                    id: 'payroll',
                    label: 'Payroll',
                    icon: '💰',
                    url: '/payroll.html',
                    description: 'Payroll management'
                },
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: '⚙️',
                    url: '/settings.html',
                    description: 'System configuration'
                }
            ],
            employee: [
                {
                    id: 'employee',
                    label: 'My Attendance',
                    icon: '👤',
                    url: '/employee.html',
                    description: 'Personal attendance data'
                }
            ]
        };

        this.init();
    }

    /**
     * Initialize the sidebar component
     */
    init() {
        this.detectCurrentPage();
        this.getUserRole();
        this.loadSidebarState();
        this.createSidebar();
        this.setupEventListeners();
        this.setupEnhancedEventListeners();
        this.updateActiveState();
        this.setupResponsiveHandling();
        this.addDropdownAriaAttributes();
    }

    /**
     * Detect current page from URL
     */
    detectCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        this.currentPage = filename || 'dashboard';
    }

    /**
     * Get user role from auth service
     */
    getUserRole() {
        if (typeof authService !== 'undefined') {
            const user = authService.getCurrentUser();
            this.userRole = user ? user.role : 'admin';
        } else {
            // Fallback role detection
            this.userRole = this.currentPage === 'employee' ? 'employee' : 'admin';
        }
    }

    /**
     * Create the sidebar HTML structure
     */
    createSidebar() {
        // Check if sidebar already exists
        let sidebar = document.querySelector('.sidebar');
        
        if (!sidebar) {
            sidebar = document.createElement('aside');
            sidebar.className = 'sidebar';
            document.body.appendChild(sidebar);
        }

        // Generate sidebar content
        sidebar.innerHTML = this.generateSidebarHTML();
        
        // Add initial classes
        sidebar.classList.add('sidebar-initialized');
        
        // Set initial collapsed state based on screen size
        if (window.innerWidth <= 768) {
            this.isCollapsed = true;
            sidebar.classList.add('collapsed');
        }
    }

    /**
     * Generate the complete sidebar HTML
     */
    generateSidebarHTML() {
        const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null;
        const userName = user ? `${user.firstName || user.username || user.name || 'User'}` : 'User';
        const userRole = this.userRole.charAt(0).toUpperCase() + this.userRole.slice(1);

        return `
            <div class="sidebar-header">
                <div class="sidebar-brand">
                    <div class="brand-icon">🧱</div>
                    <div class="brand-text">
                        <h2>Bricks</h2>
                        <span>Attendance System</span>
                    </div>
                </div>
                <button class="sidebar-toggle" aria-label="Toggle sidebar">
                    <span class="toggle-icon">‹</span>
                </button>
            </div>

            <div class="sidebar-user">
                <div class="user-avatar">
                    <span>${userName.charAt(0).toUpperCase()}</span>
                </div>
                <div class="user-info">
                    <div class="user-name">${userName}</div>
                    <div class="user-role">${userRole}</div>
                </div>
            </div>

            <nav class="sidebar-nav" role="navigation" aria-label="Main navigation">
                <ul class="nav-list">
                    ${this.generateMenuItems()}
                </ul>
            </nav>

            <div class="sidebar-footer">
                <button class="logout-btn" title="Logout">
                    <span class="logout-icon">🚪</span>
                    <span class="logout-text">Logout</span>
                </button>
                <div class="sidebar-version">
                    <small>v1.0.0</small>
                </div>
            </div>
        `;
    }

    /**
     * Generate menu items based on user role
     */
    generateMenuItems() {
        const items = this.menuItems[this.userRole] || this.menuItems.admin;
        
        return items.map(item => {
            const isActive = this.currentPage === item.id;
            const activeClass = isActive ? 'active' : '';
            
            return `
                <li class="nav-item">
                    <a href="${item.url}" 
                       class="nav-link ${activeClass}" 
                       data-page="${item.id}"
                       title="${item.description}">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-text">${item.label}</span>
                        <span class="nav-indicator"></span>
                    </a>
                </li>
            `;
        }).join('');
    }

    /**
     * Setup event listeners for sidebar interactions
     */
    setupEventListeners() {
        // Sidebar toggle
        const toggleBtn = document.querySelector('.sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
            link.addEventListener('mouseenter', (e) => this.handleHover(e, true));
            link.addEventListener('mouseleave', (e) => this.handleHover(e, false));
        });

        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Listen for auth events
        if (typeof authService !== 'undefined') {
            authService.onAuthEvent('login', (user) => this.handleUserChange(user));
            authService.onAuthEvent('logout', () => this.handleUserLogout());
            authService.onAuthEvent('user_updated', (user) => this.handleUserChange(user));
        }

        // Listen for theme changes
        document.addEventListener('themechange', (e) => {
            this.updateAccentColors(e.detail);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    /**
     * Setup enhanced event listeners for new sidebar features
     */
    setupEnhancedEventListeners() {
        // Dropdown menu toggles
        document.addEventListener('click', (e) => {
            if (e.target.closest('.nav-dropdown-toggle')) {
                e.preventDefault();
                const dropdownItem = e.target.closest('.nav-item-dropdown');
                this.toggleDropdown(dropdownItem);
            }
            
            // Close dropdowns when clicking outside
            if (!e.target.closest('.nav-item-dropdown')) {
                this.closeAllDropdowns();
            }
        });

        // Keyboard navigation for dropdown menus
        document.addEventListener('keydown', (e) => {
            const dropdownToggle = e.target.closest('.nav-dropdown-toggle');
            if (dropdownToggle) {
                const dropdownItem = dropdownToggle.closest('.nav-item-dropdown');
                
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleDropdown(dropdownItem);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.closeAllDropdowns();
                    dropdownToggle.focus();
                }
            }
        });

        // Quick action buttons
        const quickClockBtn = document.getElementById('quickClockBtn');
        const quickAddEmployeeBtn = document.getElementById('quickAddEmployeeBtn');
        const quickReportBtn = document.getElementById('quickReportBtn');
        const quickStatusBtn = document.getElementById('quickStatusBtn');

        if (quickClockBtn) {
            quickClockBtn.addEventListener('click', () => this.handleQuickClock());
        }

        if (quickAddEmployeeBtn) {
            quickAddEmployeeBtn.addEventListener('click', () => this.handleQuickAddEmployee());
        }

        if (quickReportBtn) {
            quickReportBtn.addEventListener('click', () => this.handleQuickReport());
        }

        if (quickStatusBtn) {
            quickStatusBtn.addEventListener('click', () => this.handleQuickStatus());
        }

        // Update system status periodically
        this.updateSystemStatus();
        setInterval(() => this.updateSystemStatus(), 30000); // Update every 30 seconds
    }

    /**
     * Toggle dropdown menu
     */
    toggleDropdown(dropdownItem) {
        const isOpen = dropdownItem.classList.contains('open');
        const toggle = dropdownItem.querySelector('.nav-dropdown-toggle');
        
        // Close all other dropdowns
        this.closeAllDropdowns();
        
        // Toggle current dropdown
        if (!isOpen) {
            dropdownItem.classList.add('open');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'true');
            }
        } else {
            dropdownItem.classList.remove('open');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        }
    }

    /**
     * Close all dropdown menus
     */
    closeAllDropdowns() {
        document.querySelectorAll('.nav-item-dropdown.open').forEach(item => {
            item.classList.remove('open');
            const toggle = item.querySelector('.nav-dropdown-toggle');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /**
     * Handle navigation link clicks
     */
    handleNavigation(event) {
        const link = event.currentTarget;
        const page = link.dataset.page;
        
        // Don't prevent default for actual navigation
        // Just update active state and trigger page change
        this.setActivePage(page);
        
        // Update theme page if theme manager is available
        if (typeof themeManager !== 'undefined') {
            themeManager.setPage(page);
        }

        // Add click animation
        this.addClickAnimation(link);
    }

    /**
     * Handle hover effects
     */
    handleHover(event, isEntering) {
        const link = event.currentTarget;
        
        if (isEntering) {
            link.classList.add('hovered');
            this.showTooltip(link);
        } else {
            link.classList.remove('hovered');
            this.hideTooltip();
        }
    }

    /**
     * Show tooltip for collapsed sidebar
     */
    showTooltip(element) {
        if (!this.isCollapsed) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'sidebar-tooltip';
        tooltip.textContent = element.title;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2)}px`;
        
        // Animate in
        requestAnimationFrame(() => {
            tooltip.classList.add('visible');
        });
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.querySelector('.sidebar-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
            setTimeout(() => tooltip.remove(), 200);
        }
    }

    /**
     * Add click animation to navigation links
     */
    addClickAnimation(element) {
        element.classList.add('clicked');
        setTimeout(() => {
            element.classList.remove('clicked');
        }, 200);
    }

    /**
     * Toggle sidebar collapsed state
     */
    toggleSidebar() {
        // Prevent rapid toggling
        if (this.isToggling) return;
        this.isToggling = true;
        
        this.isCollapsed = !this.isCollapsed;
        this.manuallyCollapsed = this.isCollapsed;
        const sidebar = document.querySelector('.sidebar');
        
        // Add transition class for smooth animation
        sidebar.style.transition = 'width var(--transition-normal) ease-in-out';
        
        if (this.isCollapsed) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }

        // Update toggle icon with smooth rotation
        this.updateToggleIcon();
        
        // Manage focus when sidebar state changes
        this.manageFocus();
        
        // Create or remove floating action button for mobile
        this.handleMobileQuickActions();
        
        // Save state to localStorage
        this.saveSidebarState();
        
        // Dispatch event for other components
        this.dispatchSidebarEvent('toggle', { collapsed: this.isCollapsed });
        
        // Reset toggle lock after animation completes
        setTimeout(() => {
            this.isToggling = false;
        }, 300); // Match CSS transition duration
    }

    /**
     * Update toggle icon based on collapsed state
     */
    updateToggleIcon() {
        const toggleIcon = document.querySelector('.toggle-icon');
        if (toggleIcon) {
            // Add smooth rotation animation
            toggleIcon.style.transition = 'transform var(--transition-fast) ease-in-out';
            toggleIcon.style.transform = this.isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
            toggleIcon.textContent = '‹'; // Keep consistent icon, just rotate it
        }
    }

    /**
     * Set active page and update UI
     */
    setActivePage(page) {
        this.currentPage = page;
        this.updateActiveState();
        
        // Update page title if needed
        this.updatePageTitle(page);
    }

    /**
     * Update active state of navigation items
     */
    updateActiveState() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const page = link.dataset.page;
            if (page === this.currentPage) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }

    /**
     * Update page title based on current page
     */
    updatePageTitle(page) {
        const items = this.menuItems[this.userRole] || this.menuItems.admin;
        const currentItem = items.find(item => item.id === page);
        
        if (currentItem) {
            document.title = `${currentItem.label} - Bricks Attendance System`;
        }
    }

    /**
     * Handle user role changes
     */
    handleUserChange(user) {
        const newRole = user.role;
        
        if (newRole !== this.userRole) {
            this.userRole = newRole;
            this.refreshSidebar();
        } else {
            // Just update user info
            this.updateUserInfo(user);
        }
    }

    /**
     * Handle user logout
     */
    handleUserLogout() {
        // Clear any user-specific data
        this.userRole = 'admin';
        this.currentPage = 'dashboard';
    }

    /**
     * Update user information in sidebar
     */
    updateUserInfo(user) {
        const userName = user ? `${user.firstName || user.username || user.name || 'User'}` : 'User';
        const userRole = this.userRole.charAt(0).toUpperCase() + this.userRole.slice(1);
        
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        const userAvatar = document.querySelector('.user-avatar span');
        
        if (userNameEl) userNameEl.textContent = userName;
        if (userRoleEl) userRoleEl.textContent = userRole;
        if (userAvatar) userAvatar.textContent = userName.charAt(0).toUpperCase();
    }

    /**
     * Refresh entire sidebar (for role changes)
     */
    refreshSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Preserve collapsed state
            const wasCollapsed = this.isCollapsed;
            
            // Regenerate content
            sidebar.innerHTML = this.generateSidebarHTML();
            
            // Restore collapsed state
            if (wasCollapsed) {
                sidebar.classList.add('collapsed');
            }
            
            // Re-setup event listeners
            this.setupEventListeners();
            this.updateActiveState();
        }
    }

    /**
     * Handle logout button click
     */
    handleLogout() {
        if (typeof authService !== 'undefined') {
            // Show confirmation if needed
            if (confirm('Are you sure you want to logout?')) {
                authService.logout('user_logout');
            }
        } else {
            // Fallback logout
            window.location.href = '/login.html';
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Alt + S to toggle sidebar
        if (event.altKey && event.key === 's') {
            event.preventDefault();
            this.toggleSidebar();
        }

        // Alt + 1-4 for quick navigation (admin only)
        if (event.altKey && this.userRole === 'admin') {
            const num = parseInt(event.key);
            if (num >= 1 && num <= 4) {
                event.preventDefault();
                const items = this.menuItems.admin;
                if (items[num - 1]) {
                    window.location.href = items[num - 1].url;
                }
            }
        }
    }

    /**
     * Setup responsive handling
     */
    setupResponsiveHandling() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Handle mobile touch events
        this.setupMobileHandling();
    }

    /**
     * Handle window resize with debouncing
     */
    handleResize() {
        // Clear existing timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        // Debounce resize handling
        this.resizeTimeout = setTimeout(() => {
            const sidebar = document.querySelector('.sidebar');
            
            // Auto-collapse on mobile
            if (window.innerWidth <= 768 && !this.isCollapsed) {
                this.isCollapsed = true;
                sidebar.classList.add('collapsed');
                this.updateToggleIcon();
                this.handleMobileQuickActions();
            }
            
            // Auto-expand on desktop if user hasn't manually collapsed
            if (window.innerWidth > 768 && this.isCollapsed && !this.manuallyCollapsed) {
                this.isCollapsed = false;
                sidebar.classList.remove('collapsed');
                this.updateToggleIcon();
                this.handleMobileQuickActions();
            }
        }, 150);
    }

    /**
     * Setup mobile-specific handling
     */
    setupMobileHandling() {
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (event) => {
            if (window.innerWidth <= 768 && !this.isCollapsed) {
                const sidebar = document.querySelector('.sidebar');
                const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
                const isClickInsideSidebar = sidebar.contains(event.target);
                const isClickOnToggle = mobileMenuToggle && mobileMenuToggle.contains(event.target);
                
                if (!isClickInsideSidebar && !isClickOnToggle) {
                    this.toggleSidebar();
                }
            }
        });

        // Handle swipe gestures
        this.setupSwipeGestures();
        
        // Create mobile menu toggle if it doesn't exist
        this.createMobileMenuToggle();
        
        // Initialize mobile quick actions
        this.handleMobileQuickActions();
    }

    /**
     * Setup swipe gestures for mobile
     */
    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Only handle horizontal swipes
            if (Math.abs(diffX) > Math.abs(diffY)) {
                // Swipe right to open sidebar
                if (diffX < -50 && this.isCollapsed && startX < 50) {
                    this.toggleSidebar();
                }
                // Swipe left to close sidebar
                else if (diffX > 50 && !this.isCollapsed) {
                    this.toggleSidebar();
                }
            }
            
            startX = 0;
            startY = 0;
        });
    }

    /**
     * Update accent colors based on theme
     */
    updateAccentColors(themeData) {
        if (!themeData.accentColors) return;
        
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Update CSS custom properties for sidebar
            sidebar.style.setProperty('--sidebar-accent', themeData.accentColors.primary);
            sidebar.style.setProperty('--sidebar-accent-light', themeData.accentColors.light);
            sidebar.style.setProperty('--sidebar-accent-hover', themeData.accentColors.hover);
        }
    }

    /**
     * Save sidebar state to localStorage
     */
    saveSidebarState() {
        try {
            const state = {
                collapsed: this.isCollapsed,
                manuallyCollapsed: this.manuallyCollapsed,
                timestamp: Date.now()
            };
            localStorage.setItem('brix-sidebar-state', JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to save sidebar state:', error);
        }
    }

    /**
     * Load sidebar state from localStorage
     */
    loadSidebarState() {
        try {
            const saved = localStorage.getItem('brix-sidebar-state');
            if (saved) {
                const state = JSON.parse(saved);
                this.isCollapsed = state.collapsed || false;
                this.manuallyCollapsed = state.manuallyCollapsed || false;
            }
        } catch (error) {
            console.warn('Failed to load sidebar state:', error);
        }
    }

    /**
     * Create mobile menu toggle button
     */
    createMobileMenuToggle() {
        if (document.querySelector('.mobile-menu-toggle')) return;
        
        const toggleButton = document.createElement('button');
        toggleButton.className = 'mobile-menu-toggle';
        toggleButton.setAttribute('aria-label', 'Toggle navigation menu');
        toggleButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        `;
        
        toggleButton.addEventListener('click', () => this.toggleSidebar());
        
        document.body.appendChild(toggleButton);
    }

    /**
     * Handle mobile quick actions
     */
    handleMobileQuickActions() {
        const existingFab = document.querySelector('.mobile-fab-container');
        
        if (window.innerWidth <= 768 && this.isCollapsed) {
            // Create floating action button for mobile
            if (!existingFab) {
                this.createMobileFloatingActions();
            }
        } else {
            // Remove floating action button
            if (existingFab) {
                existingFab.remove();
            }
        }
    }

    /**
     * Create mobile floating action button
     */
    createMobileFloatingActions() {
        const fabContainer = document.createElement('div');
        fabContainer.className = 'mobile-fab-container';
        fabContainer.innerHTML = `
            <button class="mobile-fab-main" aria-label="Quick actions">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <div class="mobile-fab-menu">
                <button class="mobile-fab-item" data-action="clock" aria-label="Clock in/out">
                    <span>🕐</span>
                </button>
                <button class="mobile-fab-item" data-action="employee" aria-label="Add employee">
                    <span>👤</span>
                </button>
                <button class="mobile-fab-item" data-action="report" aria-label="Generate report">
                    <span>📊</span>
                </button>
                <button class="mobile-fab-item" data-action="status" aria-label="System status">
                    <span>❤️</span>
                </button>
            </div>
        `;
        
        // Add event listeners
        const mainFab = fabContainer.querySelector('.mobile-fab-main');
        const fabMenu = fabContainer.querySelector('.mobile-fab-menu');
        
        mainFab.addEventListener('click', () => {
            fabContainer.classList.toggle('open');
            mainFab.setAttribute('aria-expanded', fabContainer.classList.contains('open'));
        });
        
        // Handle quick action clicks
        fabContainer.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.mobile-fab-item');
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                this.handleMobileFabAction(action);
                fabContainer.classList.remove('open');
                mainFab.setAttribute('aria-expanded', 'false');
            }
        });
        
        document.body.appendChild(fabContainer);
    }

    /**
     * Handle mobile FAB actions
     */
    handleMobileFabAction(action) {
        switch (action) {
            case 'clock':
                this.handleQuickClock();
                break;
            case 'employee':
                this.handleQuickAddEmployee();
                break;
            case 'report':
                this.handleQuickReport();
                break;
            case 'status':
                this.handleQuickStatus();
                break;
        }
    }

    /**
     * Manage focus when sidebar state changes
     */
    manageFocus() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (this.isCollapsed) {
            // When collapsed, ensure main content is focusable
            if (mainContent) {
                mainContent.setAttribute('tabindex', '-1');
                mainContent.focus();
            }
        } else {
            // When expanded, focus first navigation item
            const firstNavLink = sidebar.querySelector('.nav-link');
            if (firstNavLink) {
                firstNavLink.focus();
            }
        }
    }

    /**
     * Dispatch sidebar events
     */
    dispatchSidebarEvent(type, data) {
        const event = new CustomEvent(`sidebar:${type}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current sidebar state
     */
    getState() {
        return {
            currentPage: this.currentPage,
            userRole: this.userRole,
            isCollapsed: this.isCollapsed,
            menuItems: this.menuItems[this.userRole]
        };
    }

    /**
     * Add ARIA attributes to dropdown menus
     */
    addDropdownAriaAttributes() {
        document.querySelectorAll('.nav-dropdown-toggle').forEach(toggle => {
            toggle.setAttribute('role', 'button');
            toggle.setAttribute('aria-haspopup', 'true');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('tabindex', '0');
        });
    }

    /**
     * Handle quick actions
     */
    handleQuickClock() {
        if (typeof window.showQuickClockModal === 'function') {
            window.showQuickClockModal();
        } else {
            console.log('Quick clock action triggered');
        }
    }

    handleQuickAddEmployee() {
        if (typeof window.showAddEmployeeModal === 'function') {
            window.showAddEmployeeModal();
        } else {
            window.location.href = '/employee.html#add';
        }
    }

    handleQuickReport() {
        if (typeof window.showQuickReportModal === 'function') {
            window.showQuickReportModal();
        } else {
            console.log('Quick report action triggered');
        }
    }

    handleQuickStatus() {
        if (typeof window.showSystemStatusModal === 'function') {
            window.showSystemStatusModal();
        } else {
            console.log('System status action triggered');
        }
    }

    /**
     * Update system status indicators
     */
    updateSystemStatus() {
        // This would typically fetch real system status
        const statusItems = document.querySelectorAll('.status-indicator');
        statusItems.forEach(indicator => {
            // Simulate status check
            const isOnline = Math.random() > 0.1; // 90% uptime simulation
            indicator.className = `status-indicator ${isOnline ? 'status-online' : 'status-error'}`;
        });
    }

    /**
     * Destroy sidebar and cleanup
     */
    destroy() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.remove();
        }
        
        // Remove mobile elements
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const mobileFab = document.querySelector('.mobile-fab-container');
        if (mobileToggle) mobileToggle.remove();
        if (mobileFab) mobileFab.remove();
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        // Clear any timeouts
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
    }
}

// Create and export sidebar manager instance
const sidebarManager = new SidebarManager();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = sidebarManager;
} else if (typeof window !== 'undefined') {
    window.sidebarManager = sidebarManager;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        sidebarManager.init();
    });
} else {
    sidebarManager.init();
}

// Utility functions for easy access
window.toggleSidebar = () => sidebarManager.toggleSidebar();
window.setActivePage = (page) => sidebarManager.setActivePage(page);
window.getSidebarState = () => sidebarManager.getState();
