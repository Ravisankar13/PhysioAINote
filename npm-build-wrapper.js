#!/usr/bin/env node

// This wrapper ensures the optimized build runs when npm run build is called
// It's designed to work with Replit's deployment system

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 NPM Build Wrapper - Starting optimized build...');

// Set memory limit for large bundles
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

try {
  // Check if deploy-build.sh exists and is executable
  if (fs.existsSync('./deploy-build.sh')) {
    console.log('✅ Found deploy-build.sh, using optimized build...');
    
    // Make sure it's executable
    execSync('chmod +x deploy-build.sh', { stdio: 'inherit' });
    
    // Run the optimized build
    execSync('bash ./deploy-build.sh', { stdio: 'inherit' });
  } else {
    // Fallback to direct build commands
    console.log('📦 Running direct optimized build...');
    
    // Clean
    execSync('rm -rf dist', { stdio: 'inherit' });
    
    // Build frontend with optimized config
    if (fs.existsSync('./vite.config.deployment.ts')) {
      console.log('Building frontend with deployment config...');
      execSync('npx vite build --config vite.config.deployment.ts --mode production', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
    } else {
      console.log('Building frontend with standard config...');
      execSync('npx vite build', { stdio: 'inherit' });
    }
    
    // Build backend
    console.log('Building backend...');
    execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify', { 
      stdio: 'inherit' 
    });
  }
  
  console.log('✅ Build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}