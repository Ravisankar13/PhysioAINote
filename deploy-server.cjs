const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting PhysioGPT Production Server...');
console.log('Port:', PORT);
console.log('Working directory:', process.cwd());

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

// Logging
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
      environment: 'production'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// API routes with proper error handling
app.get('/api', (req, res) => {
  try {
    res.json({ message: 'PhysioGPT API', status: 'operational' });
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
    res.json({ totalPlayers: 5, totalAttempts: 100 });
  } catch (error) {
    console.error('Pattern recognition stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/pattern-recognition/leaderboard', (req, res) => {
  try {
    res.json([
      { rank: "1", username: "TestUser", score: 100 },
      { rank: "2", username: "Player2", score: 85 }
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
      { username: "SecondPlace", score: 880, rank: 2 }
    ]);
  } catch (error) {
    console.error('Global leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

app.get('/api/home/platform-stats', (req, res) => {
  try {
    res.json({
      totalUsers: "100",
      totalCompetitions: "25",
      totalSOAPNotes: "500",
      totalExercises: "1200"
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
        status: "active"
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

// Serve static files
const staticPaths = [
  path.join(process.cwd(), 'dist', 'public'),
  path.join(process.cwd(), 'dist', 'client'),
  path.join(process.cwd(), 'client', 'dist')
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
  // Serve static files
  app.use(express.static(staticPath, {
    maxAge: '1h'
  }));
  
  // Serve React app for all other routes
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
  console.log('⚠️ No static files found, serving fallback HTML');
  
  app.get('/', (req, res) => {
    try {
      res.send(`<!DOCTYPE html>
<html>
<head>
  <title>PhysioGPT - Starting Up</title>
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
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 PhysioGPT Platform</h1>
    <div class="spinner"></div>
    <p>Application is starting up...</p>
    <p>If this screen persists, please refresh the page.</p>
  </div>
  <script>
    setTimeout(() => {
      location.reload();
    }, 30000);
  </script>
</body>
</html>`);
    } catch (error) {
      console.error('Fallback HTML error:', error);
      res.status(500).send('Server error');
    }
  });
  
  app.get('*', (req, res) => {
    try {
      res.status(404).send('Page not found');
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
    message: error.message
  });
});

// Start server
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('=== PhysioGPT Production Server Started ===');
    console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
    console.log(`📁 Static files: ${staticPath || 'Not found'}`);
    console.log('============================================');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    server.close(() => process.exit(0));
  });

} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}