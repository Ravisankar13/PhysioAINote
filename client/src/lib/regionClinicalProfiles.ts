/**
 * Region Clinical Profiles
 * 
 * Defines detailed anatomical structures, biomechanical influence mappings,
 * and clinical condition definitions for each anatomical region.
 */

import type { AnatomicalRegion } from '@/components/skeleton/PureThreeGLBViewer';

export interface AnatomyStructure {
  id: string;
  name: string;
  type: 'bone' | 'joint' | 'disc' | 'ligament' | 'nerve' | 'muscle' | 'other';
  description: string;
  clinicalRelevance: string;
}

export interface SliderInfluence {
  slider: string;
  coefficient: number;
  direction: 'increase' | 'decrease' | 'bidirectional';
}

export interface StructureForce {
  structureId: string;
  compression: number;
  shear: number;
  tension: number;
  torsion: number;
  status: 'safe' | 'caution' | 'warning' | 'critical';
}

export interface ClinicalCondition {
  id: string;
  name: string;
  description: string;
  icd10Code: string;
  riskFactors: string[];
  symptoms: string[];
  mechanismOfInjury: string;
  thresholds: {
    metric: string;
    safeMax: number;
    warningThreshold: number;
    criticalThreshold: number;
  }[];
}

export interface RegionClinicalProfile {
  regionId: AnatomicalRegion;
  displayName: string;
  anatomyStructures: AnatomyStructure[];
  sliderInfluences: Record<string, SliderInfluence[]>;
  conditions: ClinicalCondition[];
  physiologicalParameters: {
    normalROM: { min: number; max: number };
    loadTolerance: { safe: number; warning: number; critical: number };
    muscleGroups: string[];
  };
}

export const LUMBAR_SPINE_PROFILE: RegionClinicalProfile = {
  regionId: 'lumbar_spine',
  displayName: 'Lumbar Spine (L1-L5)',
  anatomyStructures: [
    { id: 'l1_vertebra', name: 'L1 Vertebral Body', type: 'bone', description: 'First lumbar vertebra, transitional from thoracic', clinicalRelevance: 'Conus medullaris terminates at L1-L2' },
    { id: 'l2_vertebra', name: 'L2 Vertebral Body', type: 'bone', description: 'Second lumbar vertebra', clinicalRelevance: 'Common level for spinal cord termination' },
    { id: 'l3_vertebra', name: 'L3 Vertebral Body', type: 'bone', description: 'Third lumbar vertebra', clinicalRelevance: 'Apex of lumbar lordosis' },
    { id: 'l4_vertebra', name: 'L4 Vertebral Body', type: 'bone', description: 'Fourth lumbar vertebra', clinicalRelevance: 'Common site of degenerative changes' },
    { id: 'l5_vertebra', name: 'L5 Vertebral Body', type: 'bone', description: 'Fifth lumbar vertebra, largest', clinicalRelevance: 'Most mobile lumbar segment' },
    { id: 'l1_l2_disc', name: 'L1-L2 Disc', type: 'disc', description: 'Intervertebral disc between L1-L2', clinicalRelevance: 'Less commonly affected by herniation' },
    { id: 'l2_l3_disc', name: 'L2-L3 Disc', type: 'disc', description: 'Intervertebral disc between L2-L3', clinicalRelevance: 'Uncommon site for herniation' },
    { id: 'l3_l4_disc', name: 'L3-L4 Disc', type: 'disc', description: 'Intervertebral disc between L3-L4', clinicalRelevance: 'Femoral nerve involvement if affected' },
    { id: 'l4_l5_disc', name: 'L4-L5 Disc', type: 'disc', description: 'Intervertebral disc between L4-L5', clinicalRelevance: 'Most common site of disc herniation (45-50%)' },
    { id: 'l5_s1_disc', name: 'L5-S1 Disc', type: 'disc', description: 'Lumbosacral disc', clinicalRelevance: 'Second most common herniation site (40-45%)' },
    { id: 'facet_l4_l5_l', name: 'L4-L5 Facet Joint (Left)', type: 'joint', description: 'Zygapophyseal joint left side', clinicalRelevance: 'Major source of extension-related back pain' },
    { id: 'facet_l4_l5_r', name: 'L4-L5 Facet Joint (Right)', type: 'joint', description: 'Zygapophyseal joint right side', clinicalRelevance: 'Major source of extension-related back pain' },
    { id: 'facet_l5_s1_l', name: 'L5-S1 Facet Joint (Left)', type: 'joint', description: 'Lumbosacral facet left', clinicalRelevance: 'Common site of facet arthrosis' },
    { id: 'facet_l5_s1_r', name: 'L5-S1 Facet Joint (Right)', type: 'joint', description: 'Lumbosacral facet right', clinicalRelevance: 'Common site of facet arthrosis' },
    { id: 'pars_l5_l', name: 'L5 Pars Interarticularis (Left)', type: 'bone', description: 'Isthmus between superior and inferior articular processes', clinicalRelevance: 'Site of spondylolysis fracture' },
    { id: 'pars_l5_r', name: 'L5 Pars Interarticularis (Right)', type: 'bone', description: 'Isthmus between superior and inferior articular processes', clinicalRelevance: 'Site of spondylolysis fracture' },
    { id: 'spinous_process_l4', name: 'L4 Spinous Process', type: 'bone', description: 'Posterior bony projection of L4', clinicalRelevance: 'Baastrup\'s disease (kissing spine) site' },
    { id: 'spinous_process_l5', name: 'L5 Spinous Process', type: 'bone', description: 'Posterior bony projection of L5', clinicalRelevance: 'Baastrup\'s disease (kissing spine) site' },
    { id: 'ligamentum_flavum', name: 'Ligamentum Flavum', type: 'ligament', description: 'Yellow ligament connecting laminae', clinicalRelevance: 'Hypertrophy causes spinal stenosis' },
    { id: 'posterior_longitudinal', name: 'Posterior Longitudinal Ligament', type: 'ligament', description: 'Runs along posterior vertebral bodies', clinicalRelevance: 'Limits disc herniation, weakest laterally' },
    { id: 'anterior_longitudinal', name: 'Anterior Longitudinal Ligament', type: 'ligament', description: 'Runs along anterior vertebral bodies', clinicalRelevance: 'Limits extension, strongest spinal ligament' },
    { id: 'l4_nerve_root', name: 'L4 Nerve Root', type: 'nerve', description: 'Exits below L4 pedicle', clinicalRelevance: 'Affected by L3-L4 disc, knee jerk reflex' },
    { id: 'l5_nerve_root', name: 'L5 Nerve Root', type: 'nerve', description: 'Exits below L5 pedicle', clinicalRelevance: 'Most commonly compressed nerve root' },
    { id: 's1_nerve_root', name: 'S1 Nerve Root', type: 'nerve', description: 'Exits through sacral foramen', clinicalRelevance: 'Affected by L5-S1 disc, ankle jerk' },
    { id: 'cauda_equina', name: 'Cauda Equina', type: 'nerve', description: 'Nerve bundle below L1-L2', clinicalRelevance: 'Red flag if compromised (emergency)' },
    { id: 'multifidus', name: 'Multifidus Muscles', type: 'muscle', description: 'Deep segmental stabilizers', clinicalRelevance: 'Atrophy associated with chronic LBP' },
    { id: 'erector_spinae', name: 'Erector Spinae', type: 'muscle', description: 'Longissimus, iliocostalis, spinalis', clinicalRelevance: 'Global extensors, fatigue in prolonged positions' },
  ],
  sliderInfluences: {
    spineFlexion: [
      { slider: 'l4_l5_disc', coefficient: 1.5, direction: 'increase' },
      { slider: 'l5_s1_disc', coefficient: 1.3, direction: 'increase' },
      { slider: 'facet_l4_l5', coefficient: -0.5, direction: 'decrease' },
      { slider: 'posterior_longitudinal', coefficient: 1.2, direction: 'increase' },
    ],
    spineExtension: [
      { slider: 'facet_l4_l5', coefficient: 2.0, direction: 'increase' },
      { slider: 'facet_l5_s1', coefficient: 1.8, direction: 'increase' },
      { slider: 'spinous_process_l4', coefficient: 1.5, direction: 'increase' },
      { slider: 'spinous_process_l5', coefficient: 1.5, direction: 'increase' },
      { slider: 'pars_l5', coefficient: 1.3, direction: 'increase' },
    ],
    spineRotation: [
      { slider: 'l4_l5_disc', coefficient: 1.2, direction: 'increase' },
      { slider: 'facet_l4_l5', coefficient: 1.0, direction: 'increase' },
    ],
    spineLateralFlexion: [
      { slider: 'facet_l4_l5', coefficient: 0.8, direction: 'increase' },
      { slider: 'l4_l5_disc', coefficient: 0.6, direction: 'increase' },
    ],
  },
  conditions: [
    {
      id: 'disc_bulge',
      name: 'Disc Bulge/Protrusion',
      description: 'Nucleus pulposus pushes against annulus fibrosus without rupture',
      icd10Code: 'M51.16',
      riskFactors: ['Prolonged flexion', 'High disc compression', 'Repetitive loading', 'Poor posture'],
      symptoms: ['Central or unilateral back pain', 'Possible radicular symptoms', 'Worse with flexion'],
      mechanismOfInjury: 'Cumulative micro-trauma from flexion loading or acute flexion/rotation',
      thresholds: [
        { metric: 'discCompression_L4L5', safeMax: 2000, warningThreshold: 3500, criticalThreshold: 5000 },
        { metric: 'spineFlexion', safeMax: 30, warningThreshold: 45, criticalThreshold: 60 },
      ],
    },
    {
      id: 'disc_herniation',
      name: 'Disc Herniation',
      description: 'Nucleus pulposus extrudes through annulus fibrosus',
      icd10Code: 'M51.16',
      riskFactors: ['Combined flexion + rotation', 'High compression', 'Previous disc injury', 'Repetitive heavy lifting'],
      symptoms: ['Radicular leg pain', 'Numbness/tingling in dermatomal pattern', 'Muscle weakness'],
      mechanismOfInjury: 'Flexion + rotation under compressive load causes annular rupture',
      thresholds: [
        { metric: 'discCompression_L4L5', safeMax: 2500, warningThreshold: 4000, criticalThreshold: 6000 },
        { metric: 'discShear_L4L5', safeMax: 400, warningThreshold: 600, criticalThreshold: 800 },
        { metric: 'combinedFlexionRotation', safeMax: 35, warningThreshold: 50, criticalThreshold: 70 },
      ],
    },
    {
      id: 'spondylolisthesis',
      name: 'Spondylolisthesis',
      description: 'Forward slippage of one vertebra over another',
      icd10Code: 'M43.16',
      riskFactors: ['Pars defect', 'Excessive lordosis', 'High shear forces', 'Hyperextension activities'],
      symptoms: ['Low back pain worse with extension', 'Palpable step-off', 'Hamstring tightness'],
      mechanismOfInjury: 'Repetitive hyperextension causes pars stress fracture allowing slippage',
      thresholds: [
        { metric: 'lumbarShear', safeMax: 400, warningThreshold: 600, criticalThreshold: 900 },
        { metric: 'spineExtension', safeMax: 15, warningThreshold: 25, criticalThreshold: 40 },
        { metric: 'anteriorPelvicTilt', safeMax: 12, warningThreshold: 18, criticalThreshold: 25 },
      ],
    },
    {
      id: 'spondylolysis',
      name: 'Spondylolysis (Pars Defect)',
      description: 'Stress fracture of the pars interarticularis',
      icd10Code: 'M43.00',
      riskFactors: ['Repetitive extension', 'Young athletes', 'Gymnastics/cricket/tennis', 'Hyperlordosis'],
      symptoms: ['Extension-related back pain', 'Pain with single-leg hyperextension', 'Unilateral back pain'],
      mechanismOfInjury: 'Repetitive hyperextension and rotation stress the pars',
      thresholds: [
        { metric: 'parsStress_L5', safeMax: 500, warningThreshold: 800, criticalThreshold: 1200 },
        { metric: 'spineExtension', safeMax: 20, warningThreshold: 30, criticalThreshold: 45 },
      ],
    },
    {
      id: 'facet_syndrome',
      name: 'Facet Joint Syndrome',
      description: 'Dysfunction or degeneration of zygapophyseal joints',
      icd10Code: 'M47.817',
      riskFactors: ['Excessive extension', 'Rotation loading', 'Disc height loss', 'Poor posture'],
      symptoms: ['Localized back pain', 'Pain with extension and rotation', 'Morning stiffness'],
      mechanismOfInjury: 'Compression of facet joints during extension and rotation',
      thresholds: [
        { metric: 'facetLoading_L4L5', safeMax: 600, warningThreshold: 1000, criticalThreshold: 1500 },
        { metric: 'spineExtension', safeMax: 15, warningThreshold: 25, criticalThreshold: 35 },
        { metric: 'spineRotation', safeMax: 8, warningThreshold: 12, criticalThreshold: 18 },
      ],
    },
    {
      id: 'kissing_spine',
      name: 'Kissing Spine Syndrome (Baastrup\'s Disease)',
      description: 'Contact between adjacent spinous processes during extension',
      icd10Code: 'M48.20',
      riskFactors: ['Excessive lordosis', 'Hypermobility into extension', 'Degenerative changes'],
      symptoms: ['Midline back pain', 'Pain with extension', 'Relief with flexion'],
      mechanismOfInjury: 'Spinous processes contact during hyperextension causing bursitis',
      thresholds: [
        { metric: 'spinousProcessGap_L4L5', safeMax: 8, warningThreshold: 4, criticalThreshold: 1 },
        { metric: 'spineExtension', safeMax: 20, warningThreshold: 30, criticalThreshold: 40 },
      ],
    },
    {
      id: 'spinal_stenosis',
      name: 'Spinal Stenosis',
      description: 'Narrowing of the spinal canal',
      icd10Code: 'M48.06',
      riskFactors: ['Extension postures', 'Ligamentum flavum hypertrophy', 'Disc bulge', 'Facet hypertrophy'],
      symptoms: ['Neurogenic claudication', 'Relief with flexion', 'Bilateral leg symptoms'],
      mechanismOfInjury: 'Extension narrows canal, combined with degenerative thickening',
      thresholds: [
        { metric: 'canalNarrowing_estimate', safeMax: 15, warningThreshold: 30, criticalThreshold: 50 },
        { metric: 'spineExtension', safeMax: 10, warningThreshold: 20, criticalThreshold: 30 },
      ],
    },
  ],
  physiologicalParameters: {
    normalROM: { min: -30, max: 60 },
    loadTolerance: { safe: 3400, warning: 4400, critical: 6400 },
    muscleGroups: ['Erector Spinae', 'Multifidus', 'Quadratus Lumborum', 'Transverse Abdominis', 'Internal Obliques'],
  },
};

export const CERVICAL_SPINE_PROFILE: RegionClinicalProfile = {
  regionId: 'cervical_spine',
  displayName: 'Cervical Spine (C1-C7)',
  anatomyStructures: [
    { id: 'c1_atlas', name: 'C1 Atlas', type: 'bone', description: 'Ring-shaped vertebra supporting skull', clinicalRelevance: 'No vertebral body or spinous process, 50% of cervical rotation' },
    { id: 'c2_axis', name: 'C2 Axis', type: 'bone', description: 'Has odontoid process (dens)', clinicalRelevance: 'Pivot point for head rotation, dens fracture risk' },
    { id: 'c3_vertebra', name: 'C3 Vertebral Body', type: 'bone', description: 'Third cervical vertebra', clinicalRelevance: 'Phrenic nerve origin (C3-C5)' },
    { id: 'c4_vertebra', name: 'C4 Vertebral Body', type: 'bone', description: 'Fourth cervical vertebra', clinicalRelevance: 'Phrenic nerve contribution' },
    { id: 'c5_vertebra', name: 'C5 Vertebral Body', type: 'bone', description: 'Fifth cervical vertebra', clinicalRelevance: 'Most common level for disc herniation' },
    { id: 'c6_vertebra', name: 'C6 Vertebral Body', type: 'bone', description: 'Sixth cervical vertebra', clinicalRelevance: 'Carotid tubercle landmark' },
    { id: 'c7_vertebra', name: 'C7 Vertebral Body', type: 'bone', description: 'Vertebra prominens', clinicalRelevance: 'Long spinous process, palpable landmark' },
    { id: 'c2_c3_disc', name: 'C2-C3 Disc', type: 'disc', description: 'First true cervical disc', clinicalRelevance: 'Rare site for herniation' },
    { id: 'c3_c4_disc', name: 'C3-C4 Disc', type: 'disc', description: 'Intervertebral disc C3-C4', clinicalRelevance: 'Less common herniation site' },
    { id: 'c4_c5_disc', name: 'C4-C5 Disc', type: 'disc', description: 'Intervertebral disc C4-C5', clinicalRelevance: 'Common degenerative level' },
    { id: 'c5_c6_disc', name: 'C5-C6 Disc', type: 'disc', description: 'Intervertebral disc C5-C6', clinicalRelevance: 'Most common cervical herniation (60%)' },
    { id: 'c6_c7_disc', name: 'C6-C7 Disc', type: 'disc', description: 'Intervertebral disc C6-C7', clinicalRelevance: 'Second most common herniation (25%)' },
    { id: 'atlantoaxial_joint', name: 'Atlantoaxial Joint (C1-C2)', type: 'joint', description: 'Pivot joint for rotation', clinicalRelevance: 'Rheumatoid arthritis instability risk' },
    { id: 'facet_c5_c6_l', name: 'C5-C6 Facet Joint (Left)', type: 'joint', description: 'Zygapophyseal joint', clinicalRelevance: 'Common source of neck pain' },
    { id: 'facet_c5_c6_r', name: 'C5-C6 Facet Joint (Right)', type: 'joint', description: 'Zygapophyseal joint', clinicalRelevance: 'Common source of neck pain' },
    { id: 'uncovertebral_c5_c6', name: 'Uncovertebral Joint (C5-C6)', type: 'joint', description: 'Joints of Luschka', clinicalRelevance: 'Osteophytes cause foraminal stenosis' },
    { id: 'alar_ligament', name: 'Alar Ligaments', type: 'ligament', description: 'Connect dens to occipital condyles', clinicalRelevance: 'Limits rotation, whiplash injury' },
    { id: 'transverse_ligament', name: 'Transverse Ligament of Atlas', type: 'ligament', description: 'Holds dens against C1', clinicalRelevance: 'Rupture causes atlantoaxial instability' },
    { id: 'nuchal_ligament', name: 'Nuchal Ligament', type: 'ligament', description: 'Midline ligament to occiput', clinicalRelevance: 'Limits flexion, support for extensors' },
    { id: 'vertebral_artery_l', name: 'Vertebral Artery (Left)', type: 'other', description: 'Passes through transverse foramina', clinicalRelevance: 'VBI risk with rotation/extension' },
    { id: 'vertebral_artery_r', name: 'Vertebral Artery (Right)', type: 'other', description: 'Passes through transverse foramina', clinicalRelevance: 'VBI risk with rotation/extension' },
    { id: 'c5_nerve_root', name: 'C5 Nerve Root', type: 'nerve', description: 'Exits above C5', clinicalRelevance: 'Deltoid weakness, biceps reflex' },
    { id: 'c6_nerve_root', name: 'C6 Nerve Root', type: 'nerve', description: 'Exits above C6', clinicalRelevance: 'Brachioradialis reflex, thumb numbness' },
    { id: 'c7_nerve_root', name: 'C7 Nerve Root', type: 'nerve', description: 'Exits above C7', clinicalRelevance: 'Triceps reflex, middle finger numbness' },
    { id: 'c8_nerve_root', name: 'C8 Nerve Root', type: 'nerve', description: 'Exits below C7', clinicalRelevance: 'Grip weakness, small finger numbness' },
    { id: 'spinal_cord_cervical', name: 'Cervical Spinal Cord', type: 'nerve', description: 'Cervical enlargement C4-T1', clinicalRelevance: 'Myelopathy signs if compressed' },
    { id: 'deep_neck_flexors', name: 'Deep Cervical Flexors', type: 'muscle', description: 'Longus colli, longus capitis', clinicalRelevance: 'Weakness in chronic neck pain' },
    { id: 'suboccipitals', name: 'Suboccipital Muscles', type: 'muscle', description: 'Rectus capitis, obliquus capitis', clinicalRelevance: 'Cervicogenic headache source' },
    { id: 'scm', name: 'Sternocleidomastoid', type: 'muscle', description: 'Rotates and flexes neck', clinicalRelevance: 'Trigger points, torticollis' },
    { id: 'upper_trapezius', name: 'Upper Trapezius', type: 'muscle', description: 'Elevates scapula, extends neck', clinicalRelevance: 'Common tension/trigger point site' },
  ],
  sliderInfluences: {
    cervicalFlexion: [
      { slider: 'c5_c6_disc', coefficient: 1.4, direction: 'increase' },
      { slider: 'c6_c7_disc', coefficient: 1.2, direction: 'increase' },
      { slider: 'nuchal_ligament', coefficient: 1.5, direction: 'increase' },
    ],
    cervicalExtension: [
      { slider: 'facet_c5_c6', coefficient: 2.0, direction: 'increase' },
      { slider: 'vertebral_artery', coefficient: 1.3, direction: 'increase' },
      { slider: 'spinal_cord_cervical', coefficient: 1.5, direction: 'increase' },
    ],
    cervicalRotation: [
      { slider: 'atlantoaxial_joint', coefficient: 1.8, direction: 'increase' },
      { slider: 'vertebral_artery', coefficient: 1.5, direction: 'increase' },
      { slider: 'alar_ligament', coefficient: 1.2, direction: 'increase' },
    ],
  },
  conditions: [
    {
      id: 'cervical_radiculopathy',
      name: 'Cervical Radiculopathy',
      description: 'Nerve root compression causing arm symptoms',
      icd10Code: 'M54.12',
      riskFactors: ['Disc herniation', 'Foraminal stenosis', 'Osteophytes', 'Forward head posture'],
      symptoms: ['Arm pain in dermatomal pattern', 'Numbness/tingling', 'Weakness', 'Reflex changes'],
      mechanismOfInjury: 'Disc herniation or osteophyte compression of nerve root',
      thresholds: [
        { metric: 'discCompression_C5C6', safeMax: 800, warningThreshold: 1200, criticalThreshold: 1800 },
        { metric: 'foraminalNarrowing', safeMax: 15, warningThreshold: 30, criticalThreshold: 50 },
      ],
    },
    {
      id: 'cervical_disc_herniation',
      name: 'Cervical Disc Herniation',
      description: 'Nucleus pulposus extrusion in cervical spine',
      icd10Code: 'M50.20',
      riskFactors: ['Flexion loading', 'Trauma', 'Degenerative changes', 'Poor posture'],
      symptoms: ['Neck pain', 'Arm pain', 'Numbness', 'Weakness in specific myotome'],
      mechanismOfInjury: 'Flexion or flexion-rotation causing annular tear',
      thresholds: [
        { metric: 'discCompression_C5C6', safeMax: 1000, warningThreshold: 1500, criticalThreshold: 2000 },
        { metric: 'cervicalFlexion', safeMax: 35, warningThreshold: 50, criticalThreshold: 65 },
      ],
    },
    {
      id: 'whiplash',
      name: 'Whiplash-Associated Disorder',
      description: 'Acceleration-deceleration injury to neck',
      icd10Code: 'S13.4',
      riskFactors: ['Rear-end collision', 'Sports trauma', 'Falls', 'Poor headrest position'],
      symptoms: ['Neck pain', 'Headache', 'Dizziness', 'Cognitive symptoms', 'Arm symptoms'],
      mechanismOfInjury: 'Rapid flexion-extension causing soft tissue and ligament injury',
      thresholds: [
        { metric: 'ligamentStress', safeMax: 300, warningThreshold: 500, criticalThreshold: 800 },
        { metric: 'velocityChange', safeMax: 10, warningThreshold: 20, criticalThreshold: 35 },
      ],
    },
    {
      id: 'cervical_spondylosis',
      name: 'Cervical Spondylosis',
      description: 'Degenerative changes in cervical spine',
      icd10Code: 'M47.812',
      riskFactors: ['Age', 'Occupation', 'Previous injury', 'Genetics'],
      symptoms: ['Neck stiffness', 'Pain with movement', 'Crepitus', 'Reduced ROM'],
      mechanismOfInjury: 'Cumulative wear and tear on discs and joints',
      thresholds: [
        { metric: 'discDegeneration', safeMax: 20, warningThreshold: 40, criticalThreshold: 70 },
        { metric: 'facetLoading', safeMax: 400, warningThreshold: 700, criticalThreshold: 1000 },
      ],
    },
    {
      id: 'cervical_facet_syndrome',
      name: 'Cervical Facet Syndrome',
      description: 'Zygapophyseal joint dysfunction',
      icd10Code: 'M47.811',
      riskFactors: ['Extension postures', 'Whiplash history', 'Degenerative changes', 'Poor posture'],
      symptoms: ['Unilateral neck pain', 'Pain with extension/rotation', 'Referred pain to shoulder/scapula'],
      mechanismOfInjury: 'Compression of facet joints during extension and rotation',
      thresholds: [
        { metric: 'facetLoading_C5C6', safeMax: 400, warningThreshold: 700, criticalThreshold: 1000 },
        { metric: 'cervicalExtension', safeMax: 40, warningThreshold: 55, criticalThreshold: 70 },
      ],
    },
    {
      id: 'cervicogenic_headache',
      name: 'Cervicogenic Headache',
      description: 'Headache originating from cervical structures',
      icd10Code: 'G44.841',
      riskFactors: ['Upper cervical dysfunction', 'Suboccipital tension', 'Forward head posture', 'Trauma'],
      symptoms: ['Unilateral headache', 'Neck pain', 'Reduced cervical ROM', 'Triggered by neck movement'],
      mechanismOfInjury: 'Referred pain from C1-C3 structures to head',
      thresholds: [
        { metric: 'upperCervicalStress', safeMax: 300, warningThreshold: 500, criticalThreshold: 800 },
        { metric: 'suboccipitalTension', safeMax: 30, warningThreshold: 50, criticalThreshold: 75 },
      ],
    },
  ],
  physiologicalParameters: {
    normalROM: { min: -70, max: 80 },
    loadTolerance: { safe: 1200, warning: 1800, critical: 2500 },
    muscleGroups: ['Deep Cervical Flexors', 'Suboccipitals', 'Scalenes', 'SCM', 'Upper Trapezius', 'Levator Scapulae'],
  },
};

export const THORACIC_SPINE_PROFILE: RegionClinicalProfile = {
  regionId: 'thoracic_spine',
  displayName: 'Thoracic Spine & Ribs (T1-T12)',
  anatomyStructures: [
    { id: 't1_vertebra', name: 'T1 Vertebral Body', type: 'bone', description: 'First thoracic vertebra', clinicalRelevance: 'Cervicothoracic junction, rib 1 articulation' },
    { id: 't2_vertebra', name: 'T2 Vertebral Body', type: 'bone', description: 'Second thoracic vertebra', clinicalRelevance: 'Upper thoracic, smaller rib articulation' },
    { id: 't3_vertebra', name: 'T3 Vertebral Body', type: 'bone', description: 'Third thoracic vertebra', clinicalRelevance: 'Upper thoracic kyphosis' },
    { id: 't4_vertebra', name: 'T4 Vertebral Body', type: 'bone', description: 'Fourth thoracic vertebra', clinicalRelevance: 'Sternal angle level' },
    { id: 't5_vertebra', name: 'T5 Vertebral Body', type: 'bone', description: 'Fifth thoracic vertebra', clinicalRelevance: 'Mid-thoracic region' },
    { id: 't6_vertebra', name: 'T6 Vertebral Body', type: 'bone', description: 'Sixth thoracic vertebra', clinicalRelevance: 'Apex of thoracic kyphosis' },
    { id: 't7_vertebra', name: 'T7 Vertebral Body', type: 'bone', description: 'Seventh thoracic vertebra', clinicalRelevance: 'Mid-thoracic, xiphoid level' },
    { id: 't8_vertebra', name: 'T8 Vertebral Body', type: 'bone', description: 'Eighth thoracic vertebra', clinicalRelevance: 'Lower mid-thoracic' },
    { id: 't9_vertebra', name: 'T9 Vertebral Body', type: 'bone', description: 'Ninth thoracic vertebra', clinicalRelevance: 'Transitional zone begins' },
    { id: 't10_vertebra', name: 'T10 Vertebral Body', type: 'bone', description: 'Tenth thoracic vertebra', clinicalRelevance: 'Single costal facet (rib 10)' },
    { id: 't11_vertebra', name: 'T11 Vertebral Body', type: 'bone', description: 'Eleventh thoracic vertebra', clinicalRelevance: 'Floating rib articulation' },
    { id: 't12_vertebra', name: 'T12 Vertebral Body', type: 'bone', description: 'Twelfth thoracic vertebra', clinicalRelevance: 'Thoracolumbar junction, lumbar-like facets' },
    { id: 't5_t6_disc', name: 'T5-T6 Disc', type: 'disc', description: 'Intervertebral disc T5-T6', clinicalRelevance: 'Rare herniation but severe if occurs' },
    { id: 't6_t7_disc', name: 'T6-T7 Disc', type: 'disc', description: 'Intervertebral disc T6-T7', clinicalRelevance: 'Mid-thoracic disc' },
    { id: 't11_t12_disc', name: 'T11-T12 Disc', type: 'disc', description: 'Intervertebral disc T11-T12', clinicalRelevance: 'More mobile, higher herniation risk' },
    { id: 't12_l1_disc', name: 'T12-L1 Disc', type: 'disc', description: 'Thoracolumbar junction disc', clinicalRelevance: 'Transitional disc, herniation risk' },
    { id: 'costovertebral_r5_l', name: 'Rib 5 Costovertebral Joint (Left)', type: 'joint', description: 'Rib head articulation with vertebra', clinicalRelevance: 'Dysfunction causes posterior rib pain' },
    { id: 'costovertebral_r5_r', name: 'Rib 5 Costovertebral Joint (Right)', type: 'joint', description: 'Rib head articulation with vertebra', clinicalRelevance: 'Dysfunction causes posterior rib pain' },
    { id: 'costotransverse_r5_l', name: 'Rib 5 Costotransverse Joint (Left)', type: 'joint', description: 'Rib tubercle articulation', clinicalRelevance: 'Limits rib mobility' },
    { id: 'costotransverse_r5_r', name: 'Rib 5 Costotransverse Joint (Right)', type: 'joint', description: 'Rib tubercle articulation', clinicalRelevance: 'Limits rib mobility' },
    { id: 'rib_1', name: 'First Rib', type: 'bone', description: 'Short, flat rib', clinicalRelevance: 'Thoracic outlet syndrome involvement' },
    { id: 'rib_5_l', name: 'Rib 5 (Left)', type: 'bone', description: 'True rib, sternal attachment', clinicalRelevance: 'Typical rib structure' },
    { id: 'rib_5_r', name: 'Rib 5 (Right)', type: 'bone', description: 'True rib, sternal attachment', clinicalRelevance: 'Typical rib structure' },
    { id: 'rib_11_l', name: 'Rib 11 (Left)', type: 'bone', description: 'Floating rib', clinicalRelevance: 'No sternal attachment, more mobile' },
    { id: 'rib_11_r', name: 'Rib 11 (Right)', type: 'bone', description: 'Floating rib', clinicalRelevance: 'No sternal attachment, more mobile' },
    { id: 'rib_12_l', name: 'Rib 12 (Left)', type: 'bone', description: 'Floating rib', clinicalRelevance: 'Shortest rib, no sternal attachment' },
    { id: 'rib_12_r', name: 'Rib 12 (Right)', type: 'bone', description: 'Floating rib', clinicalRelevance: 'Shortest rib, no sternal attachment' },
    { id: 'sternum', name: 'Sternum', type: 'bone', description: 'Manubrium, body, xiphoid', clinicalRelevance: 'Costochondral junction site' },
    { id: 'costochondral_5_l', name: 'Costochondral Junction 5 (Left)', type: 'joint', description: 'Rib cartilage junction', clinicalRelevance: 'Costochondritis site' },
    { id: 'costochondral_5_r', name: 'Costochondral Junction 5 (Right)', type: 'joint', description: 'Rib cartilage junction', clinicalRelevance: 'Costochondritis site' },
    { id: 'intercostal_nerve_t5_l', name: 'T5 Intercostal Nerve (Left)', type: 'nerve', description: 'Runs along rib 5 inferior border', clinicalRelevance: 'Intercostal neuralgia' },
    { id: 'intercostal_nerve_t5_r', name: 'T5 Intercostal Nerve (Right)', type: 'nerve', description: 'Runs along rib 5 inferior border', clinicalRelevance: 'Intercostal neuralgia' },
    { id: 'thoracic_spinal_cord', name: 'Thoracic Spinal Cord', type: 'nerve', description: 'T1-T12 cord segments', clinicalRelevance: 'Myelopathy rare but serious' },
    { id: 'intercostal_muscles', name: 'Intercostal Muscles', type: 'muscle', description: 'External and internal intercostals', clinicalRelevance: 'Breathing mechanics, strain injury' },
    { id: 'erector_spinae_thoracic', name: 'Thoracic Erector Spinae', type: 'muscle', description: 'Iliocostalis, longissimus thoracis', clinicalRelevance: 'Postural support, fatigue pain' },
    { id: 'rhomboids', name: 'Rhomboid Muscles', type: 'muscle', description: 'Major and minor, scapular retractors', clinicalRelevance: 'Scapular dysfunction, trigger points' },
  ],
  sliderInfluences: {
    thoracicFlexion: [
      { slider: 't6_t7_disc', coefficient: 1.2, direction: 'increase' },
      { slider: 't11_t12_disc', coefficient: 1.4, direction: 'increase' },
      { slider: 'costovertebral', coefficient: 0.8, direction: 'increase' },
    ],
    thoracicExtension: [
      { slider: 'facet_thoracic', coefficient: 1.5, direction: 'increase' },
      { slider: 'costotransverse', coefficient: 1.3, direction: 'increase' },
    ],
    thoracicRotation: [
      { slider: 'costovertebral', coefficient: 1.5, direction: 'increase' },
      { slider: 'costotransverse', coefficient: 1.4, direction: 'increase' },
      { slider: 't6_t7_disc', coefficient: 0.8, direction: 'increase' },
    ],
  },
  conditions: [
    {
      id: 'scheuermann_disease',
      name: "Scheuermann's Disease",
      description: 'Juvenile kyphosis with vertebral wedging',
      icd10Code: 'M42.00',
      riskFactors: ['Adolescent growth spurt', 'Genetics', 'Mechanical loading', 'Poor posture'],
      symptoms: ['Thoracic kyphosis', 'Back pain', 'Fatigue', 'Cosmetic concerns'],
      mechanismOfInjury: 'Vertebral endplate irregularities during growth',
      thresholds: [
        { metric: 'kyphosisAngle', safeMax: 45, warningThreshold: 55, criticalThreshold: 70 },
        { metric: 'vertebralWedging', safeMax: 5, warningThreshold: 8, criticalThreshold: 12 },
      ],
    },
    {
      id: 'thoracic_outlet_syndrome',
      name: 'Thoracic Outlet Syndrome',
      description: 'Compression of neurovascular structures at thoracic outlet',
      icd10Code: 'G54.0',
      riskFactors: ['Cervical rib', 'Poor posture', 'Trauma', 'Repetitive overhead activity'],
      symptoms: ['Arm pain/numbness', 'Weakness', 'Vascular symptoms', 'Cold hand'],
      mechanismOfInjury: 'Compression between clavicle, first rib, and scalenes',
      thresholds: [
        { metric: 'firstRibElevation', safeMax: 10, warningThreshold: 20, criticalThreshold: 35 },
        { metric: 'scaleneTension', safeMax: 30, warningThreshold: 50, criticalThreshold: 75 },
      ],
    },
    {
      id: 'rib_dysfunction',
      name: 'Rib Dysfunction/Subluxation',
      description: 'Costovertebral or costotransverse joint dysfunction',
      icd10Code: 'M99.08',
      riskFactors: ['Rotation activities', 'Coughing/sneezing', 'Trauma', 'Poor posture'],
      symptoms: ['Localized back pain', 'Pain with breathing', 'Referred chest pain', 'Muscle spasm'],
      mechanismOfInjury: 'Joint strain from rotation or forceful inspiration',
      thresholds: [
        { metric: 'costovertebralStress', safeMax: 200, warningThreshold: 400, criticalThreshold: 600 },
        { metric: 'thoracicRotation', safeMax: 25, warningThreshold: 40, criticalThreshold: 55 },
      ],
    },
    {
      id: 'thoracic_disc_herniation',
      name: 'Thoracic Disc Herniation',
      description: 'Disc protrusion in thoracic spine',
      icd10Code: 'M51.14',
      riskFactors: ['Trauma', 'Degenerative changes', 'Heavy lifting', 'Previous disc disease'],
      symptoms: ['Band-like pain', 'Myelopathy signs', 'Sensory changes', 'Lower limb weakness'],
      mechanismOfInjury: 'Usually degenerative, occasionally traumatic',
      thresholds: [
        { metric: 'discCompression_thoracic', safeMax: 600, warningThreshold: 1000, criticalThreshold: 1500 },
        { metric: 'discShear_thoracic', safeMax: 150, warningThreshold: 300, criticalThreshold: 500 },
      ],
    },
    {
      id: 'intercostal_neuralgia',
      name: 'Intercostal Neuralgia',
      description: 'Pain along intercostal nerve distribution',
      icd10Code: 'G58.0',
      riskFactors: ['Rib dysfunction', 'Herpes zoster', 'Surgery', 'Trauma'],
      symptoms: ['Sharp/burning rib pain', 'Worse with movement/breathing', 'Dermatomal distribution'],
      mechanismOfInjury: 'Nerve irritation from mechanical or inflammatory cause',
      thresholds: [
        { metric: 'intercostalCompression', safeMax: 100, warningThreshold: 200, criticalThreshold: 350 },
        { metric: 'ribMotionRestriction', safeMax: 20, warningThreshold: 40, criticalThreshold: 60 },
      ],
    },
    {
      id: 'costochondritis',
      name: 'Costochondritis',
      description: 'Inflammation of costochondral junctions',
      icd10Code: 'M94.0',
      riskFactors: ['Repetitive strain', 'Coughing', 'Trauma', 'Infection'],
      symptoms: ['Anterior chest pain', 'Tenderness at junction', 'Pain with movement', 'Sharp/aching'],
      mechanismOfInjury: 'Inflammation from repetitive stress or strain',
      thresholds: [
        { metric: 'costochondralStress', safeMax: 150, warningThreshold: 300, criticalThreshold: 500 },
        { metric: 'ribExpansionForce', safeMax: 100, warningThreshold: 200, criticalThreshold: 350 },
      ],
    },
  ],
  physiologicalParameters: {
    normalROM: { min: -25, max: 35 },
    loadTolerance: { safe: 2000, warning: 3000, critical: 4500 },
    muscleGroups: ['Erector Spinae', 'Intercostals', 'Rhomboids', 'Middle/Lower Trapezius', 'Serratus Anterior'],
  },
};

export const PELVIS_PROFILE: RegionClinicalProfile = {
  regionId: 'pelvis',
  displayName: 'Pelvis & Sacrum',
  anatomyStructures: [
    { id: 'sacrum', name: 'Sacrum', type: 'bone', description: 'Fused S1-S5 vertebrae', clinicalRelevance: 'Base of spine, SI joint articulation' },
    { id: 'coccyx', name: 'Coccyx', type: 'bone', description: 'Tailbone, 3-5 fused segments', clinicalRelevance: 'Coccydynia if traumatized' },
    { id: 'ilium_l', name: 'Left Ilium', type: 'bone', description: 'Upper pelvic bone', clinicalRelevance: 'ASIS/PSIS landmarks, iliac crest' },
    { id: 'ilium_r', name: 'Right Ilium', type: 'bone', description: 'Upper pelvic bone', clinicalRelevance: 'ASIS/PSIS landmarks, iliac crest' },
    { id: 'ischium_l', name: 'Left Ischium', type: 'bone', description: 'Lower posterior pelvic bone', clinicalRelevance: 'Ischial tuberosity (sit bone)' },
    { id: 'ischium_r', name: 'Right Ischium', type: 'bone', description: 'Lower posterior pelvic bone', clinicalRelevance: 'Ischial tuberosity (sit bone)' },
    { id: 'pubis_l', name: 'Left Pubis', type: 'bone', description: 'Anterior pelvic bone', clinicalRelevance: 'Pubic symphysis articulation' },
    { id: 'pubis_r', name: 'Right Pubis', type: 'bone', description: 'Anterior pelvic bone', clinicalRelevance: 'Pubic symphysis articulation' },
    { id: 'acetabulum_l', name: 'Left Acetabulum', type: 'bone', description: 'Hip socket', clinicalRelevance: 'Hip joint articulation' },
    { id: 'acetabulum_r', name: 'Right Acetabulum', type: 'bone', description: 'Hip socket', clinicalRelevance: 'Hip joint articulation' },
    { id: 'si_joint_l', name: 'Left SI Joint', type: 'joint', description: 'Sacroiliac joint', clinicalRelevance: 'Common source of low back/buttock pain' },
    { id: 'si_joint_r', name: 'Right SI Joint', type: 'joint', description: 'Sacroiliac joint', clinicalRelevance: 'Common source of low back/buttock pain' },
    { id: 'pubic_symphysis', name: 'Pubic Symphysis', type: 'joint', description: 'Anterior pelvic joint', clinicalRelevance: 'Osteitis pubis, pregnancy changes' },
    { id: 'lumbosacral_joint', name: 'Lumbosacral Joint (L5-S1)', type: 'joint', description: 'Transitional segment', clinicalRelevance: 'High stress region, disc herniation' },
    { id: 'sacrotuberous_lig_l', name: 'Left Sacrotuberous Ligament', type: 'ligament', description: 'Sacrum to ischial tuberosity', clinicalRelevance: 'SI joint stability, hamstring attachment' },
    { id: 'sacrotuberous_lig_r', name: 'Right Sacrotuberous Ligament', type: 'ligament', description: 'Sacrum to ischial tuberosity', clinicalRelevance: 'SI joint stability, hamstring attachment' },
    { id: 'sacrospinous_lig_l', name: 'Left Sacrospinous Ligament', type: 'ligament', description: 'Sacrum to ischial spine', clinicalRelevance: 'Divides greater/lesser sciatic foramen' },
    { id: 'sacrospinous_lig_r', name: 'Right Sacrospinous Ligament', type: 'ligament', description: 'Sacrum to ischial spine', clinicalRelevance: 'Divides greater/lesser sciatic foramen' },
    { id: 'iliolumbar_lig_l', name: 'Left Iliolumbar Ligament', type: 'ligament', description: 'L4-L5 to iliac crest', clinicalRelevance: 'Limits L5 movement, often strained' },
    { id: 'iliolumbar_lig_r', name: 'Right Iliolumbar Ligament', type: 'ligament', description: 'L4-L5 to iliac crest', clinicalRelevance: 'Limits L5 movement, often strained' },
    { id: 'anterior_si_lig', name: 'Anterior SI Ligaments', type: 'ligament', description: 'Thin anterior capsule', clinicalRelevance: 'Weaker than posterior, less support' },
    { id: 'posterior_si_lig', name: 'Posterior SI Ligaments', type: 'ligament', description: 'Strong posterior support', clinicalRelevance: 'Primary SI stabilizers' },
    { id: 'sciatic_nerve', name: 'Sciatic Nerve', type: 'nerve', description: 'L4-S3, largest nerve', clinicalRelevance: 'Sciatica, piriformis syndrome' },
    { id: 'pudendal_nerve', name: 'Pudendal Nerve', type: 'nerve', description: 'S2-S4 perineal sensation', clinicalRelevance: 'Pudendal neuralgia' },
    { id: 'superior_gluteal_nerve', name: 'Superior Gluteal Nerve', type: 'nerve', description: 'L4-S1, gluteus medius/minimus', clinicalRelevance: 'Trendelenburg gait if damaged' },
    { id: 'sacral_plexus', name: 'Sacral Plexus', type: 'nerve', description: 'L4-S3 nerve roots', clinicalRelevance: 'Source of lower limb innervation' },
    { id: 'piriformis_l', name: 'Left Piriformis', type: 'muscle', description: 'External rotator, sciatic nerve relation', clinicalRelevance: 'Piriformis syndrome, sciatica mimic' },
    { id: 'piriformis_r', name: 'Right Piriformis', type: 'muscle', description: 'External rotator, sciatic nerve relation', clinicalRelevance: 'Piriformis syndrome, sciatica mimic' },
    { id: 'gluteus_maximus_l', name: 'Left Gluteus Maximus', type: 'muscle', description: 'Hip extensor', clinicalRelevance: 'Gait, stair climbing, SI stability' },
    { id: 'gluteus_maximus_r', name: 'Right Gluteus Maximus', type: 'muscle', description: 'Hip extensor', clinicalRelevance: 'Gait, stair climbing, SI stability' },
    { id: 'gluteus_medius_l', name: 'Left Gluteus Medius', type: 'muscle', description: 'Hip abductor', clinicalRelevance: 'Pelvic stability, Trendelenburg' },
    { id: 'gluteus_medius_r', name: 'Right Gluteus Medius', type: 'muscle', description: 'Hip abductor', clinicalRelevance: 'Pelvic stability, Trendelenburg' },
    { id: 'pelvic_floor', name: 'Pelvic Floor Muscles', type: 'muscle', description: 'Levator ani, coccygeus', clinicalRelevance: 'Continence, pelvic support, pain syndromes' },
    { id: 'psoas_major_l', name: 'Left Psoas Major', type: 'muscle', description: 'Hip flexor, spine stabilizer', clinicalRelevance: 'Tightness affects posture, psoas syndrome' },
    { id: 'psoas_major_r', name: 'Right Psoas Major', type: 'muscle', description: 'Hip flexor, spine stabilizer', clinicalRelevance: 'Tightness affects posture, psoas syndrome' },
  ],
  sliderInfluences: {
    pelvisTilt: [
      { slider: 'si_joint', coefficient: 1.5, direction: 'increase' },
      { slider: 'lumbosacral_joint', coefficient: 1.8, direction: 'increase' },
      { slider: 'pubic_symphysis', coefficient: 0.8, direction: 'increase' },
    ],
    pelvicObliquity: [
      { slider: 'si_joint', coefficient: 2.0, direction: 'increase' },
      { slider: 'pubic_symphysis', coefficient: 1.5, direction: 'increase' },
    ],
    pelvicRotation: [
      { slider: 'si_joint', coefficient: 1.3, direction: 'increase' },
      { slider: 'sacrotuberous_lig', coefficient: 1.0, direction: 'increase' },
    ],
  },
  conditions: [
    {
      id: 'si_joint_dysfunction',
      name: 'SI Joint Dysfunction',
      description: 'Sacroiliac joint pain and hypomobility/hypermobility',
      icd10Code: 'M53.3',
      riskFactors: ['Pregnancy', 'Leg length discrepancy', 'Trauma', 'Repetitive stress', 'Hypermobility'],
      symptoms: ['Unilateral buttock pain', 'Pain with sit-to-stand', 'Groin pain', 'Worse with prolonged positions'],
      mechanismOfInjury: 'Abnormal loading or movement of SI joint',
      thresholds: [
        { metric: 'siJointShear', safeMax: 400, warningThreshold: 700, criticalThreshold: 1000 },
        { metric: 'pelvicObliquity', safeMax: 5, warningThreshold: 10, criticalThreshold: 18 },
      ],
    },
    {
      id: 'piriformis_syndrome',
      name: 'Piriformis Syndrome',
      description: 'Sciatic nerve entrapment by piriformis muscle',
      icd10Code: 'G57.00',
      riskFactors: ['Sitting occupation', 'Hip external rotation', 'Trauma', 'Anatomic variation'],
      symptoms: ['Buttock pain', 'Sciatica-like symptoms', 'Pain with sitting', 'Pain with hip rotation'],
      mechanismOfInjury: 'Piriformis spasm or hypertrophy compressing sciatic nerve',
      thresholds: [
        { metric: 'piriformisTension', safeMax: 40, warningThreshold: 60, criticalThreshold: 85 },
        { metric: 'hipExternalRotation', safeMax: 45, warningThreshold: 55, criticalThreshold: 70 },
      ],
    },
    {
      id: 'sacroiliitis',
      name: 'Sacroiliitis',
      description: 'Inflammation of sacroiliac joint',
      icd10Code: 'M46.1',
      riskFactors: ['Ankylosing spondylitis', 'Inflammatory arthritis', 'Infection', 'Pregnancy'],
      symptoms: ['Low back/buttock pain', 'Morning stiffness', 'Pain with rest', 'Improved with activity'],
      mechanismOfInjury: 'Inflammatory process affecting SI joint',
      thresholds: [
        { metric: 'inflammatoryMarkers', safeMax: 20, warningThreshold: 40, criticalThreshold: 70 },
        { metric: 'morningStiffnessDuration', safeMax: 15, warningThreshold: 30, criticalThreshold: 60 },
      ],
    },
    {
      id: 'pubic_symphysis_dysfunction',
      name: 'Pubic Symphysis Dysfunction',
      description: 'Pain and instability at pubic symphysis',
      icd10Code: 'M99.05',
      riskFactors: ['Pregnancy', 'Childbirth', 'Sports with kicking/pivoting', 'Hypermobility'],
      symptoms: ['Anterior pelvic pain', 'Pain with walking/stairs', 'Clicking sensation', 'Groin pain'],
      mechanismOfInjury: 'Shearing forces at pubic symphysis',
      thresholds: [
        { metric: 'symphysisShear', safeMax: 200, warningThreshold: 400, criticalThreshold: 650 },
        { metric: 'symphysisWidening', safeMax: 10, warningThreshold: 15, criticalThreshold: 25 },
      ],
    },
    {
      id: 'pelvic_obliquity',
      name: 'Pelvic Obliquity/Asymmetry',
      description: 'Uneven pelvic alignment in frontal plane',
      icd10Code: 'M99.05',
      riskFactors: ['Leg length discrepancy', 'Scoliosis', 'Hip dysfunction', 'Muscle imbalance'],
      symptoms: ['Uneven gait', 'One-sided pain', 'Compensatory postures', 'Hip/back pain'],
      mechanismOfInjury: 'Asymmetric loading due to structural or functional causes',
      thresholds: [
        { metric: 'pelvicObliquityAngle', safeMax: 3, warningThreshold: 6, criticalThreshold: 12 },
        { metric: 'legLengthDiff', safeMax: 5, warningThreshold: 10, criticalThreshold: 20 },
      ],
    },
    {
      id: 'coccydynia',
      name: 'Coccydynia',
      description: 'Tailbone pain',
      icd10Code: 'M53.3',
      riskFactors: ['Fall on buttocks', 'Prolonged sitting', 'Childbirth', 'Hypermobility'],
      symptoms: ['Tailbone pain', 'Worse with sitting', 'Pain with sit-to-stand', 'Local tenderness'],
      mechanismOfInjury: 'Direct trauma or repetitive microtrauma to coccyx',
      thresholds: [
        { metric: 'coccyxPressure', safeMax: 100, warningThreshold: 200, criticalThreshold: 350 },
        { metric: 'sittingDuration', safeMax: 60, warningThreshold: 120, criticalThreshold: 240 },
      ],
    },
  ],
  physiologicalParameters: {
    normalROM: { min: -15, max: 15 },
    loadTolerance: { safe: 2500, warning: 3500, critical: 5000 },
    muscleGroups: ['Gluteus Maximus', 'Gluteus Medius/Minimus', 'Piriformis', 'Pelvic Floor', 'Psoas', 'Quadratus Lumborum'],
  },
};

export const HIP_PROFILE: RegionClinicalProfile = {
  regionId: 'left_hip',
  displayName: 'Hip Joint',
  anatomyStructures: [
    { id: 'femoral_head', name: 'Femoral Head', type: 'bone', description: 'Spherical head of femur articulating with acetabulum', clinicalRelevance: 'AVN risk, OA changes, fracture site' },
    { id: 'femoral_neck', name: 'Femoral Neck', type: 'bone', description: 'Connection between femoral head and shaft', clinicalRelevance: 'Fracture site, neck-shaft angle variations' },
    { id: 'greater_trochanter', name: 'Greater Trochanter', type: 'bone', description: 'Lateral projection for muscle attachments', clinicalRelevance: 'Trochanteric bursitis, tendinopathy site' },
    { id: 'lesser_trochanter', name: 'Lesser Trochanter', type: 'bone', description: 'Medial projection for psoas attachment', clinicalRelevance: 'Avulsion fracture site in athletes' },
    { id: 'acetabulum', name: 'Acetabulum', type: 'bone', description: 'Socket formed by ilium, ischium, pubis', clinicalRelevance: 'Dysplasia, pincer-type FAI, labral pathology' },
    { id: 'labrum', name: 'Acetabular Labrum', type: 'other', description: 'Fibrocartilage rim deepening socket', clinicalRelevance: 'Labral tears, common source of hip pain' },
    { id: 'hip_joint_capsule', name: 'Hip Joint Capsule', type: 'ligament', description: 'Strong fibrous capsule enclosing joint', clinicalRelevance: 'Capsular tightness, adhesive capsulitis' },
    { id: 'iliofemoral_lig', name: 'Iliofemoral Ligament', type: 'ligament', description: 'Y-ligament of Bigelow, strongest ligament', clinicalRelevance: 'Limits extension and external rotation' },
    { id: 'pubofemoral_lig', name: 'Pubofemoral Ligament', type: 'ligament', description: 'Anterior-inferior capsular thickening', clinicalRelevance: 'Limits abduction and external rotation' },
    { id: 'ischiofemoral_lig', name: 'Ischiofemoral Ligament', type: 'ligament', description: 'Posterior capsular thickening', clinicalRelevance: 'Limits internal rotation, ischiofemoral impingement' },
    { id: 'ligamentum_teres', name: 'Ligamentum Teres', type: 'ligament', description: 'Intracapsular ligament to fovea', clinicalRelevance: 'Rupture in dislocation, blood supply role' },
    { id: 'psoas_major', name: 'Psoas Major', type: 'muscle', description: 'Primary hip flexor from lumbar spine', clinicalRelevance: 'Snapping hip, psoas impingement' },
    { id: 'iliacus', name: 'Iliacus', type: 'muscle', description: 'Hip flexor from iliac fossa', clinicalRelevance: 'Works with psoas as iliopsoas complex' },
    { id: 'rectus_femoris', name: 'Rectus Femoris', type: 'muscle', description: 'Biarticular hip flexor and knee extensor', clinicalRelevance: 'Strain at AIIS origin, snapping hip' },
    { id: 'gluteus_maximus', name: 'Gluteus Maximus', type: 'muscle', description: 'Powerful hip extensor', clinicalRelevance: 'Weakness affects gait and stair climbing' },
    { id: 'gluteus_medius', name: 'Gluteus Medius', type: 'muscle', description: 'Primary hip abductor', clinicalRelevance: 'Tendinopathy, Trendelenburg gait if weak' },
    { id: 'gluteus_minimus', name: 'Gluteus Minimus', type: 'muscle', description: 'Deep hip abductor', clinicalRelevance: 'Often involved with medius pathology' },
    { id: 'piriformis', name: 'Piriformis', type: 'muscle', description: 'External rotator, sciatic nerve relation', clinicalRelevance: 'Piriformis syndrome, sciatic nerve entrapment' },
    { id: 'obturator_internus', name: 'Obturator Internus', type: 'muscle', description: 'Deep external rotator', clinicalRelevance: 'Part of deep rotator group' },
    { id: 'tensor_fasciae_latae', name: 'Tensor Fasciae Latae', type: 'muscle', description: 'Hip flexor/abductor, IT band tension', clinicalRelevance: 'External snapping hip, IT band syndrome' },
    { id: 'hamstrings_origin', name: 'Hamstrings Origin', type: 'muscle', description: 'Ischial tuberosity attachment', clinicalRelevance: 'Proximal hamstring tendinopathy, avulsion' },
    { id: 'adductors', name: 'Adductor Group', type: 'muscle', description: 'Adductor longus, magnus, brevis', clinicalRelevance: 'Groin strain, adductor-related groin pain' },
    { id: 'femoral_nerve', name: 'Femoral Nerve', type: 'nerve', description: 'L2-L4, anterior thigh innervation', clinicalRelevance: 'Compression causes anterior thigh symptoms' },
    { id: 'sciatic_nerve_hip', name: 'Sciatic Nerve', type: 'nerve', description: 'L4-S3, posterior thigh innervation', clinicalRelevance: 'Piriformis entrapment, referred symptoms' },
  ],
  sliderInfluences: {
    hipFlexion: [
      { slider: 'iliofemoral_lig', coefficient: 1.2, direction: 'decrease' },
      { slider: 'labrum_anterior', coefficient: 1.5, direction: 'increase' },
      { slider: 'psoas_major', coefficient: 1.8, direction: 'increase' },
    ],
    hipExtension: [
      { slider: 'iliofemoral_lig', coefficient: 2.0, direction: 'increase' },
      { slider: 'labrum_posterior', coefficient: 1.3, direction: 'increase' },
      { slider: 'gluteus_maximus', coefficient: 1.5, direction: 'increase' },
    ],
    hipAbduction: [
      { slider: 'pubofemoral_lig', coefficient: 1.5, direction: 'increase' },
      { slider: 'gluteus_medius', coefficient: 1.8, direction: 'increase' },
      { slider: 'adductors', coefficient: 1.4, direction: 'increase' },
    ],
    hipInternalRotation: [
      { slider: 'ischiofemoral_lig', coefficient: 1.8, direction: 'increase' },
      { slider: 'labrum_posterior', coefficient: 1.5, direction: 'increase' },
      { slider: 'cam_impingement', coefficient: 2.0, direction: 'increase' },
    ],
    hipAnteversion: [
      { slider: 'femoral_head', coefficient: 1.3, direction: 'increase' },
      { slider: 'labrum', coefficient: 1.5, direction: 'increase' },
    ],
    neckShaftAngle: [
      { slider: 'hip_joint_loading', coefficient: 1.5, direction: 'bidirectional' },
      { slider: 'abductor_mechanics', coefficient: 1.3, direction: 'bidirectional' },
    ],
  },
  conditions: [
    {
      id: 'femoroacetabular_impingement',
      name: 'Femoroacetabular Impingement (FAI)',
      description: 'Abnormal contact between femoral head and acetabulum',
      icd10Code: 'M25.859',
      riskFactors: ['Cam morphology', 'Pincer morphology', 'Athletic activity', 'Deep hip flexion activities'],
      symptoms: ['Groin pain', 'Pain with hip flexion/rotation', 'Clicking/catching', 'Reduced ROM'],
      mechanismOfInjury: 'Repeated impingement from bony morphology causing labral/cartilage damage',
      thresholds: [
        { metric: 'hipFlexion', safeMax: 100, warningThreshold: 110, criticalThreshold: 120 },
        { metric: 'hipInternalRotation', safeMax: 30, warningThreshold: 20, criticalThreshold: 10 },
        { metric: 'alphaAngle', safeMax: 50, warningThreshold: 60, criticalThreshold: 75 },
      ],
    },
    {
      id: 'labral_tear',
      name: 'Acetabular Labral Tear',
      description: 'Tear of the fibrocartilage rim of the acetabulum',
      icd10Code: 'S73.191A',
      riskFactors: ['FAI', 'Hip dysplasia', 'Trauma', 'Repetitive pivoting'],
      symptoms: ['Anterior groin pain', 'Clicking/locking', 'Giving way sensation', 'Night pain'],
      mechanismOfInjury: 'Impingement, shearing forces, or acute trauma causing labral damage',
      thresholds: [
        { metric: 'labralStress', safeMax: 200, warningThreshold: 400, criticalThreshold: 600 },
        { metric: 'hipFlexionRotation', safeMax: 90, warningThreshold: 100, criticalThreshold: 110 },
      ],
    },
    {
      id: 'hip_osteoarthritis',
      name: 'Hip Osteoarthritis',
      description: 'Degenerative joint disease of the hip',
      icd10Code: 'M16.10',
      riskFactors: ['Age', 'Obesity', 'Previous injury', 'FAI', 'Dysplasia', 'Genetics'],
      symptoms: ['Groin/thigh pain', 'Morning stiffness', 'Reduced ROM', 'Pain with weight-bearing'],
      mechanismOfInjury: 'Progressive cartilage degeneration from wear and tear',
      thresholds: [
        { metric: 'jointSpaceNarrowing', safeMax: 20, warningThreshold: 40, criticalThreshold: 70 },
        { metric: 'hipROM', safeMax: 100, warningThreshold: 80, criticalThreshold: 60 },
      ],
    },
    {
      id: 'greater_trochanteric_bursitis',
      name: 'Greater Trochanteric Pain Syndrome',
      description: 'Lateral hip pain from bursa/tendon pathology',
      icd10Code: 'M70.60',
      riskFactors: ['Female gender', 'ITB tightness', 'Gluteal weakness', 'Running', 'Side-lying'],
      symptoms: ['Lateral hip pain', 'Pain with side-lying', 'Tenderness over trochanter', 'Pain with stairs'],
      mechanismOfInjury: 'Compression and friction of bursa/tendons over greater trochanter',
      thresholds: [
        { metric: 'trochantericPressure', safeMax: 100, warningThreshold: 200, criticalThreshold: 350 },
        { metric: 'hipAdduction', safeMax: 20, warningThreshold: 30, criticalThreshold: 40 },
      ],
    },
    {
      id: 'snapping_hip_syndrome',
      name: 'Snapping Hip Syndrome',
      description: 'Audible or palpable snapping with hip movement',
      icd10Code: 'M76.891',
      riskFactors: ['Dancers', 'Athletes', 'Tight ITB', 'Psoas tightness'],
      symptoms: ['Snapping sensation', 'Anterior or lateral hip pain', 'Snapping with flexion/extension'],
      mechanismOfInjury: 'ITB over trochanter (external) or psoas over eminence (internal)',
      thresholds: [
        { metric: 'itbTension', safeMax: 30, warningThreshold: 50, criticalThreshold: 75 },
        { metric: 'psoasTension', safeMax: 30, warningThreshold: 50, criticalThreshold: 75 },
      ],
    },
    {
      id: 'hip_piriformis_syndrome',
      name: 'Piriformis Syndrome',
      description: 'Sciatic nerve entrapment by piriformis muscle',
      icd10Code: 'G57.00',
      riskFactors: ['Sitting occupation', 'Trauma', 'Anatomic variation', 'Overuse'],
      symptoms: ['Buttock pain', 'Radiating leg pain', 'Pain with sitting', 'Pain with hip rotation'],
      mechanismOfInjury: 'Piriformis spasm or hypertrophy compressing sciatic nerve',
      thresholds: [
        { metric: 'piriformisTension', safeMax: 40, warningThreshold: 60, criticalThreshold: 85 },
        { metric: 'hipExternalRotation', safeMax: 45, warningThreshold: 55, criticalThreshold: 70 },
      ],
    },
  ],
  physiologicalParameters: {
    normalROM: { min: -15, max: 125 },
    loadTolerance: { safe: 3000, warning: 4500, critical: 6500 },
    muscleGroups: ['Iliopsoas', 'Gluteals', 'Adductors', 'Deep External Rotators', 'Hamstrings', 'Tensor Fasciae Latae'],
  },
};

export const KNEE_PROFILE: RegionClinicalProfile = {
  regionId: 'left_knee',
  displayName: 'Knee Joint',
  anatomyStructures: [
    { id: 'medial_femoral_condyle', name: 'Medial Femoral Condyle', type: 'bone', description: 'Medial distal femur articulating surface', clinicalRelevance: 'OA changes, osteochondral lesions, fractures' },
    { id: 'lateral_femoral_condyle', name: 'Lateral Femoral Condyle', type: 'bone', description: 'Lateral distal femur articulating surface', clinicalRelevance: 'OA changes, osteochondral defects' },
    { id: 'medial_tibial_plateau', name: 'Medial Tibial Plateau', type: 'bone', description: 'Medial proximal tibia articular surface', clinicalRelevance: 'Plateau fractures, OA, meniscal attachment' },
    { id: 'lateral_tibial_plateau', name: 'Lateral Tibial Plateau', type: 'bone', description: 'Lateral proximal tibia articular surface', clinicalRelevance: 'Plateau fractures, tibial slope' },
    { id: 'patella', name: 'Patella', type: 'bone', description: 'Largest sesamoid bone in quadriceps tendon', clinicalRelevance: 'Patellofemoral pain, fractures, dislocation' },
    { id: 'fibular_head', name: 'Fibular Head', type: 'bone', description: 'Proximal fibula, LCL attachment', clinicalRelevance: 'Peroneal nerve compression, LCL avulsion' },
    { id: 'tibial_tubercle', name: 'Tibial Tubercle', type: 'bone', description: 'Patellar tendon insertion', clinicalRelevance: 'Osgood-Schlatter, TT-TG distance' },
    { id: 'acl', name: 'Anterior Cruciate Ligament (ACL)', type: 'ligament', description: 'Primary restraint to anterior tibial translation', clinicalRelevance: 'ACL rupture, pivoting instability' },
    { id: 'pcl', name: 'Posterior Cruciate Ligament (PCL)', type: 'ligament', description: 'Primary restraint to posterior tibial translation', clinicalRelevance: 'Dashboard injury, posterior instability' },
    { id: 'mcl', name: 'Medial Collateral Ligament (MCL)', type: 'ligament', description: 'Medial knee stabilizer', clinicalRelevance: 'Valgus injury, grades I-III sprain' },
    { id: 'lcl', name: 'Lateral Collateral Ligament (LCL)', type: 'ligament', description: 'Lateral knee stabilizer', clinicalRelevance: 'Varus injury, posterolateral corner' },
    { id: 'medial_meniscus', name: 'Medial Meniscus', type: 'other', description: 'C-shaped fibrocartilage, load distribution', clinicalRelevance: 'Tears, degenerative changes, weight-bearing' },
    { id: 'lateral_meniscus', name: 'Lateral Meniscus', type: 'other', description: 'More circular fibrocartilage', clinicalRelevance: 'Tears, discoid meniscus, more mobile' },
    { id: 'patellar_tendon', name: 'Patellar Tendon', type: 'ligament', description: 'Connects patella to tibial tubercle', clinicalRelevance: 'Patellar tendinopathy (jumper\'s knee)' },
    { id: 'quadriceps_tendon', name: 'Quadriceps Tendon', type: 'ligament', description: 'Attaches quadriceps to patella', clinicalRelevance: 'Tendinopathy, rupture in older patients' },
    { id: 'quadriceps', name: 'Quadriceps Muscle Group', type: 'muscle', description: 'Rectus femoris, vastus medialis/lateralis/intermedius', clinicalRelevance: 'VMO weakness, patellofemoral dysfunction' },
    { id: 'vmo', name: 'Vastus Medialis Obliquus', type: 'muscle', description: 'Medial patellar stabilizer', clinicalRelevance: 'Weakness leads to patellar maltracking' },
    { id: 'hamstrings_knee', name: 'Hamstrings', type: 'muscle', description: 'Knee flexors, ACL synergists', clinicalRelevance: 'Strain, ACL protection role' },
    { id: 'iliotibial_band', name: 'Iliotibial Band', type: 'other', description: 'Lateral thigh fascia to Gerdy\'s tubercle', clinicalRelevance: 'ITB friction syndrome, lateral knee pain' },
    { id: 'popliteus', name: 'Popliteus', type: 'muscle', description: 'Unlocks knee, posterolateral stabilizer', clinicalRelevance: 'Strain, posterolateral corner injury' },
    { id: 'gastrocnemius', name: 'Gastrocnemius', type: 'muscle', description: 'Crosses knee posteriorly', clinicalRelevance: 'Strain, Baker\'s cyst relation' },
    { id: 'pes_anserine', name: 'Pes Anserine', type: 'other', description: 'Sartorius, gracilis, semitendinosus insertion', clinicalRelevance: 'Pes anserine bursitis, medial knee pain' },
    { id: 'peroneal_nerve', name: 'Common Peroneal Nerve', type: 'nerve', description: 'Wraps around fibular head', clinicalRelevance: 'Compression causes foot drop' },
    { id: 'popliteal_artery', name: 'Popliteal Artery', type: 'other', description: 'Posterior knee vascular supply', clinicalRelevance: 'Injury risk in dislocation' },
  ],
  sliderInfluences: {
    kneeFlexion: [
      { slider: 'pcl', coefficient: 1.5, direction: 'increase' },
      { slider: 'patellofemoral', coefficient: 2.0, direction: 'increase' },
      { slider: 'menisci', coefficient: 1.3, direction: 'increase' },
    ],
    kneeVarus: [
      { slider: 'mcl', coefficient: 1.8, direction: 'increase' },
      { slider: 'medial_compartment', coefficient: 2.0, direction: 'increase' },
      { slider: 'lateral_meniscus', coefficient: 0.5, direction: 'decrease' },
    ],
    tibialTorsion: [
      { slider: 'patellofemoral', coefficient: 1.5, direction: 'increase' },
      { slider: 'menisci', coefficient: 1.3, direction: 'increase' },
    ],
    kneeRecurvatum: [
      { slider: 'pcl', coefficient: 1.8, direction: 'increase' },
      { slider: 'acl', coefficient: 1.5, direction: 'increase' },
      { slider: 'posterior_capsule', coefficient: 2.0, direction: 'increase' },
    ],
    tibialSlope: [
      { slider: 'acl', coefficient: 1.8, direction: 'increase' },
      { slider: 'anterior_translation', coefficient: 1.5, direction: 'increase' },
    ],
    patellaAlta: [
      { slider: 'patellofemoral', coefficient: 1.5, direction: 'bidirectional' },
      { slider: 'patellar_tracking', coefficient: 1.8, direction: 'increase' },
    ],
  },
  conditions: [
    {
      id: 'acl_tear',
      name: 'ACL Tear',
      description: 'Rupture of anterior cruciate ligament',
      icd10Code: 'S83.511A',
      riskFactors: ['Female athlete', 'Pivoting sports', 'Landing mechanics', 'Muscle imbalance', 'Previous ACL injury'],
      symptoms: ['Pop at injury', 'Immediate swelling', 'Instability with pivoting', 'Giving way'],
      mechanismOfInjury: 'Non-contact pivoting, landing with knee valgus, or contact injury',
      thresholds: [
        { metric: 'aclStrain', safeMax: 3, warningThreshold: 5, criticalThreshold: 8 },
        { metric: 'anteriorTranslation', safeMax: 5, warningThreshold: 8, criticalThreshold: 12 },
        { metric: 'kneeValgus', safeMax: 10, warningThreshold: 15, criticalThreshold: 25 },
      ],
    },
    {
      id: 'meniscus_tear',
      name: 'Meniscus Tear',
      description: 'Tear of medial or lateral meniscus',
      icd10Code: 'S83.209A',
      riskFactors: ['Age', 'ACL deficiency', 'Deep squatting', 'Twisting injury', 'Degenerative changes'],
      symptoms: ['Joint line pain', 'Locking/catching', 'Swelling', 'Pain with squatting/twisting'],
      mechanismOfInjury: 'Rotational force on flexed knee or degenerative process',
      thresholds: [
        { metric: 'meniscalCompression', safeMax: 400, warningThreshold: 700, criticalThreshold: 1000 },
        { metric: 'rotationalStress', safeMax: 15, warningThreshold: 25, criticalThreshold: 40 },
      ],
    },
    {
      id: 'patellofemoral_pain',
      name: 'Patellofemoral Pain Syndrome',
      description: 'Anterior knee pain from patellofemoral dysfunction',
      icd10Code: 'M22.2X9',
      riskFactors: ['VMO weakness', 'Patellar maltracking', 'Overuse', 'Hip weakness', 'Flat feet'],
      symptoms: ['Anterior knee pain', 'Pain with stairs/squatting', 'Pain with prolonged sitting', 'Crepitus'],
      mechanismOfInjury: 'Abnormal patellar tracking and increased patellofemoral joint stress',
      thresholds: [
        { metric: 'patellofemoralStress', safeMax: 300, warningThreshold: 500, criticalThreshold: 800 },
        { metric: 'kneeFlexionAngle', safeMax: 90, warningThreshold: 100, criticalThreshold: 120 },
      ],
    },
    {
      id: 'itb_syndrome',
      name: 'Iliotibial Band Syndrome',
      description: 'Friction syndrome causing lateral knee pain',
      icd10Code: 'M76.30',
      riskFactors: ['Running', 'Cycling', 'ITB tightness', 'Hip weakness', 'Training errors'],
      symptoms: ['Lateral knee pain', 'Pain at 30° flexion', 'Pain with running downhill', 'No swelling'],
      mechanismOfInjury: 'Repetitive friction of ITB over lateral femoral epicondyle',
      thresholds: [
        { metric: 'itbFriction', safeMax: 50, warningThreshold: 100, criticalThreshold: 200 },
        { metric: 'runningMileage', safeMax: 30, warningThreshold: 50, criticalThreshold: 80 },
      ],
    },
    {
      id: 'patellar_tendinopathy',
      name: 'Patellar Tendinopathy (Jumper\'s Knee)',
      description: 'Overuse injury of the patellar tendon',
      icd10Code: 'M76.50',
      riskFactors: ['Jumping sports', 'Training load increase', 'Stiff landing', 'Quadriceps tightness'],
      symptoms: ['Inferior patellar pole pain', 'Pain with jumping/landing', 'Morning stiffness', 'Pain after activity'],
      mechanismOfInjury: 'Repetitive loading causing tendon microtrauma and failed healing',
      thresholds: [
        { metric: 'patellarTendonLoad', safeMax: 3000, warningThreshold: 5000, criticalThreshold: 7000 },
        { metric: 'jumpingFrequency', safeMax: 50, warningThreshold: 100, criticalThreshold: 200 },
      ],
    },
    {
      id: 'knee_osteoarthritis',
      name: 'Knee Osteoarthritis',
      description: 'Degenerative joint disease of the knee',
      icd10Code: 'M17.10',
      riskFactors: ['Age', 'Obesity', 'Previous injury', 'Meniscectomy', 'Malalignment'],
      symptoms: ['Pain with weight-bearing', 'Morning stiffness <30min', 'Crepitus', 'Joint line tenderness'],
      mechanismOfInjury: 'Progressive cartilage degeneration from mechanical and biological factors',
      thresholds: [
        { metric: 'jointSpaceWidth', safeMax: 3, warningThreshold: 2, criticalThreshold: 1 },
        { metric: 'varusAngle', safeMax: 5, warningThreshold: 10, criticalThreshold: 18 },
      ],
    },
  ],
  physiologicalParameters: {
    normalROM: { min: 0, max: 140 },
    loadTolerance: { safe: 4000, warning: 6000, critical: 8500 },
    muscleGroups: ['Quadriceps', 'Hamstrings', 'Gastrocnemius', 'Popliteus', 'Tensor Fasciae Latae'],
  },
};

export const ANKLE_PROFILE: RegionClinicalProfile = {
  regionId: 'left_ankle',
  displayName: 'Ankle & Foot',
  anatomyStructures: [
    { id: 'distal_tibia', name: 'Distal Tibia', type: 'bone', description: 'Weight-bearing surface, medial malleolus', clinicalRelevance: 'Pilon fractures, medial malleolus fracture' },
    { id: 'medial_malleolus', name: 'Medial Malleolus', type: 'bone', description: 'Medial ankle bony prominence', clinicalRelevance: 'Fracture site, deltoid attachment' },
    { id: 'distal_fibula', name: 'Distal Fibula', type: 'bone', description: 'Lateral malleolus forming ankle mortise', clinicalRelevance: 'Most common ankle fracture site' },
    { id: 'lateral_malleolus', name: 'Lateral Malleolus', type: 'bone', description: 'Lateral ankle prominence', clinicalRelevance: 'Lateral ligament attachment, fracture' },
    { id: 'talus', name: 'Talus', type: 'bone', description: 'Articulates with tibia and calcaneus', clinicalRelevance: 'Osteochondral lesions, AVN risk, fractures' },
    { id: 'talar_dome', name: 'Talar Dome', type: 'bone', description: 'Superior articular surface of talus', clinicalRelevance: 'Osteochondral defects, OA' },
    { id: 'calcaneus', name: 'Calcaneus', type: 'bone', description: 'Heel bone, Achilles attachment', clinicalRelevance: 'Stress fractures, heel pain' },
    { id: 'navicular', name: 'Navicular', type: 'bone', description: 'Medial midfoot bone', clinicalRelevance: 'Stress fractures, accessory navicular' },
    { id: 'atfl', name: 'Anterior Talofibular Ligament (ATFL)', type: 'ligament', description: 'Weakest lateral ligament, first injured', clinicalRelevance: 'Most commonly injured ankle ligament' },
    { id: 'cfl', name: 'Calcaneofibular Ligament (CFL)', type: 'ligament', description: 'Middle lateral ligament', clinicalRelevance: 'Injured with more severe sprains' },
    { id: 'ptfl', name: 'Posterior Talofibular Ligament (PTFL)', type: 'ligament', description: 'Strongest lateral ligament', clinicalRelevance: 'Rarely injured except in dislocation' },
    { id: 'deltoid_ligament', name: 'Deltoid Ligament', type: 'ligament', description: 'Strong medial ligament complex', clinicalRelevance: 'Eversion sprain, high ankle sprain' },
    { id: 'syndesmosis', name: 'Syndesmosis (AITFL/PITFL)', type: 'ligament', description: 'Tibiofibular ligaments', clinicalRelevance: 'High ankle sprain, syndesmotic injury' },
    { id: 'achilles_tendon', name: 'Achilles Tendon', type: 'ligament', description: 'Gastrocnemius/soleus to calcaneus', clinicalRelevance: 'Tendinopathy, rupture, insertional issues' },
    { id: 'tibialis_posterior', name: 'Tibialis Posterior Tendon', type: 'muscle', description: 'Medial ankle support, arch support', clinicalRelevance: 'PTTD, adult acquired flatfoot' },
    { id: 'tibialis_anterior', name: 'Tibialis Anterior', type: 'muscle', description: 'Dorsiflexor, inverts foot', clinicalRelevance: 'Tendinopathy, foot drop if weak' },
    { id: 'peroneus_longus', name: 'Peroneus Longus', type: 'muscle', description: 'Lateral ankle, everts foot', clinicalRelevance: 'Tendinopathy, subluxation, tears' },
    { id: 'peroneus_brevis', name: 'Peroneus Brevis', type: 'muscle', description: 'Lateral ankle, everts foot', clinicalRelevance: 'Tendinopathy, splits, subluxation' },
    { id: 'flexor_hallucis_longus', name: 'Flexor Hallucis Longus', type: 'muscle', description: 'Big toe flexor, posterior ankle', clinicalRelevance: 'Tendinopathy in dancers, stenosing' },
    { id: 'plantar_fascia', name: 'Plantar Fascia', type: 'ligament', description: 'Plantar foot support from calcaneus', clinicalRelevance: 'Plantar fasciitis, heel pain' },
    { id: 'spring_ligament', name: 'Spring Ligament', type: 'ligament', description: 'Supports talar head, arch support', clinicalRelevance: 'Flatfoot deformity if damaged' },
    { id: 'gastrocnemius_ankle', name: 'Gastrocnemius', type: 'muscle', description: 'Plantarflexor, crosses knee and ankle', clinicalRelevance: 'Tightness affects ankle ROM' },
    { id: 'soleus', name: 'Soleus', type: 'muscle', description: 'Deep plantarflexor', clinicalRelevance: 'Strain, compartment syndrome' },
    { id: 'tibial_nerve', name: 'Tibial Nerve', type: 'nerve', description: 'Posterior ankle, tarsal tunnel', clinicalRelevance: 'Tarsal tunnel syndrome' },
    { id: 'superficial_peroneal_nerve', name: 'Superficial Peroneal Nerve', type: 'nerve', description: 'Dorsal foot sensation', clinicalRelevance: 'Injury causes dorsal foot numbness' },
  ],
  sliderInfluences: {
    ankleDorsiflexion: [
      { slider: 'achilles_tendon', coefficient: 2.0, direction: 'increase' },
      { slider: 'posterior_capsule', coefficient: 1.5, direction: 'increase' },
      { slider: 'talar_mobility', coefficient: 1.3, direction: 'increase' },
    ],
    anklePlantarflexion: [
      { slider: 'atfl', coefficient: 1.5, direction: 'increase' },
      { slider: 'anterior_impingement', coefficient: 1.8, direction: 'decrease' },
    ],
    ankleInversion: [
      { slider: 'atfl', coefficient: 2.0, direction: 'increase' },
      { slider: 'cfl', coefficient: 1.8, direction: 'increase' },
      { slider: 'peroneal_tendons', coefficient: 1.5, direction: 'increase' },
    ],
    ankleEversion: [
      { slider: 'deltoid_ligament', coefficient: 2.0, direction: 'increase' },
      { slider: 'tibialis_posterior', coefficient: 1.5, direction: 'increase' },
      { slider: 'syndesmosis', coefficient: 1.3, direction: 'increase' },
    ],
    archHeight: [
      { slider: 'plantar_fascia', coefficient: 1.8, direction: 'bidirectional' },
      { slider: 'tibialis_posterior', coefficient: 1.5, direction: 'increase' },
      { slider: 'spring_ligament', coefficient: 1.3, direction: 'increase' },
    ],
  },
  conditions: [
    {
      id: 'lateral_ankle_sprain',
      name: 'Lateral Ankle Sprain',
      description: 'Injury to lateral ankle ligaments (ATFL, CFL, PTFL)',
      icd10Code: 'S93.401A',
      riskFactors: ['Previous sprain', 'High-risk sports', 'Poor proprioception', 'Weak peroneals'],
      symptoms: ['Lateral ankle pain', 'Swelling', 'Instability', 'Difficulty weight-bearing'],
      mechanismOfInjury: 'Inversion injury with plantarflexion causing ligament stretch/tear',
      thresholds: [
        { metric: 'inversionAngle', safeMax: 20, warningThreshold: 35, criticalThreshold: 50 },
        { metric: 'atflStrain', safeMax: 5, warningThreshold: 10, criticalThreshold: 15 },
      ],
    },
    {
      id: 'high_ankle_sprain',
      name: 'High Ankle Sprain (Syndesmosis)',
      description: 'Injury to tibiofibular syndesmotic ligaments',
      icd10Code: 'S93.431A',
      riskFactors: ['Contact sports', 'External rotation injury', 'High-velocity trauma'],
      symptoms: ['Pain above ankle', 'Pain with external rotation', 'Prolonged recovery', 'Difficulty pushing off'],
      mechanismOfInjury: 'External rotation or hyperdorsiflexion causing syndesmosis injury',
      thresholds: [
        { metric: 'syndesmoticWidening', safeMax: 5, warningThreshold: 6, criticalThreshold: 8 },
        { metric: 'externalRotationStress', safeMax: 15, warningThreshold: 25, criticalThreshold: 40 },
      ],
    },
    {
      id: 'achilles_tendinopathy',
      name: 'Achilles Tendinopathy',
      description: 'Degeneration of the Achilles tendon',
      icd10Code: 'M76.60',
      riskFactors: ['Overuse', 'Training errors', 'Tight calves', 'Age', 'Fluoroquinolone use'],
      symptoms: ['Posterior heel pain', 'Morning stiffness', 'Pain with activity', 'Tendon thickening'],
      mechanismOfInjury: 'Repetitive loading causing tendon microtrauma and failed healing',
      thresholds: [
        { metric: 'achillesLoad', safeMax: 4000, warningThreshold: 6000, criticalThreshold: 8000 },
        { metric: 'runningVolume', safeMax: 40, warningThreshold: 60, criticalThreshold: 100 },
      ],
    },
    {
      id: 'plantar_fasciitis',
      name: 'Plantar Fasciitis',
      description: 'Degeneration of plantar fascia at calcaneal origin',
      icd10Code: 'M72.2',
      riskFactors: ['Obesity', 'Prolonged standing', 'Flat feet/high arch', 'Tight calves'],
      symptoms: ['Heel pain with first steps', 'Pain after rest', 'Worse with prolonged standing', 'Medial calcaneal tenderness'],
      mechanismOfInjury: 'Repetitive tensile loading of plantar fascia causing degeneration',
      thresholds: [
        { metric: 'plantarFasciaStrain', safeMax: 8, warningThreshold: 12, criticalThreshold: 18 },
        { metric: 'archIndex', safeMax: 25, warningThreshold: 30, criticalThreshold: 40 },
      ],
    },
    {
      id: 'posterior_tibial_tendon_dysfunction',
      name: 'Posterior Tibial Tendon Dysfunction (PTTD)',
      description: 'Progressive degeneration of tibialis posterior tendon',
      icd10Code: 'M76.829',
      riskFactors: ['Female >40', 'Obesity', 'Hypertension', 'Diabetes', 'Flat feet'],
      symptoms: ['Medial ankle pain', 'Progressive flatfoot', 'Unable to single heel raise', 'Pain with stairs'],
      mechanismOfInjury: 'Progressive tendon degeneration leading to arch collapse',
      thresholds: [
        { metric: 'tibPostLoad', safeMax: 1500, warningThreshold: 2500, criticalThreshold: 4000 },
        { metric: 'archCollapse', safeMax: 10, warningThreshold: 20, criticalThreshold: 35 },
      ],
    },
    {
      id: 'ankle_osteoarthritis',
      name: 'Ankle Osteoarthritis',
      description: 'Degenerative joint disease of the ankle',
      icd10Code: 'M19.071',
      riskFactors: ['Previous trauma', 'Fractures', 'Recurrent sprains', 'Malalignment'],
      symptoms: ['Pain with weight-bearing', 'Stiffness', 'Reduced ROM', 'Swelling'],
      mechanismOfInjury: 'Post-traumatic cartilage degeneration or primary OA',
      thresholds: [
        { metric: 'ankleJointSpace', safeMax: 3, warningThreshold: 2, criticalThreshold: 1 },
        { metric: 'osteophyteSize', safeMax: 2, warningThreshold: 4, criticalThreshold: 8 },
      ],
    },
  ],
  physiologicalParameters: {
    normalROM: { min: -20, max: 50 },
    loadTolerance: { safe: 3500, warning: 5000, critical: 7000 },
    muscleGroups: ['Gastrocnemius', 'Soleus', 'Tibialis Posterior', 'Tibialis Anterior', 'Peroneals', 'Toe Flexors/Extensors'],
  },
};

export const REGION_PROFILES: Partial<Record<AnatomicalRegion, RegionClinicalProfile>> = {
  lumbar_spine: LUMBAR_SPINE_PROFILE,
  cervical_spine: CERVICAL_SPINE_PROFILE,
  thoracic_spine: THORACIC_SPINE_PROFILE,
  pelvis: PELVIS_PROFILE,
  left_hip: HIP_PROFILE,
  right_hip: HIP_PROFILE,
  left_knee: KNEE_PROFILE,
  right_knee: KNEE_PROFILE,
  left_ankle: ANKLE_PROFILE,
  right_ankle: ANKLE_PROFILE,
};

export interface StructureLoadAnalysis {
  structureId: string;
  structureName: string;
  loadType: 'compression' | 'shear' | 'tension' | 'torsion';
  currentLoad: number;
  safeThreshold: number;
  warningThreshold: number;
  criticalThreshold: number;
  percentOfCritical: number;
  status: 'safe' | 'caution' | 'warning' | 'critical';
}

export interface ConditionProbability {
  conditionId: string;
  conditionName: string;
  probability: number;
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  contributingFactors: string[];
  protectiveFactors: string[];
}

export interface RegionAnalysisResult {
  regionId: AnatomicalRegion;
  timestamp: number;
  structureLoads: StructureLoadAnalysis[];
  conditionProbabilities: ConditionProbability[];
  overallRiskScore: number;
  clinicalSummary: string;
}

export function calculateLumbarStructureLoads(
  spineFlexion: number,
  spineRotation: number,
  spineLateralFlexion: number,
  pelvisTilt: number,
  bodyWeightKg: number = 70
): StructureLoadAnalysis[] {
  const baseCompression = bodyWeightKg * 9.81 * 0.55;
  const flexionRad = (spineFlexion * Math.PI) / 180;
  const rotationRad = (spineRotation * Math.PI) / 180;
  
  const isExtension = spineFlexion < 0;
  const extensionMagnitude = isExtension ? Math.abs(spineFlexion) : 0;
  const flexionMagnitude = !isExtension ? spineFlexion : 0;
  
  const discCompressionMultiplier = 1 + Math.sin(flexionRad) * 2.5;
  const shearMultiplier = Math.sin(flexionRad);
  const facetLoadMultiplier = isExtension ? 1 + (extensionMagnitude / 15) * 1.5 : 0.3;
  const rotationStress = Math.abs(rotationRad) * 0.5;
  
  const l4l5DiscCompression = baseCompression * discCompressionMultiplier * 1.1;
  const l5s1DiscCompression = baseCompression * discCompressionMultiplier * 1.0;
  const l3l4DiscCompression = baseCompression * discCompressionMultiplier * 0.9;
  
  const l4l5Shear = baseCompression * shearMultiplier * 0.4;
  const parsStress = baseCompression * (extensionMagnitude / 30) * 0.6 + Math.abs(rotationRad) * 200;
  
  const facetL4L5Load = baseCompression * facetLoadMultiplier * 0.25;
  const facetL5S1Load = baseCompression * facetLoadMultiplier * 0.28;
  
  const spinousGap = Math.max(2, 12 - extensionMagnitude * 0.3);
  
  const getStatus = (value: number, safe: number, warning: number, critical: number): 'safe' | 'caution' | 'warning' | 'critical' => {
    if (value < safe) return 'safe';
    if (value < warning) return 'caution';
    if (value < critical) return 'warning';
    return 'critical';
  };
  
  return [
    {
      structureId: 'l4_l5_disc',
      structureName: 'L4-L5 Disc',
      loadType: 'compression',
      currentLoad: Math.round(l4l5DiscCompression),
      safeThreshold: 2000,
      warningThreshold: 3500,
      criticalThreshold: 5000,
      percentOfCritical: Math.round((l4l5DiscCompression / 5000) * 100),
      status: getStatus(l4l5DiscCompression, 2000, 3500, 5000),
    },
    {
      structureId: 'l5_s1_disc',
      structureName: 'L5-S1 Disc',
      loadType: 'compression',
      currentLoad: Math.round(l5s1DiscCompression),
      safeThreshold: 2200,
      warningThreshold: 3800,
      criticalThreshold: 5500,
      percentOfCritical: Math.round((l5s1DiscCompression / 5500) * 100),
      status: getStatus(l5s1DiscCompression, 2200, 3800, 5500),
    },
    {
      structureId: 'l3_l4_disc',
      structureName: 'L3-L4 Disc',
      loadType: 'compression',
      currentLoad: Math.round(l3l4DiscCompression),
      safeThreshold: 1800,
      warningThreshold: 3200,
      criticalThreshold: 4500,
      percentOfCritical: Math.round((l3l4DiscCompression / 4500) * 100),
      status: getStatus(l3l4DiscCompression, 1800, 3200, 4500),
    },
    {
      structureId: 'l4_l5_disc_shear',
      structureName: 'L4-L5 Disc (Shear)',
      loadType: 'shear',
      currentLoad: Math.round(l4l5Shear),
      safeThreshold: 400,
      warningThreshold: 600,
      criticalThreshold: 800,
      percentOfCritical: Math.round((l4l5Shear / 800) * 100),
      status: getStatus(l4l5Shear, 400, 600, 800),
    },
    {
      structureId: 'facet_l4_l5',
      structureName: 'L4-L5 Facet Joints',
      loadType: 'compression',
      currentLoad: Math.round(facetL4L5Load),
      safeThreshold: 600,
      warningThreshold: 1000,
      criticalThreshold: 1500,
      percentOfCritical: Math.round((facetL4L5Load / 1500) * 100),
      status: getStatus(facetL4L5Load, 600, 1000, 1500),
    },
    {
      structureId: 'facet_l5_s1',
      structureName: 'L5-S1 Facet Joints',
      loadType: 'compression',
      currentLoad: Math.round(facetL5S1Load),
      safeThreshold: 650,
      warningThreshold: 1100,
      criticalThreshold: 1600,
      percentOfCritical: Math.round((facetL5S1Load / 1600) * 100),
      status: getStatus(facetL5S1Load, 650, 1100, 1600),
    },
    {
      structureId: 'pars_l5',
      structureName: 'L5 Pars Interarticularis',
      loadType: 'shear',
      currentLoad: Math.round(parsStress),
      safeThreshold: 500,
      warningThreshold: 800,
      criticalThreshold: 1200,
      percentOfCritical: Math.round((parsStress / 1200) * 100),
      status: getStatus(parsStress, 500, 800, 1200),
    },
    {
      structureId: 'spinous_gap',
      structureName: 'Spinous Process Gap (L4-L5)',
      loadType: 'compression',
      currentLoad: Math.round(spinousGap * 10) / 10,
      safeThreshold: 8,
      warningThreshold: 4,
      criticalThreshold: 1,
      percentOfCritical: Math.round(((12 - spinousGap) / 11) * 100),
      status: spinousGap > 8 ? 'safe' : spinousGap > 4 ? 'caution' : spinousGap > 1 ? 'warning' : 'critical',
    },
  ];
}

export function calculateConditionProbabilities(
  structureLoads: StructureLoadAnalysis[],
  spineFlexion: number,
  spineRotation: number,
  pelvisTilt: number
): ConditionProbability[] {
  const getLoadByStructure = (id: string) => structureLoads.find(s => s.structureId === id);
  
  const isExtension = spineFlexion < 0;
  const extensionMagnitude = isExtension ? Math.abs(spineFlexion) : 0;
  const flexionMagnitude = !isExtension ? spineFlexion : 0;
  
  const l4l5Disc = getLoadByStructure('l4_l5_disc');
  const l4l5Shear = getLoadByStructure('l4_l5_disc_shear');
  const facetL4L5 = getLoadByStructure('facet_l4_l5');
  const parsL5 = getLoadByStructure('pars_l5');
  const spinousGap = getLoadByStructure('spinous_gap');
  
  const getRiskLevel = (prob: number): 'minimal' | 'low' | 'moderate' | 'high' | 'critical' => {
    if (prob < 15) return 'minimal';
    if (prob < 30) return 'low';
    if (prob < 50) return 'moderate';
    if (prob < 75) return 'high';
    return 'critical';
  };
  
  let discBulgeProbability = 5;
  const discBulgeFactors: string[] = [];
  const discBulgeProtective: string[] = [];
  
  if (l4l5Disc && l4l5Disc.percentOfCritical > 40) {
    discBulgeProbability += l4l5Disc.percentOfCritical * 0.4;
    discBulgeFactors.push(`High L4-L5 disc compression (${l4l5Disc.currentLoad}N)`);
  }
  if (flexionMagnitude > 30) {
    discBulgeProbability += (flexionMagnitude - 30) * 1.5;
    discBulgeFactors.push(`Excessive flexion (${Math.round(flexionMagnitude)}°)`);
  }
  if (Math.abs(spineRotation) > 10 && flexionMagnitude > 20) {
    discBulgeProbability += 15;
    discBulgeFactors.push('Combined flexion + rotation loading');
  }
  if (flexionMagnitude < 20 && isExtension === false) {
    discBulgeProtective.push('Neutral spine position');
  }
  
  let spondyProbability = 5;
  const spondyFactors: string[] = [];
  const spondyProtective: string[] = [];
  
  if (l4l5Shear && l4l5Shear.percentOfCritical > 40) {
    spondyProbability += l4l5Shear.percentOfCritical * 0.5;
    spondyFactors.push(`High shear forces (${l4l5Shear.currentLoad}N)`);
  }
  if (extensionMagnitude > 20) {
    spondyProbability += (extensionMagnitude - 20) * 1.2;
    spondyFactors.push(`Hyperextension (${Math.round(extensionMagnitude)}°)`);
  }
  if (pelvisTilt > 15) {
    spondyProbability += (pelvisTilt - 15) * 0.8;
    spondyFactors.push(`Excessive anterior pelvic tilt (${Math.round(pelvisTilt)}°)`);
  }
  if (extensionMagnitude < 15 && pelvisTilt < 12) {
    spondyProtective.push('Neutral pelvic alignment');
  }
  
  let spondylolysisProbability = 3;
  const spondylolysisFactors: string[] = [];
  const spondylolysisProtective: string[] = [];
  
  if (parsL5 && parsL5.percentOfCritical > 50) {
    spondylolysisProbability += parsL5.percentOfCritical * 0.6;
    spondylolysisFactors.push(`High pars stress (${parsL5.currentLoad}N)`);
  }
  if (extensionMagnitude > 25 && Math.abs(spineRotation) > 8) {
    spondylolysisProbability += 20;
    spondylolysisFactors.push('Combined extension + rotation');
  }
  if (extensionMagnitude < 20) {
    spondylolysisProtective.push('Limited extension stress');
  }
  
  let facetProbability = 5;
  const facetFactors: string[] = [];
  const facetProtective: string[] = [];
  
  if (facetL4L5 && facetL4L5.percentOfCritical > 40) {
    facetProbability += facetL4L5.percentOfCritical * 0.5;
    facetFactors.push(`High facet loading (${facetL4L5.currentLoad}N)`);
  }
  if (extensionMagnitude > 15) {
    facetProbability += (extensionMagnitude - 15) * 1.5;
    facetFactors.push(`Extension loading (${Math.round(extensionMagnitude)}°)`);
  }
  if (Math.abs(spineRotation) > 10) {
    facetProbability += Math.abs(spineRotation) * 0.8;
    facetFactors.push(`Rotational loading (${Math.round(Math.abs(spineRotation))}°)`);
  }
  if (extensionMagnitude < 10 && Math.abs(spineRotation) < 8) {
    facetProtective.push('Neutral posture');
  }
  
  let kissingProbability = 2;
  const kissingFactors: string[] = [];
  const kissingProtective: string[] = [];
  
  if (spinousGap && spinousGap.currentLoad < 6) {
    kissingProbability += (6 - spinousGap.currentLoad) * 10;
    kissingFactors.push(`Reduced spinous process gap (${spinousGap.currentLoad}mm)`);
  }
  if (extensionMagnitude > 25) {
    kissingProbability += (extensionMagnitude - 25) * 1.5;
    kissingFactors.push(`Hyperextension (${Math.round(extensionMagnitude)}°)`);
  }
  if (spinousGap && spinousGap.currentLoad > 8) {
    kissingProtective.push('Normal spinous process spacing');
  }
  
  let stenosisProbability = 3;
  const stenosisFactors: string[] = [];
  const stenosisProtective: string[] = [];
  
  if (extensionMagnitude > 20) {
    stenosisProbability += extensionMagnitude * 0.8;
    stenosisFactors.push(`Extension narrows canal (${Math.round(extensionMagnitude)}°)`);
  }
  if (facetL4L5 && facetL4L5.percentOfCritical > 60) {
    stenosisProbability += 10;
    stenosisFactors.push('Facet hypertrophy contribution');
  }
  if (flexionMagnitude > 20) {
    stenosisProbability = Math.max(3, stenosisProbability - 10);
    stenosisProtective.push('Flexion opens canal');
  }
  
  return [
    {
      conditionId: 'disc_bulge',
      conditionName: 'Disc Bulge/Herniation',
      probability: Math.min(95, Math.round(discBulgeProbability)),
      riskLevel: getRiskLevel(discBulgeProbability),
      contributingFactors: discBulgeFactors,
      protectiveFactors: discBulgeProtective,
    },
    {
      conditionId: 'spondylolisthesis',
      conditionName: 'Spondylolisthesis',
      probability: Math.min(95, Math.round(spondyProbability)),
      riskLevel: getRiskLevel(spondyProbability),
      contributingFactors: spondyFactors,
      protectiveFactors: spondyProtective,
    },
    {
      conditionId: 'spondylolysis',
      conditionName: 'Spondylolysis (Pars Defect)',
      probability: Math.min(95, Math.round(spondylolysisProbability)),
      riskLevel: getRiskLevel(spondylolysisProbability),
      contributingFactors: spondylolysisFactors,
      protectiveFactors: spondylolysisProtective,
    },
    {
      conditionId: 'facet_syndrome',
      conditionName: 'Facet Joint Syndrome',
      probability: Math.min(95, Math.round(facetProbability)),
      riskLevel: getRiskLevel(facetProbability),
      contributingFactors: facetFactors,
      protectiveFactors: facetProtective,
    },
    {
      conditionId: 'kissing_spine',
      conditionName: 'Kissing Spine (Baastrup\'s)',
      probability: Math.min(95, Math.round(kissingProbability)),
      riskLevel: getRiskLevel(kissingProbability),
      contributingFactors: kissingFactors,
      protectiveFactors: kissingProtective,
    },
    {
      conditionId: 'spinal_stenosis',
      conditionName: 'Spinal Stenosis Risk',
      probability: Math.min(95, Math.round(stenosisProbability)),
      riskLevel: getRiskLevel(stenosisProbability),
      contributingFactors: stenosisFactors,
      protectiveFactors: stenosisProtective,
    },
  ];
}

export function calculateCervicalStructureLoads(
  neckFlexion: number,
  neckRotation: number,
  neckLateralFlexion: number,
  forwardHead: number,
  bodyWeightKg: number = 70
): StructureLoadAnalysis[] {
  const headWeight = bodyWeightKg * 0.08 * 9.81;
  const flexionRad = (neckFlexion * Math.PI) / 180;
  const rotationRad = (neckRotation * Math.PI) / 180;
  
  const isExtension = neckFlexion < 0;
  const extensionMagnitude = isExtension ? Math.abs(neckFlexion) : 0;
  const flexionMagnitude = !isExtension ? neckFlexion : 0;
  
  const forwardHeadMultiplier = 1 + (forwardHead / 10) * 0.5;
  const discCompressionMultiplier = (1 + Math.sin(flexionRad) * 1.5) * forwardHeadMultiplier;
  const facetLoadMultiplier = isExtension ? 1 + (extensionMagnitude / 20) * 2.0 : 0.2;
  
  const c5c6DiscCompression = headWeight * discCompressionMultiplier * 1.2;
  const c6c7DiscCompression = headWeight * discCompressionMultiplier * 1.1;
  const facetC5C6Load = headWeight * facetLoadMultiplier * 0.3;
  const upperCervicalStress = headWeight * (Math.abs(rotationRad) * 0.8 + extensionMagnitude / 30);
  const ligamentStress = headWeight * (flexionMagnitude / 40 + Math.abs(rotationRad) * 0.5);
  
  const getStatus = (value: number, safe: number, warning: number, critical: number): 'safe' | 'caution' | 'warning' | 'critical' => {
    if (value < safe) return 'safe';
    if (value < warning) return 'caution';
    if (value < critical) return 'warning';
    return 'critical';
  };
  
  return [
    {
      structureId: 'c5_c6_disc',
      structureName: 'C5-C6 Disc',
      loadType: 'compression',
      currentLoad: Math.round(c5c6DiscCompression),
      safeThreshold: 800,
      warningThreshold: 1200,
      criticalThreshold: 1800,
      percentOfCritical: Math.round((c5c6DiscCompression / 1800) * 100),
      status: getStatus(c5c6DiscCompression, 800, 1200, 1800),
    },
    {
      structureId: 'c6_c7_disc',
      structureName: 'C6-C7 Disc',
      loadType: 'compression',
      currentLoad: Math.round(c6c7DiscCompression),
      safeThreshold: 750,
      warningThreshold: 1100,
      criticalThreshold: 1600,
      percentOfCritical: Math.round((c6c7DiscCompression / 1600) * 100),
      status: getStatus(c6c7DiscCompression, 750, 1100, 1600),
    },
    {
      structureId: 'facet_c5_c6',
      structureName: 'C5-C6 Facet Joints',
      loadType: 'compression',
      currentLoad: Math.round(facetC5C6Load),
      safeThreshold: 400,
      warningThreshold: 700,
      criticalThreshold: 1000,
      percentOfCritical: Math.round((facetC5C6Load / 1000) * 100),
      status: getStatus(facetC5C6Load, 400, 700, 1000),
    },
    {
      structureId: 'upper_cervical',
      structureName: 'Upper Cervical (C0-C2)',
      loadType: 'shear',
      currentLoad: Math.round(upperCervicalStress),
      safeThreshold: 300,
      warningThreshold: 500,
      criticalThreshold: 800,
      percentOfCritical: Math.round((upperCervicalStress / 800) * 100),
      status: getStatus(upperCervicalStress, 300, 500, 800),
    },
    {
      structureId: 'ligament_stress',
      structureName: 'Cervical Ligaments',
      loadType: 'tension',
      currentLoad: Math.round(ligamentStress),
      safeThreshold: 200,
      warningThreshold: 400,
      criticalThreshold: 650,
      percentOfCritical: Math.round((ligamentStress / 650) * 100),
      status: getStatus(ligamentStress, 200, 400, 650),
    },
  ];
}

export function calculateCervicalConditions(
  structureLoads: StructureLoadAnalysis[],
  neckFlexion: number,
  neckRotation: number,
  forwardHead: number
): ConditionProbability[] {
  const getLoadByStructure = (id: string) => structureLoads.find(s => s.structureId === id);
  const isExtension = neckFlexion < 0;
  const extensionMagnitude = isExtension ? Math.abs(neckFlexion) : 0;
  const flexionMagnitude = !isExtension ? neckFlexion : 0;
  
  const c5c6Disc = getLoadByStructure('c5_c6_disc');
  const facetC5C6 = getLoadByStructure('facet_c5_c6');
  const upperCervical = getLoadByStructure('upper_cervical');
  
  const getRiskLevel = (prob: number): 'minimal' | 'low' | 'moderate' | 'high' | 'critical' => {
    if (prob < 15) return 'minimal';
    if (prob < 30) return 'low';
    if (prob < 50) return 'moderate';
    if (prob < 75) return 'high';
    return 'critical';
  };
  
  let discHerniationProb = 5;
  const discFactors: string[] = [];
  const discProtective: string[] = [];
  if (c5c6Disc && c5c6Disc.percentOfCritical > 40) {
    discHerniationProb += c5c6Disc.percentOfCritical * 0.4;
    discFactors.push(`High C5-C6 disc compression (${c5c6Disc.currentLoad}N)`);
  }
  if (flexionMagnitude > 40) {
    discHerniationProb += (flexionMagnitude - 40) * 1.2;
    discFactors.push(`Excessive flexion (${Math.round(flexionMagnitude)}°)`);
  }
  if (forwardHead > 15) {
    discHerniationProb += (forwardHead - 15) * 0.8;
    discFactors.push(`Forward head posture (${Math.round(forwardHead)}mm)`);
  }
  if (flexionMagnitude < 30 && forwardHead < 10) {
    discProtective.push('Neutral cervical position');
  }
  
  let facetProb = 5;
  const facetFactors: string[] = [];
  const facetProtective: string[] = [];
  if (facetC5C6 && facetC5C6.percentOfCritical > 40) {
    facetProb += facetC5C6.percentOfCritical * 0.5;
    facetFactors.push(`High facet loading (${facetC5C6.currentLoad}N)`);
  }
  if (extensionMagnitude > 35) {
    facetProb += (extensionMagnitude - 35) * 1.5;
    facetFactors.push(`Extension loading (${Math.round(extensionMagnitude)}°)`);
  }
  if (Math.abs(neckRotation) > 50) {
    facetProb += (Math.abs(neckRotation) - 50) * 0.6;
    facetFactors.push(`Rotation stress (${Math.round(Math.abs(neckRotation))}°)`);
  }
  if (extensionMagnitude < 25 && Math.abs(neckRotation) < 40) {
    facetProtective.push('Within normal ROM');
  }
  
  let headacheProb = 5;
  const headacheFactors: string[] = [];
  const headacheProtective: string[] = [];
  if (upperCervical && upperCervical.percentOfCritical > 40) {
    headacheProb += upperCervical.percentOfCritical * 0.6;
    headacheFactors.push(`Upper cervical stress (${upperCervical.currentLoad}N)`);
  }
  if (forwardHead > 20) {
    headacheProb += (forwardHead - 20) * 1.0;
    headacheFactors.push(`Forward head posture (${Math.round(forwardHead)}mm)`);
  }
  if (forwardHead < 15) {
    headacheProtective.push('Neutral head position');
  }
  
  let radiculopathyProb = 3;
  const radicFactors: string[] = [];
  const radicProtective: string[] = [];
  if (c5c6Disc && c5c6Disc.percentOfCritical > 50) {
    radiculopathyProb += c5c6Disc.percentOfCritical * 0.5;
    radicFactors.push(`High disc compression (${c5c6Disc.currentLoad}N)`);
  }
  if (extensionMagnitude > 40 && Math.abs(neckRotation) > 40) {
    radiculopathyProb += 15;
    radicFactors.push('Combined extension + rotation (Spurling mechanism)');
  }
  if (extensionMagnitude < 30) {
    radicProtective.push('Minimal foraminal narrowing');
  }
  
  return [
    { conditionId: 'cervical_disc', conditionName: 'Cervical Disc Herniation', probability: Math.min(95, Math.round(discHerniationProb)), riskLevel: getRiskLevel(discHerniationProb), contributingFactors: discFactors, protectiveFactors: discProtective },
    { conditionId: 'cervical_facet', conditionName: 'Cervical Facet Syndrome', probability: Math.min(95, Math.round(facetProb)), riskLevel: getRiskLevel(facetProb), contributingFactors: facetFactors, protectiveFactors: facetProtective },
    { conditionId: 'cervicogenic_headache', conditionName: 'Cervicogenic Headache', probability: Math.min(95, Math.round(headacheProb)), riskLevel: getRiskLevel(headacheProb), contributingFactors: headacheFactors, protectiveFactors: headacheProtective },
    { conditionId: 'cervical_radiculopathy', conditionName: 'Cervical Radiculopathy', probability: Math.min(95, Math.round(radiculopathyProb)), riskLevel: getRiskLevel(radiculopathyProb), contributingFactors: radicFactors, protectiveFactors: radicProtective },
  ];
}

export function calculateThoracicStructureLoads(
  thoracicKyphosis: number,
  thoracicRotation: number,
  ribExpansion: number,
  bodyWeightKg: number = 70
): StructureLoadAnalysis[] {
  const baseCompression = bodyWeightKg * 9.81 * 0.4;
  const kyphosisRad = (thoracicKyphosis * Math.PI) / 180;
  const rotationRad = (thoracicRotation * Math.PI) / 180;
  
  const discCompressionMultiplier = 1 + Math.abs(kyphosisRad - 0.6) * 0.8;
  const costovertebralStress = baseCompression * Math.abs(rotationRad) * 0.3 + ribExpansion * 5;
  
  const t6t7DiscCompression = baseCompression * discCompressionMultiplier * 0.9;
  const t11t12DiscCompression = baseCompression * discCompressionMultiplier * 1.1;
  const ribJointStress = costovertebralStress;
  
  const getStatus = (value: number, safe: number, warning: number, critical: number): 'safe' | 'caution' | 'warning' | 'critical' => {
    if (value < safe) return 'safe';
    if (value < warning) return 'caution';
    if (value < critical) return 'warning';
    return 'critical';
  };
  
  return [
    {
      structureId: 't6_t7_disc',
      structureName: 'T6-T7 Disc',
      loadType: 'compression',
      currentLoad: Math.round(t6t7DiscCompression),
      safeThreshold: 600,
      warningThreshold: 1000,
      criticalThreshold: 1500,
      percentOfCritical: Math.round((t6t7DiscCompression / 1500) * 100),
      status: getStatus(t6t7DiscCompression, 600, 1000, 1500),
    },
    {
      structureId: 't11_t12_disc',
      structureName: 'T11-T12 Disc',
      loadType: 'compression',
      currentLoad: Math.round(t11t12DiscCompression),
      safeThreshold: 800,
      warningThreshold: 1200,
      criticalThreshold: 1800,
      percentOfCritical: Math.round((t11t12DiscCompression / 1800) * 100),
      status: getStatus(t11t12DiscCompression, 800, 1200, 1800),
    },
    {
      structureId: 'costovertebral',
      structureName: 'Costovertebral Joints',
      loadType: 'shear',
      currentLoad: Math.round(ribJointStress),
      safeThreshold: 200,
      warningThreshold: 400,
      criticalThreshold: 600,
      percentOfCritical: Math.round((ribJointStress / 600) * 100),
      status: getStatus(ribJointStress, 200, 400, 600),
    },
    {
      structureId: 'costochondral',
      structureName: 'Costochondral Junctions',
      loadType: 'tension',
      currentLoad: Math.round(ribExpansion * 8),
      safeThreshold: 150,
      warningThreshold: 300,
      criticalThreshold: 500,
      percentOfCritical: Math.round((ribExpansion * 8 / 500) * 100),
      status: getStatus(ribExpansion * 8, 150, 300, 500),
    },
  ];
}

export function calculateThoracicConditions(
  structureLoads: StructureLoadAnalysis[],
  thoracicKyphosis: number,
  thoracicRotation: number
): ConditionProbability[] {
  const getLoadByStructure = (id: string) => structureLoads.find(s => s.structureId === id);
  const costovertebral = getLoadByStructure('costovertebral');
  const t11t12Disc = getLoadByStructure('t11_t12_disc');
  const costochondral = getLoadByStructure('costochondral');
  
  const getRiskLevel = (prob: number): 'minimal' | 'low' | 'moderate' | 'high' | 'critical' => {
    if (prob < 15) return 'minimal';
    if (prob < 30) return 'low';
    if (prob < 50) return 'moderate';
    if (prob < 75) return 'high';
    return 'critical';
  };
  
  let ribDysfunctionProb = 5;
  const ribFactors: string[] = [];
  const ribProtective: string[] = [];
  if (costovertebral && costovertebral.percentOfCritical > 40) {
    ribDysfunctionProb += costovertebral.percentOfCritical * 0.5;
    ribFactors.push(`Elevated costovertebral stress (${costovertebral.currentLoad}N)`);
  }
  if (Math.abs(thoracicRotation) > 25) {
    ribDysfunctionProb += (Math.abs(thoracicRotation) - 25) * 1.0;
    ribFactors.push(`Rotational loading (${Math.round(Math.abs(thoracicRotation))}°)`);
  }
  if (Math.abs(thoracicRotation) < 20) {
    ribProtective.push('Within normal rotation ROM');
  }
  
  let kyphosisProb = 5;
  const kyphFactors: string[] = [];
  const kyphProtective: string[] = [];
  if (thoracicKyphosis > 50) {
    kyphosisProb += (thoracicKyphosis - 50) * 2.0;
    kyphFactors.push(`Hyperkyphosis (${Math.round(thoracicKyphosis)}°)`);
  }
  if (thoracicKyphosis >= 30 && thoracicKyphosis <= 45) {
    kyphProtective.push('Normal kyphosis range');
  }
  
  let costochondritisProb = 3;
  const costoFactors: string[] = [];
  const costoProtective: string[] = [];
  if (costochondral && costochondral.percentOfCritical > 40) {
    costochondritisProb += costochondral.percentOfCritical * 0.4;
    costoFactors.push(`Costochondral junction stress (${costochondral.currentLoad}N)`);
  }
  if (costochondral && costochondral.percentOfCritical < 30) {
    costoProtective.push('Low junction stress');
  }
  
  let discProb = 3;
  const discFactors: string[] = [];
  const discProtective: string[] = [];
  if (t11t12Disc && t11t12Disc.percentOfCritical > 50) {
    discProb += t11t12Disc.percentOfCritical * 0.4;
    discFactors.push(`High T11-T12 disc loading (${t11t12Disc.currentLoad}N)`);
  }
  if (t11t12Disc && t11t12Disc.percentOfCritical < 40) {
    discProtective.push('Normal disc loading');
  }
  
  return [
    { conditionId: 'rib_dysfunction', conditionName: 'Rib Dysfunction', probability: Math.min(95, Math.round(ribDysfunctionProb)), riskLevel: getRiskLevel(ribDysfunctionProb), contributingFactors: ribFactors, protectiveFactors: ribProtective },
    { conditionId: 'hyperkyphosis', conditionName: 'Hyperkyphosis/Scheuermann\'s', probability: Math.min(95, Math.round(kyphosisProb)), riskLevel: getRiskLevel(kyphosisProb), contributingFactors: kyphFactors, protectiveFactors: kyphProtective },
    { conditionId: 'costochondritis', conditionName: 'Costochondritis', probability: Math.min(95, Math.round(costochondritisProb)), riskLevel: getRiskLevel(costochondritisProb), contributingFactors: costoFactors, protectiveFactors: costoProtective },
    { conditionId: 'thoracic_disc', conditionName: 'Thoracic Disc Herniation', probability: Math.min(95, Math.round(discProb)), riskLevel: getRiskLevel(discProb), contributingFactors: discFactors, protectiveFactors: discProtective },
  ];
}

export function calculatePelvicStructureLoads(
  pelvisTilt: number,
  pelvicObliquity: number,
  pelvicRotation: number,
  hipFlexion: number,
  bodyWeightKg: number = 70
): StructureLoadAnalysis[] {
  const baseLoad = bodyWeightKg * 9.81 * 0.5;
  const tiltRad = (pelvisTilt * Math.PI) / 180;
  const obliquityRad = (pelvicObliquity * Math.PI) / 180;
  
  const siJointShear = baseLoad * (Math.abs(tiltRad) * 0.3 + Math.abs(obliquityRad) * 0.5);
  const pubicStress = baseLoad * Math.abs(obliquityRad) * 0.4;
  const piriformisLoad = 30 + hipFlexion * 0.8 + Math.abs(pelvicRotation) * 0.5;
  const lumbosacralStress = baseLoad * (1 + Math.abs(tiltRad) * 1.5);
  
  const getStatus = (value: number, safe: number, warning: number, critical: number): 'safe' | 'caution' | 'warning' | 'critical' => {
    if (value < safe) return 'safe';
    if (value < warning) return 'caution';
    if (value < critical) return 'warning';
    return 'critical';
  };
  
  return [
    {
      structureId: 'si_joint',
      structureName: 'SI Joints',
      loadType: 'shear',
      currentLoad: Math.round(siJointShear),
      safeThreshold: 400,
      warningThreshold: 700,
      criticalThreshold: 1000,
      percentOfCritical: Math.round((siJointShear / 1000) * 100),
      status: getStatus(siJointShear, 400, 700, 1000),
    },
    {
      structureId: 'pubic_symphysis',
      structureName: 'Pubic Symphysis',
      loadType: 'shear',
      currentLoad: Math.round(pubicStress),
      safeThreshold: 200,
      warningThreshold: 400,
      criticalThreshold: 650,
      percentOfCritical: Math.round((pubicStress / 650) * 100),
      status: getStatus(pubicStress, 200, 400, 650),
    },
    {
      structureId: 'piriformis',
      structureName: 'Piriformis Muscle',
      loadType: 'tension',
      currentLoad: Math.round(piriformisLoad),
      safeThreshold: 40,
      warningThreshold: 60,
      criticalThreshold: 85,
      percentOfCritical: Math.round((piriformisLoad / 85) * 100),
      status: getStatus(piriformisLoad, 40, 60, 85),
    },
    {
      structureId: 'lumbosacral',
      structureName: 'Lumbosacral Junction',
      loadType: 'compression',
      currentLoad: Math.round(lumbosacralStress),
      safeThreshold: 500,
      warningThreshold: 800,
      criticalThreshold: 1200,
      percentOfCritical: Math.round((lumbosacralStress / 1200) * 100),
      status: getStatus(lumbosacralStress, 500, 800, 1200),
    },
  ];
}

export function calculatePelvicConditions(
  structureLoads: StructureLoadAnalysis[],
  pelvisTilt: number,
  pelvicObliquity: number,
  hipFlexion: number
): ConditionProbability[] {
  const getLoadByStructure = (id: string) => structureLoads.find(s => s.structureId === id);
  const siJoint = getLoadByStructure('si_joint');
  const pubic = getLoadByStructure('pubic_symphysis');
  const piriformis = getLoadByStructure('piriformis');
  
  const getRiskLevel = (prob: number): 'minimal' | 'low' | 'moderate' | 'high' | 'critical' => {
    if (prob < 15) return 'minimal';
    if (prob < 30) return 'low';
    if (prob < 50) return 'moderate';
    if (prob < 75) return 'high';
    return 'critical';
  };
  
  let siDysfunctionProb = 5;
  const siFactors: string[] = [];
  const siProtective: string[] = [];
  if (siJoint && siJoint.percentOfCritical > 40) {
    siDysfunctionProb += siJoint.percentOfCritical * 0.5;
    siFactors.push(`Elevated SI joint shear (${siJoint.currentLoad}N)`);
  }
  if (Math.abs(pelvicObliquity) > 5) {
    siDysfunctionProb += Math.abs(pelvicObliquity) * 2.0;
    siFactors.push(`Pelvic obliquity (${Math.round(Math.abs(pelvicObliquity))}°)`);
  }
  if (Math.abs(pelvicObliquity) < 3 && Math.abs(pelvisTilt) < 10) {
    siProtective.push('Neutral pelvic alignment');
  }
  
  let piriformisProb = 5;
  const piriFactors: string[] = [];
  const piriProtective: string[] = [];
  if (piriformis && piriformis.percentOfCritical > 50) {
    piriformisProb += piriformis.percentOfCritical * 0.6;
    piriFactors.push(`High piriformis tension (${piriformis.currentLoad}%)`);
  }
  if (hipFlexion > 60) {
    piriformisProb += (hipFlexion - 60) * 0.8;
    piriFactors.push(`Prolonged hip flexion (${Math.round(hipFlexion)}°)`);
  }
  if (hipFlexion < 45) {
    piriProtective.push('Moderate hip flexion');
  }
  
  let pubicProb = 3;
  const pubicFactors: string[] = [];
  const pubicProtective: string[] = [];
  if (pubic && pubic.percentOfCritical > 40) {
    pubicProb += pubic.percentOfCritical * 0.4;
    pubicFactors.push(`Pubic symphysis shear (${pubic.currentLoad}N)`);
  }
  if (Math.abs(pelvicObliquity) > 8) {
    pubicProb += (Math.abs(pelvicObliquity) - 8) * 1.5;
    pubicFactors.push(`Pelvic asymmetry (${Math.round(Math.abs(pelvicObliquity))}°)`);
  }
  if (Math.abs(pelvicObliquity) < 5) {
    pubicProtective.push('Symmetric pelvis');
  }
  
  let obliquityProb = 5;
  const obliqFactors: string[] = [];
  const obliqProtective: string[] = [];
  if (Math.abs(pelvicObliquity) > 5) {
    obliquityProb += Math.abs(pelvicObliquity) * 3.0;
    obliqFactors.push(`Pelvic obliquity (${Math.round(Math.abs(pelvicObliquity))}°)`);
  }
  if (Math.abs(pelvicObliquity) < 3) {
    obliqProtective.push('Level pelvis');
  }
  
  return [
    { conditionId: 'si_dysfunction', conditionName: 'SI Joint Dysfunction', probability: Math.min(95, Math.round(siDysfunctionProb)), riskLevel: getRiskLevel(siDysfunctionProb), contributingFactors: siFactors, protectiveFactors: siProtective },
    { conditionId: 'piriformis_syndrome', conditionName: 'Piriformis Syndrome', probability: Math.min(95, Math.round(piriformisProb)), riskLevel: getRiskLevel(piriformisProb), contributingFactors: piriFactors, protectiveFactors: piriProtective },
    { conditionId: 'pubic_dysfunction', conditionName: 'Pubic Symphysis Dysfunction', probability: Math.min(95, Math.round(pubicProb)), riskLevel: getRiskLevel(pubicProb), contributingFactors: pubicFactors, protectiveFactors: pubicProtective },
    { conditionId: 'pelvic_obliquity', conditionName: 'Pelvic Obliquity', probability: Math.min(95, Math.round(obliquityProb)), riskLevel: getRiskLevel(obliquityProb), contributingFactors: obliqFactors, protectiveFactors: obliqProtective },
  ];
}

export function calculateHipStructureLoads(
  hipFlexion: number,
  hipAbduction: number,
  hipInternalRotation: number,
  hipAnteversion: number,
  neckShaftAngle: number,
  bodyWeightKg: number = 70
): StructureLoadAnalysis[] {
  const baseLoad = bodyWeightKg * 9.81;
  const flexionRad = (hipFlexion * Math.PI) / 180;
  const abductionRad = (hipAbduction * Math.PI) / 180;
  const rotationRad = (hipInternalRotation * Math.PI) / 180;
  
  const femoralHeadCompression = baseLoad * (2.5 + Math.abs(Math.sin(flexionRad)) * 1.5 + Math.abs(abductionRad) * 0.8);
  const acetabularLoad = femoralHeadCompression * (1 + Math.abs(rotationRad) * 0.3);
  const labrumShear = baseLoad * (Math.abs(rotationRad) * 0.4 + Math.sin(flexionRad) * Math.abs(rotationRad) * 0.6);
  const iliofemoralTension = baseLoad * (0.3 + Math.max(0, -hipFlexion / 30) * 0.5 + hipAnteversion / 100);
  const hipCapsuleStress = baseLoad * (0.2 + Math.abs(rotationRad) * 0.5 + Math.abs(abductionRad) * 0.3);
  
  const getStatus = (value: number, safe: number, warning: number, critical: number): 'safe' | 'caution' | 'warning' | 'critical' => {
    if (value < safe) return 'safe';
    if (value < warning) return 'caution';
    if (value < critical) return 'warning';
    return 'critical';
  };
  
  return [
    {
      structureId: 'femoral_head',
      structureName: 'Femoral Head',
      loadType: 'compression',
      currentLoad: Math.round(femoralHeadCompression),
      safeThreshold: 2500,
      warningThreshold: 4000,
      criticalThreshold: 6000,
      percentOfCritical: Math.round((femoralHeadCompression / 6000) * 100),
      status: getStatus(femoralHeadCompression, 2500, 4000, 6000),
    },
    {
      structureId: 'acetabulum',
      structureName: 'Acetabular Loading',
      loadType: 'compression',
      currentLoad: Math.round(acetabularLoad),
      safeThreshold: 2800,
      warningThreshold: 4500,
      criticalThreshold: 6500,
      percentOfCritical: Math.round((acetabularLoad / 6500) * 100),
      status: getStatus(acetabularLoad, 2800, 4500, 6500),
    },
    {
      structureId: 'labrum',
      structureName: 'Labrum Shear Stress',
      loadType: 'shear',
      currentLoad: Math.round(labrumShear),
      safeThreshold: 300,
      warningThreshold: 500,
      criticalThreshold: 800,
      percentOfCritical: Math.round((labrumShear / 800) * 100),
      status: getStatus(labrumShear, 300, 500, 800),
    },
    {
      structureId: 'iliofemoral_ligament',
      structureName: 'Iliofemoral Ligament',
      loadType: 'tension',
      currentLoad: Math.round(iliofemoralTension),
      safeThreshold: 400,
      warningThreshold: 700,
      criticalThreshold: 1000,
      percentOfCritical: Math.round((iliofemoralTension / 1000) * 100),
      status: getStatus(iliofemoralTension, 400, 700, 1000),
    },
    {
      structureId: 'hip_capsule',
      structureName: 'Hip Capsule Stress',
      loadType: 'tension',
      currentLoad: Math.round(hipCapsuleStress),
      safeThreshold: 350,
      warningThreshold: 600,
      criticalThreshold: 900,
      percentOfCritical: Math.round((hipCapsuleStress / 900) * 100),
      status: getStatus(hipCapsuleStress, 350, 600, 900),
    },
  ];
}

export function calculateHipConditions(
  structureLoads: StructureLoadAnalysis[],
  hipFlexion: number,
  hipInternalRotation: number,
  hipAnteversion: number
): ConditionProbability[] {
  const getLoadByStructure = (id: string) => structureLoads.find(s => s.structureId === id);
  const femoralHead = getLoadByStructure('femoral_head');
  const labrum = getLoadByStructure('labrum');
  const acetabulum = getLoadByStructure('acetabulum');
  
  const getRiskLevel = (prob: number): 'minimal' | 'low' | 'moderate' | 'high' | 'critical' => {
    if (prob < 15) return 'minimal';
    if (prob < 30) return 'low';
    if (prob < 50) return 'moderate';
    if (prob < 75) return 'high';
    return 'critical';
  };
  
  let faiProb = 5;
  const faiFactors: string[] = [];
  const faiProtective: string[] = [];
  if (hipFlexion > 90 && Math.abs(hipInternalRotation) > 20) {
    faiProb += 25;
    faiFactors.push('Flexion + internal rotation impingement mechanism');
  }
  if (hipFlexion > 100) {
    faiProb += (hipFlexion - 100) * 1.5;
    faiFactors.push(`Deep hip flexion (${Math.round(hipFlexion)}°)`);
  }
  if (Math.abs(hipInternalRotation) > 30) {
    faiProb += (Math.abs(hipInternalRotation) - 30) * 1.0;
    faiFactors.push(`Excessive internal rotation (${Math.round(Math.abs(hipInternalRotation))}°)`);
  }
  if (hipFlexion < 80 && Math.abs(hipInternalRotation) < 20) {
    faiProtective.push('Within safe ROM');
  }
  
  let labralProb = 5;
  const labralFactors: string[] = [];
  const labralProtective: string[] = [];
  if (labrum && labrum.percentOfCritical > 40) {
    labralProb += labrum.percentOfCritical * 0.5;
    labralFactors.push(`Elevated labrum shear stress (${labrum.currentLoad}N)`);
  }
  if (Math.abs(hipInternalRotation) > 25) {
    labralProb += (Math.abs(hipInternalRotation) - 25) * 0.8;
    labralFactors.push(`Rotational loading (${Math.round(Math.abs(hipInternalRotation))}°)`);
  }
  if (labrum && labrum.percentOfCritical < 30) {
    labralProtective.push('Low labrum stress');
  }
  
  let hipOaProb = 3;
  const oaFactors: string[] = [];
  const oaProtective: string[] = [];
  if (femoralHead && femoralHead.percentOfCritical > 50) {
    hipOaProb += femoralHead.percentOfCritical * 0.4;
    oaFactors.push(`High femoral head loading (${femoralHead.currentLoad}N)`);
  }
  if (acetabulum && acetabulum.percentOfCritical > 50) {
    hipOaProb += acetabulum.percentOfCritical * 0.3;
    oaFactors.push(`Elevated acetabular stress (${acetabulum.currentLoad}N)`);
  }
  if (femoralHead && femoralHead.percentOfCritical < 40) {
    oaProtective.push('Normal joint loading');
  }
  
  let gtpsProb = 5;
  const gtpsFactors: string[] = [];
  const gtpsProtective: string[] = [];
  if (hipFlexion > 60) {
    gtpsProb += (hipFlexion - 60) * 0.5;
    gtpsFactors.push(`Prolonged hip flexion (${Math.round(hipFlexion)}°)`);
  }
  if (hipAnteversion > 15) {
    gtpsProb += (hipAnteversion - 15) * 0.8;
    gtpsFactors.push(`Femoral anteversion (${Math.round(hipAnteversion)}°)`);
  }
  if (hipFlexion < 50) {
    gtpsProtective.push('Moderate hip position');
  }
  
  let snappingProb = 3;
  const snappingFactors: string[] = [];
  const snappingProtective: string[] = [];
  if (hipFlexion > 70 && Math.abs(hipInternalRotation) > 15) {
    snappingProb += 12;
    snappingFactors.push('Flexion + rotation mechanism');
  }
  if (hipFlexion < 60) {
    snappingProtective.push('Limited provocative positioning');
  }
  
  let piriformisProb = 5;
  const piriFactors: string[] = [];
  const piriProtective: string[] = [];
  if (hipFlexion > 60 && Math.abs(hipInternalRotation) > 20) {
    piriformisProb += 15;
    piriFactors.push('Hip flexion + internal rotation stretches piriformis');
  }
  if (hipFlexion > 80) {
    piriformisProb += (hipFlexion - 80) * 0.6;
    piriFactors.push(`Prolonged sitting posture (${Math.round(hipFlexion)}°)`);
  }
  if (hipFlexion < 50) {
    piriProtective.push('Neutral hip position');
  }
  
  return [
    { conditionId: 'fai', conditionName: 'Femoroacetabular Impingement', probability: Math.min(95, Math.round(faiProb)), riskLevel: getRiskLevel(faiProb), contributingFactors: faiFactors, protectiveFactors: faiProtective },
    { conditionId: 'labral_tear', conditionName: 'Labral Tear', probability: Math.min(95, Math.round(labralProb)), riskLevel: getRiskLevel(labralProb), contributingFactors: labralFactors, protectiveFactors: labralProtective },
    { conditionId: 'hip_oa', conditionName: 'Hip Osteoarthritis', probability: Math.min(95, Math.round(hipOaProb)), riskLevel: getRiskLevel(hipOaProb), contributingFactors: oaFactors, protectiveFactors: oaProtective },
    { conditionId: 'gtps', conditionName: 'Greater Trochanteric Pain Syndrome', probability: Math.min(95, Math.round(gtpsProb)), riskLevel: getRiskLevel(gtpsProb), contributingFactors: gtpsFactors, protectiveFactors: gtpsProtective },
    { conditionId: 'snapping_hip', conditionName: 'Snapping Hip Syndrome', probability: Math.min(95, Math.round(snappingProb)), riskLevel: getRiskLevel(snappingProb), contributingFactors: snappingFactors, protectiveFactors: snappingProtective },
    { conditionId: 'piriformis', conditionName: 'Piriformis Syndrome', probability: Math.min(95, Math.round(piriformisProb)), riskLevel: getRiskLevel(piriformisProb), contributingFactors: piriFactors, protectiveFactors: piriProtective },
  ];
}

export function calculateKneeStructureLoads(
  kneeFlexion: number,
  kneeVarus: number,
  tibialTorsion: number,
  recurvatum: number,
  tibialSlope: number,
  bodyWeightKg: number = 70
): StructureLoadAnalysis[] {
  const baseLoad = bodyWeightKg * 9.81;
  const flexionRad = (kneeFlexion * Math.PI) / 180;
  const varusRad = (kneeVarus * Math.PI) / 180;
  
  const patellofemoralCompression = baseLoad * (0.5 + Math.pow(Math.sin(flexionRad), 2) * 4);
  const aclTension = baseLoad * (0.2 + Math.max(0, -recurvatum / 20) * 0.5 + (tibialSlope / 30) * 0.4);
  const pclTension = baseLoad * (0.1 + Math.sin(flexionRad) * 0.8);
  const meniscusCompression = baseLoad * (1.0 + Math.abs(varusRad) * 1.5 + Math.sin(flexionRad) * 0.8);
  const collateralStress = baseLoad * Math.abs(varusRad) * 1.2;
  const patellarTendonLoad = baseLoad * (0.3 + Math.sin(flexionRad) * 1.5);
  
  const getStatus = (value: number, safe: number, warning: number, critical: number): 'safe' | 'caution' | 'warning' | 'critical' => {
    if (value < safe) return 'safe';
    if (value < warning) return 'caution';
    if (value < critical) return 'warning';
    return 'critical';
  };
  
  return [
    {
      structureId: 'patellofemoral',
      structureName: 'Patellofemoral Joint',
      loadType: 'compression',
      currentLoad: Math.round(patellofemoralCompression),
      safeThreshold: 2000,
      warningThreshold: 3500,
      criticalThreshold: 5000,
      percentOfCritical: Math.round((patellofemoralCompression / 5000) * 100),
      status: getStatus(patellofemoralCompression, 2000, 3500, 5000),
    },
    {
      structureId: 'acl',
      structureName: 'Anterior Cruciate Ligament',
      loadType: 'tension',
      currentLoad: Math.round(aclTension),
      safeThreshold: 500,
      warningThreshold: 1000,
      criticalThreshold: 1700,
      percentOfCritical: Math.round((aclTension / 1700) * 100),
      status: getStatus(aclTension, 500, 1000, 1700),
    },
    {
      structureId: 'pcl',
      structureName: 'Posterior Cruciate Ligament',
      loadType: 'tension',
      currentLoad: Math.round(pclTension),
      safeThreshold: 400,
      warningThreshold: 800,
      criticalThreshold: 1400,
      percentOfCritical: Math.round((pclTension / 1400) * 100),
      status: getStatus(pclTension, 400, 800, 1400),
    },
    {
      structureId: 'meniscus',
      structureName: 'Meniscus',
      loadType: 'compression',
      currentLoad: Math.round(meniscusCompression),
      safeThreshold: 1200,
      warningThreshold: 2000,
      criticalThreshold: 3000,
      percentOfCritical: Math.round((meniscusCompression / 3000) * 100),
      status: getStatus(meniscusCompression, 1200, 2000, 3000),
    },
    {
      structureId: 'collateral_ligaments',
      structureName: 'Collateral Ligaments (MCL/LCL)',
      loadType: 'tension',
      currentLoad: Math.round(collateralStress),
      safeThreshold: 300,
      warningThreshold: 600,
      criticalThreshold: 1000,
      percentOfCritical: Math.round((collateralStress / 1000) * 100),
      status: getStatus(collateralStress, 300, 600, 1000),
    },
    {
      structureId: 'patellar_tendon',
      structureName: 'Patellar Tendon',
      loadType: 'tension',
      currentLoad: Math.round(patellarTendonLoad),
      safeThreshold: 1000,
      warningThreshold: 2000,
      criticalThreshold: 3500,
      percentOfCritical: Math.round((patellarTendonLoad / 3500) * 100),
      status: getStatus(patellarTendonLoad, 1000, 2000, 3500),
    },
  ];
}

export function calculateKneeConditions(
  structureLoads: StructureLoadAnalysis[],
  kneeFlexion: number,
  kneeVarus: number,
  tibialSlope: number
): ConditionProbability[] {
  const getLoadByStructure = (id: string) => structureLoads.find(s => s.structureId === id);
  const acl = getLoadByStructure('acl');
  const meniscus = getLoadByStructure('meniscus');
  const patellofemoral = getLoadByStructure('patellofemoral');
  const patellarTendon = getLoadByStructure('patellar_tendon');
  const collateral = getLoadByStructure('collateral_ligaments');
  
  const getRiskLevel = (prob: number): 'minimal' | 'low' | 'moderate' | 'high' | 'critical' => {
    if (prob < 15) return 'minimal';
    if (prob < 30) return 'low';
    if (prob < 50) return 'moderate';
    if (prob < 75) return 'high';
    return 'critical';
  };
  
  let aclProb = 3;
  const aclFactors: string[] = [];
  const aclProtective: string[] = [];
  if (acl && acl.percentOfCritical > 50) {
    aclProb += acl.percentOfCritical * 0.5;
    aclFactors.push(`High ACL tension (${acl.currentLoad}N)`);
  }
  if (tibialSlope > 12) {
    aclProb += (tibialSlope - 12) * 2.0;
    aclFactors.push(`Increased tibial slope (${Math.round(tibialSlope)}°)`);
  }
  if (Math.abs(kneeVarus) > 10) {
    aclProb += Math.abs(kneeVarus) * 0.8;
    aclFactors.push(`Varus/valgus malalignment (${Math.round(Math.abs(kneeVarus))}°)`);
  }
  if (acl && acl.percentOfCritical < 40) {
    aclProtective.push('Normal ACL loading');
  }
  
  let meniscusProb = 5;
  const meniscusFactors: string[] = [];
  const meniscusProtective: string[] = [];
  if (meniscus && meniscus.percentOfCritical > 50) {
    meniscusProb += meniscus.percentOfCritical * 0.5;
    meniscusFactors.push(`High meniscus compression (${meniscus.currentLoad}N)`);
  }
  if (kneeFlexion > 90) {
    meniscusProb += (kneeFlexion - 90) * 0.5;
    meniscusFactors.push(`Deep knee flexion (${Math.round(kneeFlexion)}°)`);
  }
  if (Math.abs(kneeVarus) > 8) {
    meniscusProb += Math.abs(kneeVarus) * 1.0;
    meniscusFactors.push(`Compartment loading (${Math.round(Math.abs(kneeVarus))}° varus/valgus)`);
  }
  if (meniscus && meniscus.percentOfCritical < 40) {
    meniscusProtective.push('Normal meniscal loading');
  }
  
  let pfProb = 5;
  const pfFactors: string[] = [];
  const pfProtective: string[] = [];
  if (patellofemoral && patellofemoral.percentOfCritical > 40) {
    pfProb += patellofemoral.percentOfCritical * 0.5;
    pfFactors.push(`Elevated patellofemoral compression (${patellofemoral.currentLoad}N)`);
  }
  if (kneeFlexion > 60) {
    pfProb += (kneeFlexion - 60) * 0.6;
    pfFactors.push(`Increased flexion angle (${Math.round(kneeFlexion)}°)`);
  }
  if (patellofemoral && patellofemoral.percentOfCritical < 35) {
    pfProtective.push('Low patellofemoral stress');
  }
  
  let itbProb = 3;
  const itbFactors: string[] = [];
  const itbProtective: string[] = [];
  if (kneeFlexion > 20 && kneeFlexion < 45) {
    itbProb += 10;
    itbFactors.push('Impingement zone (20-45° flexion)');
  }
  if (Math.abs(kneeVarus) > 5) {
    itbProb += Math.abs(kneeVarus) * 1.5;
    itbFactors.push(`Varus knee alignment (${Math.round(Math.abs(kneeVarus))}°)`);
  }
  if (kneeFlexion < 20 || kneeFlexion > 50) {
    itbProtective.push('Outside impingement zone');
  }
  
  let patellarTendinoProb = 3;
  const ptFactors: string[] = [];
  const ptProtective: string[] = [];
  if (patellarTendon && patellarTendon.percentOfCritical > 50) {
    patellarTendinoProb += patellarTendon.percentOfCritical * 0.5;
    ptFactors.push(`High patellar tendon load (${patellarTendon.currentLoad}N)`);
  }
  if (kneeFlexion > 70) {
    patellarTendinoProb += (kneeFlexion - 70) * 0.4;
    ptFactors.push(`Increased tendon loading with flexion (${Math.round(kneeFlexion)}°)`);
  }
  if (patellarTendon && patellarTendon.percentOfCritical < 40) {
    ptProtective.push('Normal tendon loading');
  }
  
  let kneeOaProb = 3;
  const oaFactors: string[] = [];
  const oaProtective: string[] = [];
  if (meniscus && meniscus.percentOfCritical > 50) {
    kneeOaProb += meniscus.percentOfCritical * 0.3;
    oaFactors.push(`Increased compartment loading (${meniscus.currentLoad}N)`);
  }
  if (Math.abs(kneeVarus) > 10) {
    kneeOaProb += Math.abs(kneeVarus) * 1.5;
    oaFactors.push(`Malalignment stress (${Math.round(Math.abs(kneeVarus))}°)`);
  }
  if (Math.abs(kneeVarus) < 5) {
    oaProtective.push('Normal alignment');
  }
  
  return [
    { conditionId: 'acl_injury', conditionName: 'ACL Injury Risk', probability: Math.min(95, Math.round(aclProb)), riskLevel: getRiskLevel(aclProb), contributingFactors: aclFactors, protectiveFactors: aclProtective },
    { conditionId: 'meniscus_tear', conditionName: 'Meniscus Tear Risk', probability: Math.min(95, Math.round(meniscusProb)), riskLevel: getRiskLevel(meniscusProb), contributingFactors: meniscusFactors, protectiveFactors: meniscusProtective },
    { conditionId: 'pfps', conditionName: 'Patellofemoral Pain Syndrome', probability: Math.min(95, Math.round(pfProb)), riskLevel: getRiskLevel(pfProb), contributingFactors: pfFactors, protectiveFactors: pfProtective },
    { conditionId: 'itb_syndrome', conditionName: 'IT Band Syndrome', probability: Math.min(95, Math.round(itbProb)), riskLevel: getRiskLevel(itbProb), contributingFactors: itbFactors, protectiveFactors: itbProtective },
    { conditionId: 'patellar_tendinopathy', conditionName: 'Patellar Tendinopathy', probability: Math.min(95, Math.round(patellarTendinoProb)), riskLevel: getRiskLevel(patellarTendinoProb), contributingFactors: ptFactors, protectiveFactors: ptProtective },
    { conditionId: 'knee_oa', conditionName: 'Knee Osteoarthritis', probability: Math.min(95, Math.round(kneeOaProb)), riskLevel: getRiskLevel(kneeOaProb), contributingFactors: oaFactors, protectiveFactors: oaProtective },
  ];
}

export function calculateAnkleStructureLoads(
  dorsiflexion: number,
  plantarflexion: number,
  inversion: number,
  eversion: number,
  archHeight: number,
  bodyWeightKg: number = 70
): StructureLoadAnalysis[] {
  const baseLoad = bodyWeightKg * 9.81;
  const inversionRad = (inversion * Math.PI) / 180;
  const eversionRad = (eversion * Math.PI) / 180;
  const pfRad = (plantarflexion * Math.PI) / 180;
  const dfRad = (dorsiflexion * Math.PI) / 180;
  
  const atflTension = baseLoad * (0.1 + Math.abs(inversionRad) * 0.8 + Math.sin(pfRad) * Math.abs(inversionRad) * 0.5);
  const deltoidStress = baseLoad * (0.1 + Math.abs(eversionRad) * 0.7);
  const achillesLoad = baseLoad * (1.5 + Math.sin(dfRad) * 1.0);
  const plantarFasciaTension = baseLoad * (0.3 + Math.abs(30 - archHeight) / 20 * 0.5);
  const tibiotalarCompression = baseLoad * (1.8 + Math.abs(dfRad) * 0.8 + Math.abs(pfRad) * 0.5);
  
  const getStatus = (value: number, safe: number, warning: number, critical: number): 'safe' | 'caution' | 'warning' | 'critical' => {
    if (value < safe) return 'safe';
    if (value < warning) return 'caution';
    if (value < critical) return 'warning';
    return 'critical';
  };
  
  return [
    {
      structureId: 'atfl',
      structureName: 'Anterior Talofibular Ligament',
      loadType: 'tension',
      currentLoad: Math.round(atflTension),
      safeThreshold: 300,
      warningThreshold: 500,
      criticalThreshold: 800,
      percentOfCritical: Math.round((atflTension / 800) * 100),
      status: getStatus(atflTension, 300, 500, 800),
    },
    {
      structureId: 'deltoid',
      structureName: 'Deltoid Ligament',
      loadType: 'tension',
      currentLoad: Math.round(deltoidStress),
      safeThreshold: 400,
      warningThreshold: 700,
      criticalThreshold: 1000,
      percentOfCritical: Math.round((deltoidStress / 1000) * 100),
      status: getStatus(deltoidStress, 400, 700, 1000),
    },
    {
      structureId: 'achilles',
      structureName: 'Achilles Tendon',
      loadType: 'tension',
      currentLoad: Math.round(achillesLoad),
      safeThreshold: 3000,
      warningThreshold: 5000,
      criticalThreshold: 7500,
      percentOfCritical: Math.round((achillesLoad / 7500) * 100),
      status: getStatus(achillesLoad, 3000, 5000, 7500),
    },
    {
      structureId: 'plantar_fascia',
      structureName: 'Plantar Fascia',
      loadType: 'tension',
      currentLoad: Math.round(plantarFasciaTension),
      safeThreshold: 400,
      warningThreshold: 700,
      criticalThreshold: 1000,
      percentOfCritical: Math.round((plantarFasciaTension / 1000) * 100),
      status: getStatus(plantarFasciaTension, 400, 700, 1000),
    },
    {
      structureId: 'tibiotalar',
      structureName: 'Tibiotalar Joint',
      loadType: 'compression',
      currentLoad: Math.round(tibiotalarCompression),
      safeThreshold: 2500,
      warningThreshold: 4000,
      criticalThreshold: 6000,
      percentOfCritical: Math.round((tibiotalarCompression / 6000) * 100),
      status: getStatus(tibiotalarCompression, 2500, 4000, 6000),
    },
  ];
}

export function calculateAnkleConditions(
  structureLoads: StructureLoadAnalysis[],
  inversion: number,
  plantarflexion: number,
  archHeight: number
): ConditionProbability[] {
  const getLoadByStructure = (id: string) => structureLoads.find(s => s.structureId === id);
  const atfl = getLoadByStructure('atfl');
  const achilles = getLoadByStructure('achilles');
  const plantarFascia = getLoadByStructure('plantar_fascia');
  const tibiotalar = getLoadByStructure('tibiotalar');
  const deltoid = getLoadByStructure('deltoid');
  
  const getRiskLevel = (prob: number): 'minimal' | 'low' | 'moderate' | 'high' | 'critical' => {
    if (prob < 15) return 'minimal';
    if (prob < 30) return 'low';
    if (prob < 50) return 'moderate';
    if (prob < 75) return 'high';
    return 'critical';
  };
  
  let lateralSprainProb = 5;
  const lateralFactors: string[] = [];
  const lateralProtective: string[] = [];
  if (atfl && atfl.percentOfCritical > 40) {
    lateralSprainProb += atfl.percentOfCritical * 0.6;
    lateralFactors.push(`High ATFL tension (${atfl.currentLoad}N)`);
  }
  if (Math.abs(inversion) > 20) {
    lateralSprainProb += (Math.abs(inversion) - 20) * 1.5;
    lateralFactors.push(`Excessive inversion (${Math.round(Math.abs(inversion))}°)`);
  }
  if (plantarflexion > 20 && Math.abs(inversion) > 15) {
    lateralSprainProb += 15;
    lateralFactors.push('Plantarflexion + inversion mechanism');
  }
  if (Math.abs(inversion) < 15) {
    lateralProtective.push('Neutral ankle position');
  }
  
  let highAnkleProb = 3;
  const highFactors: string[] = [];
  const highProtective: string[] = [];
  if (deltoid && deltoid.percentOfCritical > 50) {
    highAnkleProb += deltoid.percentOfCritical * 0.4;
    highFactors.push(`Syndesmotic stress (${deltoid.currentLoad}N)`);
  }
  if (plantarflexion < 0 && Math.abs(plantarflexion) > 15) {
    highAnkleProb += (Math.abs(plantarflexion) - 15) * 1.0;
    highFactors.push(`Forced dorsiflexion (${Math.round(Math.abs(plantarflexion))}°)`);
  }
  if (deltoid && deltoid.percentOfCritical < 40) {
    highProtective.push('Normal syndesmotic loading');
  }
  
  let achillesProb = 5;
  const achillesFactors: string[] = [];
  const achillesProtective: string[] = [];
  if (achilles && achilles.percentOfCritical > 50) {
    achillesProb += achilles.percentOfCritical * 0.5;
    achillesFactors.push(`High Achilles load (${achilles.currentLoad}N)`);
  }
  if (plantarflexion < 0 && Math.abs(plantarflexion) > 20) {
    achillesProb += (Math.abs(plantarflexion) - 20) * 0.8;
    achillesFactors.push(`Loaded dorsiflexion position (${Math.round(Math.abs(plantarflexion))}°)`);
  }
  if (achilles && achilles.percentOfCritical < 40) {
    achillesProtective.push('Normal tendon loading');
  }
  
  let pfProb = 5;
  const pfFactors: string[] = [];
  const pfProtective: string[] = [];
  if (plantarFascia && plantarFascia.percentOfCritical > 40) {
    pfProb += plantarFascia.percentOfCritical * 0.5;
    pfFactors.push(`Elevated plantar fascia tension (${plantarFascia.currentLoad}N)`);
  }
  if (archHeight < 20 || archHeight > 40) {
    pfProb += Math.abs(30 - archHeight) * 0.8;
    pfFactors.push(`Abnormal arch height (${Math.round(archHeight)}mm)`);
  }
  if (archHeight >= 25 && archHeight <= 35) {
    pfProtective.push('Normal arch height');
  }
  
  let pttdProb = 3;
  const pttdFactors: string[] = [];
  const pttdProtective: string[] = [];
  if (archHeight < 22) {
    pttdProb += (22 - archHeight) * 2.0;
    pttdFactors.push(`Low arch/flat foot (${Math.round(archHeight)}mm)`);
  }
  if (deltoid && deltoid.percentOfCritical > 40) {
    pttdProb += deltoid.percentOfCritical * 0.3;
    pttdFactors.push(`Medial overload (${deltoid.currentLoad}N)`);
  }
  if (archHeight >= 25) {
    pttdProtective.push('Normal arch support');
  }
  
  let ankleOaProb = 3;
  const oaFactors: string[] = [];
  const oaProtective: string[] = [];
  if (tibiotalar && tibiotalar.percentOfCritical > 50) {
    ankleOaProb += tibiotalar.percentOfCritical * 0.4;
    oaFactors.push(`High tibiotalar compression (${tibiotalar.currentLoad}N)`);
  }
  if (Math.abs(inversion) > 25) {
    ankleOaProb += (Math.abs(inversion) - 25) * 0.8;
    oaFactors.push(`Recurrent instability pattern (${Math.round(Math.abs(inversion))}°)`);
  }
  if (tibiotalar && tibiotalar.percentOfCritical < 40) {
    oaProtective.push('Normal joint loading');
  }
  
  return [
    { conditionId: 'lateral_sprain', conditionName: 'Lateral Ankle Sprain Risk', probability: Math.min(95, Math.round(lateralSprainProb)), riskLevel: getRiskLevel(lateralSprainProb), contributingFactors: lateralFactors, protectiveFactors: lateralProtective },
    { conditionId: 'high_ankle_sprain', conditionName: 'High Ankle Sprain Risk', probability: Math.min(95, Math.round(highAnkleProb)), riskLevel: getRiskLevel(highAnkleProb), contributingFactors: highFactors, protectiveFactors: highProtective },
    { conditionId: 'achilles_tendinopathy', conditionName: 'Achilles Tendinopathy', probability: Math.min(95, Math.round(achillesProb)), riskLevel: getRiskLevel(achillesProb), contributingFactors: achillesFactors, protectiveFactors: achillesProtective },
    { conditionId: 'plantar_fasciitis', conditionName: 'Plantar Fasciitis', probability: Math.min(95, Math.round(pfProb)), riskLevel: getRiskLevel(pfProb), contributingFactors: pfFactors, protectiveFactors: pfProtective },
    { conditionId: 'pttd', conditionName: 'Posterior Tibial Tendon Dysfunction', probability: Math.min(95, Math.round(pttdProb)), riskLevel: getRiskLevel(pttdProb), contributingFactors: pttdFactors, protectiveFactors: pttdProtective },
    { conditionId: 'ankle_oa', conditionName: 'Ankle Osteoarthritis', probability: Math.min(95, Math.round(ankleOaProb)), riskLevel: getRiskLevel(ankleOaProb), contributingFactors: oaFactors, protectiveFactors: oaProtective },
  ];
}

export function analyzeRegion(
  regionId: AnatomicalRegion,
  spineFlexion: number,
  spineRotation: number,
  spineLateralFlexion: number,
  pelvisTilt: number,
  pelvisObliquity: number = 0,
  pelvisRotation: number = 0,
  bodyWeightKg: number = 70
): RegionAnalysisResult | null {
  let structureLoads: StructureLoadAnalysis[] = [];
  let conditionProbabilities: ConditionProbability[] = [];
  let regionName = '';
  
  switch (regionId) {
    case 'lumbar_spine':
      structureLoads = calculateLumbarStructureLoads(spineFlexion, spineRotation, spineLateralFlexion, pelvisTilt, bodyWeightKg);
      conditionProbabilities = calculateConditionProbabilities(structureLoads, spineFlexion, spineRotation, pelvisTilt);
      regionName = 'Lumbar spine';
      break;
    case 'cervical_spine':
      structureLoads = calculateCervicalStructureLoads(spineFlexion, spineRotation, spineLateralFlexion, 0, bodyWeightKg);
      conditionProbabilities = calculateCervicalConditions(structureLoads, spineFlexion, spineRotation, 0);
      regionName = 'Cervical spine';
      break;
    case 'thoracic_spine':
      structureLoads = calculateThoracicStructureLoads(spineFlexion, spineRotation, spineLateralFlexion, bodyWeightKg);
      conditionProbabilities = calculateThoracicConditions(structureLoads, spineFlexion, spineRotation);
      regionName = 'Thoracic spine';
      break;
    case 'pelvis':
      structureLoads = calculatePelvicStructureLoads(pelvisTilt, pelvisObliquity, pelvisRotation, 30, bodyWeightKg);
      conditionProbabilities = calculatePelvicConditions(structureLoads, pelvisTilt, pelvisObliquity, 30);
      regionName = 'Pelvis';
      break;
    case 'left_hip':
    case 'right_hip':
      structureLoads = calculateHipStructureLoads(spineFlexion, spineLateralFlexion, spineRotation, pelvisTilt, pelvisObliquity, bodyWeightKg);
      conditionProbabilities = calculateHipConditions(structureLoads, spineFlexion, spineRotation, pelvisTilt);
      regionName = regionId === 'left_hip' ? 'Left hip' : 'Right hip';
      break;
    case 'left_knee':
    case 'right_knee':
      structureLoads = calculateKneeStructureLoads(spineFlexion, spineRotation, spineLateralFlexion, pelvisTilt, pelvisObliquity, bodyWeightKg);
      conditionProbabilities = calculateKneeConditions(structureLoads, spineFlexion, spineRotation, pelvisObliquity);
      regionName = regionId === 'left_knee' ? 'Left knee' : 'Right knee';
      break;
    case 'left_ankle':
    case 'right_ankle':
      structureLoads = calculateAnkleStructureLoads(spineFlexion, pelvisTilt, spineRotation, spineLateralFlexion, pelvisObliquity, bodyWeightKg);
      conditionProbabilities = calculateAnkleConditions(structureLoads, spineRotation, pelvisTilt, pelvisObliquity);
      regionName = regionId === 'left_ankle' ? 'Left ankle' : 'Right ankle';
      break;
    default:
      return null;
  }
  
  if (structureLoads.length === 0) return null;
  
  const maxProbability = Math.max(...conditionProbabilities.map(c => c.probability));
  const avgLoadPercent = structureLoads.reduce((sum, l) => sum + l.percentOfCritical, 0) / structureLoads.length;
  const overallRiskScore = Math.round((maxProbability * 0.6) + (avgLoadPercent * 0.4));
  
  const highestRiskCondition = conditionProbabilities.reduce((a, b) => a.probability > b.probability ? a : b);
  const criticalStructures = structureLoads.filter(s => s.status === 'warning' || s.status === 'critical');
  
  let clinicalSummary = '';
  if (overallRiskScore < 20) {
    clinicalSummary = `Low overall risk. ${regionName} in relatively neutral, well-supported position.`;
  } else if (overallRiskScore < 40) {
    clinicalSummary = `Mild risk factors present. Primary concern: ${highestRiskCondition.conditionName} (${highestRiskCondition.probability}%).`;
  } else if (overallRiskScore < 60) {
    clinicalSummary = `Moderate risk level. ${criticalStructures.length} structures under elevated stress. Monitor ${highestRiskCondition.conditionName}.`;
  } else {
    clinicalSummary = `Elevated risk detected. ${highestRiskCondition.conditionName} probability ${highestRiskCondition.probability}%. Consider position modification.`;
  }
  
  return {
    regionId,
    timestamp: Date.now(),
    structureLoads,
    conditionProbabilities,
    overallRiskScore,
    clinicalSummary,
  };
}
