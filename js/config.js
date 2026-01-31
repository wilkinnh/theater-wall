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
            video: {
                loop: true,
                volume: 0.5,
                defaultSources: [
                    'assets/videos/ric-flair.mp4'
                ]
            },
            gameScore: null // Set by team-selector from Home Assistant
        };
        
        this.config = { ...this.defaultConfig };
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
                }

                if (envConfig.HOME_ASSISTANT_TOKEN) {
                    this.config.homeAssistantToken = envConfig.HOME_ASSISTANT_TOKEN;
                }

                // Trigger Home Assistant connection after config loads
                setTimeout(() => {
                    if (window.homeAssistantClient && !window.homeAssistantClient.isConnected) {
                        window.homeAssistantClient.config = this.getHomeAssistantConfig();
                        window.homeAssistantClient.connect();
                    }
                }, 1500);
                
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
        if (window.envConfigLoader) {
            this.config = window.envConfigLoader.applyToConfig(this.config);
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
        this.applyPanelDimensions();
    }

    // Apply panel dimensions to CSS variables
    applyPanelDimensions() {
        const root = document.documentElement;
        root.style.setProperty('--panel-width', `${this.config.panelWidth}%`);
        root.style.setProperty('--panel-gap', `${this.config.panelGap}%`);
    }

    // Get configuration value
    get(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
    }

    // Get Home Assistant configuration
    getHomeAssistantConfig() {
        return {
            url: this.config.homeAssistantUrl,
            token: this.config.homeAssistantToken
        };
    }

    // Get video configuration
    getVideoConfig() {
        return this.config.video;
    }

    // Clear cached configuration and reload
    clearCacheAndReload() {
        localStorage.clear();
        sessionStorage.clear();
        this.showNotification('Configuration cache cleared. Reloading...', 'info');
        setTimeout(() => {
            window.location.href = window.location.href + '?t=' + Date.now();
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