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
    const avgTension = gMuscles.reduce((s, m) => s + (m.tightnessPercent + (100 - m.lengthPercent)) / 2, 0) / gMuscles.length;
    const avgAct = gMuscles.reduce((s, m) => s + m.activationPercent, 0) / gMuscles.length;
    const avgLength = gMuscles.reduce((s, m) => s + m.lengthPercent, 0) / gMuscles.length;

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
