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
    chunkSizeWarningLimit: 2000, // Reduced from 10000 to encourage smaller chunks
    rollupOptions: {
      output: {
        // Let Vite automatically handle chunking to avoid empty chunks
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js', 
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      },
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'EVAL') return;
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.code === 'MISSING_EXPORT') return;
        warn(warning);
      },
      // Use default treeshaking to preserve entry points
      preserveEntrySignatures: 'exports-only'
    },
    minify: 'esbuild', // Changed from terser to esbuild for faster builds
    target: 'es2020', // Modern target for better optimization
    sourcemap: false,
    reportCompressedSize: false,
    cssCodeSplit: true,
    cssMinify: 'esbuild', // Use esbuild for CSS minification too
    assetsInlineLimit: 2048, // Reduced from 4096 to avoid large inline assets
    modulePreload: {
      polyfill: false
    },
    // Additional build optimizations for faster processing
    write: true
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'wouter',
      '@tanstack/react-query',
      'axios',
      'zod',
      'clsx',
      'tailwind-merge',
      'lucide-react'
    ],
    exclude: [
      '@mediapipe/pose',
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-backend-webgl',
      'three',
      'firebase',
      '@aws-sdk/client-s3',
      '@google-cloud/storage'
    ],
    force: true, // Force re-optimization for deployment
    esbuildOptions: {
      target: 'es2020'
    }
  },
  logLevel: 'info',
  clearScreen: false,
});