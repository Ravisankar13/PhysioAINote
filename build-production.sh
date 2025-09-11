#!/bin/bash

echo "Starting optimized production build..."

# Clean npm cache to prevent dependency issues
echo "📦 Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

# Clean previous build and cache directories
echo "🧹 Cleaning previous build and cache..."
rm -rf dist node_modules/.cache

# Build frontend with increased memory and timeout
echo "Building frontend..."
NODE_OPTIONS="--max-old-space-size=4096" npx vite build --mode production

# Build backend with dependencies bundled
echo "Building backend with proper dependency bundling..."
npx esbuild server/index.ts \
  --platform=node \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --tree-shaking=true \
  --metafile=dist/meta.json \
  --keep-names \
  --target=node18 \
  --external:@types/* \
  --external:typescript \
  --external:tsx \
  --external:vite \
  --external:esbuild \
  --external:drizzle-kit

echo "Build complete!"