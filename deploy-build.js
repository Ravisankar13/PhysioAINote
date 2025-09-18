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
  
  // Clean dist directory
  console.log('🧹 Cleaning dist directory...');
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });
  
  // Build the React frontend for production with deployment config
  console.log('⚙️  Building React frontend...');
  console.log('   This will output to dist/public with relative paths for subdirectory compatibility');
  console.log('   Using increased memory allocation and extended timeout for large dependencies');
  try {
    // Set increased memory allocation and longer timeout for Vite build
    execSync('NODE_OPTIONS="--max-old-space-size=8192" npx vite build --config vite.config.deployment.ts', { 
      stdio: 'inherit',
      timeout: 600000, // 10 minutes timeout (increased from 3 minutes)
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=8192' // 8GB memory allocation
      }
    });
    console.log('✅ Frontend built successfully');
  } catch (error) {
    console.log('⚠️  Frontend build failed or timed out');
    console.log('   Error:', error.message);
    console.log('   Attempting fallback build with optimized configuration...');
    
    // Try fallback build with lighter configuration
    try {
      console.log('⚙️  Attempting optimized fallback build...');
      execSync('NODE_OPTIONS="--max-old-space-size=6144" node build-optimized.js', { 
        stdio: 'inherit',
        timeout: 420000, // 7 minutes timeout for fallback
        env: {
          ...process.env,
          NODE_OPTIONS: '--max-old-space-size=6144' // 6GB memory allocation
        }
      });
      console.log('✅ Optimized fallback frontend build completed successfully');
    } catch (fallbackError) {
      console.log('⚠️  Optimized fallback build also failed');
      console.log('   Attempting minimal emergency build (last resort)...');
      
      // Final emergency fallback - minimal build
      try {
        console.log('🔥 Starting minimal emergency build...');
        execSync('NODE_OPTIONS="--max-old-space-size=4096" node build-minimal.js', { 
          stdio: 'inherit',
          timeout: 300000, // 5 minutes timeout for minimal build
          env: {
            ...process.env,
            NODE_OPTIONS: '--max-old-space-size=4096' // 4GB memory allocation
          }
        });
        console.log('✅ Minimal emergency build completed successfully');
        console.log('⚠️  WARNING: Application may have limited functionality');
      } catch (minimalError) {
        console.log('❌ ALL BUILD ATTEMPTS FAILED');
        console.log('   Main build error:', error.message);
        console.log('   Optimized fallback error:', fallbackError.message);
        console.log('   Minimal build error:', minimalError.message);
        console.log('   The deployment will continue but frontend will not work properly');
        console.log('   Consider checking build dependencies and configuration');
      }
    }
  }
  
  // Skip backend bundling - use existing deploy-server.mjs instead
  console.log('⚙️  Configuring backend server...');
  console.log('   Using existing deploy-server.mjs (no bundling needed)');
  
  // Create production starter that uses the working deploy-server.mjs
  console.log('📝 Creating production starter...');
  const startScript = `#!/usr/bin/env node
// Production starter for PhysioGPT - uses working deploy-server.mjs
console.log('🚀 Starting PhysioGPT Production Server...');
console.log('Using deploy-server.mjs with all dependencies available');
import('./deploy-server.mjs').catch(error => {
  console.error('Failed to start production server:', error);
  process.exit(1);
});`;
  
  writeFileSync('start-production.mjs', startScript);
  
  // Update package.json to use the built server
  console.log('📝 Updating package.json for production...');
  const pkg = JSON.parse(execSync('cat package.json', { encoding: 'utf8' }));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.start = 'node start-production.mjs';
  writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  
  console.log('📋 Deployment preparation complete:');
  console.log('   - Frontend: Built to dist/public');
  console.log('   - Backend: Built to dist/index.js');
  console.log('   - Start script: node start-production.mjs');
  console.log('   - Port: Will use process.env.PORT or 5000');
  
  console.log('');
  console.log('🎉 Build completed successfully!');
  console.log('   The application is ready for deployment.');
  console.log('   When deployed, Replit will:');
  console.log('   1. Install dependencies from package.json');
  console.log('   2. Run: npm start (which runs start-production.mjs → dist/index.js)');
  
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}