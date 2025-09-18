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

    // Environment validation for deployment
    const requiredEnvVars = ['DATABASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
      console.warn(`⚠️  Server will continue but some features may not work correctly`);
    }

    // Optional environment variables with warnings
    const optionalEnvVars = ['OPENAI_API_KEY', 'STRIPE_SECRET_KEY'];
    const missingOptionalVars = optionalEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingOptionalVars.length > 0) {
      console.log(`ℹ️  Optional environment variables not set: ${missingOptionalVars.join(', ')}`);
    }

    // Add health check endpoint for deployment debugging
    app.get('/health', (req, res) => {
      const healthInfo = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || '5000',
        nodeVersion: process.version,
        platform: `${process.platform} ${process.arch}`,
        pid: process.pid,
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        },
        env: {
          database: process.env.DATABASE_URL ? '✅ configured' : '❌ not configured',
          openai: process.env.OPENAI_API_KEY ? '✅ configured' : '❌ not configured',
          buildTime: process.env.BUILD_TIME || 'unknown'
        }
      };
      
      console.log(`🏥 Health check accessed from ${req.ip || req.connection.remoteAddress}`);
      res.json(healthInfo);
    });

    // Register routes with error handling
    const server = await registerRoutes(app).catch(err => {
      console.error("❌ Failed to register routes:", err);
      console.error("Stack trace:", err.stack);
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
    const PORT = Number(process.env.PORT) || 5000;
    
    // Set build time for startup logging
    process.env.BUILD_TIME = process.env.BUILD_TIME || new Date().toISOString();

    // Enhanced error handling for deployment with better diagnostics
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception detected:');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('Time:', new Date().toISOString());
      console.error('Environment:', process.env.NODE_ENV);
      console.error('Memory usage:', process.memoryUsage());
      
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 Exiting process due to uncaught exception in production');
        process.exit(1);
      } else {
        console.error('⚠️  Continuing in development mode, but this should be fixed');
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Promise Rejection detected:');
      console.error('Promise:', promise);
      console.error('Reason:', reason);
      console.error('Time:', new Date().toISOString());
      console.error('Environment:', process.env.NODE_ENV);
      
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 Exiting process due to unhandled rejection in production');
        process.exit(1);
      } else {
        console.error('⚠️  Continuing in development mode, but this should be fixed');
      }
    });

    process.on('SIGTERM', () => {
      console.log('💤 SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('💤 SIGINT received, shutting down gracefully');
      process.exit(0);
    });

    const httpServer = app.listen(PORT, "0.0.0.0", () => {
      // Enhanced startup logging for deployment verification
      console.log(`✅ PhysioGPT Server successfully started`);
      console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏗️  Build time: ${process.env.BUILD_TIME || 'unknown'}`);
      console.log(`🔧 Node.js version: ${process.version}`);
      console.log(`📋 Platform: ${process.platform} ${process.arch}`);
      console.log(`🆔 Process ID: ${process.pid}`);
      console.log(`⏱️  Uptime: ${Math.round(process.uptime())}s`);
      console.log(`💾 Memory usage:`, {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
      });
      console.log(`🔑 Environment check:`, {
        database: process.env.DATABASE_URL ? '✅ configured' : '❌ not configured',
        openai: process.env.OPENAI_API_KEY ? '✅ configured' : '❌ not configured',
        port: `✅ ${PORT}`,
        host: '✅ 0.0.0.0'
      });
      console.log(`🏥 Health check available at: http://0.0.0.0:${PORT}/health`);
      console.log(`🚀 Server ready to accept connections`);
    }).on('error', (error: any) => {
      console.error(`❌ Failed to start server on port ${PORT}:`, error.message);
      if (error.code === 'EADDRINUSE') {
        console.error(`🚫 Port ${PORT} is already in use. Try a different port.`);
      } else if (error.code === 'EACCES') {
        console.error(`🚫 Permission denied to bind to port ${PORT}. Try a different port or run with elevated privileges.`);
      }
      process.exit(1);
    });

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

      // Real-time WebSocket server - temporarily disabled
      try {
        // realTimeCompetitionService.setupWebSocket(httpServer);
        log('✓ Real-time competition WebSocket server temporarily disabled');
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