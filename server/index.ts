import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createAdditionalComplexCases2024 } from "./additionalComplexCases2024";
import { competitionScheduler } from "./competitionScheduler";

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
    log("Starting route registration...");
    const server = await registerRoutes(app);
    log("Routes registered successfully");

    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log the error for debugging
      console.error(`Error on ${req.method} ${req.path}:`, err);
      
      // Only send response if not already sent
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
      
      // Don't re-throw the error to prevent server crash
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // Port 5000 is forwarded to external port 80 in production
    const port = 5000;
    server.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      async () => {
        log(`serving on port ${port}`);
        
        // Auto-seed complex cases in background - temporarily disabled
        // try {
        //   // Use system user ID 1 for seeding
        //   await createAdditionalComplexCases2024(1);
        //   log('✓ Complex case studies automatically seeded');
        // } catch (error) {
        //   // Silently handle - don't crash server if seeding fails
        //   log('Complex case seeding skipped (already exists or error)');
        // }
        
        // Add interactive questions to existing complex cases - temporarily disabled
        // try {
        //   const { addInteractiveQuestionsToComplexCases } = await import('./scripts/addInteractiveQuestions');
        //   await addInteractiveQuestionsToComplexCases();
        //   log('✓ Interactive questions added to complex cases');
        // } catch (error) {
        //   log('Interactive questions setup skipped (already exists or error)');
        // }

        // Start competition scheduler
        try {
          const { competitionScheduler } = await import('./competitionScheduler');
          competitionScheduler.startScheduler();
          log('✓ Competition scheduler started successfully');
        } catch (error) {
          log('Competition scheduler failed to start:', error);
        }
      }
    );
  } catch (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }
})();