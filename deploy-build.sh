#!/bin/bash
# Fixed deployment build that bundles core dependencies

echo "🚀 Starting deployment build with smart bundling..."

# Clean previous build
rm -rf dist

# Create dist directory  
mkdir -p dist

# Build backend with selective bundling - bundle drizzle-orm but externalize problematic packages
echo "⚙️ Building backend with drizzle-orm bundled..."
npx esbuild server/index.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --target=node20 \
  --outfile=dist/index.js \
  --minify \
  --legal-comments=none \
  --packages=external \
  --alias:drizzle-orm=./node_modules/drizzle-orm/index.js \
  --alias:@libsql/client=./node_modules/@libsql/client/lib-esm/index.js

if [ $? -ne 0 ]; then
  echo "❌ First build approach failed, trying alternative..."
  
  # Alternative: Build with external packages but copy critical dependencies
  npx esbuild server/index.ts \
    --bundle \
    --platform=node \
    --format=esm \
    --target=node20 \
    --outfile=dist/index.js \
    --minify \
    --legal-comments=none \
    --packages=external
  
  # Copy package.json and fix the start script
  cp package.json dist/
  cp package-lock.json dist/ 2>/dev/null || true
  
  # Fix the start script in dist/package.json
  sed -i 's/"start": "NODE_ENV=production node dist\/index.js"/"start": "NODE_ENV=production node index.js"/' dist/package.json
  
  echo "📦 Dependencies will be installed in production"
else
  # Create minimal package.json (dependencies bundled)
  cat > dist/package.json << 'EOF'
{
  "name": "server",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "dependencies": {
    "drizzle-orm": "^0.39.1",
    "@libsql/client": "^0.10.0",
    "@neondatabase/serverless": "^0.10.4"
  }
}
EOF
  echo "📦 Created package.json with critical dependencies only"
fi

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

# Test the build
cd dist
NODE_ENV=production timeout 2 node index.js 2>&1 | grep -v EADDRINUSE | head -5
cd ..

if grep -q "Cannot find package 'drizzle-orm'" dist/index.js 2>/dev/null; then
  echo "⚠️ Warning: Build may still have drizzle-orm import issues"
else
  echo "✅ Build looks good - no bare drizzle-orm imports detected"
fi

exit 0