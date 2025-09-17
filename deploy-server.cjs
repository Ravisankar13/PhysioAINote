// Production server for PhysioGPT Platform
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

console.log(`Starting PhysioGPT production server on port ${PORT}...`);
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// CORS for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
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

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Import and use the actual backend routes
try {
  // Try to import the compiled backend
  const distPath = path.join(__dirname, 'dist', 'production.js');
  const serverPath = path.join(__dirname, 'dist', 'server.js');
  
  if (fs.existsSync(distPath)) {
    console.log('Loading production backend from dist/production.js...');
    const backend = require(distPath);
    if (backend && backend.app) {
      // Mount the backend routes
      app.use(backend.app);
      console.log('✅ Production backend loaded successfully');
    } else {
      console.log('⚠️ Backend loaded but no app exported');
    }
  } else if (fs.existsSync(serverPath)) {
    console.log('Loading production backend from dist/server.js...');
    const backend = require(serverPath);
    if (backend && backend.app) {
      // Mount the backend routes
      app.use(backend.app);
      console.log('✅ Production backend loaded successfully');
    } else {
      console.log('⚠️ Backend loaded but no app exported');
    }
  } else {
    console.log('⚠️ No compiled backend found, using fallback API routes');
    
    // Fallback API routes for basic functionality
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: 'production',
        backend: 'fallback'
      });
    });

    app.get('/api/user', (req, res) => {
      res.status(401).json({ message: 'Not authenticated' });
    });

    app.get('/api/pattern-recognition/leaderboard', (req, res) => {
      res.json([]);
    });

    app.get('/api/pattern-recognition/stats', (req, res) => {
      res.json({ totalPlayers: 0, totalAttempts: 0 });
    });

    app.get('/api/home/global-leaderboard', (req, res) => {
      res.json([]);
    });

    app.get('/api/home/platform-stats', (req, res) => {
      res.json({ totalUsers: '0', totalCompetitions: '0', totalSOAPNotes: '0', totalExercises: '0' });
    });

    app.get('/api/home/featured-competitions', (req, res) => {
      res.json([]);
    });

    app.get('/api/trial/status', (req, res) => {
      res.json({ status: 'inactive', daysRemaining: 0 });
    });

    // Catch all API routes
    app.use('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });
  }
} catch (error) {
  console.error('Error loading backend:', error);
  console.log('Using fallback API routes due to error');
  
  // Fallback health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'degraded',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });
}

// Serve static files from the built React app
const clientDistPath = path.join(__dirname, 'dist', 'public');
const clientDistPath2 = path.join(__dirname, 'dist', 'client');
const fallbackPath = path.join(__dirname, 'client', 'dist');

let staticPath = null;

if (fs.existsSync(clientDistPath)) {
  staticPath = clientDistPath;
  console.log(`Serving static files from: ${clientDistPath}`);
} else if (fs.existsSync(clientDistPath2)) {
  staticPath = clientDistPath2;
  console.log(`Serving static files from: ${clientDistPath2}`);
} else if (fs.existsSync(fallbackPath)) {
  staticPath = fallbackPath;
  console.log(`Serving static files from: ${fallbackPath}`);
} else {
  console.log('⚠️ No static files directory found!');
  console.log('Checked paths:');
  console.log(`  - ${clientDistPath}`);
  console.log(`  - ${clientDistPath2}`);
  console.log(`  - ${fallbackPath}`);
}

if (staticPath) {
  // Serve static assets
  app.use(express.static(staticPath, {
    maxAge: '1d',
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`index.html not found at ${indexPath}`);
      res.status(500).send('Application files not found');
    }
  });
} else {
  // Fallback when no static files are found
  app.get('/', (req, res) => {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PhysioGPT - Deployment Error</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
          }
          .error {
            background: #fee;
            border: 1px solid #fcc;
            padding: 20px;
            border-radius: 5px;
          }
          h1 { color: #c00; }
          pre {
            background: #f5f5f5;
            padding: 10px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Deployment Configuration Error</h1>
          <p>The React application files could not be found in the expected locations.</p>
          <p>This typically means the build process didn't complete properly.</p>
          <h3>Checked paths:</h3>
          <pre>${clientDistPath}
${clientDistPath2}
${fallbackPath}</pre>
          <h3>Current directory contents:</h3>
          <pre>${fs.readdirSync(process.cwd()).join('\n')}</pre>
        </div>
      </body>
      </html>
    `);
  });

  app.get('*', (req, res) => {
    res.status(404).send('Not found');
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ PhysioGPT production server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🌐 Environment: production`);
  console.log(`📂 Working directory: ${process.cwd()}`);
  
  // List directory contents for debugging
  try {
    const files = fs.readdirSync(process.cwd());
    console.log('📁 Root directory contents:', files.join(', '));
    
    if (fs.existsSync('dist')) {
      const distFiles = fs.readdirSync('dist');
      console.log('📁 dist/ contents:', distFiles.join(', '));
      
      if (fs.existsSync('dist/public')) {
        const publicFiles = fs.readdirSync('dist/public');
        console.log('📁 dist/public/ contents:', publicFiles.slice(0, 5).join(', '), '...');
      }
    }
  } catch (error) {
    console.error('Error listing directory:', error.message);
  }
});

// Graceful shutdown
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