import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { AlertCircle, Loader2 } from 'lucide-react';

interface Simple3DSkeletonProps {
  patientData?: {
    anthropometrics?: {
      height: number;
      weight: number;
      limbLengths?: {
        upperArm: number;
        forearm: number;
        thigh: number;
        shin: number;
      };
    };
    jointRestrictions?: any;
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
  showControls?: boolean;
}

export default function Simple3DSkeleton({
  patientData,
  className = '',
  showControls = true
}: Simple3DSkeletonProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'checking' | 'loading' | 'ready' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    skeleton?: THREE.Group;
    clock: THREE.Clock;
    mouseX: number;
    mouseY: number;
    animationId?: number;
  } | null>(null);

  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
          setErrorMessage('WebGL is not available in this browser');
          setStatus('error');
          return false;
        }
        return true;
      } catch (e) {
        setErrorMessage('Failed to check WebGL support');
        setStatus('error');
        return false;
      }
    };

    if (!checkWebGL()) return;
    setStatus('loading');
  }, []);

  useEffect(() => {
    if (status !== 'loading' || !mountRef.current) return;

    const mount = mountRef.current;
    let animationId: number;

    try {
      const width = mount.clientWidth || 400;
      const height = mount.clientHeight || 400;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);

      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      camera.position.set(3, 2, 3);
      camera.lookAt(0, 1, 0);

      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false,
        failIfMajorPerformanceCaveat: false
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      mount.appendChild(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
      directionalLight2.position.set(-10, -10, -5);
      scene.add(directionalLight2);

      const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
      scene.add(gridHelper);

      const skeletonGroup = new THREE.Group();
      
      const bones: THREE.Bone[] = [];
      
      const hips = new THREE.Bone();
      hips.name = 'Hips';
      hips.position.set(0, 1, 0);
      bones.push(hips);
      
      const spine = new THREE.Bone();
      spine.name = 'Spine';
      spine.position.set(0, 0.2, 0);
      hips.add(spine);
      bones.push(spine);
      
      const chest = new THREE.Bone();
      chest.name = 'Chest';
      chest.position.set(0, 0.3, 0);
      spine.add(chest);
      bones.push(chest);
      
      const neck = new THREE.Bone();
      neck.name = 'Neck';
      neck.position.set(0, 0.2, 0);
      chest.add(neck);
      bones.push(neck);
      
      const head = new THREE.Bone();
      head.name = 'Head';
      head.position.set(0, 0.15, 0);
      neck.add(head);
      bones.push(head);
      
      const leftShoulder = new THREE.Bone();
      leftShoulder.name = 'LeftShoulder';
      leftShoulder.position.set(0.15, 0.1, 0);
      chest.add(leftShoulder);
      bones.push(leftShoulder);
      
      const leftArm = new THREE.Bone();
      leftArm.name = 'LeftArm';
      leftArm.position.set(0.15, 0, 0);
      leftShoulder.add(leftArm);
      bones.push(leftArm);
      
      const leftForeArm = new THREE.Bone();
      leftForeArm.name = 'LeftForeArm';
      leftForeArm.position.set(0.25, 0, 0);
      leftArm.add(leftForeArm);
      bones.push(leftForeArm);
      
      const leftHand = new THREE.Bone();
      leftHand.name = 'LeftHand';
      leftHand.position.set(0.2, 0, 0);
      leftForeArm.add(leftHand);
      bones.push(leftHand);
      
      const rightShoulder = new THREE.Bone();
      rightShoulder.name = 'RightShoulder';
      rightShoulder.position.set(-0.15, 0.1, 0);
      chest.add(rightShoulder);
      bones.push(rightShoulder);
      
      const rightArm = new THREE.Bone();
      rightArm.name = 'RightArm';
      rightArm.position.set(-0.15, 0, 0);
      rightShoulder.add(rightArm);
      bones.push(rightArm);
      
      const rightForeArm = new THREE.Bone();
      rightForeArm.name = 'RightForeArm';
      rightForeArm.position.set(-0.25, 0, 0);
      rightArm.add(rightForeArm);
      bones.push(rightForeArm);
      
      const rightHand = new THREE.Bone();
      rightHand.name = 'RightHand';
      rightHand.position.set(-0.2, 0, 0);
      rightForeArm.add(rightHand);
      bones.push(rightHand);
      
      const leftUpLeg = new THREE.Bone();
      leftUpLeg.name = 'LeftUpLeg';
      leftUpLeg.position.set(0.1, -0.05, 0);
      hips.add(leftUpLeg);
      bones.push(leftUpLeg);
      
      const leftLeg = new THREE.Bone();
      leftLeg.name = 'LeftLeg';
      leftLeg.position.set(0, -0.4, 0);
      leftUpLeg.add(leftLeg);
      bones.push(leftLeg);
      
      const leftFoot = new THREE.Bone();
      leftFoot.name = 'LeftFoot';
      leftFoot.position.set(0, -0.35, 0);
      leftLeg.add(leftFoot);
      bones.push(leftFoot);
      
      const rightUpLeg = new THREE.Bone();
      rightUpLeg.name = 'RightUpLeg';
      rightUpLeg.position.set(-0.1, -0.05, 0);
      hips.add(rightUpLeg);
      bones.push(rightUpLeg);
      
      const rightLeg = new THREE.Bone();
      rightLeg.name = 'RightLeg';
      rightLeg.position.set(0, -0.4, 0);
      rightUpLeg.add(rightLeg);
      bones.push(rightLeg);
      
      const rightFoot = new THREE.Bone();
      rightFoot.name = 'RightFoot';
      rightFoot.position.set(0, -0.35, 0);
      rightLeg.add(rightFoot);
      bones.push(rightFoot);
      
      new THREE.Skeleton(bones);
      
      const skeletonHelper = new THREE.SkeletonHelper(hips);
      (skeletonHelper.material as THREE.LineBasicMaterial).color = new THREE.Color(0x00ff00);
      scene.add(skeletonHelper);
      
      const createBodyPart = (geometry: THREE.BufferGeometry, color: number, position: THREE.Vector3) => {
        const material = new THREE.MeshPhongMaterial({ 
          color,
          transparent: true,
          opacity: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      };
      
      const torso = createBodyPart(
        new THREE.CylinderGeometry(0.2, 0.3, 1.2, 8),
        0xe8d5c4,
        new THREE.Vector3(0, 1, 0)
      );
      skeletonGroup.add(torso);
      
      const headMesh = createBodyPart(
        new THREE.SphereGeometry(0.15, 16, 16),
        0xe8d5c4,
        new THREE.Vector3(0, 1.85, 0)
      );
      skeletonGroup.add(headMesh);
      
      const leftUpperArm = createBodyPart(
        new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8),
        0xe8d5c4,
        new THREE.Vector3(0.25, 1.45, 0)
      );
      leftUpperArm.rotation.z = -Math.PI / 4;
      skeletonGroup.add(leftUpperArm);
      
      const rightUpperArm = createBodyPart(
        new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8),
        0xe8d5c4,
        new THREE.Vector3(-0.25, 1.45, 0)
      );
      rightUpperArm.rotation.z = Math.PI / 4;
      skeletonGroup.add(rightUpperArm);
      
      const leftForearm = createBodyPart(
        new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8),
        0xe8d5c4,
        new THREE.Vector3(0.45, 1.25, 0)
      );
      leftForearm.rotation.z = -Math.PI / 4;
      skeletonGroup.add(leftForearm);
      
      const rightForearm = createBodyPart(
        new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8),
        0xe8d5c4,
        new THREE.Vector3(-0.45, 1.25, 0)
      );
      rightForearm.rotation.z = Math.PI / 4;
      skeletonGroup.add(rightForearm);
      
      const leftThigh = createBodyPart(
        new THREE.CylinderGeometry(0.08, 0.06, 0.4, 8),
        0xe8d5c4,
        new THREE.Vector3(0.1, 0.6, 0)
      );
      skeletonGroup.add(leftThigh);
      
      const rightThigh = createBodyPart(
        new THREE.CylinderGeometry(0.08, 0.06, 0.4, 8),
        0xe8d5c4,
        new THREE.Vector3(-0.1, 0.6, 0)
      );
      skeletonGroup.add(rightThigh);
      
      const leftShin = createBodyPart(
        new THREE.CylinderGeometry(0.06, 0.05, 0.35, 8),
        0xe8d5c4,
        new THREE.Vector3(0.1, 0.2, 0)
      );
      skeletonGroup.add(leftShin);
      
      const rightShin = createBodyPart(
        new THREE.CylinderGeometry(0.06, 0.05, 0.35, 8),
        0xe8d5c4,
        new THREE.Vector3(-0.1, 0.2, 0)
      );
      skeletonGroup.add(rightShin);
      
      if (patientData?.painAreas) {
        patientData.painAreas.forEach((area) => {
          const painGeometry = new THREE.SphereGeometry(0.05, 8, 8);
          const painMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.7
          });
          const painIndicator = new THREE.Mesh(painGeometry, painMaterial);
          
          if (area.toLowerCase().includes('shoulder')) {
            painIndicator.position.set(area.includes('left') ? 0.3 : -0.3, 1.5, 0);
          } else if (area.toLowerCase().includes('knee')) {
            painIndicator.position.set(area.includes('left') ? 0.15 : -0.15, 0.4, 0);
          } else if (area.toLowerCase().includes('back')) {
            painIndicator.position.set(0, 1, -0.1);
          } else if (area.toLowerCase().includes('hip')) {
            painIndicator.position.set(area.includes('left') ? 0.1 : -0.1, 0.8, 0);
          } else if (area.toLowerCase().includes('neck')) {
            painIndicator.position.set(0, 1.6, 0);
          }
          
          skeletonGroup.add(painIndicator);
        });
      }
      
      scene.add(skeletonGroup);
      
      sceneRef.current = {
        scene,
        camera,
        renderer,
        skeleton: skeletonGroup,
        clock: new THREE.Clock(),
        mouseX: 0,
        mouseY: 0
      };
      
      if (showControls) {
        const handleMouseMove = (event: MouseEvent) => {
          if (!sceneRef.current) return;
          const rect = mount.getBoundingClientRect();
          sceneRef.current.mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          sceneRef.current.mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        };
        
        const handleWheel = (event: WheelEvent) => {
          event.preventDefault();
          if (!sceneRef.current) return;
          const delta = event.deltaY * 0.001;
          const distance = camera.position.length();
          const newDistance = Math.max(2, Math.min(10, distance + delta));
          camera.position.normalize().multiplyScalar(newDistance);
        };
        
        mount.addEventListener('mousemove', handleMouseMove);
        mount.addEventListener('wheel', handleWheel, { passive: false });
      }
      
      const animate = () => {
        if (!sceneRef.current) return;
        
        animationId = requestAnimationFrame(animate);
        
        const delta = sceneRef.current.clock.getDelta();
        
        if (sceneRef.current.skeleton) {
          sceneRef.current.skeleton.rotation.y += delta * 0.3;
        }
        
        if (showControls && sceneRef.current.mouseX !== undefined) {
          const targetX = sceneRef.current.mouseX * Math.PI * 0.5;
          const targetY = sceneRef.current.mouseY * Math.PI * 0.25 + 1;
          
          camera.position.x += (Math.sin(targetX) * 5 - camera.position.x) * 0.05;
          camera.position.y += (targetY * 2 - camera.position.y) * 0.05;
          camera.lookAt(0, 1, 0);
        }
        
        sceneRef.current.renderer.render(
          sceneRef.current.scene,
          sceneRef.current.camera
        );
      };
      
      animate();
      setStatus('ready');
      
      const handleResize = () => {
        if (!sceneRef.current || !mountRef.current) return;
        
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        
        sceneRef.current.camera.aspect = width / height;
        sceneRef.current.camera.updateProjectionMatrix();
        sceneRef.current.renderer.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        
        if (sceneRef.current) {
          sceneRef.current.renderer.dispose();
          if (mount.contains(sceneRef.current.renderer.domElement)) {
            mount.removeChild(sceneRef.current.renderer.domElement);
          }
        }
        sceneRef.current = null;
      };
    } catch (error) {
      console.error('3D Skeleton initialization error:', error);
      setErrorMessage(`Failed to initialize 3D viewer: ${error}`);
      setStatus('error');
    }
  }, [status, showControls, patientData]);
  
  if (status === 'checking') {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking WebGL support...</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-lg p-4 ${className}`}>
        <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
        <h3 className="text-lg font-semibold text-amber-400 mb-2">3D Viewer Unavailable</h3>
        <p className="text-sm text-amber-300/80 text-center max-w-md">{errorMessage}</p>
        <p className="text-xs text-amber-400/60 mt-2">Try viewing in a browser with WebGL support</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative ${className}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex items-center gap-2 text-green-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading 3D Model...</span>
          </div>
        </div>
      )}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
