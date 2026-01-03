#!/usr/bin/env node

// External script to change the team on the theater wall display
// Usage: node scripts/change-team.js "Lakers" "sensor.lakers_score"
// This script updates the Home Assistant input_text.theater_wall_selected_entity

const http = require('http');

// Configuration
const THEATER_WALL_URL = 'http://localhost:8000';

function setTeam(teamName, entityId) {
    const teamData = {
        name: teamName,
        entity_id: entityId,
        timestamp: new Date().toISOString()
    };

    console.log(`🔄 Setting team: ${teamName} (${entityId})`);
    console.log(`🔄 This will update Home Assistant entity: input_text.theater_wall_selected_entity`);

    // HTTP request to API - which will update Home Assistant
    const data = JSON.stringify(teamData);

    const options = {
        hostname: 'localhost',
        port: 8000,
        path: '/api/set-team',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
            body += chunk;
        });

        res.on('end', () => {
            try {
                const response = JSON.parse(body);
                if (response.success) {
                    console.log(`✅ Team updated via Home Assistant: ${teamName}`);
                    console.log(`✅ Entity ID: ${entityId}`);
                    if (response.ha_result) {
                        console.log(`✅ Home Assistant response:`, response.ha_result);
                    }
                } else {
                    console.log(`❌ API error: ${response.error || 'Unknown error'}`);
                }
            } catch (error) {
                console.log(`⚠️  API response parsing failed: ${error.message}`);
                console.log(`Response body: ${body}`);
            }
        });
    });

    req.on('error', (error) => {
        console.log(`❌ API request failed: ${error.message}`);
        console.log(`ℹ️  Make sure the server is running: npm start`);
        console.log(`ℹ️  And Home Assistant connection is configured in .env`);
    });

    req.write(data);
    req.end();
}

function getCurrentTeam() {
    console.log(`🔄 Fetching current team from Home Assistant...`);

    const options = {
        hostname: 'localhost',
        port: 8000,
        path: '/api/current-team',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
            body += chunk;
        });

        res.on('end', () => {
            try {
                const teamData = JSON.parse(body);
                if (teamData.error) {
                    console.log(`⚠️  ${teamData.error}`);
                } else {
                    console.log(`Current team: ${teamData.name} (${teamData.entity_id})`);
                    console.log(`Last updated: ${teamData.timestamp}`);
                }
            } catch (error) {
                console.error(`Failed to parse current team: ${error.message}`);
            }
        });
    });

    req.on('error', (error) => {
        console.error(`Failed to get current team: ${error.message}`);
        console.log(`ℹ️  Make sure the server is running: npm start`);
    });

    req.end();
}

function showUsage() {
    console.log(`
Usage: node scripts/change-team.js <command> [options]

Commands:
  set <team-name> <entity-id>    Set the current team
  get                            Get the current team
  help                           Show this help

Examples:
  node scripts/change-team.js set "Lakers" "sensor.lakers_score"
  node scripts/change-team.js set "Celtics" "sensor.celtics_score"
  node scripts/change-team.js get

Available Teams:
  Lakers     - sensor.lakers_score
  Celtics    - sensor.celtics_score
  Warriors   - sensor.warriors_score
  Heat       - sensor.heat_score
  `);
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'set':
        if (args.length < 3) {
            console.error('❌ Missing arguments: team-name and entity-id required');
            showUsage();
            process.exit(1);
        }
        setTeam(args[1], args[2]);
        break;
        
    case 'get':
        getCurrentTeam();
        break;
        
    case 'help':
    case '--help':
    case '-h':
        showUsage();
        break;
        
    default:
        console.error(`❌ Unknown command: ${command}`);
        showUsage();
        process.exit(1);
}