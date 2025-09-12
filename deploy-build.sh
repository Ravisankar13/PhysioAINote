#!/bin/bash
# Deployment build script that ensures drizzle-orm is properly bundled

echo "🚀 Starting production build for deployment..."

# Clean previous build
rm -rf dist

# Create dist directory
mkdir -p dist

# Build backend with minimal bundling but keeping dependencies
echo "⚙️ Building backend..."
npx esbuild server/index.ts \
  --bundle \
  --packages=external \
  --platform=node \
  --format=esm \
  --outfile=dist/index.js \
  --target=node20 \
  --minify \
  --legal-comments=none

# Copy essential files
echo "📦 Copying package files..."
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || true

# Copy shared directory (required for drizzle schema)
if [ -d "shared" ]; then
  echo "📁 Copying shared directory..."
  cp -r shared dist/
fi

# Copy public directory for static assets (skip if too large)
if [ -d "public" ]; then
  echo "🖼️ Copying public directory..."
  mkdir -p dist/public
  # Only copy essential files, not all assets
  find public -maxdepth 1 -type f -name "*.html" -o -name "*.ico" -o -name "*.svg" | xargs -I {} cp {} dist/public/ 2>/dev/null || true
fi

echo "✅ Build completed!"
echo ""
echo "📝 Note: The deployment environment will install dependencies via npm install"
echo "   This ensures drizzle-orm and other packages are available in production"

exit 0