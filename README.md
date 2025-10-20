# Theater Wall Display

A web-based display system for projecting Home Assistant data onto a 3-panel wall setup. The application features a black background with three configurable panels that display sensors, controls, and media players, with support for video overlay that maintains the panel masking.

## Features

- **3-Panel Layout**: Configurable horizontal panels with black background masking
- **Home Assistant Integration**: Real-time WebSocket connection for live data
- **Entity Display**: 
  - Left Panel: Sensors (temperature, humidity, motion, etc.)
  - Center Panel: Controls (lights, switches, devices)
  - Right Panel: Media Players (speakers, displays, etc.)
- **Video Overlay**: Full-screen video playback with panel masking
- **Responsive Design**: Adapts to different screen sizes and projector setups
- **Configuration Panel**: Easy setup for panel dimensions and Home Assistant connection
- **Projection Optimized**: High contrast, large text, minimal animations

## Quick Start

1. **Open the Application**
   ```bash
   # Serve the files with any web server
   python -m http.server 8000
   # or
   npx serve .
   ```

2. **Configure Home Assistant**
   - Click the gear icon (⚙️) or press `Ctrl + ,`
   - Enter your Home Assistant WebSocket URL
   - Add your long-lived access token
   - Configure the entities you want to display

3. **Adjust Panel Layout**
   - Use the configuration panel to adjust panel width and gap
   - Fine-tune for your specific projector setup

## Configuration

### Home Assistant Setup

1. **Generate Long-Lived Access Token**
   - Go to Home Assistant > Profile > Long-Lived Access Tokens
   - Create a new token and copy it

2. **WebSocket URL**
   - Local: `ws://homeassistant.local:8123/api/websocket`
   - Remote: `wss://your-domain.duckdns.org/api/websocket`

### Entity Configuration

Edit the entities in the configuration panel or modify `config/settings.json`:

```json
{
  "entities": {
    "sensors": [
      "sensor.temperature_living_room",
      "sensor.humidity_living_room",
      "binary_sensor.motion_front_door"
    ],
    "controls": [
      "light.living_room",
      "light.kitchen",
      "switch.fan"
    ],
    "media": [
      "media_player.living_room_speaker",
      "media_player.bedroom_speaker"
    ]
  }
}
```

### Panel Configuration

- **Panel Width**: Percentage of screen width (10-40%)
- **Panel Gap**: Spacing between panels (1-10%)
- **Display Settings**: Brightness, contrast, high contrast mode

## Video System

The video overlay system allows you to play videos that span all three panels while maintaining the mask:

1. **Add Video Sources**: Configure video paths in settings
2. **Trigger Video**: Click the video button (🎬) in the bottom-right
3. **Controls**: 
   - Space/K: Play/Pause
   - Arrow Keys: Skip and Volume
   - F: Fullscreen
   - Escape: Exit video

## Keyboard Shortcuts

- `Ctrl + ,` - Open configuration
- `F1` - Show help
- `F5` - Reload application
- `Ctrl + S` - Save current state

## File Structure

```
theater-wall/
├── index.html              # Main HTML structure
├── css/
│   ├── main.css           # Core styles and layout
│   ├── panels.css         # Panel-specific styling
│   └── video-overlay.css  # Video overlay styles
├── js/
│   ├── main.js            # Application entry point
│   ├── config.js          # Configuration management
│   ├── home-assistant.js  # HA WebSocket client
│   ├── panels.js          # Panel management
│   └── video-player.js    # Video overlay system
├── config/
│   └── settings.json      # Default configuration
├── assets/
│   ├── videos/            # Video content
│   └── icons/             # UI icons
└── README.md
```

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance Considerations

- **WebSocket**: Efficient real-time updates
- **CSS Masks**: Hardware-accelerated panel masking
- **Minimal Animations**: Optimized for projection
- **Local Storage**: Configuration persistence

## Troubleshooting

### Connection Issues
- Verify Home Assistant URL and token
- Check network connectivity
- Ensure WebSocket is enabled in HA

### Display Issues
- Adjust panel dimensions in configuration
- Check projector resolution settings
- Verify browser zoom level

### Video Issues
- Ensure video files are accessible
- Check video format compatibility
- Verify video paths in configuration

## Development

### Local Development
```bash
# Clone and serve
git clone <repository>
cd theater-wall
python -m http.server 8000
```

### Customization
- Modify CSS variables in `css/main.css` for theming
- Add new entity types in `js/panels.js`
- Extend video player in `js/video-player.js`

## Security

- **WebSocket**: Use WSS for remote connections
- **Tokens**: Store access tokens securely
- **CORS**: Ensure proper headers in Home Assistant

## License

This project is open source. Please refer to the license file for details.

## Support

For issues and feature requests, please use the project's issue tracker.

---

**Note**: This application is designed for projection displays and may require calibration for specific projector setups. The panel masking system ensures content only appears in the designated areas.