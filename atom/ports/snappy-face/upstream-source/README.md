# Snappy

> A visual companion for AI interactions - expressive face with emotions, eye tracking, and real-time reactions.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

Snappy is a JavaScript library that creates an animated, expressive face interface. Designed primarily as a **visual companion for `clawdbot tui`**, it provides real-time emotional feedback while you interact with your AI assistant in the terminal.

**[Live Demo](https://brainsyeth.github.io/expressive-face/)** | **[Documentation](docs/)**

## Primary Use Case: TUI Companion 🖥️

Use Snappy alongside `clawdbot tui` for visual feedback:

```bash
# Terminal
clawdbot tui

# Browser (in another window/screen)
open companion.html
```

**Layout:**
```
┌─────────────────┬──────────────┐
│  Terminal       │   Browser    │
│  clawdbot tui   │   Snappy     │
│                 │   Companion  │
└─────────────────┴──────────────┘
```

Features:
- 👁️ Eyes follow your mouse
- 🎭 Reacts to activity (typing, clicks, focus)
- 🟢 Connection status indicator
- 😴 Auto-sleeps after inactivity
- ⚡ Zero input required - pure visual feedback

**[See TUI_COMPANION.md for full guide →](TUI_COMPANION.md)**

## Other Use Cases

### Standalone Fullscreen Demo

Interactive face with AI chat interface:

```bash
open face.html
```

Click anywhere to chat, eyes follow mouse, full emotion states.

### Component Library

Embed in your own projects:

```html
<link rel="stylesheet" href="snappy.css">
<script src="snappy.js"></script>

<div id="face-container"></div>
<script>
  const face = new Snappy('face-container');
  face.setState('happy');
</script>
```

See `component-demo.html` for examples.

## Features

- 🎭 **13 Emotion States** - Happy, sad, angry, excited, confused, thinking, sleeping, and more
- 👁️ **Eye Tracking** - Eyes follow mouse cursor naturally
- 💬 **AI Integration** - HTTP API connection to Clawdbot Gateway
- 🖥️ **TUI Companion Mode** - Visual feedback for `clawdbot tui`
- ⚡ **Zero Dependencies** - Pure vanilla JavaScript
- 🎨 **Customizable** - CSS variables for easy theming
- ♿ **Accessible** - ARIA labels and reduced motion support
- 📱 **Responsive** - Works on desktop, tablet, and mobile

## Quick Start

### 1. TUI Companion (Recommended)

```bash
# Install Clawdbot if you haven't
npm install -g clawdbot

# Start TUI
clawdbot tui

# Open companion in browser
open companion.html
```

### 2. Standalone Component

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="snappy.css">
</head>
<body>
  <div id="snappy"></div>
  
  <script src="snappy.js"></script>
  <script>
    const face = new Snappy('snappy');
    face.setState('happy');
    face.look('up-right');
  </script>
</body>
</html>
```

### 3. Fullscreen Interactive

```bash
open face.html
```

Click to chat, powered by Clawdbot AI.

## Documentation

- **[TUI_COMPANION.md](TUI_COMPANION.md)** - Visual companion for `clawdbot tui`
- **[QUICKSTART.md](QUICKSTART.md)** - Quick setup guide
- **[EMOTIONS_GUIDE.md](EMOTIONS_GUIDE.md)** - All emotion states and when to use them
- **[CLAWDBOT_SETUP.md](CLAWDBOT_SETUP.md)** - Clawdbot HTTP API integration
- **[docs/API.md](docs/API.md)** - Complete JavaScript API reference
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines

## Available Emotion States

- `idle` - Default neutral state
- `happy` - Cheerful expression
- `sad` - Downturned mouth
- `angry` - Intense expression
- `excited` - Wide eyes, big smile
- `surprised` - Open mouth
- `thinking` - Eyes looking up
- `confused` - Asymmetric eyes
- `speaking` - Animated mouth
- `listening` - Attentive state
- `sleeping` - Closed eyes
- `processing` - Loading spinner
- `love` - Heart eyes

See [EMOTIONS_GUIDE.md](EMOTIONS_GUIDE.md) for detailed descriptions.

## API Reference

### Basic Usage

```javascript
const face = new Snappy('container-id', {
  size: 200,
  autoStart: true,
  blinkInterval: 3000
});
```

### Methods

```javascript
face.setState('happy');        // Change emotion
face.look('up-right');         // Move eyes
face.blink();                  // Trigger blink
face.speak('Hello!');          // Animate speaking
face.start();                  // Start animations
face.stop();                   // Stop animations
```

### Events

```javascript
face.on('stateChange', (data) => {
  console.log(`State: ${data.state}`);
});
```

**[Full API documentation →](docs/API.md)**

## Clawdbot Integration

Snappy uses Clawdbot's OpenAI-compatible HTTP API:

```javascript
// Endpoint: http://localhost:18789/v1/chat/completions
// Auth: Bearer token from Clawdbot config
// Model: clawdbot:main (or your agent ID)
```

**Prerequisites:**
1. Install Clawdbot: `npm install -g clawdbot`
2. Configure: `clawdbot onboard`
3. Enable HTTP API: Already enabled by default
4. Start gateway: `clawdbot gateway start`

**[Full integration guide →](CLAWDBOT_SETUP.md)**

## Project Structure

```
snappy/
├── snappy.js              # Core library
├── snappy.css             # Styling
├── companion.html         # TUI companion mode ⭐
├── face.html              # Fullscreen demo with AI
├── component-demo.html    # Component examples
├── chat.html              # Chat interface
├── chat-simple.html       # Simplified chat
├── docs/                  # Additional documentation
│   ├── API.md
│   ├── DESIGN_SPEC.md
│   └── ...
├── TUI_COMPANION.md       # Companion mode guide
├── CLAWDBOT_SETUP.md      # AI integration
├── EMOTIONS_GUIDE.md      # Emotion reference
├── QUICKSTART.md          # Quick start
└── README.md              # This file
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

### Run Locally

```bash
git clone https://github.com/BrainsyETH/expressive-face.git
cd expressive-face
open companion.html
```

No build step required!

### Customize

Edit `snappy.css` to change:

```css
:root {
  --brainsy-primary: #FF8C42;     /* Main color */
  --brainsy-secondary: #FFB84D;   /* Secondary */
  --brainsy-bg: #2C2416;          /* Background */
  /* ... */
}
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License - see [LICENSE](LICENSE)

## Links

- **GitHub**: https://github.com/BrainsyETH/expressive-face
- **Live Demo**: https://brainsyeth.github.io/expressive-face/
- **Clawdbot**: https://github.com/clawdbot/clawdbot
- **Issues**: https://github.com/BrainsyETH/expressive-face/issues

---

**Made for delightful AI interactions** ⚡
