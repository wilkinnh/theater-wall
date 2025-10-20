#!/usr/bin/env node

// Development environment script
// Loads .env file and injects environment variables into browser

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Create environment injection script
const envConfig = {
    HA_URL: process.env.HA_URL || '',
    HA_TOKEN: process.env.HA_TOKEN || '',
    GAME_SCORE_ENTITY: process.env.GAME_SCORE_ENTITY || '',
    PANEL_WIDTH: process.env.PANEL_WIDTH || '',
    PANEL_GAP: process.env.PANEL_GAP || ''
};

const envScript = `window.__ENV__ = ${JSON.stringify(envConfig)};`;

// Write env.js file
const envPath = path.join(process.cwd(), 'env.js');
fs.writeFileSync(envPath, envScript);

console.log('✅ Environment variables injected into env.js');
console.log('🔧 Configuration:', {
    hasHaUrl: !!envConfig.HA_URL,
    hasHaToken: !!envConfig.HA_TOKEN,
    hasGameScoreEntity: !!envConfig.GAME_SCORE_ENTITY,
    panelWidth: envConfig.PANEL_WIDTH || 'default',
    panelGap: envConfig.PANEL_GAP || 'default'
});

// Start live-server
const { spawn } = require('child_process');
const liveServer = spawn('live-server', [
    '--port=8080',
    '--host=0.0.0.0',
    '--open=/index.html',
    '--watch=css/,js/,config/',
    '--ignore=.git,node_modules,env.js'
], {
    stdio: 'inherit'
});

liveServer.on('close', (code) => {
    console.log(`Live server exited with code ${code}`);
    // Clean up env.js file
    if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
        console.log('🧹 Cleaned up env.js');
    }
});

// Handle cleanup on exit
process.on('SIGINT', () => {
    liveServer.kill('SIGINT');
    if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
        console.log('🧹 Cleaned up env.js');
    }
    process.exit(0);
});