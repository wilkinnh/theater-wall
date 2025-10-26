# Celebration API Examples

This document provides examples of how to use the celebration trigger API endpoint.

## API Endpoints

### POST /api/trigger-celebration
Triggers a celebration video to play across all panels.

**Request Body:**
```json
{
  "videoFile": "assets/videos/ric-flair.mp4",
  "autoHide": true,
  "duration": 10000
}
```

**Parameters:**
- `videoFile` (optional): Path to the video file (default: "assets/videos/ric-flair.mp4")
- `autoHide` (optional): Whether to auto-hide the video (default: true)
- `duration` (optional): Auto-hide duration in milliseconds (default: 10000)

**Response:**
```json
{
  "success": true,
  "message": "Celebration triggered successfully",
  "data": {
    "type": "celebration_trigger",
    "videoFile": "assets/videos/ric-flair.mp4",
    "autoHide": true,
    "duration": 10000,
    "timestamp": "2025-10-26T01:00:59.050Z"
  }
}
```

### GET /celebration-trigger.json
Polls for pending celebration triggers (used by the frontend).

## Usage Examples

### 1. Using curl

```bash
# Basic celebration trigger
curl -X POST http://localhost:8000/api/trigger-celebration \
     -H "Content-Type: application/json" \
     -d '{"videoFile": "assets/videos/ric-flair.mp4"}'

# Custom video with options
curl -X POST http://localhost:8000/api/trigger-celebration \
     -H "Content-Type: application/json" \
     -d '{
       "videoFile": "assets/videos/custom-celebration.mp4",
       "autoHide": false,
       "duration": 15000
     }'
```

### 2. Using the provided script

```bash
# Default celebration
node scripts/trigger-celebration.js

# Custom video
node scripts/trigger-celebration.js "assets/videos/goal-celebration.mp4"

# Custom video with no auto-hide
node scripts/trigger-celebration.js "assets/videos/custom.mp4" --no-auto-hide

# Custom video with custom duration
node scripts/trigger-celebration.js "assets/videos/custom.mp4" --duration 15000
```

### 3. Using JavaScript (Node.js)

```javascript
const http = require('http');

function triggerCelebration(videoFile, options = {}) {
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
    
    const req = http.request(requestOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });
        
        res.on('end', () => {
            const response = JSON.parse(body);
            if (response.success) {
                console.log('✅ Celebration triggered successfully!');
            } else {
                console.log('❌ Failed to trigger celebration:', response.error);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Error:', error.message);
    });
    
    req.write(postData);
    req.end();
}

// Usage examples
triggerCelebration('assets/videos/ric-flair.mp4');
triggerCelebration('assets/videos/custom.mp4', { autoHide: false, duration: 15000 });
```

### 4. Using JavaScript (Browser)

```javascript
async function triggerCelebration(videoFile, options = {}) {
    const { autoHide = true, duration = 10000 } = options;
    
    try {
        const response = await fetch('/api/trigger-celebration', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoFile,
                autoHide,
                duration
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Celebration triggered successfully!');
        } else {
            console.log('❌ Failed to trigger celebration:', result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Usage examples
triggerCelebration('assets/videos/ric-flair.mp4');
triggerCelebration('assets/videos/custom.mp4', { autoHide: false, duration: 15000 });
```

### 5. Using Python

```python
import requests
import json

def trigger_celebration(video_file="assets/videos/ric-flair.mp4", auto_hide=True, duration=10000):
    url = "http://localhost:8000/api/trigger-celebration"
    data = {
        "videoFile": video_file,
        "autoHide": auto_hide,
        "duration": duration
    }
    
    try:
        response = requests.post(url, json=data)
        result = response.json()
        
        if result.get("success"):
            print("✅ Celebration triggered successfully!")
        else:
            print(f"❌ Failed to trigger celebration: {result.get('error')}")
    except Exception as e:
        print(f"❌ Error: {e}")

# Usage examples
trigger_celebration()
trigger_celebration("assets/videos/custom.mp4", auto_hide=False, duration=15000)
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `200`: Success
- `400`: Bad Request (invalid JSON or missing required fields)
- `405`: Method Not Allowed (using GET instead of POST)
- `500`: Internal Server Error

Example error response:
```json
{
  "success": false,
  "error": "Unexpected token 'i', \"invalid json\" is not valid JSON"
}
```

## Notes

- The server must be running on `http://localhost:8000` for these examples to work
- Video files should be located in the `assets/videos/` directory
- The frontend polls `/celebration-trigger.json` to detect when a celebration is triggered
- Trigger files are automatically cleaned up after being served to prevent re-triggering