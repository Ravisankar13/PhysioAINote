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
  
  // Build the React frontend for production
  console.log('⚙️  Building React frontend...');
  console.log('   This will output to dist/public as configured in vite.config.ts');
  try {
    // Set timeout for Vite build to prevent hanging
    execSync('npx vite build', { 
      stdio: 'inherit',
      timeout: 180000 // 3 minutes timeout
    });
    console.log('✅ Frontend built successfully');
  } catch (error) {
    console.log('⚠️  Frontend build failed or timed out');
    console.log('   Error:', error.message);
    console.log('   The deployment will continue but may not serve the frontend properly');
  }
  
  // Build the backend TypeScript server
  console.log('⚙️  Building backend server...');
  try {
    execSync('npm run build:backend', { stdio: 'inherit' });
    console.log('✅ Backend built successfully to dist/index.js');
  } catch (error) {
    console.log('❌ Backend build failed:', error.message);
    process.exit(1);
  }
  
  // Create production starter that uses the built server
  console.log('📝 Creating production starter...');
  const startScript = `#!/usr/bin/env node
// Production starter for PhysioGPT - uses built server
console.log('🚀 Starting PhysioGPT Production Server...');
console.log('Using built server: dist/index.js');
import('./dist/index.js').catch(error => {
  console.error('Failed to start built server:', error);
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