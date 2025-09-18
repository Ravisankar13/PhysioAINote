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
    minify: false, // Skip minification for faster build
    sourcemap: false,
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      // No manual chunking - let rollup handle it
      external: [
        // Externalize heavy libraries that might cause issues
        '@tensorflow/tfjs',
        '@mediapipe/pose',
        'three'
      ]
    }
  },
  optimizeDeps: {
    exclude: [
      '@tensorflow/tfjs',
      '@mediapipe/pose', 
      'three',
      '@react-three/fiber'
    ]
  }
});