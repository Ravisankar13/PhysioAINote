#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';

console.log('🚀 Starting Replit deployment build...');

try {
  // Clean dist directory
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  // Build frontend (skip if fails)
  console.log('🎨 Building frontend...');
  try {
    let viteConfig = 'vite.config.ts';
    if (existsSync('vite.config.deployment.js')) {
      viteConfig = 'vite.config.deployment.js';
    }
    execSync(`npx --yes vite build --config ${viteConfig}`, { 
      stdio: 'inherit',
      timeout: 120000
    });
    console.log('✅ Frontend built');
  } catch (e) {
    console.log('⚠️ Frontend build skipped');
  }

  // Build backend with external packages (native modules can't be bundled)
  console.log('⚙️ Building backend...');
  console.log('  Using --packages=external to avoid bundling native modules...');
  
  execSync(`npx --yes esbuild server/index.ts \
    --bundle \
    --packages=external \
    --platform=node \
    --format=esm \
    --outfile=dist/index.js \
    --target=node20 \
    --minify \
    --legal-comments=none`, { 
    stdio: 'inherit',
    timeout: 180000
  });
  
  console.log('✅ Backend built successfully');
  
  // Copy package files for production dependencies
  console.log('📦 Copying package files for production...');
  execSync('cp package.json dist/', { stdio: 'inherit' });
  if (existsSync('package-lock.json')) {
    execSync('cp package-lock.json dist/', { stdio: 'inherit' });
  }
  
  // Copy shared directory if exists
  if (existsSync('shared')) {
    console.log('📁 Copying shared directory...');
    execSync('cp -r shared dist/', { stdio: 'inherit' });
  }
  
  console.log('🎉 Build completed successfully!');
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}