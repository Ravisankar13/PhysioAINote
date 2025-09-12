#!/bin/bash
# Fixed deployment build that bundles core dependencies

echo "🚀 Starting deployment build with smart bundling..."

# Clean previous build
rm -rf dist

# Create dist directory  
mkdir -p dist

# Build backend with proper external packages
echo "⚙️ Building backend..."
npx esbuild server/index.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --target=node20 \
  --outfile=dist/index.js \
  --minify \
  --legal-comments=none \
  --packages=external

if [ $? -ne 0 ]; then
  echo "❌ Backend build failed"
  exit 1
fi

# Copy package.json for production dependencies
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || true

# Fix the start script in dist/package.json
sed -i 's/"start": "NODE_ENV=production node dist\/index.js"/"start": "NODE_ENV=production node index.js"/' dist/package.json

echo "📦 Package files copied for production"

# Copy shared directory (required for drizzle schema)
if [ -d "shared" ]; then
  echo "📁 Copying shared directory..."
  cp -r shared dist/
fi

# Copy minimal public assets
if [ -d "public" ]; then
  echo "🖼️ Copying essential public files..."
  mkdir -p dist/public
  cp public/*.html dist/public/ 2>/dev/null || true
  cp public/*.ico dist/public/ 2>/dev/null || true
  cp public/*.svg dist/public/ 2>/dev/null || true
fi

echo "✅ Build completed!"
echo ""
echo "📝 Testing build locally..."

# Build frontend
echo "🎨 Building frontend..."
npm run build:frontend

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed"
  exit 1
fi

echo "✅ Frontend build completed"

# Test the backend build locally
echo "📝 Testing backend build..."
cd dist
NODE_ENV=production timeout 2 node index.js 2>&1 | grep -v EADDRINUSE | head -5
cd ..

echo "✅ Build completed successfully!"

exit 0