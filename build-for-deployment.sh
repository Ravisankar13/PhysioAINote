#!/bin/bash

echo "🚀 Preparing deployment build..."

# Clean npm cache to prevent dependency issues
echo "📦 Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

# Clean build directories and lockfiles
echo "🧹 Cleaning build directories..."
rm -rf dist node_modules/.cache

# Create minimal package.json for production (without heavy deps)
echo "Creating optimized build configuration..."

# Build frontend with external CDN dependencies
echo "Building frontend (this may take a few minutes)..."
NODE_ENV=production NODE_OPTIONS="--max-old-space-size=2048" npx vite build --mode production 2>&1 | tail -20

# Build backend with dependencies bundled
echo "Building backend with proper dependency bundling..."
npx esbuild server/index.ts \
  --platform=node \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --target=node20 \
  --keep-names \
  --external:@types/* \
  --external:typescript \
  --external:tsx \
  --external:vite \
  --external:esbuild \
  --external:drizzle-kit

echo "✅ Build complete!"
ls -la dist/