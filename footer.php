    <!-- Essential JavaScript for UI interactions -->
    <script src="js/theme.js" onerror="console.error('Failed to load theme.js')"></script>
    <script src="js/sidebar.js" onerror="console.error('Failed to load sidebar.js')"></script>

    <!-- Basic UI functionality script -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Update current time
            function updateCurrentTime() {
                const now = new Date();
                const timeString = now.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                const timeElement = document.getElementById('current-time');
                if (timeElement) {
                    timeElement.textContent = timeString;
                }
            }

            // Update time immediately and then every second
            updateCurrentTime();
            setInterval(updateCurrentTime, 1000);

            // Handle mobile hamburger menu
            const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
            if (mobileMenuToggle) {
                mobileMenuToggle.addEventListener('click', function() {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) {
                        sidebar.classList.toggle('mobile-open');
                        const isOpen = sidebar.classList.contains('mobile-open');
                        mobileMenuToggle.setAttribute('aria-expanded', isOpen);
                    }
                });
            }

            // Handle sidebar toggle
            const sidebarToggle = document.getElementById('sidebar-toggle');
            if (sidebarToggle) {
                sidebarToggle.addEventListener('click', function() {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) {
                        sidebar.classList.toggle('collapsed');
                    }
                });
            }

            // Handle theme switching
            const themeOptions = document.querySelectorAll('.theme-option');
            themeOptions.forEach(option => {
                option.addEventListener('click', function() {
                    const theme = this.dataset.theme;
                    if (theme) {
                        document.documentElement.setAttribute('data-theme', theme);
                        localStorage.setItem('theme', theme);
                        
                        // Update active state
                        themeOptions.forEach(opt => opt.classList.remove('active'));
                        this.classList.add('active');
                    }
                });
            });

            // Load saved theme
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            themeOptions.forEach(option => {
                if (option.dataset.theme === savedTheme) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });

            // Handle dropdown menus
            const dropdownToggles = document.querySelectorAll('.nav-dropdown-toggle');
            dropdownToggles.forEach(toggle => {
                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    const dropdown = this.closest('.nav-item-dropdown');
                    if (dropdown) {
                        const isOpen = dropdown.classList.contains('open');
                        
                        // Close all other dropdowns
                        document.querySelectorAll('.nav-item-dropdown').forEach(item => {
                            item.classList.remove('open');
                            const toggleBtn = item.querySelector('.nav-dropdown-toggle');
                            if (toggleBtn) {
                                toggleBtn.setAttribute('aria-expanded', 'false');
                            }
                        });
                        
                        // Toggle current dropdown
                        if (!isOpen) {
                            dropdown.classList.add('open');
                            this.setAttribute('aria-expanded', 'true');
                        }
                    }
                });
            });

            // Close dropdowns when clicking outside
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.nav-item-dropdown')) {
                    document.querySelectorAll('.nav-item-dropdown').forEach(dropdown => {
                        dropdown.classList.remove('open');
                        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
                        if (toggle) {
                            toggle.setAttribute('aria-expanded', 'false');
                        }
                    });
                }
            });

            // Handle logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (confirm('Are you sure you want to logout?')) {
                        window.location.href = '/IM2/logout.php';
                    }
                });
            }

            // Handle mobile FAB
            const mobileFabMain = document.getElementById('mobile-fab-main');
            const mobileFabContainer = document.getElementById('mobile-fab-container');
            if (mobileFabMain && mobileFabContainer) {
                mobileFabMain.addEventListener('click', function() {
                    const isOpen = mobileFabContainer.classList.contains('open');
                    mobileFabContainer.classList.toggle('open');
                    mobileFabMain.setAttribute('aria-expanded', !isOpen);
                });

                // Close FAB menu when clicking outside
                document.addEventListener('click', function(e) {
                    if (!mobileFabContainer.contains(e.target)) {
                        mobileFabContainer.classList.remove('open');
                        mobileFabMain.setAttribute('aria-expanded', 'false');
                    }
                });
            }

            // Handle keyboard shortcuts for accessibility
            document.addEventListener('keydown', function(e) {
                // ESC key to close dropdowns and modals
                if (e.key === 'Escape') {
                    // Close dropdowns
                    document.querySelectorAll('.nav-item-dropdown.open').forEach(dropdown => {
                        dropdown.classList.remove('open');
                        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
                        if (toggle) {
                            toggle.setAttribute('aria-expanded', 'false');
                        }
                    });
                    
                    // Close mobile FAB
                    if (mobileFabContainer && mobileFabContainer.classList.contains('open')) {
                        mobileFabContainer.classList.remove('open');
                        if (mobileFabMain) {
                            mobileFabMain.setAttribute('aria-expanded', 'false');
                        }
                    }
                }
            });

            console.log('Basic UI functionality initialized');
        });
    </script>
</body>
</html>
