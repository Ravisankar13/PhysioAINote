// Minimal production server for Reserved VM deployment
// This server is designed to work with the .replit port configuration
const http = require('http');
const fs = require('fs');
const path = require('path');

// CRITICAL: Use port 5000 to match .replit localPort configuration
// The .replit maps external port 80 to internal port 5000
const PORT = 5000;

console.log(`Starting PhysioGPT server on port ${PORT}...`);

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Log requests (but not HEAD requests to reduce noise)
  if (req.method !== 'HEAD') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  }
  
  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.url === '/health' || req.url === '/health/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      port: PORT,
      environment: 'production'
    }));
    return;
  }
  
  // API endpoint
  if (req.url === '/api' || req.url === '/api/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'PhysioGPT API Working',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Mock API endpoints for basic functionality
  if (req.url.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    // Mock responses for common endpoints
    if (req.url === '/api/user') {
      res.end(JSON.stringify({ message: 'Not authenticated' }));
    } else if (req.url === '/api/pattern-recognition/stats') {
      res.end(JSON.stringify({ totalPlayers: 5, totalAttempts: 100 }));
    } else if (req.url === '/api/pattern-recognition/leaderboard') {
      res.end(JSON.stringify([]));
    } else if (req.url === '/api/home/global-leaderboard') {
      res.end(JSON.stringify([]));
    } else if (req.url === '/api/home/platform-stats') {
      res.end(JSON.stringify({ totalUsers: 63, totalCompetitions: 10 }));
    } else if (req.url === '/api/home/featured-competitions') {
      res.end(JSON.stringify([]));
    } else {
      res.end(JSON.stringify({ message: 'API endpoint' }));
    }
    return;
  }
  
  // Try to serve static files
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './dist/client/index.html';
  } else {
    filePath = './dist/client' + req.url;
  }
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };
  
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (!err) {
      // File exists, serve it
      fs.readFile(filePath, (error, content) => {
        if (error) {
          console.error('Error reading file:', error);
          res.writeHead(500);
          res.end('Error reading file');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    } else {
      // File doesn't exist, serve index.html for client-side routing
      const indexPath = './dist/client/index.html';
      fs.access(indexPath, fs.constants.F_OK, (indexErr) => {
        if (!indexErr) {
          fs.readFile(indexPath, (error, content) => {
            if (error) {
              // Serve fallback HTML
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>PhysioGPT Platform</title>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      min-height: 100vh;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: white;
                    }
                    .container {
                      text-align: center;
                      padding: 2rem;
                    }
                    h1 {
                      font-size: 3rem;
                      margin-bottom: 1rem;
                    }
                    .status {
                      background: rgba(255,255,255,0.2);
                      padding: 2rem;
                      border-radius: 15px;
                      margin-top: 2rem;
                    }
                    .check { color: #4ade80; }
                    p { margin: 0.5rem 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>🏥 PhysioGPT Platform</h1>
                    <div class="status">
                      <p class="check">✓ Server is running</p>
                      <p>Port: ${PORT}</p>
                      <p>Status: Production</p>
                      <p>Health: <a href="/health" style="color: #4ade80;">Check</a></p>
                    </div>
                  </div>
                </body>
                </html>
              `);
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content, 'utf-8');
            }
          });
        } else {
          // No index.html, serve fallback
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>PhysioGPT Platform</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                }
                .container {
                  text-align: center;
                  padding: 2rem;
                }
                h1 {
                  font-size: 3rem;
                  margin-bottom: 1rem;
                }
                .status {
                  background: rgba(255,255,255,0.2);
                  padding: 2rem;
                  border-radius: 15px;
                  margin-top: 2rem;
                }
                .check { color: #4ade80; }
                p { margin: 0.5rem 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🏥 PhysioGPT Platform</h1>
                <div class="status">
                  <p class="check">✓ Server is running</p>
                  <p>Port: ${PORT}</p>
                  <p>Status: Production (No frontend built)</p>
                  <p>Health: <a href="/health" style="color: #4ade80;">Check</a></p>
                </div>
              </div>
            </body>
            </html>
          `);
        }
      });
    }
  });
});

// CRITICAL: Bind to 0.0.0.0, NOT localhost
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ PhysioGPT Production Server`);
  console.log(`📍 Listening on 0.0.0.0:${PORT}`);
  console.log(`🔧 External access will be on port 80 (mapped by .replit)`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
});

// Handle errors gracefully
server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use!`);
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});