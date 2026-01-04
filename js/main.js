// Main Application Entry Point

class TheaterWallApp {
    constructor() {
        this.config = null;
        this.homeAssistant = null;
        this.panels = null;
        this.videoPlayer = null;
        
        this.isInitialized = false;
        this.startTime = Date.now();
        this.showHUD = this.getHUDParameter();
        
        this.init();
    }

    // Get HUD parameter from URL query string
    getHUDParameter() {
        const urlParams = new URLSearchParams(window.location.search);
        const showHUD = urlParams.get('showHUD');
        const result = showHUD === 'true';
        return result;
    }

    // Initialize the application
    async init() {
        try {
            
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
            
            // Control HUD visibility
            this.toggleHUDVisibility();
            
            // Connect to Home Assistant if configured
            await this.connectToHomeAssistant();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Re-apply HUD visibility after all components are initialized
            // This ensures video controls and other dynamic elements are properly hidden
            setTimeout(() => {
                this.toggleHUDVisibility();
            }, 100);
            
            
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
        
        // Validate configuration (environment-driven - no notifications)
        const errors = this.config.validateConfig();
        if (errors.length > 0) {
        }
    }

    // Toggle HUD visibility based on URL parameter
    toggleHUDVisibility() {
        
        if (!this.showHUD) {
            
            // Hide all HUD elements
            const hudElements = [
                '#connection-status',
                '#config-toggle',
                '#video-trigger',
                '#debug-refresh'
            ];
            
            hudElements.forEach(selector => {
                const element = document.querySelector(selector);
                if (element) {
                    element.style.display = 'none';
                } else {
                }
            });
            
            // Check if video controls exist and hide them
            const videoControls = document.querySelector('.video-controls');
            if (videoControls) {
                videoControls.style.display = 'none';
            } else {
            }
            
            // Hide video controls during playback with CSS
            const style = document.createElement('style');
            style.id = 'hud-hide-style';
            style.textContent = `
                .video-controls {
                    display: none !important;
                }
                .config-panel {
                    display: none !important;
                }
                .welcome-message {
                    display: none !important;
                }
                .help-dialog {
                    display: none !important;
                }
                .notification {
                    display: none !important;
                }
                .video-player {
                    pointer-events: none !important;
                }
            `;
            document.head.appendChild(style);
            
        } else {
            
            // Remove any existing hide styles
            const existingStyle = document.getElementById('hud-hide-style');
            if (existingStyle) {
                existingStyle.remove();
            }
        }
    }

    // Setup global event handlers
    setupGlobalHandlers() {
        // Setup debug refresh button
        const debugRefresh = document.getElementById('debug-refresh');
        if (debugRefresh) {
            debugRefresh.addEventListener('click', () => {
                this.debugRefreshGameScore();
            });
        }

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
            } catch (error) {
                this.config.showNotification('Failed to connect to Home Assistant. Using sample data.', 'warning');
            }
        } else {
        }
    }

    // Handle app hidden (tab switched)
    onAppHidden() {
        // Pause video if playing
        if (this.videoPlayer && this.videoPlayer.isPlaying) {
            this.videoPlayer.pause();
        }
        
        // Reduce update frequency when hidden
    }

    // Handle app visible (tab active)
    onAppVisible() {
        
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
        this.config.showNotification('Network connection restored', 'success');
        
        // Try to reconnect to Home Assistant
        if (this.homeAssistant && !this.homeAssistant.isConnected) {
            this.homeAssistant.reconnect();
        }
    }

    // Handle network offline
    onNetworkOffline() {
        this.config.showNotification('Network connection lost', 'error');
    }

    // Handle before unload
    onBeforeUnload() {
        // Save any pending state
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Global shortcuts (environment-driven - no config shortcuts)
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
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


    // Reload application
    reloadApplication() {
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
                
            }
        } catch (error) {
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
                    <li><kbd>F1</kbd> - Show this help</li>
                    <li><kbd>F5</kbd> - Reload application</li>
                    <li><kbd>Ctrl + R</kbd> - Reload application</li>
                    <li><kbd>Ctrl + S</kbd> - Save current state</li>
                </ul>
                
                <h3>HUD Control</h3>
                <ul>
                    <li><code>?showHUD=true</code> - Show overlay buttons</li>
                    <li><code>?showHUD=false</code> - Hide overlay buttons (default)</li>
                    <li>HUD controls: Config, Video, Connection Status</li>
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
                <p>This display is configured through environment variables.</p>
                <p>Set your Home Assistant URL, access token, and game score entity in your .env file or deployment environment.</p>
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

    // Debug refresh game score
    debugRefreshGameScore() {
        
        const gameScoreEntity = this.config.get('gameScore');
        
        if (this.homeAssistant && this.homeAssistant.isConnected) {
            // Get fresh states from Home Assistant
            this.homeAssistant.getStates().then(states => {
                
                const gameScoreState = states.find(s => s.entity_id === gameScoreEntity);
                if (gameScoreState) {



                    // Update the 3-panel display directly
                    this.panels.displayGameScore(gameScoreState);
                    
                    // Also update the hidden entity element for real-time updates
                    this.panels.updateEntity(gameScoreEntity, gameScoreState);
                } else {
                }
            }).catch(error => {
                console.error('Failed to refresh states:', error);
            });
        } else {
        }
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
            video: this.videoPlayer ? this.videoPlayer.getState() : null,
            hud: {
                enabled: this.showHUD,
                url: window.location.search
            }
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
            })
            .catch(registrationError => {
            });
    });
}