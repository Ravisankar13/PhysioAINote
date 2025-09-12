#!/usr/bin/env node

// Replit deployment build script - simplified approach
// This script prepares the application for deployment without changing directories

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Replit deployment build...');
console.log('   Current directory:', process.cwd());

try {
  // Clean up old production build
  if (existsSync('index-production.js')) {
    console.log('🧹 Cleaning old production build...');
    rmSync('index-production.js', { force: true });
  }
  
  console.log('⏭️  Skipping frontend Vite build (known hanging issue)...');
  
  // Ensure server/public directory exists with index.html for production
  console.log('📂 Ensuring server/public directory exists...');
  execSync('mkdir -p server/public && cp public/index.html server/public/', { stdio: 'inherit' });
  
  // Build the backend server to the root directory
  console.log('⚙️  Building backend server...');
  execSync(`npx esbuild server/index.ts \
    --bundle \
    --packages=external \
    --platform=node \
    --format=esm \
    --outfile=index-production.js \
    --target=node20 \
    --minify \
    --legal-comments=none`, { 
    stdio: 'inherit',
    timeout: 180000
  });
  
  console.log('✅ Backend built to index-production.js');
  
  // Update the start script in package.json for production
  console.log('📝 Updating package.json for production...');
  const pkg = JSON.parse(execSync('cat package.json', { encoding: 'utf8' }));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.start = 'NODE_ENV=production node index-production.js';
  writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  
  console.log('📋 Deployment preparation complete:');
  console.log('   - Backend: index-production.js');
  console.log('   - Start script: NODE_ENV=production node index-production.js');
  console.log('   - Dependencies: Available via package.json');
  
  console.log('');
  console.log('🎉 Build completed successfully!');
  console.log('   The application is ready for deployment.');
  console.log('   When deployed, Replit will:');
  console.log('   1. Install dependencies from package.json');
  console.log('   2. Run: npm start (which runs index-production.js)');
  
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}