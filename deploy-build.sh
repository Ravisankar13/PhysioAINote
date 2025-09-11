
#!/bin/bash

echo "🚀 Starting Replit deployment build..."
echo "📊 Memory available: $(free -m | awk '/^Mem:/{print $7}') MB"

# Set Node memory limit for large bundles and production environment
export NODE_OPTIONS="--max-old-space-size=4096"
export NODE_ENV=production
export NPM_CONFIG_INCLUDE_DEPENDENCIES=true

# Clean npm cache and install dependencies reproducibly
echo "📦 Cleaning npm cache and installing dependencies with lockfile..."
npm cache clean --force 2>/dev/null || true

# Generate package-lock.json if missing for npm ci
if [ ! -f package-lock.json ]; then
  echo "📝 Generating missing package-lock.json..."
  npm install --package-lock-only --no-audit --no-fund
fi

# Use npm ci for reproducible builds with lockfile
echo "📦 Installing dependencies reproducibly with npm ci..."
npm ci --no-audit --no-fund

# Verify critical dependencies are installed
echo "🔍 Verifying critical dependencies..."
npm list drizzle-orm drizzle-kit express react || echo "⚠️  Some dependencies missing, continuing..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Build frontend with deployment optimizations
echo "🎨 Building frontend with optimized chunking..."
npx vite build --config vite.config.deployment.ts --mode production

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend build complete!"

# Check frontend bundle size
FRONTEND_SIZE=$(du -sh dist/public 2>/dev/null | cut -f1)
echo "📦 Frontend bundle size: $FRONTEND_SIZE"

# Build backend with critical dependencies bundled
echo "⚙️ Building backend with improved ESM dependency bundling..."
npx esbuild server/index.ts \
  --platform=node \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --log-level=warning \
  --define:process.env.NODE_ENV='"production"' \
  --keep-names \
  --target=node18 \
  --main-fields=module,main \
  --conditions=node,module \
  --resolve-extensions=.ts,.tsx,.mjs,.js,.cjs \
  --external:@types/* \
  --external:typescript \
  --external:tsx \
  --external:vite \
  --external:esbuild \
  --external:autoprefixer \
  --external:postcss \
  --external:tailwindcss \
  --external:drizzle-kit

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi

echo "✅ Backend build complete!"

# Verify that bundling was successful and no bare imports remain
echo "🔍 Verifying bundled output for completeness..."
if [ -f dist/index.js ]; then
    # Check for bare imports that would cause runtime failures
    BARE_IMPORTS=$(grep -E "(import\s+['\"]drizzle-orm|['\"]drizzle-orm[^'\"]*['\"])" dist/index.js 2>/dev/null || true)
    if [ -n "$BARE_IMPORTS" ]; then
        echo "❌ ERROR: Found bare drizzle-orm imports in bundle:"
        echo "$BARE_IMPORTS"
        echo "This will cause runtime ERR_UNSUPPORTED_DIR_IMPORT errors"
        echo "Bundling failed - external imports not properly inlined"
        exit 1
    else
        echo "✅ No bare drizzle-orm imports found - bundling successful!"
    fi
    
    # Show bundle size
    BACKEND_SIZE=$(du -sh dist/index.js 2>/dev/null | cut -f1)
    echo "📦 Backend bundle size: $BACKEND_SIZE"
else
    echo "❌ Backend bundle not found at dist/index.js"
    exit 1
fi

# Create deployment health check
cat > dist/health.js << 'EOF'
export const healthCheck = (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
};
EOF

echo "🎉 Build completed successfully!"
echo "📁 Contents of dist directory:"
ls -la dist/
echo "🚀 Ready for deployment!"
