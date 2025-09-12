#!/bin/bash
# Deployment build script for Replit Autoscale
# This script delegates to the JavaScript build script

echo "🚀 Starting deployment build..."
node deploy-build.js

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ Build completed successfully!"
exit 0