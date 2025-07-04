import { db } from '../db.js';
import { competitions, gameContent } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function addMysteryPatientContent() {
  try {
    console.log('Adding Mystery Patient game content...');
    
    // Get all mystery_patient competitions
    const mysteryCompetitions = await db
      .select()
      .from(competitions)
      .where(eq(competitions.gameType, 'mystery_patient'));

    console.log(`Found ${mysteryCompetitions.length} Mystery Patient competitions`);

    // Predefined Mystery Patient content
    const mysteryPatientContent = [
      {
        title: "Mystery Patient: The Overhead Athlete",
        content: {
          scenario: {
            initialPresentation: "A 24-year-old professional volleyball player presents with shoulder pain affecting their performance over the past 6 weeks."
          },
          clues: [
            {
              stage: 1,
              clueType: "history",
              content: "Pain started gradually, worse with overhead movements and serving",
              significance: "medium"
            },
            {
              stage: 2,
              clueType: "examination",
              content: "Positive Neer's test, painful arc between 60-120 degrees",
              significance: "high"
            },
            {
              stage: 3,
              clueType: "history",
              content: "Training volume increased significantly 2 months ago",
              significance: "medium"
            },
            {
              stage: 4,
              clueType: "examination",
              content: "Weak external rotation, positive empty can test",
              significance: "high"
            },
            {
              stage: 5,
              clueType: "imaging",
              content: "MRI shows subacromial bursitis and partial rotator cuff tear",
              significance: "very_high"
            }
          ],
          solution: {
            diagnosis: "Subacromial impingement syndrome with partial rotator cuff tear",
            explanation: "The combination of overhead sport, gradual onset, positive impingement tests, and MRI findings confirm the diagnosis",
            keyClues: ["Overhead athlete", "Positive Neer's test", "Painful arc", "MRI findings"]
          }
        }
      },
      {
        title: "Mystery Patient: The Weekend Warrior",
        content: {
          scenario: {
            initialPresentation: "A 45-year-old office worker presents with knee pain after starting a new running program 3 weeks ago."
          },
          clues: [
            {
              stage: 1,
              clueType: "history",
              content: "Pain is worst when going downstairs and after sitting for long periods",
              significance: "medium"
            },
            {
              stage: 2,
              clueType: "examination",
              content: "Tender around patella, positive patellar apprehension test",
              significance: "high"
            },
            {
              stage: 3,
              clueType: "history",
              content: "Increased running distance from 0 to 5km three times per week",
              significance: "high"
            },
            {
              stage: 4,
              clueType: "examination",
              content: "Weak vastus medialis, tight IT band and hip flexors",
              significance: "high"
            },
            {
              stage: 5,
              clueType: "functional",
              content: "Pain increases with single-leg squat, poor patella tracking",
              significance: "very_high"
            }
          ],
          solution: {
            diagnosis: "Patellofemoral pain syndrome",
            explanation: "Classic presentation of PFPS with anterior knee pain, activity-related onset, and biomechanical factors",
            keyClues: ["Anterior knee pain", "Downstairs pain", "Recent activity increase", "Poor patella tracking"]
          }
        }
      },
      {
        title: "Mystery Patient: The Office Worker",
        content: {
          scenario: {
            initialPresentation: "A 38-year-old office worker presents with neck pain and headaches that have been worsening over the past 6 months."
          },
          clues: [
            {
              stage: 1,
              clueType: "history",
              content: "Works 10-12 hours daily at computer, headaches mainly occipital",
              significance: "medium"
            },
            {
              stage: 2,
              clueType: "examination",
              content: "Forward head posture, rounded shoulders, tender upper trapezius",
              significance: "high"
            },
            {
              stage: 3,
              clueType: "history",
              content: "Recently changed to home office setup with laptop on dining table",
              significance: "high"
            },
            {
              stage: 4,
              clueType: "examination",
              content: "Reduced cervical extension, tight suboccipital muscles",
              significance: "high"
            },
            {
              stage: 5,
              clueType: "functional",
              content: "Symptoms worsen with prolonged computer work, improve with movement",
              significance: "very_high"
            }
          ],
          solution: {
            diagnosis: "Upper crossed syndrome/cervicogenic headache",
            explanation: "Postural dysfunction from poor ergonomics leading to muscle imbalances and tension headaches",
            keyClues: ["Forward head posture", "Computer work", "Occipital headaches", "Poor ergonomics"]
          }
        }
      },
      {
        title: "Mystery Patient: The Construction Worker",
        content: {
          scenario: {
            initialPresentation: "A 52-year-old construction worker presents with lower back pain that radiates down his right leg for the past 3 weeks."
          },
          clues: [
            {
              stage: 1,
              clueType: "history",
              content: "Pain started after lifting heavy beam, constant ache with shooting pain",
              significance: "high"
            },
            {
              stage: 2,
              clueType: "examination",
              content: "Positive straight leg raise at 35 degrees, reduced ankle reflexes",
              significance: "very_high"
            },
            {
              stage: 3,
              clueType: "history",
              content: "Numbness in big toe, weakness when pushing off during walking",
              significance: "high"
            },
            {
              stage: 4,
              clueType: "examination",
              content: "Positive slump test, reduced dorsiflexion strength",
              significance: "high"
            },
            {
              stage: 5,
              clueType: "imaging",
              content: "MRI shows L5-S1 disc herniation with nerve root compression",
              significance: "very_high"
            }
          ],
          solution: {
            diagnosis: "L5-S1 disc herniation with radiculopathy",
            explanation: "Classic presentation with dermatomal pain, positive neural tension tests, and MRI confirmation",
            keyClues: ["Lifting mechanism", "Positive SLR", "Dermatomal symptoms", "MRI findings"]
          }
        }
      },
      {
        title: "Mystery Patient: The Elderly Fall",
        content: {
          scenario: {
            initialPresentation: "A 72-year-old woman presents with hip pain following a fall in her bathroom 2 days ago."
          },
          clues: [
            {
              stage: 1,
              clueType: "history",
              content: "Fell backwards onto tile floor, immediate pain, unable to weight-bear",
              significance: "high"
            },
            {
              stage: 2,
              clueType: "examination",
              content: "Shortened and externally rotated right leg, severe pain with any movement",
              significance: "very_high"
            },
            {
              stage: 3,
              clueType: "history",
              content: "History of osteoporosis, taking calcium supplements",
              significance: "high"
            },
            {
              stage: 4,
              clueType: "examination",
              content: "Tender over greater trochanter, unable to perform straight leg raise",
              significance: "high"
            },
            {
              stage: 5,
              clueType: "imaging",
              content: "X-ray shows displaced femoral neck fracture",
              significance: "very_high"
            }
          ],
          solution: {
            diagnosis: "Displaced femoral neck fracture",
            explanation: "Classic presentation of hip fracture in elderly with fall mechanism and characteristic deformity",
            keyClues: ["Fall mechanism", "Leg deformity", "Osteoporosis", "X-ray findings"]
          }
        }
      }
    ];

    // Add more content to reach 10 games
    const additionalContent = [
      {
        title: "Mystery Patient: The Tennis Player",
        content: {
          scenario: {
            initialPresentation: "A 32-year-old tennis player presents with elbow pain that has been limiting their game for 2 months."
          },
          clues: [
            {
              stage: 1,
              clueType: "history",
              content: "Pain on outside of elbow, worse with backhand shots",
              significance: "high"
            },
            {
              stage: 2,
              clueType: "examination",
              content: "Tender over lateral epicondyle, positive Cozen's test",
              significance: "very_high"
            },
            {
              stage: 3,
              clueType: "history",
              content: "Recently changed to heavier racquet, increased training volume",
              significance: "medium"
            },
            {
              stage: 4,
              clueType: "examination",
              content: "Weak grip strength, pain with resisted wrist extension",
              significance: "high"
            },
            {
              stage: 5,
              clueType: "functional",
              content: "Unable to lift coffee cup without pain, difficulty with door handles",
              significance: "high"
            }
          ],
          solution: {
            diagnosis: "Lateral epicondylitis (tennis elbow)",
            explanation: "Classic overuse injury with characteristic pain pattern and positive clinical tests",
            keyClues: ["Tennis player", "Lateral elbow pain", "Positive Cozen's test", "Equipment change"]
          }
        }
      },
      {
        title: "Mystery Patient: The Dancer",
        content: {
          scenario: {
            initialPresentation: "A 19-year-old ballet dancer presents with ankle pain that started during rehearsals 3 weeks ago."
          },
          clues: [
            {
              stage: 1,
              clueType: "history",
              content: "Pain behind ankle, worse with pointing toes (plantarflexion)",
              significance: "high"
            },
            {
              stage: 2,
              clueType: "examination",
              content: "Tender posterior ankle, positive posterior impingement test",
              significance: "high"
            },
            {
              stage: 3,
              clueType: "history",
              content: "Recently cast in lead role, increased pointe work significantly",
              significance: "medium"
            },
            {
              stage: 4,
              clueType: "examination",
              content: "Pain with forced plantarflexion, palpable posterior ankle swelling",
              significance: "high"
            },
            {
              stage: 5,
              clueType: "imaging",
              content: "MRI shows posterior ankle impingement with os trigonum",
              significance: "very_high"
            }
          ],
          solution: {
            diagnosis: "Posterior ankle impingement syndrome",
            explanation: "Common in ballet dancers due to repetitive plantarflexion movements and anatomical variants",
            keyClues: ["Ballet dancer", "Posterior ankle pain", "Pointe work", "Os trigonum"]
          }
        }
      },
      {
        title: "Mystery Patient: The Golfer",
        content: {
          scenario: {
            initialPresentation: "A 58-year-old golfer presents with lower back pain that started 6 weeks ago and is affecting their swing."
          },
          clues: [
            {
              stage: 1,
              clueType: "history",
              content: "Pain with rotation and extension, worse at end of golf round",
              significance: "high"
            },
            {
              stage: 2,
              clueType: "examination",
              content: "Tender over right lumbar facet joints, positive extension-rotation test",
              significance: "high"
            },
            {
              stage: 3,
              clueType: "history",
              content: "Recently increased golf frequency to 4 times per week",
              significance: "medium"
            },
            {
              stage: 4,
              clueType: "examination",
              content: "Reduced lumbar extension, tight hip flexors",
              significance: "high"
            },
            {
              stage: 5,
              clueType: "functional",
              content: "Pain reproduced with golf swing simulation, especially follow-through",
              significance: "very_high"
            }
          ],
          solution: {
            diagnosis: "Lumbar facet joint syndrome",
            explanation: "Common in golfers due to repetitive rotation and extension movements",
            keyClues: ["Golf swing pain", "Extension-rotation pattern", "Facet joint tenderness", "Activity increase"]
          }
        }
      },
      {
        title: "Mystery Patient: The Young Athlete",
        content: {
          scenario: {
            initialPresentation: "A 16-year-old soccer player presents with anterior knee pain that has been bothering them for 4 months."
          },
          clues: [
            {
              stage: 1,
              clueType: "history",
              content: "Pain just below kneecap, worse with running and jumping",
              significance: "high"
            },
            {
              stage: 2,
              clueType: "examination",
              content: "Tender over patellar tendon insertion, positive single-leg decline squat",
              significance: "very_high"
            },
            {
              stage: 3,
              clueType: "history",
              content: "Recently had growth spurt, increased training for upcoming season",
              significance: "high"
            },
            {
              stage: 4,
              clueType: "examination",
              content: "Tight quadriceps and hamstrings, poor landing mechanics",
              significance: "high"
            },
            {
              stage: 5,
              clueType: "imaging",
              content: "Ultrasound shows patellar tendon thickening and hypoechoic areas",
              significance: "very_high"
            }
          ],
          solution: {
            diagnosis: "Patellar tendinopathy (jumper's knee)",
            explanation: "Common overuse injury in jumping sports, especially during growth spurts",
            keyClues: ["Jumping sport", "Patellar tendon pain", "Growth spurt", "Ultrasound findings"]
          }
        }
      },
      {
        title: "Mystery Patient: The Swimmer",
        content: {
          scenario: {
            initialPresentation: "A 26-year-old competitive swimmer presents with shoulder pain that has been progressively worsening over 8 weeks."
          },
          clues: [
            {
              stage: 1,
              clueType: "history",
              content: "Pain during freestyle stroke, particularly during catch phase",
              significance: "high"
            },
            {
              stage: 2,
              clueType: "examination",
              content: "Positive impingement signs, weak posterior deltoid and rhomboids",
              significance: "high"
            },
            {
              stage: 3,
              clueType: "history",
              content: "Training volume increased for upcoming nationals, 8000m per day",
              significance: "medium"
            },
            {
              stage: 4,
              clueType: "examination",
              content: "Scapular dyskinesis, tight pectorals and anterior capsule",
              significance: "high"
            },
            {
              stage: 5,
              clueType: "functional",
              content: "Unable to complete 100m freestyle without pain, altered stroke mechanics",
              significance: "very_high"
            }
          ],
          solution: {
            diagnosis: "Swimmer's shoulder (multidirectional impingement)",
            explanation: "Overuse injury from repetitive overhead swimming with muscle imbalances and poor scapular control",
            keyClues: ["Competitive swimmer", "Impingement signs", "Scapular dyskinesis", "High training volume"]
          }
        }
      }
    ];

    // Combine all content
    const allContent = [...mysteryPatientContent, ...additionalContent];

    let contentIndex = 0;
    for (const competition of mysteryCompetitions) {
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

      // Use appropriate content for this competition
      const content = allContent[contentIndex % allContent.length];
      
      // Insert game content
      await db.insert(gameContent).values({
        competitionId: competition.id,
        gameType: 'mystery_patient',
        content: { mysteryPatient: content.content }
      });

      console.log(`✓ Added content for competition ${competition.id}: ${competition.title}`);
      contentIndex++;
    }

    console.log('✓ Successfully added all Mystery Patient game content');
    
  } catch (error) {
    console.error('Error adding Mystery Patient content:', error);
    throw error;
  }
}

// Run the function
addMysteryPatientContent()
  .then(() => {
    console.log('Mystery Patient content setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to setup Mystery Patient content:', error);
    process.exit(1);
  });

export { addMysteryPatientContent };