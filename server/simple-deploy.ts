import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Basic middleware
app.use(express.json());

// Health check endpoint - MUST be first
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// API endpoint
app.get("/api", (req, res) => {
  res.status(200).json({ 
    message: "API is working",
    environment: process.env.NODE_ENV || "production"
  });
});

// Root path - serve basic HTML
app.get("/", (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>PhysioGPT Platform</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        h1 { font-size: 3em; }
        .status {
          background: rgba(255,255,255,0.2);
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }
        a { color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏥 PhysioGPT Platform</h1>
        <div class="status">
          <h2>✅ Server Running</h2>
          <p>The PhysioGPT backend is operational.</p>
          <p>API Status: <a href="/api">/api</a></p>
          <p>Health Check: <a href="/health">/health</a></p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start server
const PORT = parseInt(process.env.PORT || "3000", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});