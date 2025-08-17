import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

interface MixamoModelData {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  bones: Map<string, THREE.Bone>;
  mixer?: THREE.AnimationMixer;
}

interface UseMixamoLoaderProps {
  modelPath?: string;
  onLoad?: (data: MixamoModelData) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

// Standard Mixamo bone names mapping to our system
const MIXAMO_BONE_MAP: Record<string, string> = {
  'mixamorigHips': 'hips',
  'mixamorigSpine': 'spine',
  'mixamorigSpine1': 'spine1',
  'mixamorigSpine2': 'spine2',
  'mixamorigNeck': 'neck',
  'mixamorigHead': 'head',
  'mixamorigLeftShoulder': 'leftShoulder',
  'mixamorigLeftArm': 'leftUpperArm',
  'mixamorigLeftForeArm': 'leftForearm',
  'mixamorigLeftHand': 'leftHand',
  'mixamorigRightShoulder': 'rightShoulder',
  'mixamorigRightArm': 'rightUpperArm',
  'mixamorigRightForeArm': 'rightForearm',
  'mixamorigRightHand': 'rightHand',
  'mixamorigLeftUpLeg': 'leftThigh',
  'mixamorigLeftLeg': 'leftShin',
  'mixamorigLeftFoot': 'leftFoot',
  'mixamorigRightUpLeg': 'rightThigh',
  'mixamorigRightLeg': 'rightShin',
  'mixamorigRightFoot': 'rightFoot',
};

export function useMixamoLoader({
  modelPath = '/models/mixamo/base-skeleton.glb',
  onLoad,
  onProgress,
  onError
}: UseMixamoLoaderProps = {}) {
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<MixamoModelData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const loaderRef = useRef<GLTFLoader | null>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loaderRef.current = loader;

    // Setup Draco loader for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);

    // Load the model
    loader.load(
      modelPath,
      (gltf) => {
        // Extract bones from the model
        const bones = new Map<string, THREE.Bone>();
        
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Bone) {
            // Map Mixamo bone names to our simplified names
            const mixamoName = child.name;
            const simpleName = MIXAMO_BONE_MAP[mixamoName] || mixamoName;
            bones.set(simpleName, child);
            
            // Store original name for reference
            child.userData.originalName = mixamoName;
            child.userData.simpleName = simpleName;
          }
        });

        // Create animation mixer if animations exist
        let mixer: THREE.AnimationMixer | undefined;
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(gltf.scene);
        }

        const modelData: MixamoModelData = {
          scene: gltf.scene,
          animations: gltf.animations || [],
          bones,
          mixer
        };

        setModel(modelData);
        setLoading(false);
        setError(null);
        
        if (onLoad) {
          onLoad(modelData);
        }
      },
      (progress) => {
        const percentComplete = (progress.loaded / progress.total) * 100;
        if (onProgress) {
          onProgress(percentComplete);
        }
      },
      (err) => {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const error = new Error(`Failed to load model: ${errorMessage}`);
        setError(error);
        setLoading(false);
        
        if (onError) {
          onError(error);
        }
      }
    );

    return () => {
      // Cleanup
      dracoLoader.dispose();
    };
  }, [modelPath, onLoad, onProgress, onError]);

  return { loading, model, error };
}

// Utility function to apply bone transformations
export function applyBoneTransform(
  bone: THREE.Bone,
  transform: {
    position?: { x?: number; y?: number; z?: number };
    rotation?: { x?: number; y?: number; z?: number };
    scale?: { x?: number; y?: number; z?: number };
  }
) {
  if (transform.position) {
    if (transform.position.x !== undefined) bone.position.x = transform.position.x;
    if (transform.position.y !== undefined) bone.position.y = transform.position.y;
    if (transform.position.z !== undefined) bone.position.z = transform.position.z;
  }

  if (transform.rotation) {
    if (transform.rotation.x !== undefined) bone.rotation.x = transform.rotation.x;
    if (transform.rotation.y !== undefined) bone.rotation.y = transform.rotation.y;
    if (transform.rotation.z !== undefined) bone.rotation.z = transform.rotation.z;
  }

  if (transform.scale) {
    if (transform.scale.x !== undefined) bone.scale.x = transform.scale.x;
    if (transform.scale.y !== undefined) bone.scale.y = transform.scale.y;
    if (transform.scale.z !== undefined) bone.scale.z = transform.scale.z;
  }
}

// Utility to get bone chain (useful for IK and constraints)
export function getBoneChain(startBone: THREE.Bone, endBoneName: string): THREE.Bone[] {
  const chain: THREE.Bone[] = [startBone];
  let current = startBone;

  while (current.children.length > 0) {
    const nextBone = current.children.find(
      child => child instanceof THREE.Bone
    ) as THREE.Bone | undefined;

    if (!nextBone) break;
    
    chain.push(nextBone);
    
    if (nextBone.userData.simpleName === endBoneName || 
        nextBone.name === endBoneName) {
      break;
    }
    
    current = nextBone;
  }

  return chain;
}