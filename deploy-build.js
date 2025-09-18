#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

console.log("🚀 Starting optimized Replit deployment build...");

try {
  // Clean dist directory
  if (existsSync("dist")) {
    console.log("🧹 Cleaning dist directory...");
    rmSync("dist", { recursive: true, force: true });
  }
  mkdirSync("dist", { recursive: true });

  // Skip frontend build - focus on backend fix first
  console.log("⏭️  Skipping frontend build for now (can be built separately)");

  // Build backend with selective bundling
  console.log("⚙️  Building backend with critical dependencies bundled...");
  console.log("   Bundling drizzle-orm and other runtime dependencies...");

  // Create a simple wrapper that ensures package.json is copied
  const packageJson = JSON.parse(execSync("cat package.json").toString());
  const productionDeps = packageJson.dependencies || {};

  // Build with esbuild - bundle the code but keep node_modules for packages
  execSync(
    `npx --yes esbuild@0.25.9 server/index.ts \
    --bundle \
    --platform=node \
    --format=esm \
    --outfile=dist/index.js \
    --target=node20 \
    --minify \
    --legal-comments=none \
    --external:fsevents \
    --external:@aws-sdk/* \
    --external:@google-cloud/* \
    --external:puppeteer \
    --external:pdf2pic \
    --external:sharp \
    --external:canvas \
    --external:bufferutil \
    --external:utf-8-validate`,
    {
      stdio: "inherit",
      timeout: 60000,
    },
  );

  // Create a minimal package.json for production
  const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: "module",
    scripts: {
      start: "NODE_ENV=production node index.js",
    },
    dependencies: {
      // Include only critical runtime dependencies
      "drizzle-orm": productionDeps["drizzle-orm"],
      "@libsql/client": productionDeps["@libsql/client"],
      "@neondatabase/serverless": productionDeps["@neondatabase/serverless"],
      express: productionDeps["express"],
      dotenv: productionDeps["dotenv"],
      zod: productionDeps["zod"],
      "drizzle-zod": productionDeps["drizzle-zod"],
      "@anthropic-ai/sdk": productionDeps["@anthropic-ai/sdk"],
      openai: productionDeps["openai"],
      stripe: productionDeps["stripe"],
      "express-session": productionDeps["express-session"],
      passport: productionDeps["passport"],
      "passport-local": productionDeps["passport-local"],
      ws: productionDeps["ws"],
      nanoid: productionDeps["nanoid"],
    },
  };

  writeFileSync(
    join("dist", "package.json"),
    JSON.stringify(prodPackageJson, null, 2),
  );

  console.log("📦 Created production package.json with critical dependencies");

  // Install production dependencies in dist folder
  console.log("📥 Installing production dependencies...");
  execSync(
    "cd dist && npm install --production --no-save --prefer-offline --no-audit",
    {
      stdio: "inherit",
      timeout: 120000,
    },
  );

  console.log("✅ Backend built with dependencies installed");
  console.log("🎉 Build completed successfully!");
  console.log("");
  console.log("To test locally: cd dist && npm start");

  process.exit(0);
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
