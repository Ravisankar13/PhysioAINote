import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

interface ThreeDAnatomicalVisualizationProps {
  animationData?: any;
  currentFrame?: number;
  isPlaying?: boolean;
  className?: string;
}

interface BoneModel {
  mesh: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
}

const ThreeDAnatomicalVisualization: React.FC<ThreeDAnatomicalVisualizationProps> = ({
  animationData,
  currentFrame = 0,
  isPlaying = false,
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const controlsRef = useRef<OrbitControls>();
  const boneModelsRef = useRef<Map<string, BoneModel>>(new Map());
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize 3D scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // Camera setup (orthographic for medical accuracy)
    const aspect = 400 / 400;
    const frustumSize = 300;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2, frustumSize * aspect / 2,
      frustumSize / 2, -frustumSize / 2,
      1, 1000
    );
    camera.position.set(0, 0, 500);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true 
    });
    renderer.setSize(400, 400);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // Lighting setup for medical visualization
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-100, -100, 50);
    scene.add(fillLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controlsRef.current = controls;

    mountRef.current.appendChild(renderer.domElement);

    // Load 3D bone models
    loadBoneModels();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Load 3D bone models
  const loadBoneModels = async () => {
    const scene = sceneRef.current;
    if (!scene) return;

    try {
      // Create procedural bone models
      await createProceduralBoneModels();
      setIsLoaded(true);
      setLoadingProgress(100);
    } catch (error) {
      console.error('Error creating bone models:', error);
      // Fallback to procedural models
      await createProceduralBoneModels();
      setIsLoaded(true);
    }
  };

  // Create procedural 3D bone models
  const createProceduralBoneModels = async () => {
    const scene = sceneRef.current;
    if (!scene) return;

    const boneModels = new Map<string, BoneModel>();

    // Bone material with realistic appearance
    const boneMaterial = new THREE.MeshPhongMaterial({
      color: 0xf5deb3,
      shininess: 30,
      specular: 0x333333
    });

    const affectedBoneMaterial = new THREE.MeshPhongMaterial({
      color: 0xff6b6b,
      shininess: 30,
      specular: 0x333333
    });

    // Create femur (thigh bone) with anatomical detail
    const createFemur = (isLeft: boolean) => {
      const group = new THREE.Group();
      
      // Femoral head (ball joint)
      const headGeometry = new THREE.SphereGeometry(8, 16, 16);
      const head = new THREE.Mesh(headGeometry, boneMaterial);
      head.position.set(0, 80, 0);
      group.add(head);

      // Femoral neck
      const neckGeometry = new THREE.CylinderGeometry(4, 6, 20, 8);
      const neck = new THREE.Mesh(neckGeometry, boneMaterial);
      neck.position.set(isLeft ? -10 : 10, 70, 0);
      neck.rotation.z = isLeft ? -Math.PI/6 : Math.PI/6;
      group.add(neck);

      // Femoral shaft
      const shaftGeometry = new THREE.CylinderGeometry(6, 8, 60, 8);
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.set(0, 30, 0);
      group.add(shaft);

      // Femoral condyles (knee joint)
      const condyleGeometry = new THREE.SphereGeometry(10, 12, 12);
      const medialCondyle = new THREE.Mesh(condyleGeometry, boneMaterial);
      medialCondyle.position.set(isLeft ? -6 : 6, -5, 0);
      medialCondyle.scale.set(0.8, 0.6, 1.2);
      group.add(medialCondyle);

      const lateralCondyle = new THREE.Mesh(condyleGeometry, boneMaterial);
      lateralCondyle.position.set(isLeft ? 6 : -6, -5, 0);
      lateralCondyle.scale.set(0.8, 0.6, 1.2);
      group.add(lateralCondyle);

      return group;
    };

    // Create tibia (shin bone)
    const createTibia = () => {
      const group = new THREE.Group();
      
      // Tibial plateau (knee joint surface)
      const plateauGeometry = new THREE.CylinderGeometry(12, 10, 8, 8);
      const plateau = new THREE.Mesh(plateauGeometry, boneMaterial);
      plateau.position.set(0, 35, 0);
      group.add(plateau);

      // Tibial shaft
      const shaftGeometry = new THREE.CylinderGeometry(5, 7, 60, 8);
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.set(0, 0, 0);
      group.add(shaft);

      // Medial malleolus (ankle prominence)
      const malleolus = new THREE.Mesh(
        new THREE.SphereGeometry(4, 8, 8),
        boneMaterial
      );
      malleolus.position.set(3, -30, 0);
      group.add(malleolus);

      return group;
    };

    // Create humerus (upper arm bone)
    const createHumerus = () => {
      const group = new THREE.Group();
      
      // Humeral head (shoulder joint)
      const headGeometry = new THREE.SphereGeometry(10, 16, 16);
      const head = new THREE.Mesh(headGeometry, boneMaterial);
      head.position.set(0, 30, 0);
      group.add(head);

      // Greater tubercle
      const tubercleGeometry = new THREE.SphereGeometry(5, 8, 8);
      const tubercle = new THREE.Mesh(tubercleGeometry, boneMaterial);
      tubercle.position.set(8, 25, 0);
      group.add(tubercle);

      // Humeral shaft
      const shaftGeometry = new THREE.CylinderGeometry(5, 7, 50, 8);
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.set(0, 0, 0);
      group.add(shaft);

      // Humeral condyles (elbow joint)
      const condyleGeometry = new THREE.SphereGeometry(6, 10, 10);
      const condyle = new THREE.Mesh(condyleGeometry, boneMaterial);
      condyle.position.set(0, -25, 0);
      condyle.scale.set(1.5, 0.8, 1);
      group.add(condyle);

      return group;
    };

    // Create spine vertebrae
    const createSpine = () => {
      const group = new THREE.Group();
      
      for (let i = 0; i < 7; i++) {
        const vertebra = new THREE.Group();
        
        // Vertebral body
        const bodyGeometry = new THREE.BoxGeometry(12, 8, 10);
        const body = new THREE.Mesh(bodyGeometry, boneMaterial);
        vertebra.add(body);

        // Spinous process
        const processGeometry = new THREE.BoxGeometry(4, 6, 15);
        const process = new THREE.Mesh(processGeometry, boneMaterial);
        process.position.z = -8;
        vertebra.add(process);

        vertebra.position.y = i * 12;
        group.add(vertebra);
      }

      return group;
    };

    // Create and position bone models
    const bones = {
      'left_femur': createFemur(true),
      'right_femur': createFemur(false),
      'left_tibia': createTibia(),
      'right_tibia': createTibia(),
      'left_humerus': createHumerus(),
      'right_humerus': createHumerus(),
      'spine': createSpine()
    };

    // Add bones to scene and store references
    Object.entries(bones).forEach(([name, bone]) => {
      scene.add(bone);
      boneModels.set(name, {
        mesh: bone as THREE.Mesh,
        originalPosition: bone.position.clone(),
        originalRotation: bone.rotation.clone()
      });
    });

    boneModelsRef.current = boneModels;
  };

  // Update bone positions based on animation data
  useEffect(() => {
    if (!animationData?.frames?.length || !isLoaded) return;

    const frame = animationData.frames[currentFrame];
    if (!frame?.keypoints) return;

    const scene = sceneRef.current;
    const boneModels = boneModelsRef.current;
    if (!scene || !boneModels.size) return;

    // Helper function to find keypoint
    const getKeypoint = (name: string) => {
      return frame.keypoints.find((kp: any) => kp.name === name);
    };

    // Position bones based on keypoints
    const leftHip = getKeypoint('left_hip');
    const leftKnee = getKeypoint('left_knee');
    const leftAnkle = getKeypoint('left_ankle');
    const rightHip = getKeypoint('right_hip');
    const rightKnee = getKeypoint('right_knee');
    const rightAnkle = getKeypoint('right_ankle');
    const leftShoulder = getKeypoint('left_shoulder');
    const leftElbow = getKeypoint('left_elbow');
    const rightShoulder = getKeypoint('right_shoulder');
    const rightElbow = getKeypoint('right_elbow');
    const neck = getKeypoint('neck');
    const spine = getKeypoint('spine');

    // Helper function to update bone color based on clinical status
    const updateBoneColor = (bone: THREE.Group | THREE.Mesh, isAffected: boolean) => {
      const material = new THREE.MeshPhongMaterial({
        color: isAffected ? 0xff6b6b : 0xf5deb3,
        shininess: 30,
        specular: 0x333333,
        transparent: isAffected,
        opacity: isAffected ? 0.8 : 1.0
      });

      bone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
    };

    // Position all bones systematically
    const bones = Array.from(boneModels.values());
    
    // Position femurs (thigh bones)
    if (leftHip && leftKnee && bones[0]) {
      const leftFemur = bones[0].mesh;
      leftFemur.position.set(
        leftHip.x - 200, 
        -(leftHip.y + leftKnee.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x);
      leftFemur.rotation.z = angle - Math.PI/2;

      // Apply clinical status coloring
      updateBoneColor(leftFemur, leftHip.status === 'limited' || leftKnee.status === 'limited');
    }

    if (rightHip && rightKnee && bones[1]) {
      const rightFemur = bones[1].mesh;
      rightFemur.position.set(
        rightHip.x - 200, 
        -(rightHip.y + rightKnee.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(rightKnee.y - rightHip.y, rightKnee.x - rightHip.x);
      rightFemur.rotation.z = angle - Math.PI/2;

      updateBoneColor(rightFemur, rightHip.status === 'limited' || rightKnee.status === 'limited');
    }

    // Position tibias (shin bones)
    if (leftKnee && leftAnkle && bones[2]) {
      const leftTibia = bones[2].mesh;
      leftTibia.position.set(
        leftKnee.x - 200, 
        -(leftKnee.y + leftAnkle.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(leftAnkle.y - leftKnee.y, leftAnkle.x - leftKnee.x);
      leftTibia.rotation.z = angle - Math.PI/2;

      updateBoneColor(leftTibia, leftKnee.status === 'limited' || leftAnkle.status === 'limited');
    }

    if (rightKnee && rightAnkle && bones[3]) {
      const rightTibia = bones[3].mesh;
      rightTibia.position.set(
        rightKnee.x - 200, 
        -(rightKnee.y + rightAnkle.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(rightAnkle.y - rightKnee.y, rightAnkle.x - rightKnee.x);
      rightTibia.rotation.z = angle - Math.PI/2;

      updateBoneColor(rightTibia, rightKnee.status === 'limited' || rightAnkle.status === 'limited');
    }

    // Position humeri (upper arm bones)
    if (leftShoulder && leftElbow && bones[4]) {
      const leftHumerus = bones[4].mesh;
      leftHumerus.position.set(
        leftShoulder.x - 200, 
        -(leftShoulder.y + leftElbow.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(leftElbow.y - leftShoulder.y, leftElbow.x - leftShoulder.x);
      leftHumerus.rotation.z = angle - Math.PI/2;

      updateBoneColor(leftHumerus, leftShoulder.status === 'limited' || leftElbow.status === 'limited');
    }

    if (rightShoulder && rightElbow && bones[5]) {
      const rightHumerus = bones[5].mesh;
      rightHumerus.position.set(
        rightShoulder.x - 200, 
        -(rightShoulder.y + rightElbow.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(rightElbow.y - rightShoulder.y, rightElbow.x - rightShoulder.x);
      rightHumerus.rotation.z = angle - Math.PI/2;

      updateBoneColor(rightHumerus, rightShoulder.status === 'limited' || rightElbow.status === 'limited');
    }

    // Position spine
    if (neck && spine && bones[6]) {
      const spineModel = bones[6].mesh;
      spineModel.position.set(
        neck.x - 200, 
        -(neck.y + spine.y) / 2 + 200, 
        0
      );

      const angle = Math.atan2(spine.y - neck.y, spine.x - neck.x);
      spineModel.rotation.z = angle - Math.PI/2;

      updateBoneColor(spineModel, neck.status === 'limited' || spine.status === 'limited');
    }

  }, [animationData, currentFrame, isLoaded]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-center">
        <div 
          ref={mountRef} 
          className="border border-gray-300 rounded-lg bg-white"
          style={{ width: 400, height: 400 }}
        />
      </div>
      
      {!isLoaded && (
        <div className="text-center">
          <div className="text-sm text-gray-600">
            Loading 3D anatomical models... {Math.round(loadingProgress)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {isLoaded && (
        <div className="text-center space-y-2">
          <div className="text-sm text-gray-600">
            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">
              3D Medical Models
            </span>
            Professional anatomical visualization
          </div>
          <div className="text-xs text-gray-500">
            Use mouse to rotate, zoom, and examine bones in 3D
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDAnatomicalVisualization;