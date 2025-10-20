// Main Application Entry Point

class TheaterWallApp {
    constructor() {
        this.config = null;
        this.homeAssistant = null;
        this.panels = null;
        this.videoPlayer = null;
        
        this.isInitialized = false;
        this.startTime = Date.now();
        
        this.init();
    }

    // Initialize the application
    async init() {
        try {
            console.log('Initializing Theater Wall Display...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
            } else {
                this.onDOMReady();
            }
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showFatalError(error);
        }
    }

    // Called when DOM is ready
    async onDOMReady() {
        try {
            // Initialize components in order
            await this.initializeComponents();
            
            // Setup global event handlers
            this.setupGlobalHandlers();
            
            // Connect to Home Assistant if configured
            await this.connectToHomeAssistant();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log(`Theater Wall Display initialized in ${Date.now() - this.startTime}ms`);
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('Failed to start application:', error);
            this.showFatalError(error);
        }
    }

    // Initialize all components
    async initializeComponents() {
        // Configuration is already initialized in config.js
        this.config = window.theaterWallConfig;
        
        // Home Assistant client is already initialized in home-assistant.js
        this.homeAssistant = window.homeAssistantClient;
        
        // Panel manager is already initialized in panels.js
        this.panels = window.panelManager;
        
        // Video player is already initialized in video-player.js
        this.videoPlayer = window.videoPlayer;
        
        // Validate configuration
        const errors = this.config.validateConfig();
        if (errors.length > 0) {
            console.warn('Configuration issues:', errors);
            this.config.showNotification('Configuration issues detected. Please check your settings.', 'warning');
        }
    }

    // Setup global event handlers
    setupGlobalHandlers() {
        // Handle visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onAppHidden();
            } else {
                this.onAppVisible();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            this.onNetworkOnline();
        });

        window.addEventListener('offline', () => {
            this.onNetworkOffline();
        });

        // Handle before unload
        window.addEventListener('beforeunload', () => {
            this.onBeforeUnload();
        });

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    // Connect to Home Assistant
    async connectToHomeAssistant() {
        const haConfig = this.config.getHomeAssistantConfig();
        
        if (haConfig.url && haConfig.token) {
            try {
                await this.homeAssistant.connect();
                console.log('Connected to Home Assistant');
            } catch (error) {
                console.warn('Failed to connect to Home Assistant:', error);
                this.config.showNotification('Failed to connect to Home Assistant. Using sample data.', 'warning');
            }
        } else {
            console.log('Home Assistant not configured, using sample data');
            this.config.showNotification('Configure Home Assistant in settings to enable live data.', 'info');
        }
    }

    // Handle app hidden (tab switched)
    onAppHidden() {
        // Pause video if playing
        if (this.videoPlayer && this.videoPlayer.isPlaying) {
            this.videoPlayer.pause();
        }
        
        // Reduce update frequency when hidden
        console.log('App hidden, reducing activity');
    }

    // Handle app visible (tab active)
    onAppVisible() {
        console.log('App visible, resuming normal activity');
        
        // Refresh data if needed
        if (this.homeAssistant && this.homeAssistant.isConnected) {
            // Could trigger a refresh here
        }
    }

    // Handle window resize
    onWindowResize() {
        // Recalculate panel dimensions if needed
        this.config.applyPanelDimensions();
        
        // Update video mask
        if (this.videoPlayer) {
            this.videoPlayer.createVideoMask();
        }
    }

    // Handle network online
    onNetworkOnline() {
        console.log('Network connection restored');
        this.config.showNotification('Network connection restored', 'success');
        
        // Try to reconnect to Home Assistant
        if (this.homeAssistant && !this.homeAssistant.isConnected) {
            this.homeAssistant.reconnect();
        }
    }

    // Handle network offline
    onNetworkOffline() {
        console.log('Network connection lost');
        this.config.showNotification('Network connection lost', 'error');
    }

    // Handle before unload
    onBeforeUnload() {
        // Save any pending state
        console.log('Application unloading');
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Global shortcuts
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case ',':
                        event.preventDefault();
                        this.config.showConfigPanel();
                        break;
                    case 'r':
                        event.preventDefault();
                        this.reloadApplication();
                        break;
                    case 's':
                        event.preventDefault();
                        this.saveCurrentState();
                        break;
                }
            }
            
            // Function keys
            if (event.key === 'F5') {
                event.preventDefault();
                this.reloadApplication();
            }
            
            // Help dialog
            if (event.key === 'F1') {
                event.preventDefault();
                this.showHelpDialog();
            }
        });
    }

    // Show welcome message
    showWelcomeMessage() {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        welcomeMessage.innerHTML = `
            <h2>Welcome to Theater Wall</h2>
            <p>Your Home Assistant display is ready!</p>
            <p>Press <kbd>Ctrl + ,</kbd> to configure settings</p>
            <p>Press <kbd>F1</kbd> for help</p>
            <button class="welcome-dismiss">Get Started</button>
        `;
        
        Object.assign(welcomeMessage.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, rgba(30, 30, 40, 0.95), rgba(20, 20, 30, 0.95))',
            border: '2px solid rgba(100, 100, 120, 0.3)',
            borderRadius: '16px',
            padding: '40px',
            zIndex: '5000',
            textAlign: 'center',
            color: '#fff',
            backdropFilter: 'blur(20px)',
            minWidth: '400px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        });
        
        document.body.appendChild(welcomeMessage);
        
        // Auto-dismiss after 5 seconds
        const autoDismiss = setTimeout(() => {
            if (welcomeMessage.parentNode) {
                document.body.removeChild(welcomeMessage);
            }
        }, 5000);
        
        // Manual dismiss
        welcomeMessage.querySelector('.welcome-dismiss').addEventListener('click', () => {
            clearTimeout(autoDismiss);
            if (welcomeMessage.parentNode) {
                document.body.removeChild(welcomeMessage);
            }
        });
    }

    // Reload application
    reloadApplication() {
        console.log('Reloading application...');
        window.location.reload();
    }

    // Save current state
    saveCurrentState() {
        const state = {
            timestamp: Date.now(),
            config: this.config.config,
            videoState: this.videoPlayer ? this.videoPlayer.getState() : null,
            connectionStatus: this.homeAssistant ? this.homeAssistant.getStatus() : null
        };
        
        localStorage.setItem('theater-wall-state', JSON.stringify(state));
        this.config.showNotification('State saved', 'success');
    }

    // Load saved state
    loadSavedState() {
        try {
            const savedState = localStorage.getItem('theater-wall-state');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // Restore video state if needed
                if (state.videoState && this.videoPlayer) {
                    this.videoPlayer.setState(state.videoState);
                }
                
                console.log('State restored from', new Date(state.timestamp));
            }
        } catch (error) {
            console.warn('Failed to load saved state:', error);
        }
    }

    // Show help dialog
    showHelpDialog() {
        const helpDialog = document.createElement('div');
        helpDialog.className = 'help-dialog';
        helpDialog.innerHTML = `
            <h2>Theater Wall Help</h2>
            <div class="help-content">
                <h3>Keyboard Shortcuts</h3>
                <ul>
                    <li><kbd>Ctrl + ,</kbd> - Open configuration</li>
                    <li><kbd>F1</kbd> - Show this help</li>
                    <li><kbd>F5</kbd> - Reload application</li>
                    <li><kbd>Ctrl + R</kbd> - Reload application</li>
                    <li><kbd>Ctrl + S</kbd> - Save current state</li>
                </ul>
                
                <h3>Video Controls</h3>
                <ul>
                    <li><kbd>Space</kbd> - Play/Pause</li>
                    <li><kbd>K</kbd> - Play/Pause</li>
                    <li><kbd>Arrow Left/Right</kbd> - Skip 10s</li>
                    <li><kbd>Arrow Up/Down</kbd> - Volume</li>
                    <li><kbd>F</kbd> - Fullscreen</li>
                    <li><kbd>Escape</kbd> - Exit video</li>
                </ul>
                
                <h3>Configuration</h3>
                <p>Configure your Home Assistant connection and panel settings using the configuration panel.</p>
                <p>You'll need a long-lived access token from Home Assistant.</p>
            </div>
            <button class="help-close">Close</button>
        `;
        
        Object.assign(helpDialog.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, rgba(30, 30, 40, 0.95), rgba(20, 20, 30, 0.95))',
            border: '2px solid rgba(100, 100, 120, 0.3)',
            borderRadius: '16px',
            padding: '30px',
            zIndex: '5000',
            color: '#fff',
            backdropFilter: 'blur(20px)',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        });
        
        document.body.appendChild(helpDialog);
        
        helpDialog.querySelector('.help-close').addEventListener('click', () => {
            document.body.removeChild(helpDialog);
        });
        
        // Close on outside click
        helpDialog.addEventListener('click', (event) => {
            if (event.target === helpDialog) {
                document.body.removeChild(helpDialog);
            }
        });
    }

    // Show fatal error
    showFatalError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fatal-error';
        errorDiv.innerHTML = `
            <h2>Application Error</h2>
            <p>The Theater Wall Display failed to start.</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <button onclick="window.location.reload()">Reload</button>
        `;
        
        Object.assign(errorDiv.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: '#000',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10000',
            textAlign: 'center',
            padding: '20px'
        });
        
        document.body.innerHTML = '';
        document.body.appendChild(errorDiv);
    }

    // Get application status
    getStatus() {
        return {
            initialized: this.isInitialized,
            uptime: Date.now() - this.startTime,
            homeAssistant: this.homeAssistant ? this.homeAssistant.getStatus() : null,
            config: this.config ? this.config.config : null,
            video: this.videoPlayer ? this.videoPlayer.getState() : null
        };
    }
}

// Initialize the application when the script loads
window.theaterWallApp = new TheaterWallApp();

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Service Worker registration for PWA support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}