#!/bin/bash

echo "Starting minimal production build..."

# Clean
rm -rf dist

# Create dist directories
mkdir -p dist/public

# Build frontend with standard vite (no special config)
echo "Building frontend..."
npx vite build --mode production

# Build backend with minimal bundling
echo "Building backend..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist

echo "Build complete!"