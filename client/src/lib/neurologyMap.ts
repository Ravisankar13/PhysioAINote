export type PainMechanism = 'nociceptive' | 'neuropathic' | 'central_sensitization' | 'myofascial';

export interface DermatomeEntry {
  nerveRoot: string;
  level: string;
  sensoryTerritory: string;
  skeletonBones: string[];
  reflex?: string;
  commonEntrapment?: string;
}

export interface MyotomeEntry {
  nerveRoot: string;
  muscles: string[];
  action: string;
  mrcTestInstruction: string;
}

export interface TriggerPointReferral {
  muscleId: string;
  muscleName: string;
  triggerPointBone: string;
  referralZoneBones: string[];
  referralDescription: string;
  commonCauses: string[];
}

export interface NerveRootProfile {
  root: string;
  spinalLevel: string;
  dermatome: DermatomeEntry;
  myotome: MyotomeEntry;
}

export const NERVE_ROOT_PROFILES: NerveRootProfile[] = [
  {
    root: 'C1',
    spinalLevel: 'C1',
    dermatome: {
      nerveRoot: 'C1',
      level: 'C1',
      sensoryTerritory: 'Vertex of skull',
      skeletonBones: ['mixamorig:Head'],
    },
    myotome: {
      nerveRoot: 'C1',
      muscles: ['Rectus capitis anterior', 'Rectus capitis lateralis'],
      action: 'Neck flexion (capital)',
      mrcTestInstruction: 'Resist chin tuck / capital flexion',
    },
  },
  {
    root: 'C2',
    spinalLevel: 'C2',
    dermatome: {
      nerveRoot: 'C2',
      level: 'C2',
      sensoryTerritory: 'Occiput, temples',
      skeletonBones: ['mixamorig:Head'],
    },
    myotome: {
      nerveRoot: 'C2',
      muscles: ['Longus capitis', 'Sternocleidomastoid', 'Prevertebral muscles'],
      action: 'Neck flexion',
      mrcTestInstruction: 'Resist neck flexion',
    },
  },
  {
    root: 'C3',
    spinalLevel: 'C3',
    dermatome: {
      nerveRoot: 'C3',
      level: 'C3',
      sensoryTerritory: 'Posterior neck, lower occiput',
      skeletonBones: ['mixamorig:Neck', 'mixamorig:Head'],
    },
    myotome: {
      nerveRoot: 'C3',
      muscles: ['Upper trapezius', 'Diaphragm (partial)'],
      action: 'Neck lateral flexion',
      mrcTestInstruction: 'Resist lateral neck flexion',
    },
  },
  {
    root: 'C4',
    spinalLevel: 'C4',
    dermatome: {
      nerveRoot: 'C4',
      level: 'C4',
      sensoryTerritory: 'Superior shoulder, clavicular region',
      skeletonBones: ['mixamorig:Neck', 'mixamorig:LeftShoulder', 'mixamorig:RightShoulder'],
    },
    myotome: {
      nerveRoot: 'C4',
      muscles: ['Upper trapezius', 'Levator scapulae', 'Diaphragm'],
      action: 'Shoulder elevation',
      mrcTestInstruction: 'Resist shoulder shrug',
    },
  },
  {
    root: 'C5',
    spinalLevel: 'C5',
    dermatome: {
      nerveRoot: 'C5',
      level: 'C5',
      sensoryTerritory: 'Lateral arm (deltoid region), regimental badge area',
      skeletonBones: ['mixamorig:LeftShoulder', 'mixamorig:RightShoulder', 'mixamorig:LeftArm', 'mixamorig:RightArm'],
      reflex: 'Biceps (C5-C6)',
      commonEntrapment: 'C4-C5 foramen',
    },
    myotome: {
      nerveRoot: 'C5',
      muscles: ['Deltoid', 'Biceps brachii', 'Supraspinatus', 'Infraspinatus'],
      action: 'Shoulder abduction, elbow flexion',
      mrcTestInstruction: 'Resist shoulder abduction at 90° and elbow flexion',
    },
  },
  {
    root: 'C6',
    spinalLevel: 'C6',
    dermatome: {
      nerveRoot: 'C6',
      level: 'C6',
      sensoryTerritory: 'Lateral forearm, thumb, index finger',
      skeletonBones: ['mixamorig:LeftForeArm', 'mixamorig:RightForeArm', 'mixamorig:LeftHand', 'mixamorig:RightHand'],
      reflex: 'Brachioradialis (C5-C6)',
      commonEntrapment: 'C5-C6 foramen (most common cervical)',
    },
    myotome: {
      nerveRoot: 'C6',
      muscles: ['Biceps brachii', 'Brachioradialis', 'Wrist extensors (ECRL, ECRB)'],
      action: 'Elbow flexion, wrist extension',
      mrcTestInstruction: 'Resist wrist extension with forearm pronated',
    },
  },
  {
    root: 'C7',
    spinalLevel: 'C7',
    dermatome: {
      nerveRoot: 'C7',
      level: 'C7',
      sensoryTerritory: 'Middle finger, dorsal forearm',
      skeletonBones: ['mixamorig:LeftForeArm', 'mixamorig:RightForeArm', 'mixamorig:LeftHand', 'mixamorig:RightHand'],
      reflex: 'Triceps (C7-C8)',
      commonEntrapment: 'C6-C7 foramen',
    },
    myotome: {
      nerveRoot: 'C7',
      muscles: ['Triceps', 'Wrist flexors', 'Finger extensors', 'Latissimus dorsi'],
      action: 'Elbow extension, wrist flexion',
      mrcTestInstruction: 'Resist elbow extension and wrist flexion',
    },
  },
  {
    root: 'C8',
    spinalLevel: 'C8',
    dermatome: {
      nerveRoot: 'C8',
      level: 'C8',
      sensoryTerritory: 'Medial forearm, ring and little finger',
      skeletonBones: ['mixamorig:LeftForeArm', 'mixamorig:RightForeArm', 'mixamorig:LeftHand', 'mixamorig:RightHand'],
      reflex: 'Finger flexor reflex',
      commonEntrapment: 'C7-T1 foramen',
    },
    myotome: {
      nerveRoot: 'C8',
      muscles: ['Finger flexors (FDP)', 'Intrinsic hand muscles', 'Flexor carpi ulnaris'],
      action: 'Finger flexion, grip strength',
      mrcTestInstruction: 'Resist finger flexion at DIP / grip strength test',
    },
  },
  {
    root: 'T1',
    spinalLevel: 'T1',
    dermatome: {
      nerveRoot: 'T1',
      level: 'T1',
      sensoryTerritory: 'Medial arm, medial elbow',
      skeletonBones: ['mixamorig:LeftArm', 'mixamorig:RightArm'],
    },
    myotome: {
      nerveRoot: 'T1',
      muscles: ['Interossei', 'Abductor digiti minimi', 'Lumbricals'],
      action: 'Finger abduction/adduction',
      mrcTestInstruction: 'Resist finger abduction (spreading)',
    },
  },
  {
    root: 'L1',
    spinalLevel: 'L1',
    dermatome: {
      nerveRoot: 'L1',
      level: 'L1',
      sensoryTerritory: 'Inguinal region, upper anterior thigh',
      skeletonBones: ['mixamorig:LeftUpLeg', 'mixamorig:RightUpLeg'],
    },
    myotome: {
      nerveRoot: 'L1',
      muscles: ['Iliopsoas (partial)'],
      action: 'Hip flexion (partial)',
      mrcTestInstruction: 'Resist hip flexion in seated position',
    },
  },
  {
    root: 'L2',
    spinalLevel: 'L2',
    dermatome: {
      nerveRoot: 'L2',
      level: 'L2',
      sensoryTerritory: 'Anterior thigh (upper-mid)',
      skeletonBones: ['mixamorig:LeftUpLeg', 'mixamorig:RightUpLeg'],
      commonEntrapment: 'Lateral femoral cutaneous nerve (meralgia paraesthetica)',
    },
    myotome: {
      nerveRoot: 'L2',
      muscles: ['Iliopsoas', 'Adductors', 'Sartorius'],
      action: 'Hip flexion, adduction',
      mrcTestInstruction: 'Resist hip flexion and adduction',
    },
  },
  {
    root: 'L3',
    spinalLevel: 'L3',
    dermatome: {
      nerveRoot: 'L3',
      level: 'L3',
      sensoryTerritory: 'Anterior thigh (lower), medial knee',
      skeletonBones: ['mixamorig:LeftUpLeg', 'mixamorig:RightUpLeg', 'mixamorig:LeftLeg', 'mixamorig:RightLeg'],
      reflex: 'Patellar (L3-L4)',
    },
    myotome: {
      nerveRoot: 'L3',
      muscles: ['Quadriceps', 'Adductors', 'Iliopsoas'],
      action: 'Knee extension, hip flexion',
      mrcTestInstruction: 'Resist knee extension in seated position',
    },
  },
  {
    root: 'L4',
    spinalLevel: 'L4',
    dermatome: {
      nerveRoot: 'L4',
      level: 'L4',
      sensoryTerritory: 'Medial leg, medial ankle, medial foot',
      skeletonBones: ['mixamorig:LeftLeg', 'mixamorig:RightLeg', 'mixamorig:LeftFoot', 'mixamorig:RightFoot'],
      reflex: 'Patellar (L3-L4)',
      commonEntrapment: 'L3-L4 foramen',
    },
    myotome: {
      nerveRoot: 'L4',
      muscles: ['Tibialis anterior', 'Quadriceps'],
      action: 'Ankle dorsiflexion, knee extension',
      mrcTestInstruction: 'Resist ankle dorsiflexion (heel walk test)',
    },
  },
  {
    root: 'L5',
    spinalLevel: 'L5',
    dermatome: {
      nerveRoot: 'L5',
      level: 'L5',
      sensoryTerritory: 'Lateral leg, dorsum of foot, great toe',
      skeletonBones: ['mixamorig:LeftLeg', 'mixamorig:RightLeg', 'mixamorig:LeftFoot', 'mixamorig:RightFoot', 'mixamorig:LeftToeBase', 'mixamorig:RightToeBase'],
      reflex: 'Medial hamstring (L5)',
      commonEntrapment: 'L4-L5 foramen (most common lumbar)',
    },
    myotome: {
      nerveRoot: 'L5',
      muscles: ['Extensor hallucis longus', 'Tibialis anterior', 'Gluteus medius', 'Peronei'],
      action: 'Great toe extension, ankle dorsiflexion, hip abduction',
      mrcTestInstruction: 'Resist great toe extension — most specific L5 test',
    },
  },
  {
    root: 'S1',
    spinalLevel: 'S1',
    dermatome: {
      nerveRoot: 'S1',
      level: 'S1',
      sensoryTerritory: 'Lateral foot, sole, heel, posterior calf',
      skeletonBones: ['mixamorig:LeftFoot', 'mixamorig:RightFoot', 'mixamorig:LeftToeBase', 'mixamorig:RightToeBase', 'mixamorig:LeftLeg', 'mixamorig:RightLeg'],
      reflex: 'Achilles (S1-S2)',
      commonEntrapment: 'L5-S1 foramen',
    },
    myotome: {
      nerveRoot: 'S1',
      muscles: ['Gastrocnemius', 'Soleus', 'Gluteus maximus', 'Peronei'],
      action: 'Ankle plantarflexion, hip extension',
      mrcTestInstruction: 'Resist ankle plantarflexion (single heel raise test)',
    },
  },
  {
    root: 'S2',
    spinalLevel: 'S2',
    dermatome: {
      nerveRoot: 'S2',
      level: 'S2',
      sensoryTerritory: 'Posterior thigh, popliteal fossa',
      skeletonBones: ['mixamorig:LeftUpLeg', 'mixamorig:RightUpLeg', 'mixamorig:LeftLeg', 'mixamorig:RightLeg'],
      reflex: 'Achilles (S1-S2)',
    },
    myotome: {
      nerveRoot: 'S2',
      muscles: ['Hamstrings', 'Intrinsic foot muscles'],
      action: 'Knee flexion, toe flexion',
      mrcTestInstruction: 'Resist knee flexion in prone',
    },
  },
];

export const TRIGGER_POINT_REFERRALS: TriggerPointReferral[] = [
  {
    muscleId: 'l_upper_trap',
    muscleName: 'Upper Trapezius (L)',
    triggerPointBone: 'mixamorig:LeftShoulder',
    referralZoneBones: ['mixamorig:Neck', 'mixamorig:Head'],
    referralDescription: 'Posterior-lateral neck to temple, behind the ear — "coat hanger" headache pattern',
    commonCauses: ['Forward head posture', 'Elevated shoulders', 'Desk work', 'Emotional stress'],
  },
  {
    muscleId: 'r_upper_trap',
    muscleName: 'Upper Trapezius (R)',
    triggerPointBone: 'mixamorig:RightShoulder',
    referralZoneBones: ['mixamorig:Neck', 'mixamorig:Head'],
    referralDescription: 'Posterior-lateral neck to temple, behind the ear — "coat hanger" headache pattern',
    commonCauses: ['Forward head posture', 'Elevated shoulders', 'Desk work', 'Emotional stress'],
  },
  {
    muscleId: 'levator_scapulae',
    muscleName: 'Levator Scapulae',
    triggerPointBone: 'mixamorig:LeftShoulder',
    referralZoneBones: ['mixamorig:Neck', 'mixamorig:LeftShoulder'],
    referralDescription: 'Angle of the neck and medial scapular border — stiff neck pattern',
    commonCauses: ['Forward head posture', 'Cervical rotation restriction', 'Cold draft', 'Stress'],
  },
  {
    muscleId: 'scm',
    muscleName: 'Sternocleidomastoid',
    triggerPointBone: 'mixamorig:Neck',
    referralZoneBones: ['mixamorig:Head'],
    referralDescription: 'Frontal headache, behind/above the eye, ear pain, dizziness',
    commonCauses: ['Forward head posture', 'Chronic neck rotation', 'Whiplash'],
  },
  {
    muscleId: 'suboccipitals',
    muscleName: 'Suboccipitals',
    triggerPointBone: 'mixamorig:Head',
    referralZoneBones: ['mixamorig:Head'],
    referralDescription: 'Deep pain wrapping from occiput around to behind the eye — cervicogenic headache',
    commonCauses: ['Forward head posture', 'Upper cervical dysfunction', 'Eyestrain'],
  },
  {
    muscleId: 'l_infraspinatus',
    muscleName: 'Infraspinatus (L)',
    triggerPointBone: 'mixamorig:LeftShoulder',
    referralZoneBones: ['mixamorig:LeftArm', 'mixamorig:LeftForeArm', 'mixamorig:LeftHand'],
    referralDescription: 'Anterior shoulder, lateral arm, deep shoulder pain — mimics rotator cuff tear',
    commonCauses: ['Overhead activities', 'Internal rotation overuse', 'Sleeping on side'],
  },
  {
    muscleId: 'r_infraspinatus',
    muscleName: 'Infraspinatus (R)',
    triggerPointBone: 'mixamorig:RightShoulder',
    referralZoneBones: ['mixamorig:RightArm', 'mixamorig:RightForeArm', 'mixamorig:RightHand'],
    referralDescription: 'Anterior shoulder, lateral arm, deep shoulder pain — mimics rotator cuff tear',
    commonCauses: ['Overhead activities', 'Internal rotation overuse', 'Sleeping on side'],
  },
  {
    muscleId: 'l_pec_minor',
    muscleName: 'Pectoralis Minor (L)',
    triggerPointBone: 'mixamorig:LeftShoulder',
    referralZoneBones: ['mixamorig:LeftArm', 'mixamorig:LeftForeArm', 'mixamorig:LeftHand'],
    referralDescription: 'Anterior chest, medial arm to ulnar fingers — mimics cardiac pain or TOS',
    commonCauses: ['Rounded shoulders', 'Desk work', 'Forward posture'],
  },
  {
    muscleId: 'r_pec_minor',
    muscleName: 'Pectoralis Minor (R)',
    triggerPointBone: 'mixamorig:RightShoulder',
    referralZoneBones: ['mixamorig:RightArm', 'mixamorig:RightForeArm', 'mixamorig:RightHand'],
    referralDescription: 'Anterior chest, medial arm to ulnar fingers — mimics cardiac pain or TOS',
    commonCauses: ['Rounded shoulders', 'Desk work', 'Forward posture'],
  },
  {
    muscleId: 'l_glut_med',
    muscleName: 'Gluteus Medius (L)',
    triggerPointBone: 'mixamorig:LeftUpLeg',
    referralZoneBones: ['mixamorig:LeftUpLeg', 'mixamorig:Hips'],
    referralDescription: 'Posterior iliac crest, sacroiliac region, lateral hip — mimics SIJ or trochanteric bursitis',
    commonCauses: ['Trendelenburg gait', 'Hip weakness', 'Prolonged sitting'],
  },
  {
    muscleId: 'r_glut_med',
    muscleName: 'Gluteus Medius (R)',
    triggerPointBone: 'mixamorig:RightUpLeg',
    referralZoneBones: ['mixamorig:RightUpLeg', 'mixamorig:Hips'],
    referralDescription: 'Posterior iliac crest, sacroiliac region, lateral hip — mimics SIJ or trochanteric bursitis',
    commonCauses: ['Trendelenburg gait', 'Hip weakness', 'Prolonged sitting'],
  },
  {
    muscleId: 'l_glut_min',
    muscleName: 'Gluteus Minimus (L)',
    triggerPointBone: 'mixamorig:LeftUpLeg',
    referralZoneBones: ['mixamorig:LeftUpLeg', 'mixamorig:LeftLeg', 'mixamorig:LeftFoot'],
    referralDescription: 'Lateral thigh, lateral leg to ankle — mimics L5 radiculopathy / sciatica',
    commonCauses: ['Hip abductor weakness', 'Prolonged side-lying', 'Gait dysfunction'],
  },
  {
    muscleId: 'r_glut_min',
    muscleName: 'Gluteus Minimus (R)',
    triggerPointBone: 'mixamorig:RightUpLeg',
    referralZoneBones: ['mixamorig:RightUpLeg', 'mixamorig:RightLeg', 'mixamorig:RightFoot'],
    referralDescription: 'Lateral thigh, lateral leg to ankle — mimics L5 radiculopathy / sciatica',
    commonCauses: ['Hip abductor weakness', 'Prolonged side-lying', 'Gait dysfunction'],
  },
  {
    muscleId: 'l_piriformis',
    muscleName: 'Piriformis (L)',
    triggerPointBone: 'mixamorig:LeftUpLeg',
    referralZoneBones: ['mixamorig:LeftUpLeg', 'mixamorig:LeftLeg', 'mixamorig:Hips'],
    referralDescription: 'Sacroiliac region, buttock, posterior thigh — piriformis syndrome / pseudo-sciatica',
    commonCauses: ['Prolonged sitting', 'Hip external rotation overuse', 'Running'],
  },
  {
    muscleId: 'r_piriformis',
    muscleName: 'Piriformis (R)',
    triggerPointBone: 'mixamorig:RightUpLeg',
    referralZoneBones: ['mixamorig:RightUpLeg', 'mixamorig:RightLeg', 'mixamorig:Hips'],
    referralDescription: 'Sacroiliac region, buttock, posterior thigh — piriformis syndrome / pseudo-sciatica',
    commonCauses: ['Prolonged sitting', 'Hip external rotation overuse', 'Running'],
  },
  {
    muscleId: 'erector_spinae_lumbar',
    muscleName: 'Erector Spinae (Lumbar)',
    triggerPointBone: 'mixamorig:Spine1',
    referralZoneBones: ['mixamorig:Spine', 'mixamorig:Hips'],
    referralDescription: 'Ipsilateral low back, gluteal region — widespread low back ache',
    commonCauses: ['Prolonged flexion', 'Heavy lifting', 'Poor posture'],
  },
  {
    muscleId: 'l_gastroc',
    muscleName: 'Gastrocnemius (L)',
    triggerPointBone: 'mixamorig:LeftLeg',
    referralZoneBones: ['mixamorig:LeftLeg', 'mixamorig:LeftFoot'],
    referralDescription: 'Posterior calf, instep of foot — nocturnal calf cramps',
    commonCauses: ['Calf tightness', 'Overuse in running/jumping', 'Dehydration'],
  },
  {
    muscleId: 'r_gastroc',
    muscleName: 'Gastrocnemius (R)',
    triggerPointBone: 'mixamorig:RightLeg',
    referralZoneBones: ['mixamorig:RightLeg', 'mixamorig:RightFoot'],
    referralDescription: 'Posterior calf, instep of foot — nocturnal calf cramps',
    commonCauses: ['Calf tightness', 'Overuse in running/jumping', 'Dehydration'],
  },
  {
    muscleId: 'scalenes',
    muscleName: 'Scalenes',
    triggerPointBone: 'mixamorig:Neck',
    referralZoneBones: ['mixamorig:LeftArm', 'mixamorig:RightArm', 'mixamorig:LeftForeArm', 'mixamorig:RightForeArm', 'mixamorig:LeftHand', 'mixamorig:RightHand'],
    referralDescription: 'Anterior chest, medial scapula, down arm to thumb — mimics TOS or C6 radiculopathy',
    commonCauses: ['Forward head posture', 'Accessory breathing', 'Whiplash'],
  },
];

export const MECHANISM_COLORS: Record<PainMechanism, { hex: number; css: string; label: string; badge: string }> = {
  nociceptive: { hex: 0xff4444, css: '#ff4444', label: 'Nociceptive', badge: 'Tissue-based pain' },
  neuropathic: { hex: 0x44aaff, css: '#44aaff', label: 'Neuropathic', badge: 'Nerve-mediated pain' },
  central_sensitization: { hex: 0xff44ff, css: '#ff44ff', label: 'Central Sensitization', badge: 'Amplified processing' },
  myofascial: { hex: 0xff8800, css: '#ff8800', label: 'Myofascial', badge: 'Trigger point referral' },
};

export function classifyPainMechanism(
  label: string,
  description?: string,
  markerType?: string,
  symptomType?: string
): PainMechanism {
  const text = `${label} ${description || ''} ${symptomType || ''}`.toLowerCase();

  const neuropathicPatterns = [
    /\b(radiculopathy|radicular|sciatica|nerve\s*(root|entrap|compress)|neuropath|neuralgia|dermatomal|myotomal)\b/,
    /\b(numbness|tingling|pins\s*(and|&)\s*needles|burning|electric|shooting|paresthesia|paraesthesia)\b/,
    /\b(c[1-8]|l[1-5]|s[1-3]|t[1-9]|t1[0-2])\s*(nerve|root|radiculopathy)/,
    /\bneuropathic\b/,
    /\b(carpal\s*tunnel|cubital\s*tunnel|tarsal\s*tunnel|thoracic\s*outlet|piriformis\s*syndrome)\b/,
  ];

  const centralPatterns = [
    /\b(central\s*sensitiz|nociplastic|fibromyalgia|chronic\s*widespread|allodynia|hyperalgesia)\b/,
    /\b(wind[\s-]*up|temporal\s*summation|diffuse\s*pain|catastrophiz)\b/,
  ];

  const myofascialPatterns = [
    /\b(trigger\s*point|myofascial|taut\s*band|referred\s*pain|knot)\b/,
    /\b(muscle\s*spasm|tender\s*point|active\s*point|latent\s*point)\b/,
  ];

  if (markerType === 'referred') return 'myofascial';

  for (const p of neuropathicPatterns) {
    if (p.test(text)) return 'neuropathic';
  }
  for (const p of centralPatterns) {
    if (p.test(text)) return 'central_sensitization';
  }
  for (const p of myofascialPatterns) {
    if (p.test(text)) return 'myofascial';
  }

  return 'nociceptive';
}

export function findDermatomeForBone(boneName: string): NerveRootProfile[] {
  return NERVE_ROOT_PROFILES.filter(p =>
    p.dermatome.skeletonBones.some(b => boneName.includes(b.replace('mixamorig:', '')))
  );
}

export function findTriggerPointReferrals(muscleId: string): TriggerPointReferral[] {
  return TRIGGER_POINT_REFERRALS.filter(tp => tp.muscleId === muscleId);
}

export function findReferralsForBone(boneName: string): TriggerPointReferral[] {
  return TRIGGER_POINT_REFERRALS.filter(tp =>
    tp.triggerPointBone === boneName ||
    tp.referralZoneBones.includes(boneName)
  );
}

export function getNerveRootForRegion(region: string): NerveRootProfile[] {
  const regionLower = region.toLowerCase();

  const regionToRoots: Record<string, string[]> = {
    'cervical': ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'],
    'neck': ['C1', 'C2', 'C3', 'C4'],
    'shoulder': ['C5', 'C6'],
    'arm': ['C5', 'C6', 'C7'],
    'forearm': ['C6', 'C7', 'C8'],
    'hand': ['C7', 'C8', 'T1'],
    'thoracic': ['T1'],
    'lumbar': ['L1', 'L2', 'L3', 'L4', 'L5'],
    'hip': ['L2', 'L3', 'L4'],
    'thigh': ['L2', 'L3', 'L4'],
    'knee': ['L3', 'L4'],
    'leg': ['L4', 'L5', 'S1'],
    'ankle': ['L4', 'L5', 'S1'],
    'foot': ['L5', 'S1', 'S2'],
    'calf': ['S1', 'S2'],
    'pelvis': ['L4', 'L5', 'S1', 'S2'],
    'buttock': ['L5', 'S1', 'S2'],
  };

  for (const [key, roots] of Object.entries(regionToRoots)) {
    if (regionLower.includes(key)) {
      return NERVE_ROOT_PROFILES.filter(p => roots.includes(p.root));
    }
  }

  return [];
}
