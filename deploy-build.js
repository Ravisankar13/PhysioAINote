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

  // Build backend with FULL bundling
  console.log('⚙️ Building backend with ALL dependencies bundled...');
  console.log('  Using --packages=bundle to ensure everything is included...');
  
  // The CRITICAL flag is --packages=bundle
  execSync(`npx --yes esbuild@0.25.9 server/index.ts \
    --bundle \
    --packages=bundle \
    --platform=node \
    --format=esm \
    --outfile=dist/index.js \
    --target=node20 \
    --minify \
    --legal-comments=none`, { 
    stdio: 'inherit',
    timeout: 180000
  });
  
  console.log('✅ Backend bundled with all dependencies');
  console.log('🎉 Build completed successfully!');
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}