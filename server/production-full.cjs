// Production server for PhysioGPT Platform
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// CORS headers for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'production'
  });
});

// Import and register API routes
try {
  // Try to load compiled routes
  const routesPath = path.join(__dirname, 'dist', 'server', 'routes.js');
  if (fs.existsSync(routesPath)) {
    const { registerRoutes } = require(routesPath);
    registerRoutes(app);
    console.log('✅ API routes loaded from compiled source');
  } else {
    // Fallback: Basic API routes
    console.log('⚠️ Using fallback API routes');
    
    // Mock user endpoint
    app.get('/api/user', (req, res) => {
      res.status(401).json({ message: 'Not authenticated' });
    });
    
    // Mock login endpoint
    app.post('/api/login', (req, res) => {
      const { username, password } = req.body;
      if (username && password) {
        res.json({
          id: 1,
          username: username,
          email: `${username}@example.com`,
          fullName: username,
          membershipTier: 'free'
        });
      } else {
        res.status(400).json({ error: 'Invalid credentials' });
      }
    });
    
    // Mock pattern recognition endpoints
    app.get('/api/pattern-recognition/stats', (req, res) => {
      res.json({ totalPlayers: 5, totalAttempts: 100 });
    });
    
    app.get('/api/pattern-recognition/leaderboard', (req, res) => {
      res.json([]);
    });
    
    app.get('/api/home/global-leaderboard', (req, res) => {
      res.json([]);
    });
    
    app.get('/api/home/platform-stats', (req, res) => {
      res.json({ totalUsers: 63, totalCompetitions: 10 });
    });
    
    app.get('/api/home/featured-competitions', (req, res) => {
      res.json([]);
    });
    
    // Generic API endpoint
    app.all('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });
  }
} catch (error) {
  console.error('Error loading routes:', error);
  // Continue with basic endpoints
}

// Serve static files from the built React app
const clientDistPath = path.join(__dirname, 'dist', 'client');
const clientDistExists = fs.existsSync(clientDistPath);

if (clientDistExists) {
  console.log('✅ Serving React app from:', clientDistPath);
  
  // Serve static assets
  app.use('/assets', express.static(path.join(clientDistPath, 'assets')));
  app.use(express.static(clientDistPath));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Application not found. Please build the frontend.');
    }
  });
} else {
  console.log('⚠️ React build not found at:', clientDistPath);
  console.log('⚠️ Serving fallback HTML');
  
  // Fallback HTML when React app is not built
  app.get('*', (req, res) => {
    res.send(`
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
            max-width: 600px;
          }
          h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          }
          .status {
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(10px);
            padding: 2rem;
            border-radius: 15px;
            margin-top: 2rem;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          }
          .status h2 {
            color: #4ade80;
            margin-bottom: 1rem;
          }
          .status p {
            margin: 0.5rem 0;
            opacity: 0.95;
          }
          .warning {
            background: rgba(255,193,7,0.2);
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1.5rem;
            border: 1px solid rgba(255,193,7,0.3);
          }
          .warning h3 {
            color: #ffc107;
            margin-bottom: 0.5rem;
          }
          a {
            color: #4ade80;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏥 PhysioGPT Platform</h1>
          <div class="status">
            <h2>✓ Server Running</h2>
            <p>Port: ${PORT}</p>
            <p>Time: ${new Date().toISOString()}</p>
            <p>Environment: ${process.env.NODE_ENV || 'production'}</p>
            <p>API Status: <a href="/api">Check API</a></p>
            <p>Health: <a href="/health">Check Health</a></p>
          </div>
          <div class="warning">
            <h3>⚠️ Frontend Not Built</h3>
            <p>The React application needs to be built for production.</p>
            <p>Run: npm run build:frontend</p>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 PhysioGPT Production Server`);
  console.log(`📍 Running on http://0.0.0.0:${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'production'}`);
  
  if (clientDistExists) {
    console.log(`✅ Serving full application`);
  } else {
    console.log(`⚠️ Serving API only (frontend not built)`);
  }
});

// Graceful shutdown
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