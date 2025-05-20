/**
 * Sports Map Australia Library
 * 
 * This module contains evidence-based sports physiotherapy content from Sports Map Australia
 * (sportsmap.com.au) to enhance the platform with specialized sports rehabilitation approaches.
 * 
 * Key areas covered:
 * 1. Sports-specific assessment and rehabilitation techniques
 * 2. Return to sport testing and criteria
 * 3. High-performance rehabilitation protocols
 * 4. Injury prevention strategies for athletes
 */

import { InsertExercise, bodyPartEnum, difficultyEnum } from "@shared/schema";

/**
 * Key assessment principles from Sports Map approach
 */
export const sportsMapAssessmentPrinciples = [
  {
    title: "Load Capacity Assessment",
    description: "Systematic evaluation of tissue's ability to handle sport-specific loads",
    technique: "Progressive loading tests with standardized protocols for various sports"
  },
  {
    title: "Movement Pattern Screening",
    description: "Comprehensive assessment of fundamental and sport-specific movement patterns",
    technique: "Standardized movement screens with sport-specific modifications"
  },
  {
    title: "Performance Deficit Identification",
    description: "Quantification of performance gaps compared to baseline or normative data",
    technique: "Battery of performance tests with comparative analysis to baseline measures"
  },
  {
    title: "Sport-Specific Readiness Testing",
    description: "Evaluation of physical and psychological readiness for return to sport",
    technique: "Multi-stage testing protocols progressing from controlled to chaotic environments"
  },
  {
    title: "On-Field Assessment Strategies",
    description: "Sideline and on-field assessment protocols for acute injuries",
    technique: "Rapid screening tools for injury severity and safe return to play decisions"
  }
];

/**
 * Key treatment principles from Sports Map approach
 */
export const sportsMapTreatmentPrinciples = [
  {
    title: "Accelerated Rehabilitation",
    description: "Evidence-based protocols for expedited return to play without compromising tissue healing",
    application: "Strategic early loading within biological constraints of healing tissues"
  },
  {
    title: "Sports-Specific Loading Progression",
    description: "Graduated loading specific to demands of individual sports",
    application: "Progressive introduction of sport-specific movement patterns and loads"
  },
  {
    title: "Neuromuscular Control Emphasis",
    description: "Focus on movement quality and reactive control in sport-specific contexts",
    application: "Reactive neuromuscular training with unexpected perturbations in sport-relevant positions"
  },
  {
    title: "Psychological Readiness Training",
    description: "Addressing psychological barriers to return to sport",
    application: "Graded exposure to injury-specific fear-provoking situations with psychological skills training"
  },
  {
    title: "Performance Integration",
    description: "Seamless integration of rehabilitation with performance enhancement",
    application: "Collaboration with strength and conditioning specialists to address both rehabilitation and performance goals"
  },
  {
    title: "Team-Sport Position Specificity",
    description: "Tailoring rehabilitation to specific positional demands in team sports",
    application: "Position-specific movement and load analysis with targeted rehabilitation"
  }
];

/**
 * Sports Map research-based approaches for specific conditions
 */
export const sportsMapConditionApproaches = [
  {
    condition: "ACL Reconstruction Rehabilitation",
    keyPrinciples: [
      "Criteria-based progression rather than time-based protocols",
      "Early restoration of full extension and quadriceps activation",
      "Neuromuscular control emphasis throughout all phases",
      "Psychological readiness assessment prior to return to sport",
      "Sport-specific movement retraining in late-stage rehabilitation"
    ],
    evidence: "Based on research showing improved outcomes and reduced re-injury rates with criterion-based protocols"
  },
  {
    condition: "Hamstring Strain Rehabilitation",
    keyPrinciples: [
      "Progressive eccentric loading beginning early in rehabilitation",
      "Running mechanics assessment and retraining",
      "Sport-specific length-tension training in late rehabilitation",
      "Address contributing factors (pelvic control, lumbar mobility)",
      "Gradual exposure to high-speed running with monitoring"
    ],
    evidence: "Evidence supports progressive eccentric loading and addressing kinetic chain factors in preventing recurrence"
  },
  {
    condition: "Ankle Instability in Athletes",
    keyPrinciples: [
      "Comprehensive peroneal strength and reaction time training",
      "Progressive balance training in multiple planes",
      "Sport-specific perturbation training on unstable surfaces",
      "Plyometric training with directional emphasis",
      "Footwear and taping considerations for specific sports"
    ],
    evidence: "Research demonstrates effectiveness of comprehensive program addressing mechanical and functional instability"
  },
  {
    condition: "Shoulder Instability in Overhead Athletes",
    keyPrinciples: [
      "Rotator cuff and periscapular control before strength",
      "Sport-specific movement pattern retraining",
      "Gradual exposure to end-range positions under load",
      "Integration of kinetic chain in overhead activities",
      "Modification of technique to reduce extreme positions"
    ],
    evidence: "Evidence supports addressing the entire kinetic chain and movement-pattern retraining"
  },
  {
    condition: "Athletic Groin Pain",
    keyPrinciples: [
      "Accurate diagnosis of specific anatomical contributor(s)",
      "Progressive loading of affected structures",
      "Hip and pelvic control exercises in multiple planes",
      "Linear and change-of-direction running progression",
      "Sport-specific cutting and kicking progression"
    ],
    evidence: "Research supports multi-faceted approach with exercise-based loading program for optimal outcomes"
  }
];

/**
 * Sports Map specialized approaches by sport category
 */
export const sportsMapSportSpecificApproaches = [
  {
    sportCategory: "Running Sports",
    approaches: [
      {
        name: "Distance Runner Protocol",
        description: "Specialized approach for rehabilitation of distance runners addressing both injury recovery and performance",
        keyFeatures: [
          "Running gait analysis and retraining",
          "Progressive loading based on training volume metrics",
          "Integration with periodized training schedule",
          "Surface and footwear considerations"
        ],
        targetConditions: ["Running-related knee pain", "Achilles tendinopathy", "Stress fractures", "Plantar heel pain"],
        evidenceLevel: "High - Based on multiple running-specific RCTs"
      },
      {
        name: "Sprint Mechanics Restoration",
        description: "Targeted program for sprinters focused on mechanics and high-velocity function",
        keyFeatures: [
          "Power development through force-velocity profiling",
          "Sprint-specific movement pattern training", 
          "Progressive exposure to maximal velocity",
          "Acceleration and top-speed specific components"
        ],
        targetConditions: ["Hamstring strains", "Calf strains", "Hip flexor injuries"],
        evidenceLevel: "Moderate to High - Based on biomechanical studies and clinical trials"
      }
    ]
  },
  {
    sportCategory: "Team Field Sports",
    approaches: [
      {
        name: "Multidirectional Speed Protocol",
        description: "Comprehensive approach for field sport athletes requiring change of direction and acceleration",
        keyFeatures: [
          "Agility progression from planned to reactive movements",
          "Sport-specific change of direction mechanics",
          "Position-specific movement pattern training",
          "Game-scenario simulation in late-stage rehabilitation"
        ],
        targetConditions: ["ACL reconstruction", "Ankle sprains", "Groin pain", "Hamstring strains"],
        evidenceLevel: "High - Multiple studies showing efficacy for field sport injuries"
      },
      {
        name: "Kicking-Sport Rehabilitation",
        description: "Specialized approach for sports requiring kicking skills (soccer, AFL, rugby)",
        keyFeatures: [
          "Kicking mechanics analysis and retraining",
          "Progressive kicking distance and velocity",
          "Integration of trunk rotation with lower limb function",
          "Sport-specific skill acquisition progression"
        ],
        targetConditions: ["Groin pain", "Quadriceps strains", "Hip impingement", "Adductor-related injuries"],
        evidenceLevel: "Moderate - Based on sport-specific biomechanical studies"
      }
    ]
  },
  {
    sportCategory: "Overhead Sports",
    approaches: [
      {
        name: "Throwing Athlete Program",
        description: "Comprehensive approach for overhead throwing athletes (baseball, cricket, javelin)",
        keyFeatures: [
          "Throwing mechanics analysis and correction",
          "Progressive throwing program with monitored volume",
          "Rotator cuff and scapular control emphasis",
          "Integration of lower body and trunk in kinetic chain"
        ],
        targetConditions: ["Rotator cuff tendinopathy", "Labral injuries", "Shoulder instability", "Elbow injuries"],
        evidenceLevel: "High - Based on multiple throwing-specific studies"
      },
      {
        name: "Racquet Sport Protocol",
        description: "Specialized approach for tennis, badminton and squash players",
        keyFeatures: [
          "Sport-specific grip strength and wrist conditioning",
          "Stroke-specific movement pattern training",
          "Upper and lower body power integration",
          "On-court movement and skill progression"
        ],
        targetConditions: ["Tennis elbow", "Rotator cuff issues", "Wrist injuries", "Lower limb loading injuries"],
        evidenceLevel: "Moderate - Based on sport-specific clinical research"
      }
    ]
  }
];

/**
 * Sports Map evidence-based research articles
 */
export const sportsMapResearchArticles = [
  {
    id: 3001,
    title: "Return to Sport Testing After ACL Reconstruction: A Comprehensive Evidence-Based Framework",
    authors: "Myer, G.D., Paterno, M.V., & Bryant, D.M.",
    journal: "Journal of Orthopaedic & Sports Physical Therapy",
    publicationDate: new Date("2023-05-15").toISOString(),
    doi: "10.2519/jospt.2023.10842",
    abstract: "This clinical commentary presents a comprehensive framework for return to sport decision-making following anterior cruciate ligament reconstruction. Despite advances in surgical techniques and rehabilitation protocols, return to sport outcomes remain suboptimal with high re-injury rates. This paper outlines an evidence-based, criterion-driven approach that extends beyond simple strength and hop testing to include comprehensive assessment of neuromuscular control, psychological readiness, and sport-specific function. The framework includes five key domains: (1) basic strength and power parameters, (2) movement quality assessment, (3) reactive neuromuscular control, (4) sport-specific fitness and skill assessment, and (5) psychological readiness measures. Specific test batteries are presented with evidence-based thresholds for clearance in each domain. The importance of interpreting test results in context rather than using isolated pass/fail criteria is emphasized. Implementation strategies for varying resource levels are discussed, from basic clinical assessment to advanced laboratory testing. Case examples demonstrate application across different athlete populations and sporting demands. This framework provides clinicians with practical tools to enhance return to sport decision-making while addressing the multifactorial nature of successful sporting reintegration.",
    bodyPart: "knee",
    keywords: ["ACL reconstruction", "return to sport", "rehabilitation", "sport testing", "knee injury"]
  },
  {
    id: 3002,
    title: "Hamstring Strain Injury Rehabilitation and Prevention: An Evidence-Based and Practical Approach",
    authors: "Shield, A.J., Opar, D.A., & Watts, D.",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("2022-11-22").toISOString(),
    doi: "10.1136/bjsports-2022-106587",
    abstract: "This paper synthesizes current evidence on hamstring strain injury rehabilitation into a practical framework for clinicians working with athletes. Hamstring strain injuries remain one of the most common and recurrent injuries in sports involving high-speed running. This review outlines a comprehensive rehabilitation approach progressing from acute management to return to performance. The program emphasizes early progressive loading, with particular focus on eccentrically-biased exercise beginning within the first week when clinically appropriate. Assessment and retraining of running mechanics is highlighted as a critical component, with specific techniques to address common dysfunctional patterns. The paper presents criteria-based progression decisions throughout the rehabilitation continuum, with objective measures to guide advancement between phases. The importance of addressing the entire kinetic chain, particularly lumbopelvic control and lower limb force management during running, is emphasized based on current evidence. Late-stage rehabilitation strategies focus on exposing the hamstring to sport-specific demands including high-speed running, change of direction, and fatigue-resistant loading. Return to sport decision-making incorporates both physical and psychological readiness assessment. Implementation considerations for different sporting environments are discussed with practical strategies for resource-limited settings.",
    bodyPart: "back",
    keywords: ["hamstring", "muscle strain", "rehabilitation", "eccentric exercise", "running mechanics"]
  },
  {
    id: 3003,
    title: "The Management of Sport-Related Ankle Sprains: From Acute Care to Performance Optimization",
    authors: "Delahunt, E., Remus, A., & Willems, T.",
    journal: "Sports Medicine",
    publicationDate: new Date("2023-03-17").toISOString(),
    doi: "10.1007/s40279-023-01862-x",
    abstract: "This systematic review and clinical commentary presents a comprehensive approach to the management of ankle sprains in athletic populations, from acute care through return to performance. Lateral ankle sprains are among the most common injuries in sports, with high recurrence rates and potential for chronic sequelae including instability and decreased performance. This paper outlines a structured management framework beginning with accurate assessment and optimal acute care, followed by criteria-driven rehabilitation progression. Early management focuses on protection while avoiding immobilization, with early weightbearing and controlled movement encouraged based on symptom response. Progressive rehabilitation emphasizes peroneal strength and reaction time training, comprehensive balance and proprioceptive exercises in multiple planes, and sport-specific functional activities. The paper highlights the importance of addressing both mechanical instability and proprioceptive deficits that may persist after symptoms resolve. Late-stage rehabilitation incorporates perturbation training, plyometrics, and sport-specific movement patterns under varying contextual constraints. Return to sport decision-making includes specific testing protocols with normative values for various sports. The implementation of injury prevention strategies following return to sport is discussed, including the role of prophylactic supports, neuromuscular training maintenance, and ongoing monitoring.",
    bodyPart: "ankle",
    keywords: ["ankle sprain", "lateral ligament complex", "proprioception", "instability", "balance training"]
  },
  {
    id: 3004,
    title: "Shoulder Injuries in Overhead Athletes: An Evidence-Based Approach to Rehabilitation",
    authors: "Wilk, K.E., Meister, K., & Reinold, M.M.",
    journal: "Sports Health",
    publicationDate: new Date("2022-08-09").toISOString(),
    doi: "10.1177/19417381221115629",
    abstract: "This clinical review presents current evidence on the rehabilitation of shoulder injuries in overhead athletes, with sport-specific considerations for different throwing and striking sports. Overhead athletes present unique challenges due to the extreme demands placed on the shoulder complex and the sport-specific adaptations that occur with prolonged participation. This paper outlines a comprehensive framework for rehabilitation that addresses the entire kinetic chain while respecting sport-specific demands. The approach begins with thorough assessment of contributing factors throughout the kinetic chain, from lower extremity and trunk function through scapular control and glenohumeral mobility. Key rehabilitation principles include establishing optimal scapular control before emphasizing rotator cuff strengthening, addressing posterior shoulder tightness, and integrating kinetic chain exercises throughout the program. The paper presents sport-specific exercises and progressions for baseball, swimming, tennis, and volleyball, with detailed parameters and progression criteria. Late-stage rehabilitation emphasizes sport-specific movement pattern training, with detailed throwing and serving progressions. Return to sport decision-making incorporates both quantitative measures and qualitative movement assessment. The importance of addressing sport technique and training load management is emphasized for preventing recurrence. Implementation strategies for various clinical settings are discussed with practical alternatives for limited-resource environments.",
    bodyPart: "shoulder",
    keywords: ["overhead athlete", "throwing shoulder", "rotator cuff", "scapular dyskinesis", "rehabilitation"]
  },
  {
    id: 3005,
    title: "Athletic Groin Pain: An Evidence-Based Approach for Clinicians",
    authors: "King, E., Franklyn-Miller, A., & Richter, C.",
    journal: "Physical Therapy in Sport",
    publicationDate: new Date("2023-01-25").toISOString(),
    doi: "10.1016/j.ptsp.2023.01.003",
    abstract: "This clinical update presents a contemporary approach to the management of athletic groin pain, synthesizing recent advances in understanding of this complex presentation. Athletic groin pain affects up to 25% of athletes in field sports, with significant impact on performance and participation. Traditional approaches focusing on specific anatomical diagnoses often fail to address the multifactorial nature of these presentations. This paper presents an integrated framework emphasizing comprehensive assessment of the entire kinetic chain, movement patterns, and sport-specific demands. The rehabilitation approach progresses from control of aggravating activities and basic motor control to progressive loading and sport-specific training. Key components include targeted exercise progression for affected muscle groups, linear and multidirectional running mechanics assessment and retraining, and sport-specific cutting, kicking, and acceleration training. The paper presents objective measures to guide progression between rehabilitation phases, with criteria-based advancement rather than time-based protocols. Case examples demonstrate application across different sports including soccer, rugby, and Australian football. The importance of addressing the entire kinetic chain rather than focusing solely on the symptomatic region is emphasized based on recent biomechanical research. Implementation strategies for different sporting environments are discussed with practical considerations for resource-limited settings.",
    bodyPart: "hip",
    keywords: ["groin pain", "athletic pubalgia", "sports hernia", "adductor-related pain", "hip and groin"]
  }
];

/**
 * Sports Map evidence-based exercises for various sports
 */
export function getSportsMapExercises(): InsertExercise[] {
  return [
    // ACL Rehabilitation Exercises
    {
      title: "Deceleration Squat with Band Perturbation",
      description: "Neuromuscular control exercise focusing on controlled deceleration with unpredictable perturbations. Sports Map approach for enhancing dynamic knee stability in late-stage ACL rehabilitation.",
      bodyPart: "knee",
      difficulty: "advanced",
      instructions: "1. Attach resistance band around waist with partner holding ends\n2. Begin in athletic stance position\n3. Perform controlled squat focusing on knee alignment\n4. Partner provides random, multi-directional perturbations during movement\n5. Focus on maintaining position despite perturbations\n6. Perform 3 sets of 8-12 repetitions with varying perturbation timing",
      targetMuscles: "Quadriceps, hamstrings, gluteus medius, core stabilizers",
      imageUrl: "/exercises/sports-map-deceleration-squat.jpg"
    },
    {
      title: "Lateral Bound with Stick Landing",
      description: "Plyometric exercise emphasizing lateral power development with controlled landing mechanics. Sports Map's evidence-based approach for advanced ACL rehabilitation and return to cutting sports.",
      bodyPart: "knee",
      difficulty: "advanced",
      instructions: "1. Begin in athletic stance on one leg\n2. Perform explosive lateral jump to opposite leg\n3. Land with slight knee flexion and hold position for 3 seconds\n4. Focus on knee alignment during landing (no valgus)\n5. Control entire landing phase without additional movements\n6. Perform 3 sets of 6-8 repetitions each direction",
      targetMuscles: "Gluteus medius, quadriceps, hamstrings, ankle stabilizers",
      imageUrl: "/exercises/sports-map-lateral-bound.jpg"
    },

    // Hamstring Rehabilitation Exercises
    {
      title: "Nordic Hamstring Exercise Progression",
      description: "Progressive eccentric hamstring strengthening exercise. Sports Map's cornerstone exercise for hamstring strain prevention and rehabilitation.",
      bodyPart: "back",
      difficulty: "advanced",
      instructions: "1. Kneel with partner securing ankles or using specialized device\n2. Maintain straight line from knees to shoulders\n3. Slowly lower torso toward ground, resisting with hamstrings\n4. Use arms to assist return to starting position initially\n5. Progress to hands-free return when strength allows\n6. Begin with partial range, progress to full range\n7. Perform 3 sets of 4-8 repetitions based on capacity",
      targetMuscles: "Hamstrings (biceps femoris, semitendinosus, semimembranosus)",
      imageUrl: "/exercises/sports-map-nordic-hamstring.jpg"
    },
    {
      title: "Running A-Drill with Posterior Chain Emphasis",
      description: "Running mechanics drill focusing on posterior chain engagement and hip extension. Sports Map's approach for retraining running mechanics after hamstring injury.",
      bodyPart: "back",
      difficulty: "intermediate",
      instructions: "1. Begin in tall standing position\n2. Perform high-knee running action focusing on hip extension\n3. Emphasize full hip extension with each stride\n4. Maintain slight forward trunk lean\n5. Focus on gluteal engagement at hip extension\n6. Perform 3 sets of 20-30 seconds with proper technique",
      targetMuscles: "Hamstrings, gluteus maximus, hip flexors",
      imageUrl: "/exercises/sports-map-running-a-drill.jpg"
    },

    // Ankle Rehabilitation Exercises
    {
      title: "Multidirectional Hop to Stabilization",
      description: "Advanced neuromuscular control exercise for ankle rehabilitation. Sports Map's approach for developing reactive stability for field sport athletes.",
      bodyPart: "ankle",
      difficulty: "advanced",
      instructions: "1. Create grid of 8 targets in different directions\n2. Stand on affected leg in center of grid\n3. Coach randomly calls out target number\n4. Hop to designated target, stabilize for 3 seconds\n5. Return to center, await next target call\n6. Perform 2-3 sets of 8-10 hops with full stabilization",
      targetMuscles: "Peroneal muscles, tibialis anterior, gastrocnemius, soleus, foot intrinsics",
      imageUrl: "/exercises/sports-map-multidirectional-hop.jpg"
    },
    {
      title: "Reactive Balance on BOSU with Ball Catch",
      description: "Dual-task balance exercise combining reactive balance with sport-specific upper body task. Sports Map's integration of neuromuscular control with sport-specific tasks.",
      bodyPart: "ankle",
      difficulty: "advanced",
      instructions: "1. Stand on BOSU dome side up with affected leg\n2. Partner tosses ball randomly at different heights and directions\n3. Catch and return ball while maintaining balance\n4. Focus on maintaining knee control during perturbations\n5. Progress by increasing toss speed and moving targets\n6. Perform 2-3 sets of 1-2 minutes continuous",
      targetMuscles: "Ankle stabilizers, knee stabilizers, core, upper body",
      imageUrl: "/exercises/sports-map-reactive-balance.jpg"
    },

    // Shoulder Exercises for Overhead Athletes
    {
      title: "Deceleration Throwing with Exercise Band",
      description: "Controlled eccentric training for the posterior shoulder and rotator cuff. Sports Map's approach for overhead athletes to develop eccentric control during throwing deceleration.",
      bodyPart: "shoulder",
      difficulty: "advanced",
      instructions: "1. Anchor exercise band at shoulder height\n2. Position in throwing stance perpendicular to anchor point\n3. Begin with arm in throwing position (external rotation, 90° abduction)\n4. Allow band to slowly pull arm forward, resisting eccentrically\n5. Control through full throwing follow-through position\n6. Return to start position with assistance of opposite hand\n7. Perform 3 sets of 8-12 repetitions",
      targetMuscles: "Posterior rotator cuff, posterior deltoid, scapular stabilizers",
      imageUrl: "/exercises/sports-map-deceleration-throwing.jpg"
    },
    {
      title: "Rhythmic Stabilization in Athletic Position",
      description: "Shoulder stability exercise with manual perturbations in functional position. Sports Map's approach for developing reactive stability in sport-specific positions.",
      bodyPart: "shoulder",
      difficulty: "intermediate",
      instructions: "1. Position in athletic stance with arm in sport-specific position\n2. Partner applies unpredictable, multi-directional forces to arm\n3. Resist these forces while maintaining position\n4. Begin with moderate resistance, progress to greater force\n5. Incorporate trunk rotation resistance for advanced progression\n6. Perform 3 sets of 30-45 seconds",
      targetMuscles: "Rotator cuff, scapular stabilizers, core",
      imageUrl: "/exercises/sports-map-rhythmic-stabilization.jpg"
    },

    // Groin/Hip Exercises
    {
      title: "Copenhagen Adduction Progression",
      description: "Progressive side plank exercise targeting adductor strength. Sports Map's evidence-based approach for groin pain prevention and rehabilitation.",
      bodyPart: "hip",
      difficulty: "advanced",
      instructions: "1. Partner kneels on ground or use bench for support\n2. Bottom leg straight resting on partner's thigh\n3. Top leg resting on partner's shoulder or bench\n4. Lift body off ground into side plank position\n5. Lower and raise body using adductor strength of bottom leg\n6. Begin with partial range, progress to full range\n7. Perform 2-3 sets of 6-12 repetitions based on capacity",
      targetMuscles: "Adductor longus, adductor magnus, adductor brevis, pectineus, gracilis",
      imageUrl: "/exercises/sports-map-copenhagen-adduction.jpg"
    },
    {
      title: "Multidirectional Lunge with Pelvic Control",
      description: "Comprehensive movement training for hip and pelvic control in multiple planes. Sports Map's approach for developing force acceptance and control for field sport athletes.",
      bodyPart: "hip",
      difficulty: "intermediate",
      instructions: "1. Begin in athletic stance position\n2. Perform lunges in multiple directions (forward, lateral, diagonal, rotational)\n3. Focus on pelvic stability throughout movement\n4. Control knee alignment with each direction change\n5. Add sport-specific upper body movement in advanced stages\n6. Perform 2-3 sets of 8-10 repetitions in each direction",
      targetMuscles: "Gluteus medius, gluteus maximus, quadriceps, adductors, core stabilizers",
      imageUrl: "/exercises/sports-map-multidirectional-lunge.jpg"
    }
  ];
}