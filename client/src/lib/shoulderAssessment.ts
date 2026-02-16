export interface SpecialTest {
  name: string;
  category: 'impingement' | 'rotator_cuff' | 'instability' | 'labral' | 'biceps' | 'ac_joint' | 'thoracic_outlet' | 'neurological';
  purpose: string;
  technique: string;
  positiveSign: string;
  sensitivity: number;
  specificity: number;
  positiveLR: number;
  negativeLR: number;
  implicates: string[];
  clinicalNote: string;
}

export interface MuscleTest {
  name: string;
  muscle: string;
  nerve: string;
  root: string;
  position: string;
  resistance: string;
  grading: string;
  clinicalSignificance: string;
}

export interface RomNorm {
  movement: string;
  configKey: string;
  normalRange: [number, number];
  functionalMinimum: number;
  capsularRestriction: boolean;
  capsularOrder: number;
  ageAdjusted?: { over60: [number, number]; over70: [number, number] };
  clinicalNote: string;
}

export interface DifferentialDiagnosis {
  name: string;
  icd10: string;
  category: 'rotator_cuff' | 'impingement' | 'instability' | 'labral' | 'adhesive_capsulitis' | 'ac_joint' | 'fracture' | 'cervical_referred' | 'neural' | 'other';
  prevalence: 'common' | 'moderate' | 'uncommon';
  keyFeatures: string[];
  supportingTests: string[];
  romPattern: string;
  painPattern: string;
  ageGroup: string;
  onsetType: 'traumatic' | 'insidious' | 'both';
  aggravatingFactors: string[];
  easingFactors: string[];
  redFlags: string[];
}

export interface KineticChainContributor {
  region: string;
  relationship: string;
  assessmentMethod: string;
  compensatoryPattern: string;
  configKeys: { group: string; key: string }[];
  thresholds: { mild: number; moderate: number; significant: number };
  treatmentImplication: string;
}

export interface ShoulderPainZone {
  id: string;
  name: string;
  anatomicalStructures: string[];
  commonPathologies: string[];
  differentials: string[];
  skeletonRegion: string;
}

export interface AssessmentStep {
  id: string;
  name: string;
  category: 'history' | 'observation' | 'arom' | 'prom' | 'resisted' | 'special_tests' | 'neurological' | 'palpation' | 'functional';
  description: string;
  items: AssessmentItem[];
}

export interface AssessmentItem {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'scale' | 'text' | 'boolean' | 'rom';
  options?: string[];
  scaleRange?: [number, number];
  configKey?: string;
  required?: boolean;
}

export interface AssessmentFindings {
  history: Record<string, any>;
  observation: Record<string, any>;
  arom: Record<string, number>;
  prom: Record<string, number>;
  resistedTests: Record<string, string>;
  specialTests: Record<string, 'positive' | 'negative' | 'equivocal' | 'not_tested'>;
  neurological: Record<string, any>;
  palpation: Record<string, any>;
  functional: Record<string, any>;
  painZones: string[];
  kineticChain: Record<string, any>;
  side: 'left' | 'right' | 'bilateral';
}

export const SHOULDER_SPECIAL_TESTS: SpecialTest[] = [
  {
    name: "Neer's Impingement Test",
    category: 'impingement',
    purpose: "Subacromial impingement syndrome",
    technique: "Stabilize scapula, passively flex shoulder to end range with arm in internal rotation",
    positiveSign: "Pain in the anterolateral shoulder reproduced at end-range flexion",
    sensitivity: 0.72,
    specificity: 0.60,
    positiveLR: 1.80,
    negativeLR: 0.47,
    implicates: ["Subacromial impingement", "Supraspinatus tendinopathy", "Subacromial bursitis"],
    clinicalNote: "Best used in combination with Hawkins-Kennedy. If both positive, specificity improves to ~75%"
  },
  {
    name: "Hawkins-Kennedy Test",
    category: 'impingement',
    purpose: "Subacromial/internal impingement",
    technique: "Flex shoulder and elbow to 90°, passively internally rotate the shoulder",
    positiveSign: "Pain in the anterolateral shoulder during internal rotation",
    sensitivity: 0.79,
    specificity: 0.59,
    positiveLR: 1.93,
    negativeLR: 0.36,
    implicates: ["Subacromial impingement", "Supraspinatus tendinopathy", "Subacromial bursitis"],
    clinicalNote: "More sensitive than Neer's. Negative Hawkins-Kennedy significantly reduces probability of impingement"
  },
  {
    name: "Empty Can (Jobe's) Test",
    category: 'rotator_cuff',
    purpose: "Supraspinatus integrity",
    technique: "Arms at 90° abduction, 30° horizontal adduction (scapular plane), thumbs pointing down. Resist downward pressure",
    positiveSign: "Pain and/or weakness compared to contralateral side",
    sensitivity: 0.69,
    specificity: 0.62,
    positiveLR: 1.82,
    negativeLR: 0.50,
    implicates: ["Supraspinatus tendinopathy", "Supraspinatus tear (partial/full)"],
    clinicalNote: "Weakness more suggestive of tear; pain alone more suggestive of tendinopathy. Compare bilaterally"
  },
  {
    name: "Full Can Test",
    category: 'rotator_cuff',
    purpose: "Supraspinatus integrity (less provocative alternative)",
    technique: "Arms at 90° abduction in scapular plane, thumbs pointing up. Resist downward pressure",
    positiveSign: "Pain and/or weakness",
    sensitivity: 0.77,
    specificity: 0.74,
    positiveLR: 2.96,
    negativeLR: 0.31,
    implicates: ["Supraspinatus tendinopathy", "Supraspinatus tear"],
    clinicalNote: "May be better tolerated than Empty Can. Higher specificity makes positive result more meaningful"
  },
  {
    name: "External Rotation Lag Sign",
    category: 'rotator_cuff',
    purpose: "Infraspinatus/teres minor tear",
    technique: "Elbow at 90° flexion, passively externally rotate to near-maximum. Release and observe",
    positiveSign: "Arm drops into internal rotation (lag >5°)",
    sensitivity: 0.46,
    specificity: 0.94,
    positiveLR: 7.20,
    negativeLR: 0.58,
    implicates: ["Infraspinatus tear (full-thickness)", "Posterior cuff tear"],
    clinicalNote: "Very high specificity - positive result strongly suggestive of full-thickness posterior cuff tear"
  },
  {
    name: "Hornblower's Sign",
    category: 'rotator_cuff',
    purpose: "Teres minor integrity",
    technique: "Arm at 90° abduction, elbow flexed 90°. Ask patient to externally rotate against resistance",
    positiveSign: "Inability to externally rotate from this position",
    sensitivity: 1.00,
    specificity: 0.93,
    positiveLR: 14.0,
    negativeLR: 0.00,
    implicates: ["Teres minor tear", "Massive posterior cuff tear"],
    clinicalNote: "Highly diagnostic when positive. Distinguish from infraspinatus by testing position"
  },
  {
    name: "Lift-Off Test (Gerber)",
    category: 'rotator_cuff',
    purpose: "Subscapularis integrity",
    technique: "Hand placed behind back (dorsum on lumbar spine). Ask patient to lift hand away from back",
    positiveSign: "Inability to lift hand off back or maintain position",
    sensitivity: 0.18,
    specificity: 0.92,
    positiveLR: 2.25,
    negativeLR: 0.89,
    implicates: ["Subscapularis tear", "Subscapularis insufficiency"],
    clinicalNote: "Low sensitivity means negative result doesn't rule out. Use with Belly Press and Bear Hug for subscapularis assessment"
  },
  {
    name: "Belly Press Test",
    category: 'rotator_cuff',
    purpose: "Subscapularis integrity (alternative to Lift-Off)",
    technique: "Press palm into abdomen using internal rotation. Maintain pressure while examiner observes elbow position",
    positiveSign: "Elbow drops behind coronal plane (compensating with shoulder extension instead of IR)",
    sensitivity: 0.40,
    specificity: 0.88,
    positiveLR: 3.33,
    negativeLR: 0.68,
    implicates: ["Subscapularis tear (upper portion)", "Subscapularis weakness"],
    clinicalNote: "Better tolerated than Lift-Off for patients with limited IR. Can be performed when Lift-Off is not possible"
  },
  {
    name: "Bear Hug Test",
    category: 'rotator_cuff',
    purpose: "Upper subscapularis integrity",
    technique: "Patient places hand on opposite shoulder, examiner tries to pull hand off with external rotation force",
    positiveSign: "Inability to maintain hand on shoulder (IR weakness)",
    sensitivity: 0.60,
    specificity: 0.92,
    positiveLR: 7.50,
    negativeLR: 0.43,
    implicates: ["Upper subscapularis tear", "Subscapularis dysfunction"],
    clinicalNote: "Best single test for upper subscapularis tears. High specificity when positive"
  },
  {
    name: "Drop Arm Test",
    category: 'rotator_cuff',
    purpose: "Large/massive rotator cuff tear",
    technique: "Passively abduct arm to 90°. Ask patient to slowly lower arm to side",
    positiveSign: "Arm drops suddenly or patient unable to control descent",
    sensitivity: 0.27,
    specificity: 0.88,
    positiveLR: 2.25,
    negativeLR: 0.83,
    implicates: ["Large rotator cuff tear", "Massive cuff tear", "Cuff tear arthropathy"],
    clinicalNote: "Low sensitivity but when positive, strongly suggests significant tear. Absence doesn't rule out smaller tears"
  },
  {
    name: "Apprehension Test",
    category: 'instability',
    purpose: "Anterior glenohumeral instability",
    technique: "Supine, shoulder abducted 90°, elbow flexed 90°. Slowly externally rotate shoulder",
    positiveSign: "Patient apprehension or guarding (NOT just pain)",
    sensitivity: 0.72,
    specificity: 0.96,
    positiveLR: 18.0,
    negativeLR: 0.29,
    implicates: ["Anterior instability", "Bankart lesion", "Recurrent anterior dislocation"],
    clinicalNote: "True positive is APPREHENSION, not pain. Very high specificity makes this nearly diagnostic when positive"
  },
  {
    name: "Relocation Test",
    category: 'instability',
    purpose: "Confirms anterior instability (follow-up to Apprehension)",
    technique: "In apprehension position, apply posterior force to humeral head",
    positiveSign: "Relief of apprehension symptoms",
    sensitivity: 0.68,
    specificity: 0.98,
    positiveLR: 34.0,
    negativeLR: 0.33,
    implicates: ["Anterior instability confirmed", "Bankart lesion"],
    clinicalNote: "Highest positive LR of any shoulder test. Combined with positive Apprehension, virtually diagnostic"
  },
  {
    name: "Sulcus Sign",
    category: 'instability',
    purpose: "Inferior glenohumeral instability / multidirectional instability",
    technique: "Patient seated, arm relaxed at side. Apply inferior traction to humerus",
    positiveSign: "Visible sulcus >2cm between acromion and humeral head",
    sensitivity: 0.28,
    specificity: 0.97,
    positiveLR: 9.33,
    negativeLR: 0.74,
    implicates: ["Inferior instability", "Multidirectional instability (MDI)", "Generalized ligamentous laxity"],
    clinicalNote: "Grade by sulcus width: Grade 1 (<1cm), Grade 2 (1-2cm), Grade 3 (>2cm). Check if reduces in ER (rules out MDI)"
  },
  {
    name: "O'Brien's Active Compression Test",
    category: 'labral',
    purpose: "Superior labral (SLAP) lesion",
    technique: "Arm flexed 90°, adducted 10-15°. Test in pronation (thumb down) then supination (thumb up). Resist downward force in each",
    positiveSign: "Deep pain with pronation that is relieved or reduced with supination",
    sensitivity: 0.63,
    specificity: 0.73,
    positiveLR: 2.33,
    negativeLR: 0.51,
    implicates: ["SLAP lesion (Type II-IV)", "Superior labral pathology"],
    clinicalNote: "Pain must be DEEP (not superficial AC joint pain). If pain on top of shoulder in both positions, consider AC joint pathology instead"
  },
  {
    name: "Biceps Load Test II",
    category: 'labral',
    purpose: "Superior labral (SLAP) lesion",
    technique: "Supine, arm abducted 120°, elbow flexed 90°, forearm supinated. Resist elbow flexion",
    positiveSign: "Pain provoked during resisted elbow flexion",
    sensitivity: 0.90,
    specificity: 0.97,
    positiveLR: 30.0,
    negativeLR: 0.10,
    implicates: ["SLAP lesion", "Biceps anchor pathology"],
    clinicalNote: "Excellent diagnostic accuracy. Highly sensitive - negative result effectively rules out SLAP"
  },
  {
    name: "Speed's Test",
    category: 'biceps',
    purpose: "Biceps tendon pathology (long head)",
    technique: "Shoulder flexed 60-90°, elbow extended, forearm supinated. Resist shoulder flexion",
    positiveSign: "Pain in the bicipital groove",
    sensitivity: 0.32,
    specificity: 0.75,
    positiveLR: 1.28,
    negativeLR: 0.91,
    implicates: ["Long head biceps tendinopathy", "Biceps instability", "SLAP lesion"],
    clinicalNote: "Poor diagnostic accuracy alone. Use in combination with Yergason's and palpation of bicipital groove"
  },
  {
    name: "Yergason's Test",
    category: 'biceps',
    purpose: "Biceps tendon stability in groove",
    technique: "Elbow flexed 90°, forearm pronated. Resist supination and elbow flexion simultaneously",
    positiveSign: "Pain in bicipital groove or tendon subluxation felt",
    sensitivity: 0.43,
    specificity: 0.79,
    positiveLR: 2.05,
    negativeLR: 0.72,
    implicates: ["Biceps tendinopathy", "Biceps subluxation", "Transverse humeral ligament tear"],
    clinicalNote: "More specific than Speed's for bicipital groove pathology. Subluxation felt is highly diagnostic"
  },
  {
    name: "Cross-Body Adduction Test",
    category: 'ac_joint',
    purpose: "Acromioclavicular joint pathology",
    technique: "Passively flex shoulder to 90°, then adduct across body towards opposite shoulder",
    positiveSign: "Pain localized to the AC joint (top of shoulder)",
    sensitivity: 0.77,
    specificity: 0.79,
    positiveLR: 3.67,
    negativeLR: 0.29,
    implicates: ["AC joint arthropathy", "AC joint sprain", "Distal clavicle osteolysis"],
    clinicalNote: "Pain must be localized to AC joint, not anterior or lateral shoulder. Combined with palpation tenderness increases accuracy"
  },
  {
    name: "Roos Test (EAST)",
    category: 'thoracic_outlet',
    purpose: "Thoracic outlet syndrome",
    technique: "Arms abducted 90°, elbows flexed 90°. Open and close hands rapidly for 3 minutes",
    positiveSign: "Reproduction of symptoms (numbness, tingling, heaviness, pallor) or inability to complete 3 minutes",
    sensitivity: 0.84,
    specificity: 0.30,
    positiveLR: 1.20,
    negativeLR: 0.53,
    implicates: ["Thoracic outlet syndrome", "Vascular TOS", "Neurogenic TOS"],
    clinicalNote: "Sensitive but not specific. Use with Adson's and costoclavicular maneuver for TOS cluster"
  },
  {
    name: "Upper Limb Neurodynamic Test 1 (ULNT1)",
    category: 'neurological',
    purpose: "Median nerve mechanosensitivity / cervical radiculopathy",
    technique: "Sequential: shoulder depression → abduction → wrist/finger extension → forearm supination → elbow extension → cervical lateral flexion away",
    positiveSign: "Reproduction of patient symptoms, difference >10° compared to asymptomatic side, symptoms altered by cervical lateral flexion",
    sensitivity: 0.97,
    specificity: 0.22,
    positiveLR: 1.24,
    negativeLR: 0.14,
    implicates: ["Median nerve mechanosensitivity", "Cervical radiculopathy C5-C7", "Peripheral nerve entrapment"],
    clinicalNote: "Highly sensitive - negative result effectively rules out neural involvement. Poor specificity requires clinical correlation"
  },
  {
    name: "Scapular Assistance Test",
    category: 'impingement',
    purpose: "Scapular dyskinesis as contributor to impingement",
    technique: "Manually assist scapular upward rotation and posterior tilt while patient actively elevates arm",
    positiveSign: "Reduction of pain or increased ROM with scapular assistance",
    sensitivity: 0.75,
    specificity: 0.65,
    positiveLR: 2.14,
    negativeLR: 0.38,
    implicates: ["Scapular dyskinesis", "Scapular muscle weakness", "Altered scapulohumeral rhythm"],
    clinicalNote: "Positive result strongly supports scapular rehabilitation as part of treatment. Links shoulder symptoms to kinetic chain"
  }
];

export const SHOULDER_MUSCLE_TESTS: MuscleTest[] = [
  {
    name: "Supraspinatus",
    muscle: "Supraspinatus",
    nerve: "Suprascapular nerve",
    root: "C5, C6",
    position: "Arm 90° abduction in scapular plane, thumb up (Full Can position)",
    resistance: "Downward force against abduction",
    grading: "0-5 MMT scale. Compare bilaterally. Note pain vs weakness",
    clinicalSignificance: "Initiates abduction (0-30°). Weakness suggests tear or suprascapular neuropathy. Pain with strength preserved suggests tendinopathy"
  },
  {
    name: "Infraspinatus",
    muscle: "Infraspinatus",
    nerve: "Suprascapular nerve",
    root: "C5, C6",
    position: "Elbow 90° flexion, arm at side. Externally rotate against resistance",
    resistance: "Resist external rotation with arm adducted",
    grading: "0-5 MMT. Note lag sign. Compare force at 0° and 90° abduction",
    clinicalSignificance: "Primary external rotator. Weakness with arm at side implicates infraspinatus specifically. Combined with ER lag sign suggests full tear"
  },
  {
    name: "Teres Minor",
    muscle: "Teres minor",
    nerve: "Axillary nerve",
    root: "C5, C6",
    position: "Arm 90° abduction, elbow 90° flexion (Hornblower position). Externally rotate",
    resistance: "Resist external rotation in 90° abduction",
    grading: "0-5 MMT. Hornblower's sign if unable to maintain",
    clinicalSignificance: "Tests ER in abducted position specifically loading teres minor. Positive Hornblower's = teres minor tear. Different nerve supply than infraspinatus"
  },
  {
    name: "Subscapularis",
    muscle: "Subscapularis",
    nerve: "Upper and lower subscapular nerves",
    root: "C5, C6, C7",
    position: "Hand behind back at lumbar level (Lift-Off) OR belly press position",
    resistance: "Try to push hand back to spine (Lift-Off) or pull hand off abdomen (Belly Press)",
    grading: "0-5 MMT. Note compensation patterns (elbow extension, shoulder extension)",
    clinicalSignificance: "Primary internal rotator and anterior stabilizer. Upper vs lower subscapularis distinguished by Bear Hug (upper) vs Lift-Off (lower)"
  },
  {
    name: "Deltoid (Anterior)",
    muscle: "Anterior deltoid",
    nerve: "Axillary nerve",
    root: "C5, C6",
    position: "Arm flexed to 90°, elbow extended",
    resistance: "Downward force against shoulder flexion",
    grading: "0-5 MMT. Note if patient compensates with trunk extension",
    clinicalSignificance: "If weak with intact rotator cuff, consider axillary nerve palsy (post-dislocation). Also weak in C5 radiculopathy"
  },
  {
    name: "Deltoid (Middle)",
    muscle: "Middle deltoid",
    nerve: "Axillary nerve",
    root: "C5, C6",
    position: "Arm abducted to 90°, elbow extended",
    resistance: "Downward force against abduction",
    grading: "0-5 MMT. Distinguish from supraspinatus by testing above 30°",
    clinicalSignificance: "Primary abductor above 30°. If weak with supraspinatus intact, axillary nerve lesion likely. Assess regimental badge area for sensory loss"
  },
  {
    name: "Upper Trapezius",
    muscle: "Upper trapezius",
    nerve: "Spinal accessory nerve (CN XI)",
    root: "CN XI, C3, C4",
    position: "Bilateral shoulder shrug",
    resistance: "Push shoulders down against shrug",
    grading: "0-5 MMT. Note asymmetry, fatigue, substitution patterns",
    clinicalSignificance: "Weakness suggests spinal accessory nerve palsy. Over-activity common in shoulder impingement and neck pain. Assess length and activation pattern"
  },
  {
    name: "Serratus Anterior",
    muscle: "Serratus anterior",
    nerve: "Long thoracic nerve",
    root: "C5, C6, C7",
    position: "Wall push-up position or push-plus against wall",
    resistance: "Observe scapula during push-up. Resist protraction in supine",
    grading: "Observe for winging. Grade by wall push-up, then floor push-up, then weighted",
    clinicalSignificance: "Key scapular stabilizer. Weakness causes medial winging. Long thoracic nerve palsy = dramatic winging. Subtle weakness contributes to dyskinesis and impingement"
  },
  {
    name: "Lower Trapezius",
    muscle: "Lower trapezius",
    nerve: "Spinal accessory nerve (CN XI)",
    root: "CN XI, C3, C4",
    position: "Prone, arm overhead at 135° (Y position). Lift arm off table",
    resistance: "Downward pressure on raised arm",
    grading: "0-5 MMT. Compare to upper trapezius ratio",
    clinicalSignificance: "Critical for scapular posterior tilt and depression during overhead movement. Weakness strongly associated with impingement and dyskinesis. Upper/lower trap ratio imbalance is key finding"
  },
  {
    name: "Rhomboids",
    muscle: "Rhomboid major and minor",
    nerve: "Dorsal scapular nerve",
    root: "C4, C5",
    position: "Prone, hand on lumbar spine. Lift hand off back while retracting scapula",
    resistance: "Push scapula laterally while patient retracts",
    grading: "0-5 MMT. Observe scapular position at rest for lateral drift",
    clinicalSignificance: "Scapular retractors. Weakness contributes to protracted resting posture and altered scapulohumeral rhythm. Often weak in forward head/rounded shoulder posture"
  }
];

export const SHOULDER_ROM_NORMS: RomNorm[] = [
  {
    movement: "Flexion",
    configKey: "flexion",
    normalRange: [160, 180],
    functionalMinimum: 120,
    capsularRestriction: true,
    capsularOrder: 2,
    ageAdjusted: { over60: [150, 170], over70: [140, 160] },
    clinicalNote: "Loss of last 20° often functional. Painful arc 60-120° suggests impingement"
  },
  {
    movement: "Abduction",
    configKey: "abduction",
    normalRange: [160, 180],
    functionalMinimum: 90,
    capsularRestriction: true,
    capsularOrder: 1,
    ageAdjusted: { over60: [150, 170], over70: [140, 160] },
    clinicalNote: "Most restricted in capsular pattern (adhesive capsulitis). Painful arc 60-120° = subacromial impingement. Check scapulohumeral rhythm at 90°"
  },
  {
    movement: "External Rotation",
    configKey: "externalRotation",
    normalRange: [80, 90],
    functionalMinimum: 45,
    capsularRestriction: true,
    capsularOrder: 3,
    ageAdjusted: { over60: [70, 85], over70: [60, 75] },
    clinicalNote: "Most diagnostic for capsular pattern. Loss >50% strongly suggests adhesive capsulitis. Measure at 0° abduction AND 90° abduction"
  },
  {
    movement: "Internal Rotation",
    configKey: "internalRotation",
    normalRange: [60, 80],
    functionalMinimum: 45,
    capsularRestriction: false,
    capsularOrder: 0,
    clinicalNote: "Measure as vertebral level reached behind back (functional) AND in degrees at 90° abduction. GIRD >20° in overhead athletes is clinically significant"
  },
  {
    movement: "Extension",
    configKey: "extension",
    normalRange: [50, 60],
    functionalMinimum: 30,
    capsularRestriction: false,
    capsularOrder: 0,
    clinicalNote: "Often preserved until late stages. Limited extension with pain may suggest posterior capsule tightness"
  },
  {
    movement: "Horizontal Adduction",
    configKey: "horizontalAdduction",
    normalRange: [120, 135],
    functionalMinimum: 90,
    capsularRestriction: false,
    capsularOrder: 0,
    clinicalNote: "Pain at end range suggests AC joint or posterior capsule. Compare bilaterally for posterior capsule tightness"
  }
];

export const CAPSULAR_PATTERN = {
  order: ["Abduction (most limited)", "External Rotation", "Flexion", "Internal Rotation (least limited)"],
  description: "The glenohumeral capsular pattern shows greatest restriction in abduction, followed by external rotation, then flexion, with internal rotation least affected. This pattern is characteristic of adhesive capsulitis (frozen shoulder).",
  differentialWhenPresent: ["Adhesive capsulitis (primary)", "Secondary adhesive capsulitis (post-surgical/trauma)", "Glenohumeral osteoarthritis", "Inflammatory arthritis"],
  differentialWhenAbsent: ["Rotator cuff pathology", "Impingement", "Labral tear", "AC joint pathology", "Bursitis"]
};

export const SHOULDER_DIFFERENTIALS: DifferentialDiagnosis[] = [
  {
    name: "Subacromial Impingement Syndrome",
    icd10: "M75.10",
    category: 'impingement',
    prevalence: 'common',
    keyFeatures: ["Painful arc 60-120° abduction", "Pain with overhead activities", "Night pain on affected side", "Gradual onset", "Age 40+"],
    supportingTests: ["Neer's Impingement Test", "Hawkins-Kennedy Test", "Scapular Assistance Test"],
    romPattern: "AROM: painful arc. PROM: may be full but painful. Resisted abduction/ER may be painful",
    painPattern: "Anterolateral shoulder, may radiate to lateral deltoid insertion. Worse overhead and reaching behind back",
    ageGroup: "40-65 years most common",
    onsetType: 'insidious',
    aggravatingFactors: ["Overhead reaching", "Sleeping on affected side", "Carrying loads at arm's length", "Repetitive shoulder elevation"],
    easingFactors: ["Rest", "NSAIDs", "Arm supported at side", "Ice"],
    redFlags: ["Severe night pain unrelieved by position change", "Rapid weakness progression", "Constitutional symptoms"]
  },
  {
    name: "Rotator Cuff Tendinopathy",
    icd10: "M75.10",
    category: 'rotator_cuff',
    prevalence: 'common',
    keyFeatures: ["Gradual onset pain", "Activity-related symptoms", "Painful resisted testing of affected tendon", "Pain with functional loading", "Night pain variable"],
    supportingTests: ["Empty Can (Jobe's) Test", "Full Can Test", "External Rotation Lag Sign"],
    romPattern: "AROM: may be limited by pain. PROM: usually full. Resisted: painful but strong (tendinopathy) or weak (tear)",
    painPattern: "Localizes to affected tendon region. Supraspinatus = anterolateral. Infraspinatus = posterior. Subscapularis = anterior",
    ageGroup: "30-60 years",
    onsetType: 'insidious',
    aggravatingFactors: ["Repetitive overhead activity", "Eccentric loading", "Sustained arm elevation", "Quick movements"],
    easingFactors: ["Relative rest", "Graduated loading", "Isometric holds initially"],
    redFlags: ["Sudden loss of strength after minor trauma in chronic tendinopathy = possible acute-on-chronic tear"]
  },
  {
    name: "Rotator Cuff Tear (Partial)",
    icd10: "M75.11",
    category: 'rotator_cuff',
    prevalence: 'common',
    keyFeatures: ["Pain with specific resisted movement", "May have painful arc", "Strength may be preserved", "Night pain common", "Can be traumatic or degenerative"],
    supportingTests: ["Empty Can (Jobe's) Test", "External Rotation Lag Sign", "Drop Arm Test"],
    romPattern: "AROM: may be painful. PROM: usually full. Resisted: painful, strength may be mildly reduced",
    painPattern: "Similar to tendinopathy but often more intense. Night pain more common",
    ageGroup: "40+ years (degenerative), any age (traumatic)",
    onsetType: 'both',
    aggravatingFactors: ["Overhead activity", "Loaded reaching", "Sleeping on side"],
    easingFactors: ["Modified activity", "Relative rest initially", "Progressive loading in pain-free range"],
    redFlags: ["Traumatic onset with immediate weakness = urgent imaging needed"]
  },
  {
    name: "Rotator Cuff Tear (Full-Thickness)",
    icd10: "M75.12",
    category: 'rotator_cuff',
    prevalence: 'moderate',
    keyFeatures: ["Significant weakness in specific direction", "May have dropped arm sign", "Night pain", "Muscle atrophy possible", "Functional limitation for overhead tasks"],
    supportingTests: ["Drop Arm Test", "External Rotation Lag Sign", "Hornblower's Sign", "Lift-Off Test (Gerber)"],
    romPattern: "AROM: significantly limited. PROM: may be full (distinguishes from frozen shoulder). Resisted: weak",
    painPattern: "Variable - some large tears are relatively painless. Pseudoparalysis in massive tears",
    ageGroup: "50+ years most common",
    onsetType: 'both',
    aggravatingFactors: ["Any shoulder use in massive tears", "Overhead reaching", "Lifting"],
    easingFactors: ["Complete rest", "Support of arm", "NSAIDs"],
    redFlags: ["Acute traumatic tear in young patient = surgical consultation", "Pseudoparalysis = urgent referral"]
  },
  {
    name: "Adhesive Capsulitis (Frozen Shoulder)",
    icd10: "M75.00",
    category: 'adhesive_capsulitis',
    prevalence: 'common',
    keyFeatures: ["Progressive stiffness", "Night pain (freezing stage)", "Global ROM loss with capsular pattern", "Diabetes association (5x risk)", "Insidious onset"],
    supportingTests: [],
    romPattern: "AROM AND PROM both restricted in capsular pattern: ER > ABD > Flexion > IR. Same loss active and passive is hallmark",
    painPattern: "Initially diffuse, aching. Becomes end-range pain only in frozen stage. Gradual resolution in thawing stage",
    ageGroup: "40-60 years. Women > Men (4:1)",
    onsetType: 'insidious',
    aggravatingFactors: ["Any shoulder movement beyond available range", "Sleeping", "Sudden movements"],
    easingFactors: ["Movement within available range", "Heat", "Gentle stretching at end range"],
    redFlags: ["Failure to progress after 12 months", "Worsening stiffness after thawing begins", "Bilateral simultaneous onset (consider systemic cause)"]
  },
  {
    name: "Anterior Glenohumeral Instability",
    icd10: "M24.411",
    category: 'instability',
    prevalence: 'moderate',
    keyFeatures: ["History of dislocation or subluxation", "Apprehension in abduction/ER", "Dead arm episodes", "Young active population", "Recurrence common"],
    supportingTests: ["Apprehension Test", "Relocation Test", "Sulcus Sign"],
    romPattern: "AROM: may be full. Excessive ER compared to contralateral. Apprehension at end-range ABD/ER",
    painPattern: "Anterior shoulder with apprehension rather than sharp pain. Dead arm sensation during overhead activities",
    ageGroup: "15-35 years most common. >90% recurrence if first dislocation <20 years",
    onsetType: 'traumatic',
    aggravatingFactors: ["Overhead sports (throwing, swimming)", "Reaching behind", "Abduction with external rotation", "Contact sports"],
    easingFactors: ["Avoiding provocative positions", "Strengthening rotator cuff (dynamic stabilizers)", "Taping/bracing"],
    redFlags: ["First-time dislocation with neurological deficit", "Associated fracture", "Vascular injury"]
  },
  {
    name: "Multidirectional Instability (MDI)",
    icd10: "M24.419",
    category: 'instability',
    prevalence: 'uncommon',
    keyFeatures: ["Generalized ligamentous laxity", "Instability in >1 direction", "Bilateral symptoms common", "Insidious onset", "Often young and hypermobile"],
    supportingTests: ["Sulcus Sign", "Apprehension Test"],
    romPattern: "Excessive ROM in multiple directions. Beighton score often elevated. Sulcus sign positive that doesn't reduce in ER",
    painPattern: "Vague, poorly localized shoulder pain. Feeling of instability. Activity-related rather than position-specific",
    ageGroup: "15-30 years. Often bilateral",
    onsetType: 'insidious',
    aggravatingFactors: ["Overhead activities", "Heavy lifting", "Repetitive sport", "Prolonged arm hanging"],
    easingFactors: ["Rotator cuff and scapular strengthening", "Proprioceptive training", "Activity modification"],
    redFlags: ["Ehlers-Danlos or other connective tissue disorder suspected"]
  },
  {
    name: "SLAP Lesion (Superior Labral Tear)",
    icd10: "S43.439A",
    category: 'labral',
    prevalence: 'moderate',
    keyFeatures: ["Deep shoulder pain", "Clicking/catching", "Overhead athletes (throwing)", "Fall on outstretched hand", "Pain with biceps loading"],
    supportingTests: ["O'Brien's Active Compression Test", "Biceps Load Test II", "Speed's Test"],
    romPattern: "AROM usually preserved. Painful arc at specific positions. Clicking/catching with combined movements",
    painPattern: "Deep, hard to localize. May be anterior (biceps anchor). Worse with throwing/overhead. Popping/clicking sensation",
    ageGroup: "20-40 years. Overhead athletes",
    onsetType: 'both',
    aggravatingFactors: ["Overhead throwing", "Heavy lifting", "Pull-ups", "Catching heavy objects"],
    easingFactors: ["Rest from provocative activity", "Scapular control exercises"],
    redFlags: ["Locking sensation (bucket handle labral tear)"]
  },
  {
    name: "AC Joint Arthropathy/Sprain",
    icd10: "M19.019",
    category: 'ac_joint',
    prevalence: 'common',
    keyFeatures: ["Point tenderness over AC joint", "Pain reaching across body", "Pain sleeping on side", "History of trauma (sprain) or weight training (degenerative)"],
    supportingTests: ["Cross-Body Adduction Test"],
    romPattern: "Flexion and abduction may be full but painful at end range (>160°). Cross-body adduction reproduces pain",
    painPattern: "Precisely localized to top of shoulder (AC joint). Differentiate from subacromial pain which is more anterolateral",
    ageGroup: "Traumatic: 20-40 (sports). Degenerative: 40+ (especially weightlifters)",
    onsetType: 'both',
    aggravatingFactors: ["Cross-body reaching", "Push-ups", "Bench press", "Sleeping on affected side", "Carrying heavy bags"],
    easingFactors: ["Avoiding end-range movements", "AC joint mobilization", "Modification of gym exercises"],
    redFlags: ["Grade III+ sprain with visible deformity = orthopedic referral", "Post-traumatic osteolysis (weight lifters)"]
  },
  {
    name: "Cervical Radiculopathy (Referred)",
    icd10: "M54.12",
    category: 'cervical_referred',
    prevalence: 'moderate',
    keyFeatures: ["Neck pain radiating to shoulder/arm", "Dermatomal pattern (C5/C6)", "Sensory changes", "Reflex changes", "Spurling's positive"],
    supportingTests: ["Upper Limb Neurodynamic Test 1 (ULNT1)"],
    romPattern: "Shoulder ROM may be full and painless. Cervical ROM restricted and painful. Spurling's reproduces shoulder symptoms",
    painPattern: "Follows dermatomal pattern. C5: lateral arm/deltoid. C6: lateral forearm, thumb. Often burning/electric quality",
    ageGroup: "40-60 years. History of neck problems",
    onsetType: 'both',
    aggravatingFactors: ["Cervical extension", "Ipsilateral rotation", "Sustained postures", "Coughing/sneezing"],
    easingFactors: ["Cervical distraction", "Hand on head (abduction relief sign)", "Contralateral lateral flexion"],
    redFlags: ["Progressive neurological deficit", "Bilateral symptoms", "Gait disturbance (myelopathy)", "Bowel/bladder changes"]
  },
  {
    name: "Thoracic Outlet Syndrome",
    icd10: "G54.0",
    category: 'neural',
    prevalence: 'uncommon',
    keyFeatures: ["Arm symptoms with overhead positions", "Numbness in ulnar distribution", "Vascular changes possible", "Young females predominate", "History of neck/rib injury"],
    supportingTests: ["Roos Test (EAST)"],
    romPattern: "Shoulder ROM usually full. Symptoms provoked by sustained overhead positioning. Neurological changes in hand",
    painPattern: "Medial arm and forearm. Numbness in ring/little finger (lower trunk). May have color changes in hand. Symptoms worse overhead",
    ageGroup: "20-50 years. Women 3:1",
    onsetType: 'insidious',
    aggravatingFactors: ["Overhead activities", "Carrying bags on shoulder", "Sleeping with arms overhead", "Heavy lifting"],
    easingFactors: ["Arm at side", "Postural correction", "Scalene stretching", "First rib mobilization"],
    redFlags: ["Vascular TOS with hand ischemia = vascular surgery referral", "Rapid muscle wasting (Gilliatt-Sumner hand)"]
  }
];

export const KINETIC_CHAIN_CONTRIBUTORS: KineticChainContributor[] = [
  {
    region: "Scapulothoracic Complex",
    relationship: "The scapula must upwardly rotate 60° during full shoulder elevation (2:1 scapulohumeral rhythm). Dyskinesis forces the glenohumeral joint to compensate, narrowing the subacromial space.",
    assessmentMethod: "Observe scapular motion during bilateral arm elevation. Check for winging (serratus anterior), hiking (upper trap dominance), or lag in upward rotation. Scapular Assistance Test: if shoulder pain decreases when examiner manually assists scapular rotation, scapular rehabilitation is indicated.",
    compensatoryPattern: "Excessive upper trapezius activation with poor serratus anterior and lower trapezius recruitment leads to reduced subacromial space and impingement",
    configKeys: [
      { group: "leftScapula", key: "upwardRotation" },
      { group: "leftScapula", key: "posteriorTilt" },
      { group: "leftScapula", key: "winging" },
      { group: "leftScapula", key: "protraction" }
    ],
    thresholds: { mild: 5, moderate: 10, significant: 15 },
    treatmentImplication: "Scapular stabilization exercises: serratus anterior wall slides, lower trapezius Y-raises, scapular clock exercises. Progress from open to closed chain"
  },
  {
    region: "Thoracic Spine",
    relationship: "Thoracic extension is required for full overhead shoulder motion. For every 10° of lost thoracic extension, approximately 5-8° of compensatory shoulder flexion is needed, increasing subacromial loading by up to 30%.",
    assessmentMethod: "Assess thoracic kyphosis and extension mobility. Seated thoracic rotation should be >40° bilateral. Thoracic extension over foam roller or chair back. Compare wall angel test capacity.",
    compensatoryPattern: "Excessive thoracic kyphosis forces compensatory lumbar lordosis and cervical extension, while limiting scapular posterior tilt and upward rotation, creating impingement cascade",
    configKeys: [
      { group: "spine", key: "thoracicKyphosis" },
      { group: "spine", key: "thoracicRotation" }
    ],
    thresholds: { mild: 10, moderate: 20, significant: 35 },
    treatmentImplication: "Thoracic extension mobilization (foam roller, manual), rotation stretches, combined extension-rotation exercises. Address desk posture and ergonomics"
  },
  {
    region: "Cervical Spine",
    relationship: "The cervical spine shares neural supply (C5-C7) with the shoulder. Cervical dysfunction can refer pain to the shoulder, and cervical posture directly affects scapular position through muscular attachments (levator scapulae, upper trapezius).",
    assessmentMethod: "Cervical ROM, Spurling's test, ULNT1. Check for forward head posture. Assess cervical quadrant test. Rule out C5/C6 radiculopathy mimicking rotator cuff weakness.",
    compensatoryPattern: "Forward head posture increases cervical lordosis, elevates the scapulae via levator scapulae tension, and shifts the center of gravity of the head forward, increasing upper trapezius loading",
    configKeys: [
      { group: "spine", key: "forwardHead" },
      { group: "neck", key: "flexion" },
      { group: "spine", key: "cervicalLateralFlexion" }
    ],
    thresholds: { mild: 5, moderate: 15, significant: 25 },
    treatmentImplication: "Cervical retraction exercises, deep cervical flexor activation, levator scapulae stretching. Address workstation ergonomics. Rule out cervical radiculopathy before treating shoulder"
  },
  {
    region: "Rib Cage (Upper Ribs 1-3)",
    relationship: "The first three ribs form the superior border of the thoracic outlet and provide attachment points for scalenes. Restricted upper rib mobility limits scapular excursion and can compress the brachial plexus/subclavian vessels, mimicking shoulder pathology.",
    assessmentMethod: "Palpate rib mobility during breathing. First rib elevation test. Spring test ribs 1-3. Assess breathing pattern (diaphragmatic vs upper chest). Check scalene tightness.",
    compensatoryPattern: "Elevated first rib restricts scapular depression and can cause neurogenic or vascular thoracic outlet symptoms that mimic shoulder pain",
    configKeys: [
      { group: "spine", key: "thoracicKyphosis" },
      { group: "spine", key: "lateralShift" }
    ],
    thresholds: { mild: 5, moderate: 10, significant: 20 },
    treatmentImplication: "First rib mobilization (Grade III-IV PA), scalene stretching, breathing retraining (diaphragmatic pattern), postural correction. Consider referral for TOS screening if vascular signs present"
  },
  {
    region: "Pelvis & Lumbar Spine",
    relationship: "The pelvis is the foundation of the kinetic chain. Pelvic asymmetry shifts the trunk's center of mass laterally, altering scapular resting position and shoulder mechanics. Lumbar stiffness reduces the body's ability to generate force from the ground up, increasing shoulder loading in functional tasks.",
    assessmentMethod: "Assess pelvic tilt, obliquity, and rotation. Check for lateral shift. SIJ provocation tests. Lumbar flexion/extension mobility. Single leg stance balance.",
    compensatoryPattern: "Anterior pelvic tilt increases lumbar lordosis, shifts thorax posteriorly, and reduces available thoracic extension. Lateral pelvic obliquity creates ipsilateral scapular depression or contralateral elevation",
    configKeys: [
      { group: "pelvis", key: "tilt" },
      { group: "pelvis", key: "obliquity" },
      { group: "pelvis", key: "rotation" },
      { group: "spine", key: "lumbarLordosis" }
    ],
    thresholds: { mild: 3, moderate: 7, significant: 12 },
    treatmentImplication: "Core stability training, pelvic floor activation, hip flexor stretching (Thomas test negative), gluteal strengthening. Address asymmetry before loading shoulder rehabilitation"
  },
  {
    region: "Contralateral Shoulder",
    relationship: "Bilateral comparison is essential. The contralateral shoulder serves as baseline for ROM, strength, and posture. Compensatory overuse of the contralateral shoulder can develop during unilateral shoulder dysfunction.",
    assessmentMethod: "Compare bilateral shoulder ROM, strength, and scapular position. Check for compensatory movement patterns. Assess bilateral grip strength and functional reaching tasks.",
    compensatoryPattern: "Favoring one shoulder increases loading on the opposite side, potentially developing bilateral pathology. Also check for GIRD (Glenohumeral Internal Rotation Deficit) in athletes - compare total arc of motion bilateral",
    configKeys: [
      { group: "rightShoulder", key: "flexion" },
      { group: "rightShoulder", key: "abduction" },
      { group: "rightShoulder", key: "externalRotation" },
      { group: "rightShoulder", key: "internalRotation" }
    ],
    thresholds: { mild: 10, moderate: 20, significant: 30 },
    treatmentImplication: "Bilateral rehabilitation where appropriate. Address total arc of motion deficits in athletes. Monitor contralateral overuse. Ensure symmetric scapular mechanics"
  },
  {
    region: "Ipsilateral Hip & Lower Limb",
    relationship: "In overhead athletes and functional tasks, the shoulder relies on ground reaction forces transmitted through the kinetic chain. Poor hip stability reduces force generation from the lower limb, requiring the shoulder to generate more force locally. In throwing athletes, hip IR deficit correlates with shoulder injuries.",
    assessmentMethod: "Single leg squat quality, hip IR/ER ROM, gluteal strength (Trendelenburg), star excursion balance test. In throwers, check hip IR ROM bilateral.",
    compensatoryPattern: "Poor hip stability during single leg activities forces the trunk to compensate, altering scapular mechanics. In throwers, reduced hip IR leads to increased shoulder ER torque",
    configKeys: [
      { group: "leftHip", key: "flexion" },
      { group: "leftHip", key: "internalRotation" },
      { group: "leftHip", key: "abduction" }
    ],
    thresholds: { mild: 5, moderate: 10, significant: 20 },
    treatmentImplication: "Hip strengthening (clamshells, side-lying abduction, single leg bridges). Hip IR stretching in throwers. Integrate lower limb into shoulder rehabilitation (kinetic chain exercises)"
  }
];

export const SHOULDER_PAIN_ZONES: ShoulderPainZone[] = [
  {
    id: "anterior",
    name: "Anterior Shoulder",
    anatomicalStructures: ["Biceps long head tendon", "Subscapularis", "Anterior capsule", "Coracoid process", "Pectoralis minor"],
    commonPathologies: ["Biceps tendinopathy", "Subscapularis tear", "Anterior instability", "Pectoralis minor tightness"],
    differentials: ["Biceps tendinopathy", "Subscapularis tear", "Anterior instability", "SLAP lesion", "Pectoralis strain"],
    skeletonRegion: "left_shoulder"
  },
  {
    id: "lateral",
    name: "Lateral Shoulder (Deltoid Region)",
    anatomicalStructures: ["Subacromial bursa", "Supraspinatus tendon", "Deltoid", "Greater tuberosity"],
    commonPathologies: ["Subacromial impingement", "Supraspinatus tendinopathy", "Subacromial bursitis", "Deltoid strain"],
    differentials: ["Subacromial Impingement Syndrome", "Rotator Cuff Tendinopathy", "Subacromial bursitis", "C5 radiculopathy (referred)"],
    skeletonRegion: "left_shoulder"
  },
  {
    id: "posterior",
    name: "Posterior Shoulder",
    anatomicalStructures: ["Infraspinatus", "Teres minor", "Posterior capsule", "Posterior labrum", "Quadrilateral space"],
    commonPathologies: ["Infraspinatus tear", "Posterior capsule tightness", "Internal impingement", "Quadrilateral space syndrome"],
    differentials: ["Infraspinatus/teres minor pathology", "Posterior capsule tightness", "Internal impingement (overhead athletes)", "Quadrilateral space syndrome"],
    skeletonRegion: "left_shoulder"
  },
  {
    id: "superior",
    name: "Superior Shoulder (AC Joint / Subacromial)",
    anatomicalStructures: ["Acromioclavicular joint", "Supraspinatus (insertion)", "Acromion", "Coracoacromial ligament"],
    commonPathologies: ["AC joint arthropathy", "AC joint sprain", "Distal clavicle osteolysis", "Supraspinatus insertion tendinopathy"],
    differentials: ["AC Joint Arthropathy/Sprain", "Distal clavicle osteolysis", "Supraspinatus calcific tendinopathy"],
    skeletonRegion: "left_shoulder"
  },
  {
    id: "scapular",
    name: "Scapular/Periscapular Region",
    anatomicalStructures: ["Rhomboids", "Middle trapezius", "Lower trapezius", "Serratus anterior", "Levator scapulae", "Scapulothoracic bursa"],
    commonPathologies: ["Scapular dyskinesis", "Snapping scapula", "Dorsal scapular nerve entrapment", "Myofascial pain"],
    differentials: ["Scapular dyskinesis with secondary impingement", "Snapping scapula syndrome", "Dorsal scapular neuropathy", "Myofascial trigger points"],
    skeletonRegion: "left_shoulder"
  },
  {
    id: "cervical_referred",
    name: "Cervical Referred Pattern",
    anatomicalStructures: ["C5/C6 nerve roots", "Cervical facet joints C4-C6", "Cervical disc C5-C6"],
    commonPathologies: ["Cervical radiculopathy C5-C6", "Cervical facet arthropathy", "Cervical disc herniation"],
    differentials: ["Cervical Radiculopathy (Referred)", "Cervical facet syndrome", "Cervical disc herniation with radiculopathy"],
    skeletonRegion: "cervical_spine"
  }
];

export const SHOULDER_ASSESSMENT_STEPS: AssessmentStep[] = [
  {
    id: "history",
    name: "Subjective History",
    category: 'history',
    description: "Gather comprehensive patient history to guide the clinical reasoning process",
    items: [
      { id: "onset", label: "Onset Type", type: "select", options: ["Traumatic (specific event)", "Insidious (gradual)", "Post-surgical", "Recurrent episode"], required: true },
      { id: "duration", label: "Duration", type: "select", options: ["<1 week (acute)", "1-6 weeks (sub-acute)", "6-12 weeks (early chronic)", ">12 weeks (chronic)"], required: true },
      { id: "mechanism", label: "Mechanism of Injury (if traumatic)", type: "text" },
      { id: "location", label: "Primary Pain Location", type: "multiselect", options: ["Anterior shoulder", "Lateral shoulder", "Posterior shoulder", "Superior/AC joint", "Scapular region", "Radiating to arm", "Neck involvement"] },
      { id: "severity", label: "Pain Severity (0-10 NRS)", type: "scale", scaleRange: [0, 10] },
      { id: "nightPain", label: "Night Pain", type: "select", options: ["None", "Occasional - position dependent", "Frequent - wakes from sleep", "Constant - cannot sleep on side"] },
      { id: "aggravating", label: "Aggravating Factors", type: "multiselect", options: ["Overhead reaching", "Reaching behind back", "Lying on side", "Lifting", "Pushing/pulling", "Throwing", "Driving", "Dressing", "Hair care"] },
      { id: "easing", label: "Easing Factors", type: "multiselect", options: ["Rest", "Ice", "Heat", "NSAIDs", "Arm support", "Specific position", "Activity modification"] },
      { id: "previousEpisodes", label: "Previous Shoulder Episodes", type: "boolean" },
      { id: "previousTreatment", label: "Previous Treatment", type: "multiselect", options: ["None", "Physiotherapy", "Cortisone injection", "Surgery", "Medication", "Self-management"] },
      { id: "occupation", label: "Occupation Type", type: "select", options: ["Sedentary/desk", "Light manual", "Heavy manual", "Overhead work", "Athlete/sport", "Retired"] },
      { id: "handDominance", label: "Dominant Hand", type: "select", options: ["Right", "Left", "Ambidextrous"] },
      { id: "affectedSide", label: "Affected Side", type: "select", options: ["Left", "Right", "Bilateral"], required: true },
      { id: "instability", label: "History of Dislocation/Subluxation", type: "boolean" },
      { id: "clicking", label: "Clicking/Catching/Locking", type: "boolean" },
      { id: "weakness", label: "Subjective Weakness", type: "boolean" },
      { id: "numbness", label: "Numbness/Tingling", type: "boolean" },
      { id: "comorbidities", label: "Relevant Medical History", type: "multiselect", options: ["Diabetes", "Thyroid disorder", "Cardiac history", "Previous fracture", "Inflammatory arthritis", "Hypermobility", "Cancer history", "None relevant"] },
      { id: "patientGoals", label: "Patient Goals", type: "text" }
    ]
  },
  {
    id: "observation",
    name: "Observation & Posture",
    category: 'observation',
    description: "Visual assessment of posture, alignment, and asymmetry",
    items: [
      { id: "postureGeneral", label: "General Posture", type: "multiselect", options: ["Normal alignment", "Forward head posture", "Increased thoracic kyphosis", "Rounded shoulders", "Elevated shoulder", "Depressed shoulder", "Trunk shift", "Scoliosis"] },
      { id: "scapularPosition", label: "Scapular Resting Position", type: "multiselect", options: ["Symmetrical", "Protracted", "Retracted", "Elevated", "Depressed", "Downwardly rotated", "Winging present", "Asymmetric"] },
      { id: "muscleWasting", label: "Visible Muscle Wasting", type: "multiselect", options: ["None", "Supraspinatus fossa", "Infraspinatus fossa", "Deltoid", "Trapezius", "Biceps"] },
      { id: "swelling", label: "Swelling/Deformity", type: "multiselect", options: ["None", "AC joint prominence", "Anterior fullness", "General shoulder swelling", "Deltoid contour change", "Step deformity (AC separation)"] },
      { id: "skinChanges", label: "Skin/Color Changes", type: "multiselect", options: ["None", "Bruising", "Redness", "Surgical scars", "Atrophy skin changes"] },
      { id: "scapularDyskinesis", label: "Scapular Dyskinesis (during arm elevation)", type: "select", options: ["None", "Type I - Inferior angle prominence", "Type II - Medial border prominence", "Type III - Superior border prominence", "Type IV - Symmetrical but excessive motion"] }
    ]
  },
  {
    id: "arom",
    name: "Active Range of Motion",
    category: 'arom',
    description: "Measure active movement, note quality, willingness, and painful arcs",
    items: [
      { id: "aromFlexion", label: "Active Flexion (°)", type: "rom", scaleRange: [0, 180], configKey: "flexion" },
      { id: "aromAbduction", label: "Active Abduction (°)", type: "rom", scaleRange: [0, 180], configKey: "abduction" },
      { id: "aromER", label: "Active External Rotation (°)", type: "rom", scaleRange: [0, 90], configKey: "externalRotation" },
      { id: "aromIR", label: "Active Internal Rotation (°)", type: "rom", scaleRange: [0, 80], configKey: "internalRotation" },
      { id: "painfulArc", label: "Painful Arc Present", type: "select", options: ["No painful arc", "60-120° (subacromial)", "Above 160° (AC joint)", "Throughout range"] },
      { id: "scapulohumeral", label: "Scapulohumeral Rhythm", type: "select", options: ["Normal 2:1 ratio", "Early scapular hiking", "Scapular lag", "Reversed rhythm", "Shrugging pattern"] },
      { id: "willingness", label: "Willingness to Move", type: "select", options: ["Moves freely", "Guarded but completes", "Significantly guarded", "Unable/unwilling to attempt"] }
    ]
  },
  {
    id: "prom",
    name: "Passive Range of Motion",
    category: 'prom',
    description: "Assess passive movement and end-feel. Compare to active ROM for contract-relax discrepancy",
    items: [
      { id: "promFlexion", label: "Passive Flexion (°)", type: "rom", scaleRange: [0, 180] },
      { id: "promAbduction", label: "Passive Abduction (°)", type: "rom", scaleRange: [0, 180] },
      { id: "promER", label: "Passive External Rotation (°)", type: "rom", scaleRange: [0, 90] },
      { id: "promIR", label: "Passive Internal Rotation (°)", type: "rom", scaleRange: [0, 80] },
      { id: "endFeel", label: "End-Feel Quality", type: "select", options: ["Normal capsular (firm stretch)", "Empty (pain before end-range)", "Muscle spasm", "Springy block", "Hard/bony"] },
      { id: "capsularPattern", label: "Capsular Pattern Present", type: "select", options: ["No - non-capsular restriction", "Partial - some capsular features", "Yes - classic capsular pattern (ER > ABD > Flex)"] },
      { id: "aromPromDifference", label: "AROM-PROM Discrepancy", type: "select", options: ["Minimal (<10°)", "Moderate (10-30°)", "Significant (>30° - suggests pain inhibition or weakness)"] }
    ]
  },
  {
    id: "resisted",
    name: "Resisted Muscle Testing",
    category: 'resisted',
    description: "Isometric testing in mid-range to assess contractile tissue integrity",
    items: [
      { id: "resistedAbduction", label: "Resisted Abduction (Supraspinatus)", type: "select", options: ["5/5 Strong & painless", "5/5 Strong but painful", "4/5 Mild weakness", "4/5 Weakness & pain", "3/5 Moderate weakness", "2/5 or less - Significant weakness"] },
      { id: "resistedER", label: "Resisted External Rotation (Infraspinatus)", type: "select", options: ["5/5 Strong & painless", "5/5 Strong but painful", "4/5 Mild weakness", "4/5 Weakness & pain", "3/5 Moderate weakness", "2/5 or less - Significant weakness"] },
      { id: "resistedIR", label: "Resisted Internal Rotation (Subscapularis)", type: "select", options: ["5/5 Strong & painless", "5/5 Strong but painful", "4/5 Mild weakness", "4/5 Weakness & pain", "3/5 Moderate weakness", "2/5 or less - Significant weakness"] },
      { id: "resistedFlexion", label: "Resisted Flexion (Anterior Deltoid/Biceps)", type: "select", options: ["5/5 Strong & painless", "5/5 Strong but painful", "4/5 Mild weakness", "4/5 Weakness & pain", "3/5 Moderate weakness", "2/5 or less - Significant weakness"] },
      { id: "resistedElbowFlex", label: "Resisted Elbow Flexion (Biceps - C5/C6)", type: "select", options: ["5/5 Strong & painless", "5/5 Strong but painful", "4/5 Mild weakness", "3/5 or less - Moderate/significant weakness"] },
      { id: "resistedWristExt", label: "Resisted Wrist Extension (C6)", type: "select", options: ["5/5 Strong & painless", "4/5 Mild weakness", "3/5 or less - Moderate/significant weakness"] }
    ]
  },
  {
    id: "special_tests",
    name: "Special Tests",
    category: 'special_tests',
    description: "Select and record results of relevant special tests based on clinical hypothesis",
    items: SHOULDER_SPECIAL_TESTS.map(test => ({
      id: `test_${test.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      label: `${test.name}`,
      type: 'select' as const,
      options: ['Not tested', 'Positive', 'Negative', 'Equivocal']
    }))
  },
  {
    id: "neurological",
    name: "Neurological Screen",
    category: 'neurological',
    description: "Upper limb neurological assessment to rule out cervical or peripheral nerve involvement",
    items: [
      { id: "dermatomesC5", label: "C5 Dermatome (Lateral arm)", type: "select", options: ["Normal", "Decreased", "Absent", "Increased"] },
      { id: "dermatomesC6", label: "C6 Dermatome (Lateral forearm, thumb)", type: "select", options: ["Normal", "Decreased", "Absent", "Increased"] },
      { id: "dermatomesC7", label: "C7 Dermatome (Middle finger)", type: "select", options: ["Normal", "Decreased", "Absent", "Increased"] },
      { id: "reflexBiceps", label: "Biceps Reflex (C5/C6)", type: "select", options: ["Normal", "Diminished", "Absent", "Hyperactive"] },
      { id: "reflexBrachiorad", label: "Brachioradialis Reflex (C6)", type: "select", options: ["Normal", "Diminished", "Absent", "Hyperactive"] },
      { id: "reflexTriceps", label: "Triceps Reflex (C7)", type: "select", options: ["Normal", "Diminished", "Absent", "Hyperactive"] },
      { id: "ulnt1", label: "ULNT1 (Median Nerve)", type: "select", options: ["Not tested", "Negative", "Positive - reproduces symptoms", "Positive - structural differentiation confirms"] },
      { id: "regimental", label: "Regimental Badge Area (Axillary nerve)", type: "select", options: ["Normal sensation", "Decreased sensation", "Absent sensation"] },
      { id: "spurlings", label: "Spurling's Test", type: "select", options: ["Not tested", "Negative", "Positive - reproduces shoulder/arm pain"] }
    ]
  },
  {
    id: "functional",
    name: "Functional Assessment",
    category: 'functional',
    description: "Assess functional capacity and patient-reported outcome measures",
    items: [
      { id: "handBehindBack", label: "Hand Behind Back Reach", type: "select", options: ["Reaches T7 or above", "Reaches T12-L1", "Reaches buttock only", "Cannot reach behind back"] },
      { id: "handBehindHead", label: "Hand Behind Head", type: "select", options: ["Full reach, no difficulty", "Completes with compensation", "Partial range only", "Unable to perform"] },
      { id: "overheadReach", label: "Overhead Reach (functional)", type: "select", options: ["Full height, no difficulty", "Reaches above head with effort", "Cannot reach above shoulder", "Significant limitation"] },
      { id: "spadiScore", label: "SPADI Score (if completed)", type: "scale", scaleRange: [0, 100] },
      { id: "dashScore", label: "QuickDASH Score (if completed)", type: "scale", scaleRange: [0, 100] },
      { id: "functionalGoal", label: "Primary Functional Limitation", type: "text" }
    ]
  }
];

export const OUTCOME_MEASURES = {
  SPADI: {
    name: "Shoulder Pain and Disability Index",
    description: "Patient-reported outcome measure assessing shoulder pain and disability",
    scoring: "0-100, higher = more disability",
    mcid: 8,
    interpretation: { mild: [0, 30], moderate: [31, 60], severe: [61, 100] }
  },
  QuickDASH: {
    name: "Quick Disabilities of the Arm, Shoulder and Hand",
    description: "11-item questionnaire measuring upper limb function",
    scoring: "0-100, higher = more disability",
    mcid: 11,
    interpretation: { mild: [0, 25], moderate: [26, 50], severe: [51, 100] }
  }
};

export function analyzeKineticChain(modelConfig: any, side: 'left' | 'right'): { region: string; severity: 'none' | 'mild' | 'moderate' | 'significant'; value: number; detail: string; treatment: string }[] {
  const results: { region: string; severity: 'none' | 'mild' | 'moderate' | 'significant'; value: number; detail: string; treatment: string }[] = [];
  const sidePrefix = side === 'left' ? 'left' : 'right';
  const oppositeSide = side === 'left' ? 'right' : 'left';

  for (const contributor of KINETIC_CHAIN_CONTRIBUTORS) {
    let maxDeviation = 0;
    let detailParts: string[] = [];

    const configKeys = contributor.region === "Contralateral Shoulder"
      ? contributor.configKeys.map(ck => ({ group: ck.group.replace('right', oppositeSide).replace('left', oppositeSide), key: ck.key }))
      : contributor.region === "Ipsilateral Hip & Lower Limb"
        ? contributor.configKeys.map(ck => ({ group: ck.group.replace('left', sidePrefix), key: ck.key }))
        : contributor.configKeys;

    for (const ck of configKeys) {
      const group = modelConfig[ck.group];
      if (group && typeof group[ck.key] === 'number') {
        const val = Math.abs(group[ck.key]);
        if (val > maxDeviation) maxDeviation = val;
        if (val > 0) {
          detailParts.push(`${ck.key}: ${group[ck.key]}°`);
        }
      }
    }

    let severity: 'none' | 'mild' | 'moderate' | 'significant' = 'none';
    if (maxDeviation >= contributor.thresholds.significant) severity = 'significant';
    else if (maxDeviation >= contributor.thresholds.moderate) severity = 'moderate';
    else if (maxDeviation >= contributor.thresholds.mild) severity = 'mild';

    results.push({
      region: contributor.region,
      severity,
      value: maxDeviation,
      detail: detailParts.length > 0 ? detailParts.join(', ') : 'Within normal limits',
      treatment: contributor.treatmentImplication
    });
  }

  return results;
}

export function detectCapsularPattern(romData: Record<string, number>): { present: boolean; confidence: 'high' | 'moderate' | 'low'; detail: string } {
  const erLoss = Math.max(0, 85 - (romData.externalRotation || 85));
  const abdLoss = Math.max(0, 170 - (romData.abduction || 170));
  const flexLoss = Math.max(0, 170 - (romData.flexion || 170));
  const irLoss = Math.max(0, 70 - (romData.internalRotation || 70));

  const capsularOrder = abdLoss >= erLoss && erLoss >= flexLoss && flexLoss >= irLoss;
  const significantLoss = erLoss > 15 || abdLoss > 20;

  if (capsularOrder && significantLoss && abdLoss > 0 && erLoss > 0) {
    const totalLoss = erLoss + abdLoss + flexLoss;
    if (totalLoss > 60) {
      return { present: true, confidence: 'high', detail: `Classic capsular pattern: ABD loss ${abdLoss}°, ER loss ${erLoss}°, Flex loss ${flexLoss}°, IR loss ${irLoss}°. Strongly suggestive of adhesive capsulitis.` };
    }
    return { present: true, confidence: 'moderate', detail: `Partial capsular pattern: ABD loss ${abdLoss}°, ER loss ${erLoss}°, Flex loss ${flexLoss}°. Consider early adhesive capsulitis or glenohumeral OA.` };
  }

  if (significantLoss && !capsularOrder) {
    return { present: false, confidence: 'moderate', detail: `Non-capsular restriction pattern. ROM losses present but don't follow capsular order. Consider: rotator cuff pathology, impingement, or acute inflammation.` };
  }

  return { present: false, confidence: 'high', detail: 'No capsular pattern detected. ROM within functional limits.' };
}

export function generateDifferentialScores(findings: AssessmentFindings): { diagnosis: DifferentialDiagnosis; score: number; supportingEvidence: string[]; refutingEvidence: string[] }[] {
  const results: { diagnosis: DifferentialDiagnosis; score: number; supportingEvidence: string[]; refutingEvidence: string[] }[] = [];

  for (const dx of SHOULDER_DIFFERENTIALS) {
    let score = 0;
    const supporting: string[] = [];
    const refuting: string[] = [];

    if (findings.history.onset) {
      const isTraumatic = findings.history.onset.includes('Traumatic');
      if (dx.onsetType === 'traumatic' && isTraumatic) { score += 10; supporting.push("Traumatic onset matches"); }
      else if (dx.onsetType === 'insidious' && !isTraumatic) { score += 10; supporting.push("Insidious onset matches"); }
      else if (dx.onsetType === 'both') { score += 5; }
      else { score -= 5; refuting.push(`Onset type (${findings.history.onset}) doesn't match typical presentation`); }
    }

    if (findings.history.location?.length) {
      const painLoc = findings.history.location;
      if (dx.painPattern.toLowerCase().includes('anterior') && painLoc.includes('Anterior shoulder')) { score += 8; supporting.push("Anterior pain location matches"); }
      if (dx.painPattern.toLowerCase().includes('lateral') && painLoc.includes('Lateral shoulder')) { score += 8; supporting.push("Lateral pain location matches"); }
      if (dx.painPattern.toLowerCase().includes('posterior') && painLoc.includes('Posterior shoulder')) { score += 8; supporting.push("Posterior pain location matches"); }
      if (dx.painPattern.toLowerCase().includes('ac joint') && painLoc.includes('Superior/AC joint')) { score += 10; supporting.push("Superior/AC joint pain matches"); }
      if (dx.painPattern.toLowerCase().includes('cervical') && painLoc.includes('Neck involvement')) { score += 10; supporting.push("Neck involvement supports cervical origin"); }
    }

    if (findings.history.nightPain) {
      const hasNightPain = !findings.history.nightPain.includes('None');
      if (hasNightPain && dx.keyFeatures.some(f => f.toLowerCase().includes('night pain'))) { score += 8; supporting.push("Night pain present - consistent"); }
    }

    if (findings.history.instability && dx.category === 'instability') { score += 15; supporting.push("History of instability"); }
    if (findings.history.clicking && dx.category === 'labral') { score += 10; supporting.push("Clicking/catching present"); }

    for (const [testName, result] of Object.entries(findings.specialTests)) {
      if (result === 'not_tested') continue;
      const cleanName = testName.replace('test_', '').replace(/_/g, ' ');
      const isSupporting = dx.supportingTests.some(st => {
        const stClean = st.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cnClean = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return stClean.includes(cnClean) || cnClean.includes(stClean);
      });

      if (isSupporting) {
        if (result === 'positive') {
          const test = SHOULDER_SPECIAL_TESTS.find(t => t.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')));
          const weight = test ? Math.min(test.positiveLR * 3, 25) : 10;
          score += weight;
          supporting.push(`${cleanName} positive (LR+ ${test?.positiveLR.toFixed(1) || '?'})`);
        } else if (result === 'negative') {
          const test = SHOULDER_SPECIAL_TESTS.find(t => t.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')));
          const weight = test ? Math.min((1 / Math.max(test.negativeLR, 0.05)) * 2, 15) : 5;
          score -= weight;
          refuting.push(`${cleanName} negative (LR- ${test?.negativeLR.toFixed(2) || '?'})`);
        }
      }
    }

    if (findings.observation.capsularPattern?.includes('Yes') && dx.category === 'adhesive_capsulitis') {
      score += 20;
      supporting.push("Capsular pattern present - hallmark of adhesive capsulitis");
    } else if (findings.observation.capsularPattern?.includes('Yes') && dx.category !== 'adhesive_capsulitis') {
      score -= 10;
      refuting.push("Capsular pattern present - more consistent with adhesive capsulitis");
    }

    if (findings.resistedTests.resistedAbduction?.includes('weakness') || findings.resistedTests.resistedAbduction?.includes('Weakness')) {
      if (dx.category === 'rotator_cuff') { score += 10; supporting.push("Supraspinatus weakness present"); }
    }
    if (findings.resistedTests.resistedER?.includes('weakness') || findings.resistedTests.resistedER?.includes('Weakness')) {
      if (dx.name.includes('Infraspinatus') || dx.name.includes('Rotator Cuff')) { score += 10; supporting.push("External rotation weakness present"); }
    }

    if (dx.prevalence === 'common') score += 5;
    else if (dx.prevalence === 'uncommon') score -= 3;

    results.push({ diagnosis: dx, score: Math.max(0, score), supportingEvidence: supporting, refutingEvidence: refuting });
  }

  results.sort((a, b) => b.score - a.score);

  const maxScore = results[0]?.score || 1;
  return results.map(r => ({ ...r, score: Math.round((r.score / maxScore) * 100) }));
}

export function buildShoulderAssessmentPrompt(findings: AssessmentFindings, kineticChainResults: any[], capsularAnalysis: any, differentialScores: any[]): string {
  let prompt = `[COMPREHENSIVE SHOULDER ASSESSMENT DATA]\n\n`;

  prompt += `## Subjective History\n`;
  for (const [key, value] of Object.entries(findings.history)) {
    if (value && (!Array.isArray(value) || value.length > 0)) {
      prompt += `- ${key}: ${Array.isArray(value) ? value.join(', ') : value}\n`;
    }
  }

  prompt += `\n## Active ROM (degrees)\n`;
  for (const [key, value] of Object.entries(findings.arom)) {
    const norm = SHOULDER_ROM_NORMS.find(n => n.configKey === key.replace('arom', '').charAt(0).toLowerCase() + key.replace('arom', '').slice(1));
    prompt += `- ${key}: ${value}° ${norm ? `(Normal: ${norm.normalRange[0]}-${norm.normalRange[1]}°)` : ''}\n`;
  }

  prompt += `\n## Passive ROM (degrees)\n`;
  for (const [key, value] of Object.entries(findings.prom)) {
    prompt += `- ${key}: ${value}°\n`;
  }

  prompt += `\n## Capsular Pattern Analysis\n`;
  prompt += `- Present: ${capsularAnalysis.present ? 'YES' : 'No'}\n`;
  prompt += `- Confidence: ${capsularAnalysis.confidence}\n`;
  prompt += `- Detail: ${capsularAnalysis.detail}\n`;

  prompt += `\n## Resisted Testing\n`;
  for (const [key, value] of Object.entries(findings.resistedTests)) {
    if (value) prompt += `- ${key}: ${value}\n`;
  }

  prompt += `\n## Special Tests\n`;
  const testedTests = Object.entries(findings.specialTests).filter(([_, v]) => v !== 'not_tested');
  for (const [key, value] of testedTests) {
    const testName = key.replace('test_', '').replace(/_/g, ' ');
    const testData = SHOULDER_SPECIAL_TESTS.find(t => t.name.replace(/[^a-zA-Z0-9]/g, '_') === key.replace('test_', ''));
    prompt += `- ${testName}: ${value}`;
    if (testData) prompt += ` (Sensitivity: ${(testData.sensitivity * 100).toFixed(0)}%, Specificity: ${(testData.specificity * 100).toFixed(0)}%, LR+: ${testData.positiveLR.toFixed(1)})`;
    prompt += `\n`;
  }

  prompt += `\n## Neurological Screen\n`;
  for (const [key, value] of Object.entries(findings.neurological)) {
    if (value) prompt += `- ${key}: ${value}\n`;
  }

  prompt += `\n## Kinetic Chain Analysis\n`;
  for (const result of kineticChainResults) {
    if (result.severity !== 'none') {
      prompt += `- ${result.region}: ${result.severity} involvement (${result.detail})\n`;
      prompt += `  Treatment implication: ${result.treatment}\n`;
    }
  }

  prompt += `\n## Pain Zones\n`;
  for (const zone of findings.painZones) {
    const zoneData = SHOULDER_PAIN_ZONES.find(z => z.id === zone);
    if (zoneData) {
      prompt += `- ${zoneData.name}: Structures at risk: ${zoneData.anatomicalStructures.join(', ')}\n`;
    }
  }

  prompt += `\n## Pre-computed Differential Diagnosis Rankings\n`;
  const topDx = differentialScores.slice(0, 5);
  for (const dx of topDx) {
    prompt += `\n### ${dx.diagnosis.name} (Score: ${dx.score}%, ICD-10: ${dx.diagnosis.icd10})\n`;
    prompt += `Supporting: ${dx.supportingEvidence.join('; ') || 'None'}\n`;
    prompt += `Refuting: ${dx.refutingEvidence.join('; ') || 'None'}\n`;
  }

  prompt += `\n## Instructions for AI\n`;
  prompt += `Based on this comprehensive assessment data, provide:\n`;
  prompt += `1. **Clinical Impression**: Your primary diagnosis with confidence level and clinical reasoning\n`;
  prompt += `2. **Differential Diagnosis**: Refined ranked list with percentages based on findings\n`;
  prompt += `3. **Kinetic Chain Summary**: How contributing factors from other regions influence the shoulder presentation\n`;
  prompt += `4. **Treatment Plan**: Phased rehabilitation plan (Phase 1: acute/protection, Phase 2: controlled motion, Phase 3: strengthening, Phase 4: return to function)\n`;
  prompt += `5. **Manual Therapy**: Specific techniques for identified dysfunctions\n`;
  prompt += `6. **Exercise Prescription**: Detailed exercises with dosage for each phase\n`;
  prompt += `7. **Prognosis**: Expected timeline and prognostic factors\n`;
  prompt += `8. **Outcome Measures**: Recommend SPADI/QuickDASH baseline and reassessment intervals\n`;
  prompt += `9. **Red Flags**: Any identified or outstanding safety concerns\n`;

  return prompt;
}
