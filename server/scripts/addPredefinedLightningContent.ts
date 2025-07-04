import { db } from '../db.js';
import { competitions, gameContent } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function addPredefinedLightningContent() {
  try {
    console.log('Adding predefined Lightning Diagnosis content...');
    
    // Get all lightning_diagnosis competitions without content
    const lightningCompetitions = await db
      .select()
      .from(competitions)
      .where(eq(competitions.gameType, 'lightning_diagnosis'));

    console.log(`Found ${lightningCompetitions.length} Lightning Diagnosis competitions`);

    // Predefined content for different body parts
    const lightningDiagnosisContent = {
      shoulder: {
        cases: [
          {
            id: "ld_shoulder_001",
            presentation: "45-year-old tennis player with sudden onset shoulder pain during serve, unable to continue playing",
            timeLimit: 30,
            correctDiagnosis: "Rotator cuff tear",
            redHerrings: ["Shoulder impingement", "Labral tear", "Biceps tendinitis"]
          },
          {
            id: "ld_shoulder_002", 
            presentation: "28-year-old swimmer with progressive shoulder pain over 3 months, worse with overhead movements",
            timeLimit: 30,
            correctDiagnosis: "Swimmer's shoulder (impingement)",
            redHerrings: ["Rotator cuff tear", "Frozen shoulder", "Acromioclavicular joint sprain"]
          },
          {
            id: "ld_shoulder_003",
            presentation: "65-year-old woman with night pain, weakness reaching overhead, positive drop arm test",
            timeLimit: 30,
            correctDiagnosis: "Full-thickness rotator cuff tear",
            redHerrings: ["Partial rotator cuff tear", "Subacromial bursitis", "Cervical radiculopathy"]
          },
          {
            id: "ld_shoulder_004",
            presentation: "22-year-old volleyball player with anterior shoulder pain after diving save, positive apprehension test",
            timeLimit: 30,
            correctDiagnosis: "Anterior shoulder dislocation/instability",
            redHerrings: ["Labral tear", "AC joint injury", "Rotator cuff strain"]
          },
          {
            id: "ld_shoulder_005",
            presentation: "50-year-old office worker with gradual onset stiffness, unable to reach behind back, restricted external rotation",
            timeLimit: 30,
            correctDiagnosis: "Adhesive capsulitis (frozen shoulder)",
            redHerrings: ["Rotator cuff tear", "Shoulder impingement", "Cervical radiculopathy"]
          }
        ]
      },
      knee: {
        cases: [
          {
            id: "ld_knee_001",
            presentation: "20-year-old soccer player heard 'pop' during cutting maneuver, immediate swelling and inability to continue",
            timeLimit: 30,
            correctDiagnosis: "ACL rupture",
            redHerrings: ["MCL tear", "Meniscal tear", "PCL injury"]
          },
          {
            id: "ld_knee_002",
            presentation: "45-year-old runner with medial knee pain, worse on stairs, tenderness over medial tibiofemoral joint line",
            timeLimit: 30,
            correctDiagnosis: "Medial meniscal tear",
            redHerrings: ["MCL strain", "Medial plica syndrome", "Pes anserine bursitis"]
          },
          {
            id: "ld_knee_003",
            presentation: "16-year-old female basketball player with anterior knee pain, worse with squatting and stairs",
            timeLimit: 30,
            correctDiagnosis: "Patellofemoral pain syndrome",
            redHerrings: ["Patellar tendinopathy", "Plica syndrome", "Osgood-Schlatter disease"]
          },
          {
            id: "ld_knee_004",
            presentation: "35-year-old weekend warrior with lateral knee pain after long hike, tender over IT band insertion",
            timeLimit: 30,
            correctDiagnosis: "Iliotibial band syndrome",
            redHerrings: ["Lateral meniscus tear", "LCL sprain", "Lateral compartment arthritis"]
          },
          {
            id: "ld_knee_005",
            presentation: "14-year-old growing athlete with anterior knee pain below patella, tender over tibial tuberosity",
            timeLimit: 30,
            correctDiagnosis: "Osgood-Schlatter disease",
            redHerrings: ["Patellar tendinopathy", "Patellofemoral pain", "Sinding-Larsen-Johansson syndrome"]
          }
        ]
      },
      back: {
        cases: [
          {
            id: "ld_back_001",
            presentation: "40-year-old office worker with acute lower back pain after lifting box, positive straight leg raise at 30°",
            timeLimit: 30,
            correctDiagnosis: "Lumbar disc herniation with nerve root compression",
            redHerrings: ["Mechanical low back pain", "Facet joint dysfunction", "Piriformis syndrome"]
          },
          {
            id: "ld_back_002",
            presentation: "25-year-old gymnast with lower back extension pain, positive single leg hyperextension test",
            timeLimit: 30,
            correctDiagnosis: "Spondylolysis/spondylolisthesis",
            redHerrings: ["Facet joint syndrome", "Muscle strain", "Disc degeneration"]
          },
          {
            id: "ld_back_003",
            presentation: "55-year-old with morning stiffness, improved with movement, bilateral sacroiliac joint tenderness",
            timeLimit: 30,
            correctDiagnosis: "Sacroiliac joint dysfunction",
            redHerrings: ["Lumbar facet syndrome", "Hip osteoarthritis", "Piriformis syndrome"]
          },
          {
            id: "ld_back_004",
            presentation: "30-year-old new mother with upper back pain, forward head posture, tender upper traps and levator scapulae",
            timeLimit: 30,
            correctDiagnosis: "Upper crossed syndrome/postural dysfunction",
            redHerrings: ["Cervical radiculopathy", "Thoracic outlet syndrome", "Fibromyalgia"]
          },
          {
            id: "ld_back_005",
            presentation: "70-year-old with neurogenic claudication, leg pain worse with walking, relieved by sitting/flexion",
            timeLimit: 30,
            correctDiagnosis: "Lumbar spinal stenosis",
            redHerrings: ["Vascular claudication", "Piriformis syndrome", "Hip osteoarthritis"]
          }
        ]
      },
      neck: {
        cases: [
          {
            id: "ld_neck_001",
            presentation: "35-year-old after rear-end collision, neck pain with headaches, limited cervical rotation",
            timeLimit: 30,
            correctDiagnosis: "Whiplash-associated disorder (WAD)",
            redHerrings: ["Cervical facet syndrome", "Muscle strain", "Cervical disc injury"]
          },
          {
            id: "ld_neck_002",
            presentation: "45-year-old office worker with neck pain radiating to arm, positive Spurling's test",
            timeLimit: 30,
            correctDiagnosis: "Cervical radiculopathy",
            redHerrings: ["Thoracic outlet syndrome", "Carpal tunnel syndrome", "Rotator cuff injury"]
          },
          {
            id: "ld_neck_003",
            presentation: "28-year-old with unilateral neck pain and torticollis after waking up, muscle spasm palpable",
            timeLimit: 30,
            correctDiagnosis: "Acute torticollis/wry neck",
            redHerrings: ["Cervical disc herniation", "Facet joint lock", "Atlantoaxial subluxation"]
          },
          {
            id: "ld_neck_004",
            presentation: "50-year-old with gradual onset neck stiffness, reduced ROM all directions, bone-on-bone crepitus",
            timeLimit: 30,
            correctDiagnosis: "Cervical spondylosis/osteoarthritis",
            redHerrings: ["Rheumatoid arthritis", "Ankylosing spondylitis", "Cervical myelopathy"]
          },
          {
            id: "ld_neck_005",
            presentation: "60-year-old with neck pain, hand weakness, positive Hoffman's sign, gait disturbance",
            timeLimit: 30,
            correctDiagnosis: "Cervical myelopathy",
            redHerrings: ["Cervical radiculopathy", "Peripheral neuropathy", "Multiple sclerosis"]
          }
        ]
      },
      hip: {
        cases: [
          {
            id: "ld_hip_001",
            presentation: "25-year-old dancer with deep groin pain, positive FADIR test, clicking sensation",
            timeLimit: 30,
            correctDiagnosis: "Femoroacetabular impingement (FAI)",
            redHerrings: ["Labral tear", "Hip flexor strain", "Adductor strain"]
          },
          {
            id: "ld_hip_002",
            presentation: "40-year-old runner with lateral hip pain, tender over greater trochanter, pain lying on side",
            timeLimit: 30,
            correctDiagnosis: "Greater trochanteric pain syndrome",
            redHerrings: ["IT band syndrome", "Hip abductor tear", "Lumbar radiculopathy"]
          },
          {
            id: "ld_hip_003",
            presentation: "65-year-old with insidious hip pain, morning stiffness, antalgic gait, reduced internal rotation",
            timeLimit: 30,
            correctDiagnosis: "Hip osteoarthritis",
            redHerrings: ["Trochanteric bursitis", "Lumbar radiculopathy", "Sacroiliac dysfunction"]
          },
          {
            id: "ld_hip_004",
            presentation: "22-year-old hockey player with groin pain after collision, pain with resisted hip adduction",
            timeLimit: 30,
            correctDiagnosis: "Adductor strain",
            redHerrings: ["Hip flexor strain", "Sports hernia", "Osteitis pubis"]
          },
          {
            id: "ld_hip_005",
            presentation: "18-year-old female athlete with anterior hip pain, positive Thomas test, tight hip flexors",
            timeLimit: 30,
            correctDiagnosis: "Hip flexor strain/tendinopathy",
            redHerrings: ["FAI", "Labral tear", "Stress fracture"]
          }
        ]
      }
    };

    for (const competition of lightningCompetitions) {
      // Check if content already exists
      const existingContent = await db
        .select()
        .from(gameContent)
        .where(eq(gameContent.competitionId, competition.id));

      if (existingContent.length > 0) {
        console.log(`Content already exists for competition ${competition.id}: ${competition.title}`);
        continue;
      }

      console.log(`Adding content for: ${competition.title}`);

      // Get appropriate content based on body part
      const bodyPart = competition.bodyPart || 'general';
      const content = lightningDiagnosisContent[bodyPart as keyof typeof lightningDiagnosisContent] || lightningDiagnosisContent.shoulder;

      // Insert game content
      await db.insert(gameContent).values({
        competitionId: competition.id,
        gameType: 'lightning_diagnosis',
        content: { lightningDiagnosis: content }
      });

      console.log(`✓ Added content for competition ${competition.id}: ${competition.title}`);
    }

    console.log('✓ Successfully added all Lightning Diagnosis game content');
    
  } catch (error) {
    console.error('Error adding Lightning Diagnosis content:', error);
    throw error;
  }
}

// Run the function
addPredefinedLightningContent()
  .then(() => {
    console.log('Lightning Diagnosis content setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to setup Lightning Diagnosis content:', error);
    process.exit(1);
  });

export { addPredefinedLightningContent };