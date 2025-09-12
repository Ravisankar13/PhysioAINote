#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync } from 'fs';

console.log('🚀 Starting Replit deployment build...');

try {
  // Build directly in place without dist directory
  // This ensures dependencies installed by Replit are available
  
  console.log('⏭️  Skipping frontend Vite build (known hanging issue)...');
  console.log('   Frontend will be served from public/client directories');
  
  // Bundle the backend with external packages
  console.log('⚙️ Building backend server...');
  console.log('   Dependencies will be loaded from node_modules at runtime');
  
  // Build index.js in the root directory where node_modules exists
  execSync(`npx --yes esbuild server/index.ts \
    --bundle \
    --packages=external \
    --platform=node \
    --format=esm \
    --outfile=index-production.js \
    --target=node20 \
    --minify \
    --legal-comments=none`, { 
    stdio: 'inherit',
    timeout: 180000
  });
  
  console.log('✅ Backend built successfully as index-production.js');
  
  // Update npm start script to use the production build
  console.log('📦 Updating package.json start script...');
  execSync(`node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.scripts.start = 'NODE_ENV=production node index-production.js';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  "`, { stdio: 'inherit' });
  
  console.log('🎉 Build completed successfully!');
  console.log('   Backend: ✅ Built as index-production.js');
  console.log('   Dependencies: ✅ Will use installed node_modules');
  console.log('   Start script: ✅ Updated to use production build');
  console.log('   Ready for deployment!');
  process.exit(0);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}