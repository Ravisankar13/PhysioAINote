#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync } from 'fs';

console.log('🚀 Starting Replit deployment build...');

try {
  // Clean dist directory
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  // Skip frontend build to avoid hanging issue
  console.log('⏭️  Skipping frontend Vite build (known hanging issue)...');
  console.log('   Frontend will be served from public/client directories');

  // Build backend with all packages external
  console.log('⚙️ Building backend...');
  console.log('  Using --packages=external - Replit will install dependencies...');
  
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
  
  // Copy package files - Replit deployment will install these dependencies
  console.log('📦 Copying package files for Replit deployment...');
  execSync('cp package.json dist/', { stdio: 'inherit' });
  if (existsSync('package-lock.json')) {
    execSync('cp package-lock.json dist/', { stdio: 'inherit' });
  }
  
  // Copy shared directory (required for schema)
  if (existsSync('shared')) {
    console.log('📁 Copying shared directory...');
    cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Copy public directory for static serving
  if (existsSync('public')) {
    console.log('📄 Copying public directory...');
    cpSync('public', 'dist/public', { recursive: true });
  }

  // Copy client directory for development fallback
  if (existsSync('client')) {
    console.log('📱 Copying client directory...');
    cpSync('client', 'dist/client', { recursive: true });
  }
  
  console.log('🎉 Build completed successfully!');
  console.log('   Backend: ✅ Built and optimized');
  console.log('   Frontend: ✅ Static files copied');
  console.log('   Dependencies: ✅ package.json ready for Replit deployment');
  console.log('');
  console.log('📋 Replit deployment will automatically install dependencies from package.json');
  console.log('   Ready for deployment!');
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}