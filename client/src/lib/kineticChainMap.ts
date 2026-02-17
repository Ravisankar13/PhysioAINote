import type { AnatomicalRegion } from '@/components/skeleton/PureThreeGLBViewer';

export interface KineticChainConnection {
  region: AnatomicalRegion;
  label: string;
  relationship: string;
  clinicalReason: string;
  testPrompt: string;
  sliderKey?: string;
}

export interface KineticChainEntry {
  connections: KineticChainConnection[];
}

const KINETIC_CHAIN_MAP: Record<string, KineticChainEntry> = {
  "Left Shoulder": {
    connections: [
      { region: "thoracic_spine", label: "Thoracic Spine", relationship: "Scapulothoracic rhythm", clinicalReason: "Thoracic kyphosis limits scapular upward rotation, reducing overhead reach and increasing impingement risk", testPrompt: "Flex the thoracic spine forward to see how increased kyphosis affects shoulder mechanics", sliderKey: "thoracicFlexion" },
      { region: "cervical_spine", label: "Cervical Spine", relationship: "Cervicoscapular connection", clinicalReason: "Cervical radiculopathy (C5-C6) can refer pain to the shoulder and mimic rotator cuff pathology", testPrompt: "Side-bend the neck toward the painful side to check for cervical contribution", sliderKey: "cervicalLateralBend" },
      { region: "left_elbow", label: "Left Elbow", relationship: "Distal chain loading", clinicalReason: "Elbow dysfunction alters upper limb kinetics, increasing compensatory load on the shoulder", testPrompt: "Flex the elbow to see how distal joint position affects proximal shoulder load", sliderKey: "leftElbowFlexion" },
      { region: "right_shoulder", label: "Right Shoulder", relationship: "Contralateral compensation", clinicalReason: "Overuse of the opposite shoulder to compensate can develop bilateral symptoms", testPrompt: "Observe the right shoulder position — asymmetry may indicate compensatory patterns" },
      { region: "lumbar_spine", label: "Lumbar/Pelvis", relationship: "Core stability chain", clinicalReason: "Poor core stability reduces the proximal base for shoulder function, increasing deltoid and rotator cuff demand", testPrompt: "Extend the lumbar spine to check how pelvic tilt affects shoulder posture", sliderKey: "lumbarFlexion" },
    ],
  },
  "Right Shoulder": {
    connections: [
      { region: "thoracic_spine", label: "Thoracic Spine", relationship: "Scapulothoracic rhythm", clinicalReason: "Thoracic kyphosis limits scapular upward rotation, reducing overhead reach and increasing impingement risk", testPrompt: "Flex the thoracic spine forward to see how increased kyphosis affects shoulder mechanics", sliderKey: "thoracicFlexion" },
      { region: "cervical_spine", label: "Cervical Spine", relationship: "Cervicoscapular connection", clinicalReason: "Cervical radiculopathy (C5-C6) can refer pain to the shoulder and mimic rotator cuff pathology", testPrompt: "Side-bend the neck toward the painful side to check for cervical contribution", sliderKey: "cervicalLateralBend" },
      { region: "right_elbow", label: "Right Elbow", relationship: "Distal chain loading", clinicalReason: "Elbow dysfunction alters upper limb kinetics, increasing compensatory load on the shoulder", testPrompt: "Flex the elbow to see how distal joint position affects proximal shoulder load", sliderKey: "rightElbowFlexion" },
      { region: "left_shoulder", label: "Left Shoulder", relationship: "Contralateral compensation", clinicalReason: "Overuse of the opposite shoulder to compensate can develop bilateral symptoms", testPrompt: "Observe the left shoulder position — asymmetry may indicate compensatory patterns" },
      { region: "lumbar_spine", label: "Lumbar/Pelvis", relationship: "Core stability chain", clinicalReason: "Poor core stability reduces the proximal base for shoulder function, increasing deltoid and rotator cuff demand", testPrompt: "Extend the lumbar spine to check how pelvic tilt affects shoulder posture", sliderKey: "lumbarFlexion" },
    ],
  },
  "Cervical Spine": {
    connections: [
      { region: "thoracic_spine", label: "Thoracic Spine", relationship: "Spinal coupling", clinicalReason: "Upper thoracic stiffness forces compensatory hypermobility at the cervicothoracic junction (C7-T1)", testPrompt: "Flex the thoracic spine to see how mid-back stiffness shifts load to the neck", sliderKey: "thoracicFlexion" },
      { region: "left_shoulder", label: "Left Shoulder", relationship: "Upper trapezius/levator", clinicalReason: "Elevated shoulder posture increases upper trapezius and levator scapulae tension, contributing to neck pain", testPrompt: "Elevate the left shoulder to see how shoulder posture affects cervical loading" },
      { region: "right_shoulder", label: "Right Shoulder", relationship: "Upper trapezius/levator", clinicalReason: "Elevated shoulder posture increases upper trapezius and levator scapulae tension, contributing to neck pain", testPrompt: "Elevate the right shoulder to see how shoulder posture affects cervical loading" },
      { region: "lumbar_spine", label: "Lumbar Spine", relationship: "Global spinal alignment", clinicalReason: "Lumbar lordosis changes shift the entire spinal curve, affecting cervical posture through the sagittal balance chain", testPrompt: "Flex the lumbar spine to see how lower back posture affects head-forward position", sliderKey: "lumbarFlexion" },
    ],
  },
  "Thoracic Spine": {
    connections: [
      { region: "cervical_spine", label: "Cervical Spine", relationship: "Cervicothoracic junction", clinicalReason: "Thoracic kyphosis increases forward head posture, loading the cervical extensors and upper cervical joints", testPrompt: "Extend the cervical spine to see how it compensates for thoracic kyphosis", sliderKey: "cervicalFlexion" },
      { region: "lumbar_spine", label: "Lumbar Spine", relationship: "Thoracolumbar junction", clinicalReason: "Reduced thoracic rotation forces compensatory lumbar rotation, increasing disc and facet stress at T12-L1", testPrompt: "Rotate the thoracic spine to see how rotation restriction affects lumbar load", sliderKey: "thoracicRotation" },
      { region: "left_shoulder", label: "Left Shoulder", relationship: "Scapulothoracic articulation", clinicalReason: "The scapula glides on the thorax — thoracic shape directly determines scapular resting position and movement quality", testPrompt: "Flex the thoracic spine to see how scapular position changes with kyphosis", sliderKey: "thoracicFlexion" },
      { region: "right_shoulder", label: "Right Shoulder", relationship: "Scapulothoracic articulation", clinicalReason: "The scapula glides on the thorax — thoracic shape directly determines scapular resting position and movement quality", testPrompt: "Flex the thoracic spine to see how scapular position changes with kyphosis", sliderKey: "thoracicFlexion" },
    ],
  },
  "Lumbar Spine": {
    connections: [
      { region: "pelvis", label: "Pelvis", relationship: "Lumbopelvic rhythm", clinicalReason: "Anterior pelvic tilt increases lumbar lordosis and compressive loading on facet joints; posterior tilt flattens the spine and increases disc load", testPrompt: "Tilt the pelvis forward to see how pelvic position changes lumbar lordosis", sliderKey: "pelvisTilt" },
      { region: "left_hip", label: "Left Hip", relationship: "Hip-spine interaction", clinicalReason: "Limited hip flexion/extension forces lumbar compensatory motion during activities like bending and walking", testPrompt: "Flex the left hip to see how hip restriction increases lumbar flexion demand", sliderKey: "leftHipFlexion" },
      { region: "right_hip", label: "Right Hip", relationship: "Hip-spine interaction", clinicalReason: "Limited hip flexion/extension forces lumbar compensatory motion during activities like bending and walking", testPrompt: "Flex the right hip to see how hip restriction increases lumbar flexion demand", sliderKey: "rightHipFlexion" },
      { region: "thoracic_spine", label: "Thoracic Spine", relationship: "Thoracolumbar junction", clinicalReason: "Stiff thoracic spine transfers rotational and flexion demands to the lumbar region", testPrompt: "Flex the thoracic spine to see how upper back stiffness increases lumbar load", sliderKey: "thoracicFlexion" },
    ],
  },
  "Left Hip": {
    connections: [
      { region: "lumbar_spine", label: "Lumbar Spine", relationship: "Lumbopelvic rhythm", clinicalReason: "Hip flexion restriction causes early and excessive lumbar flexion during bending tasks", testPrompt: "Flex the lumbar spine to see how it compensates for limited hip mobility", sliderKey: "lumbarFlexion" },
      { region: "left_knee", label: "Left Knee", relationship: "Lower extremity chain", clinicalReason: "Hip abductor weakness leads to dynamic knee valgus, increasing medial knee stress during weight-bearing", testPrompt: "Observe the left knee alignment — hip weakness may cause the knee to collapse inward", sliderKey: "leftKneeFlexion" },
      { region: "pelvis", label: "Pelvis", relationship: "Pelvic stability", clinicalReason: "Unilateral hip dysfunction creates pelvic obliquity and contralateral compensation patterns", testPrompt: "Tilt the pelvis to see how hip dysfunction creates asymmetric loading", sliderKey: "pelvisTilt" },
      { region: "right_hip", label: "Right Hip", relationship: "Contralateral compensation", clinicalReason: "Pain avoidance shifts weight to the contralateral hip, potentially overloading it", testPrompt: "Check right hip loading — compensatory weight shift may be present" },
    ],
  },
  "Right Hip": {
    connections: [
      { region: "lumbar_spine", label: "Lumbar Spine", relationship: "Lumbopelvic rhythm", clinicalReason: "Hip flexion restriction causes early and excessive lumbar flexion during bending tasks", testPrompt: "Flex the lumbar spine to see how it compensates for limited hip mobility", sliderKey: "lumbarFlexion" },
      { region: "right_knee", label: "Right Knee", relationship: "Lower extremity chain", clinicalReason: "Hip abductor weakness leads to dynamic knee valgus, increasing medial knee stress during weight-bearing", testPrompt: "Observe the right knee alignment — hip weakness may cause the knee to collapse inward", sliderKey: "rightKneeFlexion" },
      { region: "pelvis", label: "Pelvis", relationship: "Pelvic stability", clinicalReason: "Unilateral hip dysfunction creates pelvic obliquity and contralateral compensation patterns", testPrompt: "Tilt the pelvis to see how hip dysfunction creates asymmetric loading", sliderKey: "pelvisTilt" },
      { region: "left_hip", label: "Left Hip", relationship: "Contralateral compensation", clinicalReason: "Pain avoidance shifts weight to the contralateral hip, potentially overloading it", testPrompt: "Check left hip loading — compensatory weight shift may be present" },
    ],
  },
  "Left Knee": {
    connections: [
      { region: "left_hip", label: "Left Hip", relationship: "Proximal chain control", clinicalReason: "Hip abductor and external rotator weakness allows femoral internal rotation and dynamic valgus at the knee", testPrompt: "Rotate the hip internally to see how it affects knee valgus alignment", sliderKey: "leftHipRotation" },
      { region: "left_ankle", label: "Left Ankle", relationship: "Distal chain influence", clinicalReason: "Ankle dorsiflexion restriction forces compensatory knee hyperextension or valgus during squatting and stairs", testPrompt: "Dorsiflex the ankle to see how ankle mobility affects knee mechanics", sliderKey: "leftAnkleDorsiflexion" },
      { region: "lumbar_spine", label: "Lumbar Spine", relationship: "Global chain", clinicalReason: "Altered gait from knee pain changes lumbar loading patterns", testPrompt: "Observe how knee position affects overall spinal alignment" },
    ],
  },
  "Right Knee": {
    connections: [
      { region: "right_hip", label: "Right Hip", relationship: "Proximal chain control", clinicalReason: "Hip abductor and external rotator weakness allows femoral internal rotation and dynamic valgus at the knee", testPrompt: "Rotate the hip internally to see how it affects knee valgus alignment", sliderKey: "rightHipRotation" },
      { region: "right_ankle", label: "Right Ankle", relationship: "Distal chain influence", clinicalReason: "Ankle dorsiflexion restriction forces compensatory knee hyperextension or valgus during squatting and stairs", testPrompt: "Dorsiflex the ankle to see how ankle mobility affects knee mechanics", sliderKey: "rightAnkleDorsiflexion" },
      { region: "lumbar_spine", label: "Lumbar Spine", relationship: "Global chain", clinicalReason: "Altered gait from knee pain changes lumbar loading patterns", testPrompt: "Observe how knee position affects overall spinal alignment" },
    ],
  },
  "Left Ankle": {
    connections: [
      { region: "left_knee", label: "Left Knee", relationship: "Proximal chain", clinicalReason: "Limited ankle dorsiflexion increases knee flexion demand or causes compensatory toe-out gait", testPrompt: "Flex the knee to see how it compensates for limited ankle mobility", sliderKey: "leftKneeFlexion" },
      { region: "left_hip", label: "Left Hip", relationship: "Ascending chain", clinicalReason: "Ankle instability creates ascending dysfunction through the knee to the hip via altered ground reaction forces", testPrompt: "Observe how ankle position affects hip alignment in the chain" },
    ],
  },
  "Right Ankle": {
    connections: [
      { region: "right_knee", label: "Right Knee", relationship: "Proximal chain", clinicalReason: "Limited ankle dorsiflexion increases knee flexion demand or causes compensatory toe-out gait", testPrompt: "Flex the knee to see how it compensates for limited ankle mobility", sliderKey: "rightKneeFlexion" },
      { region: "right_hip", label: "Right Hip", relationship: "Ascending chain", clinicalReason: "Ankle instability creates ascending dysfunction through the knee to the hip via altered ground reaction forces", testPrompt: "Observe how ankle position affects hip alignment in the chain" },
    ],
  },
  "Left Elbow": {
    connections: [
      { region: "left_shoulder", label: "Left Shoulder", relationship: "Proximal chain", clinicalReason: "Shoulder dysfunction alters elbow loading — shoulder internal rotation deficit increases valgus stress at the elbow", testPrompt: "Rotate the shoulder to see how shoulder position changes elbow loading" },
      { region: "cervical_spine", label: "Cervical Spine", relationship: "Neural pathway", clinicalReason: "C6-C7 radiculopathy can refer pain to the lateral elbow, mimicking lateral epicondylalgia", testPrompt: "Side-bend the neck to check for cervical contribution to elbow symptoms", sliderKey: "cervicalLateralBend" },
    ],
  },
  "Right Elbow": {
    connections: [
      { region: "right_shoulder", label: "Right Shoulder", relationship: "Proximal chain", clinicalReason: "Shoulder dysfunction alters elbow loading — shoulder internal rotation deficit increases valgus stress at the elbow", testPrompt: "Rotate the shoulder to see how shoulder position changes elbow loading" },
      { region: "cervical_spine", label: "Cervical Spine", relationship: "Neural pathway", clinicalReason: "C6-C7 radiculopathy can refer pain to the lateral elbow, mimicking lateral epicondylalgia", testPrompt: "Side-bend the neck to check for cervical contribution to elbow symptoms", sliderKey: "cervicalLateralBend" },
    ],
  },
  "Pelvis": {
    connections: [
      { region: "lumbar_spine", label: "Lumbar Spine", relationship: "Lumbopelvic rhythm", clinicalReason: "Pelvic tilt directly controls lumbar lordosis — anterior tilt increases extension, posterior tilt increases flexion loading", testPrompt: "Flex the lumbar spine to see how it couples with pelvic position", sliderKey: "lumbarFlexion" },
      { region: "left_hip", label: "Left Hip", relationship: "Acetabular orientation", clinicalReason: "Pelvic obliquity changes the acetabular angle, affecting hip joint congruency and labral loading", testPrompt: "Flex the left hip to see how pelvic position affects hip mechanics", sliderKey: "leftHipFlexion" },
      { region: "right_hip", label: "Right Hip", relationship: "Acetabular orientation", clinicalReason: "Pelvic obliquity changes the acetabular angle, affecting hip joint congruency and labral loading", testPrompt: "Flex the right hip to see how pelvic position affects hip mechanics", sliderKey: "rightHipFlexion" },
      { region: "thoracic_spine", label: "Thoracic Spine", relationship: "Global spinal balance", clinicalReason: "Pelvic tilt shifts the center of gravity, requiring thoracic compensation to maintain upright posture", testPrompt: "Observe thoracic spine position in response to pelvic tilt changes" },
    ],
  },
};

const LABEL_ALIASES: Record<string, string> = {
  "left shoulder": "Left Shoulder",
  "right shoulder": "Right Shoulder",
  "cervical spine": "Cervical Spine",
  "neck": "Cervical Spine",
  "thoracic spine": "Thoracic Spine",
  "mid back": "Thoracic Spine",
  "upper back": "Thoracic Spine",
  "lumbar spine": "Lumbar Spine",
  "lower back": "Lumbar Spine",
  "low back": "Lumbar Spine",
  "left hip": "Left Hip",
  "right hip": "Right Hip",
  "left knee": "Left Knee",
  "right knee": "Right Knee",
  "left ankle": "Left Ankle",
  "left foot": "Left Ankle",
  "right ankle": "Right Ankle",
  "right foot": "Right Ankle",
  "left elbow": "Left Elbow",
  "right elbow": "Right Elbow",
  "pelvis": "Pelvis",
  "sacrum": "Pelvis",
  "si joint": "Pelvis",
  "sacroiliac": "Pelvis",
};

const LANDMARK_TO_REGION: Record<string, string> = {
  "left ac joint": "Left Shoulder",
  "right ac joint": "Right Shoulder",
  "left coracoid process": "Left Shoulder",
  "right coracoid process": "Right Shoulder",
  "left glenohumeral joint": "Left Shoulder",
  "right glenohumeral joint": "Right Shoulder",
  "left subacromial space": "Left Shoulder",
  "right subacromial space": "Right Shoulder",
  "left bicipital groove": "Left Shoulder",
  "right bicipital groove": "Right Shoulder",
  "left acromion": "Left Shoulder",
  "right acromion": "Right Shoulder",
  "left lateral epicondyle": "Left Elbow",
  "right lateral epicondyle": "Right Elbow",
  "left medial epicondyle": "Left Elbow",
  "right medial epicondyle": "Right Elbow",
  "left olecranon": "Left Elbow",
  "right olecranon": "Right Elbow",
  "left radial head": "Left Elbow",
  "right radial head": "Right Elbow",
  "left radial styloid": "Left Elbow",
  "right radial styloid": "Right Elbow",
  "left ulnar styloid": "Left Elbow",
  "right ulnar styloid": "Right Elbow",
  "left carpal tunnel": "Left Elbow",
  "right carpal tunnel": "Right Elbow",
  "left greater trochanter": "Left Hip",
  "right greater trochanter": "Right Hip",
  "left lesser trochanter": "Left Hip",
  "right lesser trochanter": "Right Hip",
  "left acetabulum": "Left Hip",
  "right acetabulum": "Right Hip",
  "left asis": "Pelvis",
  "right asis": "Pelvis",
  "left psis": "Pelvis",
  "right psis": "Pelvis",
  "left ischial tuberosity": "Pelvis",
  "right ischial tuberosity": "Pelvis",
  "left iliac crest": "Pelvis",
  "right iliac crest": "Pelvis",
  "pubic symphysis": "Pelvis",
  "left patella": "Left Knee",
  "right patella": "Right Knee",
  "left tibial tuberosity": "Left Knee",
  "right tibial tuberosity": "Right Knee",
  "left fibular head": "Left Knee",
  "right fibular head": "Right Knee",
  "left medial joint line": "Left Knee",
  "right medial joint line": "Right Knee",
  "left lateral joint line": "Left Knee",
  "right lateral joint line": "Right Knee",
  "left popliteal fossa": "Left Knee",
  "right popliteal fossa": "Right Knee",
  "left lateral malleolus": "Left Ankle",
  "right lateral malleolus": "Right Ankle",
  "left medial malleolus": "Left Ankle",
  "right medial malleolus": "Right Ankle",
  "left calcaneus": "Left Ankle",
  "right calcaneus": "Right Ankle",
  "left navicular": "Left Ankle",
  "right navicular": "Right Ankle",
  "left 1st metatarsal head": "Left Ankle",
  "right 1st metatarsal head": "Right Ankle",
  "left 5th metatarsal head": "Left Ankle",
  "right 5th metatarsal head": "Right Ankle",
  "left plantar fascia origin": "Left Ankle",
  "right plantar fascia origin": "Right Ankle",
  "left achilles insertion": "Left Ankle",
  "right achilles insertion": "Right Ankle",
  "c1 vertebra": "Cervical Spine",
  "c2 vertebra": "Cervical Spine",
  "c3 vertebra": "Cervical Spine",
  "c4 vertebra": "Cervical Spine",
  "c5 vertebra": "Cervical Spine",
  "c6 vertebra": "Cervical Spine",
  "c7 vertebra": "Cervical Spine",
  "c7 spinous process": "Cervical Spine",
  "left tmj": "Cervical Spine",
  "right tmj": "Cervical Spine",
  "occiput": "Cervical Spine",
  "left mastoid process": "Cervical Spine",
  "right mastoid process": "Cervical Spine",
  "t1 vertebra": "Thoracic Spine",
  "t2 vertebra": "Thoracic Spine",
  "t3 vertebra": "Thoracic Spine",
  "t4 vertebra": "Thoracic Spine",
  "t5 vertebra": "Thoracic Spine",
  "t6 vertebra": "Thoracic Spine",
  "t7 vertebra": "Thoracic Spine",
  "t8 vertebra": "Thoracic Spine",
  "t9 vertebra": "Thoracic Spine",
  "t10 vertebra": "Thoracic Spine",
  "t11 vertebra": "Thoracic Spine",
  "t12 vertebra": "Thoracic Spine",
  "l1 vertebra": "Lumbar Spine",
  "l2 vertebra": "Lumbar Spine",
  "l3 vertebra": "Lumbar Spine",
  "l4 vertebra": "Lumbar Spine",
  "l5 vertebra": "Lumbar Spine",
  "s1 vertebra": "Lumbar Spine",
  "l1-l2 disc": "Lumbar Spine",
  "l2-l3 disc": "Lumbar Spine",
  "l3-l4 disc": "Lumbar Spine",
  "l4-l5 disc": "Lumbar Spine",
  "l5-s1 disc": "Lumbar Spine",
  "left l4-l5 facet": "Lumbar Spine",
  "right l4-l5 facet": "Lumbar Spine",
  "left l5-s1 facet": "Lumbar Spine",
  "right l5-s1 facet": "Lumbar Spine",
  "left l3-l4 facet": "Lumbar Spine",
  "right l3-l4 facet": "Lumbar Spine",
  "left costochondral junction": "Thoracic Spine",
  "right costochondral junction": "Thoracic Spine",
  "left costovertebral joint": "Thoracic Spine",
  "right costovertebral joint": "Thoracic Spine",
  "xiphoid process": "Thoracic Spine",
  "manubrium": "Thoracic Spine",
  "left sc joint": "Left Shoulder",
  "right sc joint": "Right Shoulder",
  "left sternoclavicular joint": "Left Shoulder",
  "right sternoclavicular joint": "Right Shoulder",
};

export function getKineticChainConnections(anatomicalLabel: string): KineticChainConnection[] {
  const normalized = anatomicalLabel.toLowerCase().trim();
  const key = LABEL_ALIASES[normalized] || LANDMARK_TO_REGION[normalized] || anatomicalLabel;
  
  const entry = KINETIC_CHAIN_MAP[key];
  if (entry) return entry.connections;

  for (const [mapKey, mapEntry] of Object.entries(KINETIC_CHAIN_MAP)) {
    if (normalized.includes(mapKey.toLowerCase()) || mapKey.toLowerCase().includes(normalized)) {
      return mapEntry.connections;
    }
  }

  return [];
}

export function getConnectionsForRegion(region: string): KineticChainConnection[] {
  return getKineticChainConnections(region);
}
