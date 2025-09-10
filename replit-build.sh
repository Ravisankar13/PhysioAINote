#!/bin/bash

echo "Starting Replit production build..."

# Clean previous build
rm -rf dist

# Build frontend with specific optimizations for Replit
echo "Building frontend..."
NODE_OPTIONS="--max-old-space-size=3072" npx vite build \
  --mode production \
  --logLevel warn \
  || exit 1

echo "Frontend build complete!"

# Build backend with minimal bundling
echo "Building backend..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --log-level=warning \
  || exit 1

echo "Backend build complete!"
echo "✅ Build successful!"