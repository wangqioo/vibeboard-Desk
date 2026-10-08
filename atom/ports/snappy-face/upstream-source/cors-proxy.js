#!/usr/bin/env node
/**
 * Simple CORS proxy for Clawdbot gateway
 * Forwards requests to localhost:18789 and adds CORS headers
 */

const http = require('http');

const TARGET = 'http://localhost:18789';
const PORT = 8788;

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // Proxy the request
  const options = {
    hostname: 'localhost',
    port: 18789,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // Add CORS headers to response
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*'
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`✅ CORS proxy running on http://localhost:${PORT}`);
  console.log(`   Forwarding to ${TARGET}`);
  console.log(`\n📝 Update cli.html:`);
  console.log(`   baseUrl: 'http://localhost:${PORT}'`);
});
