# Development Setup Guide

This guide covers different ways to host your Theater Wall Display with live updates for development and production.

## Quick Start Options

### Option 1: Live Development Server (Recommended for Development)

**Best for:** Development with automatic refresh when you make changes

```bash
# Install dependencies
npm install

# Start development server with live reload
npm run dev
```

The development server will:
- Serve on `http://localhost:8080`
- Auto-refresh when CSS, JS, or config files change
- Watch for file changes in `css/`, `js/`, and `config/` directories
- Open browser automatically

### Option 2: Simple Static Server

**Best for:** Quick testing without dependencies

```bash
# Using Python (built-in)
npm run serve

# Or manually:
python -m http.server 8080 --bind 0.0.0.0
```

Access at `http://localhost:8080` - no automatic refresh.

### Option 3: Docker Container

**Best for:** Production deployment and consistent environments

```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run

# Or manually:
docker build -t theater-wall .
docker run -p 8080:80 theater-wall
```

Access at `http://localhost:8080`

## Development Workflow

### For Live Development (Recommended)

1. **Setup:**
   ```bash
   npm install
   npm run dev
   ```

2. **Make Changes:**
   - Edit CSS files → Auto-refreshes browser
   - Edit JavaScript files → Auto-refreshes browser  
   - Edit config files → Auto-refreshes browser
   - Edit HTML → Manual refresh required

3. **Access from Other Devices:**
   ```
   http://YOUR_IP:8080
   ```
   Replace `YOUR_IP` with your development machine's IP address.

### For Projector Testing

1. **Find your IP:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. **Start server:**
   ```bash
   npm run dev
   ```

3. **Access from projector computer:**
   ```
   http://YOUR_DEVELOPMENT_IP:8080
   ```

## Network Configuration

### Access from Projector/Other Devices

**Method 1: Direct Connection**
- Connect both devices to same network
- Use development machine's IP address
- Ensure firewall allows port 8080

**Method 2: Network Discovery**
```bash
# Start server with network binding
npm run dev

# Find your IP
# On macOS: System Preferences > Network
# On Windows: Settings > Network & Internet
# On Linux: ip addr show
```

### Firewall Configuration

**macOS:**
```bash
# Allow port 8080
sudo pfctl -f /etc/pf.conf
```

**Windows:**
- Go to Windows Defender Firewall
- Add port 8080 as inbound rule

**Linux (ufw):**
```bash
sudo ufw allow 8080/tcp
```

## Production Deployment

### Docker Production Setup

1. **Build and run:**
   ```bash
   docker build -t theater-wall .
   docker run -d -p 80:80 --name theater-wall theater-wall
   ```

2. **With environment variables:**
   ```bash
   docker run -d -p 80:80 \
     -e HA_URL="ws://homeassistant.local:8123/api/websocket" \
     -e HA_TOKEN="your-token" \
     --name theater-wall theater-wall
   ```

3. **With volume mounting:**
   ```bash
   docker run -d -p 80:80 \
     -v $(pwd)/config:/usr/share/nginx/html/config \
     --name theater-wall theater-wall
   ```

### Reverse Proxy Setup (Nginx/Apache)

**Nginx example:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/websocket {
        proxy_pass http://homeassistant.local:8123;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Troubleshooting

### "Connection Refused" Errors
- Check if server is running: `netstat -an | grep 8080`
- Verify firewall settings
- Try different port: `npm run dev -- --port=3000`

### "Cannot Access from Other Devices"
- Verify same network connection
- Check IP address: `ipconfig` or `ifconfig`
- Test with: `curl http://YOUR_IP:8080`

### "Auto-refresh Not Working"
- Ensure you're using `npm run dev`
- Check file permissions
- Verify browser console for errors

### Docker Issues
```bash
# Check container logs
docker logs theater-wall

# Enter container for debugging
docker exec -it theater-wall sh

# Rebuild without cache
docker build --no-cache -t theater-wall .
```

## Performance Optimization

### For Production
- Enable gzip compression (included in Docker setup)
- Use CDN for static assets
- Enable browser caching
- Consider HTTPS for production

### For Development
- Use `npm run dev` for live reload
- Monitor browser console for errors
- Test on target projector hardware

## Security Considerations

### Development
- Don't expose development server to internet
- Use firewall rules to restrict access
- Don't commit sensitive tokens to git

### Production
- Use HTTPS certificates
- Implement authentication if needed
- Regular security updates
- Monitor access logs

## Mobile/Projector Optimization

### Testing on Projector
1. **Resolution:** Test at target projector resolution
2. **Brightness:** Adjust for ambient lighting
3. **Distance:** Test from viewing distance
4. **Network:** Ensure stable WiFi connection

### Performance Tips
- Minimize animations for projection
- Use high contrast colors
- Test with different browsers
- Monitor memory usage on projector device

## Next Steps

1. **Choose your hosting method** based on use case
2. **Test network connectivity** between devices
3. **Configure Home Assistant** connection
4. **Calibrate panel dimensions** for your projector
5. **Test video overlay** functionality

For Docker deployment when ready, see the Docker section above or run:
```bash
npm run docker:build
npm run docker:run