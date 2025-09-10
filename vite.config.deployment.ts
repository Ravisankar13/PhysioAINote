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
        manualChunks: (id) => {
          // Handle dependencies by checking the actual path
          if (id.includes('node_modules')) {
            // Core React ecosystem
            if (id.includes('react') && !id.includes('react-')) return 'react-vendor';
            if (id.includes('react-dom')) return 'react-vendor';
            if (id.includes('react-router-dom') || id.includes('wouter')) return 'react-vendor';
            
            // Heavy ML/3D libraries
            if (id.includes('@tensorflow') || id.includes('tfjs')) return 'tensorflow';
            if (id.includes('three') || id.includes('@react-three')) return 'three';
            if (id.includes('@mediapipe')) return 'mediapipe';
            
            // UI Libraries
            if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
            if (id.includes('@radix-ui')) return 'radix-ui';
            
            // Cloud Services (Firebase handled specially)
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('@aws-sdk')) return 'aws-sdk';
            if (id.includes('@google-cloud')) return 'google-cloud';
            
            // Payment
            if (id.includes('@stripe') || id.includes('stripe')) return 'payment';
            if (id.includes('@paypal')) return 'payment';
            
            // AI Services
            if (id.includes('openai') || id.includes('@anthropic-ai')) return 'ai-services';
            
            // File handling
            if (id.includes('@uppy')) return 'file-handling';
            
            // Document processing
            if (id.includes('pdf') || id.includes('docx') || id.includes('mammoth')) return 'documents';
            
            // Data visualization
            if (id.includes('recharts') || id.includes('framer-motion')) return 'visualization';
            
            // Form handling
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'forms';
            
            // Icons
            if (id.includes('lucide-react') || id.includes('react-icons')) return 'icons';
            
            // Utils
            if (id.includes('axios') || id.includes('date-fns') || id.includes('clsx') || 
                id.includes('tailwind-merge') || id.includes('nanoid') || 
                id.includes('papaparse') || id.includes('marked')) return 'utils';
            
            // Default vendor chunk for remaining modules
            return 'vendor';
          }
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