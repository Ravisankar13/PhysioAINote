export type MuscleState = 'shortened' | 'neutral' | 'lengthened';
export type ActivationLevel = 'inactive' | 'low' | 'moderate' | 'high';
export type ToneLevel = 'hypotonic' | 'normal' | 'hypertonic';
export type ClinicalStatus = 'normal' | 'shortened' | 'lengthened' | 'overactive' | 'inhibited' | 'spasm' | 'weak';

export interface MuscleStatus {
  id: string;
  label: string;
  state: MuscleState;
  tension: number;
  activation: ActivationLevel;
  activationPercent: number;
  description: string;
}

export type InfluenceSource = 'manual' | 'reciprocal_inhibition' | 'fascial_chain';

export interface IndividualMuscle {
  id: string;
  label: string;
  meshGroup: string;
  lengthPercent: number;
  activationPercent: number;
  tightnessPercent: number;
  inhibitionPercent: number;
  tone: ToneLevel;
  fatigueRisk: number;
  clinicalStatus: ClinicalStatus;
  clinicalNote: string;
  state: MuscleState;
  influenceSources?: InfluenceSource[];
  riInhibitionDelta?: number;
  chainTensionDelta?: number;
  chainActivationDelta?: number;
}

export interface MuscleGroupAnalysis {
  id: string;
  label: string;
  meshGroup: string;
  muscles: IndividualMuscle[];
  avgActivation: number;
  avgTightness: number;
  avgInhibition: number;
  dominantStatus: ClinicalStatus;
}

export interface CrossSyndromePattern {
  id: string;
  label: string;
  detected: boolean;
  severity: number;
  tightMuscles: string[];
  weakMuscles: string[];
  description: string;
}

export interface MuscleAnalysisResult {
  groups: MuscleGroupAnalysis[];
  allMuscles: IndividualMuscle[];
  syndromes: CrossSyndromePattern[];
  groupStates: MuscleStatesMap;
}

export interface MuscleStatesMap {
  [muscleGroupId: string]: MuscleStatus;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function safeNum(val: any): number {
  return typeof val === 'number' && !isNaN(val) ? val : 0;
}

function safeJoint<T extends Record<string, number>>(obj: any, defaults: T): T {
  if (!obj) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(defaults)) {
    result[key as keyof T] = safeNum(obj[key]) as T[keyof T];
  }
  return result;
}

function getLengthState(lengthPct: number): MuscleState {
  if (lengthPct < 90) return 'shortened';
  if (lengthPct > 110) return 'lengthened';
  return 'neutral';
}

function getTone(tightness: number, activation: number): ToneLevel {
  const combined = tightness * 0.6 + activation * 0.4;
  if (combined > 55) return 'hypertonic';
  if (combined < 20) return 'hypotonic';
  return 'normal';
}

function getClinicalStatus(lengthPct: number, activation: number, tightness: number, inhibition: number): ClinicalStatus {
  if (inhibition > 50) return 'inhibited';
  if (tightness > 65 && lengthPct < 90) return 'shortened';
  if (tightness > 70 && activation > 60) return 'spasm';
  if (activation > 65 && tightness > 50) return 'overactive';
  if (activation < 15 && inhibition > 30) return 'weak';
  if (lengthPct > 115) return 'lengthened';
  if (lengthPct < 85) return 'shortened';
  return 'normal';
}

function getFatigueRisk(activation: number, tightness: number): number {
  return clamp(activation * 0.6 + tightness * 0.3 - 15, 0, 100);
}

interface MuscleDefinition {
  id: string;
  label: string;
  meshGroup: string;
  category: string;
  compute: (config: any) => { lengthPct: number; activation: number; tightness: number; inhibition: number; note: string };
}

function buildMuscles(): MuscleDefinition[] {
  const muscles: MuscleDefinition[] = [];

  const addSided = (side: 'left' | 'right', defs: Omit<MuscleDefinition, 'id' | 'meshGroup'>[]) => {
    const prefix = side === 'left' ? 'l' : 'r';
    const sideLabel = side === 'left' ? 'L' : 'R';
    for (const d of defs) {
      muscles.push({
        ...d,
        id: `${prefix}_${d.category}`,
        label: `${sideLabel} ${d.label}`,
        meshGroup: d.category.replace(/^[^_]*_/, '') || d.category,
      });
    }
  };

  const hipKey = (side: string) => side === 'left' ? 'leftHip' : 'rightHip';
  const kneeKey = (side: string) => side === 'left' ? 'leftKnee' : 'rightKnee';
  const ankleKey = (side: string) => side === 'left' ? 'leftAnkle' : 'rightAnkle';
  const shoulderKey = (side: string) => side === 'left' ? 'leftShoulder' : 'rightShoulder';
  const scapKey = (side: string) => side === 'left' ? 'leftScapula' : 'rightScapula';
  const elbowKey = (side: string) => side === 'left' ? 'leftElbow' : 'rightElbow';
  const wristKey = (side: string) => side === 'left' ? 'leftWrist' : 'rightWrist';
  const suf = (side: string) => side === 'left' ? '_l' : '_r';

  for (const side of ['left', 'right'] as const) {
    const s = suf(side);
    const prefix = side === 'left' ? 'l' : 'r';
    const SL = side === 'left' ? 'L' : 'R';

    muscles.push({
      id: `${prefix}_glut_max`, label: `${SL} Gluteus Maximus`, meshGroup: `glute${s}`, category: `glute${s}`,
      compute: (c) => {
        const hip = safeJoint(c[hipKey(side)], { flexion: 0, extension: 0, abduction: 0, adduction: 0, internalRotation: 0, externalRotation: 0 });
        const pelvis = safeJoint(c.pelvis, { tilt: 0, obliquity: 0 });
        let length = 100 + hip.flexion * 0.6 - hip.extension * 0.5 + pelvis.tilt * 0.4;
        let act = 10 + Math.max(0, hip.extension) * 0.8 + Math.max(0, -pelvis.tilt) * 0.5;
        let tight = 20 + Math.max(0, -hip.flexion) * 0.3 + Math.max(0, hip.extension) * 0.4;
        let inhib = Math.max(0, hip.flexion * 0.5 + pelvis.tilt * 0.6);
        let note = 'Primary hip extensor';
        if (hip.flexion > 20) note = 'Lengthened by hip flexion; reciprocally inhibited by hip flexor tightness';
        else if (hip.extension > 10) note = 'Active in hip extension — shortened position';
        if (pelvis.tilt > 15) note += '; anterior pelvic tilt lengthens and inhibits';
        return { lengthPct: clamp(length, 60, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_glut_med`, label: `${SL} Gluteus Medius`, meshGroup: `glute${s}`, category: `glute${s}`,
      compute: (c) => {
        const hip = safeJoint(c[hipKey(side)], { flexion: 0, abduction: 0, adduction: 0, internalRotation: 0 });
        const pelvis = safeJoint(c.pelvis, { obliquity: 0, drop: 0 });
        const obliqFactor = side === 'left' ? pelvis.obliquity : -pelvis.obliquity;
        let length = 100 + hip.adduction * 0.5 - hip.abduction * 0.6 + obliqFactor * 0.4;
        let act = 15 + Math.abs(hip.abduction) * 0.6 + Math.abs(obliqFactor) * 0.5;
        let tight = 15 + Math.max(0, hip.abduction) * 0.3;
        let inhib = Math.max(0, hip.adduction * 0.4 + obliqFactor * 0.3);
        let note = 'Primary hip abductor and pelvic stabilizer';
        if (Math.abs(obliqFactor) > 5) note = `Compensating for pelvic obliquity (${obliqFactor > 0 ? 'lengthened' : 'shortened'} side)`;
        return { lengthPct: clamp(length, 70, 130), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_glut_min`, label: `${SL} Gluteus Minimus`, meshGroup: `glute${s}`, category: `glute${s}`,
      compute: (c) => {
        const hip = safeJoint(c[hipKey(side)], { flexion: 0, abduction: 0, adduction: 0, internalRotation: 0 });
        let length = 100 + hip.adduction * 0.4 - hip.abduction * 0.5;
        let act = 10 + Math.abs(hip.abduction) * 0.4 + Math.abs(hip.internalRotation) * 0.3;
        let tight = 12 + Math.max(0, hip.internalRotation) * 0.3;
        let inhib = Math.max(0, hip.adduction * 0.3);
        return { lengthPct: clamp(length, 75, 125), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note: 'Deep hip abductor and internal rotator' };
      }
    });

    muscles.push({
      id: `${prefix}_piriformis`, label: `${SL} Piriformis`, meshGroup: `glute${s}`, category: `glute${s}`,
      compute: (c) => {
        const hip = safeJoint(c[hipKey(side)], { flexion: 0, internalRotation: 0, externalRotation: 0 });
        let length = 100 + hip.internalRotation * 0.8 - hip.externalRotation * 0.6 + hip.flexion * 0.3;
        let act = 8 + Math.abs(hip.externalRotation) * 0.5;
        let tight = 15 + Math.max(0, -hip.internalRotation) * 0.4 + Math.max(0, hip.flexion) * 0.2;
        let inhib = 0;
        let note = 'Deep external rotator';
        if (hip.internalRotation > 15) note = 'Stretched by internal rotation — may impinge sciatic nerve if tight';
        if (hip.flexion > 60) note = 'Becomes hip abductor in deep flexion';
        return { lengthPct: clamp(length, 70, 135), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_rect_fem`, label: `${SL} Rectus Femoris`, meshGroup: `quad${s}`, category: `quad${s}`,
      compute: (c) => {
        const hip = safeJoint(c[hipKey(side)], { flexion: 0, extension: 0 });
        const knee = safeJoint(c[kneeKey(side)], { flexion: 0, recurvatum: 0 });
        let length = 100 - hip.flexion * 0.3 + hip.extension * 0.4 + knee.flexion * 0.5;
        let act = 10 + Math.max(0, -knee.flexion + 20) * 0.4 + Math.max(0, hip.flexion) * 0.3;
        let tight = 20 + Math.max(0, hip.flexion) * 0.3 - knee.flexion * 0.2;
        let inhib = Math.max(0, knee.flexion * 0.2);
        let note = 'Two-joint muscle: hip flexor and knee extensor';
        if (hip.flexion > 20 && knee.flexion < 10) note = 'Shortened across hip — contributing to anterior pelvic tilt';
        if (knee.flexion > 40) note = 'Lengthened by knee flexion; eccentrically loaded';
        return { lengthPct: clamp(length, 60, 145), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_vast_lat`, label: `${SL} Vastus Lateralis`, meshGroup: `quad${s}`, category: `quad${s}`,
      compute: (c) => {
        const knee = safeJoint(c[kneeKey(side)], { flexion: 0, varus: 0, recurvatum: 0 });
        let length = 100 + knee.flexion * 0.6;
        let act = 12 + Math.max(0, 30 - knee.flexion) * 0.3 + Math.abs(knee.varus) * 0.2;
        let tight = 15 - knee.flexion * 0.1;
        let inhib = 0;
        let note = 'Lateral knee extensor';
        if (knee.flexion > 30) note = 'Eccentrically controlling knee flexion';
        if (knee.varus > 5) note = 'Compensating for varus alignment';
        return { lengthPct: clamp(length, 70, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_vast_med`, label: `${SL} Vastus Medialis (VMO)`, meshGroup: `quad${s}`, category: `quad${s}`,
      compute: (c) => {
        const knee = safeJoint(c[kneeKey(side)], { flexion: 0, varus: 0, recurvatum: 0 });
        let length = 100 + knee.flexion * 0.55;
        let act = 10 + Math.max(0, 20 - knee.flexion) * 0.5;
        let tight = 12 - knee.flexion * 0.1;
        let inhib = Math.max(0, knee.flexion * 0.15);
        let note = 'Medial knee extensor — critical for patellar tracking';
        if (knee.flexion > 20) note = 'VMO often inhibited in knee flexion; predisposes to patellofemoral issues';
        if (knee.varus < -5) note = 'Under increased demand due to valgus alignment';
        return { lengthPct: clamp(length, 70, 135), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_hamstrings`, label: `${SL} Hamstrings`, meshGroup: `quad${s}`, category: `quad${s}`,
      compute: (c) => {
        const hip = safeJoint(c[hipKey(side)], { flexion: 0, extension: 0 });
        const knee = safeJoint(c[kneeKey(side)], { flexion: 0 });
        const pelvis = safeJoint(c.pelvis, { tilt: 0 });
        let length = 100 + hip.flexion * 0.5 - knee.flexion * 0.4 - pelvis.tilt * 0.3;
        let act = 8 + knee.flexion * 0.6 + Math.max(0, -pelvis.tilt) * 0.4;
        let tight = 18 + Math.max(0, -hip.flexion) * 0.3 + Math.max(0, -pelvis.tilt) * 0.4;
        let inhib = Math.max(0, hip.flexion * 0.15);
        let note = 'Two-joint muscle: hip extensor and knee flexor';
        if (hip.flexion > 30 && knee.flexion < 10) note = 'Lengthened across hip — limiting forward bend';
        if (pelvis.tilt < -5) note = 'Shortened with posterior pelvic tilt; may restrict hip flexion';
        if (knee.flexion > 30) note = 'Active in knee flexion';
        return { lengthPct: clamp(length, 60, 145), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_gastroc`, label: `${SL} Gastrocnemius`, meshGroup: `calf${s}`, category: `calf${s}`,
      compute: (c) => {
        const knee = safeJoint(c[kneeKey(side)], { flexion: 0 });
        const ankle = safeJoint(c[ankleKey(side)], { dorsiflexion: 0, plantarflexion: 0 });
        let length = 100 + ankle.dorsiflexion * 0.8 - ankle.plantarflexion * 0.6 - knee.flexion * 0.2;
        let act = 10 + ankle.plantarflexion * 0.7 + Math.max(0, ankle.dorsiflexion) * 0.2;
        let tight = 15 + ankle.plantarflexion * 0.3 - ankle.dorsiflexion * 0.2;
        let inhib = Math.max(0, ankle.dorsiflexion * 0.2);
        let note = 'Two-joint calf muscle: knee flexor and ankle plantarflexor';
        if (ankle.dorsiflexion > 10) note = 'Stretched by dorsiflexion — may limit squat depth';
        if (ankle.plantarflexion > 15) note = 'Shortened and active in plantarflexion';
        return { lengthPct: clamp(length, 65, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_soleus`, label: `${SL} Soleus`, meshGroup: `calf${s}`, category: `calf${s}`,
      compute: (c) => {
        const ankle = safeJoint(c[ankleKey(side)], { dorsiflexion: 0, plantarflexion: 0 });
        const knee = safeJoint(c[kneeKey(side)], { flexion: 0 });
        let length = 100 + ankle.dorsiflexion * 0.7 - ankle.plantarflexion * 0.5;
        let act = 15 + ankle.plantarflexion * 0.5 + knee.flexion * 0.15;
        let tight = 18 + ankle.plantarflexion * 0.2;
        let inhib = Math.max(0, ankle.dorsiflexion * 0.15);
        let note = 'Deep calf — primary postural plantarflexor';
        if (knee.flexion > 20) note = 'Soleus dominant with knee bent (gastrocnemius slack)';
        return { lengthPct: clamp(length, 70, 135), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_tib_ant`, label: `${SL} Tibialis Anterior`, meshGroup: `shin${s}`, category: `shin${s}`,
      compute: (c) => {
        const ankle = safeJoint(c[ankleKey(side)], { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0 });
        let length = 100 - ankle.dorsiflexion * 0.6 + ankle.plantarflexion * 0.5;
        let act = 10 + ankle.dorsiflexion * 0.8 + Math.abs(ankle.inversion) * 0.3;
        let tight = 12 + ankle.dorsiflexion * 0.2;
        let inhib = Math.max(0, ankle.plantarflexion * 0.3);
        let note = 'Primary ankle dorsiflexor and invertor';
        if (ankle.dorsiflexion > 10) note = 'Active in dorsiflexion — shortened position';
        if (ankle.plantarflexion > 15) note = 'Lengthened by plantarflexion';
        return { lengthPct: clamp(length, 70, 135), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_peroneals`, label: `${SL} Peroneals (Fibularis)`, meshGroup: `shin${s}`, category: `shin${s}`,
      compute: (c) => {
        const ankle = safeJoint(c[ankleKey(side)], { inversion: 0, eversion: 0, dorsiflexion: 0, plantarflexion: 0 });
        let length = 100 + ankle.inversion * 0.7 - ankle.eversion * 0.5;
        let act = 8 + Math.abs(ankle.eversion) * 0.6 + Math.abs(ankle.inversion) * 0.3;
        let tight = 10 + Math.max(0, ankle.eversion) * 0.3;
        let inhib = Math.max(0, ankle.inversion * 0.3);
        let note = 'Lateral ankle stabilizers — evertors';
        if (ankle.inversion > 10) note = 'Stretched by inversion — vulnerable to lateral ankle sprain';
        if (ankle.eversion > 10) note = 'Shortened in eversion; may indicate pronation';
        return { lengthPct: clamp(length, 70, 135), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_tib_post`, label: `${SL} Tibialis Posterior`, meshGroup: `shin${s}`, category: `shin${s}`,
      compute: (c) => {
        const ankle = safeJoint(c[ankleKey(side)], { inversion: 0, eversion: 0, dorsiflexion: 0 });
        let length = 100 + ankle.eversion * 0.6 + ankle.dorsiflexion * 0.4 - ankle.inversion * 0.4;
        let act = 10 + Math.abs(ankle.inversion) * 0.5 + Math.max(0, ankle.dorsiflexion) * 0.2;
        let tight = 12 + Math.max(0, ankle.inversion) * 0.3;
        let inhib = Math.max(0, ankle.eversion * 0.4);
        let note = 'Deep invertor — key arch support muscle';
        if (ankle.eversion > 10) note = 'Lengthened in eversion — may indicate PTTD risk';
        return { lengthPct: clamp(length, 70, 130), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_ant_deltoid`, label: `${SL} Anterior Deltoid`, meshGroup: `deltoid${s}`, category: `deltoid${s}`,
      compute: (c) => {
        const sh = safeJoint(c[shoulderKey(side)], { flexion: 0, extension: 0, abduction: 0, internalRotation: 0, externalRotation: 0, horizontalAdduction: 0 });
        let length = 100 - sh.flexion * 0.4 + sh.extension * 0.5;
        let act = 10 + Math.max(0, sh.flexion) * 0.7 + Math.max(0, sh.horizontalAdduction) * 0.3;
        let tight = 15 + Math.max(0, sh.flexion) * 0.2 + Math.max(0, sh.internalRotation) * 0.15;
        let inhib = 0;
        let note = 'Shoulder flexor and horizontal adductor';
        if (sh.flexion > 40) note = 'Active in shoulder flexion — high demand';
        return { lengthPct: clamp(length, 65, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_mid_deltoid`, label: `${SL} Middle Deltoid`, meshGroup: `deltoid${s}`, category: `deltoid${s}`,
      compute: (c) => {
        const sh = safeJoint(c[shoulderKey(side)], { abduction: 0 });
        let length = 100 - sh.abduction * 0.5;
        let act = 8 + Math.abs(sh.abduction) * 0.8;
        let tight = 12 + Math.max(0, sh.abduction) * 0.2;
        let inhib = 0;
        let note = 'Primary shoulder abductor';
        if (sh.abduction > 30) note = 'Active in abduction — supraspinatus assists';
        if (sh.abduction > 90) note = 'High deltoid demand above 90 degrees';
        return { lengthPct: clamp(length, 65, 130), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_post_deltoid`, label: `${SL} Posterior Deltoid`, meshGroup: `deltoid${s}`, category: `deltoid${s}`,
      compute: (c) => {
        const sh = safeJoint(c[shoulderKey(side)], { flexion: 0, extension: 0, externalRotation: 0, horizontalAdduction: 0 });
        let length = 100 + sh.flexion * 0.3 + sh.horizontalAdduction * 0.4 - sh.extension * 0.4;
        let act = 8 + Math.max(0, sh.extension) * 0.6 + Math.max(0, -sh.horizontalAdduction) * 0.4;
        let tight = 10;
        let inhib = 0;
        let note = 'Shoulder extensor and horizontal abductor';
        if (sh.flexion > 40) note = 'Lengthened by shoulder flexion';
        return { lengthPct: clamp(length, 70, 135), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_supraspinatus`, label: `${SL} Supraspinatus`, meshGroup: `deltoid${s}`, category: `deltoid${s}`,
      compute: (c) => {
        const sh = safeJoint(c[shoulderKey(side)], { abduction: 0, flexion: 0 });
        let length = 100 - sh.abduction * 0.3;
        let act = 15 + Math.min(sh.abduction, 30) * 0.8;
        let tight = 15 + Math.max(0, sh.abduction) * 0.15;
        let inhib = Math.max(0, (sh.abduction - 60) * 0.3);
        let note = 'Rotator cuff — initiates abduction (0-30 degrees)';
        if (sh.abduction > 15 && sh.abduction < 40) note = 'Peak supraspinatus activity in early abduction';
        if (sh.abduction > 60) note = 'Supraspinatus contribution decreases; impingement risk zone';
        return { lengthPct: clamp(length, 75, 125), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_infraspinatus`, label: `${SL} Infraspinatus`, meshGroup: `scapula${s}`, category: `scapula${s}`,
      compute: (c) => {
        const sh = safeJoint(c[shoulderKey(side)], { internalRotation: 0, externalRotation: 0, flexion: 0 });
        let length = 100 + sh.internalRotation * 0.6 - sh.externalRotation * 0.5;
        let act = 12 + Math.abs(sh.externalRotation) * 0.6 + Math.abs(sh.internalRotation) * 0.2;
        let tight = 10 + Math.max(0, sh.externalRotation) * 0.2;
        let inhib = Math.max(0, sh.internalRotation * 0.3);
        let note = 'Rotator cuff — external rotator and GH stabilizer';
        if (sh.internalRotation > 20) note = 'Stretched by internal rotation — eccentrically loaded';
        return { lengthPct: clamp(length, 70, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_upper_trap`, label: `${SL} Upper Trapezius`, meshGroup: `scapula${s}`, category: `scapula${s}`,
      compute: (c) => {
        const scap = safeJoint(c[scapKey(side)], { elevation: 0, protraction: 0, upwardRotation: 0 });
        const neck = safeJoint(c.neck, { lateralFlexion: 0, forwardHead: 0 });
        const spine = safeJoint(c.spine, { forwardHead: 0 });
        const fwdHead = Math.abs(neck.forwardHead || safeNum(spine.forwardHead));
        let length = 100 - scap.elevation * 0.5 + scap.protraction * 0.2;
        let act = 15 + Math.abs(scap.elevation) * 0.6 + fwdHead * 0.5;
        let tight = 20 + scap.elevation * 0.4 + fwdHead * 0.5;
        let inhib = 0;
        let note = 'Scapular elevator — commonly overactive';
        if (fwdHead > 10) note = 'Overactive compensating for forward head posture';
        if (scap.elevation > 5) note = 'Shortened with scapular elevation — tension headache contributor';
        return { lengthPct: clamp(length, 65, 130), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_lower_trap`, label: `${SL} Lower Trapezius`, meshGroup: `scapula${s}`, category: `scapula${s}`,
      compute: (c) => {
        const scap = safeJoint(c[scapKey(side)], { elevation: 0, protraction: 0, upwardRotation: 0, anteriorTilt: 0 });
        const spine = safeJoint(c.spine, { thoracicKyphosis: 0 });
        let length = 100 + scap.protraction * 0.5 + scap.elevation * 0.4 + spine.thoracicKyphosis * 0.3;
        let act = 10 + Math.abs(scap.upwardRotation) * 0.4;
        let tight = 8;
        let inhib = Math.max(0, scap.protraction * 0.4 + spine.thoracicKyphosis * 0.3);
        let note = 'Scapular depressor and retractor — commonly weak/inhibited';
        if (spine.thoracicKyphosis > 15) note = 'Lengthened and inhibited by increased thoracic kyphosis (upper cross syndrome)';
        if (scap.protraction > 10) note = 'Inhibited by scapular protraction — rhomboid weakness pattern';
        return { lengthPct: clamp(length, 70, 145), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_rhomboids`, label: `${SL} Rhomboids`, meshGroup: `scapula${s}`, category: `scapula${s}`,
      compute: (c) => {
        const scap = safeJoint(c[scapKey(side)], { protraction: 0, elevation: 0 });
        const spine = safeJoint(c.spine, { thoracicKyphosis: 0 });
        let length = 100 + scap.protraction * 0.7 + spine.thoracicKyphosis * 0.3;
        let act = 8 + Math.max(0, -scap.protraction) * 0.5;
        let tight = 8 + Math.max(0, -scap.protraction) * 0.3;
        let inhib = Math.max(0, scap.protraction * 0.5 + spine.thoracicKyphosis * 0.2);
        let note = 'Scapular retractors';
        if (scap.protraction > 10) note = 'Lengthened and inhibited by protraction — upper cross pattern';
        return { lengthPct: clamp(length, 70, 145), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_serratus_ant`, label: `${SL} Serratus Anterior`, meshGroup: `scapula${s}`, category: `scapula${s}`,
      compute: (c) => {
        const scap = safeJoint(c[scapKey(side)], { protraction: 0, winging: 0, upwardRotation: 0 });
        const sh = safeJoint(c[shoulderKey(side)], { flexion: 0, abduction: 0 });
        let length = 100 - scap.protraction * 0.4 + scap.winging * 0.6;
        let act = 12 + Math.max(0, sh.flexion) * 0.3 + Math.max(0, scap.protraction) * 0.3;
        let tight = 10;
        let inhib = Math.max(0, scap.winging * 0.8);
        let note = 'Scapular protractor — holds scapula against chest wall';
        if (scap.winging > 5) note = 'Weakness indicated by scapular winging — long thoracic nerve check needed';
        if (sh.flexion > 60) note = 'Active for scapular upward rotation during arm elevation';
        return { lengthPct: clamp(length, 70, 135), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_biceps`, label: `${SL} Biceps Brachii`, meshGroup: `bicep${s}`, category: `bicep${s}`,
      compute: (c) => {
        const elbow = safeJoint(c[elbowKey(side)], { flexion: 0, pronation: 0, supination: 0 });
        const sh = safeJoint(c[shoulderKey(side)], { flexion: 0 });
        let length = 100 - elbow.flexion * 0.5 + elbow.pronation * 0.2;
        let act = 10 + elbow.flexion * 0.7 + Math.abs(elbow.supination) * 0.2;
        let tight = 12 + Math.max(0, elbow.flexion) * 0.2;
        let inhib = 0;
        let note = 'Elbow flexor and forearm supinator';
        if (elbow.flexion > 30) note = 'Active in elbow flexion — shortened position';
        if (elbow.flexion > 90) note = 'High activation in deep elbow flexion';
        return { lengthPct: clamp(length, 60, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_triceps`, label: `${SL} Triceps Brachii`, meshGroup: `bicep${s}`, category: `bicep${s}`,
      compute: (c) => {
        const elbow = safeJoint(c[elbowKey(side)], { flexion: 0 });
        const sh = safeJoint(c[shoulderKey(side)], { flexion: 0, extension: 0 });
        let length = 100 + elbow.flexion * 0.5 - sh.flexion * 0.2;
        let act = 8 + Math.max(0, -elbow.flexion + 10) * 0.4;
        let tight = 10;
        let inhib = Math.max(0, elbow.flexion * 0.2);
        let note = 'Elbow extensor';
        if (elbow.flexion > 30) note = 'Lengthened by elbow flexion — reciprocally inhibited by biceps';
        if (elbow.flexion < 5) note = 'Active in elbow extension';
        return { lengthPct: clamp(length, 65, 145), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_pec_major`, label: `${SL} Pectoralis Major`, meshGroup: 'chest', category: 'chest',
      compute: (c) => {
        const sh = safeJoint(c[shoulderKey(side)], { flexion: 0, internalRotation: 0, externalRotation: 0, horizontalAdduction: 0 });
        const scap = safeJoint(c[scapKey(side)], { protraction: 0 });
        let length = 100 - sh.internalRotation * 0.3 - scap.protraction * 0.3 + sh.externalRotation * 0.4;
        let act = 8 + Math.abs(sh.internalRotation) * 0.3 + Math.max(0, sh.horizontalAdduction) * 0.4;
        let tight = 18 + Math.max(0, sh.internalRotation) * 0.3 + Math.max(0, scap.protraction) * 0.3;
        let inhib = 0;
        let note = 'Major chest muscle — shoulder adductor, flexor, internal rotator';
        if (scap.protraction > 10) note = 'Shortened with protracted shoulders — upper cross syndrome contributor';
        if (sh.externalRotation > 20) note = 'Stretched by external rotation — lengthened position';
        return { lengthPct: clamp(length, 60, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_pec_minor`, label: `${SL} Pectoralis Minor`, meshGroup: 'chest', category: 'chest',
      compute: (c) => {
        const scap = safeJoint(c[scapKey(side)], { protraction: 0, anteriorTilt: 0, elevation: 0 });
        const spine = safeJoint(c.spine, { thoracicKyphosis: 0 });
        let length = 100 - scap.protraction * 0.5 - scap.anteriorTilt * 0.4 + spine.thoracicKyphosis * 0.2;
        let act = 10 + Math.abs(scap.protraction) * 0.3;
        let tight = 22 + Math.max(0, scap.protraction) * 0.4 + Math.max(0, scap.anteriorTilt) * 0.3 + spine.thoracicKyphosis * 0.2;
        let inhib = 0;
        let note = 'Scapular depressor and protractor — commonly tight';
        if (scap.protraction > 5 || spine.thoracicKyphosis > 10) note = 'Tight pec minor pulls scapula into anterior tilt and protraction — shoulder impingement risk';
        return { lengthPct: clamp(length, 55, 130), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_hip_flexors`, label: `${SL} Iliopsoas`, meshGroup: `quad${s}`, category: `quad${s}`,
      compute: (c) => {
        const hip = safeJoint(c[hipKey(side)], { flexion: 0, extension: 0 });
        const pelvis = safeJoint(c.pelvis, { tilt: 0 });
        const spine = safeJoint(c.spine, { lumbarLordosis: 0 });
        let length = 100 - hip.flexion * 0.5 + hip.extension * 0.6 - pelvis.tilt * 0.3;
        let act = 12 + Math.max(0, hip.flexion) * 0.6;
        let tight = 25 + Math.max(0, hip.flexion) * 0.3 + Math.max(0, pelvis.tilt) * 0.4 + Math.max(0, spine.lumbarLordosis) * 0.2;
        let inhib = 0;
        let note = 'Primary hip flexor — attaches to lumbar spine';
        if (hip.flexion > 20) note = 'Shortened in hip flexion — may increase lumbar lordosis';
        if (pelvis.tilt > 10) note = 'Tight iliopsoas contributes to anterior pelvic tilt (lower cross syndrome)';
        if (hip.extension > 10) note = 'Lengthened in hip extension — Thomas test position';
        return { lengthPct: clamp(length, 55, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_adductors`, label: `${SL} Hip Adductors`, meshGroup: `quad${s}`, category: `quad${s}`,
      compute: (c) => {
        const hip = safeJoint(c[hipKey(side)], { abduction: 0, adduction: 0, flexion: 0 });
        let length = 100 + hip.abduction * 0.7 - hip.adduction * 0.5;
        let act = 8 + Math.abs(hip.adduction) * 0.5 + Math.abs(hip.abduction) * 0.2;
        let tight = 12 + Math.max(0, hip.adduction) * 0.3;
        let inhib = Math.max(0, hip.abduction * 0.2);
        let note = 'Hip adductors — groin muscles';
        if (hip.abduction > 20) note = 'Stretched by hip abduction';
        if (hip.adduction > 10) note = 'Active and shortened in adduction';
        return { lengthPct: clamp(length, 65, 145), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_wrist_flex`, label: `${SL} Wrist Flexors`, meshGroup: `bicep${s}`, category: `bicep${s}`,
      compute: (c) => {
        const wrist = safeJoint(c[wristKey(side)], { flexion: 0, extension: 0, ulnarDeviation: 0 });
        const elbow = safeJoint(c[elbowKey(side)], { flexion: 0 });
        let length = 100 - wrist.flexion * 0.6 + wrist.extension * 0.5;
        let act = 8 + Math.abs(wrist.flexion) * 0.5;
        let tight = 10 + Math.max(0, wrist.flexion) * 0.3;
        let inhib = Math.max(0, wrist.extension * 0.2);
        let note = 'Wrist and finger flexors — medial epicondyle origin';
        if (wrist.flexion > 20) note = 'Active in wrist flexion';
        if (wrist.extension > 20) note = 'Lengthened by wrist extension — golfer\'s elbow region';
        return { lengthPct: clamp(length, 65, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_wrist_ext`, label: `${SL} Wrist Extensors`, meshGroup: `bicep${s}`, category: `bicep${s}`,
      compute: (c) => {
        const wrist = safeJoint(c[wristKey(side)], { flexion: 0, extension: 0, radialDeviation: 0 });
        let length = 100 + wrist.flexion * 0.5 - wrist.extension * 0.5;
        let act = 8 + Math.abs(wrist.extension) * 0.5;
        let tight = 10 + Math.max(0, wrist.extension) * 0.3;
        let inhib = Math.max(0, wrist.flexion * 0.2);
        let note = 'Wrist extensors — lateral epicondyle origin';
        if (wrist.extension > 20) note = 'Active in wrist extension';
        if (wrist.flexion > 20) note = 'Lengthened by wrist flexion — tennis elbow region';
        return { lengthPct: clamp(length, 65, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });

    muscles.push({
      id: `${prefix}_plantar_fascia`, label: `${SL} Plantar Intrinsics`, meshGroup: `shin${s}`, category: `shin${s}`,
      compute: (c) => {
        const ankle = safeJoint(c[ankleKey(side)], { dorsiflexion: 0, toeExtension: 0, forefootVarus: 0 });
        let length = 100 + ankle.dorsiflexion * 0.3 + (ankle.toeExtension || 0) * 0.4;
        let act = 10 + Math.abs(ankle.dorsiflexion) * 0.2;
        let tight = 15;
        let inhib = 0;
        let note = 'Foot intrinsic muscles and plantar fascia';
        if (ankle.dorsiflexion > 15) note = 'Windlass mechanism engaged with dorsiflexion';
        return { lengthPct: clamp(length, 75, 130), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
      }
    });
  }

  muscles.push({
    id: 'rectus_abdominis', label: 'Rectus Abdominis', meshGroup: 'core', category: 'core',
    compute: (c) => {
      const pelvis = safeJoint(c.pelvis, { tilt: 0 });
      const spine = safeJoint(c.spine, { lumbarLordosis: 0, thoracicKyphosis: 0, flexion: 0 });
      let length = 100 + pelvis.tilt * 0.4 + spine.lumbarLordosis * 0.3 - (spine.flexion || 0) * 0.5;
      let act = 12 + Math.abs(spine.flexion || 0) * 0.5 + Math.max(0, -pelvis.tilt) * 0.4;
      let tight = 15 + Math.max(0, -(pelvis.tilt)) * 0.3;
      let inhib = Math.max(0, pelvis.tilt * 0.4 + spine.lumbarLordosis * 0.3);
      let note = 'Trunk flexor — anterior core';
      if (pelvis.tilt > 10) note = 'Lengthened and inhibited by anterior pelvic tilt (lower cross syndrome)';
      if (pelvis.tilt < -5) note = 'Shortened with posterior pelvic tilt';
      return { lengthPct: clamp(length, 65, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  muscles.push({
    id: 'transverse_abdominis', label: 'Transverse Abdominis', meshGroup: 'core', category: 'core',
    compute: (c) => {
      const spine = safeJoint(c.spine, { scoliosis: 0, lateralShift: 0, lumbarLordosis: 0 });
      const pelvis = safeJoint(c.pelvis, { obliquity: 0, rotation: 0 });
      let act = 15 + Math.abs(spine.scoliosis) * 0.3 + Math.abs(pelvis.obliquity) * 0.4 + Math.abs(pelvis.rotation) * 0.3;
      let tight = 12;
      let inhib = Math.max(0, (Math.abs(spine.lumbarLordosis) - 10) * 0.3);
      let note = 'Deep core stabilizer — corset muscle';
      if (Math.abs(spine.scoliosis) > 5 || Math.abs(pelvis.obliquity) > 3) note = 'Active to stabilize asymmetric loading';
      return { lengthPct: 100, activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  muscles.push({
    id: 'obliques', label: 'Obliques (Internal/External)', meshGroup: 'core', category: 'core',
    compute: (c) => {
      const spine = safeJoint(c.spine, { scoliosis: 0, lateralShift: 0, thoracicRotation: 0, lumbarRotation: 0 });
      const pelvis = safeJoint(c.pelvis, { rotation: 0, obliquity: 0 });
      let act = 10 + Math.abs(pelvis.rotation) * 0.5 + Math.abs(spine.thoracicRotation) * 0.4 + Math.abs(spine.scoliosis) * 0.3;
      let tight = 12 + Math.abs(pelvis.rotation) * 0.2;
      let length = 100 - Math.abs(pelvis.rotation) * 0.3;
      let inhib = 0;
      let note = 'Trunk rotators and lateral flexors';
      if (Math.abs(pelvis.rotation) > 10) note = 'Asymmetric oblique activity with pelvic rotation';
      if (Math.abs(spine.scoliosis) > 10) note = 'Compensatory activity for scoliosis';
      return { lengthPct: clamp(length, 70, 130), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  muscles.push({
    id: 'erector_spinae_lumbar', label: 'Lumbar Erector Spinae', meshGroup: 'spine', category: 'spine',
    compute: (c) => {
      const spine = safeJoint(c.spine, { lumbarLordosis: 0, scoliosis: 0, flexion: 0, lateralFlexion: 0 });
      const pelvis = safeJoint(c.pelvis, { tilt: 0 });
      let length = 100 - spine.lumbarLordosis * 0.4 - pelvis.tilt * 0.3 + (spine.flexion || 0) * 0.5;
      let act = 15 + Math.abs(spine.lumbarLordosis) * 0.4 + Math.abs(spine.flexion || 0) * 0.3;
      let tight = 20 + Math.max(0, spine.lumbarLordosis) * 0.4 + Math.max(0, pelvis.tilt) * 0.3;
      let inhib = 0;
      let note = 'Lumbar extensors — paraspinal muscles';
      if (spine.lumbarLordosis > 15) note = 'Shortened and overactive with increased lordosis (lower cross syndrome)';
      if (pelvis.tilt > 10) note = 'Tight erector spinae contributing to anterior pelvic tilt';
      return { lengthPct: clamp(length, 60, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  muscles.push({
    id: 'erector_spinae_thoracic', label: 'Thoracic Erector Spinae', meshGroup: 'spine', category: 'spine',
    compute: (c) => {
      const spine = safeJoint(c.spine, { thoracicKyphosis: 0, scoliosis: 0, thoracicRotation: 0 });
      let length = 100 + spine.thoracicKyphosis * 0.4;
      let act = 12 + Math.abs(spine.thoracicKyphosis) * 0.3 + Math.abs(spine.scoliosis) * 0.3;
      let tight = 12 + Math.max(0, -spine.thoracicKyphosis) * 0.2;
      let inhib = Math.max(0, spine.thoracicKyphosis * 0.3);
      let note = 'Thoracic extensors';
      if (spine.thoracicKyphosis > 15) note = 'Lengthened and under strain from increased kyphosis';
      if (Math.abs(spine.scoliosis) > 10) note = 'Asymmetric loading from scoliosis — one side shortened, other lengthened';
      return { lengthPct: clamp(length, 65, 140), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  muscles.push({
    id: 'multifidus', label: 'Multifidus', meshGroup: 'spine', category: 'spine',
    compute: (c) => {
      const spine = safeJoint(c.spine, { lumbarLordosis: 0, scoliosis: 0, lumbarRotation: 0 });
      let act = 18 + Math.abs(spine.lumbarRotation) * 0.4 + Math.abs(spine.scoliosis) * 0.3;
      let tight = 12;
      let inhib = Math.max(0, Math.abs(spine.lumbarLordosis) * 0.2);
      let note = 'Deep segmental spinal stabilizer';
      if (Math.abs(spine.lumbarRotation) > 10) note = 'Active for rotational stability';
      return { lengthPct: 100, activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  muscles.push({
    id: 'scm', label: 'Sternocleidomastoid (SCM)', meshGroup: 'neck', category: 'neck',
    compute: (c) => {
      const neck = safeJoint(c.neck, { flexion: 0, rotation: 0, lateralFlexion: 0, forwardHead: 0 });
      const spine = safeJoint(c.spine, { forwardHead: 0, cervicalRotation: 0 });
      const fwdHead = Math.abs(neck.forwardHead || safeNum(spine.forwardHead));
      let length = 100 - fwdHead * 0.4 - Math.abs(neck.rotation || spine.cervicalRotation) * 0.2;
      let act = 10 + Math.abs(neck.rotation || spine.cervicalRotation) * 0.5 + fwdHead * 0.5;
      let tight = 18 + fwdHead * 0.5 + Math.abs(neck.rotation) * 0.2;
      let inhib = 0;
      let note = 'Neck flexor and rotator — commonly overactive';
      if (fwdHead > 10) note = 'Shortened and overactive with forward head posture (upper cross syndrome)';
      if (Math.abs(neck.rotation) > 20) note = 'Active in cervical rotation';
      return { lengthPct: clamp(length, 60, 130), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  muscles.push({
    id: 'deep_neck_flexors', label: 'Deep Neck Flexors', meshGroup: 'neck', category: 'neck',
    compute: (c) => {
      const neck = safeJoint(c.neck, { flexion: 0, forwardHead: 0 });
      const spine = safeJoint(c.spine, { forwardHead: 0, cervicalLordosis: 0 });
      const fwdHead = Math.abs(neck.forwardHead || safeNum(spine.forwardHead));
      let length = 100 + fwdHead * 0.5 + Math.abs(spine.cervicalLordosis) * 0.3;
      let act = 12 - fwdHead * 0.4;
      let tight = 8;
      let inhib = Math.max(0, fwdHead * 0.7 + Math.abs(spine.cervicalLordosis) * 0.3);
      let note = 'Deep cervical stabilizers — longus colli/capitis';
      if (fwdHead > 10) note = 'Inhibited and lengthened by forward head posture — key rehabilitative target (upper cross syndrome)';
      return { lengthPct: clamp(length, 70, 145), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  muscles.push({
    id: 'suboccipitals', label: 'Suboccipital Muscles', meshGroup: 'neck', category: 'neck',
    compute: (c) => {
      const spine = safeJoint(c.spine, { forwardHead: 0, cervicalLordosis: 0 });
      const neck = safeJoint(c.neck, { forwardHead: 0, extension: 0 });
      const fwdHead = Math.abs(neck.forwardHead || safeNum(spine.forwardHead));
      let length = 100 - fwdHead * 0.5;
      let act = 12 + fwdHead * 0.6;
      let tight = 18 + fwdHead * 0.6;
      let inhib = 0;
      let note = 'Deep upper cervical extensors';
      if (fwdHead > 10) note = 'Shortened and hypertonic compensating for forward head — headache contributor';
      return { lengthPct: clamp(length, 60, 125), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  muscles.push({
    id: 'levator_scapulae', label: 'Levator Scapulae', meshGroup: 'neck', category: 'neck',
    compute: (c) => {
      const neck = safeJoint(c.neck, { lateralFlexion: 0, rotation: 0, forwardHead: 0 });
      const spine = safeJoint(c.spine, { forwardHead: 0 });
      const fwdHead = Math.abs(neck.forwardHead || safeNum(spine.forwardHead));
      let length = 100 - fwdHead * 0.3;
      let act = 10 + fwdHead * 0.4 + Math.abs(neck.lateralFlexion) * 0.3;
      let tight = 20 + fwdHead * 0.4 + Math.abs(neck.lateralFlexion) * 0.2;
      let inhib = 0;
      let note = 'Neck extensor and scapular elevator';
      if (fwdHead > 8) note = 'Shortened and overactive — common trigger point location with forward head posture';
      return { lengthPct: clamp(length, 65, 130), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  muscles.push({
    id: 'scalenes', label: 'Scalenes', meshGroup: 'neck', category: 'neck',
    compute: (c) => {
      const neck = safeJoint(c.neck, { lateralFlexion: 0, flexion: 0, forwardHead: 0 });
      const spine = safeJoint(c.spine, { forwardHead: 0 });
      const fwdHead = Math.abs(neck.forwardHead || safeNum(spine.forwardHead));
      let length = 100 - fwdHead * 0.3 - Math.abs(neck.lateralFlexion) * 0.2;
      let act = 10 + Math.abs(neck.lateralFlexion) * 0.4 + fwdHead * 0.3;
      let tight = 15 + fwdHead * 0.3;
      let inhib = 0;
      let note = 'Lateral neck flexors and accessory breathing muscles';
      if (fwdHead > 10) note = 'Overactive as accessory breathers with forward head — thoracic outlet syndrome contributor';
      return { lengthPct: clamp(length, 65, 130), activation: clamp(act, 0, 100), tightness: clamp(tight, 0, 100), inhibition: clamp(inhib, 0, 100), note };
    }
  });

  return muscles;
}

const MUSCLE_DEFINITIONS = buildMuscles();

let _muscleToGroupCache: Record<string, string> | null = null;

export function getMuscleToGroupMap(): Record<string, string> {
  if (_muscleToGroupCache) return _muscleToGroupCache;
  const map: Record<string, string> = {};
  for (const m of MUSCLE_DEFINITIONS) {
    map[m.id] = m.meshGroup;
  }
  _muscleToGroupCache = map;
  return map;
}

const MUSCLE_GROUP_ORDER: Record<string, { label: string; order: number }> = {
  neck: { label: 'Neck', order: 0 },
  chest: { label: 'Chest', order: 1 },
  spine: { label: 'Spine', order: 2 },
  core: { label: 'Core / Abdominals', order: 3 },
  scapula_l: { label: 'Left Scapular', order: 4 },
  scapula_r: { label: 'Right Scapular', order: 5 },
  deltoid_l: { label: 'Left Shoulder', order: 6 },
  deltoid_r: { label: 'Right Shoulder', order: 7 },
  bicep_l: { label: 'Left Arm', order: 8 },
  bicep_r: { label: 'Right Arm', order: 9 },
  glute_l: { label: 'Left Glute / Hip', order: 10 },
  glute_r: { label: 'Right Glute / Hip', order: 11 },
  quad_l: { label: 'Left Thigh', order: 12 },
  quad_r: { label: 'Right Thigh', order: 13 },
  calf_l: { label: 'Left Calf', order: 14 },
  calf_r: { label: 'Right Calf', order: 15 },
  shin_l: { label: 'Left Shin / Ankle / Foot', order: 16 },
  shin_r: { label: 'Right Shin / Ankle / Foot', order: 17 },
};

function detectCrossSyndromes(muscles: IndividualMuscle[]): CrossSyndromePattern[] {
  const syndromes: CrossSyndromePattern[] = [];
  const byId = new Map(muscles.map(m => [m.id, m]));

  const avgTightness = (...ids: string[]) => {
    const vals = ids.map(id => byId.get(id)?.tightnessPercent ?? 0).filter(v => v > 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const avgInhibition = (...ids: string[]) => {
    const vals = ids.map(id => byId.get(id)?.inhibitionPercent ?? 0).filter(v => v > 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const ucsTight = avgTightness('l_upper_trap', 'r_upper_trap', 'levator_scapulae', 'l_pec_major', 'r_pec_major', 'l_pec_minor', 'r_pec_minor', 'scm', 'suboccipitals');
  const ucsWeak = avgInhibition('l_lower_trap', 'r_lower_trap', 'l_rhomboids', 'r_rhomboids', 'l_serratus_ant', 'r_serratus_ant', 'deep_neck_flexors');
  const ucsSeverity = clamp((ucsTight + ucsWeak) / 2, 0, 100);
  syndromes.push({
    id: 'upper_cross',
    label: 'Upper Cross Syndrome',
    detected: ucsSeverity > 30,
    severity: ucsSeverity,
    tightMuscles: ['Upper Trapezius', 'Levator Scapulae', 'Pectorals', 'SCM', 'Suboccipitals'],
    weakMuscles: ['Lower Trapezius', 'Rhomboids', 'Serratus Anterior', 'Deep Neck Flexors'],
    description: ucsSeverity > 30
      ? `Forward head posture pattern: tight upper traps/pecs crossing with weak lower traps/deep neck flexors. Severity: ${Math.round(ucsSeverity)}%`
      : 'No significant upper cross pattern detected'
  });

  const lcsTight = avgTightness('l_hip_flexors', 'r_hip_flexors', 'erector_spinae_lumbar', 'l_rect_fem', 'r_rect_fem');
  const lcsWeak = avgInhibition('rectus_abdominis', 'l_glut_max', 'r_glut_max', 'l_glut_med', 'r_glut_med');
  const lcsSeverity = clamp((lcsTight + lcsWeak) / 2, 0, 100);
  syndromes.push({
    id: 'lower_cross',
    label: 'Lower Cross Syndrome',
    detected: lcsSeverity > 30,
    severity: lcsSeverity,
    tightMuscles: ['Iliopsoas', 'Rectus Femoris', 'Lumbar Erector Spinae'],
    weakMuscles: ['Gluteus Maximus', 'Gluteus Medius', 'Rectus Abdominis'],
    description: lcsSeverity > 30
      ? `Anterior pelvic tilt pattern: tight hip flexors/lumbar extensors crossing with weak glutes/abdominals. Severity: ${Math.round(lcsSeverity)}%`
      : 'No significant lower cross pattern detected'
  });

  const layerTight = avgTightness('l_hamstrings', 'r_hamstrings', 'erector_spinae_lumbar', 'l_upper_trap', 'r_upper_trap');
  const layerWeak = avgInhibition('l_glut_max', 'r_glut_max', 'erector_spinae_thoracic', 'l_lower_trap', 'r_lower_trap');
  const layerSeverity = clamp((layerTight + layerWeak) / 2, 0, 100);
  syndromes.push({
    id: 'layer_syndrome',
    label: 'Layer Syndrome (Janda)',
    detected: layerSeverity > 35,
    severity: layerSeverity,
    tightMuscles: ['Hamstrings', 'Lumbar Erectors', 'Upper Trapezius'],
    weakMuscles: ['Gluteus Maximus', 'Thoracic Erectors', 'Lower Trapezius'],
    description: layerSeverity > 35
      ? `Alternating layers of tight and weak muscles up the posterior chain. Severity: ${Math.round(layerSeverity)}%`
      : 'No significant layer syndrome pattern detected'
  });

  return syndromes;
}

export function computeFullMuscleAnalysis(modelConfig: any): MuscleAnalysisResult {
  const allMuscles: IndividualMuscle[] = [];

  for (const def of MUSCLE_DEFINITIONS) {
    const result = def.compute(modelConfig);
    const lengthPct = clamp(result.lengthPct, 50, 150);
    const activation = clamp(result.activation, 0, 100);
    const tightness = clamp(result.tightness, 0, 100);
    const inhibition = clamp(result.inhibition, 0, 100);

    allMuscles.push({
      id: def.id,
      label: def.label,
      meshGroup: def.meshGroup,
      lengthPercent: lengthPct,
      activationPercent: activation,
      tightnessPercent: tightness,
      inhibitionPercent: inhibition,
      tone: getTone(tightness, activation),
      fatigueRisk: getFatigueRisk(activation, tightness),
      clinicalStatus: getClinicalStatus(lengthPct, activation, tightness, inhibition),
      clinicalNote: result.note,
      state: getLengthState(lengthPct),
    });
  }

  const syndromes = detectCrossSyndromes(allMuscles);

  const grouped: Record<string, IndividualMuscle[]> = {};
  for (const m of allMuscles) {
    if (!grouped[m.meshGroup]) grouped[m.meshGroup] = [];
    grouped[m.meshGroup].push(m);
  }

  const groups: MuscleGroupAnalysis[] = Object.entries(grouped)
    .sort((a, b) => (MUSCLE_GROUP_ORDER[a[0]]?.order ?? 99) - (MUSCLE_GROUP_ORDER[b[0]]?.order ?? 99))
    .map(([gId, gMuscles]) => {
      const avgAct = gMuscles.reduce((s, m) => s + m.activationPercent, 0) / gMuscles.length;
      const avgTight = gMuscles.reduce((s, m) => s + m.tightnessPercent, 0) / gMuscles.length;
      const avgInhib = gMuscles.reduce((s, m) => s + m.inhibitionPercent, 0) / gMuscles.length;
      const statuses = gMuscles.map(m => m.clinicalStatus);
      const dominantStatus = statuses.includes('spasm') ? 'spasm' as ClinicalStatus
        : statuses.includes('overactive') ? 'overactive' as ClinicalStatus
        : statuses.includes('inhibited') ? 'inhibited' as ClinicalStatus
        : statuses.includes('shortened') ? 'shortened' as ClinicalStatus
        : statuses.includes('lengthened') ? 'lengthened' as ClinicalStatus
        : statuses.includes('weak') ? 'weak' as ClinicalStatus
        : 'normal' as ClinicalStatus;
      return {
        id: gId,
        label: MUSCLE_GROUP_ORDER[gId]?.label ?? gId,
        meshGroup: gId,
        muscles: gMuscles,
        avgActivation: avgAct,
        avgTightness: avgTight,
        avgInhibition: avgInhib,
        dominantStatus,
      };
    });

  const groupStates = computeGroupStatesFromAnalysis(allMuscles);

  return { groups, allMuscles, syndromes, groupStates };
}

function computeGroupStatesFromAnalysis(muscles: IndividualMuscle[]): MuscleStatesMap {
  const grouped: Record<string, IndividualMuscle[]> = {};
  for (const m of muscles) {
    if (!grouped[m.meshGroup]) grouped[m.meshGroup] = [];
    grouped[m.meshGroup].push(m);
  }

  const results: MuscleStatesMap = {};
  for (const [gId, gMuscles] of Object.entries(grouped)) {
    const avgTight = gMuscles.reduce((s, m) => s + m.tightnessPercent, 0) / gMuscles.length;
    const avgAct = gMuscles.reduce((s, m) => s + m.activationPercent, 0) / gMuscles.length;
    const avgLength = gMuscles.reduce((s, m) => s + m.lengthPercent, 0) / gMuscles.length;
    const avgTension = 50 + (avgTight - 15) * 0.8 + (100 - avgLength) * 0.5 + (avgAct - 15) * 0.4;

    let state: MuscleState = 'neutral';
    if (avgLength < 90) state = 'shortened';
    else if (avgLength > 110) state = 'lengthened';

    const label = MUSCLE_GROUP_ORDER[gId]?.label ?? gId;
    const desc = gMuscles.filter(m => m.clinicalNote !== 'neutral resting position').map(m => m.clinicalNote).slice(0, 2).join('; ') || 'neutral resting position';

    results[gId] = {
      id: gId,
      label,
      state,
      tension: clamp(avgTension, 5, 95),
      activation: avgAct >= 70 ? 'high' : avgAct >= 40 ? 'moderate' : avgAct >= 15 ? 'low' : 'inactive',
      activationPercent: avgAct,
      description: desc,
    };
  }

  return results;
}

export function computeAllMuscleStates(modelConfig: any): MuscleStatesMap {
  const analysis = computeFullMuscleAnalysis(modelConfig);
  return analysis.groupStates;
}

export type PathologyType = 'strain' | 'spasm' | 'trigger_point' | 'weakness' | 'fibrosis' | 'inflammation' | 'tendinopathy' | 'none';
export type LengthOverride = 'shortened' | 'neutral' | 'lengthened' | 'none';

export interface MuscleOverride {
  tensionOffset: number;
  activationOffset: number;
  lengthOverride: LengthOverride;
  inhibition: number;
  pathology: PathologyType;
  isManual: boolean;
}

export const PATHOLOGY_EFFECTS: Record<PathologyType, { tensionMod: number; activationMod: number }> = {
  strain: { tensionMod: 15, activationMod: -20 },
  spasm: { tensionMod: 30, activationMod: 25 },
  trigger_point: { tensionMod: 20, activationMod: 10 },
  weakness: { tensionMod: -15, activationMod: -30 },
  fibrosis: { tensionMod: 25, activationMod: -10 },
  inflammation: { tensionMod: 10, activationMod: -15 },
  tendinopathy: { tensionMod: 5, activationMod: -25 },
  none: { tensionMod: 0, activationMod: 0 },
};

export const PATHOLOGY_LABELS: Record<PathologyType, string> = {
  strain: 'Muscle Strain',
  spasm: 'Muscle Spasm',
  trigger_point: 'Trigger Point',
  weakness: 'Muscle Weakness',
  fibrosis: 'Fibrosis/Adhesion',
  inflammation: 'Inflammation',
  tendinopathy: 'Tendinopathy',
  none: 'None',
};

export function applyOverridesAndChains(
  baseStates: MuscleStatesMap,
  overrides: { [muscleId: string]: MuscleOverride },
  chainEffects: { [muscleId: string]: { totalChainTension: number; totalChainActivation: number } }
): MuscleStatesMap {
  const results: MuscleStatesMap = {};

  for (const [id, base] of Object.entries(baseStates)) {
    const override = overrides[id];
    const chain = chainEffects[id];

    let newTension = base.tension;
    let newActivation = base.activationPercent;
    let forcedState: MuscleState | null = null;

    if (override?.isManual) {
      newTension += override.tensionOffset;
      newActivation += override.activationOffset;

      if (override.lengthOverride !== 'none') {
        forcedState = override.lengthOverride as MuscleState;
        if (override.lengthOverride === 'shortened') {
          newTension = Math.max(newTension, 70);
        } else if (override.lengthOverride === 'lengthened') {
          newTension = Math.min(newTension, 30);
        } else {
          newTension = 50 + override.tensionOffset;
        }
      }

      if (override.inhibition > 0) {
        const inhibFactor = 1 - (override.inhibition / 100);
        newActivation *= inhibFactor;
      }

      if (override.pathology !== 'none') {
        const pathEffects = PATHOLOGY_EFFECTS[override.pathology];
        if (pathEffects) {
          newTension += pathEffects.tensionMod;
          newActivation += pathEffects.activationMod;
        }
      }
    }

    if (chain) {
      newTension += chain.totalChainTension;
      newActivation += chain.totalChainActivation;
    }

    newTension = Math.max(5, Math.min(95, newTension));
    newActivation = Math.max(0, Math.min(100, newActivation));

    const chainDescs: string[] = [];
    if (override?.isManual && override.tensionOffset !== 0) {
      chainDescs.push(`manual override (${override.tensionOffset > 0 ? '+' : ''}${Math.round(override.tensionOffset)}% tension)`);
    }
    if (override?.isManual && override.lengthOverride !== 'none') {
      chainDescs.push(`length set to ${override.lengthOverride}`);
    }
    if (override?.isManual && override.inhibition > 0) {
      chainDescs.push(`${Math.round(override.inhibition)}% inhibited`);
    }
    if (override?.isManual && override.pathology !== 'none') {
      const label = PATHOLOGY_LABELS[override.pathology] || override.pathology;
      chainDescs.push(`pathology: ${label}`);
    }
    if (chain && Math.abs(chain.totalChainTension) > 1) {
      chainDescs.push(`chain propagation (${chain.totalChainTension > 0 ? '+' : ''}${Math.round(chain.totalChainTension)}% tension)`);
    }

    const desc = chainDescs.length > 0
      ? (base.description !== 'neutral resting position' ? base.description + '; ' : '') + chainDescs.join('; ')
      : base.description;

    results[id] = {
      id,
      label: base.label,
      state: forcedState || (newTension > 60 ? 'shortened' : newTension < 40 ? 'lengthened' : 'neutral'),
      tension: newTension,
      activation: newActivation >= 70 ? 'high' : newActivation >= 40 ? 'moderate' : newActivation >= 15 ? 'low' : 'inactive',
      activationPercent: newActivation,
      description: desc,
    };
  }

  return results;
}

export interface CrossMuscleEffects {
  reciprocalInhibitions?: Record<string, number>;
  chainPropagation?: Record<string, { totalChainTension: number; totalChainActivation: number }>;
}

export function applyOverridesToAnalysis(
  baseAnalysis: MuscleAnalysisResult,
  overrides: Record<string, MuscleOverride>,
  crossEffects?: CrossMuscleEffects
): MuscleAnalysisResult {
  const hasOverrides = Object.keys(overrides).some(k => overrides[k]?.isManual);
  const hasRI = crossEffects?.reciprocalInhibitions && Object.keys(crossEffects.reciprocalInhibitions).length > 0;
  const hasChain = crossEffects?.chainPropagation && Object.keys(crossEffects.chainPropagation).length > 0;
  if (!hasOverrides && !hasRI && !hasChain) return baseAnalysis;

  const updatedMuscles = baseAnalysis.allMuscles.map(m => {
    const override = overrides[m.id];
    const riAmount = crossEffects?.reciprocalInhibitions?.[m.meshGroup] ?? 0;
    const chainEffect = crossEffects?.chainPropagation?.[m.meshGroup];

    const hasManualOverride = override?.isManual;
    const hasRIEffect = riAmount > 2;
    const hasChainEffect = chainEffect && (Math.abs(chainEffect.totalChainTension) > 1 || Math.abs(chainEffect.totalChainActivation) > 1);

    if (!hasManualOverride && !hasRIEffect && !hasChainEffect) return m;

    let lengthPct = m.lengthPercent;
    let activation = m.activationPercent;
    let tightness = m.tightnessPercent;
    let inhibition = m.inhibitionPercent;
    const sources: InfluenceSource[] = [];

    if (hasManualOverride) {
      sources.push('manual');
      if (override.lengthOverride === 'shortened') {
        lengthPct = clamp(70 + override.tensionOffset * 0.2, 50, 89);
        tightness = Math.max(tightness, 65);
      } else if (override.lengthOverride === 'lengthened') {
        lengthPct = clamp(120 + override.tensionOffset * 0.2, 111, 150);
        tightness = Math.max(tightness - 20, 0);
      } else if (override.lengthOverride === 'neutral') {
        lengthPct = clamp(100 + override.tensionOffset * 0.2, 90, 110);
      }

      activation = clamp(activation + override.activationOffset, 0, 100);

      if (override.inhibition > 0) {
        inhibition = clamp(override.inhibition, 0, 100);
        activation *= (1 - override.inhibition / 100);
        activation = Math.max(0, activation);
      }

      if (override.pathology !== 'none') {
        const eff = PATHOLOGY_EFFECTS[override.pathology];
        if (eff) {
          tightness = clamp(tightness + eff.tensionMod, 0, 100);
          activation = clamp(activation + eff.activationMod, 0, 100);
        }
      }
    }

    let riDelta = 0;
    if (hasRIEffect) {
      sources.push('reciprocal_inhibition');
      riDelta = riAmount;
      inhibition = clamp(inhibition + riAmount, 0, 100);
      activation *= (1 - riAmount / 200);
      activation = Math.max(0, activation);
    }

    let chainTDelta = 0;
    let chainADelta = 0;
    if (hasChainEffect && chainEffect) {
      sources.push('fascial_chain');
      chainTDelta = chainEffect.totalChainTension;
      chainADelta = chainEffect.totalChainActivation;
      tightness = clamp(tightness + chainTDelta * 0.6, 0, 100);
      activation = clamp(activation + chainADelta * 0.4, 0, 100);
    }

    const tone = getTone(tightness, activation);
    const clinicalStatus = getClinicalStatus(lengthPct, activation, tightness, inhibition);
    const state = getLengthState(lengthPct);
    const fatigueRisk = getFatigueRisk(activation, tightness);

    const notes: string[] = [];
    if (hasManualOverride) {
      if (override.lengthOverride !== 'none') notes.push(`Length: ${override.lengthOverride}`);
      if (override.activationOffset !== 0) notes.push(`Activation ${override.activationOffset > 0 ? '+' : ''}${override.activationOffset}%`);
      if (override.inhibition > 0) notes.push(`${override.inhibition}% inhibited`);
      if (override.pathology !== 'none') notes.push(PATHOLOGY_LABELS[override.pathology]);
    }
    if (hasRIEffect) notes.push(`RI: +${Math.round(riAmount)}% inhibition`);
    if (hasChainEffect && chainEffect) notes.push(`Chain: ${chainTDelta > 0 ? '+' : ''}${Math.round(chainTDelta)}% tension`);
    const clinicalNote = notes.length > 0 ? notes.join(', ') : m.clinicalNote;

    return {
      ...m,
      lengthPercent: lengthPct,
      activationPercent: activation,
      tightnessPercent: tightness,
      inhibitionPercent: inhibition,
      tone,
      fatigueRisk,
      clinicalStatus,
      clinicalNote,
      state,
      influenceSources: sources.length > 0 ? sources : undefined,
      riInhibitionDelta: riDelta > 0 ? riDelta : undefined,
      chainTensionDelta: Math.abs(chainTDelta) > 0.5 ? chainTDelta : undefined,
      chainActivationDelta: Math.abs(chainADelta) > 0.5 ? chainADelta : undefined,
    };
  });

  const grouped: Record<string, IndividualMuscle[]> = {};
  for (const m of updatedMuscles) {
    if (!grouped[m.meshGroup]) grouped[m.meshGroup] = [];
    grouped[m.meshGroup].push(m);
  }

  const groups = baseAnalysis.groups.map(g => {
    const gMuscles = grouped[g.id] || g.muscles;
    const avgAct = gMuscles.reduce((s, m) => s + m.activationPercent, 0) / gMuscles.length;
    const avgTight = gMuscles.reduce((s, m) => s + m.tightnessPercent, 0) / gMuscles.length;
    const avgInhib = gMuscles.reduce((s, m) => s + m.inhibitionPercent, 0) / gMuscles.length;
    const statuses = gMuscles.map(m => m.clinicalStatus);
    const dominantStatus: ClinicalStatus = statuses.includes('spasm') ? 'spasm'
      : statuses.includes('overactive') ? 'overactive'
      : statuses.includes('inhibited') ? 'inhibited'
      : statuses.includes('shortened') ? 'shortened'
      : statuses.includes('lengthened') ? 'lengthened'
      : statuses.includes('weak') ? 'weak'
      : 'normal';
    return { ...g, muscles: gMuscles, avgActivation: avgAct, avgTightness: avgTight, avgInhibition: avgInhib, dominantStatus };
  });

  return { ...baseAnalysis, groups, allMuscles: updatedMuscles };
}

export function getMuscleColor(status: MuscleStatus): { r: number; g: number; b: number } {
  const t = status.tension / 100;
  const a = status.activationPercent / 100;
  const blend = Math.max(t, a);

  if (status.state === 'shortened') {
    return {
      r: 0.3 + blend * 0.7,
      g: 0.15 + (1 - blend) * 0.2,
      b: 0.1
    };
  }

  if (status.state === 'lengthened') {
    return {
      r: 0.1 + blend * 0.15,
      g: 0.2 + (1 - blend) * 0.3,
      b: 0.4 + blend * 0.5
    };
  }

  return {
    r: 0.2 + blend * 0.15,
    g: 0.5 + (1 - blend) * 0.3,
    b: 0.2 + blend * 0.1
  };
}

export function getMuscleHexColor(status: MuscleStatus): string {
  const c = getMuscleColor(status);
  const toHex = (v: number) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

export function getStateEmoji(state: MuscleState): string {
  switch (state) {
    case 'shortened': return '🔴';
    case 'lengthened': return '🔵';
    case 'neutral': return '🟢';
  }
}

export function getActivationEmoji(level: ActivationLevel): string {
  switch (level) {
    case 'high': return '⚡';
    case 'moderate': return '🔶';
    case 'low': return '◽';
    case 'inactive': return '⬜';
  }
}

export function getClinicalStatusColor(status: ClinicalStatus): string {
  switch (status) {
    case 'normal': return '#22c55e';
    case 'shortened': return '#f97316';
    case 'lengthened': return '#3b82f6';
    case 'overactive': return '#ef4444';
    case 'inhibited': return '#8b5cf6';
    case 'spasm': return '#dc2626';
    case 'weak': return '#a855f7';
  }
}

export function getClinicalStatusLabel(status: ClinicalStatus): string {
  switch (status) {
    case 'normal': return 'Normal';
    case 'shortened': return 'Shortened';
    case 'lengthened': return 'Lengthened';
    case 'overactive': return 'Overactive';
    case 'inhibited': return 'Inhibited';
    case 'spasm': return 'Spasm';
    case 'weak': return 'Weak';
  }
}

export function getToneLabel(tone: ToneLevel): string {
  switch (tone) {
    case 'hypotonic': return 'Hypotonic';
    case 'normal': return 'Normal';
    case 'hypertonic': return 'Hypertonic';
  }
}

export interface ExerciseRecommendation {
  type: 'stretch' | 'strengthen' | 'activate' | 'release';
  name: string;
  description: string;
  duration: string;
  priority: 'high' | 'medium' | 'low';
}

const EXERCISE_DATABASE: Record<string, Record<string, ExerciseRecommendation[]>> = {
  glut_max: {
    inhibited: [
      { type: 'activate', name: 'Clamshell', description: 'Side-lying hip external rotation with knees bent to activate gluteus maximus', duration: '3x15 reps', priority: 'high' },
      { type: 'activate', name: 'Glute Bridge', description: 'Supine bridge focusing on glute contraction at top of movement', duration: '3x12 reps', priority: 'high' },
      { type: 'strengthen', name: 'Single Leg Deadlift', description: 'Unilateral hip hinge emphasizing glute max activation and hip stability', duration: '3x10 each side', priority: 'medium' },
    ],
    weak: [
      { type: 'activate', name: 'Glute Bridge', description: 'Supine bridge focusing on glute contraction at top of movement', duration: '3x12 reps', priority: 'high' },
      { type: 'activate', name: 'Side-lying Hip Abduction', description: 'Side-lying leg raise targeting gluteal activation', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Single Leg Deadlift', description: 'Unilateral hip hinge emphasizing glute max activation and hip stability', duration: '3x10 each side', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Pigeon Stretch', description: 'Deep hip external rotation stretch targeting gluteus maximus and piriformis', duration: '30-60s each side', priority: 'high' },
      { type: 'stretch', name: 'Figure-4 Stretch', description: 'Supine figure-4 position stretching the posterior hip', duration: '30-45s each side', priority: 'medium' },
      { type: 'stretch', name: 'Supine Hip Flexion', description: 'Pulling knee to chest to lengthen gluteus maximus', duration: '30s each side', priority: 'medium' },
    ],
    overactive: [
      { type: 'release', name: 'Foam Roll Glutes', description: 'Self-myofascial release of gluteal muscles using foam roller', duration: '60-90s each side', priority: 'high' },
      { type: 'release', name: 'Tennis Ball Release', description: 'Targeted trigger point release using tennis ball on glute max', duration: '30-60s per spot', priority: 'high' },
      { type: 'strengthen', name: 'Supported Squat', description: 'Assisted squat to promote balanced muscle recruitment', duration: '3x10 reps', priority: 'medium' },
    ],
  },
  glut_med: {
    inhibited: [
      { type: 'activate', name: 'Clamshell', description: 'Side-lying hip external rotation targeting gluteus medius activation', duration: '3x15 reps', priority: 'high' },
      { type: 'activate', name: 'Side-lying Hip Abduction', description: 'Side-lying leg raise targeting gluteus medius', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Single Leg Deadlift', description: 'Unilateral balance exercise challenging hip abductor stability', duration: '3x10 each side', priority: 'medium' },
    ],
    weak: [
      { type: 'activate', name: 'Clamshell', description: 'Side-lying hip external rotation targeting gluteus medius activation', duration: '3x15 reps', priority: 'high' },
      { type: 'activate', name: 'Side-lying Hip Abduction', description: 'Side-lying leg raise targeting gluteus medius', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Glute Bridge', description: 'Bridge with focus on pelvic stability from gluteus medius', duration: '3x12 reps', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Pigeon Stretch', description: 'Deep hip stretch targeting gluteal complex', duration: '30-60s each side', priority: 'high' },
      { type: 'stretch', name: 'Figure-4 Stretch', description: 'Supine figure-4 position to stretch hip abductors', duration: '30-45s each side', priority: 'medium' },
    ],
    overactive: [
      { type: 'release', name: 'Foam Roll Glutes', description: 'Self-myofascial release of gluteal muscles', duration: '60-90s each side', priority: 'high' },
      { type: 'release', name: 'Tennis Ball Release', description: 'Targeted release of gluteus medius trigger points', duration: '30-60s per spot', priority: 'high' },
    ],
  },
  glut_min: {
    inhibited: [
      { type: 'activate', name: 'Clamshell', description: 'Side-lying exercise to activate deep hip abductors', duration: '3x15 reps', priority: 'high' },
      { type: 'activate', name: 'Side-lying Hip Abduction', description: 'Targeted activation of gluteus minimus', duration: '3x15 reps', priority: 'high' },
    ],
    weak: [
      { type: 'activate', name: 'Side-lying Hip Abduction', description: 'Targeted strengthening of deep hip abductor', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Glute Bridge', description: 'Bridge variation focusing on hip stability', duration: '3x12 reps', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Pigeon Stretch', description: 'Deep hip stretch targeting gluteus minimus', duration: '30-60s each side', priority: 'high' },
      { type: 'stretch', name: 'Supine Hip Flexion', description: 'Knee-to-chest stretch for deep gluteals', duration: '30s each side', priority: 'medium' },
    ],
    overactive: [
      { type: 'release', name: 'Foam Roll Glutes', description: 'Foam rolling lateral hip to release gluteus minimus', duration: '60-90s each side', priority: 'high' },
      { type: 'release', name: 'Tennis Ball Release', description: 'Deep pressure release on lateral hip', duration: '30-60s per spot', priority: 'medium' },
    ],
  },
  rect_fem: {
    shortened: [
      { type: 'stretch', name: 'Standing Quad Stretch', description: 'Standing single-leg quad stretch pulling heel to buttock', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Couch Stretch', description: 'Deep rectus femoris stretch with rear foot elevated against wall', duration: '60-90s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll Quads', description: 'Self-myofascial release of quadriceps using foam roller', duration: '60-90s each side', priority: 'medium' },
    ],
    overactive: [
      { type: 'stretch', name: 'Standing Quad Stretch', description: 'Standing quad stretch to reduce overactivity', duration: '30-45s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll Quads', description: 'Foam rolling anterior thigh to decrease tone', duration: '60-90s each side', priority: 'high' },
      { type: 'stretch', name: 'Couch Stretch', description: 'Deep hip flexor and quad stretch', duration: '60-90s each side', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Terminal Knee Extension', description: 'Short-range knee extension to activate quadriceps', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Wall Sit', description: 'Isometric wall sit to build quad endurance', duration: '3x30s holds', priority: 'medium' },
      { type: 'strengthen', name: 'Step-ups', description: 'Step-up exercise for functional quad strengthening', duration: '3x10 each side', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Terminal Knee Extension', description: 'Short-range extension to re-activate inhibited quads', duration: '3x15 reps', priority: 'high' },
      { type: 'activate', name: 'Wall Sit', description: 'Isometric hold to re-establish neuromuscular connection', duration: '3x20s holds', priority: 'high' },
    ],
    lengthened: [
      { type: 'strengthen', name: 'Isometric Quad Sets', description: 'Isometric quadriceps contraction in shortened position', duration: '3x10 with 5s holds', priority: 'high' },
      { type: 'strengthen', name: 'Short Arc Quad', description: 'Small range knee extension from bolster to strengthen in inner range', duration: '3x15 reps', priority: 'high' },
    ],
  },
  vast_lat: {
    shortened: [
      { type: 'stretch', name: 'Standing Quad Stretch', description: 'Standing quad stretch targeting vastus lateralis', duration: '30-45s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll Quads', description: 'Foam rolling lateral quadriceps', duration: '60-90s each side', priority: 'high' },
    ],
    overactive: [
      { type: 'release', name: 'Foam Roll Quads', description: 'Foam rolling lateral thigh to reduce VL dominance', duration: '60-90s each side', priority: 'high' },
      { type: 'stretch', name: 'Couch Stretch', description: 'Deep quad stretch to reduce overactivity', duration: '60-90s each side', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Terminal Knee Extension', description: 'Targeted knee extension for vastus lateralis', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Step-ups', description: 'Functional strengthening for lateral quad', duration: '3x10 each side', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Terminal Knee Extension', description: 'Short-range extension to re-activate quads', duration: '3x15 reps', priority: 'high' },
      { type: 'activate', name: 'Wall Sit', description: 'Isometric quad activation', duration: '3x20s holds', priority: 'medium' },
    ],
    lengthened: [
      { type: 'strengthen', name: 'Isometric Quad Sets', description: 'Isometric contraction to shorten lengthened vastus lateralis', duration: '3x10 with 5s holds', priority: 'high' },
      { type: 'strengthen', name: 'Short Arc Quad', description: 'Inner range knee extension', duration: '3x15 reps', priority: 'high' },
    ],
  },
  vast_med: {
    shortened: [
      { type: 'stretch', name: 'Standing Quad Stretch', description: 'Standing quad stretch targeting VMO', duration: '30-45s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll Quads', description: 'Foam rolling medial quadriceps', duration: '60-90s each side', priority: 'medium' },
    ],
    overactive: [
      { type: 'release', name: 'Foam Roll Quads', description: 'Self-myofascial release of medial quad', duration: '60-90s each side', priority: 'high' },
      { type: 'stretch', name: 'Standing Quad Stretch', description: 'Quad stretch to reduce VMO overactivity', duration: '30-45s each side', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Terminal Knee Extension', description: 'Last 30 degrees of extension to target VMO', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Wall Sit', description: 'Isometric wall sit for VMO strengthening', duration: '3x30s holds', priority: 'medium' },
      { type: 'strengthen', name: 'Step-ups', description: 'Step-up with focus on knee tracking for VMO', duration: '3x10 each side', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Terminal Knee Extension', description: 'VMO activation in terminal extension', duration: '3x15 reps', priority: 'high' },
      { type: 'activate', name: 'Wall Sit', description: 'Isometric VMO activation', duration: '3x20s holds', priority: 'high' },
    ],
    lengthened: [
      { type: 'strengthen', name: 'Isometric Quad Sets', description: 'Isometric VMO contraction in shortened position', duration: '3x10 with 5s holds', priority: 'high' },
      { type: 'strengthen', name: 'Short Arc Quad', description: 'Small arc extension for VMO inner range strengthening', duration: '3x15 reps', priority: 'high' },
    ],
  },
  hamstrings: {
    shortened: [
      { type: 'stretch', name: 'Supine Hamstring Stretch', description: 'Supine straight leg raise with strap for hamstring lengthening', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Nordic Curl Eccentric', description: 'Slow eccentric Nordic curl to lengthen hamstrings under load', duration: '3x6 reps', priority: 'high' },
      { type: 'stretch', name: 'Sciatic Nerve Slider', description: 'Neural mobilization technique to differentiate nerve from muscle tightness', duration: '10-15 reps each side', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Romanian Deadlift', description: 'Hip hinge pattern emphasizing eccentric hamstring loading', duration: '3x10 reps', priority: 'high' },
      { type: 'strengthen', name: 'Prone Hamstring Curl', description: 'Isolated prone knee flexion for hamstring strengthening', duration: '3x12 reps', priority: 'high' },
      { type: 'strengthen', name: 'Swiss Ball Curl', description: 'Supine hip bridge with ball curl for hamstring co-contraction', duration: '3x10 reps', priority: 'medium' },
    ],
    overactive: [
      { type: 'release', name: 'Foam Roll Hamstrings', description: 'Self-myofascial release of posterior thigh', duration: '60-90s each side', priority: 'high' },
      { type: 'stretch', name: 'Active Stretch in Doorway', description: 'Active hamstring stretch using doorway for support', duration: '30-45s each side', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Prone Hamstring Curl', description: 'Light prone curl to re-activate inhibited hamstrings', duration: '3x15 reps', priority: 'high' },
      { type: 'activate', name: 'Swiss Ball Curl', description: 'Ball curl for neuromuscular re-activation', duration: '3x10 reps', priority: 'medium' },
    ],
  },
  iliopsoas: {
    shortened: [
      { type: 'stretch', name: 'Half-kneeling Hip Flexor Stretch', description: 'Lunge position stretch targeting iliopsoas with posterior pelvic tilt', duration: '30-60s each side', priority: 'high' },
      { type: 'stretch', name: 'Thomas Stretch Position', description: 'Edge of table hip flexor stretch for iliopsoas lengthening', duration: '30-45s each side', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'Half-kneeling Hip Flexor Stretch', description: 'Deep hip flexor stretch to reduce overactivity', duration: '30-60s each side', priority: 'high' },
      { type: 'stretch', name: 'Thomas Stretch Position', description: 'Sustained stretch to down-regulate hip flexor tone', duration: '30-45s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll TFL', description: 'Self-myofascial release of tensor fasciae latae and lateral hip', duration: '60s each side', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Standing Hip Flexion', description: 'Standing march with resistance for hip flexor strengthening', duration: '3x12 each side', priority: 'high' },
      { type: 'strengthen', name: 'Supine Marching', description: 'Supine alternating hip flexion maintaining neutral spine', duration: '3x10 each side', priority: 'high' },
      { type: 'strengthen', name: 'Psoas March', description: 'Seated or standing psoas activation with controlled flexion', duration: '3x10 each side', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Supine Marching', description: 'Gentle supine hip flexion to re-activate iliopsoas', duration: '3x10 each side', priority: 'high' },
      { type: 'activate', name: 'Psoas March', description: 'Controlled hip flexion activation drill', duration: '3x10 each side', priority: 'high' },
    ],
  },
  TFL: {
    shortened: [
      { type: 'stretch', name: 'Half-kneeling Hip Flexor Stretch', description: 'Lunge stretch with lateral lean to target TFL', duration: '30-60s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll TFL', description: 'Self-myofascial release of TFL and IT band', duration: '60-90s each side', priority: 'high' },
      { type: 'stretch', name: 'Thomas Stretch Position', description: 'Table edge stretch with abduction bias for TFL', duration: '30-45s each side', priority: 'medium' },
    ],
    overactive: [
      { type: 'release', name: 'Foam Roll TFL', description: 'Foam rolling anterior-lateral hip to reduce TFL overactivity', duration: '60-90s each side', priority: 'high' },
      { type: 'stretch', name: 'Half-kneeling Hip Flexor Stretch', description: 'Hip flexor stretch to decrease TFL tone', duration: '30-60s each side', priority: 'high' },
    ],
    weak: [
      { type: 'strengthen', name: 'Standing Hip Flexion', description: 'Standing hip flexion with internal rotation bias for TFL', duration: '3x12 each side', priority: 'high' },
      { type: 'strengthen', name: 'Supine Marching', description: 'Supine hip flexion for TFL activation', duration: '3x10 each side', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Standing Hip Flexion', description: 'Standing march to re-activate TFL', duration: '3x10 each side', priority: 'high' },
    ],
  },
  gastroc: {
    shortened: [
      { type: 'stretch', name: 'Wall Calf Stretch (Straight Knee)', description: 'Wall stretch with knee straight to target gastrocnemius specifically', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Eccentric Heel Drops', description: 'Slow eccentric calf lowering off step for gastrocnemius lengthening', duration: '3x15 reps', priority: 'high' },
    ],
    weak: [
      { type: 'strengthen', name: 'Heel Raises', description: 'Standing bilateral calf raises with straight knees for gastrocnemius', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Single Leg Calf Raise', description: 'Unilateral calf raise for gastrocnemius strength and endurance', duration: '3x12 each side', priority: 'high' },
    ],
    overactive: [
      { type: 'release', name: 'Foam Roll Calves', description: 'Self-myofascial release of gastrocnemius', duration: '60-90s each side', priority: 'high' },
      { type: 'stretch', name: 'Wall Calf Stretch (Straight Knee)', description: 'Sustained stretch to reduce gastrocnemius overactivity', duration: '30-45s each side', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Heel Raises', description: 'Gentle calf raises to re-activate gastrocnemius', duration: '3x15 reps', priority: 'high' },
    ],
  },
  soleus: {
    shortened: [
      { type: 'stretch', name: 'Wall Calf Stretch (Bent Knee)', description: 'Wall stretch with knee bent to isolate soleus', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Eccentric Heel Drops', description: 'Slow eccentric heel drops with bent knee for soleus', duration: '3x15 reps', priority: 'high' },
    ],
    weak: [
      { type: 'strengthen', name: 'Heel Raises', description: 'Seated or bent-knee calf raises targeting soleus', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Single Leg Calf Raise', description: 'Single leg raise with slight knee bend for soleus focus', duration: '3x12 each side', priority: 'high' },
    ],
    overactive: [
      { type: 'release', name: 'Foam Roll Calves', description: 'Deep foam rolling of soleus muscle', duration: '60-90s each side', priority: 'high' },
      { type: 'stretch', name: 'Wall Calf Stretch (Bent Knee)', description: 'Bent knee wall stretch to reduce soleus tone', duration: '30-45s each side', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Heel Raises', description: 'Seated calf raises to re-activate soleus', duration: '3x15 reps', priority: 'high' },
    ],
  },
  upper_trap: {
    overactive: [
      { type: 'stretch', name: 'Upper Trap Stretch', description: 'Lateral cervical flexion stretch targeting upper trapezius', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Levator Scapulae Stretch', description: 'Diagonal neck stretch to release levator scapulae and upper trapezius', duration: '30-45s each side', priority: 'high' },
      { type: 'activate', name: 'Chin Tucks', description: 'Cervical retraction to inhibit upper trap and activate deep neck flexors', duration: '3x10 with 5s holds', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Upper Trap Stretch', description: 'Sustained lateral flexion stretch for shortened upper trapezius', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Levator Scapulae Stretch', description: 'Diagonal stretch targeting shortened upper trap fibers', duration: '30-45s each side', priority: 'high' },
      { type: 'activate', name: 'Chin Tucks', description: 'Cervical retraction to reciprocally inhibit upper trap', duration: '3x10 with 5s holds', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Shoulder Shrugs', description: 'Controlled shoulder shrugs for upper trapezius strengthening (rarely needed)', duration: '3x10 reps', priority: 'low' },
    ],
    inhibited: [
      { type: 'activate', name: 'Shoulder Shrugs', description: 'Light shrugs to re-activate upper trapezius', duration: '3x10 reps', priority: 'low' },
    ],
  },
  lower_trap: {
    weak: [
      { type: 'strengthen', name: 'Prone Y Raises', description: 'Prone arm raise in Y position targeting lower trapezius', duration: '3x12 reps', priority: 'high' },
      { type: 'strengthen', name: 'Wall Slides', description: 'Wall angel exercise for lower trap activation and scapular control', duration: '3x10 reps', priority: 'high' },
      { type: 'strengthen', name: 'Scapular Retraction', description: 'Scapular squeeze targeting lower trap and rhomboid activation', duration: '3x10 with 5s holds', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Prone Y Raises', description: 'Light prone Y raise to re-activate inhibited lower trapezius', duration: '3x10 reps', priority: 'high' },
      { type: 'activate', name: 'Wall Slides', description: 'Wall slides for lower trap neuromuscular re-education', duration: '3x10 reps', priority: 'high' },
      { type: 'activate', name: 'Scapular Retraction', description: 'Gentle scapular retraction to re-establish lower trap activation', duration: '3x10 with 5s holds', priority: 'medium' },
    ],
    overactive: [
      { type: 'stretch', name: 'Pec Stretching', description: 'Doorway pec stretch to reduce compensatory demand on lower trapezius', duration: '30-45s each side', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Pec Stretching', description: 'Pec stretch to rebalance scapular muscle length-tension', duration: '30-45s each side', priority: 'medium' },
    ],
  },
  rhomboids: {
    weak: [
      { type: 'strengthen', name: 'Rows', description: 'Seated or bent-over rows for rhomboid strengthening', duration: '3x12 reps', priority: 'high' },
      { type: 'strengthen', name: 'Band Pull-aparts', description: 'Resistance band horizontal abduction for rhomboid activation', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Prone T Raises', description: 'Prone horizontal abduction targeting rhomboids and middle traps', duration: '3x12 reps', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Band Pull-aparts', description: 'Light band pull-aparts to re-activate inhibited rhomboids', duration: '3x15 reps', priority: 'high' },
      { type: 'activate', name: 'Rows', description: 'Light rowing to re-establish rhomboid activation', duration: '3x12 reps', priority: 'high' },
      { type: 'activate', name: 'Prone T Raises', description: 'Prone T raise for rhomboid neuromuscular re-education', duration: '3x10 reps', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Doorway Pec Stretch', description: 'Doorway pec stretch to indirectly address rhomboid shortening by rebalancing anterior-posterior chain', duration: '30-45s each side', priority: 'medium' },
    ],
    overactive: [
      { type: 'stretch', name: 'Doorway Pec Stretch', description: 'Pec stretch to reduce compensatory rhomboid overactivity', duration: '30-45s each side', priority: 'medium' },
    ],
  },
  pec_major: {
    shortened: [
      { type: 'stretch', name: 'Doorway Stretch', description: 'Doorway pec stretch at 90 degrees to lengthen pectoralis major', duration: '30-45s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll Pecs', description: 'Self-myofascial release of pectoralis major against wall with ball', duration: '60s each side', priority: 'high' },
      { type: 'stretch', name: 'Supine Pec Stretch', description: 'Supine arm abduction stretch on foam roller for pec major', duration: '30-60s', priority: 'medium' },
    ],
    overactive: [
      { type: 'stretch', name: 'Doorway Stretch', description: 'Sustained doorway stretch to reduce pec major overactivity', duration: '30-45s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll Pecs', description: 'Foam rolling pectoralis major to reduce tone', duration: '60s each side', priority: 'high' },
      { type: 'stretch', name: 'Supine Pec Stretch', description: 'Supine stretch to down-regulate pec major tone', duration: '30-60s', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Push-ups', description: 'Push-ups for pectoralis major strengthening', duration: '3x10-15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Chest Press', description: 'Dumbbell or machine chest press for pec major strength', duration: '3x10 reps', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Push-ups', description: 'Modified push-ups to re-activate pectoralis major', duration: '3x8 reps', priority: 'high' },
    ],
  },
  pec_minor: {
    shortened: [
      { type: 'stretch', name: 'Doorway Stretch', description: 'Doorway stretch with arm elevated above 90 degrees to target pec minor', duration: '30-45s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll Pecs', description: 'Ball release against wall targeting pec minor insertion', duration: '60s each side', priority: 'high' },
      { type: 'stretch', name: 'Supine Pec Stretch', description: 'Supine stretch on foam roller targeting pec minor', duration: '30-60s', priority: 'medium' },
    ],
    overactive: [
      { type: 'stretch', name: 'Doorway Stretch', description: 'Elevated arm doorway stretch to reduce pec minor overactivity', duration: '30-45s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll Pecs', description: 'Targeted release of pec minor trigger points', duration: '60s each side', priority: 'high' },
    ],
    weak: [
      { type: 'strengthen', name: 'Push-ups', description: 'Push-up plus for pec minor and serratus anterior activation', duration: '3x10 reps', priority: 'high' },
      { type: 'strengthen', name: 'Chest Press', description: 'Chest press with protraction emphasis', duration: '3x10 reps', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Push-ups', description: 'Push-up plus to activate pec minor', duration: '3x8 reps', priority: 'high' },
    ],
  },
  deep_neck_flex: {
    weak: [
      { type: 'strengthen', name: 'Chin Tucks', description: 'Cervical retraction exercise for deep neck flexor strengthening', duration: '3x10 with 10s holds', priority: 'high' },
      { type: 'strengthen', name: 'Cranio-cervical Flexion', description: 'Controlled nodding movement targeting deep cervical flexors', duration: '3x10 reps', priority: 'high' },
      { type: 'strengthen', name: 'DNF Endurance Holds', description: 'Sustained chin tuck holds for deep neck flexor endurance', duration: '3x15-30s holds', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Chin Tucks', description: 'Gentle chin tucks to re-activate deep neck flexors', duration: '3x10 with 5s holds', priority: 'high' },
      { type: 'activate', name: 'Cranio-cervical Flexion', description: 'Pressure biofeedback exercise for DNF activation', duration: '3x10 reps', priority: 'high' },
      { type: 'activate', name: 'DNF Endurance Holds', description: 'Short duration holds to re-establish DNF endurance', duration: '3x10s holds', priority: 'medium' },
    ],
    overactive: [
      { type: 'stretch', name: 'Cervical Extension Mobility', description: 'Gentle cervical extension to reduce deep neck flexor overactivity', duration: '10-15 reps', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Cervical Extension Mobility', description: 'Cervical extension mobility to lengthen shortened deep neck flexors', duration: '10-15 reps', priority: 'medium' },
    ],
  },
  scm: {
    shortened: [
      { type: 'stretch', name: 'SCM Stretch', description: 'Lateral flexion and rotation stretch targeting sternocleidomastoid', duration: '30s each side', priority: 'high' },
      { type: 'stretch', name: 'Cervical Rotation Stretch', description: 'Gentle rotation stretch to lengthen shortened SCM', duration: '30s each side', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'SCM Stretch', description: 'Sustained SCM stretch to reduce overactivity', duration: '30s each side', priority: 'high' },
      { type: 'stretch', name: 'Cervical Rotation Stretch', description: 'Cervical rotation to down-regulate SCM tone', duration: '30s each side', priority: 'high' },
    ],
    weak: [
      { type: 'strengthen', name: 'Isometric Cervical Flexion', description: 'Hand-resisted isometric cervical flexion for SCM strengthening', duration: '3x5 with 5s holds', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Isometric Cervical Flexion', description: 'Gentle isometric cervical flexion to re-activate SCM', duration: '3x5 with 5s holds', priority: 'medium' },
    ],
  },
  erector_spinae_lumbar: {
    overactive: [
      { type: 'stretch', name: "Child's Pose", description: 'Kneeling forward fold to lengthen lumbar erector spinae', duration: '30-60s', priority: 'high' },
      { type: 'stretch', name: 'Cat-Cow', description: 'Spinal flexion-extension mobility to reduce lumbar extensor overactivity', duration: '10-15 reps', priority: 'high' },
      { type: 'stretch', name: 'Lumbar Flexion Stretch', description: 'Supine double knee-to-chest for lumbar flexion and erector release', duration: '30-45s', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Bird-Dog', description: 'Quadruped alternating arm-leg raise for lumbar extensor strengthening', duration: '3x10 each side', priority: 'high' },
      { type: 'strengthen', name: 'Superman', description: 'Prone back extension for lumbar erector spinae strengthening', duration: '3x10 reps', priority: 'high' },
      { type: 'strengthen', name: 'Back Extension', description: 'Controlled back extension for spinal extensor endurance', duration: '3x10 reps', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: "Child's Pose", description: 'Sustained kneeling stretch for shortened lumbar extensors', duration: '30-60s', priority: 'high' },
      { type: 'stretch', name: 'Cat-Cow', description: 'Flexion-extension mobilization for shortened erectors', duration: '10-15 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Bird-Dog', description: 'Quadruped exercise to re-activate lumbar extensors', duration: '3x10 each side', priority: 'high' },
      { type: 'activate', name: 'Superman', description: 'Prone extension to re-establish extensor activation', duration: '3x8 reps', priority: 'medium' },
    ],
  },
  erector_spinae_thoracic: {
    weak: [
      { type: 'strengthen', name: 'Thoracic Extension Over Foam Roll', description: 'Foam roller thoracic extension for mid-back extensor strengthening', duration: '3x10 reps', priority: 'high' },
      { type: 'strengthen', name: 'Prone Extension', description: 'Prone thoracic extension for upper back extensor strength', duration: '3x10 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Thoracic Extension Over Foam Roll', description: 'Foam roller extension to re-activate thoracic extensors', duration: '3x8 reps', priority: 'high' },
      { type: 'activate', name: 'Prone Extension', description: 'Gentle prone extension for thoracic extensor activation', duration: '3x8 reps', priority: 'medium' },
    ],
    overactive: [
      { type: 'stretch', name: "Child's Pose", description: 'Forward fold stretch for overactive thoracic extensors', duration: '30-60s', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Cat-Cow', description: 'Spinal flexion mobilization for shortened thoracic extensors', duration: '10-15 reps', priority: 'medium' },
    ],
  },
  rectus_abdominis: {
    weak: [
      { type: 'strengthen', name: 'Dead Bugs', description: 'Supine alternating arm-leg lowering for core stability', duration: '3x10 each side', priority: 'high' },
      { type: 'strengthen', name: 'Pallof Press', description: 'Anti-rotation press for deep core activation', duration: '3x10 each side', priority: 'high' },
      { type: 'strengthen', name: 'Plank Progressions', description: 'Forearm plank progressing to longer holds for core endurance', duration: '3x20-60s holds', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Dead Bugs', description: 'Gentle dead bugs to re-activate core musculature', duration: '3x8 each side', priority: 'high' },
      { type: 'activate', name: 'Pallof Press', description: 'Light Pallof press for core re-activation', duration: '3x8 each side', priority: 'high' },
    ],
    overactive: [
      { type: 'release', name: 'Breathing Exercises', description: 'Diaphragmatic breathing to reduce rectus abdominis overactivity', duration: '5-10 minutes', priority: 'medium' },
      { type: 'release', name: 'Diaphragmatic Relaxation', description: 'Supine relaxation focusing on releasing abdominal bracing', duration: '5-10 minutes', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Prone Press-up', description: 'Prone extension to lengthen shortened rectus abdominis', duration: '10-15 reps', priority: 'medium' },
    ],
  },
  obliques: {
    weak: [
      { type: 'strengthen', name: 'Dead Bugs', description: 'Dead bugs with rotational component for oblique activation', duration: '3x10 each side', priority: 'high' },
      { type: 'strengthen', name: 'Pallof Press', description: 'Anti-rotation exercise challenging obliques', duration: '3x10 each side', priority: 'high' },
      { type: 'strengthen', name: 'Plank Progressions', description: 'Side plank progressions for oblique strengthening', duration: '3x20-45s each side', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Pallof Press', description: 'Light anti-rotation press to re-activate obliques', duration: '3x8 each side', priority: 'high' },
      { type: 'activate', name: 'Dead Bugs', description: 'Rotational dead bugs for oblique re-activation', duration: '3x8 each side', priority: 'high' },
    ],
    overactive: [
      { type: 'release', name: 'Breathing Exercises', description: 'Diaphragmatic breathing to reduce oblique overactivity', duration: '5-10 minutes', priority: 'medium' },
      { type: 'release', name: 'Diaphragmatic Relaxation', description: 'Relaxation techniques to release oblique bracing', duration: '5-10 minutes', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Side-lying Rotation Stretch', description: 'Gentle trunk rotation to lengthen shortened obliques', duration: '30s each side', priority: 'medium' },
    ],
  },
  transverse_abd: {
    weak: [
      { type: 'strengthen', name: 'Dead Bugs', description: 'Dead bugs with transverse abdominis pre-activation', duration: '3x10 each side', priority: 'high' },
      { type: 'strengthen', name: 'Pallof Press', description: 'Anti-rotation press emphasizing deep core engagement', duration: '3x10 each side', priority: 'high' },
      { type: 'strengthen', name: 'Plank Progressions', description: 'Plank with focus on drawing in maneuver', duration: '3x20-60s holds', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Dead Bugs', description: 'Gentle dead bugs with abdominal drawing-in for TrA activation', duration: '3x8 each side', priority: 'high' },
      { type: 'activate', name: 'Plank Progressions', description: 'Modified plank focusing on deep core engagement', duration: '3x15s holds', priority: 'medium' },
    ],
    overactive: [
      { type: 'release', name: 'Breathing Exercises', description: 'Diaphragmatic breathing to reduce TrA overactivity', duration: '5-10 minutes', priority: 'medium' },
      { type: 'release', name: 'Diaphragmatic Relaxation', description: 'Conscious relaxation of deep core bracing patterns', duration: '5-10 minutes', priority: 'medium' },
    ],
    shortened: [
      { type: 'release', name: 'Breathing Exercises', description: 'Breath work to release shortened transverse abdominis', duration: '5-10 minutes', priority: 'medium' },
    ],
  },
  adductors: {
    shortened: [
      { type: 'stretch', name: 'Side-lying Adductor Stretch', description: 'Side-lying bottom leg stretch targeting adductor group', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Butterfly Stretch', description: 'Seated butterfly position for adductor lengthening', duration: '30-60s', priority: 'high' },
      { type: 'stretch', name: 'Frog Stretch', description: 'Prone wide-knee stretch for deep adductor lengthening', duration: '30-60s', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Side-lying Adduction', description: 'Side-lying bottom leg lift for adductor strengthening', duration: '3x15 each side', priority: 'high' },
      { type: 'strengthen', name: 'Copenhagen Plank', description: 'Side plank with top foot on bench for advanced adductor strengthening', duration: '3x15-30s each side', priority: 'high' },
    ],
    overactive: [
      { type: 'release', name: 'Foam Roll Adductors', description: 'Foam rolling inner thigh to release overactive adductors', duration: '60-90s each side', priority: 'high' },
      { type: 'stretch', name: 'Butterfly Stretch', description: 'Butterfly stretch to reduce adductor overactivity', duration: '30-60s', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Side-lying Adduction', description: 'Gentle adduction to re-activate inhibited adductors', duration: '3x12 each side', priority: 'high' },
    ],
  },
  tib_ant: {
    weak: [
      { type: 'strengthen', name: 'Toe Raises', description: 'Standing toe raises for tibialis anterior strengthening', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Resisted Dorsiflexion', description: 'Band-resisted ankle dorsiflexion for tibialis anterior', duration: '3x12 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Toe Raises', description: 'Gentle toe raises to re-activate tibialis anterior', duration: '3x12 reps', priority: 'high' },
      { type: 'activate', name: 'Resisted Dorsiflexion', description: 'Light band dorsiflexion for neuromuscular re-activation', duration: '3x10 reps', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'Ankle Plantar Flexion Mobility', description: 'Gentle plantarflexion stretching to reduce tibialis anterior overactivity', duration: '30s each side', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Ankle Plantar Flexion Mobility', description: 'Plantarflexion mobility to lengthen shortened tibialis anterior', duration: '30s each side', priority: 'medium' },
    ],
  },
  peroneals: {
    weak: [
      { type: 'strengthen', name: 'Eversion with Band', description: 'Resisted ankle eversion with resistance band', duration: '3x15 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Eversion with Band', description: 'Light band eversion to re-activate peroneal muscles', duration: '3x12 reps', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'Inversion Stretching', description: 'Gentle ankle inversion stretch to reduce peroneal overactivity', duration: '30s each side', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Inversion Stretching', description: 'Inversion mobilization to lengthen shortened peroneals', duration: '30s each side', priority: 'medium' },
    ],
  },
  ant_deltoid: {
    overactive: [
      { type: 'stretch', name: 'Cross-body Stretch', description: 'Cross-body arm stretch for anterior deltoid release', duration: '30s each side', priority: 'high' },
      { type: 'stretch', name: 'Sleeper Stretch', description: 'Side-lying internal rotation stretch for anterior shoulder', duration: '30-45s each side', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Doorway Stretch', description: 'Doorway stretch targeting anterior deltoid and pec', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Cross-body Stretch', description: 'Cross-body stretch for shortened anterior deltoid', duration: '30s each side', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Front Raises', description: 'Dumbbell front raises for anterior deltoid strengthening', duration: '3x12 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Front Raises', description: 'Light front raises to re-activate anterior deltoid', duration: '3x10 reps', priority: 'high' },
    ],
  },
  mid_deltoid: {
    overactive: [
      { type: 'stretch', name: 'Cross-body Stretch', description: 'Cross-body arm stretch for middle deltoid release', duration: '30s each side', priority: 'high' },
    ],
    shortened: [
      { type: 'stretch', name: 'Cross-body Stretch', description: 'Cross-body stretch for shortened middle deltoid', duration: '30s each side', priority: 'high' },
    ],
    weak: [
      { type: 'strengthen', name: 'Lateral Raises', description: 'Dumbbell lateral raises for middle deltoid strengthening', duration: '3x12 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Lateral Raises', description: 'Light lateral raises to re-activate middle deltoid', duration: '3x10 reps', priority: 'high' },
    ],
  },
  post_deltoid: {
    overactive: [
      { type: 'stretch', name: 'Cross-body Stretch', description: 'Cross-body stretch for posterior deltoid release', duration: '30s each side', priority: 'high' },
      { type: 'stretch', name: 'Sleeper Stretch', description: 'Side-lying stretch targeting posterior deltoid and infraspinatus', duration: '30-45s each side', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Cross-body Stretch', description: 'Cross-body arm adduction stretch for shortened posterior deltoid', duration: '30s each side', priority: 'high' },
    ],
    weak: [
      { type: 'strengthen', name: 'Reverse Flyes', description: 'Bent-over reverse flyes for posterior deltoid strengthening', duration: '3x12 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Reverse Flyes', description: 'Light reverse flyes to re-activate posterior deltoid', duration: '3x10 reps', priority: 'high' },
    ],
  },
  infraspinatus: {
    weak: [
      { type: 'strengthen', name: 'External Rotation with Band', description: 'Standing or side-lying external rotation with resistance band', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Side-lying ER', description: 'Side-lying shoulder external rotation with light dumbbell', duration: '3x12 reps', priority: 'high' },
      { type: 'strengthen', name: 'Prone ER', description: 'Prone external rotation at 90 degrees abduction', duration: '3x10 reps', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Side-lying ER', description: 'Light side-lying external rotation to re-activate infraspinatus', duration: '3x12 reps', priority: 'high' },
      { type: 'activate', name: 'External Rotation with Band', description: 'Band ER for infraspinatus neuromuscular re-education', duration: '3x15 reps', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'Sleeper Stretch', description: 'Side-lying internal rotation stretch to reduce infraspinatus overactivity', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Cross-body Stretch', description: 'Cross-body adduction stretch for posterior cuff release', duration: '30s each side', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Sleeper Stretch', description: 'Sleeper stretch to lengthen shortened infraspinatus', duration: '30-45s each side', priority: 'high' },
    ],
  },
  supraspinatus: {
    weak: [
      { type: 'strengthen', name: 'External Rotation with Band', description: 'Band external rotation for rotator cuff strengthening', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Side-lying ER', description: 'Side-lying ER targeting supraspinatus and infraspinatus', duration: '3x12 reps', priority: 'high' },
      { type: 'strengthen', name: 'Prone ER', description: 'Prone shoulder rotation for supraspinatus activation', duration: '3x10 reps', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Side-lying ER', description: 'Light ER exercise to re-activate supraspinatus', duration: '3x12 reps', priority: 'high' },
      { type: 'activate', name: 'External Rotation with Band', description: 'Band exercise for supraspinatus neuromuscular re-education', duration: '3x12 reps', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'Sleeper Stretch', description: 'Sleeper stretch to reduce supraspinatus overactivity', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Cross-body Stretch', description: 'Cross-body stretch for rotator cuff release', duration: '30s each side', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Cross-body Stretch', description: 'Cross-body adduction to lengthen shortened supraspinatus', duration: '30s each side', priority: 'high' },
    ],
  },
  subscapularis: {
    weak: [
      { type: 'strengthen', name: 'External Rotation with Band', description: 'Band exercise for overall rotator cuff balance including subscapularis', duration: '3x15 reps', priority: 'high' },
      { type: 'strengthen', name: 'Side-lying ER', description: 'Side-lying rotation work for subscapularis integration', duration: '3x12 reps', priority: 'high' },
      { type: 'strengthen', name: 'Prone ER', description: 'Prone rotator cuff exercise to strengthen subscapularis', duration: '3x10 reps', priority: 'medium' },
    ],
    inhibited: [
      { type: 'activate', name: 'Side-lying ER', description: 'Gentle rotation to re-activate subscapularis', duration: '3x10 reps', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'Sleeper Stretch', description: 'Sleeper stretch to reduce subscapularis overactivity', duration: '30-45s each side', priority: 'high' },
      { type: 'stretch', name: 'Cross-body Stretch', description: 'Cross-body stretch for subscapularis release', duration: '30s each side', priority: 'medium' },
    ],
    shortened: [
      { type: 'stretch', name: 'Sleeper Stretch', description: 'Sleeper stretch to lengthen shortened subscapularis', duration: '30-45s each side', priority: 'high' },
    ],
  },
  biceps: {
    shortened: [
      { type: 'stretch', name: 'Doorway Bicep Stretch', description: 'Arm extended behind in doorway to stretch biceps brachii', duration: '30s each side', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'Doorway Bicep Stretch', description: 'Sustained bicep stretch to reduce overactivity', duration: '30s each side', priority: 'high' },
      { type: 'release', name: 'Foam Roll Biceps', description: 'Self-myofascial release of biceps brachii', duration: '60s each side', priority: 'medium' },
    ],
    weak: [
      { type: 'strengthen', name: 'Curls', description: 'Dumbbell or barbell bicep curls for strengthening', duration: '3x12 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Curls', description: 'Light curls to re-activate inhibited biceps', duration: '3x10 reps', priority: 'high' },
    ],
  },
  triceps: {
    shortened: [
      { type: 'stretch', name: 'Overhead Tricep Stretch', description: 'Overhead arm stretch targeting triceps brachii', duration: '30s each side', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'Overhead Tricep Stretch', description: 'Sustained tricep stretch to reduce overactivity', duration: '30s each side', priority: 'high' },
    ],
    weak: [
      { type: 'strengthen', name: 'Tricep Extensions', description: 'Overhead or cable tricep extensions for strengthening', duration: '3x12 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Tricep Extensions', description: 'Light extensions to re-activate inhibited triceps', duration: '3x10 reps', priority: 'high' },
    ],
  },
  wrist_flex: {
    shortened: [
      { type: 'stretch', name: 'Wrist Flexor Stretch', description: 'Arm extended with palm up, gently pulling fingers back to stretch wrist flexors', duration: '30s each side', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'Wrist Flexor Stretch', description: 'Sustained wrist flexor stretch to reduce overactivity', duration: '30s each side', priority: 'high' },
    ],
    weak: [
      { type: 'strengthen', name: 'Wrist Curls', description: 'Dumbbell wrist curls for flexor strengthening', duration: '3x15 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Wrist Curls', description: 'Light wrist curls to re-activate wrist flexors', duration: '3x12 reps', priority: 'high' },
    ],
  },
  wrist_ext: {
    shortened: [
      { type: 'stretch', name: 'Wrist Extensor Stretch (Prayer Position)', description: 'Reverse prayer position or palm-down finger pull to stretch wrist extensors', duration: '30s each side', priority: 'high' },
    ],
    overactive: [
      { type: 'stretch', name: 'Wrist Extensor Stretch (Prayer Position)', description: 'Sustained extensor stretch to reduce overactivity', duration: '30s each side', priority: 'high' },
    ],
    weak: [
      { type: 'strengthen', name: 'Reverse Wrist Curls', description: 'Dumbbell reverse wrist curls for extensor strengthening', duration: '3x15 reps', priority: 'high' },
    ],
    inhibited: [
      { type: 'activate', name: 'Reverse Wrist Curls', description: 'Light reverse curls to re-activate wrist extensors', duration: '3x12 reps', priority: 'high' },
    ],
  },
};

function stripSidePrefix(muscleId: string): string {
  return muscleId.replace(/^[lr]_/, '');
}

export function getExerciseRecommendations(muscle: IndividualMuscle): ExerciseRecommendation[] {
  const baseId = stripSidePrefix(muscle.id);
  const muscleExercises = EXERCISE_DATABASE[baseId];
  if (!muscleExercises) return [];

  const status = muscle.clinicalStatus;
  const exercises = muscleExercises[status];
  if (exercises && exercises.length > 0) {
    return exercises.slice(0, 4);
  }

  if (status === 'spasm') {
    const overactiveEx = muscleExercises['overactive'] || [];
    const shortenedEx = muscleExercises['shortened'] || [];
    const combined = [...overactiveEx, ...shortenedEx];
    return combined.slice(0, 4);
  }

  if (status === 'normal') {
    return [];
  }

  const fallbackKeys = Object.keys(muscleExercises);
  if (fallbackKeys.length > 0) {
    return (muscleExercises[fallbackKeys[0]] || []).slice(0, 2);
  }

  return [];
}

export interface MuscleBalanceRatio {
  id: string;
  label: string;
  agonist: { muscles: string[]; label: string; avgActivation: number };
  antagonist: { muscles: string[]; label: string; avgActivation: number };
  ratio: number;
  idealRange: [number, number];
  status: 'balanced' | 'agonist_dominant' | 'antagonist_dominant';
  clinical: string;
}

export interface BalancePairDef {
  id: string;
  label: string;
  agonistPatterns: string[];
  agonistLabel: string;
  antagonistPatterns: string[];
  antagonistLabel: string;
  idealRange: [number, number];
  clinicalBalanced: string;
  clinicalAgonist: string;
  clinicalAntagonist: string;
}

export const BALANCE_PAIRS: BalancePairDef[] = [
  {
    id: 'quad_hamstring',
    label: 'Quad:Hamstring Ratio',
    agonistPatterns: ['rect_fem', 'vast_lat', 'vast_med'],
    agonistLabel: 'Quadriceps',
    antagonistPatterns: ['hamstrings'],
    antagonistLabel: 'Hamstrings',
    idealRange: [0.5, 0.7],
    clinicalBalanced: 'Healthy hamstring-to-quad ratio supporting knee joint stability',
    clinicalAgonist: 'Quad-dominant pattern — increased ACL injury risk; strengthen hamstrings',
    clinicalAntagonist: 'Hamstring-dominant pattern — may indicate quad inhibition; assess for patellofemoral dysfunction',
  },
  {
    id: 'glute_hip_flexor',
    label: 'Glute:Hip Flexor Ratio',
    agonistPatterns: ['glut_max', 'glut_med', 'glut_min'],
    agonistLabel: 'Gluteals',
    antagonistPatterns: ['iliopsoas', 'rect_fem'],
    antagonistLabel: 'Hip Flexors',
    idealRange: [0.8, 1.2],
    clinicalBalanced: 'Balanced hip extensor-flexor relationship supporting pelvic stability',
    clinicalAgonist: 'Glute-dominant pattern — uncommon; assess for hip flexor weakness',
    clinicalAntagonist: 'Hip flexor dominant pattern — gluteal inhibition likely; assess for anterior pelvic tilt',
  },
  {
    id: 'upper_lower_trap',
    label: 'Upper Trap:Lower Trap Ratio',
    agonistPatterns: ['upper_trap'],
    agonistLabel: 'Upper Trapezius',
    antagonistPatterns: ['lower_trap'],
    antagonistLabel: 'Lower Trapezius',
    idealRange: [0.6, 0.9],
    clinicalBalanced: 'Balanced upper-lower trap ratio supporting scapular mechanics',
    clinicalAgonist: 'Upper trap dominant — scapular elevation pattern; risk of impingement and neck tension',
    clinicalAntagonist: 'Lower trap dominant — uncommon pattern; assess scapular positioning',
  },
  {
    id: 'pec_rhomboid',
    label: 'Pec:Rhomboid Ratio',
    agonistPatterns: ['pec_major', 'pec_minor'],
    agonistLabel: 'Pectorals',
    antagonistPatterns: ['rhomboids'],
    antagonistLabel: 'Rhomboids',
    idealRange: [0.8, 1.0],
    clinicalBalanced: 'Balanced anterior-posterior shoulder girdle mechanics',
    clinicalAgonist: 'Pec-dominant pattern — rounded shoulders likely; stretch pecs and strengthen rhomboids',
    clinicalAntagonist: 'Rhomboid-dominant pattern — uncommon; assess for pec weakness or hypomobility',
  },
  {
    id: 'bicep_tricep',
    label: 'Bicep:Tricep Ratio',
    agonistPatterns: ['biceps'],
    agonistLabel: 'Biceps',
    antagonistPatterns: ['triceps'],
    antagonistLabel: 'Triceps',
    idealRange: [0.6, 0.8],
    clinicalBalanced: 'Balanced elbow flexor-extensor ratio',
    clinicalAgonist: 'Bicep-dominant pattern — may contribute to elbow flexion contracture',
    clinicalAntagonist: 'Tricep-dominant pattern — uncommon; assess bicep integrity',
  },
  {
    id: 'ant_post_deltoid',
    label: 'Anterior:Posterior Deltoid Ratio',
    agonistPatterns: ['ant_deltoid'],
    agonistLabel: 'Anterior Deltoid',
    antagonistPatterns: ['post_deltoid'],
    antagonistLabel: 'Posterior Deltoid',
    idealRange: [0.8, 1.0],
    clinicalBalanced: 'Balanced anterior-posterior deltoid activation',
    clinicalAgonist: 'Anterior deltoid dominant — forward shoulder posture risk; strengthen posterior chain',
    clinicalAntagonist: 'Posterior deltoid dominant — uncommon; assess anterior deltoid function',
  },
  {
    id: 'adductor_abductor',
    label: 'Hip Adductor:Abductor Ratio',
    agonistPatterns: ['adductors'],
    agonistLabel: 'Hip Adductors',
    antagonistPatterns: ['glut_med', 'glut_min'],
    antagonistLabel: 'Hip Abductors',
    idealRange: [0.7, 0.9],
    clinicalBalanced: 'Balanced hip adductor-abductor ratio supporting frontal plane stability',
    clinicalAgonist: 'Adductor-dominant pattern — groin strain risk; strengthen abductors',
    clinicalAntagonist: 'Abductor-dominant pattern — may indicate adductor weakness; assess groin function',
  },
  {
    id: 'gastroc_tib_ant',
    label: 'Gastroc:Tibialis Anterior Ratio',
    agonistPatterns: ['gastroc'],
    agonistLabel: 'Gastrocnemius',
    antagonistPatterns: ['tib_ant'],
    antagonistLabel: 'Tibialis Anterior',
    idealRange: [0.3, 0.5],
    clinicalBalanced: 'Balanced ankle plantarflexor-dorsiflexor ratio',
    clinicalAgonist: 'Gastroc-dominant pattern — may limit dorsiflexion; stretch calves',
    clinicalAntagonist: 'Tibialis anterior dominant — uncommon; assess calf function',
  },
];

function getAvgActivation(allMuscles: IndividualMuscle[], patterns: string[]): { muscles: string[]; avg: number } {
  const matched: IndividualMuscle[] = [];
  for (const m of allMuscles) {
    const baseId = stripSidePrefix(m.id);
    if (patterns.includes(baseId)) {
      matched.push(m);
    }
  }
  if (matched.length === 0) return { muscles: [], avg: 0 };
  const avg = matched.reduce((sum, m) => sum + m.activationPercent, 0) / matched.length;
  return { muscles: matched.map(m => m.id), avg };
}

export function computeMuscleBalanceRatios(allMuscles: IndividualMuscle[]): MuscleBalanceRatio[] {
  const results: MuscleBalanceRatio[] = [];

  for (const pair of BALANCE_PAIRS) {
    const agonistData = getAvgActivation(allMuscles, pair.agonistPatterns);
    const antagonistData = getAvgActivation(allMuscles, pair.antagonistPatterns);

    const agonistAvg = agonistData.avg;
    const antagonistAvg = antagonistData.avg;
    const ratio = agonistAvg > 0 ? antagonistAvg / agonistAvg : 0;

    let status: 'balanced' | 'agonist_dominant' | 'antagonist_dominant' = 'balanced';
    let clinical = pair.clinicalBalanced;

    if (ratio < pair.idealRange[0]) {
      status = 'agonist_dominant';
      clinical = pair.clinicalAgonist;
    } else if (ratio > pair.idealRange[1]) {
      status = 'antagonist_dominant';
      clinical = pair.clinicalAntagonist;
    }

    results.push({
      id: pair.id,
      label: pair.label,
      agonist: { muscles: agonistData.muscles, label: pair.agonistLabel, avgActivation: Math.round(agonistAvg * 10) / 10 },
      antagonist: { muscles: antagonistData.muscles, label: pair.antagonistLabel, avgActivation: Math.round(antagonistAvg * 10) / 10 },
      ratio: Math.round(ratio * 100) / 100,
      idealRange: pair.idealRange,
      status,
      clinical,
    });
  }

  return results;
}

export interface TreatmentPriority {
  muscleId: string;
  muscleLabel: string;
  score: number;
  urgency: 'critical' | 'high' | 'moderate' | 'low';
  factors: string[];
  recommendedApproach: string;
}

const CLINICAL_SEVERITY: Record<ClinicalStatus, number> = {
  spasm: 100,
  overactive: 80,
  inhibited: 70,
  shortened: 60,
  weak: 50,
  lengthened: 40,
  normal: 0,
};

function getUrgency(score: number): 'critical' | 'high' | 'moderate' | 'low' {
  if (score > 70) return 'critical';
  if (score > 50) return 'high';
  if (score > 30) return 'moderate';
  return 'low';
}

function getRecommendedApproach(status: ClinicalStatus): string {
  switch (status) {
    case 'overactive':
    case 'shortened':
      return 'Release and stretch';
    case 'inhibited':
    case 'weak':
      return 'Activate and strengthen';
    case 'spasm':
      return 'Manual therapy and monitoring';
    case 'lengthened':
      return 'Activate and strengthen';
    case 'normal':
      return 'Maintain current';
  }
}

export function computeTreatmentPriorities(allMuscles: IndividualMuscle[]): TreatmentPriority[] {
  const priorities: TreatmentPriority[] = [];

  for (const muscle of allMuscles) {
    const tightnessScore = muscle.tightnessPercent * 0.30;
    const inhibitionScore = muscle.inhibitionPercent * 0.25;
    const fatigueScore = muscle.fatigueRisk * 0.20;
    const severityScore = CLINICAL_SEVERITY[muscle.clinicalStatus] * 0.25;

    const totalScore = Math.round(Math.min(100, tightnessScore + inhibitionScore + fatigueScore + severityScore));

    const factors: string[] = [];
    if (muscle.tightnessPercent > 40) factors.push(`Elevated tightness (${Math.round(muscle.tightnessPercent)}%)`);
    if (muscle.inhibitionPercent > 30) factors.push(`Significant inhibition (${Math.round(muscle.inhibitionPercent)}%)`);
    if (muscle.fatigueRisk > 40) factors.push(`Fatigue risk elevated (${Math.round(muscle.fatigueRisk)}%)`);
    if (muscle.clinicalStatus !== 'normal') factors.push(`Clinical status: ${muscle.clinicalStatus}`);

    priorities.push({
      muscleId: muscle.id,
      muscleLabel: muscle.label,
      score: totalScore,
      urgency: getUrgency(totalScore),
      factors,
      recommendedApproach: getRecommendedApproach(muscle.clinicalStatus),
    });
  }

  priorities.sort((a, b) => b.score - a.score);
  return priorities;
}
