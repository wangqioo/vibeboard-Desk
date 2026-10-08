# Clawdbot Integration Guide

Connect Snappy to [Clawdbot](https://github.com/clawdbot/clawdbot) for AI-powered interactions.

## Overview

Snappy integrates with Clawdbot via the OpenAI-compatible HTTP API endpoint:
- **Endpoint**: `http://localhost:18789/v1/chat/completions`
- **Auth**: Bearer token from Clawdbot config
- **Format**: Standard OpenAI Chat Completions API

## Quick Setup

### 1. Install Clawdbot

```bash
npm install -g clawdbot
```

### 2. Configure

Run the onboarding wizard:

```bash
clawdbot onboard
```

This will:
- Set up your AI provider (Anthropic Claude, OpenAI, etc.)
- Configure API keys
- Set preferences

### 3. Start Gateway

```bash
clawdbot gateway start
```

Verify it's running:

```bash
clawdbot gateway status
```

You should see:
- Status: `running`
- Port: `18789` (default)
- HTTP API: `enabled`

### 4. Use Snappy

**TUI Companion:**
```bash
open companion.html
```

**Fullscreen Demo:**
```bash
open face.html
```

That's it! Snappy will automatically connect.

## How It Works

### HTTP API Request

```javascript
POST http://localhost:18789/v1/chat/completions

Headers:
  Content-Type: application/json
  Authorization: Bearer <your-gateway-token>

Body:
{
  "model": "clawdbot:main",
  "messages": [
    { "role": "user", "content": "Your message" }
  ],
  "user": "snappy-session"
}
```

### Response

```javascript
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "AI response text"
    }
  }]
}
```

### Emotion Detection

Snappy analyzes the response text to set facial expressions:

| Keywords | Emotion |
|----------|---------|
| error, failed, cannot | `sad` |
| done, success, completed | `excited` |
| searching, checking | `thinking` |
| ?, hmm, not sure | `confused` |
| love, ❤️, awesome | `love` |
| default | `happy` |

## Configuration

### Custom Port

If your Gateway uses a different port, update the config in `face.html` or `companion.html`:

```javascript
const CONFIG = {
  baseUrl: 'http://localhost:YOUR_PORT',
  token: 'your-token-here',
  model: 'clawdbot:main'
};
```

### Custom Agent

Target a specific Clawdbot agent:

```javascript
const CONFIG = {
  baseUrl: 'http://localhost:18789',
  token: 'your-token-here',
  model: 'clawdbot:YOUR_AGENT_ID'  // e.g., 'clawdbot:assistant'
};
```

### Find Your Token

```bash
clawdbot config get gateway.auth.token
```

Or check your config file:
```bash
cat ~/.clawdbot/clawdbot.json | grep token
```

### Remote Gateway

Connect to a remote Clawdbot instance:

```javascript
const CONFIG = {
  baseUrl: 'https://your-server.com:18789',
  token: 'your-token-here',
  model: 'clawdbot:main'
};
```

## Troubleshooting

### Connection Failed

**Problem**: Browser console shows connection error

**Solutions**:
1. Verify Gateway is running:
   ```bash
   clawdbot gateway status
   ```

2. Check the port (default: 18789)

3. Ensure HTTP API is enabled:
   ```bash
   clawdbot config get gateway.http.endpoints.chatCompletions.enabled
   ```
   Should return `true`

4. Check firewall isn't blocking the port

### No Response

**Problem**: Request sent but no reply

**Solutions**:
1. Check Clawdbot logs:
   ```bash
   clawdbot logs --follow
   ```

2. Verify your AI provider API key is valid:
   ```bash
   clawdbot status
   ```

3. Test the endpoint directly:
   ```bash
   curl -X POST http://localhost:18789/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "model": "clawdbot:main",
       "messages": [{"role": "user", "content": "Hello"}]
     }'
   ```

### CORS Errors

**Problem**: Browser blocks requests (when hosting remotely)

**Solutions**:
1. Configure CORS in Clawdbot Gateway
2. Host Snappy on same domain as Gateway
3. Use a proxy server

### Wrong Emotions

**Problem**: Face shows incorrect emotion for response

**Solution**: Customize emotion detection in the `detectEmotion()` function:

```javascript
function detectEmotion(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes('your-keyword')) {
    return 'excited';
  }
  
  // Add more patterns...
  
  return 'happy';
}
```

## Files Using Clawdbot

### companion.html (TUI Companion)

Monitors connection status, reacts to activity.

**Config location**: Line ~225

```javascript
const CONFIG = {
  gatewayUrl: 'http://localhost:18789',
  token: 'YOUR_TOKEN',
  pollInterval: 1000,
  sessionKey: 'agent:main:main'
};
```

### face.html (Fullscreen Demo)

Full AI chat interface with command execution.

**Config location**: Line ~470

```javascript
const CLAWDBOT_CONFIG = {
  baseUrl: 'http://localhost:18789',
  token: 'YOUR_TOKEN',
  model: 'clawdbot:main',
  timeout: 30000
};
```

## Advanced: Custom Integration

### Add to Your Own Project

```javascript
async function sendToClawdbot(message) {
  const response = await fetch('http://localhost:18789/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({
      model: 'clawdbot:main',
      messages: [
        {
          role: 'system',
          content: 'You are Snappy, a helpful AI assistant.'
        },
        {
          role: 'user',
          content: message
        }
      ]
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Use with Snappy
const face = new Snappy('container');
const reply = await sendToClawdbot('Hello!');
face.setState('happy');
face.speak(reply);
```

## Security Notes

### Local Development
- Default config is secure for localhost
- Token auth handled automatically

### Production/Remote
- Use HTTPS (`https://` URLs)
- Don't commit tokens to GitHub
- Use environment variables for secrets
- Configure proper authentication in Clawdbot

## Resources

- **Clawdbot Docs**: https://docs.clawd.bot
- **HTTP API Reference**: See Clawdbot docs → Gateway → OpenAI HTTP API
- **GitHub Issues**: Report bugs or request features

---

**Questions?** Check the [README](README.md) or open an issue on GitHub.
