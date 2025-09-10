#!/bin/bash

echo "Starting optimized production build..."

# Clean previous build
rm -rf dist

# Build frontend with increased memory and timeout
echo "Building frontend..."
NODE_OPTIONS="--max-old-space-size=4096" npx vite build --mode production

# Build backend
echo "Building backend..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --tree-shaking=true \
  --metafile=dist/meta.json

echo "Build complete!"