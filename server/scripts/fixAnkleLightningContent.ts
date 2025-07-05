#!/usr/bin/env tsx

/**
 * Script to fix Ankle Lightning Diagnosis content
 * Generates 20 ankle-specific diagnostic questions for the Ankle Trauma Sprint competition
 */

import { db } from '../db.js';
import { gameContent } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

async function generateAnkleLightningContent() {
  console.log('🏃‍♂️ Fixing Ankle Lightning Diagnosis content...');

  // Ankle-specific Lightning Diagnosis questions
  const ankleQuestions = [
    {
      id: "ankle_001",
      timeLimit: 30,
      presentation: "22-year-old basketball player lands awkwardly on opponent's foot, immediate sharp pain on lateral ankle with inability to bear weight",
      correctDiagnosis: "Lateral ankle sprain (Grade II-III)",
      redHerrings: ["Achilles tendon rupture", "Peroneal tendon dislocation", "Jones fracture"]
    },
    {
      id: "ankle_002", 
      timeLimit: 30,
      presentation: "45-year-old runner with gradual onset posterior ankle pain, morning stiffness, and painful 'squeeze test'",
      correctDiagnosis: "Achilles tendinopathy",
      redHerrings: ["Posterior impingement", "Retrocalcaneal bursitis", "Plantar fasciitis"]
    },
    {
      id: "ankle_003",
      timeLimit: 30,
      presentation: "30-year-old dancer with chronic anterior ankle pain, worse during dorsiflexion, clicking sensation",
      correctDiagnosis: "Anterior ankle impingement",
      redHerrings: ["Anterior talofibular ligament sprain", "Osteochondral lesion", "Tibialis anterior strain"]
    },
    {
      id: "ankle_004",
      timeLimit: 30,
      presentation: "18-year-old soccer player with acute lateral ankle injury, heard 'pop', positive anterior drawer test",
      correctDiagnosis: "Anterior talofibular ligament rupture",
      redHerrings: ["Calcaneofibular ligament sprain", "Fibular fracture", "Subtalar joint injury"]
    },
    {
      id: "ankle_005",
      timeLimit: 30,
      presentation: "35-year-old hiker with medial ankle pain after rolling ankle inward, tenderness over deltoid ligament",
      correctDiagnosis: "Deltoid ligament sprain",
      redHerrings: ["Medial malleolar fracture", "Tibialis posterior dysfunction", "Navicular stress fracture"]
    },
    {
      id: "ankle_006",
      timeLimit: 30,
      presentation: "25-year-old football player with 5th metatarsal base fracture after ankle inversion, sharp lateral foot pain",
      correctDiagnosis: "Jones fracture",
      redHerrings: ["Avulsion fracture", "Cuboid syndrome", "Peroneus brevis strain"]
    },
    {
      id: "ankle_007",
      timeLimit: 30,
      presentation: "40-year-old worker falls from height, severe ankle deformity, unable to bear weight, obvious swelling",
      correctDiagnosis: "Ankle fracture-dislocation",
      redHerrings: ["Severe ankle sprain", "Subtalar dislocation", "Calcaneal fracture"]
    },
    {
      id: "ankle_008",
      timeLimit: 30,
      presentation: "28-year-old runner with deep posterior ankle pain, positive Thompson test, palpable gap in tendon",
      correctDiagnosis: "Achilles tendon rupture",
      redHerrings: ["Achilles tendinopathy", "Gastrocnemius strain", "Posterior ankle impingement"]
    },
    {
      id: "ankle_009",
      timeLimit: 30,
      presentation: "32-year-old tennis player with lateral ankle instability, recurrent sprains, positive talar tilt test",
      correctDiagnosis: "Chronic ankle instability",
      redHerrings: ["Peroneal tendon subluxation", "Sinus tarsi syndrome", "Lateral impingement"]
    },
    {
      id: "ankle_010",
      timeLimit: 30,
      presentation: "20-year-old gymnast with posteromedial ankle pain, clicking behind medial malleolus during movement",
      correctDiagnosis: "Tibialis posterior tendon subluxation",
      redHerrings: ["Flexor hallucis longus tendinopathy", "Medial ankle impingement", "Deltoid ligament injury"]
    },
    {
      id: "ankle_011",
      timeLimit: 30,
      presentation: "50-year-old with diabetes, gradual ankle deformity, loss of arch, 'too many toes' sign",
      correctDiagnosis: "Posterior tibial tendon dysfunction (Adult flatfoot)",
      redHerrings: ["Charcot foot", "Achilles contracture", "Deltoid ligament insufficiency"]
    },
    {
      id: "ankle_012",
      timeLimit: 30,
      presentation: "26-year-old runner with lateral ankle pain behind fibula, snapping sensation with ankle movement",
      correctDiagnosis: "Peroneal tendon subluxation",
      redHerrings: ["Lateral ankle sprain", "Fibular stress fracture", "Sinus tarsi syndrome"]
    },
    {
      id: "ankle_013",
      timeLimit: 30,
      presentation: "35-year-old with chronic lateral ankle pain, deep aching in sinus tarsi area, unstable on uneven ground",
      correctDiagnosis: "Sinus tarsi syndrome",
      redHerrings: ["Chronic ankle instability", "Subtalar arthritis", "Lateral impingement"]
    },
    {
      id: "ankle_014",
      timeLimit: 30,
      presentation: "42-year-old ballet dancer with posterior ankle pain, painful plantarflexion, positive impingement test",
      correctDiagnosis: "Posterior ankle impingement",
      redHerrings: ["Achilles tendinopathy", "Flexor hallucis longus tendinopathy", "Os trigonum syndrome"]
    },
    {
      id: "ankle_015",
      timeLimit: 30,
      presentation: "19-year-old basketball player with high ankle sprain mechanism, pain with external rotation and dorsiflexion",
      correctDiagnosis: "Syndesmotic injury (High ankle sprain)",
      redHerrings: ["Lateral ankle sprain", "Fibular fracture", "Deltoid ligament injury"]
    },
    {
      id: "ankle_016",
      timeLimit: 30,
      presentation: "38-year-old with tarsal tunnel symptoms, burning pain and numbness in plantar foot, positive Tinel's sign",
      correctDiagnosis: "Tarsal tunnel syndrome",
      redHerrings: ["Plantar fasciitis", "Morton's neuroma", "Tibialis posterior tendinopathy"]
    },
    {
      id: "ankle_017",
      timeLimit: 30,
      presentation: "24-year-old soccer player with anteromedial ankle pain during push-off, tender over talar dome",
      correctDiagnosis: "Osteochondral lesion of talus",
      redHerrings: ["Medial ankle impingement", "Deltoid ligament sprain", "Tibialis anterior tendinopathy"]
    },
    {
      id: "ankle_018",
      timeLimit: 30,
      presentation: "45-year-old with gradual onset ankle stiffness, morning pain, decreased range of motion, joint space narrowing",
      correctDiagnosis: "Ankle osteoarthritis",
      redHerrings: ["Achilles tendinopathy", "Anterior impingement", "Subtalar joint arthritis"]
    },
    {
      id: "ankle_019",
      timeLimit: 30,
      presentation: "29-year-old dancer with medial ankle pain, weakness in plantarflexion and inversion, MRI shows tendon tear",
      correctDiagnosis: "Tibialis posterior tendon tear",
      redHerrings: ["Deltoid ligament injury", "Flexor digitorum longus injury", "Medial ankle impingement"]
    },
    {
      id: "ankle_020",
      timeLimit: 30,
      presentation: "17-year-old track athlete with repetitive lateral ankle pain, tenderness over fibular head, positive hop test",
      correctDiagnosis: "Fibular stress fracture",
      redHerrings: ["Peroneal tendinopathy", "Lateral compartment syndrome", "Chronic ankle instability"]
    }
  ];

  const ankleContent = {
    lightning_diagnosis: {
      cases: ankleQuestions
    }
  };

  try {
    // Update the game content for competition ID 60 (Ankle Trauma Sprint)
    const result = await db
      .update(gameContent)
      .set({ content: ankleContent })
      .where(eq(gameContent.competitionId, 60))
      .returning();

    if (result.length === 0) {
      // If no existing content, create new entry
      await db.insert(gameContent).values({
        competitionId: 60,
        gameType: 'lightning_diagnosis',
        content: ankleContent
      });
      console.log('✅ Created new ankle Lightning Diagnosis content for competition 60');
    } else {
      console.log('✅ Updated ankle Lightning Diagnosis content for competition 60');
    }

    console.log(`📊 Generated ${ankleQuestions.length} ankle-specific Lightning Diagnosis questions`);
    console.log('🎯 All questions focus on ankle injuries, conditions, and pathologies');
    
  } catch (error) {
    console.error('❌ Error updating ankle Lightning Diagnosis content:', error);
    throw error;
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAnkleLightningContent()
    .then(() => {
      console.log('🚀 Ankle Lightning Diagnosis content generation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { generateAnkleLightningContent };