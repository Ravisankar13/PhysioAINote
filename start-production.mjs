#!/usr/bin/env node
// Production starter for PhysioGPT - uses built server
console.log('🚀 Starting PhysioGPT Production Server...');
console.log('Using built server: dist/index.js');
import('./dist/index.js').catch(error => {
  console.error('Failed to start built server:', error);
  process.exit(1);
});