#!/usr/bin/env node

// External script to change the team on the theater wall display
// Usage: node scripts/change-team.js "Lakers" "sensor.lakers_score"

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const THEATER_WALL_URL = 'http://localhost:8000';
const TEAM_FILE = path.join(__dirname, '..', 'current-team.json');

function setTeam(teamName, entityId) {
    const teamData = {
        name: teamName,
        entity_id: entityId,
        timestamp: new Date().toISOString()
    };

    // Method 1: Save to file (for file-based watching)
    try {
        fs.writeFileSync(TEAM_FILE, JSON.stringify(teamData, null, 2));
        console.log(`✅ Team saved to file: ${teamName} (${entityId})`);
    } catch (error) {
        console.error(`❌ Failed to save to file: ${error.message}`);
    }

    // Method 2: HTTP request to API (if server is running)
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
                    console.log(`✅ Team updated via API: ${teamName}`);
                } else {
                    console.log(`⚠️  API response: ${response.error || 'Unknown error'}`);
                }
            } catch (error) {
                console.log(`⚠️  API response parsing failed: ${error.message}`);
            }
        });
    });

    req.on('error', (error) => {
        console.log(`⚠️  API request failed: ${error.message}`);
        console.log(`ℹ️  Team saved to file - will be picked up by file watcher`);
    });

    req.write(data);
    req.end();
}

function getCurrentTeam() {
    try {
        if (fs.existsSync(TEAM_FILE)) {
            const teamData = JSON.parse(fs.readFileSync(TEAM_FILE, 'utf8'));
            console.log(`Current team: ${teamData.name} (${teamData.entity_id})`);
            console.log(`Last updated: ${teamData.timestamp}`);
        } else {
            console.log('No team currently set');
        }
    } catch (error) {
        console.error(`Failed to read current team: ${error.message}`);
    }
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