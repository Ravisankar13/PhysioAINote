# Deployment Build Guide for PhysioGPT

## Quick Start

To deploy the application, simply click the "Deploy" button in Replit. The optimized build scripts will handle everything automatically.

## Build Process Overview

The application uses an optimized build process designed to handle large dependencies and prevent deployment timeouts:

1. **Frontend Build**: Uses Vite with aggressive code splitting to reduce bundle sizes
2. **Backend Build**: Uses esbuild with external packages to minimize bundling
3. **Memory Management**: Automatically allocates sufficient memory for the build process

## Available Build Scripts

### For Deployment (Recommended)
```bash
./deploy-build.sh
```
This script:
- Sets optimal memory limits (4GB)
- Uses production-optimized Vite configuration
- Implements aggressive code splitting for large libraries
- Minifies and optimizes all assets
- Creates health check endpoints

### Standard Build
```bash
npm run build
```
Falls back to standard Vite build if needed.

## Build Output Structure

```
dist/
├── public/           # Frontend assets
│   ├── index.html
│   └── assets/
│       ├── js/       # Split JavaScript chunks
│       │   ├── tensorflow-*.js    # TensorFlow libraries
│       │   ├── three-*.js         # 3D graphics
│       │   ├── mediapipe-*.js     # Pose detection
│       │   ├── mui-*.js           # Material UI
│       │   ├── radix-ui-*.js      # Radix UI components
│       │   └── [other chunks]
│       └── css/      # Stylesheets
└── index.js          # Backend server

```

## Code Splitting Strategy

The build process automatically splits code into logical chunks:

- **tensorflow**: ~1.4MB - ML models and TensorFlow.js
- **three**: ~800KB - 3D graphics and rendering
- **mediapipe**: ~50KB - Pose detection libraries
- **mui**: ~70KB - Material UI components
- **radix-ui**: ~125KB - Radix UI components
- **vendor**: ~1MB - Other third-party libraries
- **index**: ~1.7MB - Application code

Total frontend size: ~6.5MB (split across multiple chunks for parallel loading)

## Deployment Configuration

The application is configured for Replit's autoscale deployment:

- **Port**: 5000 (mapped to 80/443 externally)
- **Memory**: 4GB during build, optimized runtime
- **Build Time**: ~4-5 minutes
- **Startup Time**: <10 seconds

## Troubleshooting

### If Build Fails

1. **Memory Issues**:
   - The build script automatically sets `NODE_OPTIONS="--max-old-space-size=4096"`
   - If still failing, try reducing concurrent builds

2. **Module Resolution**:
   - All dependencies use dynamic imports for code splitting
   - Firebase and other complex modules handled specially

3. **Timeout Issues**:
   - Build is optimized to complete within Replit's limits
   - Frontend and backend built sequentially to avoid memory spikes

### Testing Locally

Before deployment:
```bash
# Build the application
./deploy-build.sh

# Test production build
NODE_ENV=production npm start

# Verify at http://localhost:5000
```

## Health Check

After deployment, verify the application is running:
```
https://your-app.replit.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-10T...",
  "memory": {...},
  "uptime": 123
}
```

## Performance Optimizations

1. **Lazy Loading**: Heavy components loaded on-demand
2. **Code Splitting**: Large libraries in separate chunks
3. **Minification**: Terser for production builds
4. **Asset Optimization**: Images limited to 4KB inline
5. **CSS Splitting**: Separate CSS files per chunk

## Environment Variables

Ensure these are set in Replit Secrets before deployment:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY` (if using payments)
- `VITE_STRIPE_PUBLIC_KEY` (if using payments)

## Deployment Checklist

- [x] Optimized build scripts created
- [x] Code splitting configured
- [x] Memory management implemented
- [x] Health check endpoint available
- [x] Static file serving configured
- [x] Production environment tested
- [ ] Deploy via Replit UI

## Support

If deployment continues to fail:
1. Check the workflow logs for specific errors
2. Verify all environment variables are set
3. Ensure database connection is active
4. Try deploying with Reserved VM instead of Autoscale