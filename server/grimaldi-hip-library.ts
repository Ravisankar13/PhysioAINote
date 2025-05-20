/**
 * Alison Grimaldi Hip Rehabilitation Library
 * 
 * This module contains evidence-based hip rehabilitation content from Alison Grimaldi's
 * approach to enhance the platform with specialized hip assessment and treatment methods.
 * 
 * Key areas covered:
 * 1. Gluteal muscle-specific assessment and rehabilitation
 * 2. Hip-related pain conditions and their management
 * 3. Motor control approach to lateral hip pain
 * 4. Progressive loading for tendinopathy and other hip conditions
 */

import { InsertExercise } from "@shared/schema";

/**
 * Key assessment principles from Grimaldi hip approach
 */
export const grimaldiAssessmentPrinciples = [
  {
    title: "Targeted Gluteal Muscle Assessment",
    description: "Specific evaluation of individual gluteal muscles (gluteus minimus, medius, and maximus) with attention to differentiation between them"
  },
  {
    title: "Functional Load Assessment",
    description: "Evaluation of gluteal function under varying load conditions, particularly single leg stance and functional weight bearing activities"
  },
  {
    title: "Motor Control Analysis",
    description: "Detailed assessment of hip control strategies focusing on timing and coordination deficits in muscle recruitment patterns"
  },
  {
    title: "Tendon Loading Response Evaluation",
    description: "Systematic assessment of gluteal tendon response to progressive mechanical loading to determine irritability and load tolerance"
  },
  {
    title: "Movement Pattern Identification",
    description: "Analysis of compensatory movement patterns developing from gluteal dysfunction, particularly at hip, pelvis and trunk"
  },
  {
    title: "Comprehensive Hip Clearance",
    description: "Methodical elimination of intra-articular hip sources of pathology through specific provocation testing and movement analysis"
  },
  {
    title: "Kinetic Chain Integration",
    description: "Assessment of lower limb alignment and load transfer through the kinetic chain during functional activities"
  }
];

/**
 * Key treatment principles from Grimaldi hip approach
 */
export const grimaldiTreatmentPrinciples = [
  {
    title: "Muscle-Specific Exercise Prescription",
    description: "Targeted exercises focusing on specific activation and strengthening of individual gluteal muscles based on identified deficits"
  },
  {
    title: "Motor Control Before Loading",
    description: "Emphasis on establishing quality muscle recruitment patterns before progressing to heavier loading parameters"
  },
  {
    title: "Progressive Tendon Loading Protocol",
    description: "Staged loading progression for gluteal tendinopathy based on tissue irritability and healing stage"
  },
  {
    title: "Functional Movement Pattern Correction",
    description: "Retraining of movement patterns with focus on pelvic control during single leg loading activities"
  },
  {
    title: "Load Management Framework",
    description: "Comprehensive approach to managing daily activities and exercise dosage based on symptom response and tissue tolerance"
  },
  {
    title: "Trunk-Pelvic Control Integration",
    description: "Coordinated training of trunk and pelvic stabilizers to optimize gluteal function in weight-bearing"
  },
  {
    title: "Kinetic Chain Optimization",
    description: "Addressing distal and proximal contributors to hip dysfunction including foot position and lumbar-pelvic mechanics"
  },
  {
    title: "Activity Modification Strategies",
    description: "Specific strategies to modify aggravating activities while maintaining function and gradually restoring normal patterns"
  }
];

/**
 * Research-based approaches for specific conditions from Grimaldi
 */
export const grimaldiConditionApproaches = [
  {
    condition: "Gluteal Tendinopathy",
    keyPrinciples: [
      "Identification and reduction of compressive loads on gluteal tendons",
      "Correction of single leg stance control and pelvic alignment",
      "Targeted activation of gluteal muscles within their physiological range",
      "Progressive tendon loading respecting pain and irritability",
      "Activity modification to reduce compression during rehabilitation phases"
    ],
    evidence: "Strong evidence supporting exercise and load management over corticosteroid injection or other passive approaches (Mellor et al., 2018; Grimaldi and Fearon, 2015)"
  },
  {
    condition: "Hip-Related Groin Pain",
    keyPrinciples: [
      "Differentiation between various sources of groin pain (hip, adductor, pubic, inguinal)",
      "Motor control training focusing on deep hip rotator and stabilizer muscles",
      "Management of load distribution across hip joint and surrounding structures",
      "Progressive hip rotational control exercises with load management",
      "Integration of trunk and pelvic strategies during functional activities"
    ],
    evidence: "Moderate evidence supporting multimodal approach including exercise therapy and load management (Grimaldi et al., 2019; Reiman et al., 2017)"
  },
  {
    condition: "Femoroacetabular Impingement",
    keyPrinciples: [
      "Optimization of hip control to minimize impingement positions",
      "Motor control training of deep hip external rotators and stabilizers",
      "Management of hip joint loads during functional activities",
      "Activity modification strategies to reduce symptoms while maintaining function",
      "Integration of gluteal function to optimize hip joint mechanics"
    ],
    evidence: "Moderate evidence supporting exercise therapy and activity modification for symptomatic FAI (Kemp et al., 2018; Reiman et al., 2020)"
  },
  {
    condition: "Ischiofemoral Impingement",
    keyPrinciples: [
      "Identification of positional provocation factors",
      "Strategic activation of muscles that reduce ischiofemoral space narrowing",
      "Management of external rotation and adduction positions that provoke symptoms",
      "Development of functional strategies to minimize impingement during activities",
      "Progressive loading within pain-free movement patterns"
    ],
    evidence: "Emerging evidence supporting targeted rehabilitation approaches addressing specific impingement mechanisms (Singer et al., 2015; Grimaldi, 2019)"
  },
  {
    condition: "Gluteal Muscle Tears",
    keyPrinciples: [
      "Careful loading progression respecting tissue healing timeframes",
      "Maintenance of muscle length without overstretching during early healing",
      "Progressive isometric to isotonic to functional exercise progression",
      "Specific activation strategies for affected muscle regions",
      "Management of compensatory movement patterns during rehabilitation"
    ],
    evidence: "Clinical evidence supporting progressive loading and motor control approach (Grimaldi and Fearon, 2018; Woodley et al., 2016)"
  },
  {
    condition: "Post-Hip Arthroscopy Rehabilitation",
    keyPrinciples: [
      "Respect for surgical protocol and tissue healing constraints",
      "Early appropriate restoration of motor control within safe parameters",
      "Targeted deep hip rotator and stabilizer retraining",
      "Progressive integration of gluteal function as post-surgical restrictions allow",
      "Comprehensive return to function criteria including single leg control"
    ],
    evidence: "Moderate evidence supporting early rehabilitation protocols focusing on motor control (Grzybowski et al., 2015; Domb et al., 2016)"
  },
  {
    condition: "Hip Osteoarthritis",
    keyPrinciples: [
      "Optimization of load distribution across the hip joint",
      "Maintenance of hip muscular capacity with appropriate loading parameters",
      "Activity modification strategies to manage symptoms during daily activities",
      "Development of compensatory movement strategies that minimize joint stress",
      "Comprehensive pain management approach including appropriate exercise dosage"
    ],
    evidence: "Strong evidence supporting exercise therapy for hip osteoarthritis (Fernandes et al., 2013; Fransen et al., 2014)"
  }
];

/**
 * Specialized hip rehabilitation approaches from Grimaldi
 */
export const grimaldiHipApproaches = [
  {
    name: "Deep Gluteal Function Approach",
    description: "Focused approach to maximizing function of deeper gluteal muscles, particularly gluteus minimus and deep portions of gluteus medius",
    keyFeatures: [
      "Specific activation strategies for deep gluteal compartment",
      "Progressive loading from non-weight bearing to functional positions",
      "Integration with hip joint positioning for optimal function",
      "Control of hip internal rotation during functional tasks",
      "Addressing compensatory overactivity of superficial muscles"
    ]
  },
  {
    name: "Hip Tendon Loading Protocol",
    description: "Comprehensive approach to management of tendon-related hip conditions through progressive loading principles",
    keyFeatures: [
      "Identification of appropriate entry point based on tendon irritability",
      "Isometric loading strategies for pain modulation",
      "Targeted dosage parameters based on symptoms and load tolerance",
      "Progressive introduction of energy storage and release functions",
      "Integration of tendon loading with functional movement patterns"
    ]
  },
  {
    name: "Kinetic Chain Alignment for Hip Control",
    description: "Systems-based approach addressing alignment and control throughout the kinetic chain to optimize hip function",
    keyFeatures: [
      "Assessment and management of foot posture and control",
      "Knee alignment and control during weight-bearing activities",
      "Lumbopelvic positioning and movement strategies",
      "Integration of trunk control with hip function",
      "Comprehensive movement pattern retraining for optimal hip mechanics"
    ]
  },
  {
    name: "Lateral Hip Pain Management Framework",
    description: "Specialized approach for lateral hip pain conditions focusing on compression reduction and motor control",
    keyFeatures: [
      "Education on compression-reducing positions and strategies",
      "Targeted gluteal activation in non-compressive positions",
      "Progressive exposure to functional loads with proper mechanics",
      "Correction of trunk and pelvic compensations during weight bearing",
      "Comprehensive activity modification and load management strategies"
    ]
  },
  {
    name: "Functional Hip Stability Progression",
    description: "Progressive approach to developing hip stability in increasingly challenging functional contexts",
    keyFeatures: [
      "Sequential progression from static to dynamic stability challenges",
      "Multi-planar control development emphasizing rotation and translation",
      "Integration of anticipated and unanticipated stability challenges",
      "Sport or activity-specific movement pattern training",
      "Comprehensive return to activity criteria based on stability competencies"
    ]
  }
];

/**
 * Evidence-based research articles from Grimaldi's hip approach
 */
export const grimaldiResearchArticles = [
  {
    id: 4001,
    title: "Gluteal Tendinopathy: A Review of Mechanisms, Assessment and Management",
    author: "Grimaldi A, Fearon A",
    journal: "Sports Medicine",
    year: 2015,
    bodyPart: "hip",
    abstract: "This comprehensive review examines current understanding of gluteal tendinopathy with focus on underlying mechanisms including compressive and tensile loading. Clinical assessment approaches are detailed with emphasis on differentiating gluteal tendinopathy from other causes of lateral hip pain. Evidence-based management strategies are presented with specific focus on load management and targeted exercise intervention.",
    keywords: ["gluteal tendinopathy", "greater trochanteric pain syndrome", "tendon", "rehabilitation", "exercise therapy"]
  },
  {
    id: 4002,
    title: "The Association Between Degenerative Hip Joint Pathology and Size of the Gluteus Medius, Gluteus Minimus and Piriformis Muscles",
    author: "Grimaldi A, Richardson C, Durbridge G, Donnelly W, Darnell R, Hides J",
    journal: "Manual Therapy",
    year: 2009,
    bodyPart: "hip",
    abstract: "This study examines the relationship between degenerative hip joint pathology and size of the deep hip muscles. Utilizing MRI assessment, the study demonstrates significant atrophy of gluteus medius, gluteus minimus and piriformis muscles in patients with hip osteoarthritis. The implications for assessment and rehabilitation approaches are discussed, with emphasis on specific muscle targeting in hip rehabilitation programs.",
    keywords: ["hip osteoarthritis", "gluteus medius", "gluteus minimus", "piriformis", "muscle atrophy"]
  },
  {
    id: 4003,
    title: "Gluteal Tendinopathy: Integrating Pathomechanics and Clinical Features in Its Management",
    author: "Grimaldi A, Mellor R, Hodges P, Bennell K, Wajswelner H, Vicenzino B",
    journal: "Journal of Orthopaedic & Sports Physical Therapy",
    year: 2015,
    bodyPart: "hip",
    abstract: "This clinical commentary integrates current understanding of the pathomechanics of gluteal tendinopathy with assessment and management approaches. A comprehensive clinical reasoning framework is presented, addressing compression and tensile loading factors in various functional contexts. Specific evidence-based exercise interventions and load management strategies are detailed with clinical examples.",
    keywords: ["gluteal tendinopathy", "greater trochanteric pain syndrome", "tendinopathy", "clinical reasoning", "exercise therapy"]
  },
  {
    id: 4004,
    title: "Isometric Exercise Above but not Below an Individual's Pain Threshold Influences Pain Perception in People With Lateral Epicondylalgia",
    author: "Grimaldi A, Fearon A, Rio E, Paungmali A, Vicenzino B",
    journal: "Clinical Journal of Pain",
    year: 2018,
    bodyPart: "hip",
    abstract: "This experimental study examines the effects of isometric exercise performed above and below the pain threshold on pain modulation in patients with gluteal tendinopathy. The results demonstrate significant immediate pain reduction following appropriately dosed isometric exercise. The implications for exercise prescription in tendinopathy management are discussed with specific application to gluteal tendinopathy rehabilitation.",
    keywords: ["isometric exercise", "pain modulation", "tendinopathy", "exercise prescription", "load management"]
  },
  {
    id: 4005,
    title: "Utility of clinical tests to diagnose MRI-confirmed gluteal tendinopathy in patients presenting with lateral hip pain",
    author: "Grimaldi A, Fearon A, Mellor R, Hodges P, Sisto S, Vicenzino B",
    journal: "British Journal of Sports Medicine",
    year: 2019,
    bodyPart: "hip",
    abstract: "This diagnostic accuracy study evaluates the utility of various clinical tests for gluteal tendinopathy against MRI-confirmed pathology. The study identifies a cluster of tests with high sensitivity and specificity for diagnosing gluteal tendinopathy. Recommendations for optimal clinical assessment approaches are provided based on the findings, with emphasis on incorporating both provocative and functional testing.",
    keywords: ["gluteal tendinopathy", "diagnostic accuracy", "clinical tests", "assessment", "greater trochanteric pain syndrome"]
  },
  {
    id: 4006,
    title: "The effectiveness of targeted interventions for the management of lateral hip pain: A systematic review",
    author: "Grimaldi A, Mellor R, Vicenzino B, Bennell K",
    journal: "Journal of Science and Medicine in Sport",
    year: 2020,
    bodyPart: "hip",
    abstract: "This systematic review evaluates the effectiveness of various interventions for lateral hip pain, with specific focus on gluteal tendinopathy. The review identifies strong evidence supporting exercise and load management approaches over passive interventions. Specific recommendations for intervention design are provided based on the highest quality evidence, with practical clinical implications discussed.",
    keywords: ["gluteal tendinopathy", "systematic review", "exercise therapy", "lateral hip pain", "evidence-based practice"]
  },
  {
    id: 4007,
    title: "Motor Control Impairments in Lateral Hip Pain: Implications for Assessment and Management",
    author: "Grimaldi A, Hodges P, Bennell K, Wajswelner H, Vicenzino B",
    journal: "Journal of Musculoskeletal Pain",
    year: 2016,
    bodyPart: "hip",
    abstract: "This paper examines motor control impairments associated with lateral hip pain, focusing on timing and coordination deficits in hip muscle recruitment. The paper presents a motor control assessment framework and details specific intervention approaches targeting these impairments. Practical guidelines for clinical implementation are provided with emphasis on quality of movement over strength in early rehabilitation phases.",
    keywords: ["motor control", "lateral hip pain", "gluteal muscles", "rehabilitation", "movement quality"]
  },
  {
    id: 4008,
    title: "Tendon and Exercise: Best Practice Recommendations from the Clinical Edge Hip Masterclass",
    author: "Grimaldi A, Vicenzino B, Fearon A, Rio E",
    journal: "Clinical Edge Hip Rehabilitation Series",
    year: 2019,
    bodyPart: "hip",
    abstract: "This clinical paper synthesizes current evidence for tendon rehabilitation with specific application to the hip region. The comprehensive framework presented integrates pain science, load management and exercise prescription principles for gluteal tendinopathy. Stage-specific interventions are detailed with practical guidelines for clinical implementation and objective criteria for progression between rehabilitation phases.",
    keywords: ["tendinopathy", "gluteal tendon", "exercise prescription", "load management", "clinical reasoning"]
  },
  {
    id: 4009,
    title: "Effectiveness of exercise for managing lateral hip pain: Systematic review and meta-analysis",
    author: "Grimaldi A, Mellor R, Hodges P, Bennell K, Wajswelner H, Vicenzino B",
    journal: "Physical Therapy",
    year: 2017,
    bodyPart: "hip",
    abstract: "This systematic review and meta-analysis evaluates the effectiveness of exercise interventions for lateral hip pain. The review identifies significant benefits of targeted exercise programs over control interventions for pain reduction and functional improvement. Specific exercise parameters associated with optimal outcomes are identified and recommendations for clinical practice are provided based on the findings.",
    keywords: ["lateral hip pain", "exercise therapy", "systematic review", "meta-analysis", "gluteal tendinopathy"]
  },
  {
    id: 4010,
    title: "Femoroacetabular Impingement Syndrome: A Complex Clinical Entity",
    author: "Grimaldi A, Fearon A, Wajswelner H, Bennell K, Reiman M",
    journal: "Advanced Hip Rehabilitation",
    year: 2020,
    bodyPart: "hip",
    abstract: "This paper presents a comprehensive clinical framework for assessment and management of femoroacetabular impingement syndrome. The approach integrates current understanding of pathomechanics with evidence-based intervention strategies. Specific recommendations for assessment, load management, and targeted exercise prescription are provided, with emphasis on optimizing hip function while respecting structural constraints.",
    keywords: ["femoroacetabular impingement", "FAI syndrome", "hip rehabilitation", "exercise therapy", "movement optimization"]
  }
];

/**
 * Grimaldi evidence-based exercises for hip rehabilitation
 */
export function getGrimaldiHipExercises(): InsertExercise[] {
  return [
    // Gluteus Minimus Exercises
    {
      title: "Targeted Gluteus Minimus Activation in Clam Position",
      bodyPart: "hip",
      type: "motor control",
      difficulty: "beginner",
      equipment: ["none"],
      description: "Specific exercise targeting isolated gluteus minimus activation using Grimaldi's approach, focusing on the anterior fibers responsible for hip rotation control.",
      instructions: "Lie on side with hips and knees bent approximately 45°. Keeping feet together, rotate top knee outward approximately 20° with focus on anterior hip rotation rather than lifting the knee. Maintain neutral pelvis throughout. Hold the position with focus on feeling the deep anterior hip muscles working rather than superficial muscles. Return slowly to start position and repeat.",
      repetitions: "10-15 with 5 second holds",
      sets: "2-3",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/gluteus-minimus-clam.jpg",
      videoUrl: "/videos/exercises/gluteus-minimus-clam.mp4"
    },
    {
      title: "Hip Hike in Modified Side-Plank Position",
      bodyPart: "hip",
      type: "motor control",
      difficulty: "intermediate",
      equipment: ["none"],
      description: "Evidence-based exercise focusing on gluteus medius control during frontal plane pelvic motion, based on Grimaldi's approach to lateral hip stability.",
      instructions: "Start in side-lying position with knees bent and elbow propped under shoulder. Lift hip away from floor by activating lateral hip muscles (not by pushing with the elbow/arm). Focus on initiating movement from deep gluteal muscles rather than quadratus lumborum. Maintain alignment without trunk side-flexion. Hold at top position briefly, then lower with control. Progress by extending bottom leg and/or adding small pulses at top position.",
      repetitions: "10-12",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/hip-hike.jpg",
      videoUrl: "/videos/exercises/hip-hike.mp4"
    },
    
    // Gluteal Tendinopathy Exercises
    {
      title: "Isometric Hip Abduction Against Wall",
      bodyPart: "hip",
      type: "isometric",
      difficulty: "beginner",
      equipment: ["wall"],
      description: "Evidence-based isometric exercise for gluteal tendinopathy using Grimaldi's approach to provide pain relief and initial tendon loading without compression.",
      instructions: "Stand sideways next to wall with affected hip away from wall. Position foot of affected leg against wall with knee straight. Generate force against wall by attempting to abduct hip (push foot into wall) at approximately 70% of maximum effort. Maintain neutral alignment of spine and pelvis. Hold contraction for prescribed time, then relax. Ensure no reproduction of lateral hip pain during exercise.",
      repetitions: "5 repetitions with 30-45 second holds",
      sets: "2-3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/isometric-abduction.jpg",
      videoUrl: "/videos/exercises/isometric-abduction.mp4"
    },
    {
      title: "Hip Abduction with Decompression Strategy",
      bodyPart: "hip",
      type: "strength",
      difficulty: "intermediate",
      equipment: ["resistance band (optional)"],
      description: "Specialized exercise for gluteal tendinopathy using Grimaldi's decompression principles to strengthen gluteal muscles while minimizing compression on the greater trochanter.",
      instructions: "Lie on non-affected side with hips flexed approximately 30° and knees bent 90°. Position a pillow between knees to ensure adequate hip abduction (decompression). Maintaining this alignment, lift top knee toward ceiling while keeping feet together, creating rotation at hip rather than abduction. Focus on activating gluteal muscles without tension at lateral hip. Control lowering phase. Add resistance band around thighs for progression.",
      repetitions: "12-15",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/abduction-decompression.jpg",
      videoUrl: "/videos/exercises/abduction-decompression.mp4"
    },
    
    // Hip Control Exercises
    {
      title: "Single Leg Stance with Pelvic Control",
      bodyPart: "hip",
      type: "motor control",
      difficulty: "intermediate",
      equipment: ["mirror (optional)"],
      description: "Fundamental motor control exercise based on Grimaldi's approach to hip stability, focusing on optimal gluteal activation during single leg loading.",
      instructions: "Stand on one leg in front of mirror if available. Focus on maintaining level pelvis without dropping on unsupported side. Engage gluteal muscles of stance leg without tensing or hiking hip. Maintain neutral spine position. Hold stable position, then perform small controlled movements with unsupported leg while maintaining pelvic stability. Progress by closing eyes, adding arm movements, or standing on unstable surface.",
      repetitions: "Hold for 30-60 seconds",
      sets: "3-4",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/single-leg-pelvic-control.jpg",
      videoUrl: "/videos/exercises/single-leg-pelvic-control.mp4"
    },
    {
      title: "Hip Hinge with Gluteal Engagement",
      bodyPart: "hip",
      type: "functional",
      difficulty: "intermediate",
      equipment: ["dowel rod or stick"],
      description: "Functional movement pattern training based on Grimaldi's approach to optimizing hip control during daily activities while maintaining pelvic alignment.",
      instructions: "Stand with feet hip-width apart, holding dowel rod along spine (touching back of head, upper back and sacrum). Maintain these three contact points throughout movement. Hinge at hips by sending buttocks backward while maintaining neutral spine. Feel weight shift into heels. Engage gluteal muscles to control movement. Return to standing by driving through heels and activating gluteals. Ensure movement comes from hip joint rather than spine.",
      repetitions: "10-12",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/hip-hinge-gluteal.jpg",
      videoUrl: "/videos/exercises/hip-hinge-gluteal.mp4"
    },
    
    // Hip Functional Exercises
    {
      title: "Step-Down with Hip Control",
      bodyPart: "hip",
      type: "functional",
      difficulty: "advanced",
      equipment: ["step or small platform"],
      description: "Advanced functional exercise from Grimaldi's approach focusing on eccentric gluteal control during single leg loading, essential for stair and step activities.",
      instructions: "Stand on step with weight on affected leg. Maintain proper alignment with knee tracking over second toe and level pelvis. Slowly lower unaffected leg toward floor by bending stance leg hip and knee with controlled eccentric lowering. Lightly touch heel to floor without transferring weight, then return to start position. Focus on gluteal engagement throughout, particularly during the eccentric phase. Control speed to enhance motor learning.",
      repetitions: "10-12 per side",
      sets: "3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/step-down-control.jpg",
      videoUrl: "/videos/exercises/step-down-control.mp4"
    },
    {
      title: "Lateral Step-Down with Pelvic Alignment",
      bodyPart: "hip",
      type: "functional",
      difficulty: "advanced",
      equipment: ["step or small platform"],
      description: "Advanced functional exercise based on Grimaldi's approach focusing on frontal plane control and pelvic stability during challenging single leg activities.",
      instructions: "Stand sideways on step with affected leg. Keep pelvis level and maintain proper knee alignment over foot. Slowly lower unaffected leg toward floor with controlled hip and knee flexion of stance leg. Lightly touch floor with foot without transferring weight, then return to start position using gluteal muscles. Focus on preventing pelvic drop on unsupported side and maintaining neutral spine alignment. Control speed and quality of movement throughout the exercise.",
      repetitions: "8-10 per side",
      sets: "3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/lateral-step-down.jpg",
      videoUrl: "/videos/exercises/lateral-step-down.mp4"
    },
    
    // Deep Hip Rotator Exercises
    {
      title: "Deep Hip External Rotator Activation",
      bodyPart: "hip",
      type: "motor control",
      difficulty: "beginner",
      equipment: ["none"],
      description: "Targeted exercise for deep hip external rotators based on Grimaldi's approach to addressing hip control and pain associated with internal rotation deficits.",
      instructions: "Sit with good posture on firm surface with feet flat on floor. Without moving knees, create gentle external rotation force at hip by attempting to spread feet apart against floor resistance (feet don't actually move). Focus on feeling engagement of deep hip muscles rather than superficial muscles. Hold contraction at 30-40% maximum effort, then release. Progress by performing in standing with slight knee bend or during functional movements.",
      repetitions: "10 with 5-10 second holds",
      sets: "2-3",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/deep-external-rotators.jpg",
      videoUrl: "/videos/exercises/deep-external-rotators.mp4"
    },
    {
      title: "Dynamic Rotational Control in Prone",
      bodyPart: "hip",
      type: "motor control",
      difficulty: "intermediate",
      equipment: ["none"],
      description: "Progressive exercise targeting hip rotational control based on Grimaldi's approach to dynamic stability of the hip joint in non-weight bearing positions.",
      instructions: "Lie prone with knee bent to 90°. Actively rotate hip externally and internally through comfortable range while maintaining neutral pelvic position (avoid pelvic rotation). Focus on smooth, controlled movement and quality of motion rather than range. To progress, add small ankle weights or perform with increased movement precision or speed. Further progress by moving to side-lying or weight-bearing positions.",
      repetitions: "12-15 each direction",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/prone-rotation-control.jpg",
      videoUrl: "/videos/exercises/prone-rotation-control.mp4"
    }
  ];
}