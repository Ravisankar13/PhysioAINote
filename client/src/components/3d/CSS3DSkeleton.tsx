import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { CSS3DRenderer, CSS3DObject } from 'three-css3drenderer';

interface SpineConfig {
  cervicalLordosis: number;
  thoracicKyphosis: number;
  lumbarLordosis: number;
}

interface CSS3DSkeletonProps {
  spineConfig: SpineConfig;
}

interface Bone {
  element: HTMLDivElement;
  object3D: any;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  type: 'spine' | 'limb' | 'joint';
  region?: 'cervical' | 'thoracic' | 'lumbar';
}

export default function CSS3DSkeleton({ spineConfig }: CSS3DSkeletonProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bonesRef = useRef<Bone[]>([]);
  const frameRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 400);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Initialize CSS3D renderer
    const renderer = new CSS3DRenderer();
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create skeleton structure
    const bones: Bone[] = [];

    // Create head
    const head = createBone('head', 'joint', 0, 150, 0, 30, 30, '#f0f0f0');
    scene.add(head.object3D);
    bones.push(head);

    // Create spine (vertebrae)
    const spineSegments = 24; // 7 cervical + 12 thoracic + 5 lumbar
    let currentY = 120;
    
    for (let i = 0; i < spineSegments; i++) {
      let region: 'cervical' | 'thoracic' | 'lumbar';
      let size = 15;
      let color = '#d0d0d0';
      
      if (i < 7) {
        // Cervical spine (neck)
        region = 'cervical';
        color = '#ffdddd';
        size = 12;
      } else if (i < 19) {
        // Thoracic spine (upper/mid back)
        region = 'thoracic';
        color = '#ddffdd';
        size = 15;
      } else {
        // Lumbar spine (lower back)
        region = 'lumbar';
        color = '#ddddff';
        size = 18;
      }
      
      const vertebra = createBone(
        `vertebra-${i}`,
        'spine',
        0,
        currentY,
        0,
        size,
        8,
        color,
        region
      );
      scene.add(vertebra.object3D);
      bones.push(vertebra);
      currentY -= 5;
    }

    // Create ribs
    for (let i = 0; i < 12; i++) {
      const ribY = 100 - (i * 6);
      const ribSpread = 40 + (i * 3);
      
      // Left rib
      const leftRib = createBone(
        `rib-left-${i}`,
        'limb',
        -ribSpread,
        ribY,
        0,
        ribSpread * 0.8,
        5,
        '#e0e0e0'
      );
      leftRib.element.style.transform += ' rotateZ(30deg)';
      scene.add(leftRib.object3D);
      bones.push(leftRib);
      
      // Right rib
      const rightRib = createBone(
        `rib-right-${i}`,
        'limb',
        ribSpread,
        ribY,
        0,
        ribSpread * 0.8,
        5,
        '#e0e0e0'
      );
      rightRib.element.style.transform += ' rotateZ(-30deg)';
      scene.add(rightRib.object3D);
      bones.push(rightRib);
    }

    // Create pelvis
    const pelvis = createBone('pelvis', 'joint', 0, -10, 0, 60, 20, '#e8e8e8');
    scene.add(pelvis.object3D);
    bones.push(pelvis);

    // Create arms
    // Left arm
    const leftShoulder = createBone('left-shoulder', 'joint', -50, 100, 0, 15, 15, '#f0f0f0');
    const leftUpperArm = createBone('left-upper-arm', 'limb', -60, 70, 0, 10, 40, '#e0e0e0');
    const leftElbow = createBone('left-elbow', 'joint', -60, 40, 0, 12, 12, '#f0f0f0');
    const leftForearm = createBone('left-forearm', 'limb', -60, 15, 0, 8, 35, '#e0e0e0');
    const leftHand = createBone('left-hand', 'joint', -60, -5, 0, 10, 15, '#f0f0f0');
    
    [leftShoulder, leftUpperArm, leftElbow, leftForearm, leftHand].forEach(bone => {
      scene.add(bone.object3D);
      bones.push(bone);
    });

    // Right arm
    const rightShoulder = createBone('right-shoulder', 'joint', 50, 100, 0, 15, 15, '#f0f0f0');
    const rightUpperArm = createBone('right-upper-arm', 'limb', 60, 70, 0, 10, 40, '#e0e0e0');
    const rightElbow = createBone('right-elbow', 'joint', 60, 40, 0, 12, 12, '#f0f0f0');
    const rightForearm = createBone('right-forearm', 'limb', 60, 15, 0, 8, 35, '#e0e0e0');
    const rightHand = createBone('right-hand', 'joint', 60, -5, 0, 10, 15, '#f0f0f0');
    
    [rightShoulder, rightUpperArm, rightElbow, rightForearm, rightHand].forEach(bone => {
      scene.add(bone.object3D);
      bones.push(bone);
    });

    // Create legs
    // Left leg
    const leftHip = createBone('left-hip', 'joint', -25, -20, 0, 15, 15, '#f0f0f0');
    const leftThigh = createBone('left-thigh', 'limb', -25, -50, 0, 12, 50, '#e0e0e0');
    const leftKnee = createBone('left-knee', 'joint', -25, -80, 0, 12, 12, '#f0f0f0');
    const leftShin = createBone('left-shin', 'limb', -25, -110, 0, 10, 45, '#e0e0e0');
    const leftFoot = createBone('left-foot', 'joint', -25, -140, 0, 25, 8, '#f0f0f0');
    
    [leftHip, leftThigh, leftKnee, leftShin, leftFoot].forEach(bone => {
      scene.add(bone.object3D);
      bones.push(bone);
    });

    // Right leg
    const rightHip = createBone('right-hip', 'joint', 25, -20, 0, 15, 15, '#f0f0f0');
    const rightThigh = createBone('right-thigh', 'limb', 25, -50, 0, 12, 50, '#e0e0e0');
    const rightKnee = createBone('right-knee', 'joint', 25, -80, 0, 12, 12, '#f0f0f0');
    const rightShin = createBone('right-shin', 'limb', 25, -110, 0, 10, 45, '#e0e0e0');
    const rightFoot = createBone('right-foot', 'joint', 25, -140, 0, 25, 8, '#f0f0f0');
    
    [rightHip, rightThigh, rightKnee, rightShin, rightFoot].forEach(bone => {
      scene.add(bone.object3D);
      bones.push(bone);
    });

    bonesRef.current = bones;
    setIsInitialized(true);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      // Auto-rotate the skeleton
      scene.rotation.y += 0.005;
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Apply spine curvature based on sliders
  useEffect(() => {
    if (!isInitialized || !sceneRef.current) return;

    bonesRef.current.forEach((bone) => {
      if (bone.type === 'spine' && bone.region) {
        let rotation = 0;
        
        if (bone.region === 'cervical') {
          rotation = (spineConfig.cervicalLordosis / 7) * Math.PI / 180;
        } else if (bone.region === 'thoracic') {
          rotation = (spineConfig.thoracicKyphosis / 12) * Math.PI / 180;
        } else if (bone.region === 'lumbar') {
          rotation = (spineConfig.lumbarLordosis / 5) * Math.PI / 180;
        }
        
        // Apply rotation to create spine curvature
        bone.object3D.rotation.x = rotation;
        bone.element.style.transform = `
          translateX(-50%) 
          translateY(-50%) 
          rotateX(${rotation * 180 / Math.PI}deg)
        `;
      }
    });
  }, [spineConfig, isInitialized]);

  // Helper function to create bone elements
  function createBone(
    id: string,
    type: 'spine' | 'limb' | 'joint',
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    color: string,
    region?: 'cervical' | 'thoracic' | 'lumbar'
  ): Bone {
    const element = document.createElement('div');
    element.className = 'skeleton-bone';
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.backgroundColor = color;
    element.style.border = '1px solid #999';
    element.style.borderRadius = type === 'joint' ? '50%' : '4px';
    element.style.position = 'absolute';
    element.style.transform = 'translateX(-50%) translateY(-50%)';
    element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    
    const object3D = new CSS3DObject(element);
    object3D.position.set(x, y, z);
    
    return {
      element,
      object3D,
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(0, 0, 0),
      type,
      region
    };
  }

  return (
    <div className="css3d-skeleton-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} />
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading CSS3D Skeleton...</p>
          </div>
        </div>
      )}
    </div>
  );
}