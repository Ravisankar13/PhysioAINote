
#!/bin/bash

echo "🚀 Starting Replit deployment build..."
echo "📊 Memory available: $(free -m | awk '/^Mem:/{print $7}') MB"

# Set Node memory limit for large bundles
export NODE_OPTIONS="--max-old-space-size=4096"

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

# Build backend with minimal bundling
echo "⚙️ Building backend..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --log-level=warning \
  --define:process.env.NODE_ENV='"production"'

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi

echo "✅ Backend build complete!"

# Check backend bundle size
BACKEND_SIZE=$(du -sh dist/index.js 2>/dev/null | cut -f1)
echo "📦 Backend bundle size: $BACKEND_SIZE"

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
