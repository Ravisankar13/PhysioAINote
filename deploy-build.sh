#!/bin/bash

echo "🚀 Starting Replit deployment build..."
echo "📊 Memory available: $(free -m | awk '/^Mem:/{print $7}') MB"

# Set Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Build frontend with deployment config
echo "🎨 Building frontend with optimized chunking..."
npx vite build --config vite.config.deployment.ts --mode production

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend build complete!"

# Check frontend bundle size
FRONTEND_SIZE=$(du -sh dist/public | cut -f1)
echo "📦 Frontend bundle size: $FRONTEND_SIZE"

# Build backend with minimal bundling
echo "⚙️ Building backend..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --log-level=warning

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi

echo "✅ Backend build complete!"

# Check backend bundle size
BACKEND_SIZE=$(du -sh dist/index.js 2>/dev/null | cut -f1)
echo "📦 Backend bundle size: $BACKEND_SIZE"

# Create health check file for deployment verification
cat > dist/health-check.js << 'EOF'
export const checkHealth = () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
};
EOF

echo "📝 Health check file created"

# Final summary
echo ""
echo "✅ Build completed successfully!"
echo "📊 Final memory usage: $(free -m | awk '/^Mem:/{print $3}') MB used"
echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "To deploy: Use Replit's deployment button or run 'npm start' to test locally"