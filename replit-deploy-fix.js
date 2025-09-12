#!/usr/bin/env node

// Replit-specific deployment build script that avoids common issues
import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync } from 'fs';

console.log('🚀 Starting Replit deployment build...');
console.log('   Optimized for Replit autoscale deployment');

try {
  // Clean dist directory
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  // Build backend with external packages
  console.log('⚙️  Building backend server...');
  
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
    timeout: 180000
  });
  
  console.log('✅ Backend built successfully');
  
  // Copy package files
  console.log('📦 Copying package files...');
  execSync('cp package.json dist/', { stdio: 'inherit' });
  if (existsSync('package-lock.json')) {
    execSync('cp package-lock.json dist/', { stdio: 'inherit' });
  }
  
  // Copy shared directory (required for schema)
  if (existsSync('shared')) {
    console.log('📁 Copying shared directory...');
    cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Copy public directory
  if (existsSync('public')) {
    console.log('📄 Copying public directory...');
    cpSync('public', 'dist/public', { recursive: true });
  }

  // Copy client directory for fallback
  if (existsSync('client')) {
    console.log('📱 Copying client directory...');
    cpSync('client', 'dist/client', { recursive: true });
  }
  
  console.log('🎉 Build completed successfully!');
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}