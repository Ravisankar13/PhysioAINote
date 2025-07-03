import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createAdditionalComplexCases2024 } from "./additionalComplexCases2024";
import { competitionScheduler } from "./competitionScheduler";
import { notificationService } from "./notificationService";
import { realTimeCompetitionService } from "./realTimeCompetitionService";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Starting PhysioGPT server initialization...");
    
    // Register routes with error handling
    const server = await registerRoutes(app).catch(err => {
      console.error("Failed to register routes:", err);
      throw new Error(`Route registration failed: ${err.message}`);
    });
    log("Routes registered successfully");

    // Global error handler
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Enhanced error logging
      console.error(`[${new Date().toISOString()}] Error on ${req.method} ${req.path}:`, {
        error: err.message,
        stack: err.stack,
        status
      });
      
      // Only send response if not already sent
      if (!res.headersSent) {
        res.status(status).json({ 
          message,
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }
    });

    // Setup Vite or static serving with enhanced error handling
    try {
      if (app.get("env") === "development" || process.env.NODE_ENV === "development") {
        log("Setting up Vite development server...");
        await setupVite(app, server);
        log("Vite development server ready");
      } else {
        log("Setting up static file serving for production...");
        serveStatic(app);
        log("Static file serving configured");
      }
    } catch (err) {
      console.error("Failed to setup file serving:", err);
      // In production, if static files fail, try to continue anyway
      if (process.env.NODE_ENV === "production") {
        console.warn("Static file serving failed, server will continue without client files");
      } else {
        throw err;
      }
    }

    // Start server with enhanced error handling
    const port = 5000;
    const startServer = () => new Promise((resolve, reject) => {
      const serverInstance = server.listen(
        {
          port,
          host: "0.0.0.0",
          reusePort: true,
        },
        (err?: Error) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(serverInstance);
        }
      );

      serverInstance.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use`);
        }
        reject(err);
      });
    });

    await startServer();
    log(`PhysioGPT server running on port ${port}`);
    
    // Initialize background services with individual error handling
    const initializeBackgroundServices = async () => {
      // Auto-seed complex cases - temporarily disabled
      try {
        // await createAdditionalComplexCases2024(1);
        log('✓ Complex case seeding temporarily disabled');
      } catch (error) {
        log('Complex case seeding skipped:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Competition scheduler - temporarily disabled
      try {
        // competitionScheduler.startScheduler();
        log('✓ Competition scheduler temporarily disabled');
      } catch (error) {
        log('Competition scheduler failed to start:', error instanceof Error ? error.message : 'Unknown error');
      }

      // Real-time WebSocket server
      try {
        realTimeCompetitionService.setupWebSocket(server);
        log('✓ Real-time competition WebSocket server started');
      } catch (error) {
        log('Real-time WebSocket setup failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    };

    // Initialize background services without blocking server startup
    setImmediate(initializeBackgroundServices);
    
  } catch (err) {
    console.error("[FATAL] Server startup error:", err);
    console.error("Stack trace:", err instanceof Error ? err.stack : 'No stack trace available');
    
    // Attempt graceful shutdown
    try {
      // Close any open connections/resources here if needed
      log("Attempting graceful shutdown...");
    } catch (shutdownErr) {
      console.error("Error during shutdown:", shutdownErr);
    }
    
    process.exit(1);
  }
})();