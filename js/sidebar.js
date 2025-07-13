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
                    id: 'employees',
                    label: 'Employees',
                    icon: '👥',
                    url: '/employees.html',
                    description: 'Employee management'
                },
                {
                    id: 'employee-management',
                    label: 'Attendance',
                    icon: '🕐',
                    url: '/employee-management.html',
                    description: 'Manage employee attendance'
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
                },
                {
                    id: 'security',
                    label: 'Security',
                    icon: '🔐',
                    url: '/employee.html#security',
                    description: 'Change username and password'
                }
            ]
        };

        // Don't auto-initialize - will be called by the initialization system
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
        this.syncThemeSelector();
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
        try {
            if (typeof authService !== 'undefined' && authService) {
                const user = authService.getCurrentUser();
                this.userRole = user ? user.role : 'admin';
            } else {
                // Fallback role detection
                this.userRole = this.currentPage === 'employee' ? 'employee' : 'admin';
            }
        } catch (error) {
            console.warn('Error getting user role from authService:', error);
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
            <div class="sidebar-header compact">
                <div class="sidebar-brand compact">
                    <div class="brand-icon">🧱</div>
                    <div class="brand-text compact">
                        <h2>Bricks</h2>
                        <span>Attendance System</span>
                    </div>
                </div>
                <button class="sidebar-toggle compact" aria-label="Toggle sidebar">
                    <span class="toggle-icon">‹</span>
                </button>
            </div>

            <div class="sidebar-user compact">
                <div class="user-avatar compact">
                    <span>${userName.charAt(0).toUpperCase()}</span>
                </div>
                <div class="user-info compact">
                    <div class="user-name">${userName}</div>
                    <div class="user-role">${userRole}</div>
                </div>
                <div class="theme-toggle-container compact">
                    <label class="theme-toggle-switch" title="Toggle Dark Mode">
                        <input type="checkbox" class="theme-toggle-input" id="sidebar-theme-toggle">
                        <span class="theme-toggle-slider">
                            <svg class="theme-icon-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="5"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                            </svg>
                            <svg class="theme-icon-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                            </svg>
                        </span>
                    </label>
                </div>
            </div>

            <nav class="sidebar-nav compact" role="navigation" aria-label="Main navigation">
                <ul class="nav-list compact">
                    ${this.generateMenuItems()}
                </ul>
            </nav>

            <!-- System Status Section -->
            <div class="sidebar-status compact">
                <div class="status-header compact">
                    <h4>Status</h4>
                    <button class="status-refresh-btn compact" title="Refresh status" aria-label="Refresh system status">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23,4 23,10 17,10"></polyline>
                            <polyline points="1,20 1,14 7,14"></polyline>
                            <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                        </svg>
                    </button>
                </div>
                <div class="status-indicators compact">
                    <div class="status-item compact" title="Server connection status">
                        <span class="status-indicator status-online"></span>
                        <span class="status-text">Server</span>
                        <span class="status-detail">Online</span>
                    </div>
                    <div class="status-item compact" title="Database connection status">
                        <span class="status-indicator status-online"></span>
                        <span class="status-text">Database</span>
                        <span class="status-detail">Connected</span>
                    </div>
                    <div class="status-item compact" title="Data synchronization status">
                        <span class="status-indicator status-online"></span>
                        <span class="status-text">Sync</span>
                        <span class="status-detail">Active</span>
                    </div>
                    <div class="status-item compact" title="System uptime">
                        <span class="status-indicator status-info"></span>
                        <span class="status-text">Uptime</span>
                        <span class="status-detail">99.8%</span>
                    </div>
                </div>
            </div>

            <div class="sidebar-footer compact">
                <button class="logout-btn compact" title="Logout">
                    <span class="logout-icon">🚪</span>
                    <span class="logout-text">Logout</span>
                </button>
                <div class="sidebar-version compact">
                    <small>v1.0.1 pre-release, no backend</small>
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
                <li class="nav-item compact">
                    <a href="${item.url}" 
                       class="nav-link compact ${activeClass}" 
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

        // Status refresh button
        const statusRefreshBtn = document.querySelector('.status-refresh-btn');
        if (statusRefreshBtn) {
            statusRefreshBtn.addEventListener('click', () => this.updateSystemStatus(true));
        }

        // Listen for auth events - defer to ensure authService is available
        this.setupAuthEventListeners();

        // Listen for theme changes
        document.addEventListener('themechange', (e) => {
            this.updateAccentColors(e.detail);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    /**
     * Setup authentication event listeners with proper error handling
     */
    setupAuthEventListeners() {
        // Use a small delay to ensure all scripts are loaded
        setTimeout(() => {
            try {
                if (typeof authService !== 'undefined' && authService) {
                    authService.onAuthEvent('login', (user) => this.handleUserChange(user));
                    authService.onAuthEvent('logout', () => this.handleUserLogout());
                    authService.onAuthEvent('user_updated', (user) => this.handleUserChange(user));
                    console.log('Sidebar: Auth event listeners set up successfully');
                } else {
                    console.warn('Sidebar: authService not available for event listeners');
                }
            } catch (error) {
                console.warn('Sidebar: Error setting up auth event listeners:', error);
            }
        }, 100);
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

        // Theme selector buttons - retry setup if needed
        this.setupThemeSelector();

        // Update system status periodically (without notifications)
        this.updateSystemStatus(false);
        setInterval(() => this.updateSystemStatus(false), 30000); // Update every 30 seconds
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
        
        // Check if there's a page-specific navigation handler
        if (window.employeePage && typeof window.employeePage.navigateToSection === 'function') {
            event.preventDefault();
            window.employeePage.navigateToSection(page);
        }
        
        // Don't prevent default for actual navigation to other pages
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
        // Use specialized logout modal
        if (typeof confirmLogout !== 'undefined') {
            confirmLogout({
                onConfirm: () => {
                    if (typeof authService !== 'undefined') {
                        authService.logout('user_logout');
                    } else {
                        // Fallback logout
                        window.location.href = '/login.html';
                    }
                }
            });
        } else {
            // Fallback to browser confirm if modal system not available
            if (confirm('Are you sure you want to logout?')) {
                if (typeof authService !== 'undefined') {
                    authService.logout('user_logout');
                } else {
                    window.location.href = '/login.html';
                }
            }
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

        // Alt + 1-6 for quick navigation (admin only)
        if (event.altKey && this.userRole === 'admin') {
            const num = parseInt(event.key);
            if (num >= 1 && num <= 6) {
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
     * Handle mobile specific functionality (simplified without quick actions)
     */
    handleMobileQuickActions() {
        // Remove any existing floating action buttons since we don't need them anymore
        const existingFab = document.querySelector('.mobile-fab-container');
        if (existingFab) {
            existingFab.remove();
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
     * Handle theme change from sidebar theme toggle
     */
    handleThemeChange(theme) {
        console.log('Theme change requested:', theme);
        console.log('window.setTheme available:', typeof window.setTheme);
        console.log('themeManager available:', typeof window.themeManager);
        
        // Try multiple ways to change theme
        let themeChanged = false;
        
        // Method 1: Use window.setTheme if available
        if (typeof window.setTheme === 'function') {
            try {
                window.setTheme(theme);
                themeChanged = true;
                console.log('Theme changed using window.setTheme');
            } catch (error) {
                console.error('Error using window.setTheme:', error);
            }
        }
        
        // Method 2: Use themeManager directly if available
        if (!themeChanged && typeof window.themeManager !== 'undefined' && window.themeManager.setTheme) {
            try {
                window.themeManager.setTheme(theme);
                themeChanged = true;
                console.log('Theme changed using themeManager.setTheme');
            } catch (error) {
                console.error('Error using themeManager.setTheme:', error);
            }
        }
        
        // Method 3: Manual theme change as fallback
        if (!themeChanged) {
            try {
                document.documentElement.setAttribute('data-theme', theme);
                document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
                themeChanged = true;
                console.log('Theme changed manually');
            } catch (error) {
                console.error('Error changing theme manually:', error);
            }
        }
        
        if (themeChanged) {
            // Update theme toggle
            const themeToggle = document.querySelector('#sidebar-theme-toggle');
            if (themeToggle) {
                themeToggle.checked = theme === 'dark';
                console.log('Updated theme toggle state');
            }
            
            console.log(`Theme successfully changed to: ${theme}`);
            
            // Trigger custom event
            const event = new CustomEvent('themeChanged', { detail: theme });
            document.dispatchEvent(event);
            
        } else {
            console.warn('Failed to change theme. Available theme functions:', Object.keys(window).filter(k => k.toLowerCase().includes('theme')));
        }
    }

    /**
     * Update system status indicators
     */
    /**
     * Update system status indicators with enhanced information
     */
    updateSystemStatus(showNotification = false) {
        // Add loading state
        const refreshBtn = document.querySelector('.status-refresh-btn');
        if (refreshBtn) {
            refreshBtn.classList.add('refreshing');
            refreshBtn.style.pointerEvents = 'none';
        }

        // Simulate async status check
        setTimeout(() => {
            const statusItems = document.querySelectorAll('.status-item');
            
            statusItems.forEach((item, index) => {
                const indicator = item.querySelector('.status-indicator');
                const detail = item.querySelector('.status-detail');
                
                if (!indicator || !detail) return;

                // Simulate different status checks based on item index
                let status, detailText, statusClass;
                
                switch (index) {
                    case 0: // Server
                        status = Math.random() > 0.05; // 95% uptime
                        detailText = status ? 'Online' : 'Offline';
                        statusClass = status ? 'status-online' : 'status-error';
                        break;
                    case 1: // Database
                        status = Math.random() > 0.02; // 98% uptime
                        detailText = status ? 'Connected' : 'Disconnected';
                        statusClass = status ? 'status-online' : 'status-error';
                        break;
                    case 2: // Sync
                        status = Math.random() > 0.1; // 90% active
                        detailText = status ? 'Active' : 'Inactive';
                        statusClass = status ? 'status-online' : 'status-warning';
                        break;
                    case 3: // Uptime
                        const uptime = (Math.random() * 5 + 95).toFixed(1); // 95-100%
                        detailText = `${uptime}%`;
                        statusClass = uptime > 98 ? 'status-online' : uptime > 95 ? 'status-warning' : 'status-error';
                        break;
                    default:
                        status = true;
                        detailText = 'OK';
                        statusClass = 'status-online';
                }
                
                // Update indicator and detail text
                indicator.className = `status-indicator ${statusClass}`;
                detail.textContent = detailText;
                
                // Add animation
                item.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    item.style.transform = 'scale(1)';
                }, 100);
            });
            
            // Remove loading state
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.style.pointerEvents = 'auto';
            }
            
            // Only show notification when explicitly requested (manual refresh)
            if (showNotification) {
                this.showNotification('System status updated', 'success', 2000);
            }
            
        }, 800); // Simulate network delay
    }

    /**
     * Show a notification message
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.sidebar-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `sidebar-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" aria-label="Close notification">×</button>
            </div>
        `;
        
        // Add to sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.appendChild(notification);
            
            // Add event listener for close button
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => notification.remove());
            
            // Auto-remove after duration
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.add('fade-out');
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    }

    /**
     * Get icon for notification type
     */
    getNotificationIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info':
            default: return 'ℹ️';
        }
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

    /**
     * Setup theme toggle event listener
     */
    setupThemeSelector() {
        const themeToggle = document.querySelector('#sidebar-theme-toggle');
        
        if (themeToggle) {
            themeToggle.addEventListener('change', (e) => {
                const theme = e.target.checked ? 'dark' : 'light';
                this.handleThemeChange(theme);
            });
        }
    }

    /**
     * Sync theme toggle with current theme
     */
    syncThemeSelector() {
        try {
            let currentTheme = 'light'; // default
            
            // Get current theme from various sources
            if (typeof themeManager !== 'undefined' && themeManager.getCurrentTheme) {
                currentTheme = themeManager.getCurrentTheme();
            } else if (document.documentElement.hasAttribute('data-theme')) {
                currentTheme = document.documentElement.getAttribute('data-theme');
            } else {
                // Check localStorage for saved theme
                const savedTheme = localStorage.getItem('bricks_theme');
                if (savedTheme) {
                    currentTheme = savedTheme;
                }
            }
            
            // Update theme toggle
            const themeToggle = document.querySelector('#sidebar-theme-toggle');
            if (themeToggle) {
                themeToggle.checked = currentTheme === 'dark';
            }
            
        } catch (error) {
            console.warn('Error syncing theme toggle:', error);
        }
    }

    // ...existing code...
}

// Create and export sidebar manager instance
// Delay instantiation to avoid initialization order issues
let sidebarManager;

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    // For Node.js environments, create instance immediately
    sidebarManager = new SidebarManager();
    module.exports = sidebarManager;
} else if (typeof window !== 'undefined') {
    // For browser environments, defer instantiation
    const initializeSidebar = () => {
        if (!sidebarManager) {
            sidebarManager = new SidebarManager();
            // Initialize after creating the instance
            sidebarManager.init();
            window.sidebarManager = sidebarManager;
        }
        return sidebarManager;
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeSidebar();
        });
    } else {
        // DOM already ready, initialize immediately
        initializeSidebar();
    }

    // Make sure sidebarManager is available on window
    Object.defineProperty(window, 'sidebarManager', {
        get: function() {
            return sidebarManager || initializeSidebar();
        },
        configurable: true
    });
}

// Utility functions for easy access
window.toggleSidebar = () => {
    const manager = window.sidebarManager;
    return manager ? manager.toggleSidebar() : console.warn('Sidebar not initialized');
};
window.setActivePage = (page) => {
    const manager = window.sidebarManager;
    return manager ? manager.setActivePage(page) : console.warn('Sidebar not initialized');
};
window.getSidebarState = () => {
    const manager = window.sidebarManager;
    return manager ? manager.getState() : { error: 'Sidebar not initialized' };
};
