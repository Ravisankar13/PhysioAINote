import { db } from './db';
import { courseModules, courses } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ComprehensiveContent {
  type: string;
  sections: ContentSection[];
}

interface ContentSection {
  type: "text" | "video" | "interactive" | "quiz" | "3d_scanner" | "biodigital_3d" | "clinical_images" | "anatomy_images";
  title: string;
  content: string;
  subSections?: SubSection[];
  keyPoints?: string[];
  clinicalPearls?: string[];
  contraindications?: string[];
  evidenceBase?: string[];
}

interface SubSection {
  heading: string;
  content: string;
}

/**
 * Generates comprehensive educational content based on module title and context
 */
function generateComprehensiveContent(moduleTitle: string, courseTitle: string): ComprehensiveContent {
  const contentMap: Record<string, () => ComprehensiveContent> = {
    // Shoulder Modules
    "Shoulder Anatomy & Biomechanics": () => ({
      type: "comprehensive",
      sections: [
        {
          type: "text" as const,
          title: "Anatomical Structures of the Shoulder Complex",
          content: `The shoulder complex is one of the most sophisticated joint systems in the human body, comprising four articulations that work in precise coordination. Understanding its intricate anatomy is fundamental to effective clinical assessment and treatment.

The glenohumeral joint, the primary articulation, features a shallow glenoid fossa that accommodates only 25-30% of the humeral head surface area. This design prioritizes mobility over stability, requiring sophisticated neuromuscular control and passive restraint systems. The glenoid labrum deepens the socket by approximately 50%, creating a suction-seal effect that contributes significantly to joint stability.

The joint capsule varies in thickness and tension depending on arm position. The anterior capsule, reinforced by the glenohumeral ligaments (superior, middle, and inferior), provides crucial restraint against anterior translation. The inferior glenohumeral ligament complex (IGHLC) acts as the primary static stabilizer in abduction and external rotation positions.`,
          subSections: [
            {
              heading: "Osseous Anatomy",
              content: "The scapula serves as the mobile base for upper extremity function. Its anatomical landmarks include the acromion process, coracoid process, spine, glenoid fossa, and various muscle attachment sites. The clavicle acts as a strut, maintaining the shoulder's lateral position while allowing complex three-dimensional movement. The humeral head has a 130-150° inclination angle and 20-30° retroversion, critical factors in joint biomechanics and surgical considerations."
            },
            {
              heading: "Muscular Anatomy",
              content: "The rotator cuff muscles (supraspinatus, infraspinatus, teres minor, subscapularis) form a dynamic stabilizing sleeve around the humeral head. These muscles compress the humeral head into the glenoid, providing stability through concavity compression. The force couples created between the subscapularis anteriorly and infraspinatus/teres minor posteriorly, along with the deltoid-rotator cuff force couple in the coronal plane, enable controlled humeral movement."
            },
            {
              heading: "Neurovascular Structures",
              content: "The brachial plexus passes through the thoracic outlet, traveling beneath the clavicle and over the first rib. The axillary nerve, particularly vulnerable in shoulder dislocations and proximal humeral fractures, innervates the deltoid and teres minor while providing sensation to the lateral shoulder. The suprascapular nerve, which innervates the supraspinatus and infraspinatus, can be compressed at the suprascapular or spinoglenoid notches."
            }
          ],
          keyPoints: [
            "The shoulder sacrifices stability for mobility through its bony architecture",
            "Static and dynamic stabilizers work synergistically to maintain joint stability",
            "Understanding force couples is essential for rehabilitation planning",
            "Neurovascular anatomy knowledge is crucial for safe clinical practice"
          ],
          evidenceBase: [
            "Veeger & van der Helm (2007) demonstrated the importance of rotator cuff force couples in shoulder stability",
            "Ludewig & Reynolds (2009) provided comprehensive analysis of shoulder kinematics and muscle activation patterns",
            "Kibler et al. (2013) established the role of the scapula in shoulder function and pathology"
          ]
        },
        {
          type: "text" as const,
          title: "Biomechanics of Shoulder Movement",
          content: `Normal shoulder function requires coordinated movement between all components of the shoulder complex. The scapulohumeral rhythm, typically described as a 2:1 ratio of glenohumeral to scapulothoracic motion during arm elevation, represents a fundamental concept in shoulder biomechanics.

During the initial 30° of arm elevation, movement occurs primarily at the glenohumeral joint with minimal scapular motion (setting phase). From 30-90°, the scapula begins upward rotation, with the ratio approaching 2:1. Beyond 90°, both joints contribute equally, with increased clavicular elevation and posterior rotation.

The instant center of rotation (ICR) for the glenohumeral joint remains relatively centered on the glenoid face throughout the range of motion in healthy shoulders. This centralization requires precise muscle timing and force production. Any disruption in this pattern can lead to superior humeral head migration and impingement.`,
          subSections: [
            {
              heading: "Planes of Movement",
              content: "Shoulder movement occurs in multiple planes simultaneously. Flexion combines with internal rotation and horizontal adduction during functional reaching. Abduction in the scapular plane (30-40° anterior to the frontal plane) represents the position of optimal bony congruence and muscular efficiency. Understanding these three-dimensional movement patterns is essential for assessment and rehabilitation planning."
            },
            {
              heading: "Muscle Activation Patterns",
              content: "EMG studies reveal specific activation sequences during arm elevation. The supraspinatus initiates abduction with the middle deltoid becoming dominant after 30°. The infraspinatus and teres minor provide external rotation and posterior stability. The subscapularis prevents anterior translation while contributing to internal rotation torque. Serratus anterior and trapezius work synergistically to produce scapular upward rotation, posterior tilt, and external rotation."
            },
            {
              heading: "Kinetic Chain Integration",
              content: "The shoulder functions as part of a kinetic chain extending from the feet to the fingertips. Approximately 50% of shoulder kinetic energy originates from the legs and trunk during throwing activities. Core stability directly influences scapular positioning and muscle activation patterns. Dysfunction anywhere in the chain can manifest as shoulder pathology."
            }
          ],
          clinicalPearls: [
            "Assess scapulohumeral rhythm in multiple planes to identify subtle dyskinesis",
            "Consider kinetic chain influences in all shoulder evaluations",
            "Restoration of normal ICR is crucial for successful rehabilitation",
            "Scapular plane movements often allow pain-free exercise earlier in rehabilitation"
          ],
          contraindications: [
            "Avoid aggressive stretching in the presence of instability",
            "Overhead activities contraindicated in acute impingement",
            "Resistive testing inappropriate with suspected complete tears"
          ]
        },
        {
          type: "text" as const,
          title: "Clinical Application and Assessment Strategies",
          content: `Translating anatomical and biomechanical knowledge into clinical practice requires systematic assessment approaches. Understanding normal variations and compensatory patterns enables accurate identification of pathology.

The clinical examination should progress systematically from observation through passive and active movements to resistive testing and special tests. Each component provides unique information that contributes to the diagnostic picture. Integration of findings with clinical reasoning leads to accurate diagnosis and targeted treatment.

Postural assessment reveals the resting position of the shoulder complex. Forward head posture, increased thoracic kyphosis, and protracted shoulders create a biomechanically disadvantaged position that predisposes to pathology. Scapular positioning assessment includes evaluation of height, protraction/retraction, and rotation.`,
          subSections: [
            {
              heading: "Movement Assessment Techniques",
              content: "Visual assessment of movement quality provides valuable diagnostic information. Observe for painful arcs, catching, or apprehension during movement. Note the presence of trick movements or compensatory patterns. Document scapular winging, hiking, or dysrhythmia. Assess the smoothness and control of movement throughout the range."
            },
            {
              heading: "Palpation Strategies",
              content: "Systematic palpation helps identify specific structures involved in pathology. Begin with bony landmarks to establish orientation. Palpate muscles for tone, tenderness, and trigger points. Assess joint lines for synovitis or effusion. Compare findings bilaterally, noting asymmetries in tissue texture, temperature, or tenderness."
            },
            {
              heading: "Integration with Technology",
              content: "Modern assessment tools enhance clinical evaluation. Motion capture systems quantify movement patterns objectively. Ultrasound imaging allows real-time visualization of soft tissue structures during movement. EMG biofeedback assists in identifying muscle activation deficits. These technologies complement but don't replace skilled clinical examination."
            }
          ],
          keyPoints: [
            "Systematic assessment ensures comprehensive evaluation",
            "Movement quality assessment often more valuable than range measurements alone",
            "Technology enhances but doesn't replace clinical skills",
            "Always correlate findings with functional limitations"
          ],
          evidenceBase: [
            "McClure et al. (2009) validated clinical assessment of scapular dyskinesis",
            "Hegedus et al. (2012) systematic review of special tests accuracy",
            "Struyf et al. (2014) demonstrated the importance of scapular assessment in shoulder pain"
          ]
        }
      ]
    }),

    "Systematic Shoulder Assessment": () => ({
      type: "comprehensive",
      sections: [
        {
          type: "text" as const,
          title: "Comprehensive Subjective Examination",
          content: `The subjective examination forms the foundation of clinical assessment, providing 80% of the information needed for accurate diagnosis. A systematic approach ensures comprehensive data collection while building therapeutic rapport.

Begin with open-ended questions allowing patients to describe their problem in their own words. This narrative provides insights into their understanding, concerns, and expectations. Listen for emotional cues and psychosocial factors that may influence presentation and recovery.

The pain history should explore onset, mechanism, progression, and current status. Differentiate between traumatic and insidious onset. For traumatic cases, details about mechanism, immediate symptoms, and initial management guide diagnosis. Insidious onset requires investigation of contributing factors including occupational demands, training changes, or systemic conditions.`,
          subSections: [
            {
              heading: "Pain Assessment and Characterization",
              content: "Comprehensive pain assessment goes beyond simple severity ratings. Explore pain quality using descriptors that differentiate nociceptive, neuropathic, and nociplastic mechanisms. Map pain distribution precisely, noting primary and referral patterns. Document temporal patterns including 24-hour behavior, relationship to activity, and response to rest. Investigate aggravating and easing factors systematically, as these guide mechanical diagnosis and treatment selection."
            },
            {
              heading: "Functional Impact Assessment",
              content: "Document specific functional limitations relevant to the patient's lifestyle and goals. Use validated outcome measures like the DASH, SPADI, or ASES scores for baseline assessment. Explore work-related demands including repetitive movements, sustained positions, and load requirements. Assess sport or recreational activity limitations, including specific movements or positions that provoke symptoms. Consider activities of daily living impacts, particularly overhead activities, dressing, and sleeping positions."
            },
            {
              heading: "Psychosocial Screening",
              content: "Screen for yellow flags that may influence recovery. Assess fear-avoidance beliefs about movement and activity. Explore previous treatment experiences and their outcomes. Investigate stress levels, sleep quality, and general health status. Consider work satisfaction and compensation issues if relevant. Document catastrophizing tendencies or unrealistic recovery expectations."
            }
          ],
          keyPoints: [
            "The subjective examination provides the majority of diagnostic information",
            "Systematic questioning ensures comprehensive assessment",
            "Psychosocial factors significantly influence outcomes",
            "Functional goals guide treatment planning"
          ],
          clinicalPearls: [
            "Let patients tell their story before directing questions",
            "Body language often reveals more than words",
            "Validate patient concerns to build therapeutic alliance",
            "Red flags require immediate medical referral"
          ]
        },
        {
          type: "text" as const,
          title: "Advanced Physical Examination Protocols",
          content: `The physical examination systematically evaluates tissue structure, function, and pain reproduction. A structured approach ensures reproducibility and comprehensive assessment while maintaining clinical efficiency.

Begin with observation from the moment the patient enters the clinic. Note spontaneous movement patterns, guarding behaviors, and functional limitations. Formal observation includes static posture assessment in standing and sitting positions. Document shoulder heights, scapular positioning, muscle bulk, and any visible deformity or swelling.

Active movement testing assesses willingness to move, available range, and quality of movement. Test cardinal plane movements first, then combine movements to assess functional patterns. Observe from multiple angles to identify subtle compensations. Document painful arcs, catching, or crepitus during movement.`,
          subSections: [
            {
              heading: "Range of Motion Assessment",
              content: "Measure active range of motion using reliable landmarks and standardized positions. Compare with passive range to identify capsular, muscular, or voluntary restrictions. Assess end-feel quality to differentiate between tissue types limiting movement. Normal end-feels include bone-on-bone (hard), capsular (firm), and muscular (elastic). Abnormal end-feels suggest specific pathologies: empty (severe pain), spasm (reactive muscle guarding), or springy block (mechanical block)."
            },
            {
              heading: "Strength and Motor Control Testing",
              content: "Manual muscle testing provides information about muscle strength, pain provocation, and neural integrity. Test in standardized positions ensuring optimal muscle length-tension relationships. Begin with isometric testing in neutral positions before progressing to through-range testing. Break tests assess maximum strength while make tests evaluate motor control and endurance. Document both strength grades (0-5 scale) and pain provocation. Consider using handheld dynamometry for objective strength quantification."
            },
            {
              heading: "Special Tests Integration",
              content: "Special tests confirm or refute diagnostic hypotheses generated from the history and basic examination. Understand test sensitivity, specificity, and likelihood ratios to interpret results appropriately. Cluster tests to improve diagnostic accuracy - single tests rarely provide definitive diagnosis. Common test clusters include: impingement (Neer's, Hawkins-Kennedy, painful arc), instability (apprehension, relocation, surprise), and rotator cuff integrity (external rotation lag, drop arm, belly press)."
            }
          ],
          contraindications: [
            "Avoid provocative testing in acute inflammation",
            "Do not force through muscle spasm or guarding",
            "Cease testing if neurological symptoms develop",
            "Refer immediately for red flag presentations"
          ],
          evidenceBase: [
            "Michener et al. (2009) validated impingement test clusters",
            "Park et al. (2005) demonstrated improved accuracy with combined tests",
            "Tennent et al. (2003) systematic review of rotator cuff tests"
          ]
        },
        {
          type: "text" as const,
          title: "Differential Diagnosis and Clinical Reasoning",
          content: `Clinical reasoning integrates examination findings into accurate diagnosis and effective treatment planning. Pattern recognition combined with hypothetico-deductive reasoning enables efficient clinical decision-making.

Develop multiple competing hypotheses early in the examination based on epidemiology and initial presentation. Use examination findings to support or refute each hypothesis. Consider both musculoskeletal and non-musculoskeletal sources of shoulder pain. Remember that multiple pathologies often coexist, particularly in older populations.

The tissue-specific diagnosis identifies structures involved but doesn't explain why the problem developed. Consider contributing factors including biomechanical faults, training errors, and systemic influences. Understanding these factors enables targeted treatment addressing both symptoms and causes.`,
          subSections: [
            {
              heading: "Common Diagnostic Categories",
              content: "Rotator cuff pathology presents along a continuum from tendinopathy through partial to complete tears. Impingement syndromes may be structural (Type I-III acromion) or functional (scapular dyskinesis, posterior capsule tightness). Instability ranges from subtle microinstability to frank dislocation. Frozen shoulder progresses through freezing, frozen, and thawing phases. Each category requires specific assessment and treatment approaches."
            },
            {
              heading: "Diagnostic Imaging Integration",
              content: "Imaging supplements but doesn't replace clinical examination. Understand imaging capabilities and limitations for clinical correlation. X-rays show bony architecture, calcifications, and joint space. Ultrasound excellently visualizes superficial soft tissues and allows dynamic assessment. MRI provides comprehensive soft tissue visualization but may show asymptomatic findings. Correlate imaging findings with clinical presentation - treat the patient, not the scan."
            },
            {
              heading: "Clinical Decision Rules",
              content: "Evidence-based clinical decision rules guide diagnosis and prognosis. The rotator cuff tear rule combines age >60, painful arc, infraspinatus weakness, and positive external rotation lag. The frozen shoulder classification uses pain predominance and movement restriction patterns. Understanding these rules improves diagnostic accuracy and communication with other healthcare providers."
            }
          ],
          keyPoints: [
            "Multiple pathologies often coexist in shoulder pain",
            "Clinical reasoning evolves throughout the examination",
            "Imaging findings must correlate with clinical presentation",
            "Address contributing factors for lasting resolution"
          ],
          clinicalPearls: [
            "The most common diagnoses are most common",
            "Bilateral symptoms suggest systemic involvement",
            "Night pain indicates inflammation or serious pathology",
            "Failed conservative treatment warrants reassessment"
          ]
        }
      ]
    }),

    // Add additional specific content generators
    ...additionalContentGenerators,
    
    // Default handler for any module not specifically mapped
    "default": () => generateGenericContent(moduleTitle, courseTitle)
  };

  // Return specific content if available, otherwise generate generic content
  const generator = contentMap[moduleTitle] || contentMap["default"];
  return generator();
}

/**
 * Generates generic comprehensive content for any module
 */
function generateGenericContent(moduleTitle: string, courseTitle: string): ComprehensiveContent {
  const bodyPart = extractBodyPart(courseTitle, moduleTitle);
  const topic = extractTopic(moduleTitle);
  
  return {
    type: "comprehensive",
    sections: [
      {
        type: "text" as const,
        title: `Foundational Knowledge: ${topic}`,
        content: `This module provides comprehensive understanding of ${topic} within the context of ${bodyPart || 'musculoskeletal'} physiotherapy practice. The content integrates current evidence-based practices with clinical expertise to develop advanced assessment and treatment capabilities.

Understanding ${topic} requires integration of anatomical knowledge, biomechanical principles, and clinical reasoning skills. This foundation enables accurate assessment, diagnosis, and treatment planning tailored to individual patient presentations.

The physiotherapist must consider multiple factors including tissue pathology, movement dysfunction, contributing factors, and psychosocial influences. This holistic approach ensures comprehensive patient care addressing both symptoms and underlying causes.`,
        subSections: [
          {
            heading: "Theoretical Framework",
            content: `The theoretical understanding of ${topic} encompasses anatomical structures, physiological processes, and pathological mechanisms. Normal tissue structure and function provides the baseline for identifying pathological changes. Understanding healing processes and tissue adaptation guides treatment progression and prognosis.`
          },
          {
            heading: "Clinical Relevance",
            content: `Application of ${topic} knowledge in clinical practice requires translation of theoretical concepts into practical skills. This includes recognition of clinical patterns, interpretation of examination findings, and selection of appropriate interventions. Evidence-based practice integrates research findings with clinical expertise and patient values.`
          },
          {
            heading: "Current Evidence",
            content: `Recent research in ${topic} has advanced understanding of pathophysiology, assessment accuracy, and treatment effectiveness. Systematic reviews and clinical practice guidelines provide synthesis of current evidence. Critical appraisal skills enable clinicians to evaluate and apply research findings appropriately.`
          }
        ],
        keyPoints: [
          `Comprehensive understanding of ${topic} requires theoretical and practical knowledge`,
          "Evidence-based practice integrates multiple information sources",
          "Clinical reasoning guides individualized patient care",
          "Continuous learning ensures current practice"
        ],
        evidenceBase: [
          "Current clinical practice guidelines specific to the condition",
          "Recent systematic reviews and meta-analyses",
          "High-quality randomized controlled trials",
          "Expert consensus statements where evidence is limited"
        ]
      },
      {
        type: "text" as const,
        title: `Clinical Assessment and Examination`,
        content: `Systematic assessment of ${topic} enables accurate diagnosis and targeted treatment planning. The examination process progresses logically from subjective history through objective testing to clinical reasoning and diagnosis.

A comprehensive subjective examination explores symptom characteristics, functional impacts, and contributing factors. This information guides hypothesis formation and directs the physical examination. Patient-reported outcome measures provide standardized assessment of symptoms and function.

The objective examination systematically evaluates relevant structures and functions. Observation, palpation, movement assessment, and special testing provide complementary information. Integration of findings with clinical reasoning leads to accurate diagnosis.`,
        subSections: [
          {
            heading: "Subjective Assessment Strategies",
            content: `Detailed history taking explores onset, progression, and current status of symptoms. Pain assessment includes location, quality, severity, and behavior. Functional limitations relevant to work, sport, and daily activities guide goal setting. Psychosocial screening identifies factors that may influence presentation and recovery.`
          },
          {
            heading: "Objective Examination Protocols",
            content: `Physical examination follows a systematic sequence ensuring comprehensive assessment. Active movements assess willingness to move and available range. Passive movements differentiate between contractile and non-contractile tissue involvement. Resisted testing evaluates strength and pain provocation. Special tests confirm or refute diagnostic hypotheses.`
          },
          {
            heading: "Clinical Reasoning Integration",
            content: `Pattern recognition and hypothetico-deductive reasoning guide diagnostic decisions. Multiple competing hypotheses are developed and tested throughout examination. Red flags requiring medical referral must be recognized immediately. Yellow flags suggesting psychosocial influences warrant appropriate management strategies.`
          }
        ],
        keyPoints: [
          "Systematic assessment ensures comprehensive evaluation",
          "Subjective examination provides majority of diagnostic information",
          "Multiple examination findings improve diagnostic accuracy",
          "Clinical reasoning evolves throughout the assessment process"
        ],
        clinicalPearls: [
          "Listen actively to patient narratives for diagnostic clues",
          "Observe movement quality not just range",
          "Correlate examination findings with functional limitations",
          "Reassess regularly to monitor progress and modify treatment"
        ]
      },
      {
        type: "text" as const,
        title: `Treatment Strategies and Interventions`,
        content: `Evidence-based treatment of ${topic} integrates multiple intervention approaches tailored to individual patient presentations. Treatment selection considers pathology stage, irritability, functional goals, and patient preferences.

Manual therapy techniques address specific tissue dysfunctions identified during assessment. These may include joint mobilization, soft tissue techniques, and neural mobilization. Technique selection, dosage, and progression depend on tissue reactivity and treatment response.

Exercise prescription forms the cornerstone of lasting improvement. Progressive loading stimulates tissue adaptation while respecting healing constraints. Exercises address identified impairments including weakness, tightness, and motor control deficits. Functional training ensures transfer to meaningful activities.`,
        subSections: [
          {
            heading: "Manual Therapy Applications",
            content: `Hands-on techniques provide symptomatic relief and restore normal tissue function. Joint mobilizations address capsular restrictions and restore arthrokinematic movement. Soft tissue techniques reduce muscle tension and improve flexibility. Neural mobilization addresses adverse neural tension contributing to symptoms. Technique selection matches tissue irritability and treatment goals.`
          },
          {
            heading: "Exercise Prescription Principles",
            content: `Therapeutic exercise addresses specific impairments while promoting general fitness. Initial exercises focus on pain reduction and movement restoration. Progressive strengthening follows tissue healing timelines and load tolerance. Motor control training addresses movement quality and compensatory patterns. Functional exercises ensure transfer to meaningful activities.`
          },
          {
            heading: "Patient Education Components",
            content: `Education empowers patients for active participation in recovery. Explanation of diagnosis and prognosis reduces uncertainty and anxiety. Activity modification advice prevents symptom provocation while maintaining function. Self-management strategies including exercises and pain relief techniques promote independence. Addressing misconceptions and fears facilitates recovery.`
          }
        ],
        contraindications: [
          "Avoid aggressive treatment in acute inflammation",
          "Progressive loading must respect tissue healing timelines",
          "High-velocity techniques contraindicated with osteoporosis",
          "Consider medication interactions affecting tissue response"
        ],
        keyPoints: [
          "Multimodal treatment addresses different aspects of the condition",
          "Treatment progression matches tissue healing and adaptation",
          "Patient education and self-management are essential",
          "Regular reassessment guides treatment modification"
        ]
      }
    ]
  };
}

/**
 * Extract body part from course or module title
 */
function extractBodyPart(courseTitle: string, moduleTitle: string): string {
  const text = `${courseTitle} ${moduleTitle}`.toLowerCase();
  
  if (text.includes('shoulder')) return 'shoulder';
  if (text.includes('knee')) return 'knee';
  if (text.includes('hip')) return 'hip';
  if (text.includes('ankle') || text.includes('foot')) return 'ankle and foot';
  if (text.includes('spine') || text.includes('back') || text.includes('lumbar') || text.includes('cervical')) return 'spine';
  if (text.includes('elbow')) return 'elbow';
  if (text.includes('wrist') || text.includes('hand')) return 'wrist and hand';
  if (text.includes('neck')) return 'neck';
  
  return 'musculoskeletal';
}

/**
 * Extract main topic from module title
 */
function extractTopic(moduleTitle: string): string {
  // Remove common words and return cleaned topic
  const cleaned = moduleTitle
    .replace(/^(Introduction to|Advanced|Basic|Comprehensive|Clinical)\s+/i, '')
    .replace(/\s+(Assessment|Treatment|Management|Techniques|Strategies)$/i, '');
  
  return cleaned || moduleTitle;
}

/**
 * Main function to populate all modules with comprehensive content
 */
export async function populateAllModulesWithComprehensiveContent() {
  try {
    console.log('Starting comprehensive content population for all modules...');
    
    // Fetch all modules with their course information
    const modules = await db.select({
      id: courseModules.id,
      title: courseModules.title,
      courseId: courseModules.courseId,
      content: courseModules.content
    }).from(courseModules);
    
    console.log(`Found ${modules.length} modules to populate with comprehensive content`);
    
    let updatedCount = 0;
    
    // Process modules in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < modules.length; i += batchSize) {
      const batch = modules.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (module) => {
        try {
          // Get course information for context
          const courseInfo = await db.query.courses.findFirst({
            where: eq(courses.id, module.courseId)
          });
          
          const courseTitle = courseInfo?.title || 'General Physiotherapy';
          
          // Generate comprehensive content
          const comprehensiveContent = generateComprehensiveContent(module.title, courseTitle);
          
          // Update module with comprehensive content
          await db.update(courseModules)
            .set({
              content: comprehensiveContent,
              updatedAt: new Date()
            })
            .where(eq(courseModules.id, module.id));
          
          updatedCount++;
          console.log(`Updated module ${module.id}: ${module.title}`);
        } catch (error) {
          console.error(`Error updating module ${module.id}:`, error);
        }
      }));
      
      console.log(`Processed ${Math.min(i + batchSize, modules.length)} of ${modules.length} modules`);
    }
    
    console.log(`✅ Successfully populated ${updatedCount} modules with comprehensive content`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error('Error populating comprehensive content:', error);
    return { success: false, error };
  }
}

// Add more specific content generators for different module types
const additionalContentGenerators: Record<string, () => ComprehensiveContent> = {
  "ACL Injuries: Non-Operative Management": () => ({
    type: "comprehensive",
    sections: [
      {
        type: "text" as const,
        title: "Understanding ACL Injuries and Non-Operative Management",
        content: `Anterior cruciate ligament (ACL) injuries represent one of the most significant knee injuries in sports and active populations. While surgical reconstruction has been the traditional gold standard, growing evidence supports non-operative management for selected patients. This comprehensive approach requires thorough understanding of injury mechanisms, healing potential, and rehabilitation principles.

The ACL primarily functions to prevent anterior tibial translation and contributes to rotational stability. Complete rupture results in mechanical instability that may lead to giving way episodes, particularly during cutting and pivoting activities. However, not all patients experience functional instability, and some can compensate effectively through neuromuscular control.

Non-operative management candidates include patients with low activity demands, isolated ACL tears without associated injuries, good neuromuscular control, and motivation for intensive rehabilitation. Age alone shouldn't determine treatment choice, as active older adults may benefit from reconstruction while younger patients with sedentary lifestyles may succeed with conservative management.`,
        subSections: [
          {
            heading: "Pathophysiology and Natural History",
            content: "ACL rupture typically occurs through non-contact mechanisms involving deceleration, cutting, or landing with knee near extension and rotation. The 'pop' sensation and immediate effusion indicate intra-articular injury. Natural history studies show variable outcomes: some patients adapt well with minimal symptoms while others develop chronic instability and secondary injuries. Factors influencing outcomes include activity level, neuromuscular control, associated injuries, and rehabilitation compliance."
          },
          {
            heading: "Patient Selection Criteria",
            content: "Successful non-operative management requires careful patient selection. Ideal candidates have recreational rather than competitive athletic demands, particularly avoiding cutting/pivoting sports. Isolated ACL tears without significant meniscal damage or other ligamentous injuries have better prognosis. Strong baseline neuromuscular control and proprioception predict better outcomes. Patient understanding of lifestyle modifications and commitment to long-term exercise maintenance is essential."
          },
          {
            heading: "Risk Stratification",
            content: "Risk assessment guides treatment decisions and patient counseling. High-risk factors for failure include young age with return to cutting sports, generalized ligamentous laxity, high-grade pivot shift, and associated repairable meniscal tears. Moderate risk involves recreational sports participation and moderate instability. Low risk includes sedentary lifestyle, excellent neuromuscular control, and minimal giving way episodes."
          }
        ],
        keyPoints: [
          "Non-operative management can be successful in selected patients",
          "Patient selection and counseling are crucial for success",
          "Neuromuscular control compensation is the key mechanism",
          "Long-term commitment to exercise is essential"
        ],
        evidenceBase: [
          "Frobell et al. (2010, 2013) KANON trial showing similar outcomes at 2 and 5 years",
          "Grindem et al. (2016) demonstrating importance of rehabilitation quality",
          "Wellsandt et al. (2018) on neuromuscular factors predicting success"
        ]
      }
    ]
  }),
  
  "Lumbar Disc Herniation": () => ({
    type: "comprehensive", 
    sections: [
      {
        type: "text" as const,
        title: "Pathophysiology and Clinical Presentation of Lumbar Disc Herniation",
        content: `Lumbar disc herniation represents a common cause of radicular pain and neurological dysfunction. Understanding the pathophysiological processes, natural history, and clinical presentations enables accurate diagnosis and appropriate management decisions.

The intervertebral disc comprises the nucleus pulposus (proteoglycan-rich gel), annulus fibrosus (concentric collagen layers), and cartilaginous endplates. Disc herniation occurs when nuclear material extrudes through annular tears, potentially compressing neural structures. The L4-5 and L5-S1 levels account for 90-95% of herniations due to mechanical stress concentration.

Herniation types include protrusion (intact outer annulus), extrusion (through outer annulus), and sequestration (free fragment). Location classifications include central, paracentral, foraminal, and far lateral. Each type and location produces distinct clinical patterns requiring specific assessment and treatment approaches.`,
        subSections: [
          {
            heading: "Mechanisms and Risk Factors",
            content: "Disc herniation results from complex interactions between mechanical loading, disc degeneration, and genetic factors. Repetitive flexion-rotation movements, prolonged sitting, and heavy lifting increase intradiscal pressure and annular stress. Age-related proteoglycan loss reduces nuclear hydration and load distribution. Genetic factors account for up to 75% of disc degeneration variance. Modifiable risk factors include smoking, obesity, occupational demands, and poor lifting mechanics."
          },
          {
            heading: "Clinical Syndromes",
            content: "Clinical presentation varies with herniation level and neural compression severity. L3-4 herniations affect the L4 nerve root causing anterior thigh pain, knee extension weakness, and diminished patellar reflex. L4-5 herniations compress L5 causing lateral leg and dorsal foot pain, ankle dorsiflexion and great toe extension weakness, with no reflex changes. L5-S1 herniations affect S1 producing posterior leg and lateral foot pain, plantarflexion weakness, and diminished Achilles reflex. Cauda equina syndrome from large central herniations represents a surgical emergency."
          },
          {
            heading: "Natural History and Prognosis",
            content: "Most disc herniations demonstrate favorable natural history with 80-90% improving within 3 months. Resorption occurs in 66-75% of cases, particularly with larger extrusions and sequestrations due to inflammatory response and neovascularization. Factors predicting good outcomes include younger age, shorter symptom duration, absence of motor deficit, and smaller herniation size. Poor prognostic factors include worker's compensation, psychological distress, and severe neurological deficit."
          }
        ],
        keyPoints: [
          "90% of disc herniations occur at L4-5 or L5-S1 levels",
          "Clinical presentation depends on herniation level and location",
          "Most herniations improve spontaneously within 3 months",
          "Cauda equina syndrome requires emergency surgical referral"
        ],
        clinicalPearls: [
          "Crossed straight leg raise is more specific than ipsilateral SLR",
          "Progressive neurological deficit warrants surgical consultation",
          "Centralization phenomenon predicts good conservative outcomes",
          "MRI findings must correlate with clinical presentation"
        ]
      }
    ]
  })
};

// Export for use in other scripts
export default populateAllModulesWithComprehensiveContent;