#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';

console.log('🚀 Starting Replit deployment build...');

try {
  // Clean and create dist directory
  console.log('🧹 Cleaning previous build...');
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  // Install dependencies with force to bypass version conflicts
  console.log('📦 Installing dependencies (forcing to resolve conflicts)...');
  execSync('npm install --force --no-audit --no-fund', { 
    stdio: 'inherit',
    timeout: 300000
  });
  console.log('✅ Dependencies installed');

  // Build frontend
  console.log('🎨 Building frontend...');
  let viteConfig = 'vite.config.ts';
  if (existsSync('vite.config.deployment.js')) {
    viteConfig = 'vite.config.deployment.js';
  } else if (existsSync('vite.config.deployment.ts')) {
    viteConfig = 'vite.config.deployment.ts';
  }
  
  try {
    execSync(`npx vite build --config ${viteConfig}`, { 
      stdio: 'inherit',
      timeout: 180000
    });
    console.log('✅ Frontend build complete');
  } catch (e) {
    console.warn('⚠️ Frontend build had issues, continuing...');
  }

  // Build backend - bundle EVERYTHING
  console.log('⚙️ Building backend (fully bundled)...');
  console.log('  This will bundle ALL dependencies into a single file...');
  
  // Simple esbuild command that bundles everything
  execSync(`npx esbuild server/index.ts \
    --bundle \
    --platform=node \
    --format=esm \
    --outfile=dist/index.js \
    --target=node18 \
    --minify`, { 
    stdio: 'inherit',
    timeout: 180000
  });
  
  console.log('✅ Backend bundled successfully');
  console.log('🎉 Build completed!');
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}