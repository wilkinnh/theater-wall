# Home Assistant Attribute Changes Solution

## Problem
The original implementation was only listening to `state_changed` events, but the game score entity (`sensor.carolina_hurricanes`) has attributes like `team_score`, `opponent_score`, `quarter`, and `clock` that change without necessarily triggering state changes.

## Solution
Implemented a WebSocket-only approach to catch attribute changes:

### 1. Enhanced WebSocket Event Subscription
- **Before**: Only subscribed to `state_changed` events
- **After**: Subscribed to both `state_changed` events AND all events (`subscribe_events` with no event_type)
- This catches service calls, automation triggers, and other events that might indicate attribute changes

### 2. New Event Handlers
Added handlers for additional event types:
- `handleServiceCallEvent()` - Catches service calls that might affect the target entity
- `handleAutomationTriggeredEvent()` - Catches automation triggers related to the target entity  
- `handleGenericEvent()` - Catches any other events that might contain attribute changes

### 3. Attribute Change Detection
- **`haveAttributesChanged()`** - Deep comparison of attribute objects to detect changes
- **`refreshEntity()`** - Manually refreshes an entity and checks for attribute changes
- Emits new `attributes-changed` event when attributes change

### 4. Polling Mechanism (DISABLED)
- **`startAttributePolling()`** - DISABLED to rely on WebSocket events only
- **`checkForAttributeChanges()`** - DISABLED to rely on WebSocket events only
- Polling is turned off to test WebSocket-only approach

### 5. Enhanced Panel Updates
- Added listener for new `attributes-changed` events in `panels.js`
- Ensures display updates when attributes change even if state doesn't
- Maintains backward compatibility with existing `state-changed` events

## How It Works

1. **WebSocket Events**: Listens to all Home Assistant events, not just state changes
2. **Event Filtering**: Client-side filtering to focus on the target game score entity
3. **Attribute Comparison**: Deep comparison of attribute objects to detect meaningful changes
4. **No Polling**: Relies solely on WebSocket events for real-time updates
5. **Dual Events**: Emits both `attributes-changed` and `state-changed` for compatibility

## Benefits

- **Real-time Updates**: Catches attribute changes as they happen via WebSocket events
- **Efficient**: No polling overhead, relies on event-driven architecture
- **Comprehensive**: Multiple event handlers ensure no changes are missed
- **Backward Compatible**: Existing code continues to work with `state-changed` events
- **Debugging**: Detailed logging for troubleshooting attribute change detection

## Configuration

No configuration changes required. The solution automatically:
- Detects the game score entity from `window.theaterWallConfig.get('gameScore')`
- Subscribes to all WebSocket events when connected to Home Assistant
- Uses event-driven approach without polling

## Testing

To test the solution:
1. Monitor the browser console for attribute change logs
2. Look for "🎯 Attributes changed for entity" messages
3. Check for "🎯 Service call event for target entity" messages
4. Verify the display updates when scores, quarter, or clock change

The solution provides multiple event-based mechanisms to ensure attribute changes are detected and the display updates accordingly without relying on polling.