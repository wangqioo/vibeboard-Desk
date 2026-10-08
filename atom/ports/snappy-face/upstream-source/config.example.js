// ============================================
// CLAWDBOT CONFIGURATION TEMPLATE
// ============================================
// 
// Copy this file to create your local config:
//   1. Copy this file (don't rename it)
//   2. In your HTML file, replace the hardcoded CONFIG with:
//      <script src="config.js"></script>
//   3. Add your real token to config.js
//   4. config.js is in .gitignore (never committed)
//
// ============================================

const CLAWDBOT_CONFIG = {
  baseUrl: 'http://localhost:18789',  // Your Clawdbot Gateway URL
  token: 'YOUR_GATEWAY_TOKEN_HERE',    // Get from: clawdbot gateway config.get
  model: 'clawdbot:main',              // Agent ID to use
  timeout: 30000                       // Response timeout in milliseconds
};

// ============================================
// HOW TO GET YOUR GATEWAY TOKEN:
// ============================================
// 
// Run in terminal:
//   clawdbot gateway config.get
// 
// Look for:
//   gateway:
//     token: "abc123..."
// 
// Copy the token value and paste above
// NEVER commit config.js to git!
//
// ============================================
