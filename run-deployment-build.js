#!/usr/bin/env node

// This script is called by the standard npm build command for deployment
// It uses an optimized build configuration to handle large dependencies

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Running optimized deployment build...');

// Check if we should use the optimized build based on environment
const useOptimizedBuild = process.env.REPLIT_DEPLOYMENT === 'true' || 
                         process.env.NODE_ENV === 'production' ||
                         process.argv.includes('--optimize');

if (useOptimizedBuild && fs.existsSync('./deploy-build.sh')) {
  console.log('Using optimized deployment build script...');
  try {
    execSync('./deploy-build.sh', { stdio: 'inherit' });
    process.exit(0);
  } catch (error) {
    console.error('Optimized build failed, falling back to standard build...');
  }
}

// Fallback to standard build with memory optimization
console.log('Running standard build with memory optimization...');
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

try {
  // Build frontend
  console.log('Building frontend...');
  execSync('npx vite build --mode production', { stdio: 'inherit' });
  
  // Build backend
  console.log('Building backend...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}