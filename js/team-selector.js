// Team/Entity Selector System for External Control

class TeamSelector {
    constructor() {
        this.currentTeam = null;
        this.config = null;
        this.panels = null;
        this.watchInterval = null;
        this.lastConfigHash = null;
        this.pollingInterval = null;
        this.lastEntityValue = null;

        this.init();
    }

    // Initialize the team selector
    init() {
        this.config = window.theaterWallConfig;
        this.panels = window.panelManager;
        
        // Start watching for external changes
        this.startExternalWatch();
        
        // Setup keyboard shortcuts for team selection
        this.setupKeyboardShortcuts();
        
        // Load initial team
        this.loadCurrentTeam();
    }

    // Start watching for external configuration changes
    startExternalWatch() {
        // Watch localStorage changes
        window.addEventListener('storage', (event) => {
            if (event.key === 'theater-wall-selected-team') {
                this.handleExternalTeamChange(event.newValue);
            }
        });

        // Subscribe to Home Assistant entity changes for the selected entity input
        this.subscribeToEntityChanges();

        // Start polling as a fallback (since WebSocket events don't work for input_text entities)
        this.startPolling();
    }

    // Subscribe to Home Assistant entity state changes
    subscribeToEntityChanges() {
        // Wait for Home Assistant client to be ready
        const setupSubscription = () => {
            const haClient = window.homeAssistantClient;
            if (!haClient) {
                setTimeout(setupSubscription, 1000);
                return;
            }

            // Subscribe to state changes for the entity selector input
            const stateChangedHandler = (data) => {
                if (data.entity_id === 'input_text.theater_wall_selected_entity') {
                    const selectedEntityId = data.state?.state;

                    if (selectedEntityId) {
                        // Create team data from the entity ID
                        const teamData = {
                            entity_id: selectedEntityId,
                            name: this.formatEntityName(selectedEntityId)
                        };
                        this.handleExternalTeamChange(teamData);
                    }
                }
            };

            haClient.on('state-changed', stateChangedHandler);

            // Also listen for when Home Assistant connects/reconnects to load initial value
            haClient.on('connected', async () => {
                await this.loadInitialEntityFromHA();
            });

            // If already connected, load initial value now
            if (haClient.isConnected) {
                this.loadInitialEntityFromHA();
            }
        };

        setupSubscription();
    }

    // Start polling the entity for changes (fallback since WebSocket events don't work for input_text)
    startPolling() {
        // Poll every 2 seconds
        const pollInterval = 2000;

        this.pollingInterval = setInterval(() => {
            this.checkEntityForChanges();
        }, pollInterval);

        // Do an immediate check
        this.checkEntityForChanges();
    }

    // Check if the entity value has changed
    async checkEntityForChanges() {
        try {
            const haClient = window.homeAssistantClient;
            if (!haClient || !haClient.isConnected) {
                return;
            }

            // CRITICAL: Refresh states from Home Assistant to get the latest value
            // The cached entity state is stale, so we need to fetch fresh data
            await haClient.getStates();

            const entityState = haClient.getEntityState('input_text.theater_wall_selected_entity');
            if (!entityState) {
                return;
            }

            const currentValue = entityState.state;

            // Check if value has changed
            if (this.lastEntityValue !== null && this.lastEntityValue !== currentValue) {
                // Create team data from the entity ID
                const teamData = {
                    entity_id: currentValue,
                    name: this.formatEntityName(currentValue)
                };

                this.handleExternalTeamChange(teamData);
            }

            // Update last known value
            this.lastEntityValue = currentValue;

        } catch (error) {
            console.error('🔄 Polling error:', error);
        }
    }

    // Load the initial entity selection from Home Assistant
    async loadInitialEntityFromHA() {
        try {
            const haClient = window.homeAssistantClient;
            if (!haClient || !haClient.isConnected) {
                return;
            }

            const entityState = haClient.getEntityState('input_text.theater_wall_selected_entity');
            if (entityState && entityState.state) {
                const selectedEntityId = entityState.state;

                const teamData = {
                    entity_id: selectedEntityId,
                    name: this.formatEntityName(selectedEntityId)
                };

                // Set the initial value for polling comparison
                this.lastEntityValue = selectedEntityId;

                // Only set if different from current
                if (this.currentTeam?.entity_id !== selectedEntityId) {
                    this.handleExternalTeamChange(teamData);
                }
            }
        } catch (error) {
            console.error('Team selector: Failed to load initial entity from Home Assistant:', error);
        }
    }

    // Handle external team change
    handleExternalTeamChange(teamData) {
        if (!teamData) return;

        let newTeam;
        if (typeof teamData === 'string') {
            newTeam = { entity_id: teamData, name: this.formatEntityName(teamData) };
        } else if (teamData.name && teamData.entity_id) {
            // API response format: { name: "Lakers", entity_id: "sensor.lakers_score" }
            newTeam = teamData;
        } else if (teamData.team) {
            // Fallback for nested format
            newTeam = teamData.team;
        } else {
            return;
        }

        // Always update if it's an external change, even if entity_id matches
        // This ensures data is refreshed properly
        const isDifferentTeam = this.currentTeam?.entity_id !== newTeam.entity_id;

        if (isDifferentTeam) {
            this.setTeam(newTeam, true); // Force update
        }
    }

    // Set the current team
    setTeam(team, forceUpdate = false) {
        if (!team || !team.entity_id) {
            return;
        }

        const isDifferentTeam = this.currentTeam?.entity_id !== team.entity_id;

        this.currentTeam = team;

        // Update localStorage
        localStorage.setItem('theater-wall-selected-team', JSON.stringify(team));

        // Update Home Assistant entity to reflect the selection
        this.updateHomeAssistantEntity(team.entity_id);

        // Update the global configuration to use the new entity
        if (this.config) {
            this.config.config.gameScore = team.entity_id;

            // Update sensors array to include the team entity
            if (!this.config.config.entities.sensors.includes(team.entity_id)) {
                this.config.config.entities.sensors = [team.entity_id];
            }
        }

        // Always update display and reload entities for external changes
        if (forceUpdate || isDifferentTeam) {
            // CRITICAL: Fetch the actual game data for the new entity
            if (this.panels && this.panels.homeAssistant && this.panels.homeAssistant.isConnected) {
                // Get the current state of the new game entity
                const gameState = this.panels.homeAssistant.getEntityState(team.entity_id);

                if (gameState) {
                    // Immediately display the game data
                    this.panels.displayGameScore(gameState);
                } else {
                    // Fetch fresh states to get the new entity
                    this.panels.homeAssistant.getStates().then(states => {
                        const freshGameState = this.panels.homeAssistant.getEntityState(team.entity_id);

                        if (freshGameState) {
                            this.panels.displayGameScore(freshGameState);
                        } else {
                            // Display with sample data
                            this.panels.loadGameScore(team.entity_id);
                        }
                    }).catch(error => {
                        this.panels.loadGameScore(team.entity_id);
                    });
                }
            } else {
                if (this.panels) {
                    this.panels.loadGameScore(team.entity_id);
                }
            }
        }

        // Show notification
        this.showTeamNotification(team);
    }

    // Schedule a retry to ensure team data loads properly
    scheduleTeamDataRetry() {
        // Clear any existing retry timer
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
        }

        // Schedule retry in 2 seconds
        this.retryTimer = setTimeout(() => {
            // Check if the team entity is displayed
            const teamElement = document.querySelector(`[id*="${this.currentTeam.entity_id.replace(/\./g, '-')}"]`);
            if (!teamElement) {
                if (this.panels) {
                    this.panels.loadEntities();
                }
            }
        }, 2000);
    }

    // Update the display with current team data
    updateTeamDisplay() {
        if (!this.currentTeam || !this.panels) {
            return;
        }

        // Clear all panels first
        this.panels.clearAllPanels();

        // Get team entity data from Home Assistant
        let entityState = null;
        if (this.panels.homeAssistant) {
            entityState = this.panels.homeAssistant.getEntityState(this.currentTeam.entity_id);
        }

        if (entityState) {
            // Display team in center panel
            this.panels.createEntityElement('controls', this.currentTeam.entity_id, entityState);
        } else {
            // Create placeholder for team
            const teamElement = document.createElement('div');
            teamElement.className = 'entity-card team-card';
            teamElement.innerHTML = `
                <div class="entity-header">
                    <span class="entity-name">-</span>
                    <span class="entity-icon">🏆</span>
                </div>
                <div class="entity-content">
                    <span class="entity-state">Loading team data...</span>
                </div>
            `;

            const controlsContainer = document.getElementById('controls-container');
            if (controlsContainer) {
                controlsContainer.appendChild(teamElement);
            }
        }

        // Subscribe to entity updates if connected to Home Assistant
        if (this.panels.homeAssistant && this.panels.homeAssistant.isConnected) {
            try {
                this.panels.homeAssistant.send({
                    type: 'subscribe_entities',
                    entity_ids: [this.currentTeam.entity_id]
                });
            } catch (error) {
                console.error('Team selector: Failed to subscribe to entity updates:', error);
            }
        }
    }

    // Load current team from localStorage
    loadCurrentTeam() {
        try {
            const savedTeam = localStorage.getItem('theater-wall-selected-team');
            if (savedTeam) {
                const team = JSON.parse(savedTeam);
                this.setTeam(team);
            }
        } catch (error) {
            console.warn('Team selector: Failed to load saved team', error);
        }
    }

    // Setup keyboard shortcuts for team selection
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Number keys 1-9 for quick team selection
            if (event.key >= '1' && event.key <= '9') {
                const teamIndex = parseInt(event.key) - 1;
                this.selectTeamByIndex(teamIndex);
            }
            
            // T key to show team selector
            if (event.key === 't' || event.key === 'T') {
                this.showTeamSelector();
            }
        });
    }

    // Select team by index (for keyboard shortcuts)
    selectTeamByIndex(index) {
        const teams = this.getAvailableTeams();
        if (index < teams.length) {
            this.setTeam(teams[index]);
        }
    }

    // Get available teams from configuration
    getAvailableTeams() {
        // Return common sports entities or from config
        return [
            { entity_id: 'sensor.lakers_score', name: 'Lakers' },
            { entity_id: 'sensor.celtics_score', name: 'Celtics' },
            { entity_id: 'sensor.warriors_score', name: 'Warriors' },
            { entity_id: 'sensor.heat_score', name: 'Heat' },
            { entity_id: 'sensor.lakers_game_status', name: 'Lakers Game' }
        ];
    }

    // Show team selector UI
    showTeamSelector() {
        const teams = this.getAvailableTeams();
        
        const selector = document.createElement('div');
        selector.className = 'team-selector';
        selector.innerHTML = `
            <h3>Select Team</h3>
            <div class="team-list">
                ${teams.map((team, index) => `
                    <div class="team-item ${this.currentTeam?.entity_id === team.entity_id ? 'selected' : ''}" 
                         data-team="${JSON.stringify(team)}">
                        <span class="team-key">${index + 1}</span>
                        <span class="team-name">${team.name}</span>
                        <span class="team-entity">${team.entity_id}</span>
                    </div>
                `).join('')}
            </div>
            <button class="team-selector-close">Close</button>
        `;

        // Add styles
        Object.assign(selector.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(20, 20, 30, 0.95)',
            border: '2px solid #333',
            borderRadius: '12px',
            padding: '30px',
            zIndex: '4000',
            backdropFilter: 'blur(20px)',
            minWidth: '400px',
            maxHeight: '80vh',
            overflowY: 'auto'
        });

        document.body.appendChild(selector);

        // Add event listeners
        selector.querySelectorAll('.team-item').forEach(item => {
            item.addEventListener('click', () => {
                const team = JSON.parse(item.dataset.team);
                this.setTeam(team);
                document.body.removeChild(selector);
            });
        });

        selector.querySelector('.team-selector-close').addEventListener('click', () => {
            document.body.removeChild(selector);
        });

        // Close on outside click
        selector.addEventListener('click', (event) => {
            if (event.target === selector) {
                document.body.removeChild(selector);
            }
        });
    }

    // Show team change notification
    showTeamNotification(team) {
        if (!this.config) return;
        
        const teamName = team.name || this.formatEntityName(team.entity_id);
        const message = `Team changed to: ${teamName}`;
        
        // Show the notification
        this.config.showNotification(message, 'info');
        
        // Also show a secondary notification about data loading
        setTimeout(() => {
            this.config.showNotification('Loading team data...', 'info');
        }, 500);
        
        // And a success notification when data should be loaded
        setTimeout(() => {
            this.config.showNotification('Team data updated', 'success');
        }, 2000);
    }

    // Update Home Assistant entity with the selected entity ID
    async updateHomeAssistantEntity(entityId) {
        try {
            const haClient = window.homeAssistantClient;
            if (!haClient || !haClient.isConnected) {
                return;
            }

            // Call the input_text.set_value service to update the entity
            await haClient.callService('input_text', 'set_value', {
                entity_id: 'input_text.theater_wall_selected_entity',
                value: entityId
            });
        } catch (error) {
            console.error('Team selector: Failed to update Home Assistant entity:', error);
        }
    }

    // Format entity name
    formatEntityName(entityId) {
        return entityId.replace(/_/g, ' ').replace(/\./g, ' - ');
    }

    // Get current team
    getCurrentTeam() {
        return this.currentTeam;
    }

    // Clear current team
    clearTeam() {
        this.currentTeam = null;
        localStorage.removeItem('theater-wall-selected-team');
        this.panels.clearAllPanels();
        this.config.showNotification('Team cleared', 'info');
    }

    // Cleanup
    destroy() {
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
        }
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
        }
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }
}

// Initialize team selector
window.teamSelector = new TeamSelector();