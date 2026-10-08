# Setup Guide

## Quick Start (5 minutes)

### Option 1: Testing Without Clawdbot (Easiest)

1. **Open any HTML file directly:**
   ```bash
   open face.html
   # or
   open cli.html
   ```

2. **Set mock mode:**
   - Files default to `USE_CLAWDBOT = false`
   - This uses mock responses for testing
   - No configuration needed!

### Option 2: Connect to Clawdbot

**⚠️ SECURITY NOTICE:** Never commit your gateway token. Follow these steps carefully.

#### Step 1: Get Your Token

```bash
clawdbot gateway config.get
```

Look for the `gateway.token` value (long hex string).

#### Step 2: Choose a Setup Method

##### Method A: External Config (Recommended)

1. **Copy the template:**
   ```bash
   cp config.example.js config.js
   ```

2. **Edit config.js:**
   ```javascript
   const CLAWDBOT_CONFIG = {
     baseUrl: 'http://localhost:18789',
     token: 'YOUR_TOKEN_HERE',  // Paste your token
     model: 'clawdbot:main',
     timeout: 30000
   };
   ```

3. **Verify it's protected:**
   ```bash
   git status
   # config.js should NOT appear (it's in .gitignore)
   ```

4. **You're done!** Open face.html and it will load config.js automatically.

##### Method B: Create .local.html (Quick Testing)

1. **Copy the file:**
   ```bash
   cp face.html face.local.html
   ```

2. **Edit face.local.html:**
   - Find the line: `const USE_CLAWDBOT = false;`
   - Change to: `const USE_CLAWDBOT = true;`
   - Find: `token: 'YOUR_GATEWAY_TOKEN_HERE'`
   - Replace with your actual token

3. **Open the .local.html file:**
   ```bash
   open face.local.html
   ```

4. **NEVER commit face.local.html** (it's in .gitignore)

##### Method C: CORS Proxy (Remote Gateway)

If your Clawdbot Gateway is on a different machine:

1. **Start the CORS proxy:**
   ```bash
   node cors-proxy.js
   ```

2. **Update config:**
   ```javascript
   const CLAWDBOT_CONFIG = {
     baseUrl: 'http://localhost:3000',  // Proxy URL
     token: 'YOUR_TOKEN_HERE',
     // ...
   };
   ```

3. **Proxy forwards to your real gateway**
   (Edit GATEWAY_URL in cors-proxy.js)

#### Step 3: Test the Connection

1. **Open face.html in browser**

2. **Check browser console (F12):**
   ```
   ✅ Connected to Clawdbot Gateway
   🔗 Gateway: http://localhost:18789
   ```

3. **Type a message and hit Enter**

4. **You should see a real AI response!**

## Troubleshooting

### "Failed to connect to Gateway"

**Problem:** WebSocket connection error

**Solutions:**
1. **Check Clawdbot is running:**
   ```bash
   clawdbot gateway status
   ```

2. **Check the URL:**
   - Default: `http://localhost:18789`
   - Check your config: `clawdbot gateway config.get`

3. **Check the token:**
   ```bash
   clawdbot gateway config.get
   ```
   Compare with your config.js

4. **Check firewall:**
   - Allow port 18789
   - Or use CORS proxy

### "Unauthorized (401)"

**Problem:** Invalid or expired token

**Solution:**
```bash
# Rotate the token
clawdbot gateway config.patch

# Get new token
clawdbot gateway config.get

# Update your config.js with the new token
```

### Face animations not working

**Problem:** JavaScript error

**Solution:**
1. Open browser console (F12)
2. Look for error messages
3. Make sure you're using a modern browser:
   - Chrome 90+
   - Firefox 88+
   - Safari 14+

### Mock responses instead of real AI

**Problem:** `USE_CLAWDBOT = false`

**Solution:**
- Find this line in the HTML file
- Change to: `USE_CLAWDBOT = true;`
- Reload the page

## File Overview

### Main Files
- **face.html** - Main interactive face (best for desktop)
- **cli.html** - Face with draggable terminal (developer mode)
- **companion.html** - TUI-integrated version (Clawdbot terminal)

### Configuration
- **config.example.js** - Template (safe to commit)
- **config.js** - Your actual config (NEVER commit)
- **cors-proxy.js** - CORS proxy for remote gateways

### Documentation
- **README.md** - Project overview
- **SETUP.md** - This file
- **SECURITY.md** - Security guidelines (READ THIS!)
- **EMOTIONS_GUIDE.md** - All available emotions
- **CLAWDBOT_SETUP.md** - Detailed Clawdbot integration

## Advanced Configuration

### Custom Gateway URL

If Clawdbot runs on a different port or host:

```javascript
const CLAWDBOT_CONFIG = {
  baseUrl: 'http://192.168.1.100:18789',  // Custom IP/port
  // ...
};
```

### Different Agent

To use a specific Clawdbot agent:

```javascript
const CLAWDBOT_CONFIG = {
  model: 'clawdbot:coding',  // Use coding agent
  // ...
};
```

### Longer Timeout

For slow responses:

```javascript
const CLAWDBOT_CONFIG = {
  timeout: 60000,  // 60 seconds
  // ...
};
```

## Development Workflow

### Making Changes

1. **Edit the HTML/CSS/JS files directly**

2. **Test in browser:**
   ```bash
   open face.html
   ```
   (Reload with Cmd+R after changes)

3. **Check for errors:**
   - Open browser console (F12)
   - Look for red error messages

4. **Before committing:**
   ```bash
   # Make sure config.js is not included
   git status
   
   # Review all changes
   git diff
   
   # Search for secrets
   git diff | grep -i "token\|key\|password"
   
   # Should return nothing!
   ```

5. **Commit safely:**
   ```bash
   git add face.html README.md SECURITY.md
   git commit -m "Your change description"
   git push
   ```

### Adding New Emotions

1. **Edit the face.html file**

2. **Add emotion state in showEmotion():**
   ```javascript
   if (emotion === 'myemotion') {
     document.body.style.background = '#COLOR';
     // Set eye/mouth styles...
   }
   ```

3. **Add trigger words in getMockResponse():**
   ```javascript
   if (text.includes('trigger')) {
     return { text: 'Response', emotion: 'myemotion' };
   }
   ```

4. **Test it:**
   - Type the trigger word
   - Face should change to your emotion

5. **Document it in EMOTIONS_GUIDE.md**

## Production Deployment

### Deploy to Vercel/Netlify

1. **Make sure no secrets are committed:**
   ```bash
   git log --all -p | grep -i "token"
   # Should be empty or only show placeholders
   ```

2. **Deploy:**
   ```bash
   vercel deploy
   # or
   netlify deploy
   ```

3. **Set environment variables** in hosting dashboard:
   - `CLAWDBOT_URL`
   - `CLAWDBOT_TOKEN`

4. **Update fetch calls** to use environment variables

### Self-Hosted

1. **Use a web server:**
   ```bash
   # Python
   python3 -m http.server 8000
   
   # Node.js
   npx http-server
   
   # Apache/Nginx
   # Copy files to web root
   ```

2. **Configure HTTPS** for production

3. **Set up CORS** if gateway is on different domain

## Getting Help

- **Documentation:** Read SECURITY.md (especially before committing!)
- **Issues:** Check browser console for errors (F12)
- **Community:** Clawdbot Discord - https://discord.com/invite/clawd
- **Source:** GitHub - https://github.com/BrainsyETH/expressive-face

## What's Next?

After setup works:
- Try different emotions (see EMOTIONS_GUIDE.md)
- Customize colors and animations
- Integrate with your own projects
- Share your modifications!

---

**Remember: Never commit config.js or *.local.html files!**

See SECURITY.md for detailed security guidelines.
