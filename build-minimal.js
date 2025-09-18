#!/usr/bin/env node
// Minimal emergency build script for deployment
// This is a last-resort fallback that builds only essential components

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔥 Starting MINIMAL emergency build (last resort)...');
console.log('   This build excludes heavy dependencies and may have limited functionality');

// Clean dist folder
console.log('🧹 Cleaning dist folder...');
await execAsync('rm -rf dist');

// Minimal frontend build - exclude as much as possible
console.log('⚡ Building minimal frontend (emergency mode)...');
try {
  await build({
    plugins: [react({
      babel: {
        compact: true,
        minified: true
      }
    })],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          manualChunks: {
            // Only essential chunks
            'react-vendor': ['react', 'react-dom'],
            'router': ['wouter'],
            'vendor': ['axios', 'zod']
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/main-[hash].js',
          assetFileNames: '[ext]/[name]-[hash].[ext]'
        },
        // Only suppress safe warnings - critical ones should show
        onwarn(warning, warn) {
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          if (warning.code === 'EVAL') return;
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          // Show all other warnings including import issues
          warn(warning);
        }
        // Removed external dependencies to prevent runtime import failures
      },
      minify: 'esbuild',
      target: 'es2020',
      sourcemap: false,
      reportCompressedSize: false,
      cssCodeSplit: false,
      cssMinify: true,
      assetsInlineLimit: 0, // Don't inline anything to keep build simple
      modulePreload: false
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'wouter', 'axios', 'zod'],
      exclude: [], // Let it handle exclusions via external
      force: true
    },
    logLevel: 'error', // Only show errors
    clearScreen: false
  });
  console.log('✅ Minimal frontend build complete!');
  
  // Verify build outputs exist
  const frontendIndexPath = path.resolve(__dirname, 'dist/public/index.html');
  const jsAssetsPath = path.resolve(__dirname, 'dist/public/js');
  
  if (!require('fs').existsSync(frontendIndexPath)) {
    console.error('❌ Build verification failed: dist/public/index.html is missing');
    process.exit(1);
  }
  
  if (!require('fs').existsSync(jsAssetsPath)) {
    console.error('❌ Build verification failed: dist/public/js directory is missing');
    process.exit(1);
  }
  
  console.log('✅ Minimal frontend build verification passed');
} catch (error) {
  console.error('❌ Even minimal build failed:', error);
  console.error('   This indicates a serious configuration issue');
  process.exit(1);
}

// Simple backend build
console.log('⚙️  Building minimal backend...');
try {
  const { stdout, stderr } = await execAsync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify --target=node18'
  );
  if (stderr) console.error('Backend build warnings:', stderr);
  console.log('✅ Minimal backend build complete!');
} catch (error) {
  console.error('❌ Minimal backend build failed:', error);
  process.exit(1);
}

console.log('');
console.log('⚡ MINIMAL BUILD COMPLETED!');
console.log('   WARNING: This build may have limited functionality');
console.log('   Heavy dependencies (ML, 3D, Cloud) are excluded');
console.log('   Use this only as emergency deployment option');
process.exit(0);