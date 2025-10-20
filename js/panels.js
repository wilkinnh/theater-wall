// Panel Management System

class PanelManager {
    constructor() {
        this.panels = {
            sensors: document.getElementById('panel-left'),
            controls: document.getElementById('panel-center'),
            media: document.getElementById('panel-right')
        };
        
        this.containers = {
            sensors: document.getElementById('sensors-container'),
            controls: document.getElementById('controls-container'),
            media: document.getElementById('media-container')
        };
        
        this.entityElements = new Map();
        this.config = null;
        this.homeAssistant = null;
        
        this.init();
    }

    // Initialize panel manager
    init() {
        this.config = window.theaterWallConfig;
        this.homeAssistant = window.homeAssistantClient;
        
        this.setupEventListeners();
        this.loadSampleData();
    }

    // Setup event listeners
    setupEventListeners() {
        // Listen for Home Assistant events
        this.homeAssistant.on('connected', () => {
            this.loadEntities();
        });
        
        this.homeAssistant.on('states-loaded', (states) => {
            this.displayEntities(states);
        });
        
        this.homeAssistant.on('state-changed', (data) => {
            this.updateEntity(data.entity_id, data.state);
        });
        
        // Listen for configuration changes
        window.addEventListener('config-changed', () => {
            this.loadEntities();
        });
    }

    // Load entities from configuration
    loadEntities() {
        const entitiesConfig = this.config.getEntitiesConfig();
        
        // Clear existing entities
        this.clearAllPanels();
        
        // Load entities for each panel
        this.loadPanelEntities('sensors', entitiesConfig.sensors);
        this.loadPanelEntities('controls', entitiesConfig.controls);
        this.loadPanelEntities('media', entitiesConfig.media);
    }

    // Load entities for a specific panel
    loadPanelEntities(panelType, entityIds) {
        const container = this.containers[panelType];
        if (!container) return;
        
        entityIds.forEach(entityId => {
            const state = this.homeAssistant.getEntityState(entityId);
            if (state) {
                this.createEntityElement(panelType, entityId, state);
            } else {
                // Create placeholder for unavailable entity
                this.createEntityElement(panelType, entityId, null);
            }
        });
    }

    // Display entities from loaded states
    displayEntities(states) {
        const entitiesConfig = this.config.getEntitiesConfig();
        
        // Filter and display entities based on configuration
        Object.keys(entitiesConfig).forEach(panelType => {
            entitiesConfig[panelType].forEach(entityId => {
                const state = states.find(s => s.entity_id === entityId);
                if (state) {
                    this.updateEntity(entityId, state);
                }
            });
        });
    }

    // Create entity element
    createEntityElement(panelType, entityId, state) {
        const container = this.containers[panelType];
        if (!container) return;
        
        const element = document.createElement('div');
        element.className = 'entity-card';
        element.id = `entity-${entityId.replace(/\./g, '-')}`;
        
        if (state) {
            element.classList.add(state.state === 'on' ? 'on' : 'off');
            if (state.state === 'unavailable') {
                element.classList.add('unavailable');
            }
        } else {
            element.classList.add('unavailable');
        }
        
        // Create entity content based on type
        const content = this.createEntityContent(entityId, state);
        element.innerHTML = content;
        
        // Add click handler
        element.addEventListener('click', () => {
            this.handleEntityClick(entityId, state);
        });
        
        container.appendChild(element);
        this.entityElements.set(entityId, element);
    }

    // Create entity content based on entity type
    createEntityContent(entityId, state) {
        const domain = entityId.split('.')[0];
        const friendlyName = state?.attributes?.friendly_name || this.formatEntityName(entityId);
        
        switch (domain) {
            case 'sensor':
                return this.createSensorContent(entityId, state);
            case 'binary_sensor':
                return this.createBinarySensorContent(entityId, state);
            case 'light':
                return this.createLightContent(entityId, state);
            case 'switch':
                return this.createSwitchContent(entityId, state);
            case 'media_player':
                return this.createMediaPlayerContent(entityId, state);
            default:
                return this.createDefaultContent(entityId, state);
        }
    }

    // Create sensor content
    createSensorContent(entityId, state) {
        if (!state) {
            return `
                <div class="entity-header">
                    <span class="entity-name">${this.formatEntityName(entityId)}</span>
                    <span class="entity-icon">📊</span>
                </div>
                <div class="entity-content">
                    <span class="entity-state">Unavailable</span>
                </div>
            `;
        }
        
        const value = state.state;
        const unit = state.attributes?.unit_of_measurement || '';
        const icon = this.getSensorIcon(entityId, state);
        
        // Determine sensor type for styling
        const sensorClass = state.attributes?.device_class || '';
        let sensorTypeClass = '';
        if (sensorClass === 'temperature') sensorTypeClass = 'temperature-sensor';
        else if (sensorClass === 'humidity') sensorTypeClass = 'humidity-sensor';
        else if (entityId.includes('motion')) sensorTypeClass = 'motion-sensor';
        
        return `
            <div class="entity-header">
                <span class="entity-name">${state.attributes?.friendly_name || this.formatEntityName(entityId)}</span>
                <span class="entity-icon">${icon}</span>
            </div>
            <div class="entity-content">
                <span class="entity-value sensor-value ${sensorTypeClass}">${value}</span>
                <span class="entity-unit">${unit}</span>
            </div>
            ${this.createAttributes(state)}
        `;
    }

    // Create binary sensor content
    createBinarySensorContent(entityId, state) {
        if (!state) {
            return `
                <div class="entity-header">
                    <span class="entity-name">${this.formatEntityName(entityId)}</span>
                    <span class="entity-icon">🔲</span>
                </div>
                <div class="entity-content">
                    <span class="entity-state">Unavailable</span>
                </div>
            `;
        }
        
        const isOn = state.state === 'on';
        const icon = this.getBinarySensorIcon(entityId, state);
        const stateText = isOn ? 'Detected' : 'Clear';
        
        return `
            <div class="entity-header">
                <span class="entity-name">${state.attributes?.friendly_name || this.formatEntityName(entityId)}</span>
                <span class="entity-icon">${icon}</span>
            </div>
            <div class="entity-content">
                <span class="entity-state">${stateText}</span>
            </div>
            ${this.createAttributes(state)}
        `;
    }

    // Create light content
    createLightContent(entityId, state) {
        if (!state) {
            return `
                <div class="entity-header">
                    <span class="entity-name">${this.formatEntityName(entityId)}</span>
                    <span class="entity-icon">💡</span>
                </div>
                <div class="entity-content">
                    <span class="entity-state">Unavailable</span>
                </div>
            `;
        }
        
        const isOn = state.state === 'on';
        const brightness = state.attributes?.brightness;
        const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0;
        
        return `
            <div class="entity-header">
                <span class="entity-name">${state.attributes?.friendly_name || this.formatEntityName(entityId)}</span>
                <span class="entity-icon">${isOn ? '💡' : '🔦'}</span>
            </div>
            <div class="entity-content switch-control">
                <span class="entity-state">${isOn ? 'On' : 'Off'}</span>
                <div class="switch-toggle ${isOn ? 'on' : ''}"></div>
            </div>
            ${isOn && brightness ? `<div class="entity-attribute">Brightness: ${brightnessPercent}%</div>` : ''}
        `;
    }

    // Create switch content
    createSwitchContent(entityId, state) {
        if (!state) {
            return `
                <div class="entity-header">
                    <span class="entity-name">${this.formatEntityName(entityId)}</span>
                    <span class="entity-icon">🔌</span>
                </div>
                <div class="entity-content">
                    <span class="entity-state">Unavailable</span>
                </div>
            `;
        }
        
        const isOn = state.state === 'on';
        const icon = this.getSwitchIcon(entityId, state);
        
        return `
            <div class="entity-header">
                <span class="entity-name">${state.attributes?.friendly_name || this.formatEntityName(entityId)}</span>
                <span class="entity-icon">${icon}</span>
            </div>
            <div class="entity-content switch-control">
                <span class="entity-state">${isOn ? 'On' : 'Off'}</span>
                <div class="switch-toggle ${isOn ? 'on' : ''}"></div>
            </div>
        `;
    }

    // Create media player content
    createMediaPlayerContent(entityId, state) {
        if (!state) {
            return `
                <div class="entity-header">
                    <span class="entity-name">${this.formatEntityName(entityId)}</span>
                    <span class="entity-icon">🎵</span>
                </div>
                <div class="entity-content">
                    <span class="entity-state">Unavailable</span>
                </div>
            `;
        }
        
        const isOn = state.state !== 'off';
        const isPlaying = state.state === 'playing';
        const mediaTitle = state.attributes?.media_title;
        const mediaArtist = state.attributes?.media_artist;
        const volume = state.attributes?.volume_level;
        const volumePercent = volume ? Math.round(volume * 100) : 0;
        
        let content = `
            <div class="entity-header">
                <span class="entity-name">${state.attributes?.friendly_name || this.formatEntityName(entityId)}</span>
                <span class="entity-icon">${this.getMediaPlayerIcon(state)}</span>
            </div>
            <div class="entity-content">
                <span class="entity-state">${this.formatMediaPlayerState(state.state)}</span>
            </div>
        `;
        
        if (isOn && (mediaTitle || mediaArtist)) {
            content += `
                <div class="media-player">
                    <div class="media-info">
                        <div>
                            <div class="media-title">${mediaTitle || 'Unknown'}</div>
                            ${mediaArtist ? `<div class="media-artist">${mediaArtist}</div>` : ''}
                        </div>
                    </div>
                    <div class="media-controls">
                        <button class="media-btn" data-action="previous">⏮️</button>
                        <button class="media-btn" data-action="${isPlaying ? 'pause' : 'play'}">${isPlaying ? '⏸️' : '▶️'}</button>
                        <button class="media-btn" data-action="next">⏭️</button>
                    </div>
                    ${volume ? `<div class="entity-attribute">Volume: ${volumePercent}%</div>` : ''}
                </div>
            `;
        }
        
        return content;
    }

    // Create default content for unknown entity types
    createDefaultContent(entityId, state) {
        if (!state) {
            return `
                <div class="entity-header">
                    <span class="entity-name">${this.formatEntityName(entityId)}</span>
                    <span class="entity-icon">❓</span>
                </div>
                <div class="entity-content">
                    <span class="entity-state">Unavailable</span>
                </div>
            `;
        }
        
        return `
            <div class="entity-header">
                <span class="entity-name">${state.attributes?.friendly_name || this.formatEntityName(entityId)}</span>
                <span class="entity-icon">📦</span>
            </div>
            <div class="entity-content">
                <span class="entity-state">${state.state}</span>
            </div>
        `;
    }

    // Create attributes display
    createAttributes(state) {
        if (!state || !state.attributes) return '';
        
        const attributes = [];
        
        // Show last updated
        if (state.last_updated) {
            const lastUpdated = new Date(state.last_updated).toLocaleTimeString();
            attributes.push(`Updated: ${lastUpdated}`);
        }
        
        if (attributes.length === 0) return '';
        
        return `
            <div class="entity-attributes">
                ${attributes.map(attr => `<div class="entity-attribute">${attr}</div>`).join('')}
            </div>
        `;
    }

    // Update entity display
    updateEntity(entityId, state) {
        const element = this.entityElements.get(entityId);
        if (!element) return;
        
        // Update classes
        element.classList.remove('on', 'off', 'unavailable');
        if (state.state === 'on') {
            element.classList.add('on');
        } else if (state.state === 'unavailable') {
            element.classList.add('unavailable');
        } else {
            element.classList.add('off');
        }
        
        // Update content
        const content = this.createEntityContent(entityId, state);
        element.innerHTML = content;
        
        // Re-add click handler
        element.addEventListener('click', () => {
            this.handleEntityClick(entityId, state);
        });
        
        // Add animation
        element.classList.add('fade-in');
        setTimeout(() => element.classList.remove('fade-in'), 500);
    }

    // Handle entity click
    async handleEntityClick(entityId, state) {
        if (!state || state.state === 'unavailable') {
            console.warn('Entity not available:', entityId);
            return;
        }
        
        const domain = entityId.split('.')[0];
        
        try {
            switch (domain) {
                case 'light':
                    await this.toggleLight(entityId, state);
                    break;
                case 'switch':
                    await this.toggleSwitch(entityId, state);
                    break;
                case 'media_player':
                    await this.handleMediaPlayerClick(entityId, state, event);
                    break;
                default:
                    console.log('No action defined for entity type:', domain);
            }
        } catch (error) {
            console.error('Failed to handle entity click:', error);
        }
    }

    // Toggle light
    async toggleLight(entityId, state) {
        const isOn = state.state === 'on';
        const service = isOn ? 'turn_off' : 'turn_on';
        
        await this.homeAssistant.callService('light', service, { entity_id: entityId });
    }

    // Toggle switch
    async toggleSwitch(entityId, state) {
        const isOn = state.state === 'on';
        const service = isOn ? 'turn_off' : 'turn_on';
        
        await this.homeAssistant.callService('switch', service, { entity_id: entityId });
    }

    // Handle media player click
    async handleMediaPlayerClick(entityId, state, event) {
        const target = event.target;
        const action = target.dataset.action;
        
        if (!action) return;
        
        switch (action) {
            case 'play':
                await this.homeAssistant.callService('media_player', 'media_play', { entity_id: entityId });
                break;
            case 'pause':
                await this.homeAssistant.callService('media_player', 'media_pause', { entity_id: entityId });
                break;
            case 'next':
                await this.homeAssistant.callService('media_player', 'media_next_track', { entity_id: entityId });
                break;
            case 'previous':
                await this.homeAssistant.callService('media_player', 'media_previous_track', { entity_id: entityId });
                break;
        }
    }

    // Clear all panels
    clearAllPanels() {
        Object.values(this.containers).forEach(container => {
            if (container) {
                container.innerHTML = '';
            }
        });
        this.entityElements.clear();
    }

    // Load sample data for demonstration
    loadSampleData() {
        const sampleData = {
            'sensor.temperature_living_room': {
                entity_id: 'sensor.temperature_living_room',
                state: '72.5',
                attributes: {
                    friendly_name: 'Living Room Temperature',
                    unit_of_measurement: '°F',
                    device_class: 'temperature'
                },
                last_updated: new Date().toISOString()
            },
            'sensor.humidity_living_room': {
                entity_id: 'sensor.humidity_living_room',
                state: '45',
                attributes: {
                    friendly_name: 'Living Room Humidity',
                    unit_of_measurement: '%',
                    device_class: 'humidity'
                },
                last_updated: new Date().toISOString()
            },
            'binary_sensor.motion_front_door': {
                entity_id: 'binary_sensor.motion_front_door',
                state: 'off',
                attributes: {
                    friendly_name: 'Front Door Motion',
                    device_class: 'motion'
                },
                last_updated: new Date().toISOString()
            },
            'light.living_room': {
                entity_id: 'light.living_room',
                state: 'on',
                attributes: {
                    friendly_name: 'Living Room Lights',
                    brightness: 200
                },
                last_updated: new Date().toISOString()
            },
            'media_player.living_room_speaker': {
                entity_id: 'media_player.living_room_speaker',
                state: 'playing',
                attributes: {
                    friendly_name: 'Living Room Speaker',
                    media_title: 'Favorite Song',
                    media_artist: 'Artist Name',
                    volume_level: 0.7
                },
                last_updated: new Date().toISOString()
            }
        };
        
        // Display sample data if not connected to Home Assistant
        if (!this.homeAssistant.isConnected) {
            Object.entries(sampleData).forEach(([entityId, state]) => {
                const panelType = this.getPanelTypeForEntity(entityId);
                if (panelType) {
                    this.createEntityElement(panelType, entityId, state);
                }
            });
        }
    }

    // Get panel type for entity
    getPanelTypeForEntity(entityId) {
        const domain = entityId.split('.')[0];
        
        if (domain === 'sensor' || domain === 'binary_sensor') {
            return 'sensors';
        } else if (domain === 'light' || domain === 'switch') {
            return 'controls';
        } else if (domain === 'media_player') {
            return 'media';
        }
        
        return null;
    }

    // Helper methods
    formatEntityName(entityId) {
        return entityId.replace(/_/g, ' ').replace(/\./g, ' - ');
    }

    getSensorIcon(entityId, state) {
        const deviceClass = state?.attributes?.device_class;
        
        switch (deviceClass) {
            case 'temperature': return '🌡️';
            case 'humidity': return '💧';
            case 'pressure': return '🔵';
            case 'illuminance': return '☀️';
            default:
                if (entityId.includes('temperature')) return '🌡️';
                if (entityId.includes('humidity')) return '💧';
                if (entityId.includes('motion')) return '🚶';
                return '📊';
        }
    }

    getBinarySensorIcon(entityId, state) {
        const deviceClass = state?.attributes?.device_class;
        const isOn = state?.state === 'on';
        
        switch (deviceClass) {
            case 'motion': return isOn ? '🚶' : '🚶‍♂️';
            case 'door': return isOn ? '🚪' : '🔒';
            case 'window': return isOn ? '🪟' : '🔒';
            case 'presence': return isOn ? '👤' : '🏠';
            default: return isOn ? '🟢' : '🔴';
        }
    }

    getSwitchIcon(entityId, state) {
        const isOn = state?.state === 'on';
        
        if (entityId.includes('fan')) return isOn ? '🌀' : '🌀';
        if (entityId.includes('tv')) return isOn ? '📺' : '📺';
        if (entityId.includes('computer')) return isOn ? '💻' : '💻';
        
        return isOn ? '🔌' : '🔌';
    }

    getMediaPlayerIcon(state) {
        const playerState = state?.state;
        
        switch (playerState) {
            case 'playing': return '🎵';
            case 'paused': return '⏸️';
            case 'idle': return '💤';
            default: return '🔇';
        }
    }

    formatMediaPlayerState(state) {
        switch (state) {
            case 'playing': return 'Playing';
            case 'paused': return 'Paused';
            case 'idle': return 'Idle';
            case 'off': return 'Off';
            default: return state || 'Unknown';
        }
    }
}

// Initialize panel manager
window.panelManager = new PanelManager();