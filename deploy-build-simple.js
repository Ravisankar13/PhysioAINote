#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, readFileSync } from 'fs';
import { writeFileSync } from 'fs';

console.log('🚀 Starting Replit deployment build (optimized)...');

// Set Node memory limit
process.env.NODE_OPTIONS = "--max-old-space-size=4096";
process.env.NODE_ENV = "production";

try {
  // Clean previous build
  console.log('🧹 Cleaning previous build...');
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }

  // Check if dependencies are installed
  if (!existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('npm install --no-audit --no-fund --prefer-offline', { stdio: 'inherit' });
  } else {
    console.log('✅ Dependencies already installed');
  }

  // Build frontend
  console.log('🎨 Building frontend...');
  const viteConfig = existsSync('vite.config.deployment.ts') 
    ? 'vite.config.deployment.ts' 
    : 'vite.config.ts';
  execSync(`npx vite build --config ${viteConfig} --mode production`, { stdio: 'inherit' });
  console.log('✅ Frontend build complete!');

  // Build backend with proper bundling (no --packages=external)
  console.log('⚙️ Building backend with bundled dependencies...');
  execSync(`npx esbuild server/index.ts \
    --platform=node \
    --bundle \
    --format=esm \
    --outdir=dist \
    --minify \
    --keep-names \
    --target=node18 \
    --main-fields=module,main \
    --conditions=node,module \
    --external:@types/* \
    --external:typescript \
    --external:tsx \
    --external:vite \
    --external:esbuild \
    --external:drizzle-kit \
    --external:autoprefixer \
    --external:postcss \
    --external:tailwindcss`, { stdio: 'inherit' });

  console.log('✅ Backend build complete!');

  // Verify no bare imports
  console.log('🔍 Verifying bundle integrity...');
  const bundleContent = readFileSync('dist/index.js', 'utf-8');
  const hasBareDrizzle = bundleContent.includes('"drizzle-orm/') || 
                          bundleContent.includes("'drizzle-orm/");
  
  if (hasBareDrizzle) {
    console.error('⚠️ Warning: Found potential bare drizzle-orm imports');
    console.error('This may cause runtime errors - please verify deployment');
  } else {
    console.log('✅ Bundle verification passed!');
  }

  console.log('🎉 Build completed successfully!');
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}