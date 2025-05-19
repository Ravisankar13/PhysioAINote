import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy the GLB file from attached_assets to public folder
const sourceGlbPath = path.join(__dirname, '..', 'attached_assets', 'skeleton_rig.glb');
const destGlbPath = path.join(publicDir, 'skeleton_rig.glb');

try {
  fs.copyFileSync(sourceGlbPath, destGlbPath);
  console.log('Successfully copied skeleton_rig.glb to public directory');
} catch (err) {
  console.error('Error copying GLB file:', err);
}