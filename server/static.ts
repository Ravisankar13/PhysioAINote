import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve attached assets (GLB files, images, etc.)
  const attachedAssetsPath = path.resolve(import.meta.dirname, "..", "attached_assets");
  if (fs.existsSync(attachedAssetsPath)) {
    app.use("/attached_assets", express.static(attachedAssetsPath));
    console.log(`✅ Serving attached assets from: ${attachedAssetsPath}`);
  } else {
    console.log(`⚠️  Attached assets directory not found: ${attachedAssetsPath}`);
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}