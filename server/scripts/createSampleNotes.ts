/**
 * Script to create sample clinical notes for each body part
 * All notes will be public and properly de-identified
 */

import { storage } from '../storage';
import { deIdentifyNote, calculateAgeRange, extractCondition } from '../utilities/deIdentify';
import { visibilityEnum, bodyPartEnum } from '@shared/schema';

// Helper function to create a random date in the past year
function randomDate(start: Date, end: Date): string {
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Sample patient data generator
function generatePatientData() {
  const patientId = `PT${Math.floor(10000 + Math.random() * 90000)}`;
  const names = ['John Smith', 'Jane Doe', 'Robert Johnson', 'Emily Davis', 'Michael Brown'];
  const patientName = names[Math.floor(Math.random() * names.length)];
  
  // Generate random DOB for an adult
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - Math.floor(25 + Math.random() * 50); // 25-75 years old
  const month = Math.floor(1 + Math.random() * 12);
  const day = Math.floor(1 + Math.random() * 28);
  const dateOfBirth = `${birthYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  // Date of visit in past year
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const dateOfVisit = randomDate(oneYearAgo, today);
  
  return {
    patientName,
    patientId,
    dateOfBirth,
    dateOfVisit
  };
}

// Sample SOAP notes for each body part
const sampleNotes = {
  shoulder: {
    subjective: "Patient reports persistent right shoulder pain for 6 weeks, aggravated by overhead activities and reaching behind. Pain described as sharp and localized to lateral aspect of shoulder. Reports difficulty sleeping on affected side. Denies trauma, but mentions increased pain following a weekend of intensive gardening. Pain rated as 7/10 at worst, 3/10 at rest. Previous history of rotator cuff tendinitis 3 years ago which resolved with therapy.",
    objective: "Observation: Mild protracted right shoulder with apparent muscle guarding. ROM: Right shoulder flexion 145° (L 170°), abduction 130° (L 175°), external rotation 45° (L 90°), internal rotation to L3 (L T7). Strength: Supraspinatus and infraspinatus 4/5 with pain. Empty can test positive, Hawkins-Kennedy test positive, Neer's test positive. Negative apprehension test. Palpation reveals tenderness over supraspinatus tendon insertion and greater tuberosity.",
    assessment: "Right shoulder subacromial impingement syndrome with rotator cuff tendinopathy. Patient presents with classic signs of impingement including painful arc during abduction and positive impingement special tests. Likely exacerbated by gardening activity which involved repetitive overhead movements.",
    plan: "1. Physical therapy 2x weekly for 6 weeks focusing on rotator cuff strengthening, scapular stabilization, and proper movement patterns. 2. Home exercise program including pendulum exercises, gentle stretching, and progressive strengthening. 3. Activity modification to avoid overhead activities that exacerbate symptoms. 4. Cold packs for 15 minutes post-exercise to manage inflammation. 5. Reassess in 3 weeks."
  },
  neck: {
    subjective: "Patient presents with neck pain and stiffness that started 10 days ago after extended hours working on computer. Reports radiating pain to right upper trapezius and occasional headaches starting at base of skull. Describes pain as 'achy' most of the time, becoming 'sharp' with certain neck movements, particularly right rotation. Pain rated 5/10 on average, worse at end of workday. Sitting for prolonged periods and poor sleep positioning exacerbate symptoms. Reports temporary relief with heat application.",
    objective: "Posture shows forward head position with increased cervical lordosis. Cervical ROM: Flexion 40° (limited by pain), Extension 30° (normal), R Rotation 50° (painful at end range), L Rotation 70° (WNL), R Lateral Flexion 30° (painful), L Lateral Flexion 45° (WNL). Palpation revealed hypertonic upper trapezius and levator scapulae muscles bilaterally, worse on right. Tenderness noted over C5-C6 facet joints on right. Upper limb tension tests negative. Spurling's test produces local neck pain but no radicular symptoms. Upper extremity strength and reflexes intact.",
    assessment: "Mechanical neck pain with myofascial component, consistent with cervical facet joint dysfunction and muscle guarding. Forward head posture and prolonged computer work are contributing to postural strain and muscle imbalances. No signs of nerve root compression or serious pathology at this time.",
    plan: "1. Manual therapy including soft tissue mobilization to upper trapezius and levator scapulae, gentle joint mobilizations to C4-C6 segments. 2. Education on workstation ergonomics and frequent position changes. 3. Home program of gentle cervical ROM exercises, deep neck flexor strengthening, and postural awareness training. 4. Heat prior to exercises. 5. Follow up in 1 week. 6. If no improvement, consider referral for cervical spine imaging."
  },
  back: {
    subjective: "Patient reports low back pain that began 3 weeks ago while lifting a heavy box at home. Pain is localized to the lumbar region with occasional radiation to the left buttock, but not beyond. Describes pain as dull and aching at rest (4/10) becoming sharp with forward bending or prolonged sitting (7/10). Reports morning stiffness lasting approximately 30 minutes. Denies bowel/bladder changes, saddle anesthesia, or lower extremity weakness. Has been taking OTC ibuprofen with moderate relief.",
    objective: "Gait demonstrates decreased weight shifting and trunk rotation. Posture shows flattened lumbar lordosis with mild left-sided list. ROM: Forward flexion limited to fingertips reaching mid-shin with increased pain and visible paravertebral muscle spasm. Extension 15° (limited and painful), Lateral flexion R 20° L 15° (painful to left). Straight leg raise negative bilaterally. Slump test reproduces local back pain but no radicular symptoms. Palpation reveals tender L4-L5 region and left paraspinal muscle guarding. Manual muscle testing of lower extremities 5/5 throughout. Sensation intact to light touch in all dermatomes.",
    assessment: "Acute lumbar strain with associated muscle guarding and possible facet joint irritation. Presentation consistent with mechanical low back pain without radicular involvement. Functional limitations in bending, lifting, and prolonged positioning.",
    plan: "1. Physical therapy 2x weekly for 3 weeks focusing on pain management, restoring normal movement patterns, and trunk stabilization. 2. Education on proper body mechanics and lifting techniques. 3. Home exercise program including walking program, gentle lumbar ROM exercises, and progressive core strengthening. 4. Trial of lumbar roll for sitting. 5. Continue appropriate dose of NSAIDs as needed for pain. 6. Return to normal activities as tolerated with modification of heavy lifting."
  },
  elbow: {
    subjective: "Patient is a 42-year-old right-handed recreational tennis player reporting gradual onset of right lateral elbow pain over past 2 months. Pain increased after playing consecutive days in a tournament. Describes pain as 'burning' and 'sharp' during gripping activities such as shaking hands, lifting a coffee cup, or using tools. Pain rated as 6/10 during activities, minimal at rest. Previous self-management with ice and OTC anti-inflammatories provided temporary relief. Denies trauma, numbness, or tingling.",
    objective: "Inspection reveals no obvious swelling or redness around lateral epicondyle. Elbow ROM full and pain-free. Wrist extension against resistance reproduces pain at lateral epicondyle. Grip strength: Right 25kg (affected), Left 42kg. Tenderness to palpation at right common extensor tendon origin. Mills test positive, Cozen's test positive. Pain increased with resisted middle finger extension. Cervical screening and neurological examination of upper limb unremarkable.",
    assessment: "Right lateral epicondylalgia (tennis elbow), consistent with tendinopathy of the common extensor tendon origin. Grip strength significantly reduced on affected side. Condition likely exacerbated by increased tennis playing volume without adequate recovery time. Current presentation consistent with reactive/early dysrepair stage of tendinopathy.",
    plan: "1. Activity modification to reduce aggravating activities for 2-3 weeks, particularly avoiding heavy gripping and wrist extension against resistance. 2. Counterforce bracing to be worn during daily activities. 3. Progressive loading program starting with isometric wrist extension exercises, advancing to eccentric training as symptoms permit. 4. Manual therapy including soft tissue techniques to extensor muscle group. 5. Education on appropriate warm-up and technique modification for tennis. 6. Consider referral for equipment assessment if not improving with conservative management."
  },
  wrist: {
    subjective: "Patient is a 35-year-old administrative assistant reporting right wrist pain and occasional numbness in thumb, index and middle fingers that has gradually worsened over 3 months. Symptoms are worst in the morning and after prolonged computer use. Reports night pain that sometimes wakes her from sleep. Shaking hand provides temporary relief. Uses wrist splint at night with some benefit. Denies trauma or previous wrist issues. Pain rated as 5/10 during keyboard work.",
    objective: "Visible flattening of thenar eminence on right compared to left. Wrist ROM WFL but painful at end ranges of flexion and extension. Positive Phalen's test at 30 seconds, reproducing numbness in median nerve distribution. Positive Tinel's sign at right carpal tunnel. Diminished light touch sensation in thumb, index, and middle fingers compared to ulnar digits and left hand. Grip strength R 18kg, L 24kg. Finkelstein's test negative. Two-point discrimination: 8mm in median distribution (index finger), 5mm in ulnar distribution (little finger).",
    assessment: "Right carpal tunnel syndrome, moderate severity based on clinical findings including positive provocative tests and sensory changes in median nerve distribution. Contributing factors likely include repetitive wrist positioning during keyboard work and potential wrist flexion during sleep.",
    plan: "1. Custom-fabricated neutral wrist splint to be worn at night and during prolonged computer work. 2. Ergonomic assessment and modification of workstation. 3. Nerve gliding exercises to be performed hourly during workday. 4. Education on proper positioning of wrists during typing and frequent breaks. 5. Trial of NSAID gel applied locally to wrist 4x daily. 6. If no improvement in 4 weeks, refer for electrodiagnostic testing to determine severity of median nerve compression. 7. Review in 3 weeks."
  },
  hand: {
    subjective: "Patient is a 62-year-old retired carpenter presenting with gradually worsening pain and stiffness in both hands, particularly at the base of both thumbs and the DIP joints of the index and middle fingers. Morning stiffness lasts about 30-45 minutes. Reports difficulty with fine motor tasks like buttoning clothes and opening jars. Pain described as 'achy' and 'grinding' rated 4/10 at rest, 7/10 with activities requiring strong grip. History of family members with 'arthritis in hands.' Symptoms worse in cold, damp weather.",
    objective: "Inspection reveals bony enlargement at DIP joints of index and middle fingers bilaterally (Heberden's nodes) and subtle squaring at the base of both thumbs. Swan neck deformity noted in left ring finger. ROM: First CMC joint abduction limited to 30° bilaterally with pain at end range. Grip strength: R 15kg, L 18kg. Pinch strength: R 4kg, L 5kg. Pain with compression of first CMC joint bilaterally. Tenderness to palpation over affected joints. No significant warmth or erythema noted. AROM of all digits shows reduced flexion of affected DIP joints (lacking approximately 10-15° from full flexion).",
    assessment: "Osteoarthritis affecting multiple hand joints, predominantly the first CMC joints bilaterally and DIP joints of index and middle fingers. Typical presentation with morning stiffness, bony changes, and functional limitations in hand strength and dexterity. Moderate functional impact on ADLs requiring fine motor control and grip strength.",
    plan: "1. Paraffin bath therapy followed by gentle ROM exercises, 2x daily. 2. Thumb spica splints for use during heavy activities to support CMC joints. 3. Joint protection techniques and adaptive equipment recommendations for daily activities. 4. Progressive hand strengthening program with therapy putty, beginning with low resistance. 5. Trial of topical diclofenac gel for pain management. 6. Home program to maintain ROM and strength. 7. Consider referral to rheumatology if inflammatory component suspected."
  },
  hip: {
    subjective: "Patient is a 58-year-old presenting with gradually worsening right hip pain over the past 6 months. Describes deep, aching pain in the right groin and lateral hip that increases with walking more than 15 minutes and getting up after prolonged sitting. Morning stiffness lasting about 20-30 minutes. Difficulty putting on socks and shoes. Pain often radiates to anterior thigh. No history of injury. Pain rated 3/10 at rest, 6/10 with extended walking. Reports 'clicking' sensation with certain movements.",
    objective: "Antalgic gait with decreased stance time on right, reduced hip extension during terminal stance. Trendelenburg sign positive on right. ROM: Hip flexion R 95° (painful), L 120°; Internal rotation R 15° (painful), L 35°; External rotation R 25° (painful), L 45°; Abduction R 25°, L 40°. Pain at end ranges of all movements on right. Resisted hip flexion and internal rotation reproduce pain. FABER test positive right hip. Scour test positive with crepitus felt during circumduction of right hip. Strength testing: Hip abductors 4-/5 right, 5/5 left. No significant leg length discrepancy. Palpation reveals tenderness over greater trochanter and anterior hip joint.",
    assessment: "Right hip osteoarthritis, moderate severity based on significant ROM limitations, pain patterns, and functional impairments. Compensatory mechanics evident in gait with secondary weakness in hip abductors. Clinical presentation consistent with both intra-articular pathology and possible secondary trochanteric pain syndrome.",
    plan: "1. Aquatic therapy 2x weekly for 6 weeks to allow exercise with reduced weight-bearing. 2. Land-based program focusing on hip abductor strengthening, core stability, and gait retraining. 3. Manual therapy including joint mobilizations and soft tissue techniques to improve mobility. 4. Education on activity modification including use of walking aid for longer distances. 5. Trial of unloader hip brace during extended walking. 6. Weight management strategies discussed. 7. Refer for orthopedic consultation to discuss imaging and interventional options if not responding to conservative management."
  },
  knee: {
    subjective: "Patient is a 45-year-old recreational runner (15-20 miles/week) reporting 3-week history of left anterior knee pain. Pain began after increasing mileage for upcoming half marathon. Describes pain as 'dull' around and under kneecap that worsens with running, stairs (especially descending), and after prolonged sitting. Pain rated 2/10 at rest, 6/10 during running. Reports occasional 'giving way' sensation when going down stairs. Denies locking, swelling, or trauma. Has reduced running volume but continues to train through discomfort.",
    objective: "Observation reveals slight genu valgum bilaterally, more pronounced on left. Dynamic knee valgus noted during single leg squat on left. Patellar tracking shows lateral deviation during terminal extension. VMO appears slightly atrophied compared to right. ROM full and pain-free. Mild crepitus palpable during active knee extension. Tenderness along lateral facet of patella and lateral retinaculum. Positive patellar compression test. Negative McMurray's, Lachman's, and varus/valgus stress tests. Hip strength assessment reveals left hip abductors 4/5, external rotators 4-/5 (5/5 on right). Navicular drop test indicates bilateral pronation, more significant on left (12mm vs 8mm right).",
    assessment: "Patellofemoral pain syndrome of the left knee, likely resulting from lateral patellar tracking and poor dynamic control. Contributing factors include weak hip stabilizers, excessive pronation, and training errors (rapid increase in running volume). Biomechanical factors creating increased lateral forces at the patellofemoral joint during loaded knee flexion activities.",
    plan: "1. Temporary reduction in running distance and intensity, with avoidance of downhill running. 2. Progressive strengthening program focusing on VMO activation, hip abductors and external rotators. 3. Patellar taping to improve tracking during exercise and running. 4. Gait and running analysis with technique modifications as needed. 5. Custom orthotics to address overpronation. 6. Gradual return to running program with appropriate progression of distance. 7. Cross-training with cycling or swimming to maintain cardiovascular fitness while reducing patellofemoral stress."
  },
  ankle: {
    subjective: "Patient is a 28-year-old basketball player with acute right ankle injury that occurred 5 days ago when landing on another player's foot, causing inversion of the ankle. Reports immediate pain and swelling. Unable to continue playing or bear full weight immediately after injury. Currently reports pain 6/10 with weight-bearing activities, localized to lateral ankle. Mild swelling persists. Using crutches for longer distances but able to bear partial weight for short distances at home. No previous ankle injuries. Tried RICE protocol with some reduction in swelling.",
    objective: "Moderate swelling around lateral malleolus with ecchymosis extending to midfoot. Decreased weight-bearing on right during gait assessment, with limited push-off. ROM: Plantarflexion 40° (painful at end range), Dorsiflexion 10° (limited by pain), Inversion 15° (significantly painful and limited), Eversion 15° (mildly uncomfortable). Pain with palpation of anterior talofibular ligament (ATFL) and calcaneofibular ligament (CFL). Positive anterior drawer test causing pain but moderate endpoint felt. Negative talar tilt test. Unable to perform single leg heel raise on affected side. Neurovascular status intact.",
    assessment: "Grade 2 lateral ankle sprain involving the ATFL with possible minor involvement of the CFL. Moderate functional limitation with pain significantly limiting weight-bearing activities. Normal healing progression for 5 days post-injury, but continued edema and pain with specific ligamentous stress indicating need for continued protection during early rehabilitation phase.",
    plan: "1. Progressive weight-bearing as tolerated with discontinuation of crutches when able to walk without significant gait deviation. 2. Ankle brace (semi-rigid) for support during daily activities. 3. RICE to continue managing swelling and pain. 4. Early ROM exercises within pain-free range. 5. Progressive balance training beginning with seated BAPS board, advancing to standing activities as weight-bearing improves. 6. Gentle strengthening beginning with isometrics and progressing to resistance bands. 7. Gait training focused on normal heel-toe pattern. 8. Return to basketball protocol provided with expected timeline of 4-6 weeks depending on progress."
  },
  foot: {
    subjective: "Patient is a 52-year-old presenting with gradually worsening pain in right foot, specifically at the base of the first metatarsal and medial arch. Reports 6-month history of pain that is worst with first steps in the morning and after prolonged periods of sitting, described as 'sharp' initially then becoming a 'dull ache' with continued movement. Pain rated 7/10 with first steps, decreasing to 3/10 after walking briefly. Works as a teacher requiring prolonged standing. Recently changed to more supportive shoes with some improvement. No trauma reported. Recent weight gain of approximately 15 pounds over past year.",
    objective: "Observation reveals bilateral pes planus, more pronounced on right. Right medial longitudinal arch collapses during stance with associated pronation of subtalar joint. Navicular drop test: Right 14mm, Left 10mm. Windlass test positive on right. Pain with palpation of plantar fascia origin at medial calcaneal tubercle, and along medial band to midfoot. Mild thickening of fascial tissue noted. Limited dorsiflexion of 1st MTP joint on right (45° vs 60° left). Tightness noted in Achilles tendon and gastrocnemius muscle with knee extended (right ankle dorsiflexion 5° with knee extended, 15° with knee flexed). Gait shows early heel lift on right with limited propulsion through first MTP joint.",
    assessment: "Right plantar fasciitis secondary to excessive pronation and limited ankle dorsiflexion. Contributing factors include occupational demands requiring prolonged standing, recent weight gain, and intrinsic foot mechanics (pes planus). Chronicity of symptoms and tissue changes suggest chronic degenerative process consistent with plantar fasciosis.",
    plan: "1. Custom orthotic prescription with medial arch support and heel cushioning. 2. Night splint to maintain ankle dorsiflexion during sleep. 3. Comprehensive stretching program for plantar fascia, Achilles tendon, and gastrocnemius muscle. 4. Progressive strengthening of intrinsic foot muscles and ankle stabilizers. 5. Self-massage with frozen water bottle and golf ball. 6. Activity modification including sitting breaks during workday and appropriate footwear recommendations. 7. Weight management discussion. 8. Follow up in 3 weeks to assess response to interventions."
  },
  general: {
    subjective: "Patient is a 40-year-old presenting for initial evaluation following recent diagnosis of fibromyalgia. Reports widespread pain for approximately 8 months, primarily in neck, shoulders, low back, and hips bilaterally. Describes pain as 'achy' and 'deep,' with intensity fluctuating between 4-8/10 depending on activity level, stress, and weather changes. Reports significant fatigue rated 7/10 that worsens with physical exertion and inadequate sleep. Additional symptoms include non-restorative sleep (averaging 5-6 hours with frequent awakening), morning stiffness lasting 1-2 hours, occasional headaches, and difficulty concentrating. Pain and fatigue significantly limiting ability to perform work duties (office administrator) and household activities. Currently taking duloxetine 30mg daily for past month with minimal improvement thus far.",
    objective: "Tender to palpation in 14/18 fibromyalgia tender points with most significant tenderness in upper trapezius, second rib, and greater trochanter regions bilaterally. Posture demonstrates forward head, rounded shoulders, and increased thoracic kyphosis. General ROM WNL in all joints but reports increased discomfort at end ranges in cervical extension, shoulder flexion, and hip internal rotation. Strength grossly 5/5 throughout but with reports of pain during testing of proximal muscle groups. Endurance testing: Unable to maintain wall squat beyond 20 seconds due to increased pain and fatigue. 30-second sit-to-stand test: 8 repetitions (below age-matched norms). 6-minute walk test: 350 meters with increased pain reported during final 2 minutes. Beck Depression Inventory score of 16 indicating mild depression. Fibromyalgia Impact Questionnaire score of 68/100.",
    assessment: "Fibromyalgia with significant impact on function and quality of life. Presenting with characteristic widespread pain pattern, fatigue, sleep disturbance, and cognitive symptoms. Deconditioning evident in reduced strength endurance and cardiovascular capacity. Mild comorbid depression likely contributing to symptom experience. Currently in early stages of medication management with suboptimal response.",
    plan: "1. Education regarding fibromyalgia pathophysiology, pain science, and self-management strategies. 2. Gradual aerobic exercise program beginning with 5-10 minutes of walking or water-based exercise daily, progressing by 10% weekly as tolerated. 3. Gentle stretching program focusing on most symptomatic regions. 4. Sleep hygiene education and strategies to improve sleep quality. 5. Stress management techniques including diaphragmatic breathing and progressive muscle relaxation. 6. Pacing strategies for daily activities to manage energy conservation. 7. Coordination with referring physician regarding medication management and potential considerations for medication adjustments if needed. 8. Weekly therapy for first month, then reassess frequency based on progress and independence with program."
  },
  other: {
    subjective: "Patient is a 31-year-old healthcare worker presenting with bilateral wrist, hand, and forearm pain developing gradually over the past 3 months. Symptoms began after changing to a new position requiring increased computer documentation. Describes pain as 'burning' and 'pins and needles' affecting both arms from elbows to fingertips, worse on right (dominant) side. Reports nighttime paresthesias and morning stiffness. Pain and numbness increase with sustained typing or smartphone use, rated 6/10 during these activities. Holding phone to ear or driving also exacerbates symptoms. Reports difficulty opening containers and dropping objects more frequently. Sleep disrupted by symptoms 2-3 times per night. Has tried wrist braces from pharmacy with minimal relief.",
    objective: "Observation reveals bilateral forward head and rounded shoulder posture with elevated/protracted scapulae. Upper extremity neural tension tests: Positive median and radial bias ULTT bilaterally, producing familiar symptoms. Cervical ROM WFL but reproduces mild arm symptoms at end-range right rotation and extension. Upper limb neurological screen: Sensation diminished to light touch in C6-C7 distribution bilaterally. Reflexes and strength WNL except for mild weakness (4+/5) of bilateral thumb opposition. Palpation reveals tenderness over the scalene triangle, pectoralis minor, and flexor forearm muscle groups. Thoracic outlet provocation tests: Positive Roos test at 30 seconds bilaterally; positive costoclavicular test right > left. Spurling's test negative. Tinel's and Phalen's tests negative at wrists.",
    assessment: "Neurogenic thoracic outlet syndrome with double crush phenomenon affecting median and radial nerve distributions. Poor upper quarter posture and repeated upper extremity positions during work activities are contributing to neurovascular compression at multiple sites including scalene triangle, costoclavicular space, and pectoralis minor. Symptoms consistent with dynamic nerve compression rather than primary peripheral entrapment neuropathies.",
    plan: "1. Comprehensive postural retraining program focusing on scapular positioning and cervical alignment. 2. Neural mobilization techniques for median and radial nerve pathways. 3. Soft tissue mobilization and stretching for scalenes, pectoralis minor, and suboccipital muscles. 4. Ergonomic assessment of workstation with modifications to minimize elevated arm positioning. 5. Education on activity modification and work pacing, including regular breaks from typing with nerve gliding exercises. 6. Custom fabricated dynamic wrist orthosis for use during prolonged computer work. 7. Home program of postural exercises and nerve mobilizations. 8. Follow up 2x weekly for 4 weeks."
  }
};

async function createSampleNote(userId: number, bodyPart: string, noteData: any) {
  try {
    // Generate patient data
    const patientData = generatePatientData();
    
    // Create the full note with complete data
    const fullNoteData = {
      userId,
      ...patientData,
      ...noteData,
      visibility: 'private', // Start as private
      fullNote: {
        ...patientData,
        ...noteData,
        provider: "Sample Provider, PT",
      }
    };
    
    // First create the clinical note
    const savedNote = await storage.createClinicalNote(fullNoteData);
    
    // Then update it to be public with de-identified info
    const deIdentifiedNote = deIdentifyNote(savedNote);
    const ageRange = calculateAgeRange(patientData.dateOfBirth);
    const condition = extractCondition(savedNote);
    
    // Update visibility to public
    await storage.updateNoteVisibility(savedNote.id, {
      visibility: 'public',
      bodyPart,
      condition,
      ageRange,
      deIdentifiedNote
    });
    
    console.log(`Created sample note for ${bodyPart}`);
    return true;
  } catch (error) {
    console.error(`Error creating sample note for ${bodyPart}:`, error);
    return false;
  }
}

// Main function to create all sample notes
export async function createAllSampleNotes(userId: number) {
  console.log('Creating sample clinical notes for all body parts...');
  
  // Create a sample note for each body part
  for (const bodyPart of Object.keys(sampleNotes)) {
    await createSampleNote(userId, bodyPart, sampleNotes[bodyPart]);
  }
  
  console.log('Sample notes creation completed');
}

// If running directly (not imported)
if (require.main === module) {
  const userId = parseInt(process.argv[2]);
  
  if (isNaN(userId)) {
    console.error('Please provide a valid user ID as the first argument');
    process.exit(1);
  }
  
  createAllSampleNotes(userId)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error creating sample notes:', err);
      process.exit(1);
    });
}