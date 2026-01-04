// Home Assistant WebSocket Client

class HomeAssistantClient {
    constructor() {
        this.ws = null;
        this.config = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.heartbeatInterval = null;
        this.messageId = 1;
        this.subscriptions = new Map();
        this.entities = new Map();
        this.eventListeners = new Map();
        
        this.init();
    }

    // Initialize the Home Assistant client
    init() {
        this.config = window.theaterWallConfig.getHomeAssistantConfig();
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Listen for configuration changes
        window.addEventListener('config-changed', () => {
            this.config = window.theaterWallConfig.getHomeAssistantConfig();
            if (this.isConnected) {
                this.disconnect();
                setTimeout(() => this.connect(), 1000);
            }
        });
    }

    // Connect to Home Assistant WebSocket
    async connect() {
        if (!this.config.url || !this.config.token) {
            this.updateConnectionStatus('disconnected', 'Configuration incomplete');
            return;
        }

        try {
            this.updateConnectionStatus('connecting', 'Connecting to Home Assistant...');
            
            // Create WebSocket connection
            this.ws = new WebSocket(this.config.url);
            
            // Setup WebSocket event handlers
            this.ws.onopen = () => this.handleOpen();
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onclose = (event) => this.handleClose(event);
            this.ws.onerror = (error) => this.handleError(error);
            
        } catch (error) {
            console.error('Failed to connect to Home Assistant:', error);
            this.updateConnectionStatus('disconnected', 'Connection failed');
            this.scheduleReconnect();
        }
    }

    // Handle WebSocket connection open
    handleOpen() {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Authenticate
        this.authenticate();
    }

    // Handle WebSocket messages
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'auth_required':
                    // Authentication required - this shouldn't happen with our flow
                    break;
                    
                case 'auth_ok':
                    this.updateConnectionStatus('connected', 'Connected to Home Assistant');
                    this.onConnected();
                    break;
                    
                case 'auth_invalid':
                    console.error('Authentication failed');
                    this.updateConnectionStatus('disconnected', 'Authentication failed');
                    this.disconnect();
                    break;
                    
                case 'result':
                    this.handleResult(message);
                    break;
                    
                case 'event':
                    this.handleEvent(message);
                    break;
                    
                default:
                    break;
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    // Handle WebSocket connection close
    handleClose(event) {
        this.isConnected = false;
        this.stopHeartbeat();
        this.updateConnectionStatus('disconnected', 'Disconnected');
        
        if (!event.wasClean) {
            this.scheduleReconnect();
        }
    }

    // Handle WebSocket errors
    handleError(error) {
        console.error('WebSocket error:', error);
        this.updateConnectionStatus('disconnected', 'Connection error');
    }

    // Authenticate with Home Assistant
    authenticate() {
        const authMessage = {
            type: 'auth',
            access_token: this.config.token
        };
        this.send(authMessage);
    }

    // Send message to Home Assistant
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
        }
    }

    // Send message with ID and return promise
    sendWithId(message) {
        return new Promise((resolve, reject) => {
            const id = this.messageId++;
            const messageWithId = { ...message, id };
            
            // Store the promise resolver
            this.subscriptions.set(id, { resolve, reject });
            
            // Set timeout
            setTimeout(() => {
                if (this.subscriptions.has(id)) {
                    this.subscriptions.delete(id);
                    reject(new Error('Message timeout'));
                }
            }, 10000);
            
            this.send(messageWithId);
        });
    }

    // Handle result messages
    handleResult(message) {
        const { id, success, result, error } = message;
        
        
        if (this.subscriptions.has(id)) {
            const { resolve, reject } = this.subscriptions.get(id);
            this.subscriptions.delete(id);
            
            if (success) {
                resolve(result);
            } else {
                console.error('❌ HA Request failed for ID:', id, 'Error:', error);
                const errorMessage = typeof error === 'object' ? JSON.stringify(error) : error;
                reject(new Error(errorMessage || 'Request failed'));
            }
        }
    }

    // Handle event messages
    handleEvent(message) {
        const { event } = message;
        
        // Debug: Log ALL state_changed events temporarily to see what's happening
        if (event.type === 'state_changed') {
            const gameScoreEntity = window.theaterWallConfig?.get('gameScore');
            const entityId = event.data?.entity_id;
            
            if (entityId === gameScoreEntity) {
            } else {
                // Log a few sample events to confirm WebSocket is working
                if (Math.random() < 0.01) { // Only log 1% of other events to reduce noise
                }
            }
            
            this.handleStateChanged(event.data);
        } else if (event.type === 'call_service') {
            // Handle service call events that might indicate attribute changes
            this.handleServiceCallEvent(event);
        } else if (event.type === 'automation_triggered') {
            // Handle automation triggered events
            this.handleAutomationTriggeredEvent(event);
        } else {
            // Handle other event types that might contain attribute changes
            this.handleGenericEvent(event);
        }
        
        // Emit to general event listeners
        this.emit('event', event);
    }

    // Handle state changed events
    handleStateChanged(data) {
        const { entity_id, new_state } = data;

        if (new_state) {
            this.entities.set(entity_id, new_state);
            this.emit('state-changed', { entity_id, state: new_state });
        }
    }

    // Handle service call events that might indicate attribute changes
    handleServiceCallEvent(event) {
        const gameScoreEntity = window.theaterWallConfig?.get('gameScore');
        
        // Check if this service call might affect our game score entity
        if (event.data && event.data.service_data && event.data.service_data.entity_id === gameScoreEntity) {
            
            // Schedule a refresh of the entity to catch attribute changes
            setTimeout(() => {
                this.refreshEntity(gameScoreEntity);
            }, 500); // Small delay to ensure the service call has completed
        }
    }

    // Handle automation triggered events
    handleAutomationTriggeredEvent(event) {
        const gameScoreEntity = window.theaterWallConfig?.get('gameScore');
        
        // Check if this automation might affect our game score entity
        if (event.data && event.data.entity_id === gameScoreEntity) {
            
            // Schedule a refresh of the entity to catch attribute changes
            setTimeout(() => {
                this.refreshEntity(gameScoreEntity);
            }, 500);
        }
    }

    // Handle generic events that might contain attribute changes
    handleGenericEvent(event) {
        const gameScoreEntity = window.theaterWallConfig?.get('gameScore');
        
        // Check if this event is related to our target entity
        if (event.data && (
            event.data.entity_id === gameScoreEntity ||
            (event.data.old_state && event.data.old_state.entity_id === gameScoreEntity) ||
            (event.data.new_state && event.data.new_state.entity_id === gameScoreEntity)
        )) {
            
            // Handle like a state change event
            if (event.data.new_state) {
                this.handleStateChanged(event.data);
            }
        }
    }

    // Refresh a specific entity to get current state and attributes
    async refreshEntity(entityId) {
        try {
            
            // Get current state
            const currentState = this.getEntityState(entityId);
            
            // Request fresh state from Home Assistant
            const states = await this.sendWithId({
                type: 'get_states'
            });
            
            const freshState = states.find(state => state.entity_id === entityId);
            
            if (freshState) {
                // Check if attributes have changed (even if state hasn't)
                if (currentState) {
                    const attributesChanged = this.haveAttributesChanged(currentState.attributes, freshState.attributes);
                    
                    if (attributesChanged) {
                        
                        // Update stored entity
                        this.entities.set(entityId, freshState);
                        
                        // Emit attribute change event
                        this.emit('attributes-changed', {
                            entity_id: entityId,
                            old_attributes: currentState.attributes,
                            new_attributes: freshState.attributes,
                            state: freshState
                        });
                        
                        // Also emit as state change for compatibility
                        this.emit('state-changed', { entity_id: entityId, state: freshState });
                    }
                } else {
                    // First time seeing this entity
                    this.entities.set(entityId, freshState);
                    this.emit('state-changed', { entity_id: entityId, state: freshState });
                }
            }
        } catch (error) {
            console.error('Failed to refresh entity:', entityId, error);
        }
    }

    // Check if attributes have changed between two attribute objects
    haveAttributesChanged(oldAttributes, newAttributes) {
        if (!oldAttributes && !newAttributes) return false;
        if (!oldAttributes || !newAttributes) return true;
        
        // Get all keys from both objects
        const allKeys = new Set([...Object.keys(oldAttributes), ...Object.keys(newAttributes)]);
        
        // Check each key for changes
        for (const key of allKeys) {
            const oldValue = oldAttributes[key];
            const newValue = newAttributes[key];
            
            // Skip last_updated and last_changed as they always change
            if (key === 'last_updated' || key === 'last_changed') continue;
            
            // Deep comparison for objects
            if (typeof oldValue === 'object' && typeof newValue === 'object') {
                if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                    return true;
                }
            } else if (oldValue !== newValue) {
                return true;
            }
        }
        
        return false;
    }

    // Called after successful authentication
    async onConnected() {
        try {
            // Get initial states
            await this.getStates();
            
            // Subscribe to state changes
            await this.subscribeToEvents();
            
            // Polling disabled - relying on WebSocket events only
            
            // Emit connected event
            this.emit('connected');
            
        } catch (error) {
            console.error('Failed to initialize connection:', error);
        }
    }

    // Get all states from Home Assistant
    async getStates() {
        try {
            const states = await this.sendWithId({
                type: 'get_states'
            });
            
            // Store entities
            states.forEach(state => {
                this.entities.set(state.entity_id, state);
            });
            
            this.emit('states-loaded', states);
            return states;
            
        } catch (error) {
            console.error('Failed to get states:', error);
            throw error;
        }
    }

    // Subscribe to state change events
    async subscribeToEvents() {
        try {
            const stateChangeResult = await this.sendWithId({
                type: 'subscribe_events',
                event_type: 'state_changed'
            });
            
            
            // Also subscribe to all events to catch attribute changes that don't trigger state changes
            const allEventsResult = await this.sendWithId({
                type: 'subscribe_events'
                // No event_type specified means subscribe to all events
            });
            
            
        } catch (error) {
            console.error('❌ Failed to subscribe to events:', error);
            throw error;
        }
    }

    // Note: Home Assistant WebSocket API doesn't support subscribing to specific entities
    // We subscribe to all state_changed events and filter client-side for better performance
    // We also subscribe to all events to catch attribute changes that don't trigger state changes

    // Call Home Assistant service
    async callService(domain, service, data = {}) {
        try {
            const result = await this.sendWithId({
                type: 'call_service',
                domain,
                service,
                service_data: data
            });
            
            return result;
            
        } catch (error) {
            console.error(`Failed to call service ${domain}.${service}:`, error);
            throw error;
        }
    }

    // Get entity state
    getEntityState(entityId) {
        return this.entities.get(entityId);
    }

    // Get all entities of a specific domain
    getEntitiesByDomain(domain) {
        const entities = [];
        for (const [entityId, state] of this.entities) {
            if (entityId.startsWith(domain + '.')) {
                entities.push({ entityId, state });
            }
        }
        return entities;
    }

    // Start heartbeat to keep connection alive
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Ping every 30 seconds
    }

    // Stop heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Schedule reconnection attempt
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * this.reconnectAttempts;
            
            
            setTimeout(() => {
                this.updateConnectionStatus('connecting', `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, delay);
        } else {
            this.updateConnectionStatus('disconnected', 'Max reconnection attempts reached');
            console.error('Max reconnection attempts reached');
        }
    }

    // Start targeted polling for attribute changes
    startAttributePolling() {
        const gameScoreEntity = window.theaterWallConfig?.get('gameScore');
        if (!gameScoreEntity) return;
        
        
        // Store the current state for comparison
        this.lastKnownAttributes = new Map();
        
        // Poll every 5 seconds for attribute changes (more frequent than general refresh)
        this.attributePollingInterval = setInterval(async () => {
            if (!this.isConnected) return;
            
            try {
                await this.checkForAttributeChanges(gameScoreEntity);
            } catch (error) {
                console.error('Error during attribute polling:', error);
            }
        }, 5000);
    }

    // Check for attribute changes on a specific entity
    async checkForAttributeChanges(entityId) {
        try {
            // Get current state from cache
            const currentState = this.getEntityState(entityId);
            
            // Request fresh state from Home Assistant
            const states = await this.sendWithId({
                type: 'get_states'
            });
            
            const freshState = states.find(state => state.entity_id === entityId);
            
            if (freshState && currentState) {
                const attributesChanged = this.haveAttributesChanged(currentState.attributes, freshState.attributes);
                
                if (attributesChanged) {
                    
                    // Update stored entity
                    this.entities.set(entityId, freshState);
                    
                    // Emit attribute change event
                    this.emit('attributes-changed', {
                        entity_id: entityId,
                        old_attributes: currentState.attributes,
                        new_attributes: freshState.attributes,
                        state: freshState
                    });
                    
                    // Also emit as state change for compatibility
                    this.emit('state-changed', { entity_id: entityId, state: freshState });
                }
            }
        } catch (error) {
            console.error('Failed to check for attribute changes:', error);
        }
    }

    // Disconnect from Home Assistant
    disconnect() {
        this.isConnected = false;
        this.stopHeartbeat();
        
        // Attribute polling disabled - no interval to clear
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        // Clear pending requests
        this.subscriptions.clear();
    }

    // Update connection status
    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        
        if (statusElement && statusText) {
            statusElement.className = `status-indicator ${status}`;
            statusText.textContent = message;
        }
        
        // Emit status change event
        this.emit('connection-status-changed', { status, message });
    }

    // Event emitter methods
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            entitiesCount: this.entities.size
        };
    }

    // Reconnect manually
    reconnect() {
        this.disconnect();
        this.reconnectAttempts = 0;
        this.connect();
    }

    // Test connection
    async testConnection() {
        if (!this.isConnected) {
            throw new Error('Not connected to Home Assistant');
        }
        
        try {
            await this.sendWithId({ type: 'ping' });
            return true;
        } catch (error) {
            throw new Error('Connection test failed');
        }
    }
}

// Initialize Home Assistant client
window.homeAssistantClient = new HomeAssistantClient();