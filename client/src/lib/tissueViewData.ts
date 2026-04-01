export type TissueViewMode = 'muscle' | 'tendon' | 'joint' | 'nerve' | 'fascia' | null;

export interface TissueOverlayEntry {
  id: string;
  label: string;
  bones: string[];
  color: { hex: number; css: string };
  region: string;
  clinicalNote: string;
}

export interface TendonEntry extends TissueOverlayEntry {
  origin: string;
  insertion: string;
  cookStage?: 1 | 2 | 3;
  cookDescription?: string;
  commonPathology: string;
}

export interface JointSurfaceEntry extends TissueOverlayEntry {
  jointType: string;
  degenerationLevel: 'normal' | 'mild' | 'moderate' | 'severe';
  kellgrenLawrence?: 0 | 1 | 2 | 3 | 4;
  normalROM: string;
}

export interface NervePathwayEntry extends TissueOverlayEntry {
  pathway: string[];
  entrapmentSites: Array<{
    name: string;
    boneName: string;
    clinicalTest: string;
  }>;
  motorFunction: string;
  sensoryTerritory: string;
}

export interface FascialLayerEntry extends TissueOverlayEntry {
  chainName: string;
  depth: 'superficial' | 'intermediate' | 'deep';
  tensionDirection: string;
}

export const TISSUE_MODE_COLORS: Record<Exclude<TissueViewMode, null>, { hex: number; css: string; label: string }> = {
  muscle: { hex: 0xcc3333, css: '#cc3333', label: 'Muscle' },
  tendon: { hex: 0xe6a832, css: '#e6a832', label: 'Tendon' },
  joint: { hex: 0x33aacc, css: '#33aacc', label: 'Joint Surface' },
  nerve: { hex: 0xaacc33, css: '#aacc33', label: 'Nerve' },
  fascia: { hex: 0xcc66cc, css: '#cc66cc', label: 'Fascia' },
};

export const COOK_STAGING: Record<1 | 2 | 3, { name: string; description: string; prognosis: string; treatment: string }> = {
  1: {
    name: 'Reactive Tendinopathy',
    description: 'Acute overload response with thickened, stiff tendon. Non-inflammatory cell proliferation and increased ground substance.',
    prognosis: 'Good — fully reversible with load management',
    treatment: 'Isometric loading, relative rest, avoid compression',
  },
  2: {
    name: 'Tendon Dysrepair',
    description: 'Failed healing with matrix disorganization, increased cellularity, and neovascularization. Some reversible, some not.',
    prognosis: 'Moderate — partially reversible with progressive loading',
    treatment: 'Heavy slow resistance, eccentric loading, avoid complete rest',
  },
  3: {
    name: 'Degenerative Tendinopathy',
    description: 'Areas of cell death, advanced matrix disorganization, neovascularization. Irreversible structural changes.',
    prognosis: 'Guarded — structure won\'t normalize but function can improve',
    treatment: 'Progressive heavy loading to build capacity, consider PRP/surgery if recalcitrant',
  },
};

export const KELLGREN_LAWRENCE: Record<0 | 1 | 2 | 3 | 4, { grade: string; description: string }> = {
  0: { grade: 'Grade 0 — Normal', description: 'No radiographic features of OA' },
  1: { grade: 'Grade 1 — Doubtful', description: 'Possible osteophytic lipping, doubtful narrowing' },
  2: { grade: 'Grade 2 — Minimal', description: 'Definite osteophytes, possible joint space narrowing' },
  3: { grade: 'Grade 3 — Moderate', description: 'Multiple osteophytes, definite narrowing, some sclerosis, possible deformity' },
  4: { grade: 'Grade 4 — Severe', description: 'Large osteophytes, marked narrowing, severe sclerosis, definite deformity' },
};

export const TENDON_DATA: TendonEntry[] = [
  {
    id: 'achilles_l', label: 'Left Achilles Tendon', bones: ['Ankle_L'], region: 'ankle',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Largest tendon in body. Common site of tendinopathy in runners.',
    origin: 'Gastrocnemius/Soleus muscle bellies', insertion: 'Calcaneal tuberosity',
    cookStage: 1, cookDescription: 'Reactive tendinopathy from overload', commonPathology: 'Achilles tendinopathy, rupture',
  },
  {
    id: 'achilles_r', label: 'Right Achilles Tendon', bones: ['Ankle_R'], region: 'ankle',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Largest tendon in body. Common site of tendinopathy in runners.',
    origin: 'Gastrocnemius/Soleus muscle bellies', insertion: 'Calcaneal tuberosity',
    cookStage: 1, cookDescription: 'Reactive tendinopathy from overload', commonPathology: 'Achilles tendinopathy, rupture',
  },
  {
    id: 'patellar_l', label: 'Left Patellar Tendon', bones: ['Knee_L'], region: 'knee',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Connects patella to tibial tuberosity. "Jumper\'s knee" site.',
    origin: 'Inferior pole of patella', insertion: 'Tibial tuberosity',
    cookStage: 1, cookDescription: 'Reactive from jumping/landing loads', commonPathology: 'Patellar tendinopathy, Osgood-Schlatter (adolescent)',
  },
  {
    id: 'patellar_r', label: 'Right Patellar Tendon', bones: ['Knee_R'], region: 'knee',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Connects patella to tibial tuberosity. "Jumper\'s knee" site.',
    origin: 'Inferior pole of patella', insertion: 'Tibial tuberosity',
    cookStage: 1, cookDescription: 'Reactive from jumping/landing loads', commonPathology: 'Patellar tendinopathy, Osgood-Schlatter (adolescent)',
  },
  {
    id: 'supraspinatus_l', label: 'Left Supraspinatus Tendon', bones: ['Shoulder_L', 'Scapula_L'], region: 'shoulder',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Most commonly torn rotator cuff tendon. Critical zone of hypovascularity.',
    origin: 'Supraspinous fossa of scapula', insertion: 'Greater tuberosity of humerus (superior facet)',
    cookStage: 2, cookDescription: 'Dysrepair from chronic subacromial impingement', commonPathology: 'Rotator cuff tendinopathy, partial/full tear, impingement',
  },
  {
    id: 'supraspinatus_r', label: 'Right Supraspinatus Tendon', bones: ['Shoulder_R', 'Scapula_R'], region: 'shoulder',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Most commonly torn rotator cuff tendon. Critical zone of hypovascularity.',
    origin: 'Supraspinous fossa of scapula', insertion: 'Greater tuberosity of humerus (superior facet)',
    cookStage: 2, cookDescription: 'Dysrepair from chronic subacromial impingement', commonPathology: 'Rotator cuff tendinopathy, partial/full tear, impingement',
  },
  {
    id: 'biceps_long_head_l', label: 'Left Long Head of Biceps Tendon', bones: ['Shoulder_L'], region: 'shoulder',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Passes through bicipital groove. Common source of anterior shoulder pain.',
    origin: 'Supraglenoid tubercle', insertion: 'Radial tuberosity (via muscle belly)',
    cookStage: 1, cookDescription: 'Reactive from overhead activities', commonPathology: 'Biceps tendinopathy, SLAP lesion, subluxation',
  },
  {
    id: 'biceps_long_head_r', label: 'Right Long Head of Biceps Tendon', bones: ['Shoulder_R'], region: 'shoulder',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Passes through bicipital groove. Common source of anterior shoulder pain.',
    origin: 'Supraglenoid tubercle', insertion: 'Radial tuberosity (via muscle belly)',
    cookStage: 1, cookDescription: 'Reactive from overhead activities', commonPathology: 'Biceps tendinopathy, SLAP lesion, subluxation',
  },
  {
    id: 'common_extensor_l', label: 'Left Common Extensor Tendon', bones: ['Elbow_L'], region: 'elbow',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Origin of lateral epicondylitis ("tennis elbow").',
    origin: 'Lateral epicondyle of humerus', insertion: 'Extensor digitorum, ECR brevis',
    cookStage: 2, cookDescription: 'Dysrepair from repetitive grip/wrist extension', commonPathology: 'Lateral epicondylalgia (tennis elbow)',
  },
  {
    id: 'common_extensor_r', label: 'Right Common Extensor Tendon', bones: ['Elbow_R'], region: 'elbow',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Origin of lateral epicondylitis ("tennis elbow").',
    origin: 'Lateral epicondyle of humerus', insertion: 'Extensor digitorum, ECR brevis',
    cookStage: 2, cookDescription: 'Dysrepair from repetitive grip/wrist extension', commonPathology: 'Lateral epicondylalgia (tennis elbow)',
  },
  {
    id: 'common_flexor_l', label: 'Left Common Flexor Tendon', bones: ['Elbow_L'], region: 'elbow',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Origin of medial epicondylitis ("golfer\'s elbow").',
    origin: 'Medial epicondyle of humerus', insertion: 'Flexor digitorum superficialis, pronator teres',
    cookStage: 1, cookDescription: 'Reactive from throwing/gripping', commonPathology: 'Medial epicondylalgia (golfer\'s elbow)',
  },
  {
    id: 'common_flexor_r', label: 'Right Common Flexor Tendon', bones: ['Elbow_R'], region: 'elbow',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Origin of medial epicondylitis ("golfer\'s elbow").',
    origin: 'Medial epicondyle of humerus', insertion: 'Flexor digitorum superficialis, pronator teres',
    cookStage: 1, cookDescription: 'Reactive from throwing/gripping', commonPathology: 'Medial epicondylalgia (golfer\'s elbow)',
  },
  {
    id: 'gluteus_medius_l', label: 'Left Gluteus Medius Tendon', bones: ['Hip_L'], region: 'hip',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Greater trochanteric pain syndrome. Often misdiagnosed as bursitis.',
    origin: 'Gluteal surface of ilium', insertion: 'Greater trochanter (lateral and superoposterior facets)',
    cookStage: 2, cookDescription: 'Dysrepair from compressive/tensile overload', commonPathology: 'Greater trochanteric pain syndrome, gluteal tendinopathy',
  },
  {
    id: 'gluteus_medius_r', label: 'Right Gluteus Medius Tendon', bones: ['Hip_R'], region: 'hip',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Greater trochanteric pain syndrome. Often misdiagnosed as bursitis.',
    origin: 'Gluteal surface of ilium', insertion: 'Greater trochanter (lateral and superoposterior facets)',
    cookStage: 2, cookDescription: 'Dysrepair from compressive/tensile overload', commonPathology: 'Greater trochanteric pain syndrome, gluteal tendinopathy',
  },
  {
    id: 'plantar_fascia_l', label: 'Left Plantar Fascia', bones: ['Toes_L', 'Ankle_L'], region: 'foot',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Supports medial longitudinal arch. Pain at calcaneal insertion.',
    origin: 'Medial calcaneal tuberosity', insertion: 'Plantar plates of MTP joints',
    cookStage: 1, cookDescription: 'Reactive from increased loading', commonPathology: 'Plantar fasciopathy (plantar fasciitis)',
  },
  {
    id: 'plantar_fascia_r', label: 'Right Plantar Fascia', bones: ['Toes_R', 'Ankle_R'], region: 'foot',
    color: TISSUE_MODE_COLORS.tendon, clinicalNote: 'Supports medial longitudinal arch. Pain at calcaneal insertion.',
    origin: 'Medial calcaneal tuberosity', insertion: 'Plantar plates of MTP joints',
    cookStage: 1, cookDescription: 'Reactive from increased loading', commonPathology: 'Plantar fasciopathy (plantar fasciitis)',
  },
];

export const JOINT_SURFACE_DATA: JointSurfaceEntry[] = [
  {
    id: 'glenohumeral_l', label: 'Left Glenohumeral Joint', bones: ['Shoulder_L', 'Scapula_L'], region: 'shoulder',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Ball-and-socket joint with greatest ROM but least inherent stability.',
    jointType: 'Synovial ball-and-socket', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Flexion 180°, Abduction 180°, ER 90°, IR 70°',
  },
  {
    id: 'glenohumeral_r', label: 'Right Glenohumeral Joint', bones: ['Shoulder_R', 'Scapula_R'], region: 'shoulder',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Ball-and-socket joint with greatest ROM but least inherent stability.',
    jointType: 'Synovial ball-and-socket', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Flexion 180°, Abduction 180°, ER 90°, IR 70°',
  },
  {
    id: 'hip_l', label: 'Left Hip Joint', bones: ['Hip_L'], region: 'hip',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Deep ball-and-socket. OA prevalence increases with age. Labral tears common.',
    jointType: 'Synovial ball-and-socket', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Flexion 120°, Extension 30°, Abduction 45°, IR 35°, ER 45°',
  },
  {
    id: 'hip_r', label: 'Right Hip Joint', bones: ['Hip_R'], region: 'hip',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Deep ball-and-socket. OA prevalence increases with age. Labral tears common.',
    jointType: 'Synovial ball-and-socket', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Flexion 120°, Extension 30°, Abduction 45°, IR 35°, ER 45°',
  },
  {
    id: 'tibiofemoral_l', label: 'Left Tibiofemoral Joint', bones: ['Knee_L', 'HipPart2_L'], region: 'knee',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Modified hinge. Menisci distribute load. ACL/PCL provide stability.',
    jointType: 'Synovial modified hinge', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Flexion 135°, Extension 0-5° hyperextension',
  },
  {
    id: 'tibiofemoral_r', label: 'Right Tibiofemoral Joint', bones: ['Knee_R', 'HipPart2_R'], region: 'knee',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Modified hinge. Menisci distribute load. ACL/PCL provide stability.',
    jointType: 'Synovial modified hinge', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Flexion 135°, Extension 0-5° hyperextension',
  },
  {
    id: 'talocrural_l', label: 'Left Talocrural (Ankle) Joint', bones: ['Ankle_L'], region: 'ankle',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Hinge joint. Lateral ligament complex most commonly sprained.',
    jointType: 'Synovial hinge', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Dorsiflexion 20°, Plantarflexion 50°',
  },
  {
    id: 'talocrural_r', label: 'Right Talocrural (Ankle) Joint', bones: ['Ankle_R'], region: 'ankle',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Hinge joint. Lateral ligament complex most commonly sprained.',
    jointType: 'Synovial hinge', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Dorsiflexion 20°, Plantarflexion 50°',
  },
  {
    id: 'si_l', label: 'Left Sacroiliac Joint', bones: ['Root_M', 'Hip_L'], region: 'pelvis',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Amphiarthrosis with minimal motion. Source of low back/buttock pain.',
    jointType: 'Synovial (anterior) / Syndesmosis (posterior)', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: '2-4° nutation/counternutation',
  },
  {
    id: 'si_r', label: 'Right Sacroiliac Joint', bones: ['Root_M', 'Hip_R'], region: 'pelvis',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Amphiarthrosis with minimal motion. Source of low back/buttock pain.',
    jointType: 'Synovial (anterior) / Syndesmosis (posterior)', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: '2-4° nutation/counternutation',
  },
  {
    id: 'humeroulnar_l', label: 'Left Humeroulnar Joint', bones: ['Elbow_L'], region: 'elbow',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Trochlear hinge. UCL provides valgus stability.',
    jointType: 'Synovial hinge', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Flexion 150°, Extension 0°, Pronation 80°, Supination 80°',
  },
  {
    id: 'humeroulnar_r', label: 'Right Humeroulnar Joint', bones: ['Elbow_R'], region: 'elbow',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Trochlear hinge. UCL provides valgus stability.',
    jointType: 'Synovial hinge', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Flexion 150°, Extension 0°, Pronation 80°, Supination 80°',
  },
  {
    id: 'facet_lumbar', label: 'Lumbar Facet Joints (L1-L5)', bones: ['RootPart1_M', 'Spine1_M'], region: 'spine',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Zygapophyseal joints guide lumbar motion. Source of 15-45% of LBP.',
    jointType: 'Synovial plane (sagittal orientation)', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Flexion 40-60°, Extension 20-35°, Lateral flexion 15-20° each side',
  },
  {
    id: 'facet_cervical', label: 'Cervical Facet Joints (C2-C7)', bones: ['Neck_M', 'NeckPart1_M', 'NeckPart2_M'], region: 'spine',
    color: TISSUE_MODE_COLORS.joint, clinicalNote: 'Oriented ~45° allows coupled rotation. Common whiplash injury site.',
    jointType: 'Synovial plane (45° orientation)', degenerationLevel: 'normal', kellgrenLawrence: 0,
    normalROM: 'Flexion 45-50°, Extension 60-70°, Rotation 70-90° each side',
  },
];

export const NERVE_PATHWAY_DATA: NervePathwayEntry[] = [
  {
    id: 'median_l', label: 'Left Median Nerve', bones: ['Shoulder_L', 'Elbow_L', 'Wrist_L'], region: 'upper_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'C5-T1 roots. Most commonly entrapped at carpal tunnel.',
    pathway: ['Shoulder_L', 'ShoulderPart1_L', 'ShoulderPart2_L', 'Elbow_L', 'ElbowPart1_L', 'ElbowPart2_L', 'Wrist_L'],
    entrapmentSites: [
      { name: 'Carpal Tunnel', boneName: 'Wrist_L', clinicalTest: 'Phalen\'s, Tinel\'s, Durkan\'s compression' },
      { name: 'Pronator Teres Syndrome', boneName: 'Elbow_L', clinicalTest: 'Resisted pronation with elbow extended' },
    ],
    motorFunction: 'Pronation, wrist flexion, thumb opposition, index/middle finger flexion',
    sensoryTerritory: 'Palmar thumb, index, middle, radial half of ring finger',
  },
  {
    id: 'median_r', label: 'Right Median Nerve', bones: ['Shoulder_R', 'Elbow_R', 'Wrist_R'], region: 'upper_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'C5-T1 roots. Most commonly entrapped at carpal tunnel.',
    pathway: ['Shoulder_R', 'ShoulderPart1_R', 'ShoulderPart2_R', 'Elbow_R', 'ElbowPart1_R', 'ElbowPart2_R', 'Wrist_R'],
    entrapmentSites: [
      { name: 'Carpal Tunnel', boneName: 'Wrist_R', clinicalTest: 'Phalen\'s, Tinel\'s, Durkan\'s compression' },
      { name: 'Pronator Teres Syndrome', boneName: 'Elbow_R', clinicalTest: 'Resisted pronation with elbow extended' },
    ],
    motorFunction: 'Pronation, wrist flexion, thumb opposition, index/middle finger flexion',
    sensoryTerritory: 'Palmar thumb, index, middle, radial half of ring finger',
  },
  {
    id: 'ulnar_l', label: 'Left Ulnar Nerve', bones: ['Shoulder_L', 'Elbow_L', 'Wrist_L'], region: 'upper_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'C8-T1 roots. Vulnerable at cubital tunnel (elbow) and Guyon\'s canal (wrist).',
    pathway: ['Shoulder_L', 'ShoulderPart1_L', 'ShoulderPart2_L', 'Elbow_L', 'ElbowPart1_L', 'ElbowPart2_L', 'Wrist_L'],
    entrapmentSites: [
      { name: 'Cubital Tunnel (Elbow)', boneName: 'Elbow_L', clinicalTest: 'Elbow flexion test, Tinel\'s at cubital tunnel' },
      { name: 'Guyon\'s Canal (Wrist)', boneName: 'Wrist_L', clinicalTest: 'Tinel\'s at Guyon\'s canal' },
    ],
    motorFunction: 'Finger abduction/adduction, grip strength, hypothenar muscles',
    sensoryTerritory: 'Small finger, ulnar half of ring finger (palmar & dorsal)',
  },
  {
    id: 'ulnar_r', label: 'Right Ulnar Nerve', bones: ['Shoulder_R', 'Elbow_R', 'Wrist_R'], region: 'upper_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'C8-T1 roots. Vulnerable at cubital tunnel (elbow) and Guyon\'s canal (wrist).',
    pathway: ['Shoulder_R', 'ShoulderPart1_R', 'ShoulderPart2_R', 'Elbow_R', 'ElbowPart1_R', 'ElbowPart2_R', 'Wrist_R'],
    entrapmentSites: [
      { name: 'Cubital Tunnel (Elbow)', boneName: 'Elbow_R', clinicalTest: 'Elbow flexion test, Tinel\'s at cubital tunnel' },
      { name: 'Guyon\'s Canal (Wrist)', boneName: 'Wrist_R', clinicalTest: 'Tinel\'s at Guyon\'s canal' },
    ],
    motorFunction: 'Finger abduction/adduction, grip strength, hypothenar muscles',
    sensoryTerritory: 'Small finger, ulnar half of ring finger (palmar & dorsal)',
  },
  {
    id: 'sciatic_l', label: 'Left Sciatic Nerve', bones: ['Hip_L', 'HipPart1_L', 'HipPart2_L', 'Knee_L'], region: 'lower_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'L4-S3 roots. Largest nerve in body. Piriformis syndrome = entrapment.',
    pathway: ['Root_M', 'Hip_L', 'HipPart1_L', 'HipPart2_L', 'Knee_L'],
    entrapmentSites: [
      { name: 'Piriformis Syndrome', boneName: 'Hip_L', clinicalTest: 'FAIR test, Pace\'s sign, Freiberg\'s test' },
      { name: 'Deep Gluteal Space', boneName: 'Hip_L', clinicalTest: 'Seated piriformis stretch, active piriformis test' },
    ],
    motorFunction: 'Knee flexion (hamstrings), all muscles below knee (via tibial/peroneal)',
    sensoryTerritory: 'Posterior thigh, entire leg and foot (via branches)',
  },
  {
    id: 'sciatic_r', label: 'Right Sciatic Nerve', bones: ['Hip_R', 'HipPart1_R', 'HipPart2_R', 'Knee_R'], region: 'lower_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'L4-S3 roots. Largest nerve in body. Piriformis syndrome = entrapment.',
    pathway: ['Root_M', 'Hip_R', 'HipPart1_R', 'HipPart2_R', 'Knee_R'],
    entrapmentSites: [
      { name: 'Piriformis Syndrome', boneName: 'Hip_R', clinicalTest: 'FAIR test, Pace\'s sign, Freiberg\'s test' },
      { name: 'Deep Gluteal Space', boneName: 'Hip_R', clinicalTest: 'Seated piriformis stretch, active piriformis test' },
    ],
    motorFunction: 'Knee flexion (hamstrings), all muscles below knee (via tibial/peroneal)',
    sensoryTerritory: 'Posterior thigh, entire leg and foot (via branches)',
  },
  {
    id: 'femoral_l', label: 'Left Femoral Nerve', bones: ['Hip_L', 'HipPart1_L', 'HipPart2_L'], region: 'lower_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'L2-L4 roots. Passes under inguinal ligament. Motor to quads.',
    pathway: ['RootPart1_M', 'Hip_L', 'HipPart1_L', 'HipPart2_L', 'Knee_L'],
    entrapmentSites: [
      { name: 'Inguinal Ligament', boneName: 'Hip_L', clinicalTest: 'Reverse SLR (prone knee bend), femoral nerve stretch' },
    ],
    motorFunction: 'Knee extension (quadriceps), hip flexion (iliopsoas)',
    sensoryTerritory: 'Anterior thigh, medial leg (via saphenous branch)',
  },
  {
    id: 'femoral_r', label: 'Right Femoral Nerve', bones: ['Hip_R', 'HipPart1_R', 'HipPart2_R'], region: 'lower_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'L2-L4 roots. Passes under inguinal ligament. Motor to quads.',
    pathway: ['RootPart1_M', 'Hip_R', 'HipPart1_R', 'HipPart2_R', 'Knee_R'],
    entrapmentSites: [
      { name: 'Inguinal Ligament', boneName: 'Hip_R', clinicalTest: 'Reverse SLR (prone knee bend), femoral nerve stretch' },
    ],
    motorFunction: 'Knee extension (quadriceps), hip flexion (iliopsoas)',
    sensoryTerritory: 'Anterior thigh, medial leg (via saphenous branch)',
  },
  {
    id: 'peroneal_l', label: 'Left Common Peroneal Nerve', bones: ['Knee_L', 'Ankle_L'], region: 'lower_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'L4-S2. Wraps around fibular head — vulnerable to compression.',
    pathway: ['Knee_L', 'Ankle_L'],
    entrapmentSites: [
      { name: 'Fibular Head', boneName: 'Knee_L', clinicalTest: 'Tinel\'s at fibular head, ankle dorsiflexion weakness' },
    ],
    motorFunction: 'Ankle dorsiflexion, toe extension, foot eversion',
    sensoryTerritory: 'Lateral leg, dorsum of foot',
  },
  {
    id: 'peroneal_r', label: 'Right Common Peroneal Nerve', bones: ['Knee_R', 'Ankle_R'], region: 'lower_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'L4-S2. Wraps around fibular head — vulnerable to compression.',
    pathway: ['Knee_R', 'Ankle_R'],
    entrapmentSites: [
      { name: 'Fibular Head', boneName: 'Knee_R', clinicalTest: 'Tinel\'s at fibular head, ankle dorsiflexion weakness' },
    ],
    motorFunction: 'Ankle dorsiflexion, toe extension, foot eversion',
    sensoryTerritory: 'Lateral leg, dorsum of foot',
  },
  {
    id: 'radial_l', label: 'Left Radial Nerve', bones: ['Shoulder_L', 'Elbow_L', 'Wrist_L'], region: 'upper_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'C5-T1 roots. Spiral groove of humerus = fracture risk.',
    pathway: ['Shoulder_L', 'ShoulderPart1_L', 'ShoulderPart2_L', 'Elbow_L', 'ElbowPart1_L', 'Wrist_L'],
    entrapmentSites: [
      { name: 'Spiral Groove (Saturday Night Palsy)', boneName: 'ShoulderPart1_L', clinicalTest: 'Wrist drop test, finger extension' },
      { name: 'Posterior Interosseous Syndrome', boneName: 'Elbow_L', clinicalTest: 'Resisted middle finger extension' },
    ],
    motorFunction: 'Wrist extension, finger extension, supination, elbow flexion (brachioradialis)',
    sensoryTerritory: 'Posterior arm/forearm, dorsal hand (first 3.5 digits)',
  },
  {
    id: 'radial_r', label: 'Right Radial Nerve', bones: ['Shoulder_R', 'Elbow_R', 'Wrist_R'], region: 'upper_limb',
    color: TISSUE_MODE_COLORS.nerve, clinicalNote: 'C5-T1 roots. Spiral groove of humerus = fracture risk.',
    pathway: ['Shoulder_R', 'ShoulderPart1_R', 'ShoulderPart2_R', 'Elbow_R', 'ElbowPart1_R', 'Wrist_R'],
    entrapmentSites: [
      { name: 'Spiral Groove (Saturday Night Palsy)', boneName: 'ShoulderPart1_R', clinicalTest: 'Wrist drop test, finger extension' },
      { name: 'Posterior Interosseous Syndrome', boneName: 'Elbow_R', clinicalTest: 'Resisted middle finger extension' },
    ],
    motorFunction: 'Wrist extension, finger extension, supination, elbow flexion (brachioradialis)',
    sensoryTerritory: 'Posterior arm/forearm, dorsal hand (first 3.5 digits)',
  },
];

export const FASCIAL_LAYER_DATA: FascialLayerEntry[] = [
  {
    id: 'sfl', label: 'Superficial Front Line', bones: ['Ankle_L', 'Ankle_R', 'Knee_L', 'Knee_R', 'HipPart2_L', 'HipPart2_R', 'Chest_M', 'NeckPart1_M'],
    region: 'full_body', color: TISSUE_MODE_COLORS.fascia,
    clinicalNote: 'Connects toes to skull anteriorly. Flexion posture when shortened.',
    chainName: 'Superficial Front Line', depth: 'superficial', tensionDirection: 'Anterior longitudinal',
  },
  {
    id: 'sbl', label: 'Superficial Back Line', bones: ['Toes_L', 'Toes_R', 'Ankle_L', 'Ankle_R', 'Knee_L', 'Knee_R', 'Hip_L', 'Hip_R', 'RootPart1_M', 'Spine1_M', 'Chest_M', 'Head_M'],
    region: 'full_body', color: TISSUE_MODE_COLORS.fascia,
    clinicalNote: 'Connects toes to brow ridge posteriorly. Extension posture when shortened.',
    chainName: 'Superficial Back Line', depth: 'superficial', tensionDirection: 'Posterior longitudinal',
  },
  {
    id: 'lateral_l', label: 'Left Lateral Line', bones: ['Ankle_L', 'Knee_L', 'HipPart1_L', 'Hip_L', 'Spine1_M', 'Chest_M', 'Scapula_L', 'Head_M'],
    region: 'full_body', color: TISSUE_MODE_COLORS.fascia,
    clinicalNote: 'Lateral stabilization from ankle to ear. Lateral shift when imbalanced.',
    chainName: 'Left Lateral Line', depth: 'superficial', tensionDirection: 'Lateral longitudinal',
  },
  {
    id: 'lateral_r', label: 'Right Lateral Line', bones: ['Ankle_R', 'Knee_R', 'HipPart1_R', 'Hip_R', 'Spine1_M', 'Chest_M', 'Scapula_R', 'Head_M'],
    region: 'full_body', color: TISSUE_MODE_COLORS.fascia,
    clinicalNote: 'Lateral stabilization from ankle to ear. Lateral shift when imbalanced.',
    chainName: 'Right Lateral Line', depth: 'superficial', tensionDirection: 'Lateral longitudinal',
  },
  {
    id: 'spiral', label: 'Spiral Line', bones: ['Head_M', 'NeckPart1_M', 'Chest_M', 'Spine1_M', 'RootPart1_M', 'Hip_L', 'Hip_R', 'Knee_L', 'Knee_R', 'Ankle_L', 'Ankle_R'],
    region: 'full_body', color: TISSUE_MODE_COLORS.fascia,
    clinicalNote: 'Wraps body in a double helix. Governs rotational patterns.',
    chainName: 'Spiral Line', depth: 'intermediate', tensionDirection: 'Helical / rotational',
  },
  {
    id: 'dfl', label: 'Deep Front Line', bones: ['Ankle_L', 'Ankle_R', 'Knee_L', 'Knee_R', 'Hip_L', 'Hip_R', 'RootPart1_M', 'RootPart2_M', 'Spine1_M', 'Chest_M', 'NeckPart2_M', 'Head_M'],
    region: 'full_body', color: TISSUE_MODE_COLORS.fascia,
    clinicalNote: 'Core myofascial column. Breathing, core stability, visceral support.',
    chainName: 'Deep Front Line', depth: 'deep', tensionDirection: 'Central vertical',
  },
  {
    id: 'front_arm_l', label: 'Left Front Arm Line', bones: ['Chest_M', 'Scapula_L', 'Shoulder_L', 'ShoulderPart1_L', 'Elbow_L', 'Wrist_L'],
    region: 'upper_limb', color: TISSUE_MODE_COLORS.fascia,
    clinicalNote: 'Anterior chain from chest to palm. Shortened in desk posture.',
    chainName: 'Left Deep Front Arm Line', depth: 'deep', tensionDirection: 'Anterior descending',
  },
  {
    id: 'front_arm_r', label: 'Right Front Arm Line', bones: ['Chest_M', 'Scapula_R', 'Shoulder_R', 'ShoulderPart1_R', 'Elbow_R', 'Wrist_R'],
    region: 'upper_limb', color: TISSUE_MODE_COLORS.fascia,
    clinicalNote: 'Anterior chain from chest to palm. Shortened in desk posture.',
    chainName: 'Right Deep Front Arm Line', depth: 'deep', tensionDirection: 'Anterior descending',
  },
];

export function getTissueEntriesForMode(mode: TissueViewMode): TissueOverlayEntry[] {
  switch (mode) {
    case 'tendon': return TENDON_DATA;
    case 'joint': return JOINT_SURFACE_DATA;
    case 'nerve': return NERVE_PATHWAY_DATA;
    case 'fascia': return FASCIAL_LAYER_DATA;
    case 'muscle': return [];
    default: return [];
  }
}

export function getAllHighlightBonesForMode(mode: TissueViewMode): string[] {
  const entries = getTissueEntriesForMode(mode);
  const bones = new Set<string>();
  for (const entry of entries) {
    for (const bone of entry.bones) {
      bones.add(bone);
    }
  }
  return Array.from(bones);
}

export function getEntryByBone(mode: TissueViewMode, boneName: string): TissueOverlayEntry | undefined {
  const entries = getTissueEntriesForMode(mode);
  return entries.find(entry => entry.bones.includes(boneName));
}
