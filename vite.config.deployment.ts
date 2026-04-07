import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath, URL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',  // Use relative paths for subdirectory deployment compatibility
  plugins: [react()],
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
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'EVAL') return;
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.code === 'SOURCEMAP_ERROR') return;
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/@tensorflow') || id.includes('node_modules/@tensorflow-models') || id.includes('node_modules/@mediapipe')) {
            return 'vendor-ml';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/framer-motion') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/pdf-lib') || id.includes('node_modules/jspdf') || id.includes('node_modules/docx') || id.includes('node_modules/mammoth')) {
            return 'vendor-docs';
          }
        },
      },
    },
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: false,
    reportCompressedSize: false,
    cssMinify: 'esbuild'
  },
});