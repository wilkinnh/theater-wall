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
            console.warn('Home Assistant configuration incomplete');
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
        console.log('Connected to Home Assistant WebSocket');
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
                    console.warn('Authentication required unexpectedly');
                    break;
                    
                case 'auth_ok':
                    console.log('Authentication successful');
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
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    // Handle WebSocket connection close
    handleClose(event) {
        console.log('WebSocket connection closed:', event.code, event.reason);
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
            console.warn('WebSocket not connected, cannot send message:', message);
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
                reject(new Error(error || 'Request failed'));
            }
        }
    }

    // Handle event messages
    handleEvent(message) {
        const { event } = message;
        
        // Handle state changed events
        if (event.type === 'state_changed') {
            this.handleStateChanged(event.data);
        }
        
        // Emit to general event listeners
        this.emit('event', event);
    }

    // Handle state changed events
    handleStateChanged(data) {
        const { entity_id, new_state } = data;
        
        // Only log state changes for entities we care about (game score)
        if (entity_id === 'sensor.carolina_hurricanes') {
            console.log('Game score state changed:', { entity_id, new_state });
        }
        
        if (new_state) {
            this.entities.set(entity_id, new_state);
            this.emit('state-changed', { entity_id, state: new_state });
        }
    }

    // Called after successful authentication
    async onConnected() {
        try {
            // Get initial states
            await this.getStates();
            
            // Subscribe to state changes
            await this.subscribeToEvents();
            
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
            await this.sendWithId({
                type: 'subscribe_events',
                event_type: 'state_changed'
            });
            
            console.log('Subscribed to state change events');
            
        } catch (error) {
            console.error('Failed to subscribe to events:', error);
            throw error;
        }
    }

    // Call Home Assistant service
    async callService(domain, service, data = {}) {
        try {
            const result = await this.sendWithId({
                type: 'call_service',
                domain,
                service,
                service_data: data
            });
            
            console.log(`Service ${domain}.${service} called successfully`);
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
            
            console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
            
            setTimeout(() => {
                this.updateConnectionStatus('connecting', `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, delay);
        } else {
            this.updateConnectionStatus('disconnected', 'Max reconnection attempts reached');
            console.error('Max reconnection attempts reached');
        }
    }

    // Disconnect from Home Assistant
    disconnect() {
        this.isConnected = false;
        this.stopHeartbeat();
        
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