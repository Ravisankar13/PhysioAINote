#!/usr/bin/env node
// Production starter for PhysioGPT - uses working deploy-server.mjs
console.log('🚀 Starting PhysioGPT Production Server...');
console.log('Using deploy-server.mjs with all dependencies available');
import('./deploy-server.mjs').catch(error => {
  console.error('Failed to start production server:', error);
  process.exit(1);
});