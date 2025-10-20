// Environment Configuration Loader
// Loads configuration from environment variables with fallback to defaults

class EnvConfigLoader {
    constructor() {
        this.loadEnvironmentConfig();
    }

    // Load configuration from environment variables
    loadEnvironmentConfig() {
        // Try to load from window.__ENV__ (injected by server)
        // or fall back to process.env (Node.js environment)
        const env = this.getEnvironment();
        
        // Store environment overrides
        this.envConfig = {
            haUrl: env.HA_URL || null,
            haToken: env.HA_TOKEN || null,
            gameScoreEntity: env.GAME_SCORE_ENTITY || null,
            panelWidth: env.PANEL_WIDTH ? parseInt(env.PANEL_WIDTH) : null,
            panelGap: env.PANEL_GAP ? parseInt(env.PANEL_GAP) : null
        };
    }

    // Get environment variables based on runtime
    getEnvironment() {
        // Browser environment - variables injected by server
        if (typeof window !== 'undefined' && window.__ENV__) {
            return window.__ENV__;
        }
        
        // Node.js environment (for development or server-side rendering)
        if (typeof process !== 'undefined' && process.env) {
            return process.env;
        }
        
        // Fallback for static hosting
        return {};
    }

    // Apply environment configuration to existing config
    applyToConfig(config) {
        const updatedConfig = { ...config };
        
        // Override with environment variables if they exist
        if (this.envConfig.haUrl) {
            updatedConfig.homeAssistantUrl = this.envConfig.haUrl;
        }
        
        if (this.envConfig.haToken) {
            updatedConfig.homeAssistantToken = this.envConfig.haToken;
        }
        
        if (this.envConfig.gameScoreEntity) {
            updatedConfig.gameScore = this.envConfig.gameScoreEntity;
        }
        
        if (this.envConfig.panelWidth && !isNaN(this.envConfig.panelWidth)) {
            updatedConfig.panelWidth = this.envConfig.panelWidth;
        }
        
        if (this.envConfig.panelGap && !isNaN(this.envConfig.panelGap)) {
            updatedConfig.panelGap = this.envConfig.panelGap;
        }
        
        return updatedConfig;
    }

    // Check if sensitive configuration is available
    hasSensitiveConfig() {
        return !!(this.envConfig.haUrl && this.envConfig.haToken);
    }

    // Get configuration status
    getConfigStatus() {
        return {
            hasEnvVars: this.hasSensitiveConfig(),
            hasHaUrl: !!this.envConfig.haUrl,
            hasHaToken: !!this.envConfig.haToken,
            hasGameScoreEntity: !!this.envConfig.gameScoreEntity,
            source: this.getEnvironmentSource()
        };
    }

    // Get the source of environment variables
    getEnvironmentSource() {
        if (typeof window !== 'undefined' && window.__ENV__) {
            return 'server-injected';
        } else if (typeof process !== 'undefined' && process.env) {
            return 'process-env';
        } else {
            return 'none';
        }
    }

    // Create a development server that injects environment variables
    static createDevServerConfig() {
        return `
// Development server configuration for injecting environment variables
const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config();

// Create environment injection script
const envScript = \`
window.__ENV__ = {
    HA_URL: process.env.HA_URL || '',
    HA_TOKEN: process.env.HA_TOKEN || '',
    GAME_SCORE_ENTITY: process.env.GAME_SCORE_ENTITY || '',
    PANEL_WIDTH: process.env.PANEL_WIDTH || '',
    PANEL_GAP: process.env.PANEL_GAP || ''
};
\`;

// Write to a file that can be included in HTML
fs.writeFileSync('env.js', envScript);
console.log('Environment variables injected into env.js');
        `;
    }
}

// Initialize environment loader
window.envConfigLoader = new EnvConfigLoader();