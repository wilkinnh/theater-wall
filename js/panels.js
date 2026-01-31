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
        this.showLoading();
    }

    // Show loading state
    showLoading() {
        const container = this.containers.controls;
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div class="loading-text">Connecting to Home Assistant...</div>
            </div>
        `;
    }

    // Hide loading state
    hideLoading() {
        const loadingEl = document.querySelector('.loading-state');
        if (loadingEl) {
            loadingEl.remove();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Listen for Home Assistant events
        this.homeAssistant.on('connected', () => {
            this.loadEntities();
            // Start periodic refresh for attribute-based updates
            this.startPeriodicRefresh();
        });
        
        this.homeAssistant.on('states-loaded', () => {
            // Game score is managed by team-selector from Home Assistant
        });
        
        this.homeAssistant.on('state-changed', (data) => {
            // Only log game score state changes
            if (data.entity_id === this.config.get('gameScore')) {
            }
            this.updateEntity(data.entity_id, data.state);
        });
        
        // Listen for attribute changes (new event type)
        this.homeAssistant.on('attributes-changed', (data) => {
            // Only log game score attribute changes
            if (data.entity_id === this.config.get('gameScore')) {
            }
            this.updateEntity(data.entity_id, data.state);
        });
        
        // Listen for configuration changes
        window.addEventListener('config-changed', () => {
            this.loadEntities();
        });
    }

    // Start periodic refresh for entities that update via attributes
    startPeriodicRefresh() {
        const gameScoreEntity = this.config.get('gameScore');
        if (!gameScoreEntity) return;

        
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.refreshGameScoreEntity(gameScoreEntity);
        }, 30000);
    }

    // Refresh the game score entity manually
    async refreshGameScoreEntity(entityId) {
        if (!this.homeAssistant.isConnected) return;

        try {

            // Get fresh state from Home Assistant API (not cache)
            const freshStates = await this.homeAssistant.sendWithId({
                type: 'get_states'
            });

            // Find our entity in the fresh data
            const freshState = freshStates.find(state => state.entity_id === entityId);

            if (freshState) {
                // Update the local cache
                this.homeAssistant.entities.set(entityId, freshState);
                
                // Update the display
                this.displayGameScore(freshState);
                
                // Also update the hidden entity element
                this.updateHiddenEntityElement(entityId, freshState);
                
            } else {
            }
        } catch (error) {
            console.error('❌ Failed to refresh entity:', entityId, error);
        }
    }

    // Update hidden entity element
    updateHiddenEntityElement(entityId, state) {
        const elementId = `entity-${entityId.replace(/\./g, '-')}`;
        const element = this.entityElements.get(entityId);
        
        if (element) {
            // Update the stored state
            this.homeAssistant.entities.set(entityId, state);
            
            // Trigger the update logic
            this.updateEntity(entityId, state);
        }
    }

    // Load entities from configuration
    loadEntities() {
        const gameScoreEntity = this.config.get('gameScore');
        this.clearAllPanels();
        if (gameScoreEntity) {
            this.loadGameScore(gameScoreEntity);
        }
    }

    // Load game score display
    loadGameScore(gameScoreEntity) {
        // HA client already subscribes to all state_changed events and filters client-side
        const state = this.homeAssistant.getEntityState(gameScoreEntity);

        if (state && state.attributes) {
            this.displayGameScore(state);
            // Create a hidden entity element for real-time updates (don't add to panel)
            this.createHiddenEntityElement(gameScoreEntity, state);
        }
        // If no state available, don't display anything - wait for HA to provide data
    }

    // Display game score in panels
    displayGameScore(gameData) {
        this.hideLoading();
        const attrs = gameData.attributes;

        // Determine team positioning based on sport and home/away status
        const teamPositioning = this.getTeamPositioning(attrs);

        // ALWAYS update the 3-panel display (this is what users see)
        // Left panel
        const leftContainer = this.containers.sensors;
        if (leftContainer) {
            leftContainer.innerHTML = `
                <div class="game-score-display team-${teamPositioning.left.abbr.toLowerCase()}">
                    ${teamPositioning.left.logo ? `
                        <div class="team-logo">
                            <img src="${teamPositioning.left.logo}" alt="${teamPositioning.left.abbr}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div class="fallback-logo">🏆</div>
                        </div>
                    ` : ''}
                    <div class="team-abbr">${teamPositioning.left.abbr}</div>
                    <div class="team-record">${teamPositioning.left.record}</div>
                    <div class="team-score">${teamPositioning.left.score}</div>
                </div>
            `;
        }

        // Center panel - Sport-specific game stats
        const centerContainer = this.containers.controls;
        if (centerContainer) {
            centerContainer.innerHTML = this.createSportSpecificStats(gameData);
        }

        // Right panel
        const rightContainer = this.containers.media;
        if (rightContainer) {
            rightContainer.innerHTML = `
                <div class="game-score-display team-${teamPositioning.right.abbr.toLowerCase()}">
                    ${teamPositioning.right.logo ? `
                        <div class="team-logo">
                            <img src="${teamPositioning.right.logo}" alt="${teamPositioning.right.abbr}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div class="fallback-logo">🏆</div>
                        </div>
                    ` : ''}
                    <div class="team-abbr">${teamPositioning.right.abbr || 'N/A'}</div>
                    <div class="team-record">${teamPositioning.right.record || '0-0'}</div>
                    <div class="team-score">${teamPositioning.right.score || '0'}</div>
                </div>
            `;
        }
    }

    // Determine team positioning based on sport type and home/away status
    getTeamPositioning(attrs) {
        const sport = attrs.sport?.toLowerCase();
        const teamHomeAway = attrs.team_homeaway; // 'home' or 'away'

        // Determine if soccer or American sport
        const isSoccer = sport === 'soccer' || sport === 'football' && attrs.league?.toLowerCase() !== 'nfl';

        let leftTeam, rightTeam;

        if (isSoccer) {
            // Soccer: Home team on the LEFT
            if (teamHomeAway === 'home') {
                // Selected team is home, put on left
                leftTeam = {
                    label: 'Team (Home)',
                    abbr: attrs.team_abbr || 'N/A',
                    logo: attrs.team_logo,
                    record: attrs.team_record || '0-0',
                    score: attrs.team_score || '0'
                };
                rightTeam = {
                    label: 'Opponent (Away)',
                    abbr: attrs.opponent_abbr || 'N/A',
                    logo: attrs.opponent_logo,
                    record: attrs.opponent_record || '0-0',
                    score: attrs.opponent_score || '0'
                };
            } else {
                // Selected team is away, opponent is home, put opponent on left
                leftTeam = {
                    label: 'Opponent (Home)',
                    abbr: attrs.opponent_abbr || 'N/A',
                    logo: attrs.opponent_logo,
                    record: attrs.opponent_record || '0-0',
                    score: attrs.opponent_score || '0'
                };
                rightTeam = {
                    label: 'Team (Away)',
                    abbr: attrs.team_abbr || 'N/A',
                    logo: attrs.team_logo,
                    record: attrs.team_record || '0-0',
                    score: attrs.team_score || '0'
                };
            }
        } else {
            // American sports (NFL, NBA, MLB, NHL, etc.): Home team on the RIGHT
            if (teamHomeAway === 'home') {
                // Selected team is home, put on right
                leftTeam = {
                    label: 'Opponent (Away)',
                    abbr: attrs.opponent_abbr || 'N/A',
                    logo: attrs.opponent_logo,
                    record: attrs.opponent_record || '0-0',
                    score: attrs.opponent_score || '0'
                };
                rightTeam = {
                    label: 'Team (Home)',
                    abbr: attrs.team_abbr || 'N/A',
                    logo: attrs.team_logo,
                    record: attrs.team_record || '0-0',
                    score: attrs.team_score || '0'
                };
            } else {
                // Selected team is away, opponent is home, put opponent on right
                leftTeam = {
                    label: 'Team (Away)',
                    abbr: attrs.team_abbr || 'N/A',
                    logo: attrs.team_logo,
                    record: attrs.team_record || '0-0',
                    score: attrs.team_score || '0'
                };
                rightTeam = {
                    label: 'Opponent (Home)',
                    abbr: attrs.opponent_abbr || 'N/A',
                    logo: attrs.opponent_logo,
                    record: attrs.opponent_record || '0-0',
                    score: attrs.opponent_score || '0'
                };
            }
        }

        return { left: leftTeam, right: rightTeam };
    }

    // Create game score content
    createGameScoreContent(entityId, state) {
        if (!state) {
            return `
                <div class="entity-header">
                    <span class="entity-name">Game Score</span>
                    <span class="entity-icon">🏈</span>
                </div>
                <div class="entity-content">
                    <span class="entity-state">No Data</span>
                </div>
            `;
        }

        const attrs = state.attributes || {};
        
        // Extract team information
        const teamName = attrs.team_name || 'Home Team';
        const opponentName = attrs.opponent_name || 'Away Team';
        const teamScore = attrs.team_score || 0;
        const opponentScore = attrs.opponent_score || 0;
        const quarter = attrs.quarter || '';
        const clock = attrs.clock || '';
        const possession = attrs.possession;
        const lastPlay = attrs.last_play || '';
        const downDistance = attrs.down_distance_text || '';

        // Determine possession indicator
        let possessionIndicator = '';
        if (possession === '1') {
            possessionIndicator = '⚡';
        }

        return `
            <div class="entity-header">
                <span class="entity-name">${teamName} vs ${opponentName}</span>
                <span class="entity-icon">🏈</span>
            </div>
            <div class="entity-content game-score">
                <div class="score-display">
                    <div class="team-score ${possession === '1' ? 'possession' : ''}">
                        <span class="team-name">${teamName}</span>
                        <span class="score">${teamScore}</span>
                    </div>
                    <div class="vs-divider">VS</div>
                    <div class="opponent-score ${possession === '0' ? 'possession' : ''}">
                        <span class="opponent-name">${opponentName}</span>
                        <span class="score">${opponentScore}</span>
                    </div>
                </div>
                ${quarter && clock ? `
                    <div class="game-info">
                        <span class="quarter">${quarter}</span>
                        <span class="clock">${clock}</span>
                        ${possessionIndicator ? `<span class="possession-indicator">${possessionIndicator}</span>` : ''}
                    </div>
                ` : ''}
                ${lastPlay ? `<div class="last-play">${lastPlay}</div>` : ''}
                ${downDistance ? `<div class="down-distance">${downDistance}</div>` : ''}
            </div>
        `;
    }

    // Helper function to get ordinal suffix
    getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;
        if (j == 1 && k != 11) return 'st';
        if (j == 2 && k != 12) return 'nd';
        if (j == 3 && k != 13) return 'rd';
        return 'th';
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

    // Create hidden entity element for real-time updates (doesn't add to panel)
    createHiddenEntityElement(entityId, state) {
        
        const element = document.createElement('div');
        element.className = 'entity-card';
        element.id = `entity-${entityId.replace(/\./g, '-')}`;
        element.style.display = 'none'; // Hide it
        
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
        
        // Add to entity elements map but don't append to container
        this.entityElements.set(entityId, element);
    }

    // Create entity content based on entity type
    createEntityContent(entityId, state) {
        const domain = entityId.split('.')[0];
        const friendlyName = state?.attributes?.friendly_name || this.formatEntityName(entityId);
        
        // Special handling for game score entity
        if (entityId === this.config.get('gameScore')) {
            return this.createGameScoreContent(entityId, state);
        }
        
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
        const gameScoreEntity = this.config.get('gameScore');
        
        
        // Always process game score entity updates
        if (entityId === gameScoreEntity) {
            
            // Update the 3-panel display with new game data
            this.displayGameScore(state);
            
            // Also update the hidden entity element for future updates
            const element = this.entityElements.get(entityId);
            if (element) {
                
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
            } else {
            }
        } else {
        }
    }

    // Handle entity click
    async handleEntityClick(entityId, state) {
        if (!state || state.state === 'unavailable') {
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
    // Create sport-specific game statistics
    createSportSpecificStats(gameData) {
        const attrs = gameData.attributes;
        const sport = attrs.sport;
        
        
        switch (sport) {
            case 'hockey':
                return this.createHockeyStats(gameData);
            case 'football':
            case 'nfl':
                return this.createFootballStats(gameData);
            case 'basketball':
            case 'nba':
                return this.createBasketballStats(gameData);
            case 'baseball':
            case 'mlb':
                return this.createBaseballStats(gameData);
            case 'soccer':
                return this.createSoccerStats(gameData);
            default:
                return this.createGenericStats(gameData);
        }
    }

    // Create hockey-specific stats
    createHockeyStats(gameData) {
        const attrs = gameData.attributes;
        return `
            <div class="game-stats sport-hockey">
                <div class="sport-header hockey-header">
                    <div class="period-info">
                        <div class="period">${attrs.quarter ? `${attrs.quarter}${this.getOrdinalSuffix(parseInt(attrs.quarter))} Period` : 'N/A'}</div>
                        <div class="clock">${attrs.clock || 'N/A'}</div>
                    </div>
                    <div class="last-play">${attrs.last_play || 'N/A'}</div>
                </div>
                <div class="stats-grid">
                    <div class="stat-row shots">
                        <div class="stat-label">Shots on Goal</div>
                        <div class="stat-value">${attrs.team_shots_on_target || '0'} - ${attrs.opponent_shots_on_target || '0'}</div>
                    </div>
                    <div class="stat-row venue">
                        <div class="stat-label">Venue</div>
                        <div class="stat-value">${attrs.venue || 'N/A'}</div>
                    </div>
                    <div class="stat-row location">
                        <div class="stat-label">Location</div>
                        <div class="stat-value">${attrs.location || 'N/A'}</div>
                    </div>
                    <div class="stat-row tv">
                        <div class="stat-label">TV Network</div>
                        <div class="stat-value">${attrs.tv_network || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Create football-specific stats
    createFootballStats(gameData) {
        const attrs = gameData.attributes;
        return `
            <div class="game-stats sport-football">
                <div class="sport-header football-header">
                    <div class="period-info">
                        <div class="period">${attrs.quarter ? `Q${attrs.quarter}` : 'N/A'}</div>
                        <div class="clock">${attrs.clock || 'N/A'}</div>
                    </div>
                    <div class="possession">${attrs.possession === attrs.team_id ? attrs.team_abbr : attrs.opponent_abbr}</div>
                </div>
                <div class="stats-grid">
                    <div class="stat-row down-distance">
                        <div class="stat-label">Down & Distance</div>
                        <div class="stat-value">${attrs.down_distance_text || 'N/A'}</div>
                    </div>
                    <div class="stat-row last-play">
                        <div class="stat-label">Last Play</div>
                        <div class="stat-value">${attrs.last_play || 'N/A'}</div>
                    </div>
                    <div class="stat-row venue">
                        <div class="stat-label">Venue</div>
                        <div class="stat-value">${attrs.venue || 'N/A'}</div>
                    </div>
                    <div class="stat-row tv">
                        <div class="stat-label">TV Network</div>
                        <div class="stat-value">${attrs.tv_network || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Create basketball-specific stats
    createBasketballStats(gameData) {
        const attrs = gameData.attributes;
        return `
            <div class="game-stats sport-basketball">
                <div class="sport-header basketball-header">
                    <div class="period-info">
                        <div class="period">${attrs.quarter ? `Q${attrs.quarter}` : 'N/A'}</div>
                        <div class="clock">${attrs.clock || 'N/A'}</div>
                    </div>
                    <div class="possession">${attrs.possession === attrs.team_id ? attrs.team_abbr : attrs.opponent_abbr}</div>
                </div>
                <div class="stats-grid">
                    <div class="stat-row timeout">
                        <div class="stat-label">Timeouts</div>
                        <div class="stat-value">${attrs.team_timeouts || 'N/A'} - ${attrs.opponent_timeouts || 'N/A'}</div>
                    </div>
                    <div class="stat-row last-play">
                        <div class="stat-label">Last Play</div>
                        <div class="stat-value">${attrs.last_play || 'N/A'}</div>
                    </div>
                    <div class="stat-row venue">
                        <div class="stat-label">Venue</div>
                        <div class="stat-value">${attrs.venue || 'N/A'}</div>
                    </div>
                    <div class="stat-row tv">
                        <div class="stat-label">TV Network</div>
                        <div class="stat-value">${attrs.tv_network || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Create baseball-specific stats
    createBaseballStats(gameData) {
        const attrs = gameData.attributes;
        return `
            <div class="game-stats sport-baseball">
                <div class="sport-header baseball-header">
                    <div class="period-info">
                        <div class="period">${attrs.quarter || 'N/A'}</div>
                        <div class="clock">${attrs.clock || 'N/A'}</div>
                    </div>
                    <div class="inning-info">${attrs.last_play || 'N/A'}</div>
                </div>
                <div class="stats-grid">
                    <div class="stat-row balls-strikes">
                        <div class="stat-label">Balls - Strikes</div>
                        <div class="stat-value">${attrs.balls || '0'} - ${attrs.strikes || '0'}</div>
                    </div>
                    <div class="stat-row outs">
                        <div class="stat-label">Outs</div>
                        <div class="stat-value">${attrs.outs || '0'}</div>
                    </div>
                    <div class="stat-row runners">
                        <div class="stat-label">On Base</div>
                        <div class="stat-value">${this.getRunnersOnBase(attrs)}</div>
                    </div>
                    <div class="stat-row venue">
                        <div class="stat-label">Venue</div>
                        <div class="stat-value">${attrs.venue || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Format soccer last play data for better display
    formatSoccerLastPlay(lastPlay) {
        if (!lastPlay || lastPlay === 'N/A' || lastPlay.includes('Entity not found')) {
            return '';
        }

        // Soccer data format: "45'+1' Yellow Card: Player (TEAM) 45'+2' Yellow Card: Player..."
        // Split by time markers to get individual events
        const events = lastPlay.split(/(?=\d+(?:\+\d+)?'\s+)/).filter(e => e.trim());

        if (events.length === 0) {
            return '';
        }

        let html = '';

        // Parse and display all events
        events.forEach(event => {
            const trimmedEvent = event.trim();

            // Parse format: "81' Yellow Card: Lamare Bogarde (AVL)"
            // Stop capturing at the next timestamp or end of string
            const eventMatch = trimmedEvent.match(/^(\d+(?:\+\d+)?')\s+([^:]+):\s*(.+?)(?=\s+\d+(?:\+\d+)?'|$)/);

            if (eventMatch) {
                const minute = eventMatch[1];
                const eventType = eventMatch[2].trim();
                const playerInfo = eventMatch[3].trim();

                html += `<div class="stat-row soccer-event">
                            <div class="stat-label">${eventType}</div>
                            <div class="stat-value"><span class="event-time">${minute}</span> ${playerInfo}</div>
                        </div>`;
            }
            // Skip events that don't match the expected format (like possession percentages)
        });

        return html;
    }

    // Create soccer-specific stats
    createSoccerStats(gameData) {
        const attrs = gameData.attributes;

        // Check if this is Arsenal - show special panel with league standings
        const gameScoreEntity = this.config.get('gameScore');
        if (gameScoreEntity === 'sensor.arsenal') {
            return this.createArsenalStats(gameData);
        }

        const formattedLastPlay = this.formatSoccerLastPlay(attrs.last_play);

        return `
            <div class="game-stats sport-soccer">
                <div class="sport-header soccer-header">
                    <div class="soccer-clock">${attrs.clock || 'N/A'}</div>
                </div>
                <div class="stats-grid">
                    <div class="stat-row shots">
                        <div class="stat-label">Shots on Target</div>
                        <div class="stat-value">${attrs.team_shots_on_target || '0'} - ${attrs.opponent_shots_on_target || '0'}</div>
                    </div>
                    <div class="stat-row venue">
                        <div class="stat-label">Venue</div>
                        <div class="stat-value">${attrs.venue || 'N/A'}</div>
                    </div>
                    <div class="stat-row tv">
                        <div class="stat-label">TV Network</div>
                        <div class="stat-value">${attrs.tv_network || 'N/A'}</div>
                    </div>
                </div>
                ${formattedLastPlay ? '<div class="section-title">Match Events</div>' : ''}
                <div class="soccer-events-container">
                    ${formattedLastPlay}
                </div>
            </div>
        `;
    }

    // Create generic stats for unknown sports
    createGenericStats(gameData) {
        const attrs = gameData.attributes;
        return `
            <div class="game-stats sport-generic">
                <div class="sport-header generic-header">
                    <div class="period-info">
                        <div class="period">${attrs.quarter || 'N/A'}</div>
                        <div class="clock">${attrs.clock || 'N/A'}</div>
                    </div>
                </div>
                <div class="stats-grid">
                    <div class="stat-row venue">
                        <div class="stat-label">Venue</div>
                        <div class="stat-value">${attrs.venue || 'N/A'}</div>
                    </div>
                    <div class="stat-row location">
                        <div class="stat-label">Location</div>
                        <div class="stat-value">${attrs.location || 'N/A'}</div>
                    </div>
                    <div class="stat-row tv">
                        <div class="stat-label">TV Network</div>
                        <div class="stat-value">${attrs.tv_network || 'N/A'}</div>
                    </div>
                    <div class="stat-row last-play">
                        <div class="stat-label">Last Play</div>
                        <div class="stat-value">${attrs.last_play || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Helper to get runners on base for baseball
    getRunnersOnBase(attrs) {
        const runners = [];
        if (attrs.on_first) runners.push('1B');
        if (attrs.on_second) runners.push('2B');
        if (attrs.on_third) runners.push('3B');
        return runners.length > 0 ? runners.join(', ') : 'None';
    }

    // Fetch Premier League standings from ESPN API
    async fetchPremierLeagueStandings() {
        try {
            const response = await fetch('https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings');
            if (!response.ok) {
                throw new Error(`ESPN API error: ${response.status}`);
            }
            const data = await response.json();

            // Navigate to the entries array
            const entries = data.children?.[0]?.standings?.entries || [];

            // Extract top 6 teams with their rank and points
            const top6 = entries.slice(0, 6).map(entry => {
                const stats = entry.stats || [];
                // Find points stat (name: "points")
                const pointsStat = stats.find(s => s.name === 'points');
                // Find rank stat (name: "rank")
                const rankStat = stats.find(s => s.name === 'rank');

                return {
                    rank: rankStat?.displayValue || entry.stats?.[10]?.displayValue || '?',
                    name: entry.team?.displayName || 'Unknown',
                    shortName: entry.team?.abbreviation || entry.team?.shortDisplayName || 'UNK',
                    logo: entry.team?.logos?.[0]?.href || '',
                    points: pointsStat?.displayValue || entry.stats?.[3]?.displayValue || '0'
                };
            });

            return top6;
        } catch (error) {
            console.error('Failed to fetch Premier League standings:', error);
            return null;
        }
    }

    // Create Arsenal-specific stats panel with league table
    createArsenalStats(gameData) {
        const attrs = gameData.attributes;

        // Start fetching standings asynchronously and update when ready
        this.fetchPremierLeagueStandings().then(standings => {
            if (standings) {
                this.updateArsenalStandingsDisplay(standings);
            }
        });

        // Return initial HTML with loading state for standings
        return `
            <div class="game-stats sport-soccer arsenal-special">
                <div class="sport-header soccer-header">
                    <div class="soccer-clock">${attrs.clock || 'N/A'}</div>
                </div>
                <div class="section-title">Premier League Top 6</div>
                <div id="arsenal-standings" class="league-standings">
                    <div class="standings-loading">Loading standings...</div>
                </div>
            </div>
        `;
    }

    // Update Arsenal standings display after fetch completes
    updateArsenalStandingsDisplay(standings) {
        const standingsContainer = document.getElementById('arsenal-standings');
        if (!standingsContainer) return;

        const standingsHtml = standings.map(team => `
            <div class="standings-row ${team.shortName === 'ARS' ? 'highlight-team' : ''}">
                <div class="standings-team">
                    ${team.logo ? `<img src="${team.logo}" alt="${team.shortName}" class="standings-logo">` : ''}
                    <span class="standings-name">${team.name}</span>
                </div>
                <div class="standings-points">${team.points}</div>
            </div>
        `).join('');

        standingsContainer.innerHTML = `
            <div class="standings-header">
                <div class="standings-team-header">Team</div>
                <div class="standings-points-header">Pts</div>
            </div>
            ${standingsHtml}
        `;
    }
}

// Initialize panel manager
window.panelManager = new PanelManager();