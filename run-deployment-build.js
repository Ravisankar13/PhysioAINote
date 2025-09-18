#!/usr/bin/env node

// This script is called by the standard npm build command for deployment
// It uses an optimized build configuration to handle large dependencies

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Running optimized deployment build...');

// Check if we should use the optimized build based on environment
const useOptimizedBuild = process.env.REPLIT_DEPLOYMENT === 'true' || 
                         process.env.NODE_ENV === 'production' ||
                         process.argv.includes('--optimize');

if (useOptimizedBuild && fs.existsSync('./deploy-build.sh')) {
  console.log('Using optimized deployment build script...');
  try {
    execSync('./deploy-build.sh', { stdio: 'inherit' });
    process.exit(0);
  } catch (error) {
    console.error('Optimized build failed, falling back to standard build...');
  }
}

// Fallback to standard build with memory optimization
console.log('Running standard build with memory optimization...');
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

try {
  // Build frontend with deployment config for correct base paths
  console.log('Building frontend...');
  execSync('npx vite build --config vite.config.deployment.ts --mode production', { stdio: 'inherit' });
  
  // Build backend - use working deploy-server.mjs approach (no problematic bundling)
  console.log('Configuring backend...');
  console.log('Using deploy-server.mjs (skipping problematic esbuild bundling)');
  
  // Create production starter script
  const startScript = `#!/usr/bin/env node
// Production starter for PhysioGPT - uses working deploy-server.mjs
console.log('🚀 Starting PhysioGPT Production Server...');
console.log('Using deploy-server.mjs with all dependencies available');
import('./deploy-server.mjs').catch(error => {
  console.error('Failed to start production server:', error);
  process.exit(1);
});`;
  
  fs.writeFileSync('start-production.mjs', startScript);
  
  console.log('✅ Build completed successfully!');
  console.log('📋 Production files ready:');
  console.log('   - Frontend: Built to dist/public');
  console.log('   - Backend: Using deploy-server.mjs');
  console.log('   - Start script: start-production.mjs');
  process.exit(0);
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}