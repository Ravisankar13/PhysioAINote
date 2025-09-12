#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync, writeFileSync } from 'fs';

console.log('🚀 Starting backend-only deployment build...');

try {
  // Clean dist directory
  if (existsSync('dist')) {
    console.log('🧹 Cleaning dist directory...');
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  console.log('⚙️  Building backend with proper dependency handling...');
  
  // Use esbuild with bundle flag to include all code
  // But keep node_modules dependencies external
  execSync(`npx --yes esbuild@0.25.9 server/index.ts \
    --bundle \
    --packages=external \
    --platform=node \
    --format=esm \
    --outfile=dist/index.js \
    --target=node20 \
    --minify=false \
    --sourcemap \
    --legal-comments=none`, { 
    stdio: 'inherit',
    timeout: 30000
  });
  
  console.log('✅ Backend code built');
  
  // Copy essential files and directories
  console.log('📦 Copying essential files...');
  
  // Copy package.json and package-lock.json
  cpSync('package.json', 'dist/package.json');
  if (existsSync('package-lock.json')) {
    cpSync('package-lock.json', 'dist/package-lock.json');
  }
  
  // Copy shared directory (contains schema.ts needed by drizzle)
  if (existsSync('shared')) {
    console.log('📁 Copying shared directory...');
    cpSync('shared', 'dist/shared', { recursive: true });
  }
  
  // Copy node_modules to ensure all dependencies are available
  if (existsSync('node_modules')) {
    console.log('📚 Copying node_modules (this may take a moment)...');
    cpSync('node_modules', 'dist/node_modules', { recursive: true });
  }
  
  // Copy public directory for static assets
  if (existsSync('public')) {
    console.log('🖼️  Copying public directory...');
    cpSync('public', 'dist/public', { recursive: true });
  }
  
  // Create a simple start script
  writeFileSync('dist/start.sh', `#!/bin/bash
export NODE_ENV=production
node index.js
`, { mode: 0o755 });
  
  console.log('✅ Build completed successfully!');
  console.log('');
  console.log('📝 Deployment notes:');
  console.log('   - Backend is built at dist/index.js');
  console.log('   - All dependencies are included in dist/node_modules');
  console.log('   - Run with: cd dist && npm start');
  console.log('   - Or: cd dist && ./start.sh');
  
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}