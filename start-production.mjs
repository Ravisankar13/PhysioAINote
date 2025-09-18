#!/usr/bin/env node
// Production starter for PhysioGPT - enhanced with logging
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting PhysioGPT Production Server...');
console.log('📍 Current directory:', process.cwd());
console.log('🏗️  Build time:', process.env.BUILD_TIME || 'Unknown');
console.log('🌍 Environment:', process.env.NODE_ENV || 'Unknown');
console.log('🔌 Port:', process.env.PORT || '5000');

// Check for dependencies before starting server
console.log('🔍 Checking dependencies...');
const distPackageJson = resolve(__dirname, 'dist/package.json');
const distNodeModules = resolve(__dirname, 'dist/node_modules');
const fallbackInstaller = resolve(__dirname, 'dist/install-deps.mjs');

if (existsSync(distPackageJson)) {
  console.log('✅ Found dist/package.json');
  
  if (!existsSync(distNodeModules)) {
    console.log('⚠️  Dependencies missing in dist directory');
    console.log('🔄 Attempting to install dependencies...');
    
    if (existsSync(fallbackInstaller)) {
      try {
        console.log('📦 Running fallback dependency installer...');
        const { execSync } = await import('child_process');
        execSync('cd dist && node install-deps.mjs', {
          stdio: 'inherit',
          timeout: 300000, // 5 minute timeout
          env: { ...process.env, NODE_ENV: 'production' }
        });
        console.log('✅ Dependencies installed successfully');
      } catch (installError) {
        console.log('⚠️  Fallback installation failed:', installError.message);
        console.log('🔄 Will try to continue with source files...');
      }
    } else {
      console.log('⚠️  Fallback installer not found, trying direct npm install...');
      try {
        const { execSync } = await import('child_process');
        execSync('cd dist && npm install --omit=dev', {
          stdio: 'inherit',
          timeout: 300000,
          env: { ...process.env, NODE_ENV: 'production' }
        });
        console.log('✅ Direct npm install successful');
      } catch (directInstallError) {
        console.log('⚠️  Direct npm install failed:', directInstallError.message);
      }
    }
  } else {
    console.log('✅ Dependencies found in dist/node_modules');
  }
} else {
  console.log('⚠️  No dist/package.json found, will use source files');
}

// Enhanced logging for debugging
console.log('📂 Checking build files...');
const distIndex = resolve(__dirname, 'dist/index.js');
const sourceIndex = resolve(__dirname, 'server/index.ts');

if (existsSync(distIndex)) {
  console.log('✅ Found built server at:', distIndex);
  console.log('🎯 Loading production server from dist/index.js...');
  
  // Force production mode before loading the built server
  process.env.NODE_ENV = 'production';
  process.env.VITE_NODE_ENV = 'production';
  console.log('🎯 Environment set to production mode');
  
  try {
    await import('./dist/index.js');
  } catch (error) {
    console.error('❌ Failed to load built server:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    console.log('🔄 Falling back to source server...');
    
    try {
      // Use tsx to run TypeScript in production
      const { spawn } = await import('child_process');
      const tsx = spawn('npx', ['tsx', 'server/index.ts'], { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      tsx.on('exit', (code) => {
        if (code !== 0) {
          console.error('💥 Server exited with code:', code);
          process.exit(code);
        }
      });
    } catch (fallbackError) {
      console.error('💥 Both built and source servers failed!');
      console.error('Built server error:', error.message);
      console.error('Source server error:', fallbackError.message);
      process.exit(1);
    }
  }
} else {
  console.log('⚠️  Built server not found, using source server...');
  console.log('📂 Loading from:', sourceIndex);
  
  try {
    // Use tsx to run TypeScript in production
    const { spawn } = await import('child_process');
    const tsx = spawn('npx', ['tsx', 'server/index.ts'], { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    tsx.on('exit', (code) => {
      if (code !== 0) {
        console.error('💥 Server exited with code:', code);
        process.exit(code);
      }
    });
  } catch (error) {
    console.error('❌ Failed to load source server:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    process.exit(1);
  }
}