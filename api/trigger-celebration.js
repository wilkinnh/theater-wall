// API endpoint for triggering celebration videos
// This can be called from external scripts to trigger celebration videos

const fs = require('fs');
const path = require('path');

// Trigger celebration endpoint
function triggerCelebration(req, res) {
    if (req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const celebrationData = JSON.parse(body);
                const { videoFile = 'assets/videos/ric-flair.mp4', autoHide = true, duration = 10000 } = celebrationData;
                
                // Store celebration trigger data for frontend to pick up
                const triggerData = {
                    type: 'celebration_trigger',
                    videoFile,
                    autoHide,
                    duration,
                    timestamp: new Date().toISOString()
                };
                
                // Store in a file for the frontend to poll
                const triggerFile = path.join(__dirname, '..', 'celebration-trigger.json');
                fs.writeFileSync(triggerFile, JSON.stringify(triggerData, null, 2));
                
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Celebration triggered successfully',
                    data: triggerData
                }));
                
                console.log(`🎬 Celebration triggered: ${videoFile}`);
                console.log(`🎬 Options: autoHide=${autoHide}, duration=${duration}ms`);
                
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

// Get celebration trigger status endpoint
function getCelebrationTrigger(req, res) {
    const triggerFile = path.join(__dirname, '..', 'celebration-trigger.json');
    
    try {
        if (fs.existsSync(triggerFile)) {
            const triggerData = JSON.parse(fs.readFileSync(triggerFile, 'utf8'));
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(triggerData));
            
            // Delete the file after serving to prevent re-triggering
            setTimeout(() => {
                try {
                    fs.unlinkSync(triggerFile);
                    console.log('🗑️  Celebration trigger file cleaned up');
                } catch (error) {
                    console.log('⚠️  Could not clean up celebration trigger file:', error.message);
                }
            }, 1000);
        } else {
            // Return empty object if file doesn't exist
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end('{}');
        }
    } catch (error) {
        res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: error.message }));
    }
}

module.exports = { triggerCelebration, getCelebrationTrigger };