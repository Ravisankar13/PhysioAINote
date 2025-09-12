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

  // Always install dependencies to ensure they're up to date
  console.log('📦 Installing dependencies (this may take a moment)...');
  // Clean install to ensure all deps are present
  if (existsSync('node_modules')) {
    console.log('🧹 Cleaning old node_modules...');
    rmSync('node_modules', { recursive: true, force: true });
  }
  if (existsSync('package-lock.json')) {
    rmSync('package-lock.json', { force: true });
  }
  execSync('npm install --no-audit --no-fund', { stdio: 'inherit' });
  
  // Verify vite is installed
  if (!existsSync('node_modules/vite')) {
    console.error('❌ Vite was not installed properly, trying to install it directly...');
    execSync('npm install vite@5.4.20 @vitejs/plugin-react --save-dev --no-audit --no-fund', { stdio: 'inherit' });
  }
  console.log('✅ Dependencies installed');

  // Build frontend
  console.log('🎨 Building frontend...');
  // Try to find the best config file
  let viteConfig = 'vite.config.ts';
  
  // Check if vite is properly installed before choosing config
  if (existsSync('node_modules/vite/package.json')) {
    console.log('✓ Vite found in node_modules');
    if (existsSync('vite.config.deployment.js')) {
      viteConfig = 'vite.config.deployment.js';
    } else if (existsSync('vite.config.deployment.ts')) {
      viteConfig = 'vite.config.deployment.ts';
    }
  } else {
    console.log('⚠️ Vite not found in node_modules, using simple config');
    viteConfig = existsSync('vite.config.simple.js') ? 'vite.config.simple.js' : 'vite.config.ts';
  }
  
  console.log(`Using config: ${viteConfig}`);
  
  // Build with the selected config
  execSync(`npx --yes vite@5.4.20 build --config ${viteConfig} --mode production`, { stdio: 'inherit' });
  console.log('✅ Frontend build complete!');

  // Build backend with proper bundling (no --packages=external)
  console.log('⚙️ Building backend with bundled dependencies...');
  execSync(`npx --yes esbuild@0.25.9 server/index.ts \
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