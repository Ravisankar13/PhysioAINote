#!/usr/bin/env node

// This script runs when npm run build is executed
// It provides an optimized build process for Replit deployment

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Starting optimized Replit deployment build...');
console.log('📊 Memory available:', Math.round(process.memoryUsage().heapTotal / 1024 / 1024), 'MB');

// Set memory limit
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Check if the optimized build script exists and use it
if (fs.existsSync('./deploy-build.sh')) {
  console.log('Using optimized deployment build script...');
  try {
    execSync('./deploy-build.sh', { stdio: 'inherit' });
    console.log('✅ Optimized build completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Optimized build failed:', error.message);
    process.exit(1);
  }
} else {
  // Fallback to direct optimized build
  console.log('Running direct optimized build...');
  
  try {
    // Clean dist
    execSync('rm -rf dist', { stdio: 'inherit' });
    
    // Build frontend with optimized config
    console.log('Building frontend with optimized config...');
    execSync('npx vite build --config vite.config.deployment.ts --mode production', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
    });
    
    // Build backend
    console.log('Building backend...');
    execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify', { 
      stdio: 'inherit' 
    });
    
    console.log('✅ Build completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}