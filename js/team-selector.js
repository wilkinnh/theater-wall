// Team/Entity Selector System for External Control

class TeamSelector {
    constructor() {
        this.currentTeam = null;
        this.config = null;
        this.panels = null;
        this.watchInterval = null;
        this.lastConfigHash = null;
        
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

        // Watch for file-based configuration changes
        this.watchInterval = setInterval(() => {
            this.checkExternalConfig();
        }, 2000); // Check every 2 seconds

        console.log('Team selector: Started watching for external changes');
    }

    // Check for external configuration file changes
    async checkExternalConfig() {
        try {
            // Try to fetch external team configuration
            const response = await fetch('/api/current-team');
            if (response.ok) {
                const teamData = await response.json();
                const configHash = JSON.stringify(teamData);
                
                if (configHash !== this.lastConfigHash) {
                    this.lastConfigHash = configHash;
                    console.log('Team selector: API response received:', teamData);
                    this.handleExternalTeamChange(teamData);
                }
            }
        } catch (error) {
            // Try alternative endpoint
            try {
                const response = await fetch('/team-config.json');
                if (response.ok) {
                    const teamData = await response.json();
                    const configHash = JSON.stringify(teamData);
                    
                    if (configHash !== this.lastConfigHash) {
                        this.lastConfigHash = configHash;
                        this.handleExternalTeamChange(teamData.team);
                    }
                }
            } catch (fallbackError) {
                // No external config available, that's ok
            }
        }
    }

    // Handle external team change
    handleExternalTeamChange(teamData) {
        if (!teamData) return;

        console.log('Team selector: External team change detected', teamData);
        console.log('Team selector: Current team:', this.currentTeam);
        
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
            console.warn('Team selector: Unknown team data format', teamData);
            return;
        }

        // Always update if it's an external change, even if entity_id matches
        // This ensures data is refreshed properly
        const isDifferentTeam = this.currentTeam?.entity_id !== newTeam.entity_id;
        const isExternalChange = true; // This method is only called for external changes
        
        if (isDifferentTeam || isExternalChange) {
            console.log('Team selector: Setting new team (different:', isDifferentTeam, ', external:', isExternalChange, ')', newTeam);
            this.setTeam(newTeam, true); // Force update
        } else {
            console.log('Team selector: Team unchanged, skipping update');
        }
    }

    // Set the current team
    setTeam(team, forceUpdate = false) {
        if (!team || !team.entity_id) {
            console.warn('Team selector: Invalid team data', team);
            return;
        }

        const isDifferentTeam = this.currentTeam?.entity_id !== team.entity_id;
        
        this.currentTeam = team;
        
        // Update localStorage
        localStorage.setItem('theater-wall-selected-team', JSON.stringify(team));
        
        // Update the global configuration to use the new entity
        if (this.config) {
            this.config.config.gameScore = team.entity_id;
            
            // Update sensors array to include the team entity
            if (!this.config.config.entities.sensors.includes(team.entity_id)) {
                this.config.config.entities.sensors = [team.entity_id];
            }
            
            console.log('Team selector: Updated config gameScore to:', team.entity_id);
        }
        
        // Always update display and reload entities for external changes
        if (forceUpdate || isDifferentTeam) {
            console.log('Team selector: Updating display and reloading entities (force:', forceUpdate, ', different:', isDifferentTeam, ')');
            
            // Update display
            this.updateTeamDisplay();
            
            // Reload all entities to show the new team data
            if (this.panels) {
                console.log('Team selector: Reloading entities for new team');
                this.panels.loadEntities();
            }
        }
        
        // Show notification
        this.showTeamNotification(team);
        
        console.log('Team selector: Team set to', team, '(force:', forceUpdate, ')');
    }

    // Update the display with current team data
    updateTeamDisplay() {
        if (!this.currentTeam || !this.panels) return;

        // Clear all panels first
        this.panels.clearAllPanels();

        // Get team entity data from Home Assistant
        const entityState = this.panels.homeAssistant.getEntityState(this.currentTeam.entity_id);
        
        if (entityState) {
            // Display team in center panel
            this.panels.createEntityElement('controls', this.currentTeam.entity_id, entityState);
        } else {
            // Create placeholder for team
            const teamElement = document.createElement('div');
            teamElement.className = 'entity-card team-card';
            teamElement.innerHTML = `
                <div class="entity-header">
                    <span class="entity-name">${this.currentTeam.name || this.formatEntityName(this.currentTeam.entity_id)}</span>
                    <span class="entity-icon">🏆</span>
                </div>
                <div class="entity-content">
                    <span class="entity-state">Loading...</span>
                </div>
            `;
            
            const controlsContainer = document.getElementById('controls-container');
            if (controlsContainer) {
                controlsContainer.appendChild(teamElement);
            }
        }

        // Subscribe to entity updates if connected to Home Assistant
        if (this.panels.homeAssistant.isConnected) {
            this.panels.homeAssistant.send({
                type: 'subscribe_entities',
                entity_ids: [this.currentTeam.entity_id]
            });
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
        
        const message = `Team: ${team.name || this.formatEntityName(team.entity_id)}`;
        this.config.showNotification(message, 'info');
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
    }
}

// Initialize team selector
window.teamSelector = new TeamSelector();