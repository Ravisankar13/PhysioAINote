#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, readFileSync, writeFileSync } from 'fs';

console.log('🚀 Starting Replit deployment build...');

// Set production environment
process.env.NODE_ENV = "production";
process.env.NODE_OPTIONS = "--max-old-space-size=2048"; // Conservative memory limit

try {
  // Step 1: Clean previous build
  console.log('🧹 Cleaning previous build...');
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }

  // Step 2: Ensure critical dependencies are in package.json
  console.log('📋 Ensuring critical dependencies...');
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  
  // Add missing critical dependencies
  if (!packageJson.dependencies) packageJson.dependencies = {};
  
  // Ensure drizzle-orm is present (critical for runtime)
  if (!packageJson.dependencies['drizzle-orm']) {
    packageJson.dependencies['drizzle-orm'] = '^0.30.0';
    console.log('  Added drizzle-orm');
  }
  if (!packageJson.dependencies['drizzle-zod']) {
    packageJson.dependencies['drizzle-zod'] = '^0.5.1';
    console.log('  Added drizzle-zod');
  }
  
  // Save updated package.json
  writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ Dependencies verified');

  // Step 3: Install dependencies (simple, no cleaning)
  console.log('📦 Installing dependencies...');
  execSync('npm install --production=false --no-audit --no-fund', { 
    stdio: 'inherit',
    timeout: 300000 // 5 minute timeout
  });
  console.log('✅ Dependencies installed');

  // Step 4: Build frontend with fallback config
  console.log('🎨 Building frontend...');
  let viteConfig = 'vite.config.ts';
  if (existsSync('vite.config.deployment.js')) {
    viteConfig = 'vite.config.deployment.js';
  } else if (existsSync('vite.config.deployment.ts')) {
    viteConfig = 'vite.config.deployment.ts';
  }
  
  execSync(`npx vite build --config ${viteConfig}`, { 
    stdio: 'inherit',
    timeout: 180000 // 3 minute timeout
  });
  console.log('✅ Frontend build complete');

  // Step 5: Build backend - BUNDLE EVERYTHING
  console.log('⚙️ Building backend (fully bundled)...');
  
  // Use esbuild with minimal externals (only dev tools)
  execSync(`npx esbuild server/index.ts \
    --platform=node \
    --bundle \
    --format=esm \
    --outdir=dist \
    --minify \
    --target=node18 \
    --external:vite \
    --external:@vitejs/* \
    --external:esbuild \
    --external:drizzle-kit \
    --external:tsx`, { 
    stdio: 'inherit',
    timeout: 120000 // 2 minute timeout
  });
  
  console.log('✅ Backend build complete');

  // Step 6: Quick verification
  if (existsSync('dist/index.js')) {
    const distSize = readFileSync('dist/index.js', 'utf-8').length;
    console.log(`📊 Bundle size: ${(distSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('🎉 Build completed successfully!');
    process.exit(0);
  } else {
    console.error('❌ Build output not found!');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  if (error.stderr) {
    console.error('Error details:', error.stderr.toString());
  }
  process.exit(1);
}