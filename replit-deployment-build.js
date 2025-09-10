#!/usr/bin/env node
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting optimized Replit deployment build...');
console.log('📊 Memory available:', Math.round(process.memoryUsage().heapTotal / 1024 / 1024), 'MB');

// Set memory limit for Node
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

async function cleanDist() {
  console.log('🧹 Cleaning dist folder...');
  try {
    await fs.rm('dist', { recursive: true, force: true });
    console.log('✅ Dist folder cleaned');
  } catch (error) {
    console.log('📁 No dist folder to clean');
  }
}

async function buildFrontend() {
  console.log('🎨 Building frontend with optimized chunking...');
  
  try {
    await build({
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
        chunkSizeWarningLimit: 10000,
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              // Aggressive code splitting for large libraries
              if (id.includes('@tensorflow')) return 'tensorflow';
              if (id.includes('three')) return 'three';
              if (id.includes('@mediapipe')) return 'mediapipe';
              if (id.includes('@mui')) return 'mui';
              if (id.includes('@radix-ui')) return 'radix-ui';
              if (id.includes('@react-three')) return 'react-three';
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('@aws-sdk')) return 'aws-sdk';
              if (id.includes('@google-cloud')) return 'google-cloud';
              if (id.includes('@stripe')) return 'stripe';
              if (id.includes('openai')) return 'openai';
              if (id.includes('framer-motion')) return 'framer-motion';
              if (id.includes('recharts')) return 'recharts';
              if (id.includes('@tanstack')) return 'tanstack';
              if (id.includes('pdf')) return 'pdf-libs';
              if (id.includes('docx')) return 'docx';
              if (id.includes('@uppy')) return 'uppy';
              if (id.includes('react-icons')) return 'react-icons';
              if (id.includes('lucide-react')) return 'lucide-react';
              
              // Group remaining node_modules into vendor chunks
              if (id.includes('node_modules')) {
                const module = id.split('node_modules/')[1].split('/')[0];
                
                // Group small modules together
                const smallModules = ['clsx', 'tailwind-merge', 'date-fns', 'nanoid', 'zod'];
                if (smallModules.some(m => module.includes(m))) {
                  return 'utils';
                }
                
                // Group form-related modules
                const formModules = ['react-hook-form', '@hookform'];
                if (formModules.some(m => module.includes(m))) {
                  return 'forms';
                }
                
                return 'vendor';
              }
            },
            chunkFileNames: (chunkInfo) => {
              const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
              return `assets/js/${chunkInfo.name}-[hash].js`;
            },
          },
          onwarn(warning, warn) {
            // Ignore certain warnings
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
            pure_funcs: ['console.log', 'console.debug'],
          },
          format: {
            comments: false,
          },
        },
        sourcemap: false,
        reportCompressedSize: false,
        cssCodeSplit: true,
        assetsInlineLimit: 4096,
      },
      logLevel: 'info',
      clearScreen: false,
    });
    
    console.log('✅ Frontend build complete!');
    
    // Log build size
    const { stdout: sizeOutput } = await execAsync('du -sh dist/public');
    console.log(`📦 Frontend bundle size: ${sizeOutput.trim()}`);
    
  } catch (error) {
    console.error('❌ Frontend build failed:', error.message);
    throw error;
  }
}

async function buildBackend() {
  console.log('⚙️ Building backend with esbuild...');
  
  try {
    // Use esbuild with external packages to avoid bundling node_modules
    const command = `npx esbuild server/index.ts \
      --platform=node \
      --packages=external \
      --bundle \
      --format=esm \
      --outdir=dist \
      --minify \
      --log-level=warning \
      --metafile=dist/meta.json`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('warning')) {
      console.error('⚠️ Backend build warnings:', stderr);
    }
    
    console.log('✅ Backend build complete!');
    
    // Analyze backend bundle
    const metaFile = await fs.readFile('dist/meta.json', 'utf-8');
    const meta = JSON.parse(metaFile);
    const backendSize = Object.values(meta.outputs)[0].bytes;
    console.log(`📦 Backend bundle size: ${Math.round(backendSize / 1024)}KB`);
    
    // Clean up meta file
    await fs.unlink('dist/meta.json').catch(() => {});
    
  } catch (error) {
    console.error('❌ Backend build failed:', error.message);
    throw error;
  }
}

async function createDeploymentFiles() {
  console.log('📝 Creating deployment files...');
  
  // Create a simple health check endpoint file
  const healthCheckContent = `
export const healthCheck = (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
};
`;
  
  await fs.writeFile('dist/health.js', healthCheckContent);
  console.log('✅ Deployment files created');
}

async function main() {
  const startTime = Date.now();
  
  try {
    // Step 1: Clean
    await cleanDist();
    
    // Step 2: Build frontend
    await buildFrontend();
    
    // Step 3: Build backend
    await buildBackend();
    
    // Step 4: Create deployment files
    await createDeploymentFiles();
    
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ Build completed successfully in ${totalTime}s!`);
    console.log('📊 Final memory usage:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
    console.log('\n🚀 Ready for deployment!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    console.error('Please check the error above and try again.');
    process.exit(1);
  }
}

// Run the build
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});