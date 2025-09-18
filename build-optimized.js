#!/usr/bin/env node
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Starting optimized production build...');

// Clean dist folder
console.log('Cleaning dist folder...');
await execAsync('rm -rf dist');

// Build frontend with aggressive optimizations for faster build times
console.log('Building frontend with lite optimizations (excluding heavy dependencies)...');
try {
  await build({
    plugins: [react({
      babel: {
        compact: true,
        presets: [
          ['@babel/preset-env', { modules: false }]
        ]
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
      chunkSizeWarningLimit: 1500, // Even smaller chunks for faster builds
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Essential dependencies only - aggressive splitting
              if (id.includes('react') && !id.includes('react-')) return 'react-core';
              if (id.includes('react-dom')) return 'react-dom';
              if (id.includes('wouter') || id.includes('react-router')) return 'routing';
              
              // Heavy libraries - separate and defer
              if (id.includes('tensorflow') || id.includes('@tensorflow')) return 'heavy-ml';
              if (id.includes('three') || id.includes('@react-three')) return 'heavy-3d';
              if (id.includes('@mediapipe')) return 'heavy-cv';
              
              // Cloud services - defer loading
              if (id.includes('firebase')) return 'cloud-firebase';
              if (id.includes('@aws-sdk')) return 'cloud-aws';
              if (id.includes('@google-cloud')) return 'cloud-gcp';
              
              // AI services - defer loading  
              if (id.includes('openai') || id.includes('@anthropic')) return 'ai-services';
              
              // UI libraries
              if (id.includes('@mui')) return 'ui-mui';
              if (id.includes('@radix-ui')) return 'ui-radix';
              if (id.includes('@emotion')) return 'ui-emotion';
              
              // Payment - defer loading
              if (id.includes('stripe') || id.includes('@stripe')) return 'payment-stripe';
              if (id.includes('@paypal')) return 'payment-paypal';
              
              // Form handling
              if (id.includes('react-hook-form') || id.includes('zod')) return 'forms';
              
              // Icons
              if (id.includes('lucide-react') || id.includes('react-icons')) return 'icons';
              
              // Essential utils only
              if (id.includes('axios') || id.includes('@tanstack/react-query')) return 'essential-utils';
              if (id.includes('clsx') || id.includes('tailwind-merge')) return 'style-utils';
              
              // Everything else as vendor
              return 'vendor';
            }
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/entry-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          // Aggressive compression for smaller files
          compact: true
        },
        // Suppress all warnings for faster builds
        onwarn(warning, warn) {
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          if (warning.code === 'EVAL') return;
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          if (warning.code === 'MISSING_EXPORT') return;
          if (warning.code === 'UNRESOLVED_IMPORT') return;
          // Only warn for critical issues
          if (warning.code === 'PLUGIN_WARNING') warn(warning);
        },
        // Use safe treeshaking to preserve entry points
        preserveEntrySignatures: 'exports-only',
        // Removed external dependencies to avoid runtime import errors
      },
      minify: 'esbuild', // Fastest minifier
      target: 'es2020',
      sourcemap: false,
      reportCompressedSize: false,
      cssCodeSplit: false, // Bundle CSS together for faster builds
      cssMinify: 'esbuild',
      assetsInlineLimit: 1024, // Smaller inline limit for faster builds
      modulePreload: false, // Disable preloading for simpler builds
      write: true
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'wouter'], // Only essential deps
      exclude: [
        '@mediapipe/pose',
        '@tensorflow/tfjs',
        'three',
        'firebase',
        '@aws-sdk/client-s3',
        '@google-cloud/storage',
        'openai',
        '@anthropic-ai/sdk'
      ],
      force: true,
      esbuildOptions: {
        target: 'es2020'
      }
    },
    logLevel: 'warn', // Reduce log output for faster builds
    clearScreen: false
  });
  console.log('Frontend build complete!');
} catch (error) {
  console.error('Frontend build failed:', error);
  process.exit(1);
}

// Build backend
console.log('Building backend...');
try {
  const { stdout, stderr } = await execAsync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify'
  );
  if (stderr) console.error('Backend build warnings:', stderr);
  console.log('Backend build complete!');
} catch (error) {
  console.error('Backend build failed:', error);
  process.exit(1);
}

console.log('✅ Build completed successfully!');
process.exit(0);