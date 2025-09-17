#!/usr/bin/env node

// Production server starter for PhysioGPT
// This handles the deployment startup and module loading

import('./deploy-server.mjs').catch((error) => {
  console.error('Failed to start production server:', error);
  console.log('Falling back to CommonJS server...');
  
  // Fallback to CommonJS if ES module fails
  try {
    require('./deploy-server.cjs');
  } catch (fallbackError) {
    console.error('Both ES module and CommonJS servers failed:', fallbackError);
    console.error('Original ES module error:', error);
    process.exit(1);
  }
});