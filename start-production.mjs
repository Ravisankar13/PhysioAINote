#!/usr/bin/env node
// Simplified production starter - directly runs the built server
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Production Server...');
console.log('📍 Current directory:', process.cwd());
console.log('🌍 Environment:', process.env.NODE_ENV || 'production');
console.log('🔌 Port:', process.env.PORT || '5000');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.VITE_NODE_ENV = 'production';

// Simple dependency verification
function verifyBasicDependencies() {
  const criticalPackages = ['express', 'drizzle-orm', 'openai', 'zod'];
  const distNodeModules = resolve(__dirname, 'dist/node_modules');
  
  if (!existsSync(distNodeModules)) {
    console.error('❌ dist/node_modules directory not found');
    console.error('Build process should have installed dependencies in dist directory');
    return false;
  }
  
  const missingPackages = criticalPackages.filter(pkg => 
    !existsSync(resolve(distNodeModules, pkg))
  );
  
  if (missingPackages.length > 0) {
    console.error(`❌ Critical packages missing: ${missingPackages.join(', ')}`);
    console.error('Build process should have installed all production dependencies');
    return false;
  }
  
  console.log(`✅ All ${criticalPackages.length} critical packages verified`);
  return true;
}

// Check for built server
const distIndex = resolve(__dirname, 'dist/index.js');

if (!existsSync(distIndex)) {
  console.error('❌ Built server not found at dist/index.js');
  console.error('Build process should have created the production server bundle');
  process.exit(1);
}

// Verify basic dependencies
if (!verifyBasicDependencies()) {
  console.error('❌ Dependency verification failed');
  process.exit(1);
}

console.log('✅ Found built server at:', distIndex);
console.log('🎯 Starting production server...');

try {
  // Import and run the built server directly
  await import('./dist/index.js');
} catch (error) {
  console.error('❌ Failed to start production server:', error.message);
  console.error('🔍 Stack trace:', error.stack);
  console.error('💡 Ensure the build process completed successfully and all dependencies are installed');
  process.exit(1);
}