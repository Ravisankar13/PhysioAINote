import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface ScapulaSkeletonViewerProps {
  modelPath: string;
  onBonesLoaded: (bones: string[]) => void;
  sliderValues: Record<string, number>;
  selectedBone: string;
}

export default function ScapulaSkeletonViewer({
  modelPath,
  onBonesLoaded,
  sliderValues,
  selectedBone,
}: ScapulaSkeletonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bonesRef = useRef<Map<string, THREE.Bone>>(new Map());
  const initialRotationsRef = useRef<Map<string, THREE.Euler>>(new Map());
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x333333);
    scene.add(gridHelper);

    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
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

        scene.add(model);

        const bones: string[] = [];
        bonesRef.current.clear();
        initialRotationsRef.current.clear();

        model.traverse((child) => {
          if (child instanceof THREE.Bone) {
            bones.push(child.name);
            bonesRef.current.set(child.name, child);
            initialRotationsRef.current.set(
              child.name,
              child.rotation.clone()
            );
          }
        });

        bones.sort();
        onBonesLoaded(bones);

        console.log("=== BONE HIERARCHY ===");
        console.log(`Model: ${modelPath}`);
        console.log(`Total bones: ${bones.length}`);
        console.log("Bones:", bones);
        
        const scapulaSearch = ["scapula", "scap", "shoulder", "clavicle", "clav"];
        const foundScapula = bones.filter(b => 
          scapulaSearch.some(s => b.toLowerCase().includes(s))
        );
        console.log("Scapula-related bones:", foundScapula);
        console.log("======================");
      },
      (progress) => {
        console.log(`Loading: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
      },
      (error) => {
        console.error("Error loading model:", error);
      }
    );

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [modelPath, onBonesLoaded]);

  useEffect(() => {
    Object.entries(sliderValues).forEach(([key, value]) => {
      const [boneName, axis] = key.split("_");
      const bone = bonesRef.current.get(boneName);
      const initial = initialRotationsRef.current.get(boneName);
      
      if (bone && initial) {
        const rad = THREE.MathUtils.degToRad(value);
        switch (axis) {
          case "X":
            bone.rotation.x = initial.x + rad;
            break;
          case "Y":
            bone.rotation.y = initial.y + rad;
            break;
          case "Z":
            bone.rotation.z = initial.z + rad;
            break;
        }
      }
    });
  }, [sliderValues]);

  useEffect(() => {
    bonesRef.current.forEach((bone, name) => {
      bone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material.emissive) {
            material.emissive.setHex(name === selectedBone ? 0x00ff00 : 0x000000);
            material.emissiveIntensity = name === selectedBone ? 0.3 : 0;
          }
        }
      });
    });
  }, [selectedBone]);

  return <div ref={containerRef} className="w-full h-full" />;
}
