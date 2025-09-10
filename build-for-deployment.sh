#!/bin/bash

echo "🚀 Preparing deployment build..."

# Clean
rm -rf dist

# Create minimal package.json for production (without heavy deps)
echo "Creating optimized build configuration..."

# Build frontend with external CDN dependencies
echo "Building frontend (this may take a few minutes)..."
NODE_ENV=production NODE_OPTIONS="--max-old-space-size=2048" npx vite build --mode production 2>&1 | tail -20

# Build backend
echo "Building backend..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --target=node20 \
  --keepNames

echo "✅ Build complete!"
ls -la dist/