import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Simple request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

(async () => {
  try {
    console.log("🚀 Starting PhysioGPT Production Server...");
    
    // Register API routes
    await registerRoutes(app);
    console.log("✅ API routes registered");
    
    // Serve static files from multiple possible locations
    const staticPaths = [
      path.join(__dirname, "../client/dist"),
      path.join(__dirname, "../dist/client"),
      path.join(__dirname, "public"),
      path.join(__dirname, "../public")
    ];
    
    // Find the first existing path
    const fs = await import("fs");
    let staticPath = staticPaths.find(p => fs.existsSync(p));
    
    if (staticPath) {
      console.log(`📁 Serving static files from: ${staticPath}`);
      app.use(express.static(staticPath));
    } else {
      console.log("⚠️  No static files found, serving basic HTML");
    }
    
    // Fallback route for SPA
    app.get("*", (req, res) => {
      // Try to serve index.html if it exists
      const indexPaths = [
        path.join(__dirname, "../client/dist/index.html"),
        path.join(__dirname, "../dist/client/index.html"),
        path.join(__dirname, "public/index.html"),
        path.join(__dirname, "../public/index.html")
      ];
      
      const indexPath = indexPaths.find(p => fs.existsSync(p));
      
      if (indexPath) {
        res.sendFile(indexPath);
      } else {
        // Serve a basic HTML page
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PhysioGPT Platform</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              h1 { font-size: 3em; margin-bottom: 0.5em; }
              p { font-size: 1.2em; line-height: 1.6; }
              .status { 
                background: rgba(255,255,255,0.2); 
                padding: 20px; 
                border-radius: 10px;
                margin: 20px 0;
              }
              a {
                color: white;
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <h1>🏥 PhysioGPT Platform</h1>
            <div class="status">
              <h2>✅ Server Status: Running</h2>
              <p>The PhysioGPT server is operational in production mode.</p>
              <p>API Endpoint: <a href="/api/health">/api/health</a></p>
              <p>Environment: ${process.env.NODE_ENV || 'production'}</p>
              <p>Note: The frontend application needs to be built for full functionality.</p>
            </div>
            <div class="status">
              <h3>Available Endpoints:</h3>
              <ul>
                <li><a href="/api/health">Health Check</a></li>
                <li><a href="/api">API Status</a></li>
              </ul>
            </div>
          </body>
          </html>
        `);
      }
    });
    
    // Global error handler
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error(`Error: ${err.message}`);
      console.error(err.stack);
      
      if (!res.headersSent) {
        res.status(err.status || 500).json({
          error: "Internal Server Error",
          message: process.env.NODE_ENV === 'development' ? err.message : "Something went wrong",
          timestamp: new Date().toISOString()
        });
      }
    });
    
    const PORT = process.env.PORT || 3000;
    
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log("═══════════════════════════════════════════");
      console.log(`✅ PhysioGPT Production Server Started`);
      console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
      console.log(`🏥 Health: http://0.0.0.0:${PORT}/health`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`🔧 Node.js: ${process.version}`);
      console.log(`💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      console.log("═══════════════════════════════════════════");
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
    
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
})();