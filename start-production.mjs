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

// Enhanced dependency verification and installation
console.log('🔍 Performing comprehensive dependency check...');
const distPackageJson = resolve(__dirname, 'dist/package.json');
const distNodeModules = resolve(__dirname, 'dist/node_modules');
const fallbackInstaller = resolve(__dirname, 'dist/install-deps.mjs');

async function verifyCriticalPackages() {
  const criticalPackages = ['express', 'docx', 'drizzle-orm', 'openai', 'zod'];
  const missingPackages = criticalPackages.filter(pkg => 
    !existsSync(resolve(__dirname, 'dist/node_modules', pkg))
  );
  
  if (missingPackages.length > 0) {
    console.log(`❌ Critical packages missing: ${missingPackages.join(', ')}`);
    return false;
  }
  
  console.log(`✅ All ${criticalPackages.length} critical packages verified`);
  return true;
}

async function attemptDependencyInstallation() {
  const { execSync } = await import('child_process');
  
  console.log('🔄 Attempting dependency installation...');
  
  // Strategy 1: Use enhanced fallback installer if available
  if (existsSync(fallbackInstaller)) {
    try {
      console.log('📦 Using enhanced fallback dependency installer...');
      execSync('node install-deps.mjs', {
        cwd: resolve(__dirname, 'dist'),
        stdio: 'inherit',
        timeout: 600000, // 10 minute timeout for fallback (increased)
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      // Verify installation succeeded
      if (await verifyCriticalPackages()) {
        console.log('✅ Enhanced fallback installation succeeded');
        return true;
      } else {
        console.log('⚠️  Enhanced fallback installation completed but packages still missing');
      }
    } catch (installError) {
      console.log('⚠️  Enhanced fallback installation failed:', installError.message);
    }
  }
  
  // Strategy 2: Direct npm install with retries
  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📦 Attempting direct npm install (attempt ${attempt}/${maxRetries})...`);
      execSync('npm install --omit=dev --prefer-offline --no-audit --no-fund', {
        cwd: resolve(__dirname, 'dist'),
        stdio: 'inherit',
        timeout: 420000, // 7 minutes
        env: { 
          ...process.env, 
          NODE_ENV: 'production',
          NPM_CONFIG_LOGLEVEL: 'warn'
        }
      });
      
      if (await verifyCriticalPackages()) {
        console.log('✅ Direct npm install succeeded');
        return true;
      }
    } catch (installError) {
      console.log(`⚠️  Direct install attempt ${attempt} failed:`, installError.message);
      if (attempt < maxRetries) {
        console.log('   Retrying in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  console.log('❌ All dependency installation strategies failed');
  return false;
}

if (existsSync(distPackageJson)) {
  console.log('✅ Found dist/package.json');
  
  // Check if dependencies exist and are complete
  const hasNodeModules = existsSync(distNodeModules);
  const hasCriticalPackages = hasNodeModules && await verifyCriticalPackages();
  
  if (!hasNodeModules) {
    console.log('⚠️  dist/node_modules directory missing');
    const installSuccess = await attemptDependencyInstallation();
    if (!installSuccess) {
      console.log('🔄 Dependency installation failed, will attempt to use source files');
    }
  } else if (!hasCriticalPackages) {
    console.log('⚠️  Dependencies exist but critical packages are missing');
    const installSuccess = await attemptDependencyInstallation();
    if (!installSuccess) {
      console.log('🔄 Dependency repair failed, will attempt to use source files');
    }
  } else {
    console.log('✅ All dependencies verified and ready');
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