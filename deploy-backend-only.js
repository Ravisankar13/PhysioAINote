#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync } from 'fs';

console.log('🚀 Starting Replit deployment build (backend-focused)...');

try {
  // Clean dist directory
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  // Skip frontend build - serve static files directly
  console.log('⏭️  Skipping frontend build to avoid timeout issues...');
  
  // Build backend with external packages
  console.log('⚙️  Building backend...');
  console.log('   Using --packages=external to avoid bundling native modules...');
  
  execSync(`npx esbuild server/index.ts \
    --bundle \
    --packages=external \
    --platform=node \
    --format=esm \
    --outfile=dist/index.js \
    --target=node20 \
    --minify \
    --legal-comments=none`, { 
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
  
  // Copy shared directory if exists (required for schema)
  if (existsSync('shared')) {
    console.log('📁 Copying shared directory...');
    cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Copy public directory for static serving
  if (existsSync('public')) {
    console.log('📄 Copying public directory for static serving...');
    cpSync('public', 'dist/public', { recursive: true });
  }

  // Copy client directory for development fallback
  if (existsSync('client')) {
    console.log('📱 Copying client directory for development fallback...');
    cpSync('client', 'dist/client', { recursive: true });
  }
  
  console.log('🎉 Build completed successfully!');
  console.log('');
  console.log('📋 Build output summary:');
  try {
    execSync('ls -la dist/ | head -10', { stdio: 'inherit' });
  } catch (e) {
    // Ignore ls errors
  }
  
  console.log('');
  console.log('✨ Ready for deployment!');
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}