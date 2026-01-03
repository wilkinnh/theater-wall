// API endpoint for setting team externally via Home Assistant
// This updates the Home Assistant input_text.theater_wall_selected_entity

const https = require('https');

// Helper function to call Home Assistant API
function callHomeAssistantAPI(method, path, data, callback) {
    const haUrl = process.env.HOME_ASSISTANT_URL || process.env.HA_URL;
    const haToken = process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN;

    if (!haUrl || !haToken) {
        callback(new Error('Home Assistant URL or token not configured'));
        return;
    }

    // Parse the WebSocket URL to get the HTTP API URL
    // ws://homeassistant.local:8123/api/websocket -> http://homeassistant.local:8123
    const apiUrl = haUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://').replace(/\/api\/websocket$/, '');
    const url = new URL(apiUrl);

    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 8123),
        path: path,
        method: method,
        headers: {
            'Authorization': `Bearer ${haToken}`,
            'Content-Type': 'application/json'
        }
    };

    const protocol = url.protocol === 'https:' ? https : require('http');
    const req = protocol.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            try {
                const result = JSON.parse(responseData);
                callback(null, result);
            } catch (error) {
                callback(error);
            }
        });
    });

    req.on('error', (error) => {
        callback(error);
    });

    if (data) {
        req.write(JSON.stringify(data));
    }

    req.end();
}

// Set team endpoint - updates Home Assistant entity
function setTeam(req, res) {
    if (req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const teamData = JSON.parse(body);
                const entityId = teamData.entity_id;

                if (!entityId) {
                    res.writeHead(400, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'entity_id is required'
                    }));
                    return;
                }

                // Update Home Assistant input_text entity
                const serviceData = {
                    entity_id: 'input_text.theater_wall_selected_entity',
                    value: entityId
                };

                callHomeAssistantAPI('POST', '/api/services/input_text/set_value', serviceData, (error, result) => {
                    if (error) {
                        console.error('Failed to update Home Assistant entity:', error);
                        res.writeHead(500, {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.end(JSON.stringify({
                            success: false,
                            error: error.message
                        }));
                        return;
                    }

                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify({
                        success: true,
                        message: 'Team updated successfully in Home Assistant',
                        team: teamData,
                        ha_result: result
                    }));

                    console.log('Team updated in Home Assistant:', teamData);
                });

            } catch (error) {
                res.writeHead(400, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message
                }));
            }
        });
    } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method not allowed');
    }
}

// Get current team endpoint - reads from Home Assistant
function getCurrentTeam(req, res) {
    callHomeAssistantAPI('GET', '/api/states/input_text.theater_wall_selected_entity', null, (error, result) => {
        if (error) {
            console.error('Failed to get current team from Home Assistant:', error);
            res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
            return;
        }

        if (!result || !result.state) {
            res.writeHead(404, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ error: 'No team set' }));
            return;
        }

        const entityId = result.state;
        const teamData = {
            entity_id: entityId,
            name: entityId.replace(/_/g, ' ').replace(/\./g, ' - '),
            timestamp: result.last_changed
        };

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(teamData));
    });
}

module.exports = { setTeam, getCurrentTeam };