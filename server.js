// Simple HTTP server for theater wall API endpoints
// Run with: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables first
const dotenv = require('dotenv');
const envResult = dotenv.config();

// Debug environment loading
console.log('=== ENVIRONMENT LOADING DEBUG ===');
console.log('dotenv result:', envResult);
console.log('Current working directory:', process.cwd());
console.log('Looking for .env file at:', path.join(process.cwd(), '.env'));
console.log('.env file exists:', fs.existsSync('.env'));

if (fs.existsSync('.env')) {
    console.log('.env file contents (first 200 chars):');
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        console.log(envContent.substring(0, 200) + (envContent.length > 200 ? '...' : ''));
    } catch (error) {
        console.log('Error reading .env file:', error.message);
    }
}

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('HOME_ASSISTANT_URL:', process.env.HOME_ASSISTANT_URL ? 'SET' : 'MISSING');
console.log('HA_URL:', process.env.HA_URL ? 'SET' : 'MISSING');
console.log('HOME_ASSISTANT_TOKEN:', process.env.HOME_ASSISTANT_TOKEN ? 'SET' : 'MISSING');
console.log('HA_TOKEN:', process.env.HA_TOKEN ? 'SET' : 'MISSING');
console.log('GAME_SCORE_ENTITY:', process.env.GAME_SCORE_ENTITY || 'MISSING');
console.log('================================');

// Import API functions
const { setTeam, getCurrentTeam } = require('./api/set-team');

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS requests for CORS
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API routes
    if (pathname === '/api/set-team') {
        setTeam(req, res);
        return;
    }

    if (pathname === '/api/current-team') {
        getCurrentTeam(req, res);
        return;
    }

    if (pathname === '/api/env') {
        console.log('=== /API/ENV CALLED ===');
        console.log('Current working directory:', process.cwd());
        console.log('.env file exists:', fs.existsSync('.env'));
        
        if (fs.existsSync('.env')) {
            console.log('.env file contents (first 200 chars):');
            try {
                const envContent = fs.readFileSync('.env', 'utf8');
                console.log(envContent.substring(0, 200) + (envContent.length > 200 ? '...' : ''));
            } catch (error) {
                console.log('Error reading .env file:', error.message);
            }
        }
        
        console.log('Raw process.env values:');
        console.log('  process.env.HOME_ASSISTANT_URL:', process.env.HOME_ASSISTANT_URL ? 'SET' : 'MISSING');
        console.log('  process.env.HA_URL:', process.env.HA_URL ? 'SET' : 'MISSING');
        console.log('  process.env.HOME_ASSISTANT_TOKEN:', process.env.HOME_ASSISTANT_TOKEN ? 'SET' : 'MISSING');
        console.log('  process.env.HA_TOKEN:', process.env.HA_TOKEN ? 'SET' : 'MISSING');
        
        // Support both naming conventions
        const haUrl = process.env.HOME_ASSISTANT_URL || process.env.HA_URL || '';
        const haToken = process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN || '';
        
        console.log('Final values being sent:');
        console.log('  haUrl:', haUrl ? 'SET' : 'MISSING');
        console.log('  haToken:', haToken ? 'SET' : 'MISSING');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            HOME_ASSISTANT_URL: haUrl,
            HOME_ASSISTANT_TOKEN: haToken,
            GAME_SCORE_ENTITY: process.env.GAME_SCORE_ENTITY || '',
            VIDEO_SOURCES: process.env.VIDEO_SOURCES || 'assets/videos/ric-flair.mp4',
            PANEL_WIDTH: process.env.PANEL_WIDTH || '30',
            PANEL_GAP: process.env.PANEL_GAP || '2'
        }));
        return;
    }

    // Serve static files
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found, try to serve from subdirectories
                const altPaths = [
                    path.join(__dirname, 'css', filePath),
                    path.join(__dirname, 'js', filePath),
                    path.join(__dirname, 'assets', filePath),
                    path.join(__dirname, 'config', filePath),
                    path.join(__dirname, 'api', filePath)
                ];

                let found = false;
                for (const altPath of altPaths) {
                    try {
                        const altContent = fs.readFileSync(altPath);
                        res.writeHead(200, { 'Content-Type': mimeType });
                        res.end(altContent);
                        found = true;
                        break;
                    } catch (e) {
                        // Continue trying other paths
                    }
                }

                if (!found) {
                    res.writeHead(404);
                    res.end('File not found');
                }
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content);
        }
    });
});

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
    console.log(`🎬 Theater Wall Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints:`);
    console.log(`   POST /api/set-team - Set current team`);
    console.log(`   GET  /api/current-team - Get current team`);
    console.log(``);
    console.log(`🏀 Team control examples:`);
    console.log(`   node scripts/change-team.js set "Lakers" "sensor.lakers_score"`);
    console.log(`   node scripts/change-team.js set "Celtics" "sensor.celtics_score"`);
    console.log(``);
    console.log(`⌨️  Keyboard shortcuts:`);
    console.log(`   T - Show team selector`);
    console.log(`   1-9 - Quick team selection`);
    console.log(`   M - Toggle video mask`);
    console.log(`   Ctrl+, - Settings`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});