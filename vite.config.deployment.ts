import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react({
      babel: {
        compact: true,
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'wouter'],
          
          // Heavy ML/3D libraries
          'tensorflow': ['@tensorflow/tfjs', '@tensorflow-models/body-pix', '@tensorflow-models/pose-detection'],
          'three': ['three', '@react-three/fiber', '@react-three/drei', 'three-fbx-loader', 'three-gltf-loader', 'three-obj-loader', 'three-stdlib'],
          'mediapipe': ['@mediapipe/camera_utils', '@mediapipe/drawing_utils', '@mediapipe/pose'],
          
          // UI Libraries
          'mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'radix-ui': [
            '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar', '@radix-ui/react-checkbox', '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card', '@radix-ui/react-label', '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu', '@radix-ui/react-popover', '@radix-ui/react-progress',
            '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area', '@radix-ui/react-select',
            '@radix-ui/react-separator', '@radix-ui/react-slider', '@radix-ui/react-slot',
            '@radix-ui/react-switch', '@radix-ui/react-tabs', '@radix-ui/react-toast',
            '@radix-ui/react-toggle', '@radix-ui/react-toggle-group', '@radix-ui/react-tooltip'
          ],
          
          // Cloud Services
          'cloud-services': ['firebase', '@aws-sdk/client-s3', '@aws-sdk/lib-storage', '@google-cloud/storage', '@google-cloud/vertexai'],
          
          // Payment
          'payment': ['@stripe/react-stripe-js', '@stripe/stripe-js', 'stripe', '@paypal/paypal-server-sdk'],
          
          // AI Services
          'ai-services': ['openai', '@anthropic-ai/sdk'],
          
          // File handling
          'file-handling': ['@uppy/core', '@uppy/dashboard', '@uppy/drag-drop', '@uppy/file-input', '@uppy/progress-bar', '@uppy/react', '@uppy/aws-s3'],
          
          // Document processing
          'documents': ['pdf-lib', 'pdf2pic', 'jspdf', 'docx', 'mammoth', 'html-pdf-node'],
          
          // Data visualization
          'visualization': ['recharts', 'framer-motion'],
          
          // Form handling
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod', 'zod-validation-error'],
          
          // Icons
          'icons': ['lucide-react', 'react-icons'],
          
          // Utils
          'utils': ['axios', 'date-fns', 'clsx', 'tailwind-merge', 'nanoid', 'papaparse', 'marked']
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      },
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'EVAL') return;
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.trace'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false,
        ascii_only: true
      },
    },
    sourcemap: false,
    reportCompressedSize: false,
    cssCodeSplit: true,
    cssMinify: true,
    assetsInlineLimit: 4096,
    modulePreload: {
      polyfill: false
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@mediapipe/pose']
  },
  logLevel: 'info',
  clearScreen: false,
});