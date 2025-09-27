import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { convertMediaPipeTo3D } from '@/utils/mediapipeTo3D';
// skeleton model will be loaded via URL path

interface RealtimeSkeletonOverlayProps {
  poseLandmarks: any[] | null;
  canvasWidth: number;
  canvasHeight: number;
  isActive: boolean;
  onSkeletonReady?: (ready: boolean) => void;
}

// MediaPipe landmark indices mapping to skeleton bones
const LANDMARK_TO_BONE_MAP = {
  // Head/Neck
  0: 'Head',           // Nose
  
  // Arms  
  11: 'LeftShoulder',  // Left shoulder
  12: 'RightShoulder', // Right shoulder
  13: 'LeftArm',       // Left elbow
  14: 'RightArm',      // Right elbow
  15: 'LeftForeArm',   // Left wrist
  16: 'RightForeArm',  // Right wrist
  
  // Torso/Spine
  23: 'LeftUpLeg',     // Left hip (use for hips position)
  24: 'RightUpLeg',    // Right hip
  
  // Legs
  25: 'LeftLeg',       // Left knee
  26: 'RightLeg',      // Right knee
  27: 'LeftFoot',      // Left ankle
  28: 'RightFoot'      // Right ankle
};

export default function RealtimeSkeletonOverlay({
  poseLandmarks,
  canvasWidth,
  canvasHeight,
  isActive,
  onSkeletonReady
}: RealtimeSkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    model?: THREE.Group;
    skeleton?: THREE.Skeleton;
    bones: { [key: string]: THREE.Bone };
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [skeletonReady, setSkeletonReady] = useState(false);

  // Initialize Three.js scene for overlay rendering
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background for overlay

    // Create orthographic camera for 2D overlay positioning
    const camera = new THREE.OrthographicCamera(
      -canvasWidth / 2, canvasWidth / 2,
      canvasHeight / 2, -canvasHeight / 2,
      0.1, 1000
    );
    camera.position.z = 100;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      alpha: true, // Enable transparency
      premultipliedAlpha: false
    });
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent background
    
    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 0, 100);
    scene.add(directionalLight);

    // Store scene reference
    sceneRef.current = {
      scene,
      camera,
      renderer,
      bones: {}
    };

    // Load skeleton model
    loadSkeletonModel();

    return () => {
      // Cleanup
      renderer.dispose();
      scene.clear();
    };
  }, [canvasWidth, canvasHeight]);

  // Load the skeleton model from attached assets
  const loadSkeletonModel = useCallback(() => {
    if (!sceneRef.current) return;

    const loader = new GLTFLoader();
    
    // Try to load the skeleton from attached assets - use URL that works with current setup
    const skeletonPath = '/attached_assets/skeleton_rig.glb';
    
    console.log('[RealtimeSkeletonOverlay] Loading skeleton from:', skeletonPath);
    
    loader.load(
      skeletonPath,
      (gltf) => {
        console.log('[RealtimeSkeletonOverlay] Skeleton loaded successfully');
        
        const model = gltf.scene;
        
        // Scale and position for overlay
        model.scale.set(100, 100, 100); // Scale up for overlay visibility
        model.position.set(0, 0, 0);
        
        // Apply bone-like material
        model.traverse((child: any) => {
          if (child.isMesh) {
            child.material = new THREE.MeshPhongMaterial({
              color: 0xe8d5c4, // Bone color
              transparent: true,
              opacity: 0.8,
              side: THREE.DoubleSide
            });
          }
        });
        
        // Find skeleton and bones
        let skeleton: THREE.Skeleton | undefined;
        const bones: { [key: string]: THREE.Bone } = {};
        
        model.traverse((child: any) => {
          if (child.isSkinnedMesh && child.skeleton) {
            skeleton = child.skeleton;
            
            // Map bones by name with multiple naming conventions
            if (skeleton) {
              skeleton.bones.forEach((bone: THREE.Bone) => {
              bones[bone.name] = bone;
              
              // Handle mixamorig prefixes
              if (bone.name.includes('mixamorig:')) {
                const shortName = bone.name.replace('mixamorig:', '');
                bones[shortName] = bone;
              } else if (bone.name.startsWith('mixamorig')) {
                const shortName = bone.name.replace('mixamorig', '');
                bones[shortName] = bone;
              }
              });
            }
          }
        });
        
        if (sceneRef.current) {
          sceneRef.current.scene.add(model);
          sceneRef.current.model = model;
          sceneRef.current.skeleton = skeleton;
          sceneRef.current.bones = bones;
        }
        
        setIsLoading(false);
        setSkeletonReady(true);
        onSkeletonReady?.(true);
        
        console.log('[RealtimeSkeletonOverlay] Skeleton ready with bones:', Object.keys(bones));
      },
      (progress) => {
        console.log('[RealtimeSkeletonOverlay] Loading progress:', (progress.loaded / progress.total * 100).toFixed(0) + '%');
      },
      (error) => {
        console.error('[RealtimeSkeletonOverlay] Failed to load skeleton:', error);
        
        // Fallback to procedural skeleton
        createFallbackSkeleton();
      }
    );
  }, [onSkeletonReady]);

  // Create a simple fallback skeleton if model loading fails
  const createFallbackSkeleton = useCallback(() => {
    if (!sceneRef.current) return;

    const bones: { [key: string]: THREE.Bone } = {};
    const boneArray: THREE.Bone[] = [];
    
    // Create basic skeleton structure
    const hips = new THREE.Bone();
    hips.name = 'Hips';
    hips.position.set(0, 0, 0);
    bones['Hips'] = hips;
    boneArray.push(hips);
    
    // Add basic bone hierarchy
    const spine = new THREE.Bone();
    spine.name = 'Spine';
    spine.position.set(0, 20, 0);
    hips.add(spine);
    bones['Spine'] = spine;
    boneArray.push(spine);
    
    // Add essential bones for pose mapping
    const leftArm = new THREE.Bone();
    leftArm.name = 'LeftArm';
    leftArm.position.set(15, 15, 0);
    spine.add(leftArm);
    bones['LeftArm'] = leftArm;
    boneArray.push(leftArm);
    
    const rightArm = new THREE.Bone();
    rightArm.name = 'RightArm';
    rightArm.position.set(-15, 15, 0);
    spine.add(rightArm);
    bones['RightArm'] = rightArm;
    boneArray.push(rightArm);
    
    // Create simple visual representation
    const skeletonHelper = new THREE.SkeletonHelper(hips);
    if (skeletonHelper.material instanceof THREE.LineBasicMaterial) {
      skeletonHelper.material.color.setHex(0xe8d5c4);
      skeletonHelper.material.linewidth = 3;
    }
    
    sceneRef.current.scene.add(skeletonHelper);
    sceneRef.current.bones = bones;
    
    setIsLoading(false);
    setSkeletonReady(true);
    onSkeletonReady?.(true);
    
    console.log('[RealtimeSkeletonOverlay] Fallback skeleton created');
  }, [onSkeletonReady]);

  // Update skeleton pose based on MediaPipe landmarks
  const updateSkeletonPose = useCallback((landmarks: any[]) => {
    if (!sceneRef.current || !skeletonReady || !landmarks) return;

    const { bones, camera } = sceneRef.current;
    
    // Convert MediaPipe normalized coordinates to canvas coordinates
    const convertCoords = (landmark: any) => ({
      x: (landmark.x - 0.5) * canvasWidth,
      y: (0.5 - landmark.y) * canvasHeight, // Flip Y axis
      z: landmark.z || 0
    });

    // Map MediaPipe landmarks to skeleton bones
    Object.entries(LANDMARK_TO_BONE_MAP).forEach(([landmarkIndex, boneName]) => {
      const landmark = landmarks[parseInt(landmarkIndex)];
      const bone = bones[boneName] || bones[`mixamorig:${boneName}`] || bones[`mixamorig${boneName}`];
      
      if (landmark && bone) {
        const coords = convertCoords(landmark);
        
        // Update bone position
        bone.position.set(coords.x, coords.y, coords.z * 100);
      }
    });

    // Calculate bone rotations based on landmark relationships
    if (landmarks[11] && landmarks[13] && landmarks[15]) { // Left arm chain
      const shoulder = convertCoords(landmarks[11]);
      const elbow = convertCoords(landmarks[13]);
      const wrist = convertCoords(landmarks[15]);
      
      const leftArmBone = bones['LeftArm'] || bones['mixamorig:LeftArm'];
      if (leftArmBone) {
        // Calculate arm rotation based on elbow-shoulder vector
        const armVector = new THREE.Vector3(
          elbow.x - shoulder.x,
          elbow.y - shoulder.y,
          elbow.z - shoulder.z
        );
        armVector.normalize();
        
        // Apply rotation
        leftArmBone.lookAt(armVector);
      }
    }

    // Similar for right arm
    if (landmarks[12] && landmarks[14] && landmarks[16]) { // Right arm chain
      const shoulder = convertCoords(landmarks[12]);
      const elbow = convertCoords(landmarks[14]);
      const wrist = convertCoords(landmarks[16]);
      
      const rightArmBone = bones['RightArm'] || bones['mixamorig:RightArm'];
      if (rightArmBone) {
        const armVector = new THREE.Vector3(
          elbow.x - shoulder.x,
          elbow.y - shoulder.y,
          elbow.z - shoulder.z
        );
        armVector.normalize();
        
        rightArmBone.lookAt(armVector);
      }
    }
  }, [skeletonReady, canvasWidth, canvasHeight]);

  // Render the skeleton overlay
  const renderSkeleton = useCallback(() => {
    if (!sceneRef.current || !skeletonReady) return;

    const { scene, camera, renderer } = sceneRef.current;
    
    renderer.clear();
    renderer.render(scene, camera);
  }, [skeletonReady]);

  // Update when pose landmarks change
  useEffect(() => {
    if (isActive && poseLandmarks && skeletonReady) {
      updateSkeletonPose(poseLandmarks);
      renderSkeleton();
    }
  }, [poseLandmarks, isActive, skeletonReady, updateSkeletonPose, renderSkeleton]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        width: canvasWidth,
        height: canvasHeight,
        opacity: isActive ? 0.8 : 0,
        transition: 'opacity 0.3s ease'
      }}
    />
  );
}