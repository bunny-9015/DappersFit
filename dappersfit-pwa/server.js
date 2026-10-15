/**
 * Dappersfit PWA Local Development Server & API Proxy
 * Zero external dependencies (uses native Node.js http, https, fs, path)
 * Proxies /api/* to https://dappersfit.onrender.com with full CORS support
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const STATIC_ROOT = __dirname;
const REMOTE_BACKEND = 'https://dappersfit.onrender.com';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // Enable CORS on all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. API Proxy: Forward /api/* to Render
  if (pathname.startsWith('/api')) {
    const targetUrl = new URL(req.url, REMOTE_BACKEND);
    console.log(`[Proxy] ${req.method} ${pathname} -> ${targetUrl.href}`);

    const proxyReq = https.request(
      targetUrl,
      {
        method: req.method,
        headers: {
          ...req.headers,
          host: targetUrl.host,
          origin: REMOTE_BACKEND,
          referer: REMOTE_BACKEND
        }
      },
      (proxyRes) => {
        const headers = { ...proxyRes.headers };
        headers['access-control-allow-origin'] = '*';
        headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
        headers['access-control-allow-headers'] = '*';
        res.writeHead(proxyRes.statusCode || 200, headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      console.error(`[Proxy Error] ${pathname}:`, err.message);
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Backend Gateway Error', message: err.message }));
    });

    req.pipe(proxyReq);
    return;
  }

  // 2. Static File Serving
  let filePath = path.join(STATIC_ROOT, pathname === '/' ? 'index.html' : pathname);
  
  // Prevent directory traversal
  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing if requested file doesn't exist and not an asset
      if (!path.extname(pathname)) {
        filePath = path.join(STATIC_ROOT, 'index.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Disable caching during development so iPhone immediately receives latest changes
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  Dappersfit PWA Server running on port ${PORT}`);
  console.log(`  Local URL:   http://localhost:${PORT}`);
  console.log(`  iPhone Wi-Fi: http://10.3.76.133:${PORT}`);
  console.log(`  API Proxy:   /api/* -> ${REMOTE_BACKEND}/api/*`);
  console.log(`=======================================================`);
});
