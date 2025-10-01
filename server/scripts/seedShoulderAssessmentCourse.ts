import { db } from '../db';
import { courses, courseModules, type ModuleContent } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

async function seedShoulderAssessmentCourse() {
  console.log('🔗 Connecting to database:', process.env.DATABASE_URL?.split('@')[1] || 'unknown');
  console.log('🌱 Starting Shoulder Assessment course seeding...');

  try {
    // Verify database connection
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection verified successfully');

    // Get or create the user (using user ID 2 as default)
    const createdBy = 2;
    console.log(`✅ Using user ID ${createdBy} for course creation`);

    // First, find and delete existing Shoulder Assessment course if it exists
    const existing = await db.select().from(courses).where(eq(courses.title, 'Shoulder Assessment'));
    if (existing.length > 0) {
      console.log('🗑️  Deleting existing Shoulder Assessment course...');
      await db.delete(courses).where(eq(courses.id, existing[0].id));
    }

    // Create the Shoulder Assessment course
    console.log('📚 Creating Shoulder Assessment course...');
    const [course] = await db.insert(courses).values({
      title: 'Shoulder Assessment',
      description: 'Comprehensive clinical assessment of the shoulder complex including Jo Gibson\'s improvement tests, cervical screening, and differential diagnosis of all shoulder pathologies including neurological and complex conditions.',
      shortDescription: 'Master shoulder assessment from subjective history to differential diagnosis',
      difficulty: 'intermediate',
      estimatedHours: 4,
      status: 'published',
      bodyPart: 'shoulder',
      tags: ['shoulder', 'assessment', 'clinical examination', 'Jo Gibson', 'improvement tests', 'differential diagnosis'],
      learningObjectives: [
        'Perform comprehensive shoulder subjective history taking',
        'Apply Jo Gibson\'s shoulder improvement tests (SAT, SRT, ERRT, Short-to-Long Lever)',
        'Screen for cervical contribution to shoulder pain',
        'Execute all essential shoulder special tests',
        'Differentiate between 30+ shoulder pathologies including neurological conditions',
        'Synthesize clinical findings into accurate diagnoses'
      ],
      prerequisites: ['Basic anatomy knowledge', 'Understanding of musculoskeletal examination principles'],
      createdBy,
      isPublic: true,
      price: 0,
    }).returning();

    console.log(`✅ Created course: ${course.title} (ID: ${course.id})`);

    // Define all 11 modules with comprehensive content
    const modules = [
      // MODULE 1
      {
        title: 'Subjective History',
        description: 'Learn to gather comprehensive patient history and identify red flags',
        estimatedDuration: 15,
        orderIndex: 1,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Pain Location Mapping',
              content: `Understanding where the patient feels pain is crucial for differential diagnosis:

**Anterior Shoulder Pain:**
- Biceps tendinopathy
- Subscapularis tears
- AC joint pathology
- Glenohumeral joint issues

**Superior/Top Shoulder Pain:**
- AC joint pathology
- Referred cervical pain (C4-C5)
- Suprascapular nerve entrapment

**Lateral Shoulder Pain:**
- Rotator cuff pathology
- Subacromial impingement
- Deltoid strain

**Posterior Shoulder Pain:**
- Infraspinatus/teres minor issues
- Labral tears
- Referred thoracic spine pain

**Diffuse/Vague Pain:**
- Adhesive capsulitis
- Neurological conditions (Parsonage-Turner)
- Referred visceral pain`
            },
            {
              type: 'text' as const,
              title: 'Mechanism of Injury',
              content: `**Acute Traumatic Onset:**
- Fall on outstretched hand (FOOSH) → AC joint, clavicle fracture, labral tear
- Direct blow → Contusion, AC separation
- Sudden overhead force → Rotator cuff tear, dislocation

**Insidious Onset:**
- Gradual development → Tendinopathy, impingement, adhesive capsulitis
- Sudden severe pain without trauma → Parsonage-Turner syndrome, calcific tendinitis

**Repetitive Microtrauma:**
- Overhead activities → Impingement, SLAP tears
- Throwing sports → Internal impingement, labral tears`
            },
            {
              type: 'text' as const,
              title: 'Aggravating Factors',
              content: `**Key Questions:**

**Overhead Activities:**
- Reaching up → Impingement
- Lifting → Rotator cuff weakness
- Throwing → Labral pathology

**Sleeping Position:**
- Cannot lie on affected side → Rotator cuff, bursitis
- Night pain waking from sleep → Red flag for serious pathology, adhesive capsulitis

**Hand Behind Back:**
- Difficulty with bra strap, back pocket → Internal rotation restriction (adhesive capsulitis, subscapularis)

**Carrying/Lifting:**
- Heavy bags → AC joint, rotator cuff
- Sustained positions → Postural dysfunction`
            },
            {
              type: 'text' as const,
              title: 'Red Flags Screening',
              content: `**IMMEDIATE REFERRAL INDICATORS:**

🚩 **Severe Night Pain** (unrelieved by position)
- Tumor, infection, severe inflammatory condition

🚩 **Unexplained Weight Loss**
- Malignancy concern

🚩 **Fever, Chills, Systemic Unwellness**
- Infection (septic arthritis)

🚩 **Recent Surgery or Injection**
- SIRVA, infection risk

🚩 **History of Cancer**
- Metastatic disease to shoulder

🚩 **Acute Neurological Symptoms**
- Rapid muscle atrophy
- Severe unexplained weakness
- Sensory loss

🚩 **Trauma with Severe Pain**
- Fracture, dislocation

🚩 **Vascular Symptoms**
- Color changes, temperature differences
- Thoracic outlet syndrome`
            },
            {
              type: 'quiz' as const,
              title: 'Knowledge Check',
              quizQuestions: [
                {
                  question: 'A patient reports severe night pain that wakes them from sleep and is unrelieved by position changes. What is your primary concern?',
                  options: ['Normal rotator cuff pathology', 'Adhesive capsulitis', 'Red flag - requires immediate referral', 'Subacromial bursitis'],
                  correctAnswer: 'Red flag - requires immediate referral',
                  explanation: 'Severe unrelenting night pain is a red flag that may indicate tumor, infection, or severe inflammatory condition requiring immediate medical evaluation.'
                },
                {
                  question: 'Superior shoulder pain in the absence of trauma is most commonly referred from which cervical level?',
                  options: ['C3-C4', 'C4-C5', 'C6-C7', 'C7-T1'],
                  correctAnswer: 'C4-C5',
                  explanation: 'C4-C5 nerve roots commonly refer pain to the superior aspect of the shoulder, making cervical screening essential.'
                }
              ]
            }
          ]
        } as ModuleContent
      },
      
      // MODULE 2
      {
        title: 'Observation & Posture',
        description: 'Visual assessment of shoulder posture and positioning',
        estimatedDuration: 10,
        orderIndex: 2,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Anterior View Assessment',
              content: `**Key Observations:**

**Shoulder Height:**
- Elevated shoulder → Upper trap spasm, SC joint pathology
- Depressed shoulder → Long thoracic nerve palsy, neurological injury

**AC Joint:**
- Prominent/step deformity → AC separation (Grade 2-3)
- Swelling → Acute AC joint sprain

**Muscle Bulk:**
- Deltoid atrophy → Axillary nerve injury, disuse
- Pectoral bulk asymmetry → Pec major tear, chronic weakness

**Clavicle:**
- Deformity → Previous fracture
- "Piano key" sign → AC separation`
            },
            {
              type: 'text' as const,
              title: 'Posterior View Assessment',
              content: `**Scapular Position (SICK Scapula):**
- **S**capular malposition (inferior angle prominence)
- **I**nferior medial border prominence  
- **C**oracoid pain/tenderness
- **K**inetic scapular dyskinesis

**Scapular Winging:**
- Medial border prominence at rest → Serratus anterior weakness (long thoracic nerve)
- Winging with wall push-up → Confirms serratus weakness
- Lateral border winging → Trapezius weakness (spinal accessory nerve)

**Muscle Atrophy:**
- Supraspinatus fossa atrophy → Chronic rotator cuff tear, suprascapular nerve
- Infraspinatus fossa atrophy → Chronic rotator cuff tear, suprascapular nerve, Parsonage-Turner
- Generalized atrophy → Severe disuse, neurological condition`
            },
            {
              type: 'text' as const,
              title: 'Lateral View Assessment',
              content: `**Postural Alignment:**

**Forward Head Posture:**
- Increases thoracic kyphosis
- Alters scapular positioning
- Contributes to impingement

**Rounded Shoulders:**
- Protracted scapulae
- Internally rotated humerus
- Shortens pectoralis muscles
- Weakens posterior shoulder

**Thoracic Kyphosis:**
- Reduces available subacromial space
- Affects scapular mechanics`
            },
            {
              type: '3d_scanner' as const,
              title: 'Interactive 3D Posture Analysis',
              content: 'Use the Body Scanner to visualize normal vs. abnormal shoulder posture and identify key postural deviations.',
              interactiveType: '3d_model',
              interactiveData: {
                focus: 'shoulder',
                features: ['scapular_position', 'thoracic_curve', 'clavicle_alignment']
              }
            }
          ]
        } as ModuleContent
      },

      // MODULE 3
      {
        title: 'Active ROM Testing',
        description: 'Assessment of active shoulder range of motion and movement quality',
        estimatedDuration: 15,
        orderIndex: 3,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Shoulder Flexion Assessment',
              content: `**Normal Range:** 170-180°

**Testing Position:**
- Standing, arms at sides
- Ask patient to raise arm forward and up overhead

**Key Observations:**
- **Painful Arc (60-120°):** Subacromial impingement, rotator cuff pathology
- **Limited ROM:** Adhesive capsulitis, severe rotator cuff tear, pain inhibition
- **Scapular Rhythm:** Watch for excessive scapular movement early in range
- **Compensation:** Trunk lean, shoulder elevation

**Clinical Significance:**
- Pain at end range → Capsular restriction, AC joint
- Pain mid-range → Impingement, rotator cuff
- Weakness without pain → Nerve injury, massive tear`
            },
            {
              type: 'text' as const,
              title: 'Shoulder Abduction & Painful Arc',
              content: `**Normal Range:** 170-180°

**Painful Arc Identification:**

**60-120° Pain (Classic):**
- Subacromial impingement
- Rotator cuff tendinopathy
- Subacromial bursitis

**120-180° Pain:**
- AC joint pathology
- Superior labral involvement

**0-60° Pain:**
- Severe rotator cuff tear
- Acute bursitis
- Adhesive capsulitis (early stage)

**Scapulohumeral Rhythm:**
- Normal: 2:1 ratio (120° GH joint : 60° scapular rotation)
- Abnormal early scapular movement → Rotator cuff weakness
- Excessive scapular winging → Serratus weakness`
            },
            {
              type: 'text' as const,
              title: 'Internal & External Rotation',
              content: `**External Rotation Testing:**

**At Side (Neutral):** Normal 60-90°
- Limited ER → Adhesive capsulitis (capsular pattern)
- Pain with resistance → Infraspinatus/teres minor pathology

**At 90° Abduction:** Normal 90°
- Limited → Posterior capsule tightness, adhesive capsulitis
- Pain → Rotator cuff, internal impingement

**Internal Rotation Testing:**

**At Side:** Normal 70-90°
**Hand Behind Back (Apley's):** Should reach T7-T10
- Limited → Adhesive capsulitis, subscapularis tightness
- Pain → Subscapularis pathology

**At 90° Abduction:** Normal 70°
- Limited → Anterior capsule tightness

**Capsular Pattern Recognition:**
- ER > Abduction > IR limitation = Adhesive capsulitis`
            },
            {
              type: 'video' as const,
              videoUrl: 'https://www.youtube.com/embed/shoulder-rom-assessment',
              videoDescription: 'Demonstration of proper active ROM testing technique for all shoulder movements',
              content: 'Watch this video demonstration of proper patient positioning and movement cues for shoulder ROM assessment.'
            },
            {
              type: 'quiz' as const,
              title: 'ROM Assessment Quiz',
              quizQuestions: [
                {
                  question: 'A patient has pain specifically between 60-120° of shoulder abduction. What is the most likely pathology?',
                  options: ['AC joint pathology', 'Subacromial impingement', 'Adhesive capsulitis', 'Labral tear'],
                  correctAnswer: 'Subacromial impingement',
                  explanation: 'The 60-120° painful arc is classic for subacromial impingement syndrome as the greater tuberosity passes under the acromion during this range.'
                },
                {
                  question: 'What is the capsular pattern for adhesive capsulitis?',
                  options: ['IR > ER > Abduction', 'ER > Abduction > IR', 'Abduction > ER > IR', 'ER > IR > Abduction'],
                  correctAnswer: 'ER > Abduction > IR',
                  explanation: 'Adhesive capsulitis presents with external rotation being most limited, followed by abduction, then internal rotation (ER > Abd > IR).'
                }
              ]
            }
          ]
        } as ModuleContent
      },

      // MODULE 4
      {
        title: 'Cervical Screening & Neck Improvement Tests',
        description: 'Rule out cervical spine contribution to shoulder pain',
        estimatedDuration: 20,
        orderIndex: 4,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Why Screen the Cervical Spine?',
              content: `**Referred Pain Patterns:**

The cervical spine can refer pain to the shoulder region, mimicking local shoulder pathology. Failure to identify cervical contribution leads to ineffective treatment.

**Common Referral Patterns:**
- **C4-C5:** Superior shoulder, upper trapezius
- **C5-C6:** Lateral shoulder, deltoid region
- **C6-C7:** Anterior shoulder, lateral arm
- **C7-T1:** Medial scapula, posterior shoulder

**Red Flags for Cervical Origin:**
- Neck pain accompanying shoulder pain
- Symptoms change with neck position
- Bilateral shoulder symptoms
- Neurological signs (numbness, tingling, weakness)`
            },
            {
              type: 'text' as const,
              title: 'Cervical Active ROM Assessment',
              content: `**Test All 6 Movements:**

**Flexion:**
- Chin to chest
- Look for reproduction of shoulder symptoms

**Extension:**
- Look up to ceiling
- Note: May provoke shoulder pain via cervical radiculopathy

**Rotation (Left & Right):**
- Turn head 70-90° to each side
- Does rotation reproduce shoulder pain?

**Lateral Flexion (Left & Right):**
- Ear toward shoulder
- Ipsilateral pain → Muscle/joint
- Contralateral pain → Nerve root compression

**Clinical Interpretation:**
If ANY cervical movement reproduces the shoulder pain → Cervical contribution likely`
            },
            {
              type: 'text' as const,
              title: "Spurling's Test - Radiculopathy Screening",
              content: `**Test Procedure:**
1. Patient seated
2. Extend and rotate neck to affected side
3. Apply gentle downward compression through head
4. Hold 10-15 seconds

**Positive Test:**
- Reproduction of arm/shoulder pain
- Radicular symptoms (shooting, tingling)
- Pain in dermatomal distribution

**Clinical Significance:**
- High specificity (90%+) for cervical radiculopathy
- Positive = cervical nerve root involvement
- Shoulder treatment alone will not resolve symptoms

**Safety Note:**
- Never perform with force
- Stop immediately if symptoms severe
- Contraindicated: Known cervical instability, myelopathy signs`
            },
            {
              type: 'text' as const,
              title: 'Upper Limb Neurodynamic Tests (ULNT)',
              content: `**ULNT1 (Median Nerve Bias):**
- Scapular depression
- Shoulder abduction 110°
- Forearm supination
- Wrist/finger extension
- Elbow extension
- Cervical side flexion away

**Positive:** Reproduces symptoms, changes with neck position

**ULNT2 (Radial Nerve Bias):**
- Scapular depression
- Shoulder abduction 10°
- Elbow extension
- IR of shoulder
- Forearm pronation
- Wrist/finger flexion
- Cervical side flexion away

**ULNT3 (Ulnar Nerve Bias):**
- Scapular depression
- Shoulder abduction 90°
- ER of shoulder
- Forearm supination
- Wrist/finger extension
- Elbow flexion
- Cervical side flexion away

**Interpretation:**
- Positive ULNT indicates neurodynamic dysfunction
- Must differentiate from musculoskeletal stretch`
            },
            {
              type: 'text' as const,
              title: 'Neck Improvement Tests',
              content: `**Core Principle:**
Does changing cervical spine position improve shoulder symptoms?

**Test 1: Cervical Rotation with Shoulder Movement**
1. Patient performs painful shoulder movement (e.g., abduction)
2. Note pain level (0-10)
3. Patient rotates neck AWAY from affected shoulder
4. Repeat shoulder movement
5. Is pain reduced?

**Positive:** Pain improves → Cervical component

**Test 2: Cervical Position During Shoulder Testing**
- Perform painful shoulder test (e.g., empty can)
- Repeat with neck in flexion
- Repeat with neck in extension
- Does position change symptoms?

**Clinical Reasoning:**
- If cervical position IMPROVES shoulder pain → Treat cervical spine
- If no change → Pure shoulder pathology more likely
- Can have BOTH cervical and shoulder pathology

**Treatment Implications:**
- Positive neck tests → Include cervical treatment
- May need to address cervical mechanics before shoulder rehab effective`
            },
            {
              type: 'video' as const,
              videoUrl: 'https://www.youtube.com/embed/cervical-screening-tests',
              videoDescription: 'Complete demonstration of cervical screening and neck improvement tests',
              content: 'Watch proper technique for cervical ROM, Spurling\'s test, ULNT, and neck improvement testing.'
            }
          ]
        } as ModuleContent
      },

      // MODULE 5
      {
        title: 'Shoulder Improvement Tests - Jo Gibson Method',
        description: 'Identify modifiable impairments using evidence-based improvement tests',
        estimatedDuration: 20,
        orderIndex: 5,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Core Concept: Why Improvement Tests?',
              content: `**The Jo Gibson Philosophy:**

Traditional shoulder assessment focuses on identifying pathology. Improvement tests go further by identifying **which impairments are modifiable** and **which treatment will work**.

**Key Principle:**
If a manual correction or positional change IMMEDIATELY improves symptoms, it indicates:
1. The impairment is contributing to the problem
2. Treatment targeting that impairment will likely be effective
3. The condition is NOT purely structural

**Clinical Significance:**
- Guides treatment prioritization
- Predicts treatment response
- Differentiates functional vs. structural pathology
- Empowers patients with immediate improvement

**The 4 Essential Tests:**
1. Scapular Assistance Test (SAT)
2. Scapular Retraction Test (SRT)
3. External Rotation Resistance Test (ERRT)
4. Short Lever to Long Lever Test`
            },
            {
              type: 'text' as const,
              title: '1. Scapular Assistance Test (SAT)',
              content: `**Purpose:**
Tests if scapular dyskinesis/poor upward rotation contributes to symptoms

**Procedure:**
1. Patient performs painful movement (e.g., arm elevation)
2. Note pain level and range achieved
3. Therapist manually assists scapular upward rotation during movement:
   - Hands on inferior angle and medial border
   - Gently guide scapula into upward rotation
   - Maintain position through full range
4. Patient repeats movement with assistance
5. Compare pain and range

**Positive Test:**
- Pain decreases (≥2/10 reduction)
- Range increases
- Movement feels easier

**Clinical Interpretation:**
✅ **Positive SAT** = Scapular control deficit contributing
- Treatment focus: Scapular stabilization exercises
- Strengthen lower trapezius, serratus anterior
- Motor control retraining

**Common in:**
- Shoulder impingement
- Rotator cuff pathology
- Post-surgical shoulders
- Overhead athletes`
            },
            {
              type: 'text' as const,
              title: '2. Scapular Retraction Test (SRT)',
              content: `**Purpose:**
Tests if scapular positioning/motor control affects symptoms

**Procedure:**
1. Patient performs painful movement
2. Note pain level
3. Cue patient to "squeeze shoulder blades together" (retract scapulae)
4. Patient performs movement while maintaining retraction
5. Compare symptoms

**Alternative Method:**
- Therapist provides tactile cue on medial border
- "Hold your shoulder blade here" during movement

**Positive Test:**
- Immediate pain reduction
- Improved movement quality
- Patient reports "feels better"

**Clinical Interpretation:**
✅ **Positive SRT** = Motor control/positioning problem
- Treatment: Postural correction
- Scapular positioning retraining
- Middle/lower trap strengthening
- May benefit from taping to facilitate position

**Common in:**
- Chronic shoulder pain
- Poor posture
- Desk workers
- Swimmers, throwing athletes`
            },
            {
              type: 'text' as const,
              title: '3. External Rotation Resistance Test (ERRT / Pressure Test)',
              content: `**Purpose:**
Tests if improving humeral head centering reduces symptoms

**Procedure:**
1. Patient performs painful elevation movement
2. Note pain and range
3. Therapist applies gentle external rotation force during movement:
   - Hand on distal humerus/elbow
   - Light pressure into external rotation
   - Maintains pressure throughout elevation
4. Compare symptoms

**Biomechanical Rationale:**
- ER improves humeral head centering in glenoid
- Reduces superior migration
- Decreases subacromial impingement
- Optimizes rotator cuff activation

**Positive Test:**
- Pain reduction during movement
- Increased range
- Smoother movement pattern

**Clinical Interpretation:**
✅ **Positive ERRT** = Poor humeral head control
- Treatment: External rotator strengthening (infraspinatus, teres minor)
- Posterior cuff activation
- Rotator cuff force couple training
- May need to address internal rotator tightness (subscapularis, pec major)

**Common in:**
- Subacromial impingement
- Rotator cuff weakness
- Anterior instability
- Overhead athletes`
            },
            {
              type: 'text' as const,
              title: '4. Short Lever to Long Lever Test',
              content: `**Purpose:**
Tests load tolerance and identifies optimal starting position for rehab

**Procedure:**
1. Patient elevates arm with BENT ELBOW (short lever)
   - Elbow flexed 90°
   - Reduces torque on shoulder
2. Note if pain-free or painful
3. If pain-free, progress to STRAIGHT ARM elevation (long lever)
4. Compare symptoms

**Lever Arm Physics:**
- Short lever = Less rotational torque
- Long lever = Greater load on shoulder
- Tests ability to handle increasing load

**Interpretation:**

**Pain-free SHORT lever, painful LONG lever:**
✅ Positive test = Load tolerance issue
- Start exercises with bent elbow position
- Progressive loading strategy
- Gradual straightening of elbow
- Indicates good prognosis

**Painful BOTH positions:**
- More irritable condition
- May need further load reduction (gravity-eliminated)
- Consider additional support

**Pain-free BOTH positions:**
- Negative test (but still valuable info)
- Can proceed with full range exercises
- Load is not limiting factor

**Clinical Application:**
- Guides exercise prescription
- Helps set appropriate starting point
- Prevents symptom aggravation
- Shows patient tangible progression path`
            },
            {
              type: 'text' as const,
              title: 'Clinical Decision Making with Improvement Tests',
              content: `**Interpreting Multiple Positive Tests:**

**SAT + SRT Positive:**
- Strong scapular control deficit
- Prioritize scapular stabilization
- Address posture
- Both motor control AND positioning issues

**ERRT + SAT Positive:**
- Combined rotator cuff AND scapular problem
- Address both components
- Integrated strengthening program

**All 4 Tests Positive:**
- Multiple modifiable impairments
- Excellent prognosis - lots to work with!
- Start with easiest/most impactful
- Address components systematically

**All Tests Negative:**
- More structural pathology likely
- May need passive mobilization first
- Consider imaging
- Rule out adhesive capsulitis, labral tear
- Could be nerve-related (check cervical)

**Treatment Prioritization:**
1. Start with test showing greatest improvement
2. Address components in order of impact
3. Re-test regularly to track progress
4. Negative test becoming positive = good sign (structure less limiting)

**Patient Education Value:**
- Immediate improvement is powerful motivator
- Shows problem is "fixable"
- Provides clear treatment rationale
- Builds patient confidence in exercises`
            },
            {
              type: 'video' as const,
              videoUrl: 'https://www.youtube.com/embed/jo-gibson-improvement-tests',
              videoDescription: 'Complete demonstration of all 4 Jo Gibson improvement tests with clinical reasoning',
              content: 'Watch step-by-step technique for SAT, SRT, ERRT, and Short-to-Long Lever tests.'
            },
            {
              type: 'quiz' as const,
              title: 'Improvement Tests Knowledge Check',
              quizQuestions: [
                {
                  question: 'A patient has significant pain reduction when you manually assist scapular upward rotation during arm elevation. What does this indicate?',
                  options: [
                    'Rotator cuff tear requiring surgery',
                    'Scapular control deficit that should respond to strengthening',
                    'Cervical radiculopathy',
                    'Labral tear'
                  ],
                  correctAnswer: 'Scapular control deficit that should respond to strengthening',
                  explanation: 'A positive SAT indicates that scapular dyskinesis is contributing to symptoms and that treatment focused on scapular stabilization will likely be effective.'
                },
                {
                  question: 'If a patient can elevate their arm pain-free with a bent elbow but has pain with a straight arm, what should be your initial exercise approach?',
                  options: [
                    'Avoid all shoulder elevation exercises',
                    'Start with straight arm exercises to build strength',
                    'Begin with bent elbow exercises and gradually progress',
                    'Focus only on pendulum exercises'
                  ],
                  correctAnswer: 'Begin with bent elbow exercises and gradually progress',
                  explanation: 'A positive short-to-long lever test indicates load tolerance issues. Starting with reduced load (bent elbow) and gradually progressing allows symptom-free strengthening.'
                },
                {
                  question: 'What is the primary clinical value of improvement tests compared to traditional special tests?',
                  options: [
                    'They diagnose specific structural pathology',
                    'They identify modifiable impairments and guide treatment',
                    'They have higher sensitivity than MRI',
                    'They replace the need for ROM assessment'
                  ],
                  correctAnswer: 'They identify modifiable impairments and guide treatment',
                  explanation: 'Improvement tests go beyond diagnosis to identify which impairments can be modified with treatment and predict which interventions will be effective.'
                }
              ]
            }
          ]
        } as ModuleContent
      },

      // MODULE 6
      {
        title: 'Passive ROM & End-Feel',
        description: 'Assess passive range and identify tissue restrictions',
        estimatedDuration: 15,
        orderIndex: 6,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Passive ROM Assessment Principles',
              content: `**Purpose:**
- Differentiate contractile vs. non-contractile tissue
- Assess capsular restriction
- Identify end-feel characteristics

**Key Comparisons:**

**Active ROM < Passive ROM:**
- Suggests contractile tissue problem (muscle/tendon weakness, pain inhibition)

**Active ROM = Passive ROM (both limited):**
- Suggests capsular restriction, adhesive capsulitis

**Pain with ACTIVE but not PASSIVE:**
- Contractile tissue pathology (tendon, muscle)

**Pain with PASSIVE but not ACTIVE:**
- Non-contractile tissue (ligament, capsule, bursa, nerve)`
            },
            {
              type: 'text' as const,
              title: 'End-Feel Classification',
              content: `**Normal End-Feels:**

**Soft/Tissue Approximation:**
- Example: Elbow flexion (muscle belly contact)
- Feel: Soft, gradual stop

**Capsular:**
- Example: Shoulder external rotation
- Feel: Firm, leathery, slight give

**Bone-to-Bone:**
- Example: Elbow extension
- Feel: Hard, abrupt stop

**Abnormal End-Feels:**

**Empty:**
- No mechanical end-feel, stopped by severe pain
- Clinical significance: Serious pathology, bursitis, fracture, tumor
- ⚠️ RED FLAG - Further investigation needed

**Springy Block:**
- Rebound sensation
- Clinical significance: Loose body, torn meniscus (knee), labral tear (shoulder)

**Muscle Spasm:**
- Hard, sudden stop with muscle contraction
- Clinical significance: Muscle guarding, acute injury, protective spasm

**Capsular (Abnormal):**
- Premature capsular restriction
- Clinical significance: Adhesive capsulitis, chronic inflammation`
            },
            {
              type: 'text' as const,
              title: 'Capsular Pattern - Adhesive Capsulitis',
              content: `**Definition:**
A characteristic pattern of motion restriction that occurs with capsular involvement

**Shoulder Capsular Pattern:**
External Rotation > Abduction > Internal Rotation
(ER most limited, IR least limited)

**Clinical Significance:**
- Highly suggestive of adhesive capsulitis (frozen shoulder)
- Also seen in: Osteoarthritis, chronic inflammation

**Assessment:**
1. Measure passive ER at side: Should be 60-90°
2. Measure passive abduction: Should be 170-180°
3. Measure passive IR: Should be 70-90°

**Adhesive Capsulitis Presentation:**
- ER: 0-30° (severely limited)
- Abduction: 60-100° (moderately limited)
- IR: 40-60° (mildly limited)

**Stages of Adhesive Capsulitis:**
1. **Painful (Freezing):** Increasing pain, decreasing ROM
2. **Stiff (Frozen):** Less pain, maximally restricted ROM
3. **Thawing:** Pain resolving, gradual ROM improvement`
            },
            {
              type: 'text' as const,
              title: 'Quadrant Test',
              content: `**Purpose:**
Screen for labral pathology, capsular restriction, or impingement

**Procedure:**
1. Patient supine
2. Shoulder abducted 90° and ER to available range
3. Gradually elevate arm in arc toward overhead position
4. Maintain external rotation throughout
5. Apply gentle overpressure at end range

**Positive Test:**
- Pain reproduction
- Clicking/clunking
- Apprehension

**Clinical Significance:**
- Labral tears (especially SLAP)
- Posterior capsule tightness
- Impingement
- Instability

**Quadrants Assessed:**
- Lower quadrant (starting position): Anterior capsule, subscapularis
- Mid quadrant: Subacromial space, rotator cuff
- Upper quadrant: Superior labrum, biceps anchor`
            },
            {
              type: 'video' as const,
              videoUrl: 'https://www.youtube.com/embed/passive-rom-endfeel',
              videoDescription: 'Demonstration of passive ROM testing and end-feel assessment',
              content: 'Learn proper hand placement and technique for assessing passive shoulder ROM and identifying different end-feels.'
            }
          ]
        } as ModuleContent
      },

      // MODULE 7
      {
        title: 'Strength Testing',
        description: 'Manual muscle testing of rotator cuff and scapular stabilizers',
        estimatedDuration: 20,
        orderIndex: 7,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Manual Muscle Testing Grading (0-5 Scale)',
              content: `**Grading System:**

**5/5 - Normal:**
- Full ROM against maximal resistance
- No weakness detected

**4/5 - Good:**
- Full ROM against moderate resistance
- Some weakness but functional

**3/5 - Fair:**
- Full ROM against gravity only
- Cannot tolerate resistance

**2/5 - Poor:**
- Full ROM with gravity eliminated
- Cannot move against gravity

**1/5 - Trace:**
- Muscle contraction palpable
- No joint movement

**0/5 - Zero:**
- No muscle contraction detected

**Clinical Notes:**
- 3/5 or below = Significant weakness requiring further investigation
- Sudden "give" with pain = Pain inhibition vs. true weakness
- Painless weakness = Neurological concern (nerve injury, tear)`
            },
            {
              type: 'text' as const,
              title: 'Supraspinatus Testing',
              content: `**Empty Can Test (Jobe's Test):**

**Position:**
- Standing
- Arm in scaption plane (30° anterior to coronal plane)
- 90° elevation
- Thumb pointing down (IR)
- "Pour out a can"

**Procedure:**
- Apply downward resistance
- Patient resists

**Positive Test:**
- Weakness compared to opposite side
- Pain during testing
- Unable to hold position

**Full Can Test (Alternative):**
- Same position but thumb UP (ER)
- May be less painful
- Better rotator cuff isolation

**Clinical Interpretation:**
- Weakness + Pain = Tendinopathy, partial tear
- Weakness, no pain = Full-thickness tear, suprascapular nerve injury
- Pain, no weakness = Early tendinopathy, bursitis`
            },
            {
              type: 'text' as const,
              title: 'Infraspinatus & Teres Minor Testing',
              content: `**External Rotation Strength Test:**

**Position 1: At Side (ER at 0°)**
- Elbow flexed 90° at side
- Forearm neutral
- Apply IR force at wrist
- Patient resists

**Normal:** Should resist firm pressure

**Position 2: At 90° Abduction (ER in abduction)**
- Shoulder abducted 90°
- Elbow flexed 90°
- Forearm vertical
- Apply IR force
- Patient resists

**Hornblower's Sign:**
- Cannot maintain ER at 90° abduction
- Arm "falls" into IR
- Positive = Teres minor weakness/tear

**Clinical Significance:**
- Isolated ER weakness → Infraspinatus/teres minor pathology
- With atrophy → Chronic tear, suprascapular nerve entrapment
- Hornblower's sign → Teres minor involvement, posterosuperior tear`
            },
            {
              type: 'text' as const,
              title: 'Subscapularis Testing',
              content: `**Lift-Off Test (Gerber's Test):**

**Position:**
- Hand behind back at waist level
- Palm facing away from back

**Procedure:**
- Patient lifts hand away from back (internal rotation)
- Apply resistance

**Positive Test:**
- Cannot lift hand off back
- Pain with attempt

**Belly Press Test:**
- Hand on belly, elbow forward
- Press hand into belly maintaining elbow position
- Elbow should stay anterior to trunk

**Positive:** Elbow drops back

**Bear Hug Test:**
- Hand on opposite shoulder
- Elbow forward
- Patient resists pulling hand away

**Positive:** Cannot maintain position

**Clinical Interpretation:**
- All three positive = Subscapularis tear
- Pain only = Tendinopathy
- Painless weakness = Complete tear`
            },
            {
              type: 'text' as const,
              title: 'Scapular Stabilizer Testing',
              content: `**Lower Trapezius Testing:**

**Position:**
- Prone
- Arm elevated 145° (in line with lower trap fibers)
- Thumb up
- Patient lifts arm off table
- Apply downward resistance

**Weakness Indication:**
- Cannot lift arm
- Scapular winging
- Poor endurance

**Serratus Anterior Testing:**

**Wall Push-Up Test:**
- Patient performs push-up against wall
- Observe scapulae

**Positive:** Medial border winging

**Scapular Protraction Test:**
- Supine
- Arm vertical (90° flexion)
- Patient "punches" toward ceiling
- Apply resistance backward

**Middle Trapezius Testing:**
- Prone
- Arm 90° abduction
- Horizontal abduction with ER
- Apply resistance

**Clinical Significance:**
- Weak scapular stabilizers = Compensatory patterns
- Common in overhead athletes
- Contributes to impingement, instability`
            },
            {
              type: 'video' as const,
              videoUrl: 'https://www.youtube.com/embed/shoulder-strength-testing',
              videoDescription: 'Complete demonstration of rotator cuff and scapular stabilizer strength testing',
              content: 'Watch proper technique for all strength tests including hand placement and grading criteria.'
            }
          ]
        } as ModuleContent
      },

      // MODULE 8
      {
        title: 'Special Tests - Comprehensive',
        description: 'Evidence-based special tests organized by pathology',
        estimatedDuration: 30,
        orderIndex: 8,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Understanding Sensitivity vs. Specificity',
              content: `**Before Learning Special Tests:**

**Sensitivity:**
- Ability to correctly identify people WITH the condition
- High sensitivity = Good at ruling OUT (negative test = likely don't have it)
- "SNOUT" - Sensitive test, Negative result, rules OUT

**Specificity:**
- Ability to correctly identify people WITHOUT the condition
- High specificity = Good at ruling IN (positive test = likely have it)
- "SPIN" - Specific test, Positive result, rules IN

**Clinical Application:**
- Use SENSITIVE tests for screening
- Use SPECIFIC tests for confirmation
- Combine multiple tests for best accuracy
- No single test is definitive - clinical reasoning essential`
            },
            {
              type: 'text' as const,
              title: 'Impingement Tests',
              content: `**Neer's Impingement Test:**

**Procedure:**
- Therapist stabilizes scapula
- Passively elevate arm in scapular plane with IR
- Reproduces pain by compressing subacromial structures

**Positive:** Pain during elevation
**Sensitivity:** 79% | **Specificity:** 53%

---

**Hawkins-Kennedy Test:**

**Procedure:**
- Shoulder 90° flexion
- Elbow 90° flexion
- Passively IR forearm (horizontal adduction)
- Compresses supraspinatus under coracoacromial ligament

**Positive:** Pain with IR
**Sensitivity:** 79% | **Specificity:** 59%

---

**Clinical Interpretation:**
- Both tests positive = Higher likelihood of impingement
- Consider in context of painful arc
- Does NOT differentiate impingement from rotator cuff tear
- Positive tests support clinical picture, not diagnostic alone`
            },
            {
              type: 'text' as const,
              title: 'Rotator Cuff Tear Tests',
              content: `**Drop Arm Test:**

**Procedure:**
- Passively abduct arm to 90°
- Patient slowly lowers arm to side

**Positive:** Arm drops suddenly or has severe pain
**Sensitivity:** 21% (poor) | **Specificity:** 92% (excellent)
**Interpretation:** Positive = likely full-thickness tear

---

**External Rotation Lag Sign:**

**Procedure:**
- Patient seated, arm at side
- Therapist passively ER shoulder maximally
- Patient holds position while therapist releases
- Observe if arm "lags" back into IR

**Positive:** Cannot maintain ER, arm lags >5°
**Sensitivity:** 70% | **Specificity:** 100%
**Interpretation:** High specificity for full-thickness tear

---

**Internal Rotation Lag Sign (Spring-Back/Lift-Off):**

**Procedure:**
- Hand behind back
- Therapist lifts hand away from back (passively IRs)
- Patient holds position
- Release hand

**Positive:** Hand springs back to lumbar spine
**Interpretation:** Subscapularis full-thickness tear

---

**Infraspinatus Strength Test:**
- Resisted ER at 0° abduction
- Compare sides
- Grade weakness (0-5)

**Weakness + Atrophy = Chronic tear or nerve injury**`
            },
            {
              type: 'text' as const,
              title: 'Instability Tests',
              content: `**Apprehension Test:**

**Procedure:**
- Supine or sitting
- Shoulder 90° abduction, 90° ER
- Apply gentle ER overpressure

**Positive:** 
- Patient apprehension (feels shoulder will dislocate)
- Guarding, anxiety response

**Sensitivity:** 72% | **Specificity:** 96%

---

**Relocation Test (Jobe's):**

**Procedure:**
- Perform apprehension test
- Apply posterior force on humeral head
- Reapply ER pressure

**Positive:** Apprehension relieved with posterior force
**Interpretation:** Confirms anterior instability

---

**Sulcus Sign:**

**Procedure:**
- Patient seated, arm relaxed at side
- Apply longitudinal traction downward

**Positive:** 
- Visible sulcus (gap) between acromion and humeral head
- >1cm gap = positive

**Grade:**
- Grade 1: <1cm
- Grade 2: 1-2cm
- Grade 3: >2cm

**Interpretation:** Inferior or multidirectional instability

---

**Load and Shift Test:**
- Patient supine
- Load humeral head into glenoid
- Attempt to translate anterior/posterior

**Grading:**
- Grade 0: No translation
- Grade 1: Up to glenoid rim
- Grade 2: Over rim with reduction
- Grade 3: Over rim without reduction

**Interpretation:** Anterior/posterior instability severity`
            },
            {
              type: 'text' as const,
              title: 'Labral Tear Tests',
              content: `**O'Brien's Test (Active Compression Test):**

**Procedure:**
- Shoulder 90° flexion, 10° horizontal adduction
- Elbow extended
- Test 1: Forearm pronated (thumb down)
  - Apply downward resistance
  - Note pain
- Test 2: Forearm supinated (thumb up)
  - Apply downward resistance
  - Compare pain

**Positive:** Pain with pronation, reduced with supination
**Sensitivity:** 63% | **Specificity:** 73%
**Interpretation:** SLAP lesion (superior labrum)

---

**Crank Test:**

**Procedure:**
- Supine
- Shoulder elevated to 160°
- Elbow 90° flexion
- Apply axial load through elbow
- IR and ER humerus while maintaining load

**Positive:** 
- Pain with rotation
- Clicking/catching

**Interpretation:** Labral tear

---

**Anterior Slide Test:**

**Procedure:**
- Patient standing, hands on hips
- Therapist behind patient
- Apply anterosuperior force on elbow

**Positive:** Pain or click at anterior shoulder
**Interpretation:** SLAP lesion

---

**Clinical Note:**
- No single labral test is highly sensitive/specific
- Combine multiple positive tests
- Consider mechanism of injury (overhead athletes)
- MRI arthrography gold standard for diagnosis`
            },
            {
              type: 'text' as const,
              title: 'AC Joint & Biceps Tests',
              content: `**AC Joint Cross-Body Adduction:**

**Procedure:**
- Shoulder 90° flexion
- Passively horizontally adduct arm across body

**Positive:** Pain at AC joint specifically
**Sensitivity:** 77% | **Specificity:** 79%

---

**AC Joint Palpation:**
- Direct palpation over AC joint
- Pain with pressure

---

**AC Joint Compression Test:**
- Direct downward compression on clavicle

**Positive:** Pain at AC joint

---

**Speed's Test (Biceps):**

**Procedure:**
- Shoulder 60° flexion
- Elbow extended
- Forearm supinated
- Resist forward flexion

**Positive:** Pain in bicipital groove (anterior shoulder)
**Sensitivity:** 54% | **Specificity:** 81%
**Interpretation:** Biceps tendinopathy, SLAP lesion

---

**Yergason's Test:**

**Procedure:**
- Elbow 90° flexion at side
- Forearm pronated
- Patient supinates against resistance

**Positive:** Pain in bicipital groove or "pop" (subluxation)
**Sensitivity:** 37% (poor) | **Specificity:** 86%

---

**Bicipital Groove Palpation:**
- Direct palpation of biceps tendon in groove
- Most reliable for biceps pathology`
            },
            {
              type: 'interactive' as const,
              title: 'Special Test Decision Tree',
              interactiveType: 'decision_tree',
              content: 'Use this interactive decision tree to determine which special tests to perform based on patient presentation and suspected pathology.',
              interactiveData: {
                rootQuestion: 'What is the primary complaint?',
                branches: [
                  { symptom: 'Pain with overhead activities', tests: ['Neers', 'Hawkins-Kennedy', 'Empty Can', 'Improvement Tests'] },
                  { symptom: 'Shoulder feels unstable', tests: ['Apprehension', 'Relocation', 'Sulcus Sign'] },
                  { symptom: 'Clicking/catching sensation', tests: ['OBriens', 'Crank Test', 'Anterior Slide'] },
                  { symptom: 'Top of shoulder pain', tests: ['AC Joint Tests', 'Cervical Screening'] }
                ]
              }
            }
          ]
        } as ModuleContent
      },

      // MODULE 9
      {
        title: 'Palpation',
        description: 'Systematic palpation of bony and soft tissue structures',
        estimatedDuration: 10,
        orderIndex: 9,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Bony Landmark Identification',
              content: `**Anterior Structures:**

**Sternoclavicular (SC) Joint:**
- Medial end of clavicle
- Palpate for swelling, tenderness

**Clavicle:**
- Shaft from SC to AC joint
- Feel for step deformity (fracture)

**Acromioclavicular (AC) Joint:**
- Follow clavicle laterally to step-down onto acromion
- Common tender point
- Step deformity with separation

**Coracoid Process:**
- 2-3cm below clavicle
- Medial to anterior shoulder
- Attachment point for pec minor, biceps short head, coracobrachialis

**Greater Tuberosity:**
- Lateral aspect of proximal humerus
- Rotator cuff insertion
- ER shoulder to bring anterior for palpation

**Lesser Tuberosity:**
- Medial to greater tuberosity
- Subscapularis insertion
- IR shoulder to access

**Bicipital Groove:**
- Between greater and lesser tuberosities
- Contains long head biceps tendon
- Tender with biceps pathology`
            },
            {
              type: 'text' as const,
              title: 'Soft Tissue Palpation',
              content: `**Subacromial Space:**
- Beneath acromion
- Palpate while shoulder in extension
- Contains subacromial bursa, rotator cuff

**Tender:** Bursitis, rotator cuff pathology

**Biceps Tendon:**
- In bicipital groove
- Can palpate with shoulder ER/IR to feel tendon roll under fingers
- Test: "Snap test" - move arm IR/ER, feel for subluxation

**Rotator Cuff Tendons:**
- **Supraspinatus:** Superior to greater tuberosity
- **Infraspinatus:** Posterior greater tuberosity
- **Teres minor:** Inferior to infraspinatus
- **Subscapularis:** Lesser tuberosity (anterior)

**Posterior Structures:**
- **Spine of Scapula:** Prominent ridge
- **Supraspinatus fossa:** Above spine
- **Infraspinatus fossa:** Below spine
- Feel for muscle bulk, atrophy

**Trigger Points:**
- Upper trapezius
- Levator scapulae
- Infraspinatus
- Subscapularis (anterior axillary fold)`
            },
            {
              type: '3d_scanner' as const,
              title: 'Interactive Palpation Guide',
              content: 'Use the 3D Body Scanner to visualize and identify all shoulder palpation landmarks. Click on structures to see their clinical significance and palpation technique.',
              interactiveType: '3d_model',
              interactiveData: {
                focus: 'shoulder',
                interactive: true,
                features: ['bony_landmarks', 'soft_tissue', 'tender_points']
              }
            }
          ]
        } as ModuleContent
      },

      // MODULE 10
      {
        title: 'Differential Diagnosis - All Pathologies',
        description: 'Comprehensive coverage of 30+ shoulder pathologies including complex conditions',
        estimatedDuration: 30,
        orderIndex: 10,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Common Shoulder Pathologies (15 Conditions)',
              content: `### 1. Rotator Cuff Tendinopathy
**Key Features:** Painful arc, positive impingement tests, weakness with pain
**Tests:** Neer's, Hawkins-Kennedy, Empty Can, ER/IR strength
**Treatment Focus:** Load management, progressive strengthening

### 2. Full-Thickness Rotator Cuff Tear
**Key Features:** Painless weakness, positive lag signs, possible atrophy
**Tests:** Drop arm, ER lag, IR lag
**Imaging:** MRI confirms
**Refer:** Orthopedics for surgical consideration

### 3. Subacromial Impingement
**Key Features:** 60-120° painful arc, positive impingement signs
**Tests:** Neer's, Hawkins-Kennedy, improvement tests often positive
**Treatment:** Scapular control, rotator cuff strengthening

### 4. Adhesive Capsulitis (Frozen Shoulder)
**Key Features:** Capsular pattern (ER>Abd>IR), gradual onset, night pain
**Stages:** Painful → Frozen → Thawing (12-36 months total)
**Treatment:** Mobilization (gentle in painful stage), ROM exercises

### 5. Glenohumeral Instability
**Types:** Anterior (most common), posterior, multidirectional
**Key Features:** Apprehension, history of dislocation/subluxation
**Tests:** Apprehension, relocation, sulcus sign
**Treatment:** Stabilization exercises, proprioception

### 6. SLAP Lesion (Superior Labrum)
**Key Features:** Overhead athletes, clicking, deep shoulder pain
**Tests:** O'Brien's, crank test, active compression
**Mechanism:** Repetitive overhead, falling on outstretched arm
**Refer:** Often requires surgical repair

### 7. Bankart Lesion (Anterior Labrum)
**Key Features:** Anterior instability, history of dislocation
**Tests:** Apprehension positive
**Treatment:** Surgical if recurrent instability

### 8. Biceps Tendinopathy
**Key Features:** Anterior shoulder pain, tender bicipital groove
**Tests:** Speed's, Yergason's, groove palpation
**Treatment:** Load management, tendon loading exercises

### 9. AC Joint Sprain
**Grades:** I (sprain), II (partial tear), III (complete separation)
**Key Features:** Top shoulder pain, step deformity (Grade II-III)
**Tests:** Cross-body adduction, AC compression, palpation
**Treatment:** Grades I-II conservative, Grade III may need surgery

### 10. Calcific Tendinitis
**Key Features:** Sudden severe pain, restriction, often supraspinatus
**Imaging:** X-ray shows calcification
**Phases:** Pre-calcific → Calcific → Post-calcific (resorption most painful)
**Treatment:** NSAIDs, injection, barbotage

### 11. Scapular Dyskinesis
**Key Features:** Abnormal scapular movement, winging
**Tests:** SAT positive, SRT positive, observation
**Treatment:** Scapular stabilization primary focus

### 12. Osteoarthritis
**Key Features:** Age >50, gradual onset, crepitus, capsular pattern
**Imaging:** Joint space narrowing, osteophytes
**Treatment:** ROM maintenance, strengthening, pain management

### 13. Proximal Humerus Fracture
**Key Features:** Trauma, severe pain, unable to move, swelling/bruising
**Tests:** Any movement painful
**Refer:** Emergency if displaced

### 14. Clavicle Fracture
**Key Features:** Direct blow, visible deformity, localized pain
**Treatment:** Sling immobilization, surgery if displaced

### 15. Post-Surgical Shoulder
**Types:** Rotator cuff repair, labral repair, arthroplasty
**Key Features:** Follow specific protocol timelines
**Treatment:** Respect healing phases, progressive loading`
            },
            {
              type: 'text' as const,
              title: 'Neurological Pathologies (8 Conditions)',
              content: `### 16. Parsonage-Turner Syndrome (Brachial Neuritis)
**Key Features:**
- Sudden severe shoulder pain (often nocturnal)
- Rapid muscle atrophy (2-4 weeks)
- Weakness without sensory loss initially
- Most common: Serratus anterior, spinati, deltoid

**Clinical Course:**
- Phase 1: Severe pain (1-4 weeks)
- Phase 2: Weakness & atrophy develops as pain resolves
- Phase 3: Recovery (months to years, may be incomplete)

**Diagnosis:** Clinical, EMG confirms, MRI shows denervation edema
**Treatment:** Supportive, PT for compensatory strategies
**Prognosis:** Variable, can take 2-3 years for recovery

### 17. Long Thoracic Nerve Palsy
**Key Features:**
- Serratus anterior weakness
- Medial scapular winging
- Difficulty with overhead activities

**Causes:** Trauma, traction injury, surgical complication
**Tests:** Wall push-up shows winging
**Treatment:** Scapular stabilization, may recover in 6-12 months

### 18. Suprascapular Nerve Entrapment
**Key Features:**
- Deep posterior shoulder pain
- Supraspinatus +/- infraspinatus atrophy
- Weakness in ER and abduction

**Sites:** Suprascapular notch, spinoglenoid notch
**Tests:** ER weakness, atrophy in fossae, Hawkins-Kennedy may be positive
**Treatment:** PT, surgical decompression if conservative fails

### 19. Axillary Nerve Injury
**Key Features:**
- Deltoid weakness/atrophy
- Patch of numbness over lateral shoulder
- Cannot initiate abduction

**Causes:** Anterior dislocation, humeral neck fracture, surgical trauma
**Tests:** Resisted abduction weak, sensory loss
**Treatment:** PT, nerve regeneration if incomplete injury

### 20. Spinal Accessory Nerve Injury
**Key Features:**
- Trapezius weakness (especially upper)
- Lateral scapular winging
- Drooping shoulder

**Causes:** Lymph node biopsy, neck surgery, trauma
**Tests:** Resisted shoulder shrug weak
**Treatment:** Scapular stabilization, Eden-Lange transfer if no recovery

### 21. Thoracic Outlet Syndrome (TOS)
**Types:** Neurogenic (95%), vascular (5%)

**Neurogenic TOS:**
- Ulnar-sided hand symptoms (C8-T1)
- Weakness of intrinsic hand muscles
- Exacerbated by overhead positions

**Tests:** Roos test, Adson's, Wright's
**Treatment:** Postural correction, first rib mobilization, nerve glides

**Vascular TOS:**
- Color changes, coldness
- Arm claudication
- Diminished pulse with testing

### 22. Quadrilateral Space Syndrome
**Key Features:**
- Axillary nerve compression in quadrilateral space
- Vague posterior shoulder pain
- Tenderness over quadrilateral space
- Aggravated by abduction & ER

**Tests:** Point tenderness, possible axillary nerve symptoms
**Diagnosis:** MRI arteriography shows vascular changes
**Treatment:** Rest, PT, rarely surgical decompression

### 23. Cervical Radiculopathy (C5-C6)
**Key Features:**
- Neck pain with arm radiation
- Dermatomal sensory changes
- Myotomal weakness

**C5 Radiculopathy:**
- Lateral shoulder pain
- Deltoid weakness
- Biceps reflex reduced

**C6 Radiculopathy:**
- Lateral arm and thumb
- Biceps and wrist extensor weakness

**Tests:** Spurling's positive, ULNT positive, neck screening positive
**Treatment:** Address cervical spine, traction, nerve mobilization`
            },
            {
              type: 'text' as const,
              title: 'Complex & Rare Pathologies (7 Conditions)',
              content: `### 24. Os Acromiale
**Description:** Un-fused acromial epiphysis (present in 3-15%)
**Key Features:**
- Often asymptomatic
- Can cause impingement-like symptoms
- Palpable gap in acromion

**Diagnosis:** X-ray (axillary view)
**Treatment:** Conservative usually, surgery if symptomatic

### 25. SIRVA (Shoulder Injury Related to Vaccine Administration)
**Key Features:**
- Pain onset within 48 hours of vaccination
- Persistent shoulder pain and limited ROM
- Possible bursitis, tendinopathy from improper injection site

**Mechanism:** Injection too high in deltoid → bursa inflammation
**Treatment:** NSAIDs, PT, typically resolves in weeks to months
**Prevention:** Proper injection technique and site

### 26. Osteonecrosis (Avascular Necrosis)
**Key Features:**
- Progressive shoulder pain
- Limited ROM
- Risk factors: Steroids, alcohol, sickle cell, trauma

**Diagnosis:** MRI (early), X-ray (late)
**Stages:** Pre-collapse → Collapse → Arthritis
**Treatment:** Core decompression (early), arthroplasty (late)

### 27. Shoulder Girdle Tumors
**Benign:** Lipoma, osteochondroma, chondroblastoma
**Malignant:** Metastatic (breast, lung, kidney), osteosarcoma, chondrosarcoma

**Red Flags:**
- Unrelenting night pain
- Unexplained weight loss
- Progressive weakness
- Palpable mass

**Refer:** Immediate imaging and oncology referral

### 28. Complex Regional Pain Syndrome (CRPS)
**Key Features:**
- Disproportionate pain to injury
- Color/temperature changes
- Hypersensitivity
- Swelling, sudomotor changes

**Diagnosis:** Budapest criteria
**Treatment:** Graded motor imagery, desensitization, PT, pain management
**Prognosis:** Better if treated early

### 29. Pectoralis Major Rupture
**Key Features:**
- Sudden pain during bench press or similar
- Visible defect/asymmetry in chest
- Bruising, swelling
- Weakness in horizontal adduction and IR

**Diagnosis:** Clinical, MRI confirms
**Treatment:** Surgical repair (acute), especially in athletes

### 30. Referred Visceral Pain
**Cardiac (Left Shoulder):**
- Angina, MI
- Associated chest pain, dyspnea
- Red flags: Diaphoresis, nausea

**Diaphragmatic Irritation (Shoulder Tip):**
- Kehr's sign
- From: Ectopic pregnancy, splenic rupture, liver pathology

**Gallbladder (Right Shoulder):**
- Right upper quadrant pain
- Associated with fatty meals

**Always Screen:** Cardiovascular and visceral causes if no mechanical pattern`
            },
            {
              type: 'interactive' as const,
              title: 'Differential Diagnosis Flowchart',
              interactiveType: 'decision_tree',
              content: 'Interactive tool to guide differential diagnosis based on key clinical findings.',
              interactiveData: {
                algorithm: 'shoulder_differential_diagnosis'
              }
            }
          ]
        } as ModuleContent
      },

      // MODULE 11
      {
        title: 'Clinical Synthesis & Case Studies',
        description: 'Apply all assessment skills to real clinical scenarios',
        estimatedDuration: 25,
        orderIndex: 11,
        content: {
          sections: [
            {
              type: 'text' as const,
              title: 'Pattern Recognition Framework',
              content: `**Systematic Approach to Shoulder Assessment:**

**1. Listen to the Story**
- Mechanism
- Pain location and behavior
- Aggravating factors
- Red flags

**2. Observe & Screen**
- Posture
- Muscle bulk
- Cervical screening

**3. Test Movement**
- AROM - pattern recognition
- Improvement tests - treatment direction
- PROM - tissue restriction

**4. Test Strength**
- Identify weak muscles
- Differentiate pain vs. weakness

**5. Special Tests**
- Confirm hypothesis
- Not diagnostic in isolation

**6. Synthesize**
- What is primary pathology?
- What are contributing factors?
- What is modifiable?
- What is treatment plan?`
            },
            {
              type: 'interactive' as const,
              title: 'Case Study 1: Young Athlete with Shoulder Pain',
              interactiveType: 'case_study',
              content: `**Patient:**
20-year-old male, collegiate baseball pitcher

**Chief Complaint:**
"My shoulder feels like it's going to come out when I throw"

**History:**
- 2 months ago: Felt shoulder "slip" during throw
- No dislocation but felt very unstable
- Now afraid to throw hard
- Deep shoulder pain during throwing motion
- Clicking sensation

**Your Assessment Questions:**
1. What specific ROM tests would you perform?
2. Which special tests are most relevant?
3. What improvement tests would you try?
4. What is your working diagnosis?

**Reveal Clinical Findings:**
- AROM: Full but apprehensive with abd/ER
- Apprehension test: Strongly positive
- Relocation test: Relieves apprehension
- O'Brien's test: Positive (pain + click)
- ERRT: Positive (reduces apprehension)
- SAT: Positive (better movement quality)

**Your Diagnosis:**
- Primary: Anterior shoulder instability
- Secondary: Possible SLAP lesion (overhead athlete + clicking)
- Contributing: Scapular dyskinesis, rotator cuff weakness

**Treatment Plan:**
1. Refer for MRI (confirm labral integrity)
2. Rotator cuff strengthening (ER especially)
3. Scapular stabilization
4. Proprioception training
5. Gradual return to throwing program
6. Surgical referral if conservative fails (labral repair)`,
              interactiveData: {
                caseId: 'shoulder_instability_athlete',
                hasVirtualPatient: true
              }
            },
            {
              type: 'interactive' as const,
              title: 'Case Study 2: Middle-Aged Worker with Shoulder Pain',
              interactiveType: 'case_study',
              content: `**Patient:**
52-year-old female, office worker

**Chief Complaint:**
"I can't reach overhead without pain"

**History:**
- Gradual onset over 6 months
- Pain with reaching into cupboards
- Cannot sleep on right side
- No specific injury
- Aching pain at rest

**Examination Findings (You Discover):**
- AROM: 60-120° painful arc in abduction
- Neer's: Positive
- Hawkins-Kennedy: Positive
- Empty can: Weak AND painful (4/5)
- ER strength: Normal (5/5)
- Drop arm: Negative
- SAT: Strongly positive (pain reduced 7/10 → 3/10)
- SRT: Positive (improved quality)
- ERRT: Positive (reduced pain)

**Question:** What does this assessment tell you?

**Analysis:**
- **Primary Pathology:** Supraspinatus tendinopathy (not full tear)
  - Evidence: Painful arc, impingement signs, weakness WITH pain, negative lag sign
- **Contributing Factors:** 
  - Scapular dyskinesis (SAT/SRT positive)
  - Poor humeral head control (ERRT positive)
- **Prognosis:** Excellent - multiple modifiable impairments

**Treatment Plan:**
1. Load management education (avoid painful arc)
2. Scapular stabilization exercises (lower trap, serratus)
3. Progressive rotator cuff loading
4. Short lever to long lever progression
5. Postural correction
6. Expected timeline: 8-12 weeks significant improvement

**Key Learning:**
- Improvement tests guide treatment
- Multiple positive = good prognosis
- Address all contributing factors`,
              interactiveData: {
                caseId: 'rotator_cuff_worker'
              }
            },
            {
              type: 'interactive' as const,
              title: 'Case Study 3: Post-MVA with Shoulder Weakness',
              interactiveType: 'case_study',
              content: `**Patient:**
35-year-old male, 4 weeks post motor vehicle accident

**Chief Complaint:**
"Severe shoulder pain that started 2 weeks ago, now my shoulder is very weak"

**History:**
- MVA 4 weeks ago (whiplash, no fractures)
- Initial pain resolved
- 2 weeks ago: Sudden severe right shoulder pain (woke from sleep)
- Pain was excruciating for 1 week, now mostly resolved
- Noticed rapid muscle wasting
- Cannot lift arm, very weak

**Red Flags Present:**
- Sudden severe pain
- Rapid atrophy
- Weakness out of proportion to pain

**Your Examination:**
- **Observation:** Marked atrophy of supraspinatus and infraspinatus fossae
- **AROM:** Very limited abd/ER due to weakness, not pain
- **Strength:** 
  - Empty can: 1/5 (barely contracts)
  - ER: 2/5
  - All other tests relatively normal
- **Sensation:** Intact
- **Special tests:** Difficult to perform due to weakness

**Questions:**
1. What is your suspected diagnosis?
2. What confirmatory tests would you order?
3. What is the prognosis?

**Diagnosis:** Parsonage-Turner Syndrome (Brachial Neuritis)

**Classic Presentation:**
✓ Sudden severe pain (phase 1)
✓ Pain resolves as weakness appears (phase 2)
✓ Rapid atrophy (2-4 weeks)
✓ Specific nerve distribution (suprascapular nerve → supraspinatus/infraspinatus)
✓ Often triggered by infection, surgery, vaccination, trauma

**Confirmatory Tests:**
- EMG/NCS: Shows denervation
- MRI: Denervation edema in affected muscles

**Management:**
1. Reassurance - self-limiting condition
2. Pain management during acute phase
3. Gentle ROM to prevent stiffness
4. Strengthening of compensatory muscles
5. Prognosis: Recovery takes 6 months to 3 years, may be incomplete

**Key Learning:**
- Parsonage-Turner mimics other conditions initially
- Pattern of acute pain → weakness → atrophy is classic
- EMG is confirmatory
- PT focuses on compensation, not forcing weak muscles`,
              interactiveData: {
                caseId: 'parsonage_turner'
              }
            },
            {
              type: 'interactive' as const,
              title: 'Case Study 4: Overhead Athlete with Shoulder Pain',
              interactiveType: 'case_study',
              content: `**Patient:**
22-year-old female, collegiate volleyball player

**Chief Complaint:**
"Deep shoulder pain when spiking, clicking sensation"

**History:**
- Gradual onset this season
- Pain with overhead serving and spiking
- Feels "deep" in joint
- Clicking with certain movements
- No history of dislocation

**Key Examination Findings:**
- AROM: Full, pain at end-range overhead
- O'Brien's: Positive (pain with pronation, relieved with supination)
- Crank test: Positive (pain + audible click)
- Anterior slide test: Positive
- Biceps load test II: Positive
- SAT: Somewhat positive
- Cervical screening: Negative

**Pattern Recognition:**
- Overhead athlete ✓
- Deep pain ✓
- Clicking ✓
- Multiple labral tests positive ✓

**Diagnosis:** SLAP lesion (Superior Labrum Anterior-Posterior tear)

**Treatment Options:**
1. Conservative: 3-6 months
   - Scapular stabilization
   - Rotator cuff strengthening
   - Activity modification
   - Progressive return to sport

2. Surgical: Labral repair
   - If conservative fails
   - High-level athlete wanting to return to sport
   - Type II SLAP most likely to need surgery

**Return to Sport Considerations:**
- Long rehab even with surgery (6-12 months)
- Some evidence that Type II SLAP in overhead athletes may need surgery for full return
- Shared decision making with athlete, orthopedic surgeon

**Key Learning:**
- SLAP lesions are diagnosis of exclusion
- No single test is definitive
- Conservative trial appropriate first
- Surgical success variable in overhead athletes`,
              interactiveData: {
                caseId: 'slap_athlete'
              }
            },
            {
              type: 'interactive' as const,
              title: 'Case Study 5: Elderly Patient with Shoulder Stiffness',
              interactiveType: 'case_study',
              content: `**Patient:**
58-year-old female with diabetes

**Chief Complaint:**
"My shoulder is frozen, I can't move it at all"

**History:**
- 6-month gradual progression
- Initially painful, now very stiff
- Severe night pain (waking multiple times)
- Cannot dress herself, wash hair
- Diabetic (risk factor)

**Examination:**
- **AROM:**
  - Flexion: 80° (very limited)
  - Abduction: 60° (severely limited)
  - ER at side: 10° (severely limited)
  - IR: Hand to sacrum only
  
- **PROM:**
  - Same restrictions as active
  - Capsular end-feel
  - **Capsular pattern present: ER >> Abd > IR**

- **Strength:** Cannot adequately test due to ROM limitation

- **Improvement tests:** All negative (ROM too limited)

**Diagnosis:** Adhesive Capsulitis (Frozen Shoulder) - Stage 2 (Frozen)

**Stages:**
1. **Painful/Freezing (0-3 months):** Pain > stiffness
2. **Frozen (3-9 months):** Stiffness > pain [Current stage]
3. **Thawing (9-24 months):** Progressive improvement

**Management - Stage Dependent:**

**Stage 2 (Current):**
- Gentle mobilization (grade 2-3, within pain limits)
- ROM exercises (patient can push more now)
- Modalities for pain relief
- Patient education: Will improve, takes time
- Consider injection for pain management

**Prognosis:**
- Will improve gradually over 12-24 months
- May not return to 100% ROM (90% get functional ROM)
- Diabetes = slower recovery, higher recurrence

**Key Learning:**
- Capsular pattern is diagnostic
- Stage determines treatment aggressiveness
- Patient education crucial (long timeline)
- Diabetics at 5x higher risk`,
              interactiveData: {
                caseId: 'adhesive_capsulitis'
              }
            },
            {
              type: 'quiz' as const,
              title: 'Final Assessment - Shoulder Assessment Mastery',
              quizQuestions: [
                {
                  question: 'A patient has positive SAT, SRT, and ERRT. What does this indicate about their prognosis?',
                  options: [
                    'Poor prognosis, structural damage too severe',
                    'Excellent prognosis, multiple modifiable impairments',
                    'Requires immediate surgery',
                    'Likely adhesive capsulitis'
                  ],
                  correctAnswer: 'Excellent prognosis, multiple modifiable impairments',
                  explanation: 'Multiple positive improvement tests indicate several modifiable impairments that can be addressed with treatment, suggesting excellent treatment potential.'
                },
                {
                  question: 'Which combination of findings is most concerning for Parsonage-Turner syndrome?',
                  options: [
                    'Gradual onset weakness with chronic pain',
                    'Sudden severe pain followed by rapid atrophy and weakness',
                    'Painful arc with weakness',
                    'Clicking and instability'
                  ],
                  correctAnswer: 'Sudden severe pain followed by rapid atrophy and weakness',
                  explanation: 'The classic presentation of Parsonage-Turner is acute severe pain that resolves as rapid muscle atrophy and weakness develop, typically within 2-4 weeks.'
                },
                {
                  question: 'A patient with shoulder pain has reproduction of symptoms with cervical extension and rotation. What is your next step?',
                  options: [
                    'Focus solely on shoulder treatment',
                    'Include cervical spine treatment in management plan',
                    'Order shoulder MRI immediately',
                    'Refer to orthopedic surgeon'
                  ],
                  correctAnswer: 'Include cervical spine treatment in management plan',
                  explanation: 'Positive cervical screening indicates cervical contribution to shoulder symptoms. Treatment must address the cervical spine for optimal outcomes.'
                },
                {
                  question: 'What is the capsular pattern for adhesive capsulitis?',
                  options: [
                    'IR > Abd > ER',
                    'Abd > ER > IR',
                    'ER > Abd > IR',
                    'ER > IR > Abd'
                  ],
                  correctAnswer: 'ER > Abd > IR',
                  explanation: 'The capsular pattern for adhesive capsulitis is external rotation most limited, then abduction, then internal rotation (ER > Abd > IR).'
                },
                {
                  question: 'An overhead athlete has positive O\'Brien\'s, crank test, and anterior slide test. What is the most likely diagnosis?',
                  options: [
                    'Rotator cuff tear',
                    'Subacromial impingement',
                    'SLAP lesion',
                    'AC joint pathology'
                  ],
                  correctAnswer: 'SLAP lesion',
                  explanation: 'Multiple positive labral tests in an overhead athlete with deep shoulder pain is highly suggestive of a SLAP (Superior Labrum Anterior-Posterior) lesion.'
                }
              ]
            }
          ]
        } as ModuleContent
      }
    ];

    // Insert all modules
    console.log(`📝 Inserting ${modules.length} modules...`);
    for (const module of modules) {
      await db.insert(courseModules).values({
        ...module,
        courseId: course.id,
      });
      console.log(`   ✓ Created module: ${module.title}`);
    }

    console.log('✅ Shoulder Assessment course seeding completed successfully!');
    console.log(`📊 Course ID: ${course.id}`);
    console.log(`📊 Total modules: ${modules.length}`);
    console.log('✅ Seeding completed');

  } catch (error) {
    console.error('❌ Error seeding Shoulder Assessment course:', error);
    throw error;
  }
}

// Run the seeding
seedShoulderAssessmentCourse()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
