#!/usr/bin/env node

// Celebration Trigger Script

const http = require('http');

function triggerCelebration(videoFile = 'assets/videos/ric-flair-celebration.mp4', options = {}) {
    const { autoHide = true, duration = 10000 } = options;
    
    const postData = JSON.stringify({
        videoFile,
        autoHide,
        duration
    });
    
    const requestOptions = {
        hostname: 'localhost',
        port: 8000,
        path: '/api/trigger-celebration',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    console.log(`🎬 Triggering celebration video: ${videoFile}`);
    console.log(`🎬 Options: autoHide=${autoHide}, duration=${duration}ms`);
    
    const req = http.request(requestOptions, (res) => {
        console.log(`🎬 Status: ${res.statusCode}`);
        console.log(`🎬 Headers: ${JSON.stringify(res.headers)}`);
        
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(body);
                console.log(`🎬 Response:`, response);
                
                if (response.success) {
                    console.log(`✅ Celebration triggered successfully!`);
                    console.log(`🎬 Video should start playing in 1-2 seconds`);
                } else {
                    console.log(`❌ Failed to trigger celebration: ${response.error}`);
                }
            } catch (error) {
                console.log(`🎬 Raw response: ${body}`);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error(`❌ Error triggering celebration: ${error.message}`);
        console.log(`💡 Make sure the server is running on http://localhost:8000`);
    });
    
    req.write(postData);
    req.end();
}

// Command line interface
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`🎬 Theater Wall Celebration Trigger`);
        console.log(``);
        console.log(`Usage:`);
        console.log(`  node scripts/trigger-celebration.js [videoFile] [options]`);
        console.log(``);
        console.log(`Examples:`);
        console.log(`  node scripts/trigger-celebration.js`);
        console.log(`  node scripts/trigger-celebration.js "assets/videos/goal-celebration.mp4"`);
        console.log(`  node scripts/trigger-celebration.js "assets/videos/custom.mp4" --no-auto-hide`);
        console.log(``);
        console.log(`Options:`);
        console.log(`  --no-auto-hide    Don't auto-hide the video`);
        console.log(`  --duration MS     Auto-hide after MS milliseconds (default: 10000)`);
        console.log(`  --help            Show this help`);
        console.log(``);
        console.log(`🎬 The celebration video will play across all 3 panels with masking!`);
        return;
    }
    
    if (args.includes('--help')) {
        main();
        return;
    }
    
    // Parse arguments
    let videoFile = 'assets/videos/ric-flair-celebration.mp4';
    let autoHide = true;
    let duration = 10000;
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--no-auto-hide') {
            autoHide = false;
        } else if (arg === '--duration' && i + 1 < args.length) {
            duration = parseInt(args[i + 1]);
            i++; // Skip next argument
        } else if (!arg.startsWith('--')) {
            videoFile = arg;
        }
    }
    
    triggerCelebration(videoFile, { autoHide, duration });
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { triggerCelebration };