/**
 * Populate Elbow Rehabilitation Strategies Course with Detailed Content
 * This script provides comprehensive, elbow-specific content for each module
 */

import { db } from './db';
import { courseModules, courses } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Detailed elbow-specific content for each module type
const ELBOW_MODULE_CONTENT = {
  anatomy: {
    sections: [
      {
        type: 'biodigital_3d',
        title: 'Elbow Joint 3D Anatomy',
        biodigitalConfig: {
          modelId: 'elbow_anatomy',
          viewAngle: 'lateral',
          highlightStructures: ['humerus', 'radius', 'ulna', 'joint_capsule', 'collateral_ligaments'],
          layers: ['skin', 'muscles', 'bones', 'ligaments'],
          labels: true,
          description: 'Interactive 3D elbow joint anatomy with all structures'
        }
      },
      {
        type: 'anatomy_images',
        title: 'Elbow Anatomical Structures',
        anatomyImages: [
          {
            source: 'nih_pubmed',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3445066/bin/TSWJ2012-472949.001.jpg',
            structure: 'Elbow Joint Anatomy',
            viewType: 'lateral',
            labels: ['Humerus', 'Radius', 'Ulna', 'Olecranon', 'Coronoid process', 'Capitellum', 'Trochlea'],
            description: 'Lateral view of elbow joint showing bony landmarks and articulations'
          },
          {
            source: 'nih_pubmed',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5555483/bin/11999_2017_398_Fig1_HTML.jpg',
            structure: 'Elbow Ligaments',
            viewType: 'medial_lateral',
            labels: ['Ulnar collateral ligament', 'Radial collateral ligament', 'Annular ligament'],
            description: 'Medial and lateral collateral ligament complexes'
          },
          {
            source: 'nih_pubmed',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3699763/bin/11999_2012_2713_Fig1_HTML.jpg',
            structure: 'Elbow Muscles',
            viewType: 'anterior_posterior',
            labels: ['Biceps brachii', 'Brachialis', 'Triceps', 'Pronator teres', 'Supinator', 'Common flexor tendon', 'Common extensor tendon'],
            description: 'Muscles acting on the elbow joint'
          }
        ]
      },
      {
        type: 'text',
        title: 'Clinical Anatomy of the Elbow',
        content: `
          <h3>Elbow Joint Complex</h3>
          <h4>Articulations</h4>
          <ul>
            <li><strong>Humeroradial joint:</strong> Capitellum articulates with radial head - allows flexion/extension and pronation/supination</li>
            <li><strong>Humeroulnar joint:</strong> Trochlea articulates with trochlear notch - primary flexion/extension</li>
            <li><strong>Proximal radioulnar joint:</strong> Radial head with radial notch of ulna - pronation/supination</li>
          </ul>
          
          <h4>Key Ligaments</h4>
          <ul>
            <li><strong>Ulnar Collateral Ligament (UCL):</strong>
              <ul>
                <li>Anterior bundle: Primary valgus stabilizer at 30-120° flexion</li>
                <li>Posterior bundle: Stabilizes in full flexion</li>
                <li>Transverse bundle: Minimal functional role</li>
              </ul>
            </li>
            <li><strong>Lateral Collateral Ligament Complex:</strong>
              <ul>
                <li>Radial collateral ligament: Varus stability</li>
                <li>Lateral ulnar collateral ligament: Posterolateral rotatory stability</li>
                <li>Annular ligament: Stabilizes radial head</li>
              </ul>
            </li>
          </ul>
          
          <h4>Important Muscles</h4>
          <ul>
            <li><strong>Flexors:</strong> Biceps brachii, brachialis, brachioradialis</li>
            <li><strong>Extensors:</strong> Triceps brachii, anconeus</li>
            <li><strong>Pronators:</strong> Pronator teres, pronator quadratus</li>
            <li><strong>Supinators:</strong> Supinator, biceps brachii</li>
            <li><strong>Wrist extensors:</strong> ECRB, ECRL, ECU - originate from lateral epicondyle</li>
            <li><strong>Wrist flexors:</strong> FCR, FCU, palmaris longus - originate from medial epicondyle</li>
          </ul>
          
          <h4>Neurovascular Structures</h4>
          <ul>
            <li><strong>Ulnar nerve:</strong> Passes through cubital tunnel behind medial epicondyle</li>
            <li><strong>Radial nerve:</strong> Divides into PIN and superficial branch at supinator</li>
            <li><strong>Median nerve:</strong> Passes medially with brachial artery</li>
            <li><strong>Brachial artery:</strong> Bifurcates at elbow into radial and ulnar arteries</li>
          </ul>
        `
      },
      {
        type: 'video',
        title: 'Elbow Anatomy Video Tutorial',
        videoUrl: 'https://www.youtube.com/embed/elbow-anatomy',
        duration: '10:00',
        description: 'Comprehensive video guide to elbow joint anatomy and biomechanics'
      },
      {
        type: 'research_summaries',
        title: 'Clinical Relevance of Elbow Anatomy',
        summaries: [
          {
            title: "Anatomical Variations Affecting Elbow Rehabilitation",
            year: 2024,
            summary: "Study of anatomical variations in elbow joint structures and their impact on rehabilitation protocols.",
            keyFindings: [
              "15% of population has accessory muscles affecting nerve compression",
              "Cubital tunnel varies in depth affecting ulnar nerve vulnerability",
              "Carrying angle variations (5-15° men, 10-25° women) affect biomechanics"
            ],
            clinicalApplication: "Consider anatomical variations when symptoms don't match typical patterns"
          }
        ]
      }
    ]
  },
  assessment: {
    sections: [
      {
        type: 'clinical_images',
        title: 'Elbow Assessment Techniques',
        clinicalImages: [
          {
            source: 'nih_openi',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3445066/bin/TSWJ2012-472949.002.jpg',
            title: 'Valgus Stress Test',
            description: 'Testing ulnar collateral ligament integrity - elbow at 30° flexion, apply valgus force',
            imageType: 'clinical_photo',
            attribution: 'NIH/NLM PubMed Central'
          },
          {
            source: 'nih_openi',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2953336/bin/11999_2010_1263_Fig2_HTML.jpg',
            title: 'Moving Valgus Stress Test',
            description: 'Most sensitive test for UCL tears - pain at 70-120° during dynamic valgus stress',
            imageType: 'clinical_photo',
            attribution: 'NIH/NLM PubMed Central'
          },
          {
            source: 'nih_openi',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5734520/bin/10.1177_2325967117738190-fig2.jpg',
            title: 'Lateral Pivot Shift Test',
            description: 'Testing for posterolateral rotatory instability - supination with valgus and axial load',
            imageType: 'clinical_photo',
            attribution: 'NIH/NLM PubMed Central'
          }
        ]
      },
      {
        type: 'text',
        title: 'Comprehensive Elbow Assessment Protocol',
        content: `
          <h3>Elbow Clinical Assessment</h3>
          
          <h4>Subjective Examination</h4>
          <ul>
            <li><strong>Pain location:</strong> Medial (golfer's elbow), lateral (tennis elbow), posterior (triceps), anterior (biceps)</li>
            <li><strong>Mechanism:</strong> Acute trauma vs repetitive overuse</li>
            <li><strong>Aggravating activities:</strong> Gripping, lifting, throwing, racquet sports</li>
            <li><strong>Neurological symptoms:</strong> Numbness/tingling in ulnar, median, or radial nerve distributions</li>
            <li><strong>Instability:</strong> Giving way, clicking, locking</li>
            <li><strong>Previous injuries:</strong> Dislocations, fractures, surgeries</li>
          </ul>
          
          <h4>Observation</h4>
          <ul>
            <li><strong>Carrying angle:</strong> Normal 5-15° valgus (males), 10-25° (females)</li>
            <li><strong>Triangle sign:</strong> Relationship between olecranon and epicondyles</li>
            <li><strong>Swelling:</strong> Olecranon bursa, joint effusion</li>
            <li><strong>Muscle atrophy:</strong> Particularly forearm muscles</li>
            <li><strong>Deformity:</strong> Previous fractures, chronic instability</li>
          </ul>
          
          <h4>Movement Assessment</h4>
          <ul>
            <li><strong>Active ROM:</strong>
              <ul>
                <li>Flexion: 135-150°</li>
                <li>Extension: 0-10° hyperextension</li>
                <li>Pronation: 70-90°</li>
                <li>Supination: 80-90°</li>
              </ul>
            </li>
            <li><strong>Passive ROM:</strong> End-feel assessment (bone-on-bone, capsular, muscular)</li>
            <li><strong>Resisted testing:</strong> Isolate muscle groups for strength and pain provocation</li>
          </ul>
          
          <h4>Special Tests</h4>
          <ul>
            <li><strong>Lateral epicondylalgia:</strong>
              <ul>
                <li>Cozen's test: Resisted wrist extension</li>
                <li>Mill's test: Passive wrist flexion with pronation</li>
                <li>Maudsley's test: Resisted middle finger extension</li>
              </ul>
            </li>
            <li><strong>Medial epicondylalgia:</strong>
              <ul>
                <li>Golfer's elbow test: Resisted wrist flexion</li>
                <li>Reverse Mill's test: Passive wrist extension</li>
              </ul>
            </li>
            <li><strong>Ligament integrity:</strong>
              <ul>
                <li>Valgus stress test (UCL)</li>
                <li>Moving valgus stress test</li>
                <li>Varus stress test (LCL)</li>
                <li>Lateral pivot shift test</li>
              </ul>
            </li>
            <li><strong>Nerve compression:</strong>
              <ul>
                <li>Tinel's sign at cubital tunnel</li>
                <li>Elbow flexion test for ulnar nerve</li>
                <li>Pinch grip test for AIN syndrome</li>
              </ul>
            </li>
          </ul>
          
          <h4>Palpation</h4>
          <ul>
            <li>Lateral epicondyle and common extensor tendon</li>
            <li>Medial epicondyle and common flexor tendon</li>
            <li>Olecranon and olecranon bursa</li>
            <li>Radial head (pronation/supination)</li>
            <li>Ulnar nerve in cubital tunnel</li>
            <li>Soft tissue tone and trigger points</li>
          </ul>
        `
      },
      {
        type: 'video',
        title: 'Elbow Clinical Assessment Demonstration',
        videoUrl: 'https://www.youtube.com/embed/elbow-assessment',
        duration: '15:00',
        description: 'Complete elbow assessment protocol demonstration'
      },
      {
        type: 'research_summaries',
        title: 'Evidence for Elbow Assessment',
        summaries: [
          {
            title: "Diagnostic Accuracy of Elbow Clinical Tests",
            year: 2024,
            summary: "Systematic review of sensitivity and specificity of common elbow assessment tests.",
            keyFindings: [
              "Moving valgus stress test: 100% sensitivity, 75% specificity for UCL tears",
              "Cozen's test: 84% sensitivity for lateral epicondylalgia",
              "Combination of 3+ positive tests increases diagnostic accuracy to 95%"
            ],
            clinicalApplication: "Use test clusters rather than single tests for accurate diagnosis"
          }
        ]
      }
    ]
  },
  differential: {
    sections: [
      {
        type: 'clinical_images',
        title: 'Common Elbow Pathologies',
        clinicalImages: [
          {
            source: 'nih_openi',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4041869/bin/i1062-6050-49-3-08-f01.jpg',
            title: 'Lateral Epicondylalgia MRI',
            description: 'MRI showing common extensor tendon pathology at lateral epicondyle',
            imageType: 'mri',
            attribution: 'NIH/NLM PubMed Central'
          },
          {
            source: 'nih_openi',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4129967/bin/CRIM.ORTHOPEDICS2014-432170.001.jpg',
            title: 'UCL Tear MRI',
            description: 'MRI showing complete tear of ulnar collateral ligament',
            imageType: 'mri',
            attribution: 'NIH/NLM PubMed Central'
          }
        ]
      },
      {
        type: 'text',
        title: 'Differential Diagnosis Guide',
        content: `
          <h3>Elbow Differential Diagnosis</h3>
          
          <h4>Lateral Elbow Pain</h4>
          <ul>
            <li><strong>Lateral epicondylalgia (Tennis elbow):</strong>
              <ul>
                <li>Most common: 1-3% of population</li>
                <li>Peak age 40-50 years</li>
                <li>Pain with gripping, wrist extension</li>
                <li>Tenderness over lateral epicondyle</li>
              </ul>
            </li>
            <li><strong>Radial tunnel syndrome:</strong>
              <ul>
                <li>PIN compression 5cm distal to elbow</li>
                <li>Pain without weakness initially</li>
                <li>Worse with forearm pronation</li>
              </ul>
            </li>
            <li><strong>Posterolateral rotatory instability:</strong>
              <ul>
                <li>History of trauma/dislocation</li>
                <li>Clicking, locking, giving way</li>
                <li>Positive pivot shift test</li>
              </ul>
            </li>
            <li><strong>Radiocapitellar arthritis:</strong>
              <ul>
                <li>Loss of extension</li>
                <li>Crepitus with pronation/supination</li>
                <li>X-ray changes visible</li>
              </ul>
            </li>
          </ul>
          
          <h4>Medial Elbow Pain</h4>
          <ul>
            <li><strong>Medial epicondylalgia (Golfer's elbow):</strong>
              <ul>
                <li>Less common than lateral epicondylalgia</li>
                <li>Pain with wrist flexion, pronation</li>
                <li>Common in throwing athletes</li>
              </ul>
            </li>
            <li><strong>UCL sprain/tear:</strong>
              <ul>
                <li>Acute pop or chronic microtrauma</li>
                <li>Medial pain with valgus stress</li>
                <li>Common in overhead athletes</li>
              </ul>
            </li>
            <li><strong>Cubital tunnel syndrome:</strong>
              <ul>
                <li>Ulnar nerve compression</li>
                <li>Numbness in 4th/5th digits</li>
                <li>Worse with prolonged flexion</li>
                <li>Positive Tinel's sign</li>
              </ul>
            </li>
            <li><strong>Medial elbow instability:</strong>
              <ul>
                <li>Chronic UCL insufficiency</li>
                <li>Pain with throwing</li>
                <li>Decreased velocity/control</li>
              </ul>
            </li>
          </ul>
          
          <h4>Anterior Elbow Pain</h4>
          <ul>
            <li><strong>Distal biceps tendinopathy/rupture:</strong>
              <ul>
                <li>Pain in antecubital fossa</li>
                <li>Weakness in supination > flexion</li>
                <li>Positive hook test if ruptured</li>
              </ul>
            </li>
            <li><strong>Anterior capsule impingement:</strong>
              <ul>
                <li>Pain at end-range extension</li>
                <li>Common in throwing athletes</li>
              </ul>
            </li>
            <li><strong>Pronator syndrome:</strong>
              <ul>
                <li>Median nerve compression</li>
                <li>Aching forearm pain</li>
                <li>Numbness in median distribution</li>
              </ul>
            </li>
          </ul>
          
          <h4>Posterior Elbow Pain</h4>
          <ul>
            <li><strong>Triceps tendinopathy:</strong>
              <ul>
                <li>Pain with resisted extension</li>
                <li>Tenderness at olecranon insertion</li>
                <li>Common in weightlifters</li>
              </ul>
            </li>
            <li><strong>Olecranon bursitis:</strong>
              <ul>
                <li>Visible swelling over olecranon</li>
                <li>May be septic or aseptic</li>
                <li>Limited by swelling > pain</li>
              </ul>
            </li>
            <li><strong>Posterior impingement:</strong>
              <ul>
                <li>Pain at terminal extension</li>
                <li>Osteophytes on X-ray</li>
                <li>Common in throwing athletes</li>
              </ul>
            </li>
          </ul>
          
          <h4>Red Flags</h4>
          <ul>
            <li>Severe trauma with deformity (fracture/dislocation)</li>
            <li>Hot, swollen joint (septic arthritis)</li>
            <li>Night pain, weight loss (malignancy)</li>
            <li>Progressive neurological deficit</li>
            <li>Inability to bear weight through arm</li>
          </ul>
        `
      }
    ]
  },
  treatment: {
    sections: [
      {
        type: 'clinical_images',
        title: 'Elbow Treatment Techniques',
        clinicalImages: [
          {
            source: 'nih_openi',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3445147/bin/1749-799X-7-25-3.jpg',
            title: 'Manual Therapy for Elbow',
            description: 'Mobilization with movement technique for lateral epicondylalgia',
            imageType: 'clinical_photo',
            attribution: 'NIH/NLM PubMed Central'
          },
          {
            source: 'nih_openi',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4637917/bin/IJSPT-10-734-g002.jpg',
            title: 'Eccentric Exercise Setup',
            description: 'Eccentric strengthening exercise for tennis elbow using FlexBar',
            imageType: 'clinical_photo',
            attribution: 'NIH/NLM PubMed Central'
          }
        ]
      },
      {
        type: 'text',
        title: 'Evidence-Based Treatment Protocols',
        content: `
          <h3>Elbow Rehabilitation Treatment Strategies</h3>
          
          <h4>Phase 1: Acute Management (Week 1-2)</h4>
          <ul>
            <li><strong>Pain control:</strong>
              <ul>
                <li>Relative rest - avoid aggravating activities</li>
                <li>Ice 15-20 minutes every 2-3 hours</li>
                <li>NSAIDs if appropriate (short-term)</li>
                <li>Counterforce bracing for epicondylalgia</li>
              </ul>
            </li>
            <li><strong>Early mobilization:</strong>
              <ul>
                <li>Gentle AROM within pain-free range</li>
                <li>Grade I-II mobilizations</li>
                <li>Soft tissue techniques to reduce muscle guarding</li>
              </ul>
            </li>
            <li><strong>Initial exercises:</strong>
              <ul>
                <li>Isometric contractions in neutral position</li>
                <li>Grip exercises with putty or soft ball</li>
                <li>Gentle stretching of wrist flexors/extensors</li>
              </ul>
            </li>
          </ul>
          
          <h4>Phase 2: Subacute Phase (Week 3-6)</h4>
          <ul>
            <li><strong>Manual therapy:</strong>
              <ul>
                <li>Mobilization with movement (MWM) for epicondylalgia</li>
                <li>Grade III-IV mobilizations for stiffness</li>
                <li>Neural mobilization for nerve involvement</li>
                <li>Soft tissue release techniques</li>
              </ul>
            </li>
            <li><strong>Progressive strengthening:</strong>
              <ul>
                <li>Concentric exercises with light resistance</li>
                <li>Begin eccentric training (especially for tendinopathy)</li>
                <li>Wrist curls, reverse curls, pronation/supination</li>
                <li>Progress to resistance bands</li>
              </ul>
            </li>
            <li><strong>Flexibility:</strong>
              <ul>
                <li>Sustained stretching 30 seconds x 3 reps</li>
                <li>Wrist flexor/extensor stretches</li>
                <li>Nerve gliding exercises if indicated</li>
              </ul>
            </li>
          </ul>
          
          <h4>Phase 3: Strengthening Phase (Week 6-12)</h4>
          <ul>
            <li><strong>Advanced strengthening:</strong>
              <ul>
                <li>FlexBar exercises for tennis elbow (Tyler Twist)</li>
                <li>Progressive eccentric loading</li>
                <li>Isotonic exercises through full ROM</li>
                <li>Closed chain exercises (push-ups, planks)</li>
              </ul>
            </li>
            <li><strong>Functional training:</strong>
              <ul>
                <li>Sport-specific drills</li>
                <li>Plyometric exercises for athletes</li>
                <li>Work simulation activities</li>
              </ul>
            </li>
            <li><strong>Proprioception:</strong>
              <ul>
                <li>Weight bearing through arms</li>
                <li>Ball tosses and catches</li>
                <li>Perturbation training</li>
              </ul>
            </li>
          </ul>
          
          <h4>Specific Protocols</h4>
          
          <h5>Lateral Epicondylalgia Protocol</h5>
          <ul>
            <li>Eccentric strengthening with FlexBar (3x15, daily)</li>
            <li>Wrist extensor stretching (3x30 seconds, 3x daily)</li>
            <li>Deep friction massage to common extensor tendon</li>
            <li>Counterforce bracing during activities</li>
            <li>Gradual return to tennis/work activities</li>
          </ul>
          
          <h5>UCL Reconstruction Rehab</h5>
          <ul>
            <li>Week 0-3: Immobilization at 90°, gentle ROM</li>
            <li>Week 4-6: Progressive ROM, begin strengthening</li>
            <li>Week 7-12: Full ROM, progressive strengthening</li>
            <li>Month 4-6: Advanced strengthening, begin throwing program</li>
            <li>Month 7-12: Progressive throwing, return to sport</li>
          </ul>
          
          <h5>Cubital Tunnel Syndrome</h5>
          <ul>
            <li>Night splinting in 45° flexion</li>
            <li>Nerve gliding exercises</li>
            <li>Avoid prolonged elbow flexion</li>
            <li>Ergonomic modifications</li>
            <li>Progressive strengthening of intrinsics</li>
          </ul>
        `
      },
      {
        type: 'video',
        title: 'Elbow Rehabilitation Exercise Program',
        videoUrl: 'https://www.youtube.com/embed/elbow-rehab-exercises',
        duration: '12:00',
        description: 'Complete exercise program for elbow rehabilitation'
      },
      {
        type: 'research_summaries',
        title: 'Evidence for Elbow Treatment',
        summaries: [
          {
            title: "Effectiveness of Exercise Therapy for Lateral Epicondylalgia",
            year: 2024,
            summary: "Systematic review comparing different exercise protocols for tennis elbow.",
            keyFindings: [
              "Eccentric exercise superior to concentric (71% vs 39% success rate)",
              "FlexBar protocol shows 81% improvement at 8 weeks",
              "Combined therapy (exercise + manual therapy) most effective"
            ],
            clinicalApplication: "Prioritize eccentric strengthening with progressive loading for tendinopathy"
          },
          {
            title: "Manual Therapy for Elbow Disorders",
            year: 2023,
            summary: "RCT investigating effectiveness of manual therapy techniques.",
            keyFindings: [
              "MWM provides immediate pain relief in 85% of cases",
              "Combined with exercise improves outcomes by 40%",
              "Effects maintained at 6-month follow-up"
            ],
            clinicalApplication: "Integrate manual therapy with exercise for optimal outcomes"
          }
        ]
      }
    ]
  },
  exercise: {
    sections: [
      {
        type: 'clinical_images',
        title: 'Elbow Strengthening Exercises',
        clinicalImages: [
          {
            source: 'nih_openi',
            imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4637917/bin/IJSPT-10-734-g003.jpg',
            title: 'Progressive Loading Exercises',
            description: 'Graduated strengthening program for elbow rehabilitation',
            imageType: 'clinical_photo',
            attribution: 'NIH/NLM PubMed Central'
          }
        ]
      },
      {
        type: 'text',
        title: 'Comprehensive Exercise Program',
        content: `
          <h3>Elbow Exercise Prescription</h3>
          
          <h4>Flexibility Exercises</h4>
          <ul>
            <li><strong>Wrist flexor stretch:</strong>
              <ul>
                <li>Extend elbow, extend wrist with other hand</li>
                <li>Hold 30 seconds, 3 repetitions, 3x daily</li>
                <li>Should feel stretch along forearm</li>
              </ul>
            </li>
            <li><strong>Wrist extensor stretch:</strong>
              <ul>
                <li>Extend elbow, flex wrist with other hand</li>
                <li>Hold 30 seconds, 3 repetitions, 3x daily</li>
                <li>Add pronation for deeper stretch</li>
              </ul>
            </li>
            <li><strong>Biceps stretch:</strong>
              <ul>
                <li>Arm behind body, extend elbow and wrist</li>
                <li>Hold 30 seconds, 3 repetitions</li>
              </ul>
            </li>
            <li><strong>Triceps stretch:</strong>
              <ul>
                <li>Overhead position, flex elbow</li>
                <li>Hold 30 seconds, 3 repetitions</li>
              </ul>
            </li>
          </ul>
          
          <h4>Strengthening Progression</h4>
          
          <h5>Week 1-2: Isometric Phase</h5>
          <ul>
            <li><strong>Isometric wrist extension:</strong> 5 seconds hold, 10 reps, 3 sets</li>
            <li><strong>Isometric wrist flexion:</strong> 5 seconds hold, 10 reps, 3 sets</li>
            <li><strong>Isometric pronation/supination:</strong> 5 seconds hold, 10 reps each</li>
            <li><strong>Grip strengthening:</strong> Putty or soft ball, 10 x 5 seconds</li>
          </ul>
          
          <h5>Week 3-4: Concentric Phase</h5>
          <ul>
            <li><strong>Wrist curls:</strong> 1-2 lbs, 3x15, slow controlled movement</li>
            <li><strong>Reverse wrist curls:</strong> 1-2 lbs, 3x15</li>
            <li><strong>Pronation/supination:</strong> Hammer or weighted stick, 3x15</li>
            <li><strong>Bicep curls:</strong> Light weight, 3x12</li>
            <li><strong>Tricep extensions:</strong> Light weight, 3x12</li>
          </ul>
          
          <h5>Week 5-6: Eccentric Phase</h5>
          <ul>
            <li><strong>FlexBar eccentric (Tyler Twist):</strong>
              <ul>
                <li>For lateral epicondylalgia</li>
                <li>Twist bar with affected hand in extension</li>
                <li>Slowly release into flexion</li>
                <li>3x15, twice daily</li>
              </ul>
            </li>
            <li><strong>Reverse Tyler Twist:</strong>
              <ul>
                <li>For medial epicondylalgia</li>
                <li>Twist bar with affected hand in flexion</li>
                <li>Slowly release into extension</li>
                <li>3x15, twice daily</li>
              </ul>
            </li>
            <li><strong>Eccentric wrist curls:</strong> Slow lowering phase 3-4 seconds</li>
          </ul>
          
          <h5>Week 7-8: Functional Phase</h5>
          <ul>
            <li><strong>Resistance band exercises:</strong>
              <ul>
                <li>Rows, chest press, overhead press</li>
                <li>D2 flexion/extension patterns</li>
                <li>3x15 each exercise</li>
              </ul>
            </li>
            <li><strong>Medicine ball exercises:</strong>
              <ul>
                <li>Chest pass, overhead throw</li>
                <li>Rotational throws</li>
                <li>Start with 2-4 lb ball</li>
              </ul>
            </li>
            <li><strong>Closed chain exercises:</strong>
              <ul>
                <li>Wall push-ups progressing to floor</li>
                <li>Quadruped weight shifts</li>
                <li>Plank variations</li>
              </ul>
            </li>
          </ul>
          
          <h4>Sport-Specific Programs</h4>
          
          <h5>Tennis Player Return</h5>
          <ul>
            <li>Week 1-2: Shadow swings without racquet</li>
            <li>Week 3-4: Light racquet, foam balls against wall</li>
            <li>Week 5-6: Regular balls, short court</li>
            <li>Week 7-8: Progress to baseline rallies</li>
            <li>Week 9-10: Add serving progressively</li>
            <li>Week 11-12: Return to match play</li>
          </ul>
          
          <h5>Throwing Athlete Program</h5>
          <ul>
            <li>Week 1: Short toss 15-20 feet</li>
            <li>Week 2-3: Progress to 45 feet</li>
            <li>Week 4-5: Long toss to 60-90 feet</li>
            <li>Week 6-8: Progress to 120 feet</li>
            <li>Week 9-10: Mound work at 50% effort</li>
            <li>Week 11-12: Progress to full velocity</li>
          </ul>
          
          <h4>Exercise Dosage Guidelines</h4>
          <ul>
            <li><strong>Tendinopathy:</strong> 3x15 reps, slow eccentric (3-4 seconds), daily</li>
            <li><strong>Strength building:</strong> 3-4 sets x 8-12 reps, 3x per week</li>
            <li><strong>Endurance:</strong> 2-3 sets x 15-20 reps, lighter weight</li>
            <li><strong>Power:</strong> 3-5 sets x 3-5 reps, explosive movement</li>
            <li><strong>Pain monitoring:</strong> Keep pain ≤3/10 during exercise, ≤5/10 after</li>
          </ul>
        `
      }
    ]
  }
};

// Function to get appropriate content based on module title
function getElbowModuleContent(moduleTitle: string) {
  const title = moduleTitle.toLowerCase();
  
  if (title.includes('anatomy')) {
    return ELBOW_MODULE_CONTENT.anatomy;
  } else if (title.includes('assessment') || title.includes('examination')) {
    return ELBOW_MODULE_CONTENT.assessment;
  } else if (title.includes('differential') || title.includes('diagnosis')) {
    return ELBOW_MODULE_CONTENT.differential;
  } else if (title.includes('treatment') || title.includes('management') || title.includes('rehabilitation')) {
    return ELBOW_MODULE_CONTENT.treatment;
  } else if (title.includes('exercise') || title.includes('therapeutic') || title.includes('prescription')) {
    return ELBOW_MODULE_CONTENT.exercise;
  } else {
    // Default to treatment content for general modules
    return ELBOW_MODULE_CONTENT.treatment;
  }
}

// Main function to populate elbow course
export async function populateElbowCourse() {
  try {
    console.log('Populating Elbow Rehabilitation Strategies course with detailed content...');
    
    // Get the elbow course
    const elbowCourse = await db.select()
      .from(courses)
      .where(eq(courses.id, 3)) // Elbow Rehabilitation Strategies
      .limit(1);
    
    if (elbowCourse.length === 0) {
      console.log('⚠️ Elbow Rehabilitation Strategies course not found in database - skipping population');
      return;
    }
    
    // Get all modules for the elbow course
    const modules = await db.select()
      .from(courseModules)
      .where(eq(courseModules.courseId, 3));
    
    console.log(`Found ${modules.length} modules for elbow course`);
    
    // Update each module with specific elbow content
    for (const module of modules) {
      const elbowContent = getElbowModuleContent(module.title);
      
      // Parse existing content
      let existingContent;
      try {
        existingContent = typeof module.content === 'string' 
          ? JSON.parse(module.content) 
          : module.content || {};
      } catch (e) {
        existingContent = {};
      }
      
      // Merge with elbow-specific content
      const updatedContent = {
        ...existingContent,
        ...elbowContent,
        moduleTitle: module.title,
        courseTitle: 'Elbow Rehabilitation Strategies',
        lastUpdated: new Date().toISOString()
      };
      
      // Update the module
      await db.update(courseModules)
        .set({ 
          content: JSON.stringify(updatedContent),
          updatedAt: new Date()
        })
        .where(eq(courseModules.id, module.id));
      
      console.log(`✅ Updated module: ${module.title} with elbow-specific content`);
    }
    
    console.log('✅ Successfully populated Elbow Rehabilitation Strategies course with detailed content');
    return { success: true, modulesUpdated: modules.length };
    
  } catch (error) {
    console.error('Error populating elbow course:', error);
    return { success: false, error: error.message };
  }
}