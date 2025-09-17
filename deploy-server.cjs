// Production server for PhysioGPT Platform
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('=== PhysioGPT Production Server Starting ===');
console.log('Port:', PORT);
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set'
});

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// CORS headers for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
  }
  next();
});

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.url}`);
  next();
});

// Health check endpoint - must work always
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: 'production',
    version: '1.0.0',
    node: process.version
  });
});

// API Routes with proper error handling
app.get('/api', (req, res) => {
  res.json({ 
    message: 'PhysioGPT API', 
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/user', (req, res) => {
  res.status(401).json({ message: 'Not authenticated' });
});

app.post('/api/login', (req, res) => {
  res.status(401).json({ message: 'Authentication not available in production mode' });
});

app.post('/api/register', (req, res) => {
  res.status(503).json({ message: 'Registration not available in production mode' });
});

app.get('/api/pattern-recognition/stats', (req, res) => {
  res.json({ 
    totalPlayers: 0, 
    totalAttempts: 0,
    message: 'Production API' 
  });
});

app.get('/api/pattern-recognition/leaderboard', (req, res) => {
  res.json([]);
});

app.get('/api/home/global-leaderboard', (req, res) => {
  res.json([]);
});

app.get('/api/home/platform-stats', (req, res) => {
  res.json({ 
    totalUsers: '0', 
    totalCompetitions: '0', 
    totalSOAPNotes: '0', 
    totalExercises: '0' 
  });
});

app.get('/api/home/featured-competitions', (req, res) => {
  res.json([]);
});

app.get('/api/trial/status', (req, res) => {
  res.json({ 
    hasUsedTrial: false, 
    isOnTrial: false,
    status: 'inactive',
    daysRemaining: 0
  });
});

// Catch all other API routes
app.use('/api/*', (req, res) => {
  console.log(`API endpoint not found: ${req.path}`);
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Static file serving - check multiple possible locations
const possibleStaticPaths = [
  path.join(process.cwd(), 'dist', 'public'),
  path.join(process.cwd(), 'dist', 'client'),
  path.join(__dirname, 'dist', 'public'),
  path.join(__dirname, 'dist', 'client'),
  path.join(process.cwd(), 'client', 'dist'),
  path.join(__dirname, 'client', 'dist')
];

let staticPath = null;

// Find the first existing path
for (const testPath of possibleStaticPaths) {
  if (fs.existsSync(testPath)) {
    const indexFile = path.join(testPath, 'index.html');
    if (fs.existsSync(indexFile)) {
      staticPath = testPath;
      console.log(`✅ Found static files at: ${testPath}`);
      break;
    }
  }
}

if (!staticPath) {
  console.log('⚠️ WARNING: No static files found. Checked paths:');
  possibleStaticPaths.forEach(p => {
    console.log(`  - ${p} (exists: ${fs.existsSync(p)})`);
  });
  
  // List contents of current directory for debugging
  console.log('\n📂 Current directory contents:');
  try {
    const files = fs.readdirSync(process.cwd());
    files.forEach(file => {
      const stat = fs.statSync(path.join(process.cwd(), file));
      console.log(`  ${stat.isDirectory() ? '[DIR]' : '[FILE]'} ${file}`);
    });
    
    // Check dist directory if it exists
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      console.log('\n📂 dist/ directory contents:');
      const distFiles = fs.readdirSync(distPath);
      distFiles.forEach(file => {
        const stat = fs.statSync(path.join(distPath, file));
        console.log(`  ${stat.isDirectory() ? '[DIR]' : '[FILE]'} ${file}`);
      });
      
      // Check dist/public if it exists
      const distPublicPath = path.join(distPath, 'public');
      if (fs.existsSync(distPublicPath)) {
        console.log('\n📂 dist/public/ directory contents (first 10 files):');
        const publicFiles = fs.readdirSync(distPublicPath);
        publicFiles.slice(0, 10).forEach(file => {
          const stat = fs.statSync(path.join(distPublicPath, file));
          console.log(`  ${stat.isDirectory() ? '[DIR]' : '[FILE]'} ${file}`);
        });
      }
    }
  } catch (err) {
    console.error('Error listing directory:', err.message);
  }
}

// Serve static files if found
if (staticPath) {
  // Serve static assets with proper caching
  app.use(express.static(staticPath, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        // Don't cache HTML files
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.match(/\.(js|css)$/)) {
        // Cache JS and CSS files
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    }
  }));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log(`Serving index.html for route: ${req.path}`);
      res.sendFile(indexPath);
    } else {
      console.error(`index.html not found at: ${indexPath}`);
      res.status(404).send('Application not found');
    }
  });
} else {
  // Fallback HTML when build files are not found
  app.get('/', (req, res) => {
    console.log('Serving fallback HTML - build files not found');
    res.status(503).send(`
<!DOCTYPE html>
<html>
<head>
  <title>PhysioGPT - Deployment Issue</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      border: 1px solid rgba(255,255,255,0.2);
    }
    h1 {
      margin-top: 0;
      font-size: 2rem;
    }
    .status {
      background: rgba(255,255,255,0.2);
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
    }
    .error-code {
      font-family: monospace;
      background: rgba(0,0,0,0.3);
      padding: 2px 6px;
      border-radius: 4px;
    }
    a {
      color: white;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 PhysioGPT Platform</h1>
    <div class="status">
      <h2>Temporary Deployment Configuration Issue</h2>
      <p>The application files are being configured. This is usually resolved automatically within a few minutes.</p>
      <p>Error Code: <span class="error-code">BUILD_FILES_NOT_FOUND</span></p>
      <p>Please refresh this page in a moment.</p>
    </div>
    <p>If this issue persists, please contact support.</p>
  </div>
</body>
</html>
    `);
  });
  
  // Handle all other routes
  app.get('*', (req, res) => {
    console.log(`404 - Route not found: ${req.path}`);
    res.status(404).send(`
<!DOCTYPE html>
<html>
<head>
  <title>404 - Not Found</title>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: system-ui, sans-serif;
      text-align: center;
      padding: 50px;
      background: #f5f5f5;
    }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>404 - Page Not Found</h1>
  <p>The requested page <code>${req.path}</code> was not found.</p>
  <p><a href="/">Go to Home</a></p>
</body>
</html>
    `);
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('=== Server Error ===');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('Error:', err.stack || err);
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('===========================================');
  console.log('✅ PhysioGPT Production Server Started');
  console.log(`🌐 Listening on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🚀 Environment: production`);
  console.log(`📁 Static files: ${staticPath || 'NOT FOUND'}`);
  console.log('===========================================');
});

// Handle shutdown signals gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('=== Uncaught Exception ===');
  console.error(err.stack || err);
  console.error('==========================');
  // Don't exit - try to keep serving
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== Unhandled Rejection ===');
  console.error('Reason:', reason);
  console.error('===========================');
  // Don't exit - try to keep serving
});