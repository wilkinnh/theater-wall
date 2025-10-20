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
                sensors: [
                    'sensor.temperature_living_room',
                    'sensor.humidity_living_room',
                    'binary_sensor.motion_front_door',
                    'sensor.outside_temperature'
                ],
                controls: [
                    'light.living_room',
                    'light.kitchen',
                    'switch.fan',
                    'media_player.living_room_tv'
                ],
                media: [
                    'media_player.living_room_speaker',
                    'media_player.bedroom_speaker',
                    'media_player.kitchen_display'
                ]
            },
            video: {
                autoPlay: false,
                loop: true,
                volume: 0.5,
                defaultSources: [
                    'assets/videos/sample.mp4'
                ]
            },
            gameScore: 'sensor.atlanta_falcons',
            display: {
                brightness: 1.0,
                contrast: 1.0,
                highContrast: false,
                largeText: false
            }
        };
        
        this.config = { ...this.defaultConfig };
        this.loadConfig();
        this.initEventListeners();
    }

    // Load configuration from localStorage and environment variables
    loadConfig() {
        try {
            // Start with default configuration
            this.config = { ...this.defaultConfig };
            
            // Load from localStorage if available
            const savedConfig = localStorage.getItem('theater-wall-config');
            if (savedConfig) {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };
            }
            
            // Apply environment variable overrides
            if (window.envConfigLoader) {
                this.config = window.envConfigLoader.applyToConfig(this.config);
            }
            
        } catch (error) {
            console.warn('Failed to load configuration:', error);
            this.config = { ...this.defaultConfig };
        }
        this.applyConfig();
    }

    // Save configuration to localStorage
    saveConfig() {
        try {
            localStorage.setItem('theater-wall-config', JSON.stringify(this.config));
            console.log('Configuration saved successfully');
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
        
        // Update form values
        this.updateFormValues();
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

    // Update form values with current configuration
    updateFormValues() {
        const panelWidthInput = document.getElementById('panel-width');
        const panelGapInput = document.getElementById('panel-gap');
        const haUrlInput = document.getElementById('ha-url');
        const haTokenInput = document.getElementById('ha-token');

        if (panelWidthInput) panelWidthInput.value = this.config.panelWidth;
        if (panelGapInput) panelGapInput.value = this.config.panelGap;
        if (haUrlInput) haUrlInput.value = this.config.homeAssistantUrl;
        if (haTokenInput) haTokenInput.value = this.config.homeAssistantToken;
    }

    // Initialize event listeners
    initEventListeners() {
        // Configuration panel toggle
        const configToggle = document.getElementById('config-toggle');
        const configPanel = document.getElementById('config-panel');
        const closeConfigBtn = document.getElementById('close-config');
        const saveConfigBtn = document.getElementById('save-config');

        if (configToggle) {
            configToggle.addEventListener('click', () => {
                this.showConfigPanel();
            });
        }

        if (closeConfigBtn) {
            closeConfigBtn.addEventListener('click', () => {
                this.hideConfigPanel();
            });
        }

        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveFromForm();
            });
        }

        // Close config panel when clicking outside
        document.addEventListener('click', (event) => {
            if (configPanel && !configPanel.classList.contains('hidden')) {
                if (!configPanel.contains(event.target) && event.target !== configToggle) {
                    this.hideConfigPanel();
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + , to open config
            if ((event.ctrlKey || event.metaKey) && event.key === ',') {
                event.preventDefault();
                this.showConfigPanel();
            }
            // Escape to close config
            if (event.key === 'Escape' && !configPanel.classList.contains('hidden')) {
                this.hideConfigPanel();
            }
        });
    }

    // Show configuration panel
    showConfigPanel() {
        const configPanel = document.getElementById('config-panel');
        if (configPanel) {
            configPanel.classList.remove('hidden');
            configPanel.classList.add('fade-in');
            this.updateFormValues();
        }
    }

    // Hide configuration panel
    hideConfigPanel() {
        const configPanel = document.getElementById('config-panel');
        if (configPanel) {
            configPanel.classList.add('hidden');
        }
    }

    // Save configuration from form inputs
    saveFromForm() {
        const panelWidthInput = document.getElementById('panel-width');
        const panelGapInput = document.getElementById('panel-gap');
        const haUrlInput = document.getElementById('ha-url');
        const haTokenInput = document.getElementById('ha-token');

        if (panelWidthInput) {
            const value = parseInt(panelWidthInput.value);
            if (value >= 10 && value <= 40) {
                this.config.panelWidth = value;
            }
        }

        if (panelGapInput) {
            const value = parseInt(panelGapInput.value);
            if (value >= 1 && value <= 10) {
                this.config.panelGap = value;
            }
        }

        if (haUrlInput) {
            this.config.homeAssistantUrl = haUrlInput.value.trim();
        }

        if (haTokenInput) {
            this.config.homeAssistantToken = haTokenInput.value.trim();
        }

        this.saveConfig();
        this.applyConfig();
        this.hideConfigPanel();

        // Show success message
        this.showNotification('Configuration saved successfully!', 'success');
    }

    // Get configuration value
    get(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
    }

    // Set configuration value
    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => obj[k] = obj[k] || {}, this.config);
        target[lastKey] = value;
        this.saveConfig();
        this.applyConfig();
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

    // Reset configuration to defaults
    resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            this.config = { ...this.defaultConfig };
            this.saveConfig();
            this.applyConfig();
            this.showNotification('Configuration reset to defaults', 'info');
        }
    }

    // Export configuration
    exportConfig() {
        const dataStr = JSON.stringify(this.config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'theater-wall-config.json';
        link.click();
        URL.revokeObjectURL(url);
    }

    // Import configuration
    importConfig(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedConfig = JSON.parse(event.target.result);
                this.config = { ...this.defaultConfig, ...importedConfig };
                this.saveConfig();
                this.applyConfig();
                this.showNotification('Configuration imported successfully!', 'success');
            } catch (error) {
                this.showNotification('Failed to import configuration: Invalid JSON', 'error');
            }
        };
        reader.readAsText(file);
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