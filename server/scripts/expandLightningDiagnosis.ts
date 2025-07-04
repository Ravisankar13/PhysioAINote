import { db } from '../db.js';
import { competitions, gameContent } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Expands Lightning Diagnosis competitions to have 20 cases each
 * Currently they only have 5 cases, need to expand to 20 for better challenge
 */

const expandedLightningDiagnosisCases = {
  // Wrist Pain Cases
  wrist: [
    { id: "ld_wrist_001", timeLimit: 30, presentation: "25-year-old office worker with gradual onset wrist pain, numbness in thumb/index finger, worse at night", correctDiagnosis: "Carpal tunnel syndrome", redHerrings: ["De Quervain's tenosynovitis", "Wrist arthritis", "Ulnar nerve entrapment"] },
    { id: "ld_wrist_002", timeLimit: 30, presentation: "30-year-old athlete with thumb-side wrist pain after fall on outstretched hand, tender in anatomical snuffbox", correctDiagnosis: "Scaphoid fracture", redHerrings: ["De Quervain's tenosynovitis", "Wrist sprain", "Radial styloid fracture"] },
    { id: "ld_wrist_003", timeLimit: 30, presentation: "35-year-old new mother with thumb pain during lifting baby, positive Finkelstein's test", correctDiagnosis: "De Quervain's tenosynovitis", redHerrings: ["Carpal tunnel syndrome", "Thumb arthritis", "Radial nerve irritation"] },
    { id: "ld_wrist_004", timeLimit: 30, presentation: "50-year-old with gradual wrist stiffness, pain worst in morning, swelling over wrist joint", correctDiagnosis: "Wrist arthritis", redHerrings: ["Carpal tunnel syndrome", "Wrist sprain", "Tendinitis"] },
    { id: "ld_wrist_005", timeLimit: 30, presentation: "22-year-old gymnast with ulnar-sided wrist pain during weight-bearing, clicking sensation", correctDiagnosis: "TFCC tear", redHerrings: ["Ulnar nerve entrapment", "Wrist sprain", "Ulnar styloid fracture"] },
    { id: "ld_wrist_006", timeLimit: 30, presentation: "40-year-old with weakness gripping, numbness in pinky finger, positive Tinel's at Guyon's canal", correctDiagnosis: "Ulnar nerve entrapment", redHerrings: ["Carpal tunnel syndrome", "Cubital tunnel syndrome", "C8 radiculopathy"] },
    { id: "ld_wrist_007", timeLimit: 30, presentation: "28-year-old rock climber with dorsal wrist pain, tender over scapholunate joint, positive Watson test", correctDiagnosis: "Scapholunate ligament injury", redHerrings: ["Scaphoid fracture", "Wrist arthritis", "Ganglion cyst"] },
    { id: "ld_wrist_008", timeLimit: 30, presentation: "45-year-old with visible lump on dorsal wrist, fluctuant, transilluminates", correctDiagnosis: "Ganglion cyst", redHerrings: ["Lipoma", "Bone tumor", "Synovial sarcoma"] },
    { id: "ld_wrist_009", timeLimit: 30, presentation: "32-year-old pianist with dorsal wrist pain during extension, tender over Lister's tubercle", correctDiagnosis: "Intersection syndrome", redHerrings: ["De Quervain's tenosynovitis", "Wrist arthritis", "EPL tendon rupture"] },
    { id: "ld_wrist_010", timeLimit: 30, presentation: "55-year-old diabetic with median nerve symptoms, thenar muscle wasting, positive Phalen's test", correctDiagnosis: "Severe carpal tunnel syndrome", redHerrings: ["C6 radiculopathy", "Pronator syndrome", "Median nerve injury"] },
    { id: "ld_wrist_011", timeLimit: 30, presentation: "38-year-old after distal radius fracture, ongoing pain, limited motion, bone scan positive", correctDiagnosis: "Complex regional pain syndrome", redHerrings: ["Malunion", "Infection", "Tendon rupture"] },
    { id: "ld_wrist_012", timeLimit: 30, presentation: "42-year-old tennis player with ulnar pain during backhand, tender over pisiform", correctDiagnosis: "Pisotriquetral arthritis", redHerrings: ["TFCC tear", "Ulnar nerve entrapment", "Hook of hamate fracture"] },
    { id: "ld_wrist_013", timeLimit: 30, presentation: "26-year-old hockey player with wrist pain after stick check, tender over hook of hamate", correctDiagnosis: "Hook of hamate fracture", redHerrings: ["Ulnar nerve entrapment", "TFCC tear", "Pisiform fracture"] },
    { id: "ld_wrist_014", timeLimit: 30, presentation: "50-year-old rheumatoid arthritis patient with severe wrist deformity, ulnar deviation", correctDiagnosis: "Rheumatoid wrist arthritis", redHerrings: ["Osteoarthritis", "SLAC wrist", "SNAC wrist"] },
    { id: "ld_wrist_015", timeLimit: 30, presentation: "35-year-old with radial wrist pain, weakness extending thumb, unable to lift thumb off table", correctDiagnosis: "EPL tendon rupture", redHerrings: ["De Quervain's tenosynovitis", "Radial nerve palsy", "CMC arthritis"] },
    { id: "ld_wrist_016", timeLimit: 30, presentation: "29-year-old with volar wrist pain, numbness in median distribution, positive carpal tunnel sign", correctDiagnosis: "Acute carpal tunnel syndrome", redHerrings: ["Wrist fracture", "Tendon rupture", "Vascular injury"] },
    { id: "ld_wrist_017", timeLimit: 30, presentation: "45-year-old with chronic wrist pain, scapholunate widening on X-ray, positive scaphoid shift test", correctDiagnosis: "SLAC wrist", redHerrings: ["Rheumatoid arthritis", "Scaphoid nonunion", "Kienböck's disease"] },
    { id: "ld_wrist_018", timeLimit: 30, presentation: "33-year-old with progressive lunate collapse on X-ray, avascular necrosis pattern", correctDiagnosis: "Kienböck's disease", redHerrings: ["Scaphoid fracture", "Wrist arthritis", "SLAC wrist"] },
    { id: "ld_wrist_019", timeLimit: 30, presentation: "24-year-old dancer with radial wrist pain during weight-bearing, tender over first CMC joint", correctDiagnosis: "CMC arthritis", redHerrings: ["De Quervain's tenosynovitis", "Scaphoid fracture", "Radial nerve irritation"] },
    { id: "ld_wrist_020", timeLimit: 30, presentation: "39-year-old with median nerve symptoms only in index finger, proximal to carpal tunnel", correctDiagnosis: "Pronator syndrome", redHerrings: ["Carpal tunnel syndrome", "C6 radiculopathy", "Anterior interosseous syndrome"] }
  ],

  // Foot Pain Cases  
  foot: [
    { id: "ld_foot_001", timeLimit: 30, presentation: "45-year-old runner with heel pain, worst with first steps in morning, tender over medial calcaneus", correctDiagnosis: "Plantar fasciitis", redHerrings: ["Heel spur", "Calcaneal fracture", "Achilles tendinitis"] },
    { id: "ld_foot_002", timeLimit: 30, presentation: "25-year-old basketball player with acute foot pain after landing, tender over 5th metatarsal base", correctDiagnosis: "Jones fracture", redHerrings: ["Avulsion fracture", "Peroneal tendinitis", "Cuboid syndrome"] },
    { id: "ld_foot_003", timeLimit: 30, presentation: "35-year-old with forefoot pain, numbness between 3rd/4th toes, positive Mulder's click", correctDiagnosis: "Morton's neuroma", redHerrings: ["Metatarsalgia", "Stress fracture", "Plantar plate tear"] },
    { id: "ld_foot_004", timeLimit: 30, presentation: "50-year-old diabetic with foot ulcer, red, warm, elevated white count", correctDiagnosis: "Diabetic foot infection", redHerrings: ["Charcot arthropathy", "Gout", "Cellulitis"] },
    { id: "ld_foot_005", timeLimit: 30, presentation: "28-year-old dancer with posterior ankle pain, tender posterior to lateral malleolus", correctDiagnosis: "Peroneal tendinitis", redHerrings: ["Ankle sprain", "Achilles tendinitis", "Sural nerve irritation"] },
    { id: "ld_foot_006", timeLimit: 30, presentation: "42-year-old with big toe pain, red, swollen, warm, history of beer consumption", correctDiagnosis: "Gout", redHerrings: ["Septic arthritis", "Ingrown toenail", "Bunion"] },
    { id: "ld_foot_007", timeLimit: 30, presentation: "30-year-old runner with medial arch pain, flat foot deformity, posterior tibial tendon dysfunction", correctDiagnosis: "Posterior tibial tendon dysfunction", redHerrings: ["Plantar fasciitis", "Tarsal tunnel syndrome", "Stress fracture"] },
    { id: "ld_foot_008", timeLimit: 30, presentation: "55-year-old with dorsal foot pain, tender over navicular, positive single-heel rise test", correctDiagnosis: "Navicular stress fracture", redHerrings: ["Midfoot arthritis", "Lisfranc injury", "Tendinitis"] },
    { id: "ld_foot_009", timeLimit: 30, presentation: "38-year-old with heel pain, burning sensation, numbness on plantar foot, positive Tinel's", correctDiagnosis: "Tarsal tunnel syndrome", redHerrings: ["Plantar fasciitis", "S1 radiculopathy", "Peripheral neuropathy"] },
    { id: "ld_foot_010", timeLimit: 30, presentation: "22-year-old soccer player with midfoot pain after tackle, tender over Lisfranc joint, widening on X-ray", correctDiagnosis: "Lisfranc injury", redHerrings: ["Midfoot sprain", "Metatarsal fracture", "Navicular fracture"] },
    { id: "ld_foot_011", timeLimit: 30, presentation: "48-year-old with chronic Achilles pain, nodular thickening, morning stiffness", correctDiagnosis: "Achilles tendinopathy", redHerrings: ["Achilles rupture", "Retrocalcaneal bursitis", "Haglund's deformity"] },
    { id: "ld_foot_012", timeLimit: 30, presentation: "32-year-old with sudden calf pain during tennis, positive Thompson test, palpable gap", correctDiagnosis: "Achilles tendon rupture", redHerrings: ["Calf strain", "Achilles tendinitis", "Deep vein thrombosis"] },
    { id: "ld_foot_013", timeLimit: 30, presentation: "26-year-old runner with lateral foot pain, tender over 5th metatarsal shaft, gradual onset", correctDiagnosis: "5th metatarsal stress fracture", redHerrings: ["Peroneal tendinitis", "Jones fracture", "Cuboid syndrome"] },
    { id: "ld_foot_014", timeLimit: 30, presentation: "40-year-old with big toe deformity, bunion, pain with tight shoes, hallux valgus", correctDiagnosis: "Hallux valgus (bunion)", redHerrings: ["Gout", "Hallux rigidus", "Sesamoiditis"] },
    { id: "ld_foot_015", timeLimit: 30, presentation: "35-year-old with stiff big toe, pain with dorsiflexion, osteophytes on X-ray", correctDiagnosis: "Hallux rigidus", redHerrings: ["Gout", "Sesamoiditis", "Bunion"] },
    { id: "ld_foot_016", timeLimit: 30, presentation: "29-year-old dancer with pain under big toe, tender over sesamoids, pain with relevé", correctDiagnosis: "Sesamoiditis", redHerrings: ["Hallux rigidus", "Gout", "Plantar plate tear"] },
    { id: "ld_foot_017", timeLimit: 30, presentation: "45-year-old with medial ankle pain, swelling, tender along posterior tibial tendon", correctDiagnosis: "Posterior tibial tendon rupture", redHerrings: ["Ankle sprain", "Tarsal tunnel syndrome", "Stress fracture"] },
    { id: "ld_foot_018", timeLimit: 30, presentation: "33-year-old with lateral foot pain, history of inversion injury, chronic instability", correctDiagnosis: "Chronic ankle instability", redHerrings: ["Peroneal tendon tear", "Osteochondral lesion", "Tarsal coalition"] },
    { id: "ld_foot_019", timeLimit: 30, presentation: "27-year-old with rigid flat foot since childhood, limited subtalar motion, tarsal coalition on CT", correctDiagnosis: "Tarsal coalition", redHerrings: ["Posterior tibial tendon dysfunction", "Arthritis", "Stress fracture"] },
    { id: "ld_foot_020", timeLimit: 30, presentation: "52-year-old diabetic with foot deformity, rocker-bottom foot, Charcot changes on X-ray", correctDiagnosis: "Charcot arthropathy", redHerrings: ["Diabetic foot infection", "Osteoarthritis", "Fracture"] }
  ],

  // Elbow Pain Cases
  elbow: [
    { id: "ld_elbow_001", timeLimit: 30, presentation: "35-year-old tennis player with lateral elbow pain, tender over lateral epicondyle, pain with wrist extension", correctDiagnosis: "Lateral epicondylitis (tennis elbow)", redHerrings: ["Radial tunnel syndrome", "Posterior interosseous nerve syndrome", "Radiohumeral arthritis"] },
    { id: "ld_elbow_002", timeLimit: 30, presentation: "28-year-old golfer with medial elbow pain, tender over medial epicondyle, pain with wrist flexion", correctDiagnosis: "Medial epicondylitis (golfer's elbow)", redHerrings: ["Ulnar nerve entrapment", "MCL injury", "Medial epicondyle fracture"] },
    { id: "ld_elbow_003", timeLimit: 30, presentation: "42-year-old with ulnar nerve symptoms, numbness in pinky finger, positive Tinel's at cubital tunnel", correctDiagnosis: "Cubital tunnel syndrome", redHerrings: ["Ulnar nerve entrapment at wrist", "C8 radiculopathy", "Medial epicondylitis"] },
    { id: "ld_elbow_004", timeLimit: 30, presentation: "25-year-old weightlifter with posterior elbow pain, locking, loose body on X-ray", correctDiagnosis: "Elbow loose body", redHerrings: ["Triceps tendinitis", "Olecranon bursitis", "Posterior impingement"] },
    { id: "ld_elbow_005", timeLimit: 30, presentation: "30-year-old pitcher with medial elbow pain, UCL laxity, positive valgus stress test", correctDiagnosis: "UCL injury", redHerrings: ["Medial epicondylitis", "Ulnar nerve entrapment", "Flexor tendon injury"] },
    { id: "ld_elbow_006", timeLimit: 30, presentation: "45-year-old with swollen elbow, fluctuant mass over olecranon, history of repetitive leaning", correctDiagnosis: "Olecranon bursitis", redHerrings: ["Septic arthritis", "Triceps tendinitis", "Elbow arthritis"] },
    { id: "ld_elbow_007", timeLimit: 30, presentation: "22-year-old gymnast with lateral elbow pain, locking, osteochondral defect on MRI", correctDiagnosis: "Osteochondritis dissecans", redHerrings: ["Lateral epicondylitis", "Radial head fracture", "Radiohumeral arthritis"] },
    { id: "ld_elbow_008", timeLimit: 30, presentation: "50-year-old with elbow stiffness, loss of extension, mechanical symptoms, arthritis on X-ray", correctDiagnosis: "Elbow arthritis", redHerrings: ["Triceps contracture", "Heterotopic ossification", "Loose body"] },
    { id: "ld_elbow_009", timeLimit: 30, presentation: "32-year-old with posterior elbow pain, weakness extending elbow, triceps tendon injury", correctDiagnosis: "Triceps tendon rupture", redHerrings: ["Olecranon fracture", "Triceps tendinitis", "Posterior impingement"] },
    { id: "ld_elbow_010", timeLimit: 30, presentation: "38-year-old with lateral elbow pain, weakness with supination, resistant to epicondylitis treatment", correctDiagnosis: "Posterior interosseous nerve syndrome", redHerrings: ["Lateral epicondylitis", "Radial tunnel syndrome", "Radiohumeral arthritis"] },
    { id: "ld_elbow_011", timeLimit: 30, presentation: "26-year-old rock climber with medial elbow instability, valgus laxity, UCL tear on MRI", correctDiagnosis: "UCL rupture", redHerrings: ["Medial epicondylitis", "Flexor tendon injury", "Ulnar nerve injury"] },
    { id: "ld_elbow_012", timeLimit: 30, presentation: "40-year-old with gradual elbow stiffness, heterotopic bone formation after trauma", correctDiagnosis: "Heterotopic ossification", redHerrings: ["Elbow arthritis", "Myositis ossificans", "Bone tumor"] },
    { id: "ld_elbow_013", timeLimit: 30, presentation: "34-year-old with clicking elbow, snapping lateral elbow, subluxating ulnar nerve", correctDiagnosis: "Snapping triceps syndrome", redHerrings: ["Ulnar nerve subluxation", "Lateral epicondylitis", "Triceps tendinitis"] },
    { id: "ld_elbow_014", timeLimit: 30, presentation: "29-year-old with radial tunnel pain, deep ache, resistant to lateral epicondylitis treatment", correctDiagnosis: "Radial tunnel syndrome", redHerrings: ["Lateral epicondylitis", "Posterior interosseous nerve syndrome", "Radiohumeral arthritis"] },
    { id: "ld_elbow_015", timeLimit: 30, presentation: "36-year-old with distal biceps rupture, positive hook test, weakness with supination", correctDiagnosis: "Distal biceps tendon rupture", redHerrings: ["Biceps tendinitis", "Brachialis strain", "Anterior capsule injury"] },
    { id: "ld_elbow_016", timeLimit: 30, presentation: "44-year-old with chronic elbow pain, synovitis, rheumatoid arthritis history", correctDiagnosis: "Rheumatoid elbow arthritis", redHerrings: ["Osteoarthritis", "Septic arthritis", "Crystalline arthropathy"] },
    { id: "ld_elbow_017", timeLimit: 30, presentation: "31-year-old with acute elbow dislocation, reduced, ongoing instability", correctDiagnosis: "Elbow instability", redHerrings: ["Fracture", "Ligament sprain", "Nerve injury"] },
    { id: "ld_elbow_018", timeLimit: 30, presentation: "27-year-old with medial elbow pain in throwing athlete, valgus extension overload", correctDiagnosis: "Valgus extension overload", redHerrings: ["UCL injury", "Medial epicondylitis", "Triceps tendinitis"] },
    { id: "ld_elbow_019", timeLimit: 30, presentation: "33-year-old with lateral elbow mass, firm, non-tender, slow-growing over months", correctDiagnosis: "Lateral elbow tumor", redHerrings: ["Lipoma", "Ganglion cyst", "Heterotopic ossification"] },
    { id: "ld_elbow_020", timeLimit: 30, presentation: "39-year-old with pronator syndrome, median nerve compression, weakness with pinch", correctDiagnosis: "Pronator syndrome", redHerrings: ["Carpal tunnel syndrome", "Anterior interosseous syndrome", "C6 radiculopathy"] }
  ]
};

async function expandLightningDiagnosisCompetitions() {
  try {
    // Get all Lightning Diagnosis competitions
    const lightningCompetitions = await db
      .select()
      .from(competitions)
      .where(eq(competitions.gameType, 'lightning_diagnosis'));

    console.log(`Found ${lightningCompetitions.length} Lightning Diagnosis competitions to expand`);

    for (const competition of lightningCompetitions) {
      let casesToUse: any[] = [];

      // Determine which cases to use based on competition title
      if (competition.title.toLowerCase().includes('wrist')) {
        casesToUse = expandedLightningDiagnosisCases.wrist;
      } else if (competition.title.toLowerCase().includes('foot')) {
        casesToUse = expandedLightningDiagnosisCases.foot;
      } else if (competition.title.toLowerCase().includes('elbow')) {
        casesToUse = expandedLightningDiagnosisCases.elbow;
      } else {
        // For other competitions, use a mix of all cases
        casesToUse = [
          ...expandedLightningDiagnosisCases.wrist.slice(0, 7),
          ...expandedLightningDiagnosisCases.foot.slice(0, 7),
          ...expandedLightningDiagnosisCases.elbow.slice(0, 6)
        ];
      }

      // Update the game content with 20 cases
      const newContent = {
        lightningDiagnosis: {
          cases: casesToUse
        }
      };

      await db
        .update(gameContent)
        .set({ content: newContent })
        .where(eq(gameContent.competitionId, competition.id));

      console.log(`✓ Updated ${competition.title} with ${casesToUse.length} cases`);
    }

    console.log('✓ Successfully expanded all Lightning Diagnosis competitions to 20 cases each!');
  } catch (error) {
    console.error('Error expanding Lightning Diagnosis competitions:', error);
    throw error;
  }
}

// Run the expansion
expandLightningDiagnosisCompetitions()
  .then(() => {
    console.log('Lightning Diagnosis expansion completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });