import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AlertCircle, Loader2, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JointConfig {
  flexion?: number;
  extension?: number;
  abduction?: number;
  internalRotation?: number;
  pronation?: number;
  carryingAngle?: number;
  dorsiflexion?: number;
  plantarflexion?: number;
  inversion?: number;
  eversion?: number;
  clavicleLength?: number;
  [key: string]: number | undefined;
}

interface ModelConfig {
  leftHip?: JointConfig;
  rightHip?: JointConfig;
  leftKnee?: JointConfig;
  rightKnee?: JointConfig;
  leftAnkle?: JointConfig;
  rightAnkle?: JointConfig;
  leftShoulder?: JointConfig;
  rightShoulder?: JointConfig;
  leftElbow?: JointConfig;
  rightElbow?: JointConfig;
  pelvis?: { tilt?: number; obliquity?: number; rotation?: number };
  spine?: { cervicalLordosis?: number; thoracicKyphosis?: number; lumbarLordosis?: number; scoliosis?: number };
  neck?: { flexion?: number; extension?: number; rotation?: number; lateralFlexion?: number; forwardHead?: number };
  [key: string]: JointConfig | { tilt?: number; obliquity?: number; rotation?: number } | { thoracicKyphosis?: number; lumbarLordosis?: number; scoliosis?: number } | { flexion?: number; extension?: number; rotation?: number; lateralFlexion?: number; forwardHead?: number } | undefined;
}

interface PureThreeGLBViewerProps {
  modelPath?: string;
  modelConfig?: ModelConfig;
  className?: string;
}

const BONE_MAPPING: { [configKey: string]: { boneName: string; axis: 'x' | 'y' | 'z'; scale: number }[] } = {
  // === HIP / FEMUR ===
  'leftHip.flexion': [{ boneName: 'Femer_Root_L', axis: 'x', scale: -1 }],
  'leftHip.extension': [{ boneName: 'Femer_Root_L', axis: 'x', scale: 1 }],
  'leftHip.abduction': [{ boneName: 'Femer_Root_L', axis: 'z', scale: -1 }],
  'leftHip.internalRotation': [{ boneName: 'Femer_Root_L', axis: 'y', scale: 1 }],
  'leftHip.anteversion': [{ boneName: 'Femer_Root_L', axis: 'y', scale: 1 }], // Femoral anteversion - causes internal rotation
  'leftHip.neckShaftAngle': [{ boneName: 'Femer_Root_L', axis: 'z', scale: 0.5 }], // Coxa vara/valga
  'rightHip.flexion': [{ boneName: 'Femer_Root_R', axis: 'x', scale: -1 }],
  'rightHip.extension': [{ boneName: 'Femer_Root_R', axis: 'x', scale: 1 }],
  'rightHip.abduction': [{ boneName: 'Femer_Root_R', axis: 'z', scale: 1 }],
  'rightHip.internalRotation': [{ boneName: 'Femer_Root_R', axis: 'y', scale: -1 }],
  'rightHip.anteversion': [{ boneName: 'Femer_Root_R', axis: 'y', scale: -1 }], // Femoral anteversion - causes internal rotation
  'rightHip.neckShaftAngle': [{ boneName: 'Femer_Root_R', axis: 'z', scale: -0.5 }], // Coxa vara/valga
  
  // === KNEE / TIBIA ===
  'leftKnee.flexion': [{ boneName: 'fibula_tibia_L', axis: 'x', scale: 1 }],
  'leftKnee.varus': [{ boneName: 'fibula_tibia_L', axis: 'z', scale: 1 }], // Genu varum (+) / valgum (-)
  'leftKnee.tibialTorsion': [{ boneName: 'fibula_tibia_L', axis: 'y', scale: 1 }], // External/internal tibial rotation
  'leftKnee.recurvatum': [{ boneName: 'fibula_tibia_L', axis: 'x', scale: -0.5 }], // Knee hyperextension
  'leftKnee.tibialSlope': [{ boneName: 'fibula_tibia_L', axis: 'x', scale: 0.3 }], // Posterior tibial slope
  'rightKnee.flexion': [{ boneName: 'fibula_tibia_R', axis: 'x', scale: 1 }],
  'rightKnee.varus': [{ boneName: 'fibula_tibia_R', axis: 'z', scale: -1 }], // Genu varum (+) / valgum (-)
  'rightKnee.tibialTorsion': [{ boneName: 'fibula_tibia_R', axis: 'y', scale: -1 }], // External/internal tibial rotation
  'rightKnee.recurvatum': [{ boneName: 'fibula_tibia_R', axis: 'x', scale: -0.5 }], // Knee hyperextension
  'rightKnee.tibialSlope': [{ boneName: 'fibula_tibia_R', axis: 'x', scale: 0.3 }], // Posterior tibial slope
  
  // === ANKLE & FOOT ===
  'leftAnkle.dorsiflexion': [{ boneName: 'foot_L', axis: 'x', scale: -1 }],
  'leftAnkle.plantarflexion': [{ boneName: 'foot_L', axis: 'x', scale: 1 }],
  'leftAnkle.inversion': [{ boneName: 'foot_L', axis: 'z', scale: 1 }],
  'leftAnkle.eversion': [{ boneName: 'foot_L', axis: 'z', scale: -1 }],
  'rightAnkle.dorsiflexion': [{ boneName: 'foot_R', axis: 'x', scale: -1 }],
  'rightAnkle.plantarflexion': [{ boneName: 'foot_R', axis: 'x', scale: 1 }],
  'rightAnkle.inversion': [{ boneName: 'foot_R', axis: 'z', scale: -1 }],
  'rightAnkle.eversion': [{ boneName: 'foot_R', axis: 'z', scale: 1 }],
  
  // === SHOULDER ===
  // In T-pose, arms point laterally. Flexion rotates arm forward (sagittal plane).
  // For left arm pointing left (-X), flexion uses Y-axis rotation
  'leftShoulder.flexion': [{ boneName: 'Humerus_Root_L', axis: 'y', scale: 1 }], // Forward flexion - Y rotation brings arm forward
  'leftShoulder.abduction': [{ boneName: 'Humerus_Root_L', axis: 'z', scale: -1 }], // Abduction - Z rotation for lateral elevation
  'leftShoulder.internalRotation': [{ boneName: 'Humerus_L', axis: 'x', scale: 1 }], // Internal rotation around humerus long axis
  'leftShoulder.externalRotation': [{ boneName: 'Humerus_L', axis: 'x', scale: -1 }], // External rotation around humerus long axis
  'leftShoulder.retroversion': [{ boneName: 'Humerus_L', axis: 'y', scale: 1 }], // Humeral head retroversion
  'leftShoulder.elevation': [
    { boneName: 'Rib_Cage', axis: 'x', scale: -0.15 }, // Slight rib cage tilt
    { boneName: 'Humerus_Root_L', axis: 'x', scale: 0.3 } // Counter-rotate to lift arm
  ],
  // For right arm pointing right (+X), flexion uses Y-axis rotation (opposite sign)
  'rightShoulder.flexion': [{ boneName: 'Humerus_Root_R', axis: 'y', scale: -1 }], // Forward flexion - Y rotation brings arm forward
  'rightShoulder.abduction': [{ boneName: 'Humerus_Root_R', axis: 'z', scale: 1 }], // Abduction - Z rotation for lateral elevation
  'rightShoulder.internalRotation': [{ boneName: 'Humerus_R', axis: 'x', scale: -1 }], // Internal rotation around humerus long axis
  'rightShoulder.externalRotation': [{ boneName: 'Humerus_R', axis: 'x', scale: 1 }], // External rotation around humerus long axis
  'rightShoulder.retroversion': [{ boneName: 'Humerus_R', axis: 'y', scale: -1 }], // Humeral head retroversion
  'rightShoulder.elevation': [
    { boneName: 'Rib_Cage', axis: 'x', scale: -0.15 }, // Slight rib cage tilt
    { boneName: 'Humerus_Root_R', axis: 'x', scale: 0.3 } // Counter-rotate to lift arm
  ],
  
  // === ELBOW ===
  'leftElbow.flexion': [{ boneName: 'Redius_Alna_L', axis: 'x', scale: -1 }],
  'leftElbow.pronation': [{ boneName: 'Redius_Alna_L', axis: 'y', scale: 1 }],
  'leftElbow.carryingAngle': [{ boneName: 'Redius_Alna_L', axis: 'z', scale: -1 }], // Cubitus valgus/varus
  'rightElbow.flexion': [{ boneName: 'Redius_Alna_R', axis: 'x', scale: -1 }],
  'rightElbow.pronation': [{ boneName: 'Redius_Alna_R', axis: 'y', scale: -1 }],
  'rightElbow.carryingAngle': [{ boneName: 'Redius_Alna_R', axis: 'z', scale: 1 }], // Cubitus valgus/varus
  
  // === WRIST ===
  'leftWrist.deviation': [{ boneName: 'Hand_L', axis: 'z', scale: 1 }], // Ulnar (+) / Radial (-) deviation
  'leftWrist.flexion': [{ boneName: 'Hand_L', axis: 'x', scale: 1 }], // Flexion (+) / Extension (-)
  'rightWrist.deviation': [{ boneName: 'Hand_R', axis: 'z', scale: -1 }], // Ulnar (+) / Radial (-) deviation
  'rightWrist.flexion': [{ boneName: 'Hand_R', axis: 'x', scale: 1 }], // Flexion (+) / Extension (-)
  
  // === PELVIS ===
  'pelvis.tilt': [{ boneName: 'Pelvis_Main', axis: 'x', scale: 1 }],
  'pelvis.obliquity': [{ boneName: 'Pelvis_Main', axis: 'z', scale: 1 }],
  'pelvis.rotation': [{ boneName: 'Pelvis_Main', axis: 'y', scale: 1 }],
  
  // === SPINE ===
  'spine.cervicalLordosis': [
    { boneName: 'spine17', axis: 'x', scale: 0.2 },
    { boneName: 'spine18', axis: 'x', scale: 0.2 },
    { boneName: 'spine19', axis: 'x', scale: 0.2 },
    { boneName: 'spine20', axis: 'x', scale: 0.2 },
  ],
  'spine.thoracicKyphosis': [
    { boneName: 'spine8', axis: 'x', scale: 0.1 },
    { boneName: 'spine9', axis: 'x', scale: 0.1 },
    { boneName: 'spine10', axis: 'x', scale: 0.1 },
    { boneName: 'spine11', axis: 'x', scale: 0.1 },
    { boneName: 'spine12', axis: 'x', scale: 0.1 },
    { boneName: 'spine13', axis: 'x', scale: 0.1 },
    { boneName: 'spine14', axis: 'x', scale: 0.1 },
    { boneName: 'spine15', axis: 'x', scale: 0.1 },
    { boneName: 'spine16', axis: 'x', scale: 0.1 },
  ],
  'spine.lumbarLordosis': [
    { boneName: 'spine2', axis: 'x', scale: 0.2 },
    { boneName: 'spine3', axis: 'x', scale: 0.2 },
    { boneName: 'spine4', axis: 'x', scale: 0.2 },
    { boneName: 'spine5', axis: 'x', scale: 0.2 },
    { boneName: 'spine6', axis: 'x', scale: 0.2 },
    { boneName: 'spine7', axis: 'x', scale: 0.2 },
  ],
  'spine.scoliosis': [
    { boneName: 'spine4', axis: 'z', scale: 0.1 },
    { boneName: 'spine5', axis: 'z', scale: 0.15 },
    { boneName: 'spine6', axis: 'z', scale: 0.2 },
    { boneName: 'spine7', axis: 'z', scale: 0.15 },
    { boneName: 'spine8', axis: 'z', scale: 0.1 },
    { boneName: 'spine10', axis: 'z', scale: -0.1 },
    { boneName: 'spine11', axis: 'z', scale: -0.15 },
    { boneName: 'spine12', axis: 'z', scale: -0.2 },
    { boneName: 'spine13', axis: 'z', scale: -0.15 },
    { boneName: 'spine14', axis: 'z', scale: -0.1 },
  ],
  'spine.cervicalRotation': [
    { boneName: 'spine17', axis: 'y', scale: 0.2 },
    { boneName: 'spine18', axis: 'y', scale: 0.25 },
    { boneName: 'spine19', axis: 'y', scale: 0.3 },
    { boneName: 'spine20', axis: 'y', scale: 0.25 },
  ],
  'spine.cervicalLateralFlexion': [
    { boneName: 'spine17', axis: 'z', scale: 0.2 },
    { boneName: 'spine18', axis: 'z', scale: 0.25 },
    { boneName: 'spine19', axis: 'z', scale: 0.3 },
    { boneName: 'spine20', axis: 'z', scale: 0.25 },
  ],
  'spine.thoracicRotation': [
    { boneName: 'spine8', axis: 'y', scale: 0.08 },
    { boneName: 'spine9', axis: 'y', scale: 0.08 },
    { boneName: 'spine10', axis: 'y', scale: 0.08 },
    { boneName: 'spine11', axis: 'y', scale: 0.08 },
    { boneName: 'spine12', axis: 'y', scale: 0.08 },
    { boneName: 'spine13', axis: 'y', scale: 0.08 },
    { boneName: 'spine14', axis: 'y', scale: 0.08 },
    { boneName: 'spine15', axis: 'y', scale: 0.08 },
    { boneName: 'spine16', axis: 'y', scale: 0.08 },
  ],
  'spine.lumbarRotation': [
    { boneName: 'spine2', axis: 'y', scale: 0.1 },
    { boneName: 'spine3', axis: 'y', scale: 0.1 },
    { boneName: 'spine4', axis: 'y', scale: 0.1 },
    { boneName: 'spine5', axis: 'y', scale: 0.1 },
    { boneName: 'spine6', axis: 'y', scale: 0.1 },
    { boneName: 'spine7', axis: 'y', scale: 0.1 },
  ],

  // === HEAD & NECK (Cervical Spine) ===
  'neck.flexion': [
    { boneName: 'spine17', axis: 'x', scale: -0.25 },
    { boneName: 'spine18', axis: 'x', scale: -0.25 },
    { boneName: 'spine19', axis: 'x', scale: -0.25 },
    { boneName: 'spine20', axis: 'x', scale: -0.25 },
  ],
  'neck.extension': [
    { boneName: 'spine17', axis: 'x', scale: 0.25 },
    { boneName: 'spine18', axis: 'x', scale: 0.25 },
    { boneName: 'spine19', axis: 'x', scale: 0.25 },
    { boneName: 'spine20', axis: 'x', scale: 0.25 },
  ],
  'neck.rotation': [
    { boneName: 'spine17', axis: 'y', scale: 0.2 },
    { boneName: 'spine18', axis: 'y', scale: 0.25 },
    { boneName: 'spine19', axis: 'y', scale: 0.3 },
    { boneName: 'spine20', axis: 'y', scale: 0.25 },
  ],
  'neck.lateralFlexion': [
    { boneName: 'spine17', axis: 'z', scale: 0.2 },
    { boneName: 'spine18', axis: 'z', scale: 0.25 },
    { boneName: 'spine19', axis: 'z', scale: 0.3 },
    { boneName: 'spine20', axis: 'z', scale: 0.25 },
  ],
  'neck.forwardHead': [
    { boneName: 'spine16', axis: 'x', scale: 0.15 },
    { boneName: 'spine17', axis: 'x', scale: -0.2 },
    { boneName: 'spine18', axis: 'x', scale: -0.25 },
    { boneName: 'spine19', axis: 'x', scale: -0.2 },
    { boneName: 'spine20', axis: 'x', scale: -0.15 },
  ],
};

export default function PureThreeGLBViewer({ 
  modelPath = '/models/rigged-skeleton.glb',
  modelConfig,
  className = '' 
}: PureThreeGLBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'checking' | 'loading' | 'ready' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadProgress, setLoadProgress] = useState(0);
  const bonesRef = useRef<{ [name: string]: THREE.Object3D }>({});
  const initialRotationsRef = useRef<{ [name: string]: THREE.Euler }>({});
  const sliderRotationsRef = useRef<{ [boneName: string]: { x: number; y: number; z: number } }>({});
  const clavicleOffsetsRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    model: THREE.Group | null;
    animationId: number | null;
  } | null>(null);

  useEffect(() => {
    const checkWebGL = (): boolean => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
          setErrorMessage('WebGL is not supported in this browser');
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
    if (!containerRef.current) return;
    if (sceneRef.current) return;

    const container = containerRef.current;
    let animationId: number;
    let isDisposed = false;

    const init = async () => {
      try {
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 400;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 1.5, 8);
        camera.lookAt(0, 2, 0);
        console.log('THREE.js camera initialized');

        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: false,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        renderer.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn('WebGL context lost');
          setErrorMessage('WebGL context was lost - please retry');
          setStatus('error');
        });

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-5, -5, -5);
        scene.add(backLight);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1;
        controls.maxDistance = 20;
        controls.target.set(0, 1, 0);
        controls.update();

        const gridHelper = new THREE.GridHelper(10, 10, 0x333366, 0x222244);
        gridHelper.position.set(-0.15, -1.2, 0);
        scene.add(gridHelper);

        renderer.render(scene, camera);

        sceneRef.current = {
          scene,
          camera,
          renderer,
          controls,
          model: null,
          animationId: null
        };

        const loader = new GLTFLoader();
        
        loader.load(
          modelPath,
          (gltf) => {
            if (isDisposed) return;
            
            const model = gltf.scene;
            
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.setScalar(scale);
            
            model.position.x = -center.x * scale;
            model.position.y = -box.min.y * scale;
            model.position.z = -center.z * scale;
            
            const bones: { [name: string]: THREE.Object3D } = {};
            const boneNames: string[] = [];
            const objectTypes: string[] = [];
            
            let skullMesh: THREE.Object3D | null = null;
            
            model.traverse((child) => {
              objectTypes.push(`${child.name}: ${child.type}`);
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // Find skull mesh by name pattern
                const lowerName = child.name.toLowerCase();
                if (lowerName.includes('skull') || lowerName.includes('head') || lowerName.includes('cranium')) {
                  skullMesh = child;
                  console.log('Found skull mesh:', child.name);
                }
              }
              if (child instanceof THREE.Bone) {
                bones[child.name] = child;
                boneNames.push(child.name);
              }
              if ((child as any).isBone) {
                if (!bones[child.name]) {
                  bones[child.name] = child;
                  boneNames.push(child.name);
                }
              }
            });
            
            // Log all meshes for debugging
            console.log('=== ALL MESHES IN MODEL ===');
            model.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                console.log(`Mesh: ${child.name}, parent: ${child.parent?.name || 'none'}`);
              }
            });
            
            // Analyze skull mesh skeleton to find the controlling bone
            if (skullMesh !== null) {
              const skull = skullMesh as THREE.SkinnedMesh;
              console.log('=== SKULL MESH ANALYSIS ===');
              console.log('Is SkinnedMesh:', skull instanceof THREE.SkinnedMesh);
              if (skull instanceof THREE.SkinnedMesh && skull.skeleton) {
                console.log('Skull skeleton bones:', skull.skeleton.bones.map(b => b.name));
                
                // Analyze bone weights to find which bones actually affect the skull
                const geometry = skull.geometry;
                if (geometry.attributes.skinIndex && geometry.attributes.skinWeight) {
                  const skinIndices = geometry.attributes.skinIndex;
                  const skinWeights = geometry.attributes.skinWeight;
                  const usedBoneIndices = new Set<number>();
                  
                  // Sample first 100 vertices to find active bones
                  const sampleCount = Math.min(100, skinIndices.count);
                  for (let i = 0; i < sampleCount; i++) {
                    for (let j = 0; j < 4; j++) {
                      const weight = skinWeights.getComponent(i, j);
                      if (weight > 0.01) {
                        usedBoneIndices.add(skinIndices.getComponent(i, j));
                      }
                    }
                  }
                  
                  const usedBoneNames = Array.from(usedBoneIndices).map(idx => skull.skeleton.bones[idx]?.name || `unknown-${idx}`);
                  console.log('=== BONES THAT CONTROL SKULL VERTICES ===');
                  console.log('Active bone indices:', Array.from(usedBoneIndices));
                  console.log('Active bone names:', usedBoneNames);
                }
              }
            }
            
            console.log('=== AVAILABLE BONES IN MODEL ===');
            console.log('Total bones found:', boneNames.length);
            boneNames.forEach((name, i) => {
              const bone = bones[name];
              console.log(`${i + 1}. ${name} (parent: ${bone.parent?.name || 'none'})`);
              initialRotationsRef.current[name] = bone.rotation.clone();
            });
            console.log('=================================');
            
            // Compute and store the fixed offset between spine20 and Root in bind pose
            // headOffset = spine20BindInverse * rootBindWorld
            if (bones['Root'] && bones['spine20']) {
              const rootBone = bones['Root'] as THREE.Bone;
              const spine20 = bones['spine20'] as THREE.Bone;
              const spine16 = bones['spine16'] as THREE.Bone;
              const ribCage = bones['Rib_Cage'] as THREE.Bone;
              const armature = rootBone.parent; // Armature
              
              // Update all matrices to get bind pose
              if (armature) armature.updateMatrixWorld(true);
              rootBone.updateMatrixWorld(true);
              spine20.updateMatrixWorld(true);
              if (spine16) spine16.updateMatrixWorld(true);
              
              // Compute headOffset = spine20BindInverse * rootBindWorld
              // This is the fixed spatial relationship between spine20 and Root
              const spine20BindInverse = spine20.matrixWorld.clone().invert();
              const headOffset = spine20BindInverse.clone().multiply(rootBone.matrixWorld);
              (rootBone as any).headOffset = headOffset;
              
              // Store Armature reference and its bind matrix inverse for later
              if (armature) {
                (rootBone as any).armature = armature;
                (rootBone as any).armatureBindInverse = armature.matrixWorld.clone().invert();
              }
              
              // Rib_Cage (shoulders) should follow spine16 (thoracic top), not spine20 (neck)
              // This ensures arms stay connected when thoracic/lumbar spine moves
              if (ribCage && spine16) {
                ribCage.updateMatrixWorld(true);
                const spine16BindInverse = spine16.matrixWorld.clone().invert();
                const ribOffset = spine16BindInverse.clone().multiply(ribCage.matrixWorld);
                (ribCage as any).ribOffset = ribOffset;
                (ribCage as any).spine16Ref = spine16;
                (ribCage as any).armature = armature;
                if (armature) {
                  (ribCage as any).armatureBindInverse = armature.matrixWorld.clone().invert();
                }
              }
              
              // Cache offsets for Humerus bones relative to Rib_Cage so arms follow shoulders
              const humerusL = bones['Humerus_Root_L'] as THREE.Bone;
              const humerusR = bones['Humerus_Root_R'] as THREE.Bone;
              
              if (ribCage) {
                ribCage.updateMatrixWorld(true);
                const ribCageBindInverse = ribCage.matrixWorld.clone().invert();
                
                if (humerusL) {
                  humerusL.updateMatrixWorld(true);
                  const humerusLOffset = ribCageBindInverse.clone().multiply(humerusL.matrixWorld);
                  (humerusL as any).ribCageOffset = humerusLOffset;
                  (humerusL as any).ribCageRef = ribCage;
                  (humerusL as any).armature = armature;
                  
                  // Debug: Log humerus bone local axes to determine correct flexion/abduction axes
                  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(humerusL.quaternion);
                  const yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(humerusL.quaternion);
                  const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(humerusL.quaternion);
                  console.log('=== LEFT HUMERUS BONE ORIENTATION ===');
                  console.log('Local X-axis (world coords):', xAxis.x.toFixed(3), xAxis.y.toFixed(3), xAxis.z.toFixed(3));
                  console.log('Local Y-axis (world coords):', yAxis.x.toFixed(3), yAxis.y.toFixed(3), yAxis.z.toFixed(3));
                  console.log('Local Z-axis (world coords):', zAxis.x.toFixed(3), zAxis.y.toFixed(3), zAxis.z.toFixed(3));
                  console.log('Initial rotation (Euler):', humerusL.rotation.x.toFixed(3), humerusL.rotation.y.toFixed(3), humerusL.rotation.z.toFixed(3));
                }
                
                if (humerusR) {
                  humerusR.updateMatrixWorld(true);
                  const humerusROffset = ribCageBindInverse.clone().multiply(humerusR.matrixWorld);
                  (humerusR as any).ribCageOffset = humerusROffset;
                  (humerusR as any).ribCageRef = ribCage;
                  (humerusR as any).armature = armature;
                  
                  // Debug: Log humerus bone local axes to determine correct flexion/abduction axes
                  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(humerusR.quaternion);
                  const yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(humerusR.quaternion);
                  const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(humerusR.quaternion);
                  console.log('=== RIGHT HUMERUS BONE ORIENTATION ===');
                  console.log('Local X-axis (world coords):', xAxis.x.toFixed(3), xAxis.y.toFixed(3), xAxis.z.toFixed(3));
                  console.log('Local Y-axis (world coords):', yAxis.x.toFixed(3), yAxis.y.toFixed(3), yAxis.z.toFixed(3));
                  console.log('Local Z-axis (world coords):', zAxis.x.toFixed(3), zAxis.y.toFixed(3), zAxis.z.toFixed(3));
                  console.log('Initial rotation (Euler):', humerusR.rotation.x.toFixed(3), humerusR.rotation.y.toFixed(3), humerusR.rotation.z.toFixed(3));
                }
              }
              
              console.log('Stored headOffset for Root (relative to spine20), Rib_Cage (relative to spine16), and Humerus bones (relative to Rib_Cage)');
            }
            
            bonesRef.current = bones;
            
            model.position.set(-0.15, -1.2, 0);
            scene.add(model);
            
            if (sceneRef.current) {
              sceneRef.current.model = model;
            }
            
            console.log('GLB model loaded successfully:', modelPath);
            setStatus('ready');
          },
          (xhr) => {
            if (xhr.lengthComputable) {
              const progress = Math.round((xhr.loaded / xhr.total) * 100);
              setLoadProgress(progress);
            }
          },
          (error: unknown) => {
            console.error('Error loading GLB:', error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            setErrorMessage(`Failed to load model: ${errorMsg || 'Unknown error'}`);
            setStatus('error');
          }
        );

        const animate = () => {
          if (isDisposed || !sceneRef.current) return;
          
          animationId = requestAnimationFrame(animate);
          
          // Sync Root to follow spine20, and Rib_Cage to follow spine16
          // Formula: boneMatrixWorld = referenceSpine.matrixWorld * offset
          // Then convert to local: boneMatrix = armature.matrixWorld.inverse() * boneMatrixWorld
          const currentBones = bonesRef.current;
          const rootBone = currentBones['Root'] as THREE.Bone;
          const spine20 = currentBones['spine20'] as THREE.Bone;
          const ribCage = currentBones['Rib_Cage'] as THREE.Bone;
          
          if (rootBone && spine20 && (rootBone as any).headOffset) {
            // Update spine20's world matrix after slider rotations
            spine20.updateMatrixWorld(true);
            
            // Compute new world matrix for Root: spine20.matrixWorld * headOffset
            const headOffset = (rootBone as any).headOffset as THREE.Matrix4;
            const newRootWorldMatrix = new THREE.Matrix4();
            newRootWorldMatrix.copy(spine20.matrixWorld).multiply(headOffset);
            
            // Convert to local space (relative to Armature)
            const armature = (rootBone as any).armature as THREE.Object3D;
            if (armature) {
              armature.updateMatrixWorld(true);
              const armatureInverse = new THREE.Matrix4().copy(armature.matrixWorld).invert();
              const newRootLocalMatrix = new THREE.Matrix4();
              newRootLocalMatrix.copy(armatureInverse).multiply(newRootWorldMatrix);
              
              // Decompose and apply to rootBone
              const pos = new THREE.Vector3();
              const quat = new THREE.Quaternion();
              const scale = new THREE.Vector3();
              newRootLocalMatrix.decompose(pos, quat, scale);
              
              rootBone.position.copy(pos);
              rootBone.quaternion.copy(quat);
              rootBone.scale.copy(scale);
              rootBone.matrixWorldNeedsUpdate = true;
            }
            
            // Rib_Cage follows spine16 (not spine20) to keep arms connected during thoracic/lumbar movement
            if (ribCage && (ribCage as any).ribOffset && (ribCage as any).spine16Ref) {
              const spine16 = (ribCage as any).spine16Ref as THREE.Bone;
              spine16.updateMatrixWorld(true);
              
              const ribOffset = (ribCage as any).ribOffset as THREE.Matrix4;
              const newRibWorldMatrix = new THREE.Matrix4();
              newRibWorldMatrix.copy(spine16.matrixWorld).multiply(ribOffset);
              
              const ribArmature = (ribCage as any).armature as THREE.Object3D;
              if (ribArmature) {
                const armatureInverse = new THREE.Matrix4().copy(ribArmature.matrixWorld).invert();
                const newRibLocalMatrix = new THREE.Matrix4();
                newRibLocalMatrix.copy(armatureInverse).multiply(newRibWorldMatrix);
                
                const pos = new THREE.Vector3();
                const quat = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                newRibLocalMatrix.decompose(pos, quat, scale);
                
                ribCage.position.copy(pos);
                ribCage.quaternion.copy(quat);
                ribCage.scale.copy(scale);
                ribCage.matrixWorldNeedsUpdate = true;
                ribCage.updateMatrixWorld(true);
              }
            }
            
            // Sync Humerus bones to follow Rib_Cage so arms stay connected to shoulders
            const humerusL = currentBones['Humerus_Root_L'] as THREE.Bone;
            const humerusR = currentBones['Humerus_Root_R'] as THREE.Bone;
            
            if (humerusL && (humerusL as any).ribCageOffset && ribCage) {
              ribCage.updateMatrixWorld(true);
              
              const humerusLOffset = (humerusL as any).ribCageOffset as THREE.Matrix4;
              const newHumerusLWorld = new THREE.Matrix4();
              newHumerusLWorld.copy(ribCage.matrixWorld).multiply(humerusLOffset);
              
              const humerusArmature = (humerusL as any).armature as THREE.Object3D;
              if (humerusArmature) {
                const armatureInverse = new THREE.Matrix4().copy(humerusArmature.matrixWorld).invert();
                const newHumerusLLocal = new THREE.Matrix4();
                newHumerusLLocal.copy(armatureInverse).multiply(newHumerusLWorld);
                
                const pos = new THREE.Vector3();
                const quat = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                newHumerusLLocal.decompose(pos, quat, scale);
                
                // Apply clavicle length offset (negative X = laterally outward for left side)
                pos.x -= clavicleOffsetsRef.current.left;
                humerusL.position.copy(pos);
                // Apply slider rotation on top of base quaternion
                const sliderRot = sliderRotationsRef.current['Humerus_Root_L'];
                if (sliderRot) {
                  const sliderQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(sliderRot.x, sliderRot.y, sliderRot.z));
                  quat.multiply(sliderQuat);
                }
                humerusL.quaternion.copy(quat);
                humerusL.scale.copy(scale);
                humerusL.matrixWorldNeedsUpdate = true;
              }
            }
            
            if (humerusR && (humerusR as any).ribCageOffset && ribCage) {
              ribCage.updateMatrixWorld(true);
              
              const humerusROffset = (humerusR as any).ribCageOffset as THREE.Matrix4;
              const newHumerusRWorld = new THREE.Matrix4();
              newHumerusRWorld.copy(ribCage.matrixWorld).multiply(humerusROffset);
              
              const humerusArmature = (humerusR as any).armature as THREE.Object3D;
              if (humerusArmature) {
                const armatureInverse = new THREE.Matrix4().copy(humerusArmature.matrixWorld).invert();
                const newHumerusRLocal = new THREE.Matrix4();
                newHumerusRLocal.copy(armatureInverse).multiply(newHumerusRWorld);
                
                const pos = new THREE.Vector3();
                const quat = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                newHumerusRLocal.decompose(pos, quat, scale);
                
                // Apply clavicle length offset (positive X = laterally outward for right side)
                pos.x += clavicleOffsetsRef.current.right;
                humerusR.position.copy(pos);
                // Apply slider rotation on top of base quaternion
                const sliderRot = sliderRotationsRef.current['Humerus_Root_R'];
                if (sliderRot) {
                  const sliderQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(sliderRot.x, sliderRot.y, sliderRot.z));
                  quat.multiply(sliderQuat);
                }
                humerusR.quaternion.copy(quat);
                humerusR.scale.copy(scale);
                humerusR.matrixWorldNeedsUpdate = true;
              }
            }
          }
          
          sceneRef.current.controls.update();
          sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
        };
        
        animate();

        const handleResize = () => {
          if (!sceneRef.current || !containerRef.current) return;
          
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          
          sceneRef.current.camera.aspect = width / height;
          sceneRef.current.camera.updateProjectionMatrix();
          sceneRef.current.renderer.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };

      } catch (error) {
        console.error('3D initialization error:', error);
        setErrorMessage(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        setStatus('error');
      }
    };

    init();

    return () => {
      isDisposed = true;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (sceneRef.current) {
        sceneRef.current.controls.dispose();
        sceneRef.current.renderer.dispose();
        if (container.contains(sceneRef.current.renderer.domElement)) {
          container.removeChild(sceneRef.current.renderer.domElement);
        }
        sceneRef.current = null;
      }
    };
  }, [modelPath]);

  useEffect(() => {
    if (status !== 'ready' || !modelConfig) return;
    
    const bones = bonesRef.current;
    const initialRotations = initialRotationsRef.current;
    
    if (Object.keys(bones).length === 0) return;
    
    // First, collect all rotation contributions per bone per axis
    const boneRotations: { [boneName: string]: { x: number; y: number; z: number } } = {};
    
    // Initialize all bones to their initial rotation
    Object.keys(bones).forEach(boneName => {
      const initial = initialRotations[boneName];
      if (initial) {
        boneRotations[boneName] = { x: initial.x, y: initial.y, z: initial.z };
      }
    });
    
    // Bones that are handled by animation loop (need slider rotations stored separately)
    const animationLoopBones = new Set(['Humerus_Root_L', 'Humerus_Root_R']);
    
    // Track slider-only rotations (relative to initial) for animation loop bones
    const sliderOnlyRotations: { [boneName: string]: { x: number; y: number; z: number } } = {};
    animationLoopBones.forEach(boneName => {
      sliderOnlyRotations[boneName] = { x: 0, y: 0, z: 0 };
    });
    
    // Accumulate rotations from all sliders
    Object.entries(BONE_MAPPING).forEach(([configKey, mappings]) => {
      const [jointName, propertyName] = configKey.split('.');
      const jointConfig = modelConfig[jointName];
      
      if (!jointConfig) return;
      
      const value = (jointConfig as any)[propertyName];
      if (value === undefined) return;
      
      const angleInRadians = (value * Math.PI) / 180;
      
      mappings.forEach(({ boneName, axis, scale }) => {
        const adjustedAngle = angleInRadians * scale;
        
        // For animation loop bones, store slider rotations separately
        if (animationLoopBones.has(boneName)) {
          if (axis === 'x') {
            sliderOnlyRotations[boneName].x += adjustedAngle;
          } else if (axis === 'y') {
            sliderOnlyRotations[boneName].y += adjustedAngle;
          } else if (axis === 'z') {
            sliderOnlyRotations[boneName].z += adjustedAngle;
          }
        } else {
          // For regular bones, accumulate to boneRotations
          if (!boneRotations[boneName]) return;
          if (axis === 'x') {
            boneRotations[boneName].x += adjustedAngle;
          } else if (axis === 'y') {
            boneRotations[boneName].y += adjustedAngle;
          } else if (axis === 'z') {
            boneRotations[boneName].z += adjustedAngle;
          }
        }
      });
    });
    
    // Store slider rotations for animation loop to use
    sliderRotationsRef.current = sliderOnlyRotations;
    
    // Extract and store clavicle length offsets (in mm, convert to scene units)
    // Positive value = longer clavicle = shoulder moves laterally outward
    const leftClavicle = (modelConfig.leftShoulder as any)?.clavicleLength || 0;
    const rightClavicle = (modelConfig.rightShoulder as any)?.clavicleLength || 0;
    // Convert mm to scene units (model scale is ~2/maxDim, typical skeleton height ~1.8m)
    // Scene unit conversion factor: 1mm ≈ 0.001 in real world, but model is scaled
    // Use a reasonable multiplier for visible effect (0.002 per mm seems good for this scale)
    const mmToSceneUnit = 0.002;
    clavicleOffsetsRef.current = {
      left: leftClavicle * mmToSceneUnit,
      right: rightClavicle * mmToSceneUnit
    };
    
    // Apply accumulated rotations to bones (skip animation loop bones)
    Object.entries(boneRotations).forEach(([boneName, rotation]) => {
      if (animationLoopBones.has(boneName)) return; // Animation loop handles these
      const bone = bones[boneName];
      if (bone) {
        bone.rotation.x = rotation.x;
        bone.rotation.y = rotation.y;
        bone.rotation.z = rotation.z;
      }
    });
  }, [modelConfig, status]);

  const handleRetry = () => {
    setStatus('checking');
    setErrorMessage('');
    setLoadProgress(0);
  };

  if (status === 'error') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 ${className}`}>
        <div className="w-16 h-16 mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">3D Viewer Error</h3>
        <p className="text-sm text-gray-300 text-center max-w-md mb-3">{errorMessage}</p>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 max-w-md">
          <p className="text-xs text-blue-300 text-center">
            <strong>Tip:</strong> The preview environment may have limited WebGL support. 
            Try opening in a new browser tab or deploy the app for full 3D support.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            className="border-green-500 text-green-400 hover:bg-green-500/20"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(window.location.href, '_blank')}
            className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative bg-slate-900 rounded-lg ${className}`} style={{ minHeight: '400px' }}>
      <div 
        ref={containerRef} 
        className="w-full h-full"
      />
      {(status === 'checking' || status === 'loading') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 rounded-lg z-10">
          <Loader2 className="h-8 w-8 animate-spin text-green-400 mb-3" />
          <span className="text-green-400 mb-2">
            {status === 'checking' ? 'Initializing 3D...' : 'Loading 3D Model...'}
          </span>
          {loadProgress > 0 && (
            <div className="w-48 bg-slate-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
