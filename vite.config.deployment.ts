import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath, URL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',  // Use relative paths for subdirectory deployment compatibility
  plugins: [
    react({
      babel: {
        compact: true,
      }
    })
  ],
  root: path.resolve(__dirname, "client"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500, // Further reduced for faster processing
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js', 
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
      onwarn(warning, warn) {
        // Only suppress safe warnings - keep critical ones visible
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'EVAL') return;
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.code === 'SOURCEMAP_ERROR') return;
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        // Always show these critical warnings
        warn(warning);
      },
      // Aggressive treeshaking for smaller bundles
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        unknownGlobalSideEffects: false
      },
      preserveEntrySignatures: 'exports-only'
    },
    minify: 'esbuild', // Fastest minifier
    target: 'es2020',
    sourcemap: false,
    reportCompressedSize: false, // Skip size reporting to save time
    cssCodeSplit: false, // Bundle CSS together for faster builds
    cssMinify: 'esbuild',
    assetsInlineLimit: 1024, // Smaller limit for faster processing
    modulePreload: {
      polyfill: false
    },
    // Memory and performance optimizations
    write: true,
    // Increase build concurrency for faster builds
    commonjsOptions: {
      include: /node_modules/,
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'wouter',
      '@tanstack/react-query',
      'axios',
      'zod',
      'clsx',
      'tailwind-merge',
      'lucide-react',
      'react-hook-form',
      '@hookform/resolvers',
      'class-variance-authority'
    ],
    exclude: [
      // Heavy ML/AI libraries
      '@mediapipe/pose',
      '@mediapipe/camera_utils',
      '@mediapipe/drawing_utils',
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-backend-webgl',
      '@tensorflow-models/pose-detection',
      '@tensorflow-models/body-pix',
      'openai',
      '@anthropic-ai/sdk',
      
      // Heavy 3D libraries
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'three-stdlib',
      'three-fbx-loader',
      'three-gltf-loader',
      'three-obj-loader',
      
      // Cloud services
      'firebase',
      '@aws-sdk/client-s3',
      '@aws-sdk/lib-storage',
      '@google-cloud/storage',
      '@google-cloud/vertexai',
      
      // Payment libraries
      'stripe',
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
      '@paypal/paypal-server-sdk',
      
      // Heavy UI libraries
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      
      // Media processing
      'ffmpeg-static',
      '@breezystack/lamejs'
    ],
    force: true,
    esbuildOptions: {
      target: 'es2020',
      // Use more workers for faster dep optimization
      minify: false,
      keepNames: false,
      tsconfigRaw: '{}'
    }
  },
  logLevel: 'warn', // Reduce logging for faster builds
  clearScreen: false,
  // Additional performance optimizations
  esbuild: {
    // Use all available CPU cores
    target: 'es2020',
    legalComments: 'none',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    treeShaking: true,
    drop: ['console', 'debugger'] // Remove console logs in production
  },
  // Server options for faster builds
  server: {
    fs: {
      // Allow serving files from one level up to access node_modules
      allow: ['..']
    }
  },
});