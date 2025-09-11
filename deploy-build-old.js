#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Replit deployment build...');

// Check memory availability
try {
  const memInfo = execSync('free -m | awk \'/^Mem:/{print $7}\'', { encoding: 'utf-8' }).trim();
  console.log(`📊 Memory available: ${memInfo} MB`);
} catch (error) {
  console.log('📊 Memory info not available on this system');
}

// Set Node memory limit for large bundles
process.env.NODE_OPTIONS = "--max-old-space-size=4096";

try {
  // Install dependencies (including dev dependencies needed for build)
  console.log('📦 Installing all dependencies...');
  // Use npm install since package-lock.json may not exist
  execSync('npm install --no-audit --no-fund', { stdio: 'inherit' });

  // Clean previous build
  console.log('🧹 Cleaning previous build...');
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }

  // Build frontend with deployment optimizations
  console.log('🎨 Building frontend with optimized chunking...');
  execSync('npx vite build --config vite.config.deployment.ts --mode production', { stdio: 'inherit' });

  console.log('✅ Frontend build complete!');

  // Check frontend bundle size
  try {
    const frontendSize = execSync('du -sh dist/public 2>/dev/null | cut -f1', { encoding: 'utf-8' }).trim();
    console.log(`📦 Frontend bundle size: ${frontendSize}`);
  } catch (error) {
    console.log('📦 Frontend bundle size: Unable to determine');
  }

  // Build backend with proper dependency bundling
  console.log('⚙️ Building backend with improved ESM dependency bundling...');
  execSync(`npx esbuild server/index.ts \
    --platform=node \
    --bundle \
    --format=esm \
    --outdir=dist \
    --minify \
    --log-level=warning \
    --define:process.env.NODE_ENV='"production"' \
    --keep-names \
    --target=node18 \
    --main-fields=module,main \
    --conditions=node,module \
    --resolve-extensions=.ts,.tsx,.mjs,.js,.cjs \
    --external:@types/* \
    --external:typescript \
    --external:tsx \
    --external:vite \
    --external:esbuild \
    --external:autoprefixer \
    --external:postcss \
    --external:tailwindcss \
    --external:drizzle-kit`, { stdio: 'inherit' });

  console.log('✅ Backend build complete!');

  // Check backend bundle size
  try {
    const backendSize = execSync('du -sh dist/index.js 2>/dev/null | cut -f1', { encoding: 'utf-8' }).trim();
    console.log(`📦 Backend bundle size: ${backendSize}`);
  } catch (error) {
    console.log('📦 Backend bundle size: Unable to determine');
  }

  // Verify that bundling was successful and no bare imports remain
  console.log('🔍 Verifying bundled output for completeness...');
  const { readFileSync } = await import('fs');
  const bundleContent = readFileSync('dist/index.js', 'utf-8');
  const bareImports = bundleContent.match(/(import\s+['"]drizzle-orm|['"]drizzle-orm[^'"]*['"])/g);
  
  if (bareImports) {
    console.error('❌ ERROR: Found bare drizzle-orm imports in bundle:');
    console.error(bareImports.join('\n'));
    console.error('This will cause runtime ERR_UNSUPPORTED_DIR_IMPORT errors');
    console.error('Bundling failed - external imports not properly inlined');
    process.exit(1);
  } else {
    console.log('✅ No bare drizzle-orm imports found - bundling successful!');
  }
  
  // Keep all dependencies for runtime stability
  console.log('📦 Keeping all dependencies for runtime stability...');

  // Create deployment health check
  const healthCheckContent = `export const healthCheck = (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
};`;

  writeFileSync('dist/health.js', healthCheckContent);

  console.log('🎉 Build completed successfully!');
  console.log('📁 Contents of dist directory:');
  execSync('ls -la dist/', { stdio: 'inherit' });
  console.log('🚀 Ready for deployment!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}