#!/usr/bin/env tsx

/**
 * Tournament Lightning Diagnosis Content Generator
 * Creates progressive difficulty content for Diagnosis Duel tournaments
 */

import { db } from '../db.js';
import { gameContent } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

interface LightningQuestion {
  id: string;
  case_number: number;
  patient_presentation: string;
  clinical_findings: string;
  question: string;
  options: string[];
  correct_answer: string;
  time_limit: number;
  difficulty: 'easy' | 'medium' | 'hard';
  body_part: string;
  rationale: string;
}

// Round 1: Easy Questions (30 seconds each)
const easyQuestions: LightningQuestion[] = [
  {
    id: "easy_1",
    case_number: 1,
    patient_presentation: "22-year-old soccer player with immediate onset ankle pain after landing awkwardly during a game.",
    clinical_findings: "Lateral ankle swelling, point tenderness over ATFL, positive anterior drawer test.",
    question: "What is the most likely diagnosis?",
    options: [
      "Lateral ankle sprain",
      "Achilles tendinopathy", 
      "Peroneal tendon subluxation",
      "Ankle fracture"
    ],
    correct_answer: "Lateral ankle sprain",
    time_limit: 30,
    difficulty: 'easy',
    body_part: 'ankle',
    rationale: "Classic presentation of lateral ankle sprain with ATFL involvement, common in soccer players."
  },
  {
    id: "easy_2", 
    case_number: 2,
    patient_presentation: "45-year-old office worker with gradual onset shoulder pain over 3 months, worse with overhead activities.",
    clinical_findings: "Painful arc 60-120°, positive Hawkins test, weakness in external rotation.",
    question: "What is the primary diagnosis?",
    options: [
      "Frozen shoulder",
      "Subacromial impingement",
      "Rotator cuff tear",
      "AC joint arthritis"
    ],
    correct_answer: "Subacromial impingement",
    time_limit: 30,
    difficulty: 'easy',
    body_part: 'shoulder',
    rationale: "Painful arc and positive Hawkins test are classic signs of subacromial impingement syndrome."
  },
  {
    id: "easy_3",
    case_number: 3,
    patient_presentation: "35-year-old runner with gradual onset heel pain, worst in the morning and after periods of rest.",
    clinical_findings: "Point tenderness at medial calcaneal tuberosity, pain with passive dorsiflexion, tight calf muscles.",
    question: "What is the most likely diagnosis?",
    options: [
      "Achilles tendinopathy",
      "Plantar fasciitis",
      "Calcaneal stress fracture",
      "Tarsal tunnel syndrome"
    ],
    correct_answer: "Plantar fasciitis",
    time_limit: 30,
    difficulty: 'easy',
    body_part: 'foot',
    rationale: "Classic morning pain and medial heel tenderness are hallmarks of plantar fasciitis."
  },
  {
    id: "easy_4",
    case_number: 4,
    patient_presentation: "28-year-old tennis player with lateral elbow pain developing over 2 weeks of increased playing.",
    clinical_findings: "Tenderness over lateral epicondyle, pain with resisted wrist extension, grip strength reduced.",
    question: "What is the primary diagnosis?",
    options: [
      "Lateral epicondylitis",
      "Medial epicondylitis", 
      "Radial tunnel syndrome",
      "Posterior interosseous nerve entrapment"
    ],
    correct_answer: "Lateral epicondylitis",
    time_limit: 30,
    difficulty: 'easy',
    body_part: 'elbow',
    rationale: "Tennis elbow (lateral epicondylitis) with classic presentation in a tennis player."
  },
  {
    id: "easy_5",
    case_number: 5,
    patient_presentation: "42-year-old desk worker with neck pain and headaches after a motor vehicle accident 1 week ago.",
    clinical_findings: "Reduced cervical ROM, upper trapezius muscle spasm, headaches radiating from occiput.",
    question: "What is the most likely diagnosis?",
    options: [
      "Cervical radiculopathy",
      "Whiplash-associated disorder",
      "Cervical myelopathy",
      "Torticollis"
    ],
    correct_answer: "Whiplash-associated disorder",
    time_limit: 30,
    difficulty: 'easy',
    body_part: 'neck',
    rationale: "Recent MVA with neck pain and headaches suggests whiplash-associated disorder."
  }
];

// Round 2: Medium Questions (25 seconds each)
const mediumQuestions: LightningQuestion[] = [
  {
    id: "medium_1",
    case_number: 6,
    patient_presentation: "55-year-old construction worker with 6-month history of knee pain, worse with stairs and kneeling.",
    clinical_findings: "Crepitus with knee flexion, joint line tenderness, positive McMurray test, mild effusion.",
    question: "What is the most likely combined diagnosis?",
    options: [
      "Patellofemoral pain syndrome only",
      "Meniscal tear with early osteoarthritis",
      "Patellar tendinopathy",
      "Iliotibial band syndrome"
    ],
    correct_answer: "Meniscal tear with early osteoarthritis",
    time_limit: 25,
    difficulty: 'medium',
    body_part: 'knee',
    rationale: "Positive McMurray test suggests meniscal tear, while crepitus and age suggest early OA."
  },
  {
    id: "medium_2",
    case_number: 7,
    patient_presentation: "38-year-old weightlifter with sudden onset lower back pain during deadlifting, with radiation to right leg.",
    clinical_findings: "Positive straight leg raise at 45°, L5 dermatomal numbness, diminished Achilles reflex.",
    question: "What nerve root is most likely affected?",
    options: [
      "L4 nerve root",
      "L5 nerve root", 
      "S1 nerve root",
      "S2 nerve root"
    ],
    correct_answer: "S1 nerve root",
    time_limit: 25,
    difficulty: 'medium',
    body_part: 'back',
    rationale: "Diminished Achilles reflex and specific pattern suggests S1 nerve root involvement."
  },
  {
    id: "medium_3",
    case_number: 8,
    patient_presentation: "29-year-old basketball player with chronic groin pain, worse with cutting movements and hip flexion.",
    clinical_findings: "Pain with resisted hip adduction, positive squeeze test, tenderness at adductor longus insertion.",
    question: "What is the most specific diagnosis?",
    options: [
      "Hip flexor strain",
      "Adductor longus tendinopathy",
      "Athletic pubalgia (sports hernia)",
      "Hip impingement"
    ],
    correct_answer: "Adductor longus tendinopathy",
    time_limit: 25,
    difficulty: 'medium',
    body_part: 'hip',
    rationale: "Specific adductor testing and insertion point tenderness indicate adductor longus involvement."
  },
  {
    id: "medium_4",
    case_number: 9,
    patient_presentation: "52-year-old pianist with hand pain and stiffness, particularly in the morning, affecting multiple joints.",
    clinical_findings: "Symmetrical joint swelling in MCPs and PIPs, positive squeeze test, morning stiffness >1 hour.",
    question: "What condition should be suspected?",
    options: [
      "Osteoarthritis",
      "Rheumatoid arthritis",
      "Carpal tunnel syndrome",
      "De Quervain's tenosynovitis"
    ],
    correct_answer: "Rheumatoid arthritis",
    time_limit: 25,
    difficulty: 'medium',
    body_part: 'hand',
    rationale: "Symmetrical joint involvement and prolonged morning stiffness suggest inflammatory arthritis."
  },
  {
    id: "medium_5",
    case_number: 10,
    patient_presentation: "44-year-old runner with lateral hip pain, worse when lying on affected side and during running.",
    clinical_findings: "Positive Trendelenburg test, pain with resisted hip abduction, tenderness over greater trochanter.",
    question: "What is the primary diagnosis?",
    options: [
      "IT band syndrome",
      "Greater trochanteric pain syndrome",
      "Hip labral tear",
      "Piriformis syndrome"
    ],
    correct_answer: "Greater trochanteric pain syndrome",
    time_limit: 25,
    difficulty: 'medium',
    body_part: 'hip',
    rationale: "Greater trochanteric tenderness and lateral hip pain pattern suggest GTPS."
  }
];

// Round 3: Hard Questions (20 seconds each)
const hardQuestions: LightningQuestion[] = [
  {
    id: "hard_1",
    case_number: 11,
    patient_presentation: "67-year-old with insidious onset hand weakness, difficulty with fine motor tasks, and muscle wasting in the hand.",
    clinical_findings: "Intrinsic hand muscle atrophy, positive Froment's sign, sensory loss in ulnar distribution, negative Tinel's at elbow.",
    question: "What is the most likely location of pathology?",
    options: [
      "Cubital tunnel syndrome",
      "Ulnar tunnel syndrome (Guyon's canal)",
      "C8-T1 radiculopathy",
      "Thoracic outlet syndrome"
    ],
    correct_answer: "Ulnar tunnel syndrome (Guyon's canal)",
    time_limit: 20,
    difficulty: 'hard',
    body_part: 'hand',
    rationale: "Negative Tinel's at elbow with ulnar distribution symptoms suggests distal ulnar compression."
  },
  {
    id: "hard_2",
    case_number: 12,
    patient_presentation: "34-year-old dancer with deep hip pain and mechanical symptoms including clicking and occasional locking.",
    clinical_findings: "Positive FADIR test, positive FABER test, groin pain with hip flexion, normal plain radiographs.",
    question: "What advanced imaging finding would you expect?",
    options: [
      "Femoral stress fracture",
      "Acetabular labral tear",
      "Avascular necrosis of femoral head",
      "Hip joint effusion only"
    ],
    correct_answer: "Acetabular labral tear",
    time_limit: 20,
    difficulty: 'hard',
    body_part: 'hip',
    rationale: "Mechanical symptoms with positive impingement tests suggest labral pathology in young athlete."
  },
  {
    id: "hard_3",
    case_number: 13,
    patient_presentation: "45-year-old with progressive shoulder weakness, particularly in overhead activities, with night pain.",
    clinical_findings: "Positive drop arm test, weakness in external rotation >45°, intact painful arc, MRI shows full-thickness tear.",
    question: "Which tendon is most likely involved in a full-thickness tear?",
    options: [
      "Subscapularis",
      "Supraspinatus",
      "Infraspinatus", 
      "Teres minor"
    ],
    correct_answer: "Supraspinatus",
    time_limit: 20,
    difficulty: 'hard',
    body_part: 'shoulder',
    rationale: "Positive drop arm test and overhead weakness pattern most commonly indicate supraspinatus tear."
  },
  {
    id: "hard_4",
    case_number: 14,
    patient_presentation: "23-year-old gymnast with chronic ankle instability and deep posterior ankle pain during plantarflexion.",
    clinical_findings: "Positive posterior drawer test, pain with forced plantarflexion, tenderness in posterolateral gutter.",
    question: "What secondary pathology should be suspected?",
    options: [
      "Achilles tendinopathy",
      "Posterior ankle impingement",
      "Peroneal tendon tear",
      "Subtalar joint instability"
    ],
    correct_answer: "Posterior ankle impingement",
    time_limit: 20,
    difficulty: 'hard',
    body_part: 'ankle',
    rationale: "Deep posterior pain with forced plantarflexion in chronic instability suggests posterior impingement."
  },
  {
    id: "hard_5",
    case_number: 15,
    patient_presentation: "58-year-old with chronic neck pain, bilateral arm symptoms, and progressive hand weakness with gait instability.",
    clinical_findings: "Hyperreflexia, positive Hoffman's sign, inverted radial reflex, wide-based gait, bladder dysfunction.",
    question: "What is the most serious concern?",
    options: [
      "Cervical radiculopathy",
      "Cervical myelopathy",
      "Peripheral neuropathy",
      "Multiple sclerosis"
    ],
    correct_answer: "Cervical myelopathy",
    time_limit: 20,
    difficulty: 'hard',
    body_part: 'neck',
    rationale: "Upper motor neuron signs with gait and bladder issues indicate cervical myelopathy - urgent referral needed."
  }
];

async function generateTournamentContent() {
  console.log('🏆 Generating Tournament Lightning Diagnosis Content...');
  
  // Combine all questions in rounds
  const allQuestions = [
    ...easyQuestions,
    ...mediumQuestions, 
    ...hardQuestions
  ];

  // Create content structure for Lightning Diagnosis
  const tournamentContent = {
    lightning_diagnosis: {
      cases: allQuestions,
      rounds: {
        round_1: {
          questions: easyQuestions.map(q => q.id),
          time_limit_per_question: 30,
          difficulty: 'easy',
          description: 'Qualification Round - Basic Diagnostic Skills'
        },
        round_2: {
          questions: mediumQuestions.map(q => q.id),
          time_limit_per_question: 25,
          difficulty: 'medium', 
          description: 'Semi-Final Round - Intermediate Clinical Reasoning'
        },
        round_3: {
          questions: hardQuestions.map(q => q.id),
          time_limit_per_question: 20,
          difficulty: 'hard',
          description: 'Final Round - Advanced Diagnostic Challenges'
        }
      },
      tournament_format: {
        total_questions: allQuestions.length,
        progressive_difficulty: true,
        elimination_style: true,
        real_time_scoring: true
      }
    }
  };

  try {
    // Check if tournament content already exists for any competition
    const existingContent = await db
      .select()
      .from(gameContent)
      .where(eq(gameContent.gameType, 'lightning_diagnosis'));

    // Create or update tournament content (using existing lightning diagnosis competition)
    const tournamentCompetitionId = 107;
    
    if (existingContent.length === 0) {
      // Create new tournament content
      await db.insert(gameContent).values({
        competitionId: tournamentCompetitionId,
        gameType: 'lightning_diagnosis',
        content: tournamentContent
      });
      console.log('✅ Created new tournament Lightning Diagnosis content');
    } else {
      // Update existing content
      await db
        .update(gameContent)
        .set({ content: tournamentContent })
        .where(eq(gameContent.competitionId, tournamentCompetitionId));
      console.log('✅ Updated tournament Lightning Diagnosis content');
    }

    console.log(`📊 Generated ${allQuestions.length} total questions across 3 difficulty levels:`);
    console.log(`   🟢 Round 1 (Easy): ${easyQuestions.length} questions - 30s each`);
    console.log(`   🟡 Round 2 (Medium): ${mediumQuestions.length} questions - 25s each`);
    console.log(`   🔴 Round 3 (Hard): ${hardQuestions.length} questions - 20s each`);
    console.log('🎯 Progressive difficulty tournament content ready for Diagnosis Duel!');
    
  } catch (error) {
    console.error('❌ Error generating tournament content:', error);
    throw error;
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTournamentContent()
    .then(() => {
      console.log('🏁 Tournament content generation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Tournament content generation failed:', error);
      process.exit(1);
    });
}

export { generateTournamentContent };