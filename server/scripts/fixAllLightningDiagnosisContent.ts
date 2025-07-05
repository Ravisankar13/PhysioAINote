import { db } from '../db.js';
import { competitions, gameContent } from '@shared/schema';
import { eq } from 'drizzle-orm';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Body-part-specific Lightning Diagnosis content
const bodyPartSpecificContent = {
  shoulder: {
    cases: [
      {
        id: "ld_shoulder_1",
        presentation: "Tennis player, 38M, acute shoulder pain during serve, unable to lift arm overhead, positive drop arm test",
        timeLimit: 30,
        correctDiagnosis: "Rotator Cuff Tear",
        redHerrings: ["Shoulder Impingement", "Labral Tear", "Biceps Tendinitis"]
      },
      {
        id: "ld_shoulder_2", 
        presentation: "Swimmer, 24F, gradual onset shoulder pain with overhead activities, positive Hawkins test, arc of pain 80-120°",
        timeLimit: 30,
        correctDiagnosis: "Subacromial Impingement",
        redHerrings: ["Rotator Cuff Tear", "Frozen Shoulder", "AC Joint Arthritis"]
      },
      {
        id: "ld_shoulder_3",
        presentation: "Rugby player, 26M, shoulder dislocation injury, apprehension with abduction/external rotation, positive anterior apprehension test",
        timeLimit: 30,
        correctDiagnosis: "Anterior Shoulder Instability",
        redHerrings: ["Labral Tear", "Hill-Sachs Lesion", "Bankart Lesion"]
      },
      {
        id: "ld_shoulder_4",
        presentation: "Office worker, 45F, gradual onset shoulder stiffness, restricted passive range in all directions, night pain",
        timeLimit: 30,
        correctDiagnosis: "Adhesive Capsulitis (Frozen Shoulder)",
        redHerrings: ["Rotator Cuff Tendinopathy", "Arthritis", "Impingement"]
      },
      {
        id: "ld_shoulder_5",
        presentation: "Weightlifter, 32M, anterior shoulder pain, tender bicipital groove, positive Speed's test, pain with biceps contraction",
        timeLimit: 30,
        correctDiagnosis: "Biceps Tendinopathy",
        redHerrings: ["Labral Tear", "Impingement", "AC Joint Sprain"]
      }
    ]
  },
  
  knee: {
    cases: [
      {
        id: "ld_knee_1",
        presentation: "Soccer player, 22M, non-contact injury with pop, immediate swelling, positive Lachman test, giving way sensation",
        timeLimit: 30,
        correctDiagnosis: "ACL Rupture", 
        redHerrings: ["MCL Sprain", "Meniscal Tear", "PCL Injury"]
      },
      {
        id: "ld_knee_2",
        presentation: "Runner, 28F, gradual onset anterior knee pain, worse with stairs, positive patellar grind test, crepitus",
        timeLimit: 30,
        correctDiagnosis: "Patellofemoral Pain Syndrome",
        redHerrings: ["Patellar Tendinopathy", "ITB Syndrome", "Chondromalacia"]
      },
      {
        id: "ld_knee_3", 
        presentation: "Basketball player, 19M, medial knee pain after contact, positive valgus stress test, tender MCL",
        timeLimit: 30,
        correctDiagnosis: "MCL Sprain",
        redHerrings: ["ACL Injury", "Meniscal Tear", "Medial Plica"]
      },
      {
        id: "ld_knee_4",
        presentation: "Dancer, 25F, catching/locking sensation, positive McMurray test, joint line tenderness",
        timeLimit: 30,
        correctDiagnosis: "Meniscal Tear",
        redHerrings: ["ACL Injury", "Loose Body", "Plica Syndrome"]
      },
      {
        id: "ld_knee_5",
        presentation: "Cyclist, 35M, lateral knee pain, tender IT band, positive Ober test, pain with repetitive flexion/extension",
        timeLimit: 30,
        correctDiagnosis: "IT Band Syndrome",
        redHerrings: ["Lateral Meniscus Tear", "LCL Sprain", "Popliteus Strain"]
      }
    ]
  },

  ankle: {
    cases: [
      {
        id: "ld_ankle_1",
        presentation: "Soccer player, 20M, inversion injury, lateral ankle pain and swelling, positive anterior drawer test",
        timeLimit: 30,
        correctDiagnosis: "Lateral Ankle Sprain",
        redHerrings: ["Peroneal Tendon Injury", "Fibular Fracture", "Syndesmosis Sprain"]
      },
      {
        id: "ld_ankle_2",
        presentation: "Runner, 30F, gradual onset posterior ankle pain, morning stiffness, tender Achilles tendon, fusiform swelling",
        timeLimit: 30,
        correctDiagnosis: "Achilles Tendinopathy",
        redHerrings: ["Achilles Rupture", "Retrocalcaneal Bursitis", "Plantaris Rupture"]
      },
      {
        id: "ld_ankle_3",
        presentation: "Ballet dancer, 24F, medial ankle pain, tender posterior tibialis tendon, positive too-many-toes sign",
        timeLimit: 30,
        correctDiagnosis: "Posterior Tibialis Tendon Dysfunction",
        redHerrings: ["Deltoid Ligament Sprain", "Tarsal Tunnel Syndrome", "Stress Fracture"]
      },
      {
        id: "ld_ankle_4",
        presentation: "Football player, 28M, high ankle sprain mechanism, pain with external rotation, positive squeeze test",
        timeLimit: 30,
        correctDiagnosis: "Syndesmosis Sprain",
        redHerrings: ["Lateral Ankle Sprain", "Fibular Fracture", "Deltoid Sprain"]
      },
      {
        id: "ld_ankle_5",
        presentation: "Hiker, 45M, heel pain first steps in morning, tender plantar fascia, positive windlass test",
        timeLimit: 30,
        correctDiagnosis: "Plantar Fasciitis",
        redHerrings: ["Heel Spur", "Fat Pad Syndrome", "Tarsal Tunnel Syndrome"]
      }
    ]
  },

  hip: {
    cases: [
      {
        id: "ld_hip_1",
        presentation: "Runner, 35F, deep groin pain, clicking sensation with hip flexion, positive FADIR test",
        timeLimit: 30,
        correctDiagnosis: "Femoroacetabular Impingement (FAI)",
        redHerrings: ["Labral Tear", "Hip Flexor Strain", "Stress Fracture"]
      },
      {
        id: "ld_hip_2",
        presentation: "Elderly woman, 75F, sudden onset hip pain after fall, unable to weight bear, shortened/externally rotated leg",
        timeLimit: 30,
        correctDiagnosis: "Hip Fracture",
        redHerrings: ["Greater Trochanter Bursitis", "Hip Arthritis", "Muscle Strain"]
      },
      {
        id: "ld_hip_3",
        presentation: "Dancer, 22F, lateral hip pain, tender greater trochanter, pain lying on side, positive Trendelenburg test",
        timeLimit: 30,
        correctDiagnosis: "Greater Trochanteric Pain Syndrome",
        redHerrings: ["IT Band Syndrome", "Hip Labral Tear", "Gluteal Tendinopathy"]
      },
      {
        id: "ld_hip_4",
        presentation: "Soccer player, 18M, anterior hip/groin pain, tender hip flexors, pain with resisted hip flexion",
        timeLimit: 30,
        correctDiagnosis: "Hip Flexor Strain",
        redHerrings: ["Sports Hernia", "FAI", "Adductor Strain"]
      },
      {
        id: "ld_hip_5",
        presentation: "Middle-aged adult, 55M, deep hip pain, morning stiffness >30 minutes, positive FABER test",
        timeLimit: 30,
        correctDiagnosis: "Hip Osteoarthritis",
        redHerrings: ["Labral Tear", "Bursitis", "Muscle Strain"]
      }
    ]
  },

  back: {
    cases: [
      {
        id: "ld_back_1",
        presentation: "Weightlifter, 28M, acute low back pain after deadlift, leg pain to foot, positive SLR test, decreased reflexes",
        timeLimit: 30,
        correctDiagnosis: "Lumbar Disc Herniation with Radiculopathy",
        redHerrings: ["Muscle Strain", "Facet Joint Sprain", "Piriformis Syndrome"]
      },
      {
        id: "ld_back_2",
        presentation: "Office worker, 45F, chronic low back pain, worse with extension, better sitting, leg claudication symptoms",
        timeLimit: 30,
        correctDiagnosis: "Lumbar Spinal Stenosis",
        redHerrings: ["Disc Degeneration", "Facet Arthritis", "Spondylolisthesis"]
      },
      {
        id: "ld_back_3",
        presentation: "Teenager, 16M, low back pain with sports, worse with extension, positive one-leg hyperextension test",
        timeLimit: 30,
        correctDiagnosis: "Spondylolysis",
        redHerrings: ["Muscle Strain", "Disc Injury", "Facet Sprain"]
      },
      {
        id: "ld_back_4",
        presentation: "Construction worker, 40M, acute low back pain, muscle spasm, no radiation, negative neurological tests",
        timeLimit: 30,
        correctDiagnosis: "Lumbar Muscle Strain",
        redHerrings: ["Disc Herniation", "Facet Sprain", "Ligament Injury"]
      },
      {
        id: "ld_back_5",
        presentation: "Runner, 32F, low back pain with extension, tender facet joints, positive facet loading test",
        timeLimit: 30,
        correctDiagnosis: "Facet Joint Dysfunction",
        redHerrings: ["Muscle Strain", "Disc Injury", "Sacroiliac Dysfunction"]
      }
    ]
  },

  neck: {
    cases: [
      {
        id: "ld_neck_1",
        presentation: "Office worker, 35F, gradual neck pain, headaches, forward head posture, tender upper traps",
        timeLimit: 30,
        correctDiagnosis: "Cervical Postural Syndrome",
        redHerrings: ["Tension Headache", "Cervical Strain", "TMJ Dysfunction"]
      },
      {
        id: "ld_neck_2",
        presentation: "Car accident victim, 28M, neck pain and stiffness, restricted rotation, muscle guarding",
        timeLimit: 30,
        correctDiagnosis: "Whiplash (Cervical Strain)",
        redHerrings: ["Cervical Fracture", "Disc Injury", "Muscle Contusion"]
      },
      {
        id: "ld_neck_3",
        presentation: "Student, 22F, neck pain with arm numbness, positive Spurling's test, decreased C6 reflexes",
        timeLimit: 30,
        correctDiagnosis: "Cervical Radiculopathy",
        redHerrings: ["Thoracic Outlet Syndrome", "Carpal Tunnel", "Muscle Strain"]
      },
      {
        id: "ld_neck_4",
        presentation: "Athlete, 25M, neck pain after contact injury, point tenderness C5 spinous process, muscle spasm",
        timeLimit: 30,
        correctDiagnosis: "Cervical Facet Joint Sprain",
        redHerrings: ["Muscle Strain", "Disc Injury", "Ligament Sprain"]
      },
      {
        id: "ld_neck_5",
        presentation: "Elderly person, 68F, neck stiffness, arm weakness, positive Hoffman's sign, gait disturbance",
        timeLimit: 30,
        correctDiagnosis: "Cervical Myelopathy",
        redHerrings: ["Radiculopathy", "Arthritis", "Muscle Weakness"]
      }
    ]
  },

  elbow: {
    cases: [
      {
        id: "ld_elbow_1",
        presentation: "Tennis player, 38M, lateral elbow pain, worse with gripping, tender lateral epicondyle, positive Cozen's test",
        timeLimit: 30,
        correctDiagnosis: "Lateral Epicondylalgia (Tennis Elbow)",
        redHerrings: ["Radial Tunnel Syndrome", "Elbow Arthritis", "Ligament Sprain"]
      },
      {
        id: "ld_elbow_2",
        presentation: "Golfer, 45F, medial elbow pain, worse with gripping, tender medial epicondyle, positive golfer's elbow test",
        timeLimit: 30,
        correctDiagnosis: "Medial Epicondylalgia (Golfer's Elbow)", 
        redHerrings: ["Ulnar Nerve Entrapment", "Elbow Arthritis", "MCL Sprain"]
      },
      {
        id: "ld_elbow_3",
        presentation: "Baseball pitcher, 19M, medial elbow pain, worse with throwing, valgus stress pain, UCL tenderness",
        timeLimit: 30,
        correctDiagnosis: "UCL Injury",
        redHerrings: ["Medial Epicondylitis", "Flexor Tendon Strain", "Ulnar Neuritis"]
      },
      {
        id: "ld_elbow_4",
        presentation: "Computer worker, 42F, elbow and forearm pain, numbness in pinky/ring finger, positive Tinel's sign at elbow",
        timeLimit: 30,
        correctDiagnosis: "Cubital Tunnel Syndrome",
        redHerrings: ["Medial Epicondylitis", "Ulnar Collateral Ligament Sprain", "Carpal Tunnel Syndrome"]
      },
      {
        id: "ld_elbow_5",
        presentation: "Young athlete, 14M, lateral elbow pain, tender radiocapitellar joint, positive radiocapitellar compression test",
        timeLimit: 30,
        correctDiagnosis: "Osteochondritis Dissecans",
        redHerrings: ["Lateral Epicondylitis", "Radial Head Fracture", "Ligament Sprain"]
      }
    ]
  },

  wrist: {
    cases: [
      {
        id: "ld_wrist_1", 
        presentation: "Office worker, 35F, numbness in thumb/index/middle fingers, worse at night, positive Tinel's and Phalen's signs",
        timeLimit: 30,
        correctDiagnosis: "Carpal Tunnel Syndrome",
        redHerrings: ["Cubital Tunnel Syndrome", "Thoracic Outlet Syndrome", "Pronator Teres Syndrome"]
      },
      {
        id: "ld_wrist_2",
        presentation: "New mother, 32F, thumb-side wrist pain, positive Finkelstein test, tender first dorsal compartment",
        timeLimit: 30,
        correctDiagnosis: "De Quervain's Tenosynovitis",
        redHerrings: ["Scaphoid Fracture", "CMC Arthritis", "Intersection Syndrome"]
      },
      {
        id: "ld_wrist_3",
        presentation: "Fall victim, 25M, wrist pain after fall on outstretched hand, tender scaphoid, pain with axial loading",
        timeLimit: 30,
        correctDiagnosis: "Scaphoid Fracture",
        redHerrings: ["Colles Fracture", "TFCC Tear", "Wrist Sprain"]
      },
      {
        id: "ld_wrist_4",
        presentation: "Gymnast, 18F, ulnar-sided wrist pain, clicking with rotation, positive TFCC compression test",
        timeLimit: 30,
        correctDiagnosis: "TFCC Tear",
        redHerrings: ["Ulnar Styloid Fracture", "ECU Tendinopathy", "Lunotriquetral Ligament Injury"]
      },
      {
        id: "ld_wrist_5",
        presentation: "Elderly person, 70M, wrist deformity after fall, dinner fork appearance, dorsally angulated fracture",
        timeLimit: 30,
        correctDiagnosis: "Colles Fracture",
        redHerrings: ["Scaphoid Fracture", "Smith Fracture", "Barton Fracture"]
      }
    ]
  },

  foot: {
    cases: [
      {
        id: "ld_foot_1",
        presentation: "Runner, 28F, heel pain first steps in morning, tender plantar fascia origin, positive windlass test",
        timeLimit: 30,
        correctDiagnosis: "Plantar Fasciitis",
        redHerrings: ["Heel Spur", "Fat Pad Syndrome", "Tarsal Tunnel Syndrome"]
      },
      {
        id: "ld_foot_2",
        presentation: "Soccer player, 25M, midfoot pain after tackle, swelling dorsum of foot, tender base of 5th metatarsal",
        timeLimit: 30,
        correctDiagnosis: "Jones Fracture",
        redHerrings: ["Lisfranc Injury", "Metatarsal Stress Fracture", "Midfoot Sprain"]
      },
      {
        id: "ld_foot_3",
        presentation: "Runner, 35F, forefoot pain between 3rd/4th toes, positive Mulder's click, numbness in web space",
        timeLimit: 30,
        correctDiagnosis: "Morton's Neuroma",
        redHerrings: ["Metatarsalgia", "Stress Fracture", "Plantar Plate Tear"]
      },
      {
        id: "ld_foot_4",
        presentation: "Dancer, 22F, big toe pain and stiffness, limited dorsiflexion, tender 1st MTP joint",
        timeLimit: 30,
        correctDiagnosis: "Hallux Rigidus",
        redHerrings: ["Hallux Valgus", "Sesamoiditis", "Gout"]
      },
      {
        id: "ld_foot_5",
        presentation: "Basketball player, 19M, medial foot pain and numbness, positive Tinel's sign behind medial malleolus",
        timeLimit: 30,
        correctDiagnosis: "Tarsal Tunnel Syndrome",
        redHerrings: ["Plantar Fasciitis", "Posterior Tibialis Tendinopathy", "Stress Fracture"]
      }
    ]
  }
};

async function fixAllLightningDiagnosisContent() {
  try {
    console.log('🔧 Fixing all Lightning Diagnosis game content with body-part-specific questions...');
    
    // Get all lightning_diagnosis competitions
    const lightningCompetitions = await db
      .select()
      .from(competitions)
      .where(eq(competitions.gameType, 'lightning_diagnosis'));

    console.log(`Found ${lightningCompetitions.length} Lightning Diagnosis competitions`);

    for (const competition of lightningCompetitions) {
      console.log(`\n📝 Processing: ${competition.title} (Body Part: ${competition.bodyPart})`);
      
      // Delete existing content for this competition
      await db
        .delete(gameContent)
        .where(eq(gameContent.competitionId, competition.id));

      // Get body-part-specific content
      const bodyPart = competition.bodyPart || 'shoulder';
      let cases = bodyPartSpecificContent[bodyPart as keyof typeof bodyPartSpecificContent];
      
      if (!cases) {
        console.log(`⚠️  No specific content for body part '${bodyPart}', using shoulder content as fallback`);
        cases = bodyPartSpecificContent.shoulder;
      }

      // Expand to 20 questions using AI generation for the remaining 15
      const additionalCases = await generateAdditionalCases(bodyPart, cases.cases.length);
      const allCases = [...cases.cases, ...additionalCases];

      // Create new content with body-part-specific cases
      const lightningContent = {
        cases: allCases
      };

      // Insert new game content
      await db.insert(gameContent).values({
        competitionId: competition.id,
        gameType: 'lightning_diagnosis',
        content: { lightningDiagnosis: lightningContent }
      });

      console.log(`✅ Updated content for ${competition.title} with ${allCases.length} ${bodyPart}-specific questions`);
    }

    console.log('\n🎉 Successfully fixed all Lightning Diagnosis competitions with body-part-specific content!');
    
  } catch (error) {
    console.error('❌ Error fixing Lightning Diagnosis content:', error);
    throw error;
  }
}

async function generateAdditionalCases(bodyPart: string, startingCount: number) {
  const prompt = `Generate 15 additional lightning diagnosis cases for ${bodyPart} physiotherapy to complement existing cases.

Each case should be:
- Brief clinical presentation (1-2 sentences)
- 30-second time limit 
- Clear correct diagnosis specific to ${bodyPart}
- 3 realistic red herrings/distractors
- Intermediate to advanced difficulty
- Unique from common ${bodyPart} conditions already covered

Format as JSON array:
[
  {
    "id": "ld_${bodyPart}_${startingCount + 1}",
    "presentation": "Brief clinical scenario...",
    "timeLimit": 30,
    "correctDiagnosis": "Specific diagnosis",
    "redHerrings": ["Distractor 1", "Distractor 2", "Distractor 3"]
  }
]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"cases": []}');
    return result.cases || [];
  } catch (error) {
    console.error('Error generating additional cases:', error);
    return [];
  }
}

// Run the function
fixAllLightningDiagnosisContent()
  .then(() => {
    console.log('Lightning Diagnosis content fix complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to fix Lightning Diagnosis content:', error);
    process.exit(1);
  });

export { fixAllLightningDiagnosisContent };