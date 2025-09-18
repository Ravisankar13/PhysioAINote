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

// Enhanced logging for debugging
console.log('📂 Checking build files...');
const distIndex = resolve(__dirname, 'dist/index.js');
const sourceIndex = resolve(__dirname, 'server/index.ts');

if (existsSync(distIndex)) {
  console.log('✅ Found built server at:', distIndex);
  console.log('🎯 Loading production server from dist/index.js...');
  
  try {
    await import('./dist/index.js');
  } catch (error) {
    console.error('❌ Failed to load built server:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    console.log('🔄 Falling back to source server...');
    
    try {
      await import('./server/index.ts');
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
    await import('./server/index.ts');
  } catch (error) {
    console.error('❌ Failed to load source server:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    process.exit(1);
  }
}