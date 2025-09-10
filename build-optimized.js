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

// Build frontend with optimizations
console.log('Building frontend with optimizations...');
try {
  await build({
    plugins: [react()],
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
          manualChunks: (id) => {
            // Separate large libraries into their own chunks
            if (id.includes('tensorflow')) return 'tensorflow';
            if (id.includes('three')) return 'three';
            if (id.includes('@mui')) return 'mui';
            if (id.includes('@radix-ui')) return 'radix';
            if (id.includes('node_modules')) return 'vendor';
          }
        },
        // Don't fail on large chunks
        onwarn(warning, warn) {
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          if (warning.code === 'EVAL') return;
          warn(warning);
        }
      },
      minify: 'esbuild',
      sourcemap: false,
      reportCompressedSize: false,
    },
    logLevel: 'info',
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