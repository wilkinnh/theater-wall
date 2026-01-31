// Configuration Management for Theater Wall Display

// Import environment configuration loader
if (typeof require !== 'undefined') {
    // Node.js environment - load environment config
    require('./env-config.js');
}

class TheaterWallConfig {
    constructor() {
        this.defaultConfig = {
            panelWidth: 27,
            panelGap: 2,
            homeAssistantUrl: 'ws://homeassistant.local:8123/api/websocket',
            homeAssistantToken: '',
            entities: {
                sensors: [],
                controls: [
                ],
                media: [
                ]
            },
            video: {
                autoPlay: false,
                loop: true,
                volume: 0.5,
                defaultSources: [
                    'assets/videos/ric-flair.mp4'
                ]
            },
            gameScore: null, // Set by team-selector from Home Assistant
            display: {
                brightness: 1.0,
                contrast: 1.0,
                highContrast: false,
                largeText: false
            }
        };
        
        this.config = { ...this.defaultConfig };
        this.initEventListeners();
        this.loadConfig();
    }

    // Load configuration from localStorage and environment variables
    async loadConfig() {
        try {
            // Start with default configuration
            this.config = { ...this.defaultConfig };
            
            // Load from localStorage if available
            const savedConfig = localStorage.getItem('theater-wall-config');
            if (savedConfig) {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };
            }
            
            // Load environment variables from server API
            await this.loadEnvironmentConfig();
            
        } catch (error) {
            this.config = { ...this.defaultConfig };
        }
        this.applyConfig();
    }

    // Load environment configuration from server API
    async loadEnvironmentConfig() {
        
        try {
            const response = await fetch('/api/env');
            
            if (response.ok) {
                const envConfig = await response.json();
                
                // Update config with environment variables
                if (envConfig.HOME_ASSISTANT_URL) {
                    this.config.homeAssistantUrl = envConfig.HOME_ASSISTANT_URL;
                } else {
                }
                
                if (envConfig.HOME_ASSISTANT_TOKEN) {
                    this.config.homeAssistantToken = envConfig.HOME_ASSISTANT_TOKEN;
                } else {
                }
                
                
                // 🔄 Trigger Home Assistant connection after config loads
                setTimeout(() => {
                    if (window.homeAssistantClient && !window.homeAssistantClient.isConnected) {
                        // Update the HA client config with the new values
                        window.homeAssistantClient.config = this.getHomeAssistantConfig();
                        window.homeAssistantClient.connect();
                    } else if (window.homeAssistantClient && window.homeAssistantClient.isConnected) {
                    } else {
                    }
                }, 1500); // Increased delay to ensure config is fully applied
                
            } else {
                console.error('Failed to fetch /api/env, status:', response.status);
            }
        } catch (error) {
            console.error('❌ Not running on Node.js server or API not available');
            console.error('Error:', error.message);
            
            // Try to load from env-config.js fallback
            this.loadFallbackConfig();
        }
    }

    // Fallback configuration loading
    loadFallbackConfig() {
        
        // Check if env-config.js is available
        if (window.envConfigLoader) {
            const envStatus = window.envConfigLoader.getConfigStatus();
            this.config = window.envConfigLoader.applyToConfig(this.config);
        } else {
        }
    }

    // Save configuration to localStorage
    saveConfig() {
        try {
            localStorage.setItem('theater-wall-config', JSON.stringify(this.config));
        } catch (error) {
            console.error('Failed to save configuration:', error);
        }
    }

    // Apply configuration to the DOM
    applyConfig() {
        // Apply panel dimensions
        this.applyPanelDimensions();
        
        // Apply display settings
        this.applyDisplaySettings();
    }

    // Apply panel dimensions to CSS variables
    applyPanelDimensions() {
        const root = document.documentElement;
        root.style.setProperty('--panel-width', `${this.config.panelWidth}%`);
        root.style.setProperty('--panel-gap', `${this.config.panelGap}%`);
    }

    // Apply display settings
    applyDisplaySettings() {
        const root = document.documentElement;
        root.style.setProperty('--brightness', this.config.display.brightness);
        root.style.setProperty('--contrast', this.config.display.contrast);
        
        if (this.config.display.highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
        
        if (this.config.display.largeText) {
            document.body.classList.add('large-text');
        } else {
            document.body.classList.remove('large-text');
        }
    }

    // Initialize event listeners (environment-driven - no UI config)
    initEventListeners() {
        // No configuration UI listeners needed - environment-driven only
    }

    // Get configuration value
    get(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
    }

    // Set configuration value (environment-driven - read-only)
    set(key, value) {
    }

    // Get Home Assistant configuration
    getHomeAssistantConfig() {
        return {
            url: this.config.homeAssistantUrl,
            token: this.config.homeAssistantToken
        };
    }

    // Get entities configuration
    getEntitiesConfig() {
        return this.config.entities;
    }

    // Get video configuration
    getVideoConfig() {
        return this.config.video;
    }

    // Reset configuration to defaults (environment-driven - disabled)
    resetToDefaults() {
    }

    // Export configuration (environment-driven - disabled)
    exportConfig() {
    }

    // Import configuration (environment-driven - disabled)
    importConfig(file) {
    }

    // Clear cached configuration and reload
    clearCacheAndReload() {
        
        // Clear all localStorage items
        localStorage.clear();
        
        // Clear sessionStorage as well
        sessionStorage.clear();
        
        this.showNotification('Configuration cache cleared. Reloading...', 'info');
        
        // Force hard reload with timestamp to bypass cache
        const timestamp = Date.now();
        setTimeout(() => {
            window.location.href = window.location.href + '?t=' + timestamp;
        }, 100);
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '15px 25px',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        // Set background color based on type
        const colors = {
            success: 'rgba(76, 175, 80, 0.9)',
            error: 'rgba(244, 67, 54, 0.9)',
            warning: 'rgba(255, 152, 0, 0.9)',
            info: 'rgba(33, 150, 243, 0.9)'
        };
        notification.style.background = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        // Fade out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Validate configuration
    validateConfig() {
        const errors = [];

        if (this.config.panelWidth < 10 || this.config.panelWidth > 40) {
            errors.push('Panel width must be between 10% and 40%');
        }

        if (this.config.panelGap < 1 || this.config.panelGap > 10) {
            errors.push('Panel gap must be between 1% and 10%');
        }

        if (!this.config.homeAssistantUrl) {
            errors.push('Home Assistant URL is required');
        }

        if (!this.config.homeAssistantToken) {
            errors.push('Home Assistant access token is required');
        }

        return errors;
    }
}

// Initialize configuration
window.theaterWallConfig = new TheaterWallConfig();