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
            console.log('PanelManager: HA connected, loading entities');
            this.loadEntities();
        });
        
        this.homeAssistant.on('states-loaded', (states) => {
            console.log('PanelManager: States loaded:', states.length, 'entities');
            
            // Check if our game score entity exists
            const gameScoreEntity = this.config.get('gameScore');
            const gameScoreState = states.find(s => s.entity_id === gameScoreEntity);
            console.log('Game score entity check:', {
                entityId: gameScoreEntity,
                found: !!gameScoreState,
                state: gameScoreState
            });
            
            // Log the current game data
            if (gameScoreState) {
                console.log('Current game data:', {
                    teamScore: gameScoreState.attributes?.team_score,
                    opponentScore: gameScoreState.attributes?.opponent_score,
                    quarter: gameScoreState.attributes?.quarter,
                    clock: gameScoreState.attributes?.clock,
                    lastUpdate: gameScoreState.attributes?.last_update
                });
            }
            
            this.displayEntities(states);
        });
        
        this.homeAssistant.on('state-changed', (data) => {
            // Only log game score state changes
            if (data.entity_id === this.config.get('gameScore')) {
                console.log('PanelManager: Game score update received:', data);
            }
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
        const gameScoreEntity = this.config.get('gameScore');
        
        // Clear existing entities
        this.clearAllPanels();
        
        // Load game score if configured
        if (gameScoreEntity) {
            console.log('Loading game score entity:', gameScoreEntity);
            this.loadGameScore(gameScoreEntity);
        } else {
            // Load regular entities if no game score configured
            this.loadPanelEntities('sensors', entitiesConfig.sensors);
            this.loadPanelEntities('controls', entitiesConfig.controls);
            this.loadPanelEntities('media', entitiesConfig.media);
        }
    }

    // Load game score display
    loadGameScore(gameScoreEntity) {
        const state = this.homeAssistant.getEntityState(gameScoreEntity);
        
        if (state && state.attributes) {
            this.displayGameScore(state);
            // Create a hidden entity element for real-time updates (don't add to panel)
            this.createHiddenEntityElement(gameScoreEntity, state);
        } else {
            // Create sample game data for testing
            const sampleGameData = this.createSampleGameData();
            this.displayGameScore(sampleGameData);
            // Create a hidden entity element for real-time updates (don't add to panel)
            this.createHiddenEntityElement(gameScoreEntity, sampleGameData);
        }
    }

    // Display game score in panels
    displayGameScore(gameData) {
        console.log('🎮 displayGameScore called with:', gameData);
        const attrs = gameData.attributes;
        
        console.log('🎮 Game data attributes:', attrs);
        console.log('🎮 ALWAYS updating 3-panel display');
        
        // ALWAYS update the 3-panel display (this is what users see)
        // Left panel - Opponent
        const leftContainer = this.containers.sensors;
        console.log('🎮 Left container:', leftContainer);
        if (leftContainer) {
            console.log('🎮 Updating left panel with opponent data');
            leftContainer.innerHTML = `
                <div class="game-score-display team-${attrs.opponent_abbr.toLowerCase()}">
                    <div class="team-abbr">${attrs.opponent_abbr}</div>
                    <div class="team-record">${attrs.opponent_record}</div>
                    <div class="team-score">${attrs.opponent_score}</div>
                </div>
            `;
        }
        
        // Center panel - Game stats
        const centerContainer = this.containers.controls;
        console.log('🎮 Center container:', centerContainer);
        if (centerContainer) {
            console.log('🎮 Updating center panel with game stats');
            // Safely handle quarter value
            let quarterText = 'Game Info';
            if (attrs.quarter) {
                const quarterStr = String(attrs.quarter);
                const quarterNum = quarterStr.replace(/\D/g, '');
                if (quarterNum) {
                    quarterText = `${quarterNum}${this.getOrdinalSuffix(parseInt(quarterNum))} Quarter`;
                }
            }
            
            centerContainer.innerHTML = `
                <div class="game-stats">
                    <div class="game-info">
                        <div class="game-time">${attrs.clock || 'N/A'}</div>
                        <div class="game-quarter">${quarterText}</div>
                        <div class="game-venue">${attrs.venue || 'N/A'}</div>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Location</span>
                        <span class="stat-value">${attrs.location || 'N/A'}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">TV Network</span>
                        <span class="stat-value">${attrs.tv_network || 'N/A'}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Possession</span>
                        <span class="stat-value">${attrs.possession === attrs.team_id ? attrs.team_abbr : attrs.opponent_abbr}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Down & Distance</span>
                        <span class="stat-value">${attrs.down_distance_text || 'N/A'}</span>
                    </div>
                    ${attrs.last_play ? `<div class="last-play">${attrs.last_play}</div>` : ''}
                </div>
            `;
        }
        
        // Right panel - Selected team
        const rightContainer = this.containers.media;
        console.log('🎮 Right container:', rightContainer);
        if (rightContainer) {
            console.log('🎮 Updating right panel with team data');
            rightContainer.innerHTML = `
                <div class="game-score-display team-${(attrs.team_abbr || '').toLowerCase()}">
                    <div class="team-abbr">${attrs.team_abbr || 'N/A'}</div>
                    <div class="team-record">${attrs.team_record || '0-0'}</div>
                    <div class="team-score">${attrs.team_score || '0'}</div>
                </div>
            `;
        }
        
        console.log('🎮 displayGameScore completed - 3-panel display updated');
    }

    // Create sample game data for testing
    createSampleGameData() {
        return {
            entity_id: 'sensor.atlanta_falcons',
            state: 'active',
            attributes: {
                attribution: 'Data provided by ESPN',
                sport: 'football',
                sport_path: 'football',
                league: 'NFL',
                league_path: 'nfl',
                league_logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
                season: 'regular-season',
                team_abbr: 'ATL',
                opponent_abbr: 'SF',
                event_name: 'ATL @ SF',
                event_url: 'https://www.espn.com/nfl/game?gameId=401772924',
                date: '2025-10-20T00:20Z',
                kickoff_in: '46 minutes ago',
                series_summary: null,
                venue: "Levi's Stadium",
                location: 'Santa Clara, CA, USA',
                tv_network: 'NBC',
                odds: null,
                overunder: null,
                team_name: 'Falcons',
                team_long_name: 'Atlanta Falcons',
                team_id: '1',
                team_record: '3-2',
                team_rank: null,
                team_conference_id: null,
                team_homeaway: 'away',
                team_logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/atl.png',
                team_url: 'https://www.espn.com/nfl/team/_/name/atl/atlanta-falcons',
                team_colors: ['#a71930', '#000000'],
                team_score: '3',
                team_win_probability: 0.6305000000000001,
                team_winner: null,
                team_timeouts: 3,
                opponent_name: '49ers',
                opponent_long_name: 'San Francisco 49ers',
                opponent_id: '25',
                opponent_record: '4-2',
                opponent_rank: null,
                opponent_conference_id: null,
                opponent_homeaway: 'home',
                opponent_logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/sf.png',
                opponent_url: 'https://www.espn.com/nfl/team/_/name/sf/san-francisco-49ers',
                opponent_colors: ['#aa0000', '#b3995d'],
                opponent_score: '0',
                opponent_win_probability: 0.3695,
                opponent_winner: null,
                opponent_timeouts: 3,
                quarter: '2',
                clock: '8:58 - 2nd',
                possession: '1',
                last_play: '(Shotgun) M.Penix pass incomplete short right to B.Robinson.',
                down_distance_text: '2nd & 10 at ATL 49',
                outs: null,
                balls: null,
                strikes: null,
                on_first: null,
                on_second: null,
                on_third: null,
                team_shots_on_target: null,
                team_total_shots: null,
                opponent_shots_on_target: null,
                opponent_total_shots: null,
                team_sets_won: null,
                opponent_sets_won: null,
                last_update: '2025-10-19 21:06:38-04:00',
                api_message: 'Cached data',
                api_url: 'http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?lang=en&limit=50&dates=20251018-20251024',
                icon: 'mdi:football',
                friendly_name: 'atlanta_falcons'
            },
            last_updated: new Date().toISOString()
        };
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

    // Create hidden entity element for real-time updates (doesn't add to panel)
    createHiddenEntityElement(entityId, state) {
        console.log('Creating hidden entity element for:', entityId);
        
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
        console.log('Hidden entity element created and stored');
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
        // Only process updates for entities we care about
        const gameScoreEntity = this.config.get('gameScore');
        if (entityId !== gameScoreEntity) {
            return;
        }
        
        console.log('updateEntity called:', entityId, state);
        
        const element = this.entityElements.get(entityId);
        if (!element) {
            console.log('No element found for entity:', entityId);
            return;
        }
        
        console.log('Updating element for:', entityId);
        
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
        
        // Display sample data if not connected to Home Assistant and no game score configured
        if (!this.homeAssistant.isConnected && !this.config.get('gameScore')) {
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