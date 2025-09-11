#!/bin/bash

# Production build script for Replit deployment
# This script ensures the build completes within deployment time limits

echo "═══════════════════════════════════════════════════════"
echo "    🚀 REPLIT PRODUCTION BUILD STARTING"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📅 Build started at: $(date)"
echo "📊 Memory available: $(free -m | awk '/^Mem:/{print $7}') MB"
echo ""

# Set Node memory limit to prevent out-of-memory errors
export NODE_OPTIONS="--max-old-space-size=4096"

# Step 1: Clean previous build
echo "🧹 Step 1/4: Cleaning previous build artifacts..."
rm -rf dist
echo "   ✓ Clean complete"
echo ""

# Step 2: Build frontend with optimizations
echo "🎨 Step 2/4: Building frontend (this may take 2-3 minutes)..."

if [ -f "vite.config.deployment.ts" ]; then
    echo "   Using optimized deployment configuration..."
    npx vite build --config vite.config.deployment.ts --mode production
else
    echo "   Using standard vite configuration..."
    npx vite build
fi

if [ $? -ne 0 ]; then
    echo "   ❌ Frontend build failed!"
    echo "   Please check for TypeScript or build errors"
    exit 1
fi

echo "   ✓ Frontend build complete"

# Check frontend size
if [ -d "dist/public" ]; then
    FRONTEND_SIZE=$(du -sh dist/public | cut -f1)
    echo "   📦 Frontend bundle size: $FRONTEND_SIZE"
fi
echo ""

# Step 3: Build backend
echo "⚙️  Step 3/4: Building backend server..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --log-level=warning

if [ $? -ne 0 ]; then
    echo "   ❌ Backend build failed!"
    exit 1
fi

echo "   ✓ Backend build complete"

# Check backend size
if [ -f "dist/index.js" ]; then
    BACKEND_SIZE=$(du -sh dist/index.js | cut -f1)
    echo "   📦 Backend bundle size: $BACKEND_SIZE"
fi
echo ""

# Step 4: Final verification
echo "✅ Step 4/4: Build verification..."
echo "   Checking dist structure..."

if [ ! -f "dist/index.js" ]; then
    echo "   ❌ Backend bundle not found!"
    exit 1
fi

if [ ! -d "dist/public" ]; then
    echo "   ❌ Frontend bundle not found!"
    exit 1
fi

echo "   ✓ All build artifacts present"
echo ""

# Summary
echo "═══════════════════════════════════════════════════════"
echo "    ✅ BUILD COMPLETED SUCCESSFULLY!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📅 Build completed at: $(date)"
echo "📊 Final memory usage: $(free -m | awk '/^Mem:/{print $3}') MB used"
echo ""
echo "🚀 Application ready for deployment!"
echo "   - Frontend: dist/public/"
echo "   - Backend: dist/index.js"
echo ""
echo "To start the application:"
echo "   npm start"
echo ""