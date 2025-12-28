import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface MuscleLayer {
  id: string;
  name: string;
  path: string;
  visible: boolean;
  opacity: number;
  loaded: boolean;
  group?: THREE.Group;
}

export interface MuscleLayerConfig {
  id: string;
  name: string;
  path: string;
  defaultVisible?: boolean;
  defaultOpacity?: number;
  scale?: THREE.Vector3;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
}

const DEFAULT_MUSCLE_LAYERS: MuscleLayerConfig[] = [
  {
    id: 'muscular_system',
    name: 'Muscular System',
    path: '/models/muscle_system.glb',
    defaultVisible: true,
    defaultOpacity: 0.85,
    scale: new THREE.Vector3(1.8, 1.8, 1.8),
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0)
  }
];

export class MuscleLayerManager {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private layers: Map<string, MuscleLayer> = new Map();
  private layerConfigs: MuscleLayerConfig[];
  private isInitialized: boolean = false;
  private loadingPromises: Map<string, Promise<void>> = new Map();

  constructor(scene: THREE.Scene, configs?: MuscleLayerConfig[]) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.layerConfigs = configs || DEFAULT_MUSCLE_LAYERS;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    for (const config of this.layerConfigs) {
      this.layers.set(config.id, {
        id: config.id,
        name: config.name,
        path: config.path,
        visible: config.defaultVisible ?? true,
        opacity: config.defaultOpacity ?? 0.85,
        loaded: false
      });
    }

    this.isInitialized = true;
  }

  async loadLayer(layerId: string): Promise<void> {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`Muscle layer ${layerId} not found`);
      return;
    }

    if (layer.loaded) return;

    if (this.loadingPromises.has(layerId)) {
      return this.loadingPromises.get(layerId);
    }

    const config = this.layerConfigs.find(c => c.id === layerId);
    if (!config) return;

    const loadPromise = new Promise<void>((resolve, reject) => {
      this.loader.load(
        config.path,
        (gltf: GLTF) => {
          const group = new THREE.Group();
          group.name = `muscle_layer_${layerId}`;

          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((mat) => {
                  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                    mat.transparent = true;
                    mat.opacity = layer.opacity;
                    mat.side = THREE.DoubleSide;
                    mat.depthWrite = true;
                  }
                });
              }
            }
          });

          group.add(gltf.scene);

          if (config.scale) {
            group.scale.copy(config.scale);
          }
          if (config.position) {
            group.position.copy(config.position);
          }
          if (config.rotation) {
            group.rotation.copy(config.rotation);
          }

          group.visible = layer.visible;

          this.scene.add(group);
          layer.group = group;
          layer.loaded = true;

          console.log(`Muscle layer ${layerId} loaded successfully`);
          resolve();
        },
        (progress) => {
          const percent = (progress.loaded / progress.total * 100).toFixed(1);
          console.log(`Loading muscle layer ${layerId}: ${percent}%`);
        },
        (error) => {
          console.error(`Failed to load muscle layer ${layerId}:`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(layerId, loadPromise);
    return loadPromise;
  }

  async loadAllLayers(): Promise<void> {
    const promises = Array.from(this.layers.keys()).map(id => this.loadLayer(id));
    await Promise.all(promises);
  }

  setLayerVisible(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    layer.visible = visible;
    if (layer.group) {
      layer.group.visible = visible;
    }
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.layers.get(layerId);
    if (!layer || !layer.group) return;

    layer.opacity = opacity;

    layer.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
            mat.opacity = opacity;
          }
        });
      }
    });
  }

  setLayerTransform(layerId: string, options: {
    scale?: THREE.Vector3;
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
  }): void {
    const layer = this.layers.get(layerId);
    if (!layer || !layer.group) return;

    if (options.scale) {
      layer.group.scale.copy(options.scale);
    }
    if (options.position) {
      layer.group.position.copy(options.position);
    }
    if (options.rotation) {
      layer.group.rotation.copy(options.rotation);
    }
  }

  getLayer(layerId: string): MuscleLayer | undefined {
    return this.layers.get(layerId);
  }

  getAllLayers(): MuscleLayer[] {
    return Array.from(this.layers.values());
  }

  isLayerVisible(layerId: string): boolean {
    return this.layers.get(layerId)?.visible ?? false;
  }

  isLayerLoaded(layerId: string): boolean {
    return this.layers.get(layerId)?.loaded ?? false;
  }

  toggleLayer(layerId: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    const newVisible = !layer.visible;
    this.setLayerVisible(layerId, newVisible);
    return newVisible;
  }

  dispose(): void {
    this.layers.forEach((layer) => {
      if (layer.group) {
        layer.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => mat?.dispose());
          }
        });
        this.scene.remove(layer.group);
      }
    });

    this.layers.clear();
    this.loadingPromises.clear();
    this.isInitialized = false;
  }
}
