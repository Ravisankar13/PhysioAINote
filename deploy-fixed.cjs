// Fixed production server for PhysioGPT Platform
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`Starting PhysioGPT server on port ${PORT}...`);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// CORS
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: 'production'
  });
});

// API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'PhysioGPT API Working',
    timestamp: new Date().toISOString()
  });
});

// API endpoints (return proper JSON responses)
app.get('/api/user', (req, res) => {
  res.json({ user: null, message: 'Authentication required' });
});

app.get('/api/pattern-recognition/leaderboard', (req, res) => {
  res.json({ leaderboard: [] });
});

app.get('/api/pattern-recognition/stats', (req, res) => {
  res.json({ stats: { totalUsers: 0, totalSessions: 0 } });
});

app.get('/api/home/global-leaderboard', (req, res) => {
  res.json({ leaderboard: [] });
});

app.get('/api/home/platform-stats', (req, res) => {
  res.json({ stats: { activeUsers: 0, totalExercises: 0, totalNotes: 0 } });
});

app.get('/api/home/featured-competitions', (req, res) => {
  res.json({ competitions: [] });
});

app.get('/api/trial/status', (req, res) => {
  res.json({ trial: { active: false, daysRemaining: 0 } });
});

// Main HTML page
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PhysioAI - Physiotherapy Management Platform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .nav {
      background: rgba(0,0,0,0.2);
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      backdrop-filter: blur(10px);
    }
    .nav-brand {
      font-size: 1.5rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .nav-links {
      display: flex;
      gap: 2rem;
      list-style: none;
    }
    .nav-links a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      transition: background 0.3s;
    }
    .nav-links a:hover {
      background: rgba(255,255,255,0.1);
    }
    .hero {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .hero-content {
      text-align: center;
      max-width: 800px;
    }
    .hero h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    .hero p {
      font-size: 1.25rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-top: 3rem;
    }
    .feature-card {
      background: rgba(255,255,255,0.1);
      padding: 1.5rem;
      border-radius: 1rem;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
    }
    .feature-card h3 {
      margin-bottom: 0.5rem;
      font-size: 1.25rem;
    }
    .feature-card p {
      opacity: 0.9;
      line-height: 1.5;
    }
    .status-badge {
      display: inline-block;
      background: #4ade80;
      color: #0a0a0a;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-top: 1rem;
    }
    @media (max-width: 768px) {
      .hero h1 { font-size: 2rem; }
      .nav-links { display: none; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-brand">
      <span>🏥</span>
      <span>PhysioAI</span>
    </div>
    <ul class="nav-links">
      <li><a href="#body-scanner">Body Scanner</a></li>
      <li><a href="#movement">Movement Analysis</a></li>
      <li><a href="#virtual">Virtual Patients</a></li>
      <li><a href="#soap">Enhanced SOAP</a></li>
      <li><a href="#research">Research</a></li>
    </ul>
  </nav>

  <main class="hero">
    <div class="hero-content">
      <h1>Advanced AI-Powered Physiotherapy Platform</h1>
      <p>Comprehensive clinical decision support for practitioners and students</p>
      
      <div class="features">
        <div class="feature-card">
          <h3>🔍 Body Scanner</h3>
          <p>Medical-grade anatomical visualization with enhanced skeletal detail and clinical measurements</p>
        </div>
        
        <div class="feature-card">
          <h3>🏃 Movement Analysis</h3>
          <p>Professional biomechanical analysis with 25+ real-time metrics including gait analysis</p>
        </div>
        
        <div class="feature-card">
          <h3>👤 Virtual Patients</h3>
          <p>3D patient models with customizable pathologies and movement restrictions</p>
        </div>
        
        <div class="feature-card">
          <h3>📝 Enhanced SOAP</h3>
          <p>AI-powered clinical documentation with automated transcription and PII protection</p>
        </div>
        
        <div class="feature-card">
          <h3>🤖 Clinical AI Assistant</h3>
          <p>Expert physiotherapy guidance based on leading methodologies and evidence-based practice</p>
        </div>
        
        <div class="feature-card">
          <h3>📚 Research Integration</h3>
          <p>AI-analyzed research database with bias assessment and clinical insights</p>
        </div>
      </div>
      
      <div class="status-badge">✓ System Operational</div>
    </div>
  </main>
</body>
</html>`);
});

// Catch all for other routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.url });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ PhysioGPT server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🌐 API endpoint: http://0.0.0.0:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});