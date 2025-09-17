import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting PhysioGPT Production Server (ES Module)...');
console.log('Port:', PORT);
console.log('Working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'production');

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// CORS for all requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      port: PORT,
      environment: process.env.NODE_ENV || 'production',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// API routes with error handling
app.get('/api', (req, res) => {
  try {
    res.json({ 
      message: 'PhysioGPT API', 
      status: 'operational',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('API root error:', error);
    res.status(500).json({ error: 'API error' });
  }
});

app.get('/api/user', (req, res) => {
  try {
    res.status(401).json({ message: 'Not authenticated' });
  } catch (error) {
    console.error('User API error:', error);
    res.status(500).json({ error: 'User API error' });
  }
});

app.get('/api/pattern-recognition/stats', (req, res) => {
  try {
    res.json({ 
      totalPlayers: 5, 
      totalAttempts: 100,
      averageScore: 75,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pattern recognition stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/pattern-recognition/leaderboard', (req, res) => {
  try {
    res.json([
      { rank: "1", username: "TestUser", score: 100 },
      { rank: "2", username: "Player2", score: 85 },
      { rank: "3", username: "User3", score: 70 }
    ]);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.get('/api/home/global-leaderboard', (req, res) => {
  try {
    res.json([
      { username: "TopPlayer", score: 950, rank: 1 },
      { username: "SecondPlace", score: 880, rank: 2 },
      { username: "ThirdPlace", score: 820, rank: 3 }
    ]);
  } catch (error) {
    console.error('Global leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

app.get('/api/home/platform-stats', (req, res) => {
  try {
    res.json({
      totalUsers: "150",
      totalCompetitions: "25",
      totalSOAPNotes: "500",
      totalExercises: "1200",
      activeUsers: "45",
      systemHealth: "excellent"
    });
  } catch (error) {
    console.error('Platform stats error:', error);
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

app.get('/api/home/featured-competitions', (req, res) => {
  try {
    res.json([
      {
        id: 1,
        name: "Quick Diagnosis Challenge",
        participants: 50,
        status: "active",
        description: "Test your diagnostic skills"
      }
    ]);
  } catch (error) {
    console.error('Featured competitions error:', error);
    res.status(500).json({ error: 'Failed to fetch featured competitions' });
  }
});

app.get('/api/trial/status', (req, res) => {
  try {
    res.json({ 
      hasUsedTrial: false, 
      isOnTrial: false, 
      daysRemaining: 0 
    });
  } catch (error) {
    console.error('Trial status error:', error);
    res.status(500).json({ error: 'Failed to fetch trial status' });
  }
});

// Catch all other API routes
app.use('/api/*', (req, res) => {
  try {
    console.log(`API 404: ${req.path}`);
    res.status(404).json({ error: 'API endpoint not found', path: req.path });
  } catch (error) {
    console.error('API catch-all error:', error);
    res.status(500).json({ error: 'API error' });
  }
});

// Serve static files - check multiple possible locations
const staticPaths = [
  path.join(process.cwd(), 'dist', 'public'),
  path.join(process.cwd(), 'dist', 'client'),
  path.join(process.cwd(), 'client', 'dist'),
  path.join(__dirname, 'dist', 'public')
];

let staticPath = null;
for (const testPath of staticPaths) {
  try {
    if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, 'index.html'))) {
      staticPath = testPath;
      console.log('✅ Found static files at:', testPath);
      break;
    }
  } catch (error) {
    console.error(`Error checking path ${testPath}:`, error.message);
  }
}

if (staticPath) {
  // Serve static files with proper caching
  app.use(express.static(staticPath, {
    maxAge: '1h',
    etag: true,
    lastModified: true
  }));
  
  // Serve React app for all other routes (SPA fallback)
  app.get('*', (req, res) => {
    try {
      const indexPath = path.join(staticPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application files not found');
      }
    } catch (error) {
      console.error('Static file serving error:', error);
      res.status(500).send('Server error');
    }
  });
} else {
  console.log('⚠️ No static files found, serving status page');
  
  app.get('/', (req, res) => {
    try {
      res.send(`<!DOCTYPE html>
<html>
<head>
  <title>PhysioGPT - Production Server</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    .container {
      text-align: center;
      background: rgba(255,255,255,0.1);
      padding: 40px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }
    .status { color: #4ade80; }
    .error { color: #f87171; }
    .info { color: #60a5fa; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 PhysioGPT Platform</h1>
    <p class="status">✅ Production server running</p>
    <p class="info">Port: ${PORT}</p>
    <p class="info">Environment: ${process.env.NODE_ENV || 'production'}</p>
    <p class="error">Frontend assets not found in expected locations</p>
    <p>Check <a href="/health" style="color: #60a5fa;">/health</a> for server status</p>
    <p>API available at <a href="/api" style="color: #60a5fa;">/api</a></p>
  </div>
</body>
</html>`);
    } catch (error) {
      console.error('Status page error:', error);
      res.status(500).send('Server error');
    }
  });
  
  app.get('*', (req, res) => {
    try {
      res.status(404).json({ 
        error: 'Page not found', 
        path: req.path,
        available: ['/health', '/api']
      });
    } catch (error) {
      console.error('404 handler error:', error);
      res.status(500).send('Server error');
    }
  });
}

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server with robust error handling
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('=== PhysioGPT Production Server Started ===');
    console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
    console.log(`🔌 API: http://0.0.0.0:${PORT}/api`);
    console.log(`📁 Static files: ${staticPath || 'Not found'}`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);
    console.log('============================================');
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    }
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}