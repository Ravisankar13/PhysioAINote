import * as THREE from 'three';

export interface MuscleDefinition {
  name: string;
  displayName: string;
  origin: {
    bone: string;
    offset: THREE.Vector3;
    landmark: string;
  };
  insertion: {
    bone: string;
    offset: THREE.Vector3;
    landmark: string;
  };
  controlPoints?: THREE.Vector3[];
  bellyPosition?: number;
  bellyWidth?: number;
  tendonWidth?: number;
  color: THREE.Color;
  group: 'quadriceps' | 'hamstrings' | 'adductors' | 'other';
}

export interface MuscleActivationLevels {
  rectusFemoris?: { left: number; right: number };
  vastusLateralis?: { left: number; right: number };
  vastusMedialis?: { left: number; right: number };
  vastusIntermedius?: { left: number; right: number };
  bicepsFemoris?: { left: number; right: number };
  semimembranosus?: { left: number; right: number };
  semitendinosus?: { left: number; right: number };
  adductorMagnus?: { left: number; right: number };
  adductorLongus?: { left: number; right: number };
  sartorius?: { left: number; right: number };
  tensorFasciaeLatae?: { left: number; right: number };
}

const UPPER_LEG_MUSCLES_LEFT: MuscleDefinition[] = [
  {
    name: 'rectusFemoris_L',
    displayName: 'Rectus Femoris (L)',
    origin: {
      bone: 'Pelvis_Main',
      offset: new THREE.Vector3(0.12, 0.05, 0.12),
      landmark: 'AIIS'
    },
    insertion: {
      bone: 'fibula_tibia_L',
      offset: new THREE.Vector3(0, 0.08, 0.08),
      landmark: 'Patella/Quadriceps Tendon'
    },
    bellyPosition: 0.45,
    bellyWidth: 0.055,
    tendonWidth: 0.018,
    color: new THREE.Color(0xcc4444),
    group: 'quadriceps'
  },
  {
    name: 'vastusLateralis_L',
    displayName: 'Vastus Lateralis (L)',
    origin: {
      bone: 'Femer_Root_L',
      offset: new THREE.Vector3(0.08, -0.1, -0.02),
      landmark: 'Greater Trochanter/Linea Aspera'
    },
    insertion: {
      bone: 'fibula_tibia_L',
      offset: new THREE.Vector3(0.05, 0.06, 0.06),
      landmark: 'Patella (lateral)'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.065,
    tendonWidth: 0.015,
    color: new THREE.Color(0xdd5555),
    group: 'quadriceps'
  },
  {
    name: 'vastusMedialis_L',
    displayName: 'Vastus Medialis (L)',
    origin: {
      bone: 'Femer_L',
      offset: new THREE.Vector3(-0.06, 0.3, -0.02),
      landmark: 'Linea Aspera (medial)'
    },
    insertion: {
      bone: 'fibula_tibia_L',
      offset: new THREE.Vector3(-0.04, 0.06, 0.06),
      landmark: 'Patella (medial)'
    },
    bellyPosition: 0.6,
    bellyWidth: 0.05,
    tendonWidth: 0.015,
    color: new THREE.Color(0xee6666),
    group: 'quadriceps'
  },
  {
    name: 'vastusIntermedius_L',
    displayName: 'Vastus Intermedius (L)',
    origin: {
      bone: 'Femer_L',
      offset: new THREE.Vector3(0, 0.4, 0.04),
      landmark: 'Anterior Femur'
    },
    insertion: {
      bone: 'fibula_tibia_L',
      offset: new THREE.Vector3(0, 0.07, 0.07),
      landmark: 'Patella (deep)'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.045,
    tendonWidth: 0.012,
    color: new THREE.Color(0xff7777),
    group: 'quadriceps'
  },
  {
    name: 'bicepsFemoris_L',
    displayName: 'Biceps Femoris (L)',
    origin: {
      bone: 'Pelvis_Main',
      offset: new THREE.Vector3(0.08, -0.05, -0.15),
      landmark: 'Ischial Tuberosity'
    },
    insertion: {
      bone: 'fibula_tibia_L',
      offset: new THREE.Vector3(0.08, 0.02, -0.04),
      landmark: 'Fibular Head'
    },
    bellyPosition: 0.55,
    bellyWidth: 0.055,
    tendonWidth: 0.018,
    color: new THREE.Color(0x4477cc),
    group: 'hamstrings'
  },
  {
    name: 'semimembranosus_L',
    displayName: 'Semimembranosus (L)',
    origin: {
      bone: 'Pelvis_Main',
      offset: new THREE.Vector3(0.05, -0.06, -0.14),
      landmark: 'Ischial Tuberosity'
    },
    insertion: {
      bone: 'fibula_tibia_L',
      offset: new THREE.Vector3(-0.04, 0.02, -0.05),
      landmark: 'Medial Tibial Condyle'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.05,
    tendonWidth: 0.016,
    color: new THREE.Color(0x5588dd),
    group: 'hamstrings'
  },
  {
    name: 'semitendinosus_L',
    displayName: 'Semitendinosus (L)',
    origin: {
      bone: 'Pelvis_Main',
      offset: new THREE.Vector3(0.06, -0.04, -0.13),
      landmark: 'Ischial Tuberosity'
    },
    insertion: {
      bone: 'fibula_tibia_L',
      offset: new THREE.Vector3(-0.05, -0.05, 0.02),
      landmark: 'Pes Anserinus'
    },
    bellyPosition: 0.4,
    bellyWidth: 0.04,
    tendonWidth: 0.012,
    color: new THREE.Color(0x6699ee),
    group: 'hamstrings'
  },
  {
    name: 'adductorMagnus_L',
    displayName: 'Adductor Magnus (L)',
    origin: {
      bone: 'Pelvis_Main',
      offset: new THREE.Vector3(0.02, -0.08, -0.08),
      landmark: 'Ischiopubic Ramus'
    },
    insertion: {
      bone: 'Femer_L',
      offset: new THREE.Vector3(-0.06, -0.2, -0.04),
      landmark: 'Linea Aspera/Adductor Tubercle'
    },
    bellyPosition: 0.45,
    bellyWidth: 0.07,
    tendonWidth: 0.02,
    color: new THREE.Color(0x44aa77),
    group: 'adductors'
  },
  {
    name: 'adductorLongus_L',
    displayName: 'Adductor Longus (L)',
    origin: {
      bone: 'Pelvis_Main',
      offset: new THREE.Vector3(0.0, -0.02, 0.08),
      landmark: 'Pubic Body'
    },
    insertion: {
      bone: 'Femer_L',
      offset: new THREE.Vector3(-0.05, 0.1, -0.02),
      landmark: 'Linea Aspera (middle third)'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.045,
    tendonWidth: 0.015,
    color: new THREE.Color(0x55bb88),
    group: 'adductors'
  },
  {
    name: 'sartorius_L',
    displayName: 'Sartorius (L)',
    origin: {
      bone: 'Pelvis_Main',
      offset: new THREE.Vector3(0.15, 0.08, 0.1),
      landmark: 'ASIS'
    },
    insertion: {
      bone: 'fibula_tibia_L',
      offset: new THREE.Vector3(-0.05, -0.04, 0.03),
      landmark: 'Pes Anserinus'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.025,
    tendonWidth: 0.01,
    color: new THREE.Color(0xcc88cc),
    group: 'other'
  },
  {
    name: 'tensorFasciaeLatae_L',
    displayName: 'Tensor Fasciae Latae (L)',
    origin: {
      bone: 'Pelvis_Main',
      offset: new THREE.Vector3(0.16, 0.06, 0.06),
      landmark: 'ASIS'
    },
    insertion: {
      bone: 'Femer_L',
      offset: new THREE.Vector3(0.1, -0.15, 0),
      landmark: 'IT Band (lateral femur)'
    },
    bellyPosition: 0.35,
    bellyWidth: 0.04,
    tendonWidth: 0.015,
    color: new THREE.Color(0xddaa44),
    group: 'other'
  }
];

function createRightSideMuscles(): MuscleDefinition[] {
  return UPPER_LEG_MUSCLES_LEFT.map(muscle => ({
    ...muscle,
    name: muscle.name.replace('_L', '_R'),
    displayName: muscle.displayName.replace('(L)', '(R)'),
    origin: {
      bone: muscle.origin.bone.replace('_L', '_R'),
      offset: new THREE.Vector3(
        -muscle.origin.offset.x,
        muscle.origin.offset.y,
        muscle.origin.offset.z
      ),
      landmark: muscle.origin.landmark
    },
    insertion: {
      bone: muscle.insertion.bone.replace('_L', '_R'),
      offset: new THREE.Vector3(
        -muscle.insertion.offset.x,
        muscle.insertion.offset.y,
        muscle.insertion.offset.z
      ),
      landmark: muscle.insertion.landmark
    },
    controlPoints: muscle.controlPoints?.map(cp => 
      new THREE.Vector3(-cp.x, cp.y, cp.z)
    ),
    color: muscle.color.clone()
  }));
}

export const UPPER_LEG_MUSCLES: MuscleDefinition[] = [
  ...UPPER_LEG_MUSCLES_LEFT,
  ...createRightSideMuscles()
];

export class MuscleVisualizationManager {
  private scene: THREE.Scene;
  private bones: { [name: string]: THREE.Object3D };
  private muscleMeshes: Map<string, THREE.Mesh> = new Map();
  private muscleLabels: Map<string, THREE.Sprite> = new Map();
  private showLabels: boolean = false;

  constructor(scene: THREE.Scene, bones: { [name: string]: THREE.Object3D }) {
    this.scene = scene;
    this.bones = bones;
  }

  private getBoneWorldPosition(boneName: string): THREE.Vector3 | null {
    const bone = this.bones[boneName];
    if (!bone) return null;
    const worldPos = new THREE.Vector3();
    bone.getWorldPosition(worldPos);
    return worldPos;
  }

  private fusiformRadiusFunction(t: number, bellyPosition: number, bellyRadius: number, tendonRadius: number): number {
    let normalizedDist: number;
    if (t <= bellyPosition) {
      normalizedDist = bellyPosition > 0 ? (bellyPosition - t) / bellyPosition : 0;
    } else {
      const distToEnd = 1 - bellyPosition;
      normalizedDist = distToEnd > 0 ? (t - bellyPosition) / distToEnd : 0;
    }
    normalizedDist = Math.min(1, Math.max(0, normalizedDist));
    const smoothFactor = Math.pow(Math.cos(normalizedDist * Math.PI / 2), 1.5);
    return tendonRadius + (bellyRadius - tendonRadius) * smoothFactor;
  }

  private createFusiformMuscleGeometry(
    origin: THREE.Vector3,
    insertion: THREE.Vector3,
    controlPoints: THREE.Vector3[] | undefined,
    bellyPosition: number = 0.5,
    bellyWidth: number = 0.05,
    tendonWidth: number = 0.015,
    activation: number = 0.5
  ): THREE.BufferGeometry {
    const activationMultiplier = 1 + activation * 0.3;
    const actualBellyWidth = bellyWidth * activationMultiplier;
    
    let curvePoints: THREE.Vector3[];
    if (controlPoints && controlPoints.length > 0) {
      curvePoints = [origin, ...controlPoints, insertion];
    } else {
      const mid = new THREE.Vector3().lerpVectors(origin, insertion, 0.5);
      const direction = new THREE.Vector3().subVectors(insertion, origin).normalize();
      const perpendicular = new THREE.Vector3();
      if (Math.abs(direction.y) < 0.9) {
        perpendicular.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
      }
      const offset = perpendicular.multiplyScalar(actualBellyWidth * 0.3);
      mid.add(offset);
      curvePoints = [origin, mid, insertion];
    }
    
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubularSegments = 32;
    const radialSegments = 12;
    
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    const frames = curve.computeFrenetFrames(tubularSegments, false);
    
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const point = curve.getPointAt(t);
      const radius = this.fusiformRadiusFunction(t, bellyPosition, actualBellyWidth, tendonWidth);
      
      const N = frames.normals[i];
      const B = frames.binormals[i];
      
      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        
        const nx = cos * N.x + sin * B.x;
        const ny = cos * N.y + sin * B.y;
        const nz = cos * N.z + sin * B.z;
        
        positions.push(
          point.x + radius * nx,
          point.y + radius * ny,
          point.z + radius * nz
        );
        
        normals.push(nx, ny, nz);
        uvs.push(t, j / radialSegments);
      }
    }
    
    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = (i + 1) * (radialSegments + 1) + j;
        const c = (i + 1) * (radialSegments + 1) + (j + 1);
        const d = i * (radialSegments + 1) + (j + 1);
        
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    return geometry;
  }

  private createAnatomicalMuscle(
    muscle: MuscleDefinition,
    origin: THREE.Vector3,
    insertion: THREE.Vector3,
    activation: number = 0.5
  ): THREE.Mesh {
    const geometry = this.createFusiformMuscleGeometry(
      origin,
      insertion,
      muscle.controlPoints,
      muscle.bellyPosition || 0.5,
      muscle.bellyWidth || 0.05,
      muscle.tendonWidth || 0.015,
      activation
    );
    
    const activationIntensity = Math.min(1, activation);
    const finalColor = muscle.color.clone();
    if (activationIntensity > 0.5) {
      finalColor.lerp(new THREE.Color(0xff3333), (activationIntensity - 0.5) * 0.5);
    }
    
    const material = new THREE.MeshPhongMaterial({
      color: finalColor,
      transparent: true,
      opacity: 0.75 + activation * 0.2,
      shininess: 60,
      side: THREE.DoubleSide,
      flatShading: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }

  private createMuscleLabel(name: string, position: THREE.Vector3): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.roundRect(0, 0, canvas.width, canvas.height, 8);
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    context.lineWidth = 2;
    context.stroke();
    
    context.fillStyle = 'white';
    context.font = 'bold 14px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(0.4, 0.1, 1);
    
    return sprite;
  }

  updateMuscles(
    activationLevels: MuscleActivationLevels = {},
    visibleGroups: { quadriceps: boolean; hamstrings: boolean; adductors: boolean; other: boolean } = 
      { quadriceps: true, hamstrings: true, adductors: true, other: true }
  ): void {
    this.clearMuscles();
    
    for (const muscle of UPPER_LEG_MUSCLES) {
      if (!visibleGroups[muscle.group]) continue;
      
      const originBonePos = this.getBoneWorldPosition(muscle.origin.bone);
      const insertionBonePos = this.getBoneWorldPosition(muscle.insertion.bone);
      
      if (!originBonePos || !insertionBonePos) {
        console.warn(`Could not find bones for muscle ${muscle.name}: origin=${muscle.origin.bone}, insertion=${muscle.insertion.bone}`);
        continue;
      }
      
      const originWorld = originBonePos.clone().add(muscle.origin.offset);
      const insertionWorld = insertionBonePos.clone().add(muscle.insertion.offset);
      
      const activation = this.getActivationLevel(muscle.name, activationLevels);
      
      const muscleMesh = this.createAnatomicalMuscle(
        muscle,
        originWorld,
        insertionWorld,
        activation
      );
      
      this.scene.add(muscleMesh);
      this.muscleMeshes.set(muscle.name, muscleMesh);
      
      if (this.showLabels) {
        const bellyPos = muscle.bellyPosition || 0.5;
        const labelPos = new THREE.Vector3()
          .lerpVectors(originWorld, insertionWorld, bellyPos)
          .add(new THREE.Vector3(0, 0.08, 0.08));
        const label = this.createMuscleLabel(muscle.displayName, labelPos);
        this.scene.add(label);
        this.muscleLabels.set(muscle.name, label);
      }
    }
  }

  private getActivationLevel(muscleName: string, levels: MuscleActivationLevels): number {
    const isLeft = muscleName.endsWith('_L');
    const baseName = muscleName.replace(/_[LR]$/, '');
    
    const levelMap: { [key: string]: keyof MuscleActivationLevels } = {
      'rectusFemoris': 'rectusFemoris',
      'vastusLateralis': 'vastusLateralis',
      'vastusMedialis': 'vastusMedialis',
      'vastusIntermedius': 'vastusIntermedius',
      'bicepsFemoris': 'bicepsFemoris',
      'semimembranosus': 'semimembranosus',
      'semitendinosus': 'semitendinosus',
      'adductorMagnus': 'adductorMagnus',
      'adductorLongus': 'adductorLongus',
      'sartorius': 'sartorius',
      'tensorFasciaeLatae': 'tensorFasciaeLatae'
    };
    
    const key = levelMap[baseName];
    if (!key || !levels[key]) return 0.3;
    
    const levelData = levels[key];
    if (typeof levelData === 'object' && 'left' in levelData && 'right' in levelData) {
      return isLeft ? levelData.left / 100 : levelData.right / 100;
    }
    
    return 0.3;
  }

  setShowLabels(show: boolean): void {
    this.showLabels = show;
  }

  clearMuscles(): void {
    this.muscleMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.muscleMeshes.clear();
    
    this.muscleLabels.forEach((label) => {
      this.scene.remove(label);
      if (label.material instanceof THREE.SpriteMaterial && label.material.map) {
        label.material.map.dispose();
      }
      label.material.dispose();
    });
    this.muscleLabels.clear();
  }

  dispose(): void {
    this.clearMuscles();
  }
}
