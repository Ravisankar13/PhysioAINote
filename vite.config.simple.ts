import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
    // Use esbuild instead of terser - MUCH faster
    minify: 'esbuild',
    sourcemap: false,
    // Increase chunk size limit to avoid warnings
    chunkSizeWarningLimit: 5000,
    // Simple chunking strategy
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@tensorflow') || id.includes('tfjs')) return 'ml';
            if (id.includes('three') || id.includes('@react-three')) return '3d';
            if (id.includes('@mui') || id.includes('@emotion')) return 'ui';
            return 'vendor';
          }
        }
      }
    }
  },
});