#!/usr/bin/env node

/**
 * Deployment Test Script
 * Tests the fixes applied for deployment issues
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Testing deployment fixes...\n');

// Test 1: Check for duplicate methods in complexCaseService.ts
console.log('1. Checking for duplicate getUserComplexCaseAttempts methods...');
try {
  const complexServicePath = 'server/complexCaseService.ts';
  const content = fs.readFileSync(complexServicePath, 'utf8');
  const methodMatches = content.match(/async getUserComplexCaseAttempts/g);
  
  if (methodMatches && methodMatches.length > 1) {
    console.log('❌ Found duplicate getUserComplexCaseAttempts methods');
    process.exit(1);
  } else {
    console.log('✅ No duplicate methods found');
  }
} catch (err) {
  console.log('❌ Error checking complexCaseService.ts:', err.message);
  process.exit(1);
}

// Test 2: Check build output structure
console.log('\n2. Checking build output structure...');
const distPublicPath = 'dist/public';
if (fs.existsSync(distPublicPath)) {
  console.log('✅ dist/public directory exists');
  if (fs.existsSync(path.join(distPublicPath, 'index.html'))) {
    console.log('✅ index.html found in dist/public');
  } else {
    console.log('⚠️ index.html not found (run npm run build)');
  }
} else {
  console.log('⚠️ dist/public directory not found (run npm run build)');
}

// Test 3: Check server build
console.log('\n3. Checking server build...');
if (fs.existsSync('dist/index.js')) {
  console.log('✅ Server build exists at dist/index.js');
} else {
  console.log('⚠️ Server build not found (run npm run build)');
}

// Test 4: Check package.json scripts
console.log('\n4. Checking package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const { scripts } = packageJson;
  
  if (scripts.start === 'NODE_ENV=production node dist/index.js') {
    console.log('✅ Start script correctly configured for production');
  } else {
    console.log('❌ Start script not properly configured');
  }
  
  if (scripts.build && scripts.build.includes('vite build') && scripts.build.includes('esbuild')) {
    console.log('✅ Build script includes both frontend and backend builds');
  } else {
    console.log('❌ Build script not properly configured');
  }
} catch (err) {
  console.log('❌ Error checking package.json:', err.message);
}

// Test 5: Check server error handling improvements
console.log('\n5. Checking server error handling...');
try {
  const serverContent = fs.readFileSync('server/index.ts', 'utf8');
  if (serverContent.includes('Starting PhysioGPT server initialization') && 
      serverContent.includes('Enhanced error logging') &&
      serverContent.includes('FATAL] Server startup error')) {
    console.log('✅ Enhanced server error handling implemented');
  } else {
    console.log('❌ Enhanced error handling not found');
  }
} catch (err) {
  console.log('❌ Error checking server/index.ts:', err.message);
}

console.log('\n🎉 Deployment fix verification complete!');
console.log('\n📋 Summary of fixes applied:');
console.log('• Removed duplicate getUserComplexCaseAttempts method');
console.log('• Enhanced server startup error handling with detailed logging');
console.log('• Added graceful shutdown mechanism');
console.log('• Improved production mode detection');
console.log('• Fixed static file serving path (dist/public)');
console.log('• Updated package.json start script for production');

console.log('\n🚀 To deploy:');
console.log('1. Run: npm run build');
console.log('2. Run: npm start');
console.log('3. Or use Replit deployment directly');