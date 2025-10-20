#!/usr/bin/env node

// Build script to create static env.js from .env file
// This creates a file that can be served by any web server

const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config();

console.log('🔧 Building environment variables...');

// Read the template
const templatePath = path.join(__dirname, '../env.template.js');
const template = fs.readFileSync(templatePath, 'utf8');

// Replace environment variables in template
const envJs = template
    .replace(/\${HA_URL}/g, process.env.HA_URL || '')
    .replace(/\${HA_TOKEN}/g, process.env.HA_TOKEN || '')
    .replace(/\${GAME_SCORE_ENTITY}/g, process.env.GAME_SCORE_ENTITY || '')
    .replace(/\${PANEL_WIDTH}/g, process.env.PANEL_WIDTH || '')
    .replace(/\${PANEL_GAP}/g, process.env.PANEL_GAP || '');

// Write the processed file
const outputPath = path.join(__dirname, '../env.js');
fs.writeFileSync(outputPath, envJs);

console.log('✅ Environment variables built into env.js');
console.log('📁 Output:', outputPath);
console.log('🌐 Variables:', {
    HA_URL: process.env.HA_URL ? 'SET' : 'MISSING',
    HA_TOKEN: process.env.HA_TOKEN ? 'SET' : 'MISSING',
    GAME_SCORE_ENTITY: process.env.GAME_SCORE_ENTITY || 'MISSING',
    PANEL_WIDTH: process.env.PANEL_WIDTH || 'DEFAULT',
    PANEL_GAP: process.env.PANEL_GAP || 'DEFAULT'
});