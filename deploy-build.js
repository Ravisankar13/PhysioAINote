#!/usr/bin/env node

// Replit deployment build script
// This script prepares the application for deployment by:
// 1. Building the backend code
// 2. Keeping dependencies in package.json for Replit to install
// 3. Copying necessary directories

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Replit deployment build...');
console.log('   Current directory:', process.cwd());

try {
  // Clean up any old dist directory
  if (existsSync('dist')) {
    console.log('🧹 Cleaning old dist directory...');
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  console.log('⏭️  Skipping frontend Vite build (known hanging issue)...');
  
  // Build the backend server
  console.log('⚙️  Building backend server...');
  execSync(`npx esbuild server/index.ts \
    --bundle \
    --packages=external \
    --platform=node \
    --format=esm \
    --outfile=dist/server.js \
    --target=node20 \
    --minify \
    --legal-comments=none`, { 
    stdio: 'inherit',
    timeout: 180000
  });
  
  console.log('✅ Backend built to dist/server.js');
  
  // Copy package.json and package-lock.json to dist
  // Replit will install these dependencies automatically
  console.log('📦 Copying package files to dist...');
  execSync('cp package.json dist/package.json', { stdio: 'inherit' });
  if (existsSync('package-lock.json')) {
    execSync('cp package-lock.json dist/package-lock.json', { stdio: 'inherit' });
  }
  
  // Copy necessary directories to dist
  if (existsSync('shared')) {
    console.log('📁 Copying shared directory...');
    cpSync('shared', 'dist/shared', { recursive: true });
  }
  
  if (existsSync('public')) {
    console.log('📄 Copying public directory...');
    cpSync('public', 'dist/public', { recursive: true });
  }
  
  if (existsSync('client')) {
    console.log('📱 Copying client directory...');
    cpSync('client', 'dist/client', { recursive: true });
  }
  
  // Update the start script in dist/package.json to run the built server
  console.log('📝 Updating start script in dist/package.json...');
  execSync(`node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.start = 'NODE_ENV=production node server.js';
    fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));
  "`, { stdio: 'inherit' });
  
  console.log('📋 Deployment build structure:');
  execSync('ls -la dist/ | head -10', { stdio: 'inherit' });
  
  console.log('');
  console.log('🎉 Build completed successfully!');
  console.log('   - Backend: dist/server.js');
  console.log('   - Dependencies: dist/package.json (Replit will install)');
  console.log('   - Static files: dist/public, dist/client');
  console.log('   Ready for deployment!');
  
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}