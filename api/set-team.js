// Simple API endpoint for setting team externally
// This can be called from external scripts to change the displayed team

const fs = require('fs');
const path = require('path');

// Simple file-based team storage
const TEAM_FILE = path.join(__dirname, '..', 'current-team.json');

// Set team endpoint
function setTeam(req, res) {
    if (req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const teamData = JSON.parse(body);
                
                // Save to file
                fs.writeFileSync(TEAM_FILE, JSON.stringify(teamData, null, 2));
                
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Team updated successfully',
                    team: teamData 
                }));
                
                console.log('Team updated:', teamData);
                
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

// Get current team endpoint
function getCurrentTeam(req, res) {
    try {
        if (fs.existsSync(TEAM_FILE)) {
            const teamData = JSON.parse(fs.readFileSync(TEAM_FILE, 'utf8'));
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(teamData));
        } else {
            res.writeHead(404, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ error: 'No team set' }));
        }
    } catch (error) {
        res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: error.message }));
    }
}

module.exports = { setTeam, getCurrentTeam };