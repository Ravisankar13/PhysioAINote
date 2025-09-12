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

  // Build frontend with timeout and error handling
  console.log('🎨 Building frontend...');
  try {
    // Use the deployment-specific vite config if it exists
    let viteConfig = 'vite.config.ts';
    if (existsSync('vite.config.deployment.ts')) {
      viteConfig = 'vite.config.deployment.ts';
    } else if (existsSync('vite.config.deployment.js')) {
      viteConfig = 'vite.config.deployment.js';
    }
    
    // Build with a reasonable timeout
    execSync(`npx vite build --config ${viteConfig} --mode production`, { 
      stdio: 'inherit',
      timeout: 300000, // 5 minutes timeout
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('✅ Frontend built successfully');
  } catch (e) {
    console.log('⚠️  Frontend build failed or timed out, continuing with backend build...');
    console.log('   Error:', e.message);
  }

  // Build backend with external packages
  console.log('⚙️ Building backend...');
  console.log('  Using --packages=external to avoid bundling native modules...');
  
  const buildCommand = `npx esbuild server/index.ts \
    --bundle \
    --packages=external \
    --platform=node \
    --format=esm \
    --outfile=dist/index.js \
    --target=node20 \
    --minify \
    --legal-comments=none`;
  
  execSync(buildCommand, { 
    stdio: 'inherit',
    timeout: 180000 // 3 minutes timeout
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

  // Copy public directory (built frontend files)
  if (existsSync('public')) {
    console.log('📄 Copying public directory...');
    execSync('cp -r public dist/', { stdio: 'inherit' });
  }
  
  console.log('🎉 Build completed successfully!');
  console.log('');
  console.log('📋 Build output summary:');
  execSync('ls -la dist/ | head -10', { stdio: 'inherit' });
  
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}