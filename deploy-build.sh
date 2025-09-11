
#!/bin/bash

# Enable strict error handling
set -euo pipefail

# Record build start time
BUILD_START_TIME=$(date +%s)

echo "🚀 Starting Replit deployment build..."
echo "📊 System stats at build start:"
echo "  Memory available: $(free -m | awk '/^Mem:/{print $7}') MB"
echo "  Total memory: $(free -m | awk '/^Mem:/{print $2}') MB"
echo "  Disk space: $(df -h . | tail -1 | awk '{print $4}') available"
echo "  Node.js version: $(node --version)"
echo "  NPM version: $(npm --version)"

# Function to log memory usage
log_memory_usage() {
  local stage="$1"
  echo "📄 Memory usage during $stage:"
  free -m | awk '/^Mem:/{printf "  Used: %dMB, Available: %dMB, Usage: %.1f%%\n", $3, $7, ($3/$2)*100}'
  echo "  Node memory: $(node -e 'const used = process.memoryUsage(); console.log(\"RSS: \" + Math.round(used.rss / 1024 / 1024) + \"MB\")' 2>/dev/null || echo 'N/A')"
}

# Set Node memory limit for large bundles and production environment
export NODE_OPTIONS="--max-old-space-size=4096 --max-semi-space-size=1024"
export NODE_ENV=production
export NPM_CONFIG_INCLUDE_DEPENDENCIES=true
export NPM_CONFIG_FETCH_TIMEOUT=300000
export NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
export NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
export NPM_CONFIG_CACHE_MAX=300

# Cloud Run specific environment variables
export GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT:-""}
export NODE_OPTIONS="$NODE_OPTIONS --enable-source-maps"

# Function to run commands with timeout
run_with_timeout() {
  local timeout_duration=$1
  shift
  
  # Check if timeout command is available
  if ! command -v timeout >/dev/null 2>&1; then
    echo "⚠️ timeout command not available, running without timeout"
    "$@"
    return $?
  fi
  
  timeout $timeout_duration "$@"
  local exit_code=$?
  if [ $exit_code -eq 124 ]; then
    echo "❌ Command timed out after ${timeout_duration} seconds"
    return 124
  fi
  return $exit_code
}

# Clean npm cache and install dependencies reproducibly
echo "📦 Cleaning npm cache and installing dependencies with lockfile..."
run_with_timeout 60 npm cache clean --force 2>/dev/null || true

# Generate package-lock.json if missing for npm ci
if [ ! -f package-lock.json ]; then
  echo "📝 Generating missing package-lock.json..."
  if ! run_with_timeout 300 npm install --package-lock-only --no-audit --no-fund; then
    echo "⚠️ Package lock generation failed or timed out. Trying alternative approach..."
    echo "📝 Attempting npm install with shorter timeout..."
    if ! run_with_timeout 180 npm install --package-lock-only --no-audit --no-fund --prefer-offline; then
      echo "❌ Failed to generate package-lock.json"
      exit 1
    fi
  fi
fi

# Use npm ci for reproducible builds with lockfile
echo "📦 Installing dependencies reproducibly with npm ci..."
if ! run_with_timeout 600 npm ci --no-audit --no-fund --prefer-offline; then
  echo "⚠️ npm ci failed, trying fallback with npm install..."
  if ! run_with_timeout 600 npm install --no-audit --no-fund --prefer-offline; then
    echo "❌ Both npm ci and npm install failed!"
    exit 1
  fi
fi

# Verify critical dependencies are installed
echo "🔍 Verifying critical dependencies..."
npm list drizzle-orm drizzle-kit express react || echo "⚠️  Some dependencies missing, continuing..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Build frontend with deployment optimizations
log_memory_usage "pre-frontend-build"
echo "🎨 Building frontend with optimized chunking and memory limits..."
# Reduce memory usage for Vite build
export NODE_OPTIONS="--max-old-space-size=3072 --max-semi-space-size=512"

# Capture frontend build result immediately
if ! run_with_timeout 900 npx vite build --config vite.config.deployment.ts --mode production; then
    echo "❌ Frontend build failed or timed out!"
    log_memory_usage "frontend-build-failure"
    exit 1
fi

log_memory_usage "post-frontend-build"

echo "✅ Frontend build complete!"

# Check frontend bundle size
FRONTEND_SIZE=$(du -sh dist/public 2>/dev/null | cut -f1)
echo "📦 Frontend bundle size: $FRONTEND_SIZE"

# Build backend with critical dependencies bundled
log_memory_usage "pre-backend-build"
echo "⚙️ Building backend with improved ESM dependency bundling and memory optimization..."
# Reset memory for backend build
export NODE_OPTIONS="--max-old-space-size=2048 --max-semi-space-size=256"
if ! run_with_timeout 600 npx esbuild server/index.ts \
  --platform=node \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --log-level=info \
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
  --external:drizzle-kit; then
    echo "❌ Backend build failed or timed out!"
    log_memory_usage "backend-build-failure"
    echo "🔍 Common build failure causes:"
    echo "  - TypeScript compilation errors"
    echo "  - Missing dependencies"
    echo "  - Import resolution issues"
    echo "  - Memory allocation errors"
    echo "  - Build timeout (600 seconds exceeded)"
    exit 1
fi
log_memory_usage "post-backend-build"

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

# Health check endpoint will be handled by server/routes.ts

echo "🎉 Build completed successfully!"
log_memory_usage "build-complete"
echo "📁 Contents of dist directory:"
ls -la dist/ 2>/dev/null || echo "Warning: Could not list dist directory contents"
echo "📊 Final build summary:"
echo "  Frontend size: $FRONTEND_SIZE"
echo "  Backend size: $BACKEND_SIZE"
echo "  Total build time: $(($(date +%s) - BUILD_START_TIME)) seconds" 2>/dev/null || echo "  Total build time: Unknown"
echo "🚀 Ready for deployment!"
