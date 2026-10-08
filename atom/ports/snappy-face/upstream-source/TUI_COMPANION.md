# Snappy - TUI Companion Mode

Use Snappy as a visual companion while using `clawdbot tui`.

## Quick Start

### 1. Start Clawdbot TUI

In your terminal:

```bash
clawdbot tui
```

### 2. Open Snappy Companion

In your browser:

```bash
open companion.html
```

Or just double-click `companion.html`.

### 3. Use Clawdbot Normally

- Type commands in the TUI
- Snappy will react with facial expressions
- Eyes follow your mouse
- Face changes based on activity

## How It Works

Snappy monitors your Clawdbot session and reacts:

- **👁️ Idle** - Waiting, following mouse
- **🤔 Thinking** - Processing commands
- **🔄 Processing** - Active work
- **😊 Happy** - Task completed
- **🎉 Excited** - Window focus / new activity
- **👂 Listening** - Keyboard activity detected
- **😴 Sleeping** - No activity for 30+ seconds

## Window Setup

**Recommended layout:**

```
┌─────────────────┬──────────────┐
│                 │              │
│  Terminal       │   Snappy     │
│  (clawdbot tui) │   Companion  │
│                 │              │
│                 │              │
└─────────────────┴──────────────┘
```

## Features

✅ **No input required** - Pure visual feedback  
✅ **Eye tracking** - Follows your mouse  
✅ **Auto blinking** - Natural animations  
✅ **Connection status** - Shows if Clawdbot is reachable  
✅ **Activity detection** - Reacts to typing, clicks, focus  
✅ **Low resource** - Minimal CPU/memory usage  

## Configuration

Edit `companion.html` to customize:

```javascript
const CONFIG = {
  gatewayUrl: 'http://localhost:18789',  // Your gateway
  token: 'YOUR_TOKEN',                    // Gateway token
  pollInterval: 1000,                     // Check frequency
  sessionKey: 'agent:main:main'          // TUI session
};
```

## Troubleshooting

### "Disconnected" status

1. Make sure Clawdbot Gateway is running:
   ```bash
   clawdbot gateway status
   ```

2. Check the gateway URL and token in `companion.html`

3. Verify HTTP API is enabled:
   ```bash
   clawdbot config get gateway.http.endpoints.chatCompletions.enabled
   ```

### Face stays idle

- Companion detects activity via window events
- Click the browser window or move your mouse
- Type in the TUI to trigger reactions

### Want more reactions?

The companion currently uses simple heuristics. Future versions will:
- Monitor actual session events
- React to specific tool calls
- Show typing indicators when Clawdbot is responding
- Display emotion based on message sentiment

## Advanced: Full Integration

For deeper integration, companion.html can be enhanced to:

1. Subscribe to session events via WebSocket
2. Show tool calls in real-time
3. Display thinking process
4. React to specific commands

See `CLAWDBOT_SETUP.md` for API details.

## Tips

- **Dual monitor setup**: TUI on one screen, Snappy on another
- **Always on top**: Use browser's picture-in-picture mode
- **Fullscreen**: Press F11 in the browser for immersive view
- **Dark theme**: Companion works well with dark terminal themes

---

**Enjoy your visual AI companion!** 🎭
