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
  group: 'quadriceps' | 'hamstrings' | 'adductors' | 'calf' | 'shin' | 'lateral' | 'other';
  role?: 'flexor' | 'extensor' | 'adductor' | 'abductor' | 'plantarflexor' | 'dorsiflexor' | 'evertor' | 'invertor';
  jointActions?: { joint: string; action: 'flexion' | 'extension' | 'adduction' | 'abduction' | 'plantarflexion' | 'dorsiflexion' | 'eversion' | 'inversion' }[];
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
  gastrocnemiusMedial?: { left: number; right: number };
  gastrocnemiusLateral?: { left: number; right: number };
  soleus?: { left: number; right: number };
  plantaris?: { left: number; right: number };
  tibialisAnterior?: { left: number; right: number };
  extensorDigitorumLongus?: { left: number; right: number };
  extensorHallucisLongus?: { left: number; right: number };
  peroneusLongus?: { left: number; right: number };
  peroneusBrevis?: { left: number; right: number };
}

interface MuscleState {
  mesh: THREE.Mesh;
  definition: MuscleDefinition;
  restLength: number;
  currentLength: number;
  previousLength: number;
  stretchRatio: number;
  velocity: number;
  isContracting: boolean;
  isStretching: boolean;
  activationLevel: number;
}

const UPPER_LEG_MUSCLES_LEFT: MuscleDefinition[] = [
  {
    name: 'rectusFemoris_L',
    displayName: 'Rectus Femoris (L)',
    origin: {
      bone: 'Root_M',
      offset: new THREE.Vector3(0.12, 0.05, 0.18),
      landmark: 'AIIS'
    },
    insertion: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0, 0.08, 0.15),
      landmark: 'Patella/Quadriceps Tendon'
    },
    bellyPosition: 0.45,
    bellyWidth: 0.055,
    tendonWidth: 0.018,
    color: new THREE.Color(0xcc4444),
    group: 'quadriceps',
    role: 'extensor',
    jointActions: [{ joint: 'knee', action: 'extension' }, { joint: 'hip', action: 'flexion' }]
  },
  {
    name: 'vastusLateralis_L',
    displayName: 'Vastus Lateralis (L)',
    origin: {
      bone: 'Hip_L',
      offset: new THREE.Vector3(0.1, -0.1, 0.08),
      landmark: 'Greater Trochanter/Linea Aspera'
    },
    insertion: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0.06, 0.06, 0.12),
      landmark: 'Patella (lateral)'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.065,
    tendonWidth: 0.015,
    color: new THREE.Color(0xdd5555),
    group: 'quadriceps',
    role: 'extensor',
    jointActions: [{ joint: 'knee', action: 'extension' }]
  },
  {
    name: 'vastusMedialis_L',
    displayName: 'Vastus Medialis (L)',
    origin: {
      bone: 'HipPart1_L',
      offset: new THREE.Vector3(-0.08, 0.3, 0.08),
      landmark: 'Linea Aspera (medial)'
    },
    insertion: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(-0.05, 0.06, 0.12),
      landmark: 'Patella (medial)'
    },
    bellyPosition: 0.6,
    bellyWidth: 0.05,
    tendonWidth: 0.015,
    color: new THREE.Color(0xee6666),
    group: 'quadriceps',
    role: 'extensor',
    jointActions: [{ joint: 'knee', action: 'extension' }]
  },
  {
    name: 'vastusIntermedius_L',
    displayName: 'Vastus Intermedius (L)',
    origin: {
      bone: 'HipPart1_L',
      offset: new THREE.Vector3(0, 0.4, 0.1),
      landmark: 'Anterior Femur'
    },
    insertion: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0, 0.07, 0.13),
      landmark: 'Patella (deep)'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.045,
    tendonWidth: 0.012,
    color: new THREE.Color(0xff7777),
    group: 'quadriceps',
    role: 'extensor',
    jointActions: [{ joint: 'knee', action: 'extension' }]
  },
  {
    name: 'bicepsFemoris_L',
    displayName: 'Biceps Femoris (L)',
    origin: {
      bone: 'Root_M',
      offset: new THREE.Vector3(0.08, -0.05, -0.15),
      landmark: 'Ischial Tuberosity'
    },
    insertion: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0.08, 0.02, -0.04),
      landmark: 'Fibular Head'
    },
    bellyPosition: 0.55,
    bellyWidth: 0.055,
    tendonWidth: 0.018,
    color: new THREE.Color(0x4477cc),
    group: 'hamstrings',
    role: 'flexor',
    jointActions: [{ joint: 'knee', action: 'flexion' }, { joint: 'hip', action: 'extension' }]
  },
  {
    name: 'semimembranosus_L',
    displayName: 'Semimembranosus (L)',
    origin: {
      bone: 'Root_M',
      offset: new THREE.Vector3(0.05, -0.06, -0.14),
      landmark: 'Ischial Tuberosity'
    },
    insertion: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(-0.04, 0.02, -0.05),
      landmark: 'Medial Tibial Condyle'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.05,
    tendonWidth: 0.016,
    color: new THREE.Color(0x5588dd),
    group: 'hamstrings',
    role: 'flexor',
    jointActions: [{ joint: 'knee', action: 'flexion' }, { joint: 'hip', action: 'extension' }]
  },
  {
    name: 'semitendinosus_L',
    displayName: 'Semitendinosus (L)',
    origin: {
      bone: 'Root_M',
      offset: new THREE.Vector3(0.06, -0.04, -0.13),
      landmark: 'Ischial Tuberosity'
    },
    insertion: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(-0.05, -0.05, 0.02),
      landmark: 'Pes Anserinus'
    },
    bellyPosition: 0.4,
    bellyWidth: 0.04,
    tendonWidth: 0.012,
    color: new THREE.Color(0x6699ee),
    group: 'hamstrings',
    role: 'flexor',
    jointActions: [{ joint: 'knee', action: 'flexion' }, { joint: 'hip', action: 'extension' }]
  },
  {
    name: 'adductorMagnus_L',
    displayName: 'Adductor Magnus (L)',
    origin: {
      bone: 'Root_M',
      offset: new THREE.Vector3(0.02, -0.08, -0.08),
      landmark: 'Ischiopubic Ramus'
    },
    insertion: {
      bone: 'HipPart1_L',
      offset: new THREE.Vector3(-0.06, -0.2, -0.04),
      landmark: 'Linea Aspera/Adductor Tubercle'
    },
    bellyPosition: 0.45,
    bellyWidth: 0.07,
    tendonWidth: 0.02,
    color: new THREE.Color(0x44aa77),
    group: 'adductors',
    role: 'adductor',
    jointActions: [{ joint: 'hip', action: 'adduction' }]
  },
  {
    name: 'adductorLongus_L',
    displayName: 'Adductor Longus (L)',
    origin: {
      bone: 'Root_M',
      offset: new THREE.Vector3(0.0, -0.02, 0.08),
      landmark: 'Pubic Body'
    },
    insertion: {
      bone: 'HipPart1_L',
      offset: new THREE.Vector3(-0.05, 0.1, -0.02),
      landmark: 'Linea Aspera (middle third)'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.045,
    tendonWidth: 0.015,
    color: new THREE.Color(0x55bb88),
    group: 'adductors',
    role: 'adductor',
    jointActions: [{ joint: 'hip', action: 'adduction' }]
  },
  {
    name: 'sartorius_L',
    displayName: 'Sartorius (L)',
    origin: {
      bone: 'Root_M',
      offset: new THREE.Vector3(0.15, 0.08, 0.1),
      landmark: 'ASIS'
    },
    insertion: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(-0.05, -0.04, 0.03),
      landmark: 'Pes Anserinus'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.025,
    tendonWidth: 0.01,
    color: new THREE.Color(0xcc88cc),
    group: 'other',
    role: 'flexor',
    jointActions: [{ joint: 'hip', action: 'flexion' }, { joint: 'knee', action: 'flexion' }]
  },
  {
    name: 'tensorFasciaeLatae_L',
    displayName: 'Tensor Fasciae Latae (L)',
    origin: {
      bone: 'Root_M',
      offset: new THREE.Vector3(0.16, 0.06, 0.06),
      landmark: 'ASIS'
    },
    insertion: {
      bone: 'HipPart1_L',
      offset: new THREE.Vector3(0.1, -0.15, 0),
      landmark: 'IT Band (lateral femur)'
    },
    bellyPosition: 0.35,
    bellyWidth: 0.04,
    tendonWidth: 0.015,
    color: new THREE.Color(0xddaa44),
    group: 'other',
    role: 'abductor',
    jointActions: [{ joint: 'hip', action: 'abduction' }]
  }
];

const LOWER_LEG_MUSCLES_LEFT: MuscleDefinition[] = [
  // Posterior compartment (calf)
  {
    name: 'gastrocnemiusMedial_L',
    displayName: 'Gastrocnemius Medial (L)',
    origin: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(-0.03, 0.18, -0.04),
      landmark: 'Medial Femoral Condyle'
    },
    insertion: {
      bone: 'Ankle_L',
      offset: new THREE.Vector3(0, 0.15, -0.06),
      landmark: 'Calcaneus (via Achilles)'
    },
    bellyPosition: 0.4,
    bellyWidth: 0.055,
    tendonWidth: 0.02,
    color: new THREE.Color(0x8844aa),
    group: 'calf',
    role: 'plantarflexor',
    jointActions: [{ joint: 'ankle', action: 'plantarflexion' }, { joint: 'knee', action: 'flexion' }]
  },
  {
    name: 'gastrocnemiusLateral_L',
    displayName: 'Gastrocnemius Lateral (L)',
    origin: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0.04, 0.18, -0.04),
      landmark: 'Lateral Femoral Condyle'
    },
    insertion: {
      bone: 'Ankle_L',
      offset: new THREE.Vector3(0, 0.15, -0.06),
      landmark: 'Calcaneus (via Achilles)'
    },
    bellyPosition: 0.4,
    bellyWidth: 0.05,
    tendonWidth: 0.02,
    color: new THREE.Color(0x9955bb),
    group: 'calf',
    role: 'plantarflexor',
    jointActions: [{ joint: 'ankle', action: 'plantarflexion' }, { joint: 'knee', action: 'flexion' }]
  },
  {
    name: 'soleus_L',
    displayName: 'Soleus (L)',
    origin: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0, 0.1, -0.05),
      landmark: 'Posterior Tibia/Fibula'
    },
    insertion: {
      bone: 'Ankle_L',
      offset: new THREE.Vector3(0, 0.12, -0.05),
      landmark: 'Calcaneus (via Achilles)'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.06,
    tendonWidth: 0.025,
    color: new THREE.Color(0xaa66cc),
    group: 'calf',
    role: 'plantarflexor',
    jointActions: [{ joint: 'ankle', action: 'plantarflexion' }]
  },
  {
    name: 'plantaris_L',
    displayName: 'Plantaris (L)',
    origin: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0.03, 0.2, -0.03),
      landmark: 'Lateral Supracondylar Line'
    },
    insertion: {
      bone: 'Ankle_L',
      offset: new THREE.Vector3(0.01, 0.14, -0.04),
      landmark: 'Calcaneus (medial)'
    },
    bellyPosition: 0.25,
    bellyWidth: 0.02,
    tendonWidth: 0.008,
    color: new THREE.Color(0xbb77dd),
    group: 'calf',
    role: 'plantarflexor',
    jointActions: [{ joint: 'ankle', action: 'plantarflexion' }]
  },
  // Anterior compartment (shin)
  {
    name: 'tibialisAnterior_L',
    displayName: 'Tibialis Anterior (L)',
    origin: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0.02, 0, 0.08),
      landmark: 'Lateral Tibial Condyle'
    },
    insertion: {
      bone: 'Ankle_L',
      offset: new THREE.Vector3(-0.02, 0.05, 0.08),
      landmark: 'Medial Cuneiform/1st Metatarsal'
    },
    bellyPosition: 0.4,
    bellyWidth: 0.04,
    tendonWidth: 0.015,
    color: new THREE.Color(0x44aa88),
    group: 'shin',
    role: 'dorsiflexor',
    jointActions: [{ joint: 'ankle', action: 'dorsiflexion' }, { joint: 'foot', action: 'inversion' }]
  },
  {
    name: 'extensorDigitorumLongus_L',
    displayName: 'Extensor Digitorum Longus (L)',
    origin: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0.05, -0.02, 0.06),
      landmark: 'Lateral Tibial Condyle/Fibula'
    },
    insertion: {
      bone: 'Ankle_L',
      offset: new THREE.Vector3(0.03, -0.02, 0.1),
      landmark: 'Distal Phalanges 2-5'
    },
    bellyPosition: 0.45,
    bellyWidth: 0.035,
    tendonWidth: 0.012,
    color: new THREE.Color(0x55bb99),
    group: 'shin',
    role: 'dorsiflexor',
    jointActions: [{ joint: 'ankle', action: 'dorsiflexion' }]
  },
  {
    name: 'extensorHallucisLongus_L',
    displayName: 'Extensor Hallucis Longus (L)',
    origin: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0.03, -0.15, 0.07),
      landmark: 'Middle Fibula'
    },
    insertion: {
      bone: 'Ankle_L',
      offset: new THREE.Vector3(-0.01, -0.03, 0.09),
      landmark: 'Distal Phalanx of Hallux'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.025,
    tendonWidth: 0.01,
    color: new THREE.Color(0x66ccaa),
    group: 'shin',
    role: 'dorsiflexor',
    jointActions: [{ joint: 'ankle', action: 'dorsiflexion' }]
  },
  // Lateral compartment
  {
    name: 'peroneusLongus_L',
    displayName: 'Peroneus Longus (L)',
    origin: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0.08, -0.03, 0.02),
      landmark: 'Fibular Head/Upper Fibula'
    },
    insertion: {
      bone: 'Ankle_L',
      offset: new THREE.Vector3(-0.03, 0, 0.02),
      landmark: '1st Metatarsal Base (plantar)'
    },
    bellyPosition: 0.45,
    bellyWidth: 0.035,
    tendonWidth: 0.012,
    color: new THREE.Color(0xdd8844),
    group: 'lateral',
    role: 'evertor',
    jointActions: [{ joint: 'foot', action: 'eversion' }, { joint: 'ankle', action: 'plantarflexion' }]
  },
  {
    name: 'peroneusBrevis_L',
    displayName: 'Peroneus Brevis (L)',
    origin: {
      bone: 'Knee_L',
      offset: new THREE.Vector3(0.07, -0.2, 0.02),
      landmark: 'Lower Fibula'
    },
    insertion: {
      bone: 'Ankle_L',
      offset: new THREE.Vector3(0.05, 0.02, 0.04),
      landmark: '5th Metatarsal Base'
    },
    bellyPosition: 0.5,
    bellyWidth: 0.03,
    tendonWidth: 0.01,
    color: new THREE.Color(0xee9955),
    group: 'lateral',
    role: 'evertor',
    jointActions: [{ joint: 'foot', action: 'eversion' }]
  }
];

function createRightSideMuscles(muscles: MuscleDefinition[]): MuscleDefinition[] {
  return muscles.map(muscle => ({
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
  ...createRightSideMuscles(UPPER_LEG_MUSCLES_LEFT)
];

export const LOWER_LEG_MUSCLES: MuscleDefinition[] = [
  ...LOWER_LEG_MUSCLES_LEFT,
  ...createRightSideMuscles(LOWER_LEG_MUSCLES_LEFT)
];

export const ALL_LEG_MUSCLES: MuscleDefinition[] = [
  ...UPPER_LEG_MUSCLES,
  ...LOWER_LEG_MUSCLES
];

const STRETCH_COLOR = new THREE.Color(0x4488ff);
const CONTRACT_COLOR = new THREE.Color(0xff4444);
const NEUTRAL_ALPHA = 0.7;
const ACTIVE_ALPHA = 0.9;

export class MuscleVisualizationManager {
  private scene: THREE.Scene;
  private bones: { [name: string]: THREE.Object3D };
  private muscleStates: Map<string, MuscleState> = new Map();
  private muscleLabels: Map<string, THREE.Sprite> = new Map();
  private showLabels: boolean = false;
  private visibleGroups = { quadriceps: true, hamstrings: true, adductors: true, calf: true, shin: true, lateral: true, other: true };
  private isInitialized: boolean = false;
  private tubularSegments = 24;
  private radialSegments = 8;

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

  private getBoneWorldMatrix(boneName: string): THREE.Matrix4 | null {
    const bone = this.bones[boneName];
    if (!bone) return null;
    bone.updateWorldMatrix(true, false);
    return bone.matrixWorld.clone();
  }

  private getAttachmentWorldPosition(attachment: { bone: string; offset: THREE.Vector3 }): THREE.Vector3 | null {
    const boneMatrix = this.getBoneWorldMatrix(attachment.bone);
    if (!boneMatrix) return null;
    
    const worldPos = attachment.offset.clone();
    worldPos.applyMatrix4(boneMatrix);
    return worldPos;
  }

  private fusiformRadiusFunction(
    t: number, 
    bellyPosition: number, 
    bellyRadius: number, 
    tendonRadius: number,
    stretchFactor: number = 1
  ): number {
    let normalizedDist: number;
    if (t <= bellyPosition) {
      normalizedDist = bellyPosition > 0 ? (bellyPosition - t) / bellyPosition : 0;
    } else {
      const distToEnd = 1 - bellyPosition;
      normalizedDist = distToEnd > 0 ? (t - bellyPosition) / distToEnd : 0;
    }
    normalizedDist = Math.min(1, Math.max(0, normalizedDist));
    const smoothFactor = Math.pow(Math.cos(normalizedDist * Math.PI / 2), 1.5);
    
    const adjustedBellyRadius = bellyRadius / Math.sqrt(stretchFactor);
    return tendonRadius + (adjustedBellyRadius - tendonRadius) * smoothFactor;
  }

  private updateMuscleGeometry(
    geometry: THREE.BufferGeometry,
    origin: THREE.Vector3,
    insertion: THREE.Vector3,
    controlPoints: THREE.Vector3[] | undefined,
    bellyPosition: number,
    bellyWidth: number,
    tendonWidth: number,
    stretchFactor: number
  ): void {
    let curvePoints: THREE.Vector3[];
    if (controlPoints && controlPoints.length > 0) {
      curvePoints = [origin, ...controlPoints, insertion];
    } else {
      const mid = new THREE.Vector3().lerpVectors(origin, insertion, bellyPosition);
      const direction = new THREE.Vector3().subVectors(insertion, origin).normalize();
      const perpendicular = new THREE.Vector3();
      if (Math.abs(direction.y) < 0.9) {
        perpendicular.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
      }
      const bulgeAmount = bellyWidth * 0.4 / Math.sqrt(stretchFactor);
      mid.add(perpendicular.multiplyScalar(bulgeAmount));
      curvePoints = [origin, mid, insertion];
    }
    
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const frames = curve.computeFrenetFrames(this.tubularSegments, false);
    
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    const normalAttribute = geometry.getAttribute('normal') as THREE.BufferAttribute;
    
    let vertexIndex = 0;
    for (let i = 0; i <= this.tubularSegments; i++) {
      const t = i / this.tubularSegments;
      const point = curve.getPointAt(t);
      const radius = this.fusiformRadiusFunction(t, bellyPosition, bellyWidth, tendonWidth, stretchFactor);
      
      const N = frames.normals[i];
      const B = frames.binormals[i];
      
      for (let j = 0; j <= this.radialSegments; j++) {
        const theta = (j / this.radialSegments) * Math.PI * 2;
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        
        const nx = cos * N.x + sin * B.x;
        const ny = cos * N.y + sin * B.y;
        const nz = cos * N.z + sin * B.z;
        
        positionAttribute.setXYZ(
          vertexIndex,
          point.x + radius * nx,
          point.y + radius * ny,
          point.z + radius * nz
        );
        
        normalAttribute.setXYZ(vertexIndex, nx, ny, nz);
        vertexIndex++;
      }
    }
    
    positionAttribute.needsUpdate = true;
    normalAttribute.needsUpdate = true;
    geometry.computeBoundingSphere();
  }

  private createInitialGeometry(): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    for (let i = 0; i <= this.tubularSegments; i++) {
      const t = i / this.tubularSegments;
      for (let j = 0; j <= this.radialSegments; j++) {
        positions.push(0, t, 0);
        normals.push(1, 0, 0);
        uvs.push(t, j / this.radialSegments);
      }
    }
    
    for (let i = 0; i < this.tubularSegments; i++) {
      for (let j = 0; j < this.radialSegments; j++) {
        const a = i * (this.radialSegments + 1) + j;
        const b = (i + 1) * (this.radialSegments + 1) + j;
        const c = (i + 1) * (this.radialSegments + 1) + (j + 1);
        const d = i * (this.radialSegments + 1) + (j + 1);
        
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

  private getMuscleColor(state: MuscleState): THREE.Color {
    const baseColor = state.definition.color.clone();
    
    if (state.isStretching && state.stretchRatio > 1.05) {
      const stretchIntensity = Math.min(1, (state.stretchRatio - 1) * 3);
      baseColor.lerp(STRETCH_COLOR, stretchIntensity * 0.6);
    } else if (state.isContracting || state.stretchRatio < 0.95) {
      const contractIntensity = Math.min(1, (1 - state.stretchRatio) * 4 + Math.abs(state.velocity) * 2);
      baseColor.lerp(CONTRACT_COLOR, contractIntensity * 0.6);
    }
    
    if (state.activationLevel > 0.5) {
      baseColor.lerp(CONTRACT_COLOR, (state.activationLevel - 0.5) * 0.4);
    }
    
    return baseColor;
  }

  initializeMuscles(
    activationLevels: MuscleActivationLevels = {},
    visibleGroups: { quadriceps: boolean; hamstrings: boolean; adductors: boolean; calf: boolean; shin: boolean; lateral: boolean; other: boolean } = 
      { quadriceps: true, hamstrings: true, adductors: true, calf: true, shin: true, lateral: true, other: true }
  ): void {
    this.clearMuscles();
    this.visibleGroups = visibleGroups;
    
    for (const muscle of ALL_LEG_MUSCLES) {
      if (!visibleGroups[muscle.group]) continue;
      
      const originWorld = this.getAttachmentWorldPosition(muscle.origin);
      const insertionWorld = this.getAttachmentWorldPosition(muscle.insertion);
      
      if (!originWorld || !insertionWorld) {
        console.warn(`Could not find bones for muscle ${muscle.name}`);
        continue;
      }
      
      const restLength = originWorld.distanceTo(insertionWorld);
      const activation = this.getActivationLevel(muscle.name, activationLevels);
      
      const geometry = this.createInitialGeometry();
      this.updateMuscleGeometry(
        geometry,
        originWorld,
        insertionWorld,
        muscle.controlPoints,
        muscle.bellyPosition || 0.5,
        muscle.bellyWidth || 0.05,
        muscle.tendonWidth || 0.015,
        1.0
      );
      
      const material = new THREE.MeshPhongMaterial({
        color: muscle.color,
        transparent: true,
        opacity: NEUTRAL_ALPHA,
        shininess: 60,
        side: THREE.DoubleSide,
        flatShading: false
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      
      const state: MuscleState = {
        mesh,
        definition: muscle,
        restLength,
        currentLength: restLength,
        previousLength: restLength,
        stretchRatio: 1,
        velocity: 0,
        isContracting: false,
        isStretching: false,
        activationLevel: activation
      };
      
      this.muscleStates.set(muscle.name, state);
      
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
    
    this.isInitialized = true;
  }

  updateFrame(deltaTime: number = 0.016): void {
    if (!this.isInitialized) return;
    
    this.muscleStates.forEach((state, name) => {
      const muscle = state.definition;
      
      const originWorld = this.getAttachmentWorldPosition(muscle.origin);
      const insertionWorld = this.getAttachmentWorldPosition(muscle.insertion);
      
      if (!originWorld || !insertionWorld) return;
      
      state.previousLength = state.currentLength;
      state.currentLength = originWorld.distanceTo(insertionWorld);
      state.stretchRatio = state.currentLength / state.restLength;
      
      const lengthChange = state.currentLength - state.previousLength;
      state.velocity = deltaTime > 0 ? lengthChange / deltaTime : 0;
      
      state.isStretching = state.velocity > 0.01;
      state.isContracting = state.velocity < -0.01;
      
      this.updateMuscleGeometry(
        state.mesh.geometry as THREE.BufferGeometry,
        originWorld,
        insertionWorld,
        muscle.controlPoints,
        muscle.bellyPosition || 0.5,
        muscle.bellyWidth || 0.05,
        muscle.tendonWidth || 0.015,
        state.stretchRatio
      );
      
      const material = state.mesh.material as THREE.MeshPhongMaterial;
      material.color.copy(this.getMuscleColor(state));
      
      if (state.isContracting || state.isStretching) {
        material.opacity = ACTIVE_ALPHA;
      } else {
        material.opacity = NEUTRAL_ALPHA;
      }
      
      const label = this.muscleLabels.get(name);
      if (label) {
        const bellyPos = muscle.bellyPosition || 0.5;
        label.position.lerpVectors(originWorld, insertionWorld, bellyPos);
        label.position.add(new THREE.Vector3(0, 0.08, 0.08));
      }
    });
  }

  updateMuscles(
    activationLevels: MuscleActivationLevels = {},
    visibleGroups: { quadriceps: boolean; hamstrings: boolean; adductors: boolean; calf: boolean; shin: boolean; lateral: boolean; other: boolean } = 
      { quadriceps: true, hamstrings: true, adductors: true, calf: true, shin: true, lateral: true, other: true }
  ): void {
    const groupsChanged = JSON.stringify(this.visibleGroups) !== JSON.stringify(visibleGroups);
    
    if (!this.isInitialized || groupsChanged) {
      this.initializeMuscles(activationLevels, visibleGroups);
    } else {
      this.muscleStates.forEach((state, name) => {
        state.activationLevel = this.getActivationLevel(name, activationLevels);
      });
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
      'tensorFasciaeLatae': 'tensorFasciaeLatae',
      'gastrocnemiusMedial': 'gastrocnemiusMedial',
      'gastrocnemiusLateral': 'gastrocnemiusLateral',
      'soleus': 'soleus',
      'plantaris': 'plantaris',
      'tibialisAnterior': 'tibialisAnterior',
      'extensorDigitorumLongus': 'extensorDigitorumLongus',
      'extensorHallucisLongus': 'extensorHallucisLongus',
      'peroneusLongus': 'peroneusLongus',
      'peroneusBrevis': 'peroneusBrevis'
    };
    
    const key = levelMap[baseName];
    if (!key || !levels[key]) return 0.3;
    
    const levelData = levels[key];
    if (typeof levelData === 'object' && 'left' in levelData && 'right' in levelData) {
      return isLeft ? levelData.left / 100 : levelData.right / 100;
    }
    
    return 0.3;
  }

  getMuscleStates(): Map<string, { 
    name: string; 
    stretchRatio: number; 
    isContracting: boolean; 
    isStretching: boolean;
    velocity: number;
  }> {
    const states = new Map<string, { name: string; stretchRatio: number; isContracting: boolean; isStretching: boolean; velocity: number }>();
    this.muscleStates.forEach((state, name) => {
      states.set(name, {
        name: state.definition.displayName,
        stretchRatio: state.stretchRatio,
        isContracting: state.isContracting,
        isStretching: state.isStretching,
        velocity: state.velocity
      });
    });
    return states;
  }

  setShowLabels(show: boolean): void {
    this.showLabels = show;
  }

  clearMuscles(): void {
    this.muscleStates.forEach((state) => {
      this.scene.remove(state.mesh);
      state.mesh.geometry.dispose();
      (state.mesh.material as THREE.Material).dispose();
    });
    this.muscleStates.clear();
    
    this.muscleLabels.forEach((label) => {
      this.scene.remove(label);
      if (label.material instanceof THREE.SpriteMaterial && label.material.map) {
        label.material.map.dispose();
      }
      label.material.dispose();
    });
    this.muscleLabels.clear();
    
    this.isInitialized = false;
  }

  dispose(): void {
    this.clearMuscles();
  }
}
