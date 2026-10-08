# Snappy - Quick Start Guide

Get started with Snappy in 60 seconds.

## 1. TUI Companion (Recommended) 🖥️

Use Snappy as a visual companion for `clawdbot tui`.

### Prerequisites

Install Clawdbot if you haven't:

```bash
npm install -g clawdbot
clawdbot onboard
```

### Setup

```bash
# Terminal: Start Clawdbot TUI
clawdbot tui

# Browser: Open companion
open companion.html
```

**That's it!** Snappy will:
- Follow your mouse with its eyes
- React to typing and activity
- Show connection status
- Express emotions based on what you're doing

**[Full companion guide →](TUI_COMPANION.md)**

---

## 2. Standalone Component 🧩

Embed Snappy in your own HTML page.

### Download

Download `snappy.js` and `snappy.css` or clone:

```bash
git clone https://github.com/BrainsyETH/expressive-face.git
```

### Basic HTML

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="snappy.css">
</head>
<body>
  <div id="face"></div>
  
  <script src="snappy.js"></script>
  <script>
    const face = new Snappy('face');
    face.setState('happy');
  </script>
</body>
</html>
```

### Control It

```javascript
// Change emotions
face.setState('happy');
face.setState('thinking');
face.setState('excited');

// Move eyes
face.look('left');
face.look('up-right');

// Trigger actions
face.blink();
face.speak('Hello!');
```

**[Full API reference →](docs/API.md)**

---

## 3. Fullscreen Demo 🎬

Try the interactive fullscreen experience:

```bash
open face.html
```

- Click anywhere to chat
- Type commands for the AI
- Eyes follow your mouse
- Full emotion states

---

## Examples

### Quick Test

```bash
# Component demo
open component-demo.html

# Chat interface
open chat.html

# Fullscreen
open face.html

# TUI companion
open companion.html
```

### With Clawdbot AI

1. **Enable HTTP API** (if not already):
   ```bash
   clawdbot config set gateway.http.endpoints.chatCompletions.enabled true
   ```

2. **Start Gateway**:
   ```bash
   clawdbot gateway start
   ```

3. **Open face.html** - AI chat is ready!

**[AI integration guide →](CLAWDBOT_SETUP.md)**

---

## Next Steps

- **Emotions**: See [EMOTIONS_GUIDE.md](EMOTIONS_GUIDE.md) for all states
- **API**: See [docs/API.md](docs/API.md) for methods and events
- **Customize**: Edit `snappy.css` to change colors and style
- **Integrate**: See [CLAWDBOT_SETUP.md](CLAWDBOT_SETUP.md) for AI setup

---

## Troubleshooting

### Companion shows "Disconnected"

1. Make sure Clawdbot is running:
   ```bash
   clawdbot gateway status
   ```

2. Check the gateway URL in `companion.html` (default: `http://localhost:18789`)

### Face not showing

1. Check browser console (F12) for errors
2. Make sure file paths are correct
3. Try `open component-demo.html` to test

### Eyes not following mouse

1. Move mouse over the face window
2. Check console for JavaScript errors
3. Try a different browser

---

## Need Help?

- Check the [README](README.md) for full documentation
- See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute
- Open an [issue](https://github.com/BrainsyETH/expressive-face/issues) on GitHub

---

**Happy building!** 🎭
