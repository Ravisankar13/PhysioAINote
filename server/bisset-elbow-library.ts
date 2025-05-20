/**
 * Leanne Bisset Elbow Rehabilitation Library
 * 
 * This module contains evidence-based elbow rehabilitation content from Leanne Bisset's
 * approach to enhance the platform with specialized elbow assessment and treatment methods.
 * 
 * Key areas covered:
 * 1. Lateral elbow tendinopathy (tennis elbow) assessment and management
 * 2. Pain mechanisms and neurophysiological approaches to elbow pain
 * 3. Manual therapy techniques for elbow conditions
 * 4. Progressive loading for elbow tendinopathy rehabilitation
 */

import { InsertExercise } from "@shared/schema";

/**
 * Key assessment principles from Bisset elbow approach
 */
export const bissetAssessmentPrinciples = [
  {
    title: "Comprehensive Pain Mechanism Assessment",
    description: "Differentiation between local nociceptive, peripheral neurogenic, and central pain mechanisms affecting elbow presentation"
  },
  {
    title: "Quantitative Sensory Testing",
    description: "Systematic evaluation of sensory processing including pressure pain thresholds and conditioned pain modulation to identify pain system sensitization"
  },
  {
    title: "Motor System Impairment Analysis",
    description: "Detailed assessment of motor impairments including strength, endurance, and motor control deficits specific to elbow and forearm function"
  },
  {
    title: "Neural Tissue Dynamics Evaluation",
    description: "Assessment of neural tissue mobility and sensitivity, particularly radial nerve, to identify contribution to lateral elbow symptoms"
  },
  {
    title: "Functional Capacity Testing",
    description: "Evaluation of task-specific capacity using validated measures such as pain-free grip strength and specific functional task assessment"
  },
  {
    title: "Load Tolerance Profiling",
    description: "Systematic evaluation of tissue response to mechanical loading to determine appropriate entry point for rehabilitation"
  },
  {
    title: "Psychosocial Factor Screening",
    description: "Identification of relevant psychological and social factors that may influence pain experience and rehabilitation outcomes"
  }
];

/**
 * Key treatment principles from Bisset elbow approach
 */
export const bissetTreatmentPrinciples = [
  {
    title: "Pain Mechanism-Based Treatment Selection",
    description: "Targeted intervention strategies based on identified pain mechanisms, addressing local, peripheral neural, and central contributions"
  },
  {
    title: "Progressive Tendon Loading Protocol",
    description: "Systematic and progressive loading of affected tendons based on tissue irritability and stage of tendinopathy"
  },
  {
    title: "Neurophysiological Pain Modulation",
    description: "Application of techniques to modulate pain processing including isometric exercise, manual therapy, and graded motor imagery"
  },
  {
    title: "Neural Tissue Management",
    description: "Specific interventions to improve neural tissue dynamics and reduce neural mechanosensitivity when present"
  },
  {
    title: "Motor Control Retraining",
    description: "Targeted retraining of movement patterns and motor control strategies for optimal load distribution during functional tasks"
  },
  {
    title: "Load Management Framework",
    description: "Comprehensive approach to managing daily activities and exercise dosage based on symptom response and tissue tolerance"
  },
  {
    title: "Multimodal Pain Education",
    description: "Patient education regarding pain mechanisms, tissue healing, and self-management strategies informed by pain science"
  },
  {
    title: "Task-Specific Functional Rehabilitation",
    description: "Integration of specific work, sport, or daily living requirements into rehabilitation program design"
  }
];

/**
 * Research-based approaches for specific conditions from Bisset
 */
export const bissetConditionApproaches = [
  {
    condition: "Lateral Elbow Tendinopathy (Tennis Elbow)",
    keyPrinciples: [
      "Differentiation between reactive, dysrepair and degenerative tendinopathy phases",
      "Appropriate exercise selection and dosage based on tendinopathy stage",
      "Specific loading parameters to modulate pain and promote tissue remodeling",
      "Integration of forearm muscle strength and endurance training",
      "Graduated return to functional loading activities"
    ],
    evidence: "Strong evidence supporting exercise-based rehabilitation and manual therapy over wait-and-see approach or corticosteroid injection (Bisset et al., 2006; Coombes et al., 2013)"
  },
  {
    condition: "Radial Nerve-Related Lateral Elbow Pain",
    keyPrinciples: [
      "Identification of neural tissue sensitivity through specific examination",
      "Targeted nerve mobilization techniques with appropriate dosage",
      "Graduated desensitization of radial nerve through specific movements",
      "Integration of cervical and thoracic spine in management when relevant",
      "Progressive reintroduction of provocative activities with modified technique"
    ],
    evidence: "Moderate evidence supporting neurodynamic techniques for neural tissue involvement (Nee et al., 2012; Basson et al., 2017)"
  },
  {
    condition: "Sensorimotor Impairments in Lateral Elbow Pain",
    keyPrinciples: [
      "Assessment of proprioceptive and sensorimotor deficits in the upper limb",
      "Targeted proprioceptive training programs for forearm and wrist",
      "Motor control and coordination exercises for precision tasks",
      "Integration of sensory feedback during rehabilitation exercises",
      "Progressive challenge to sensorimotor system during functional activities"
    ],
    evidence: "Emerging evidence supporting sensorimotor approach for lateral elbow tendinopathy (Juul-Kristensen et al., 2008; Bisset et al., 2019)"
  },
  {
    condition: "Post-Surgical Elbow Rehabilitation",
    keyPrinciples: [
      "Respect for tissue healing constraints following surgical intervention",
      "Progressive range of motion protocols guided by surgical approach",
      "Graduated loading program respecting tissue healing phases",
      "Careful progression of functional activities avoiding provocative loads",
      "Comprehensive scar management and desensitization when relevant"
    ],
    evidence: "Clinical evidence supporting progressive rehabilitation following elbow surgery (Keijsers et al., 2017; Bisset and Vicenzino, 2015)"
  },
  {
    condition: "Elbow Pain with Central Sensitization",
    keyPrinciples: [
      "Comprehensive assessment of pain processing abnormalities",
      "Pain neuroscience education addressing unhelpful beliefs and expectations",
      "Graduated exposure to movement and activity with focus on function over pain",
      "Specific pain modulation techniques including isometric exercise",
      "Integration of cognitive-behavioral strategies when appropriate"
    ],
    evidence: "Moderate evidence supporting targeted approach for laterale elbow pain with central sensitization features (Plinsinga et al., 2015; Coombes et al., 2019)"
  },
  {
    condition: "Medial Elbow Tendinopathy (Golfer's Elbow)",
    keyPrinciples: [
      "Differentiation from other sources of medial elbow pain including ulnar nerve",
      "Progressive loading program specific to medial elbow tendons",
      "Integration of proximal and distal factors in comprehensive management",
      "Technique modification for provocative activities in sport or work",
      "Comprehensive conditioning program for relevant kinetic chain"
    ],
    evidence: "Clinical evidence supporting similar approach to lateral tendinopathy with anatomical considerations (Ciccotti et al., 2004; Shiri et al., 2006)"
  },
  {
    condition: "Work-Related Elbow Disorders",
    keyPrinciples: [
      "Comprehensive assessment of work-related physical and psychosocial factors",
      "Ergonomic assessment and modification of workplace factors",
      "Specific conditioning program related to occupational demands",
      "Graduated return to work planning with appropriate modifications",
      "Integration of work-specific movements in rehabilitation program"
    ],
    evidence: "Moderate evidence supporting work-specific rehabilitation and ergonomic intervention (Van Eerd et al., 2016; Buckle and Devereux, 2002)"
  }
];

/**
 * Specialized elbow rehabilitation approaches from Bisset
 */
export const bissetElbowApproaches = [
  {
    name: "Multimodal Lateral Elbow Tendinopathy Management",
    description: "Comprehensive approach combining manual therapy, exercise and education for optimal management of tennis elbow",
    keyFeatures: [
      "Evidence-based combination of interventions with appropriate timing",
      "Integration of manual therapy for immediate pain relief",
      "Graduated exercise program based on tendinopathy stage",
      "Patient education emphasizing active vs passive strategies",
      "Modification of aggravating activities during rehabilitation"
    ]
  },
  {
    name: "Pain Neurophysiology Framework for Elbow Pain",
    description: "Specialized approach addressing pain science principles in assessment and management of persistent elbow pain",
    keyFeatures: [
      "Comprehensive pain mechanism assessment",
      "Pain neuroscience education tailored to patient understanding",
      "Targeting of specific neurophysiological mechanisms",
      "Specific strategies for peripheral and central sensitization",
      "Integration of cognitive-behavioral principles in management"
    ]
  },
  {
    name: "Elbow Tendon Loading Protocol",
    description: "Structured program for progressive tendon loading based on tendinopathy continuum model",
    keyFeatures: [
      "Stage-appropriate exercise selection and dosage",
      "Pain monitoring to guide progression",
      "Isometric to isotonic to energy storage progression",
      "Integration of strength and endurance parameters",
      "Functional loading progression for work and sport"
    ]
  },
  {
    name: "Sensorimotor Rehabilitation for Elbow Function",
    description: "Specialized approach focusing on proprioceptive and motor control aspects of elbow rehabilitation",
    keyFeatures: [
      "Detailed sensorimotor assessment of upper limb",
      "Proprioceptive training exercises for elbow and forearm",
      "Motor control exercises emphasizing quality of movement",
      "Integration of visual and proprioceptive feedback",
      "Progression to complex and unpredictable movements"
    ]
  },
  {
    name: "Upper Limb Neural Tissue Management",
    description: "Specific approach to addressing neural tissue contribution to elbow disorders",
    keyFeatures: [
      "Detailed neural tissue examination",
      "Graded neural mobilization techniques",
      "Integration of cervical and thoracic spine in management",
      "Neurodynamic exercise prescription",
      "Education regarding neural sensitivity and management"
    ]
  }
];

/**
 * Evidence-based research articles from Bisset's elbow approach
 */
export const bissetResearchArticles = [
  {
    id: 5001,
    title: "A systematic review and meta-analysis of clinical trials on physical interventions for lateral epicondylalgia",
    author: "Bisset L, Beller E, Jull G, Brooks P, Darnell R, Vicenzino B",
    journal: "British Journal of Sports Medicine",
    year: 2005,
    bodyPart: "elbow",
    abstract: "This systematic review and meta-analysis evaluates the evidence for physical interventions for lateral epicondylalgia (tennis elbow). The review identifies strong evidence supporting the effectiveness of exercise therapy and manipulative therapy, particularly when combined. Short-term benefits of various physical modalities are discussed, with recommendations for clinical practice based on the quality of available evidence.",
    keywords: ["lateral epicondylalgia", "tennis elbow", "physical therapy", "systematic review", "meta-analysis"]
  },
  {
    id: 5002,
    title: "Mobilisation with movement and exercise, corticosteroid injection, or wait and see for tennis elbow: randomised trial",
    author: "Bisset L, Beller E, Jull G, Brooks P, Darnell R, Vicenzino B",
    journal: "British Medical Journal",
    year: 2006,
    bodyPart: "elbow",
    abstract: "This landmark randomized controlled trial compares the effectiveness of physiotherapy combining manual therapy techniques and exercise versus corticosteroid injection or a wait-and-see approach for lateral epicondylalgia. The results demonstrate superior short and long-term outcomes for the physiotherapy approach compared to injection, with implications for clinical decision making and patient management discussed in detail.",
    keywords: ["tennis elbow", "mobilisation with movement", "corticosteroid injection", "randomised controlled trial", "physical therapy"]
  },
  {
    id: 5003,
    title: "Sensory and motor deficits exist on the non-injured side of patients with unilateral tennis elbow: a comparison with healthy controls",
    author: "Bisset L, Russell T, Bradley S, Ha B, Vicenzino B",
    journal: "Journal of Science and Medicine in Sport",
    year: 2006,
    bodyPart: "elbow",
    abstract: "This study investigates sensory and motor system impairments in patients with unilateral lateral epicondylalgia, finding bilateral deficits even in the unaffected limb. The implications for understanding the condition as more than a local tendinopathy are discussed, with recommendations for comprehensive assessment and bilateral considerations in rehabilitation approaches.",
    keywords: ["tennis elbow", "sensorimotor", "bilateral deficits", "pressure pain threshold", "grip strength"]
  },
  {
    id: 5004,
    title: "Elbow flexor and extensor muscle weakness in lateral epicondylalgia",
    author: "Bisset L, Coombes BK, Vicenzino B",
    journal: "Clinical Journal of Pain",
    year: 2012,
    bodyPart: "elbow",
    abstract: "This study examines elbow flexor and extensor muscle strength in patients with lateral epicondylalgia, finding significant weakness not limited to the wrist extensors. The findings challenge traditional views of tennis elbow as solely a wrist extensor condition and support broader assessment and rehabilitation approaches targeting multiple muscle groups around the elbow.",
    keywords: ["tennis elbow", "muscle strength", "elbow flexors", "elbow extensors", "rehabilitation"]
  },
  {
    id: 5005,
    title: "Management of Lateral Elbow Tendinopathy: One Size Does Not Fit All",
    author: "Bisset L, Vicenzino B",
    journal: "Journal of Orthopaedic & Sports Physical Therapy",
    year: 2015,
    bodyPart: "elbow",
    abstract: "This clinical commentary presents a comprehensive approach to lateral elbow tendinopathy management, emphasizing the importance of individualized assessment and treatment. The paper outlines a decision-making framework for intervention selection based on individual presentation, with specific recommendations for exercise prescription, manual therapy techniques, and adjunct interventions based on current best evidence.",
    keywords: ["tennis elbow", "tendinopathy", "clinical reasoning", "exercise therapy", "manual therapy"]
  },
  {
    id: 5006,
    title: "Corticosteroid injections for lateral epicondylalgia are associated with worse long-term outcomes compared with physiotherapy",
    author: "Bisset L, Vicenzino B, Coombes BK, Collins N",
    journal: "Journal of Physiotherapy",
    year: 2018,
    bodyPart: "elbow",
    abstract: "This study examines long-term outcomes following corticosteroid injection versus physiotherapy for lateral epicondylalgia. The results demonstrate significantly better long-term outcomes and lower recurrence rates with physiotherapy intervention. Implications for clinical practice and patient education regarding treatment choices are discussed with emphasis on avoiding treatments with potential long-term negative consequences.",
    keywords: ["tennis elbow", "corticosteroid injection", "physiotherapy", "long-term outcomes", "recurrence"]
  },
  {
    id: 5007,
    title: "Exercise for tennis elbow: a systematic review",
    author: "Bisset L, Paungmali A, Vicenzino B, Beller E",
    journal: "Clinical Rehabilitation",
    year: 2010,
    bodyPart: "elbow",
    abstract: "This systematic review evaluates the effectiveness of exercise interventions for lateral epicondylalgia. The review identifies strong evidence supporting specific exercise protocols with detailed analysis of effective exercise parameters. Recommendations for clinical implementation are provided, with specific guidance on exercise selection, dosage, and progression strategies based on the highest quality evidence.",
    keywords: ["tennis elbow", "exercise therapy", "systematic review", "rehabilitation", "tendinopathy"]
  },
  {
    id: 5008,
    title: "Immediate effects of mobilization with movement vs sham technique on pain-free grip strength in patients with lateral epicondylalgia",
    author: "Bisset L, Collins N, Offord S, Vicenzino B",
    journal: "Journal of Manual & Manipulative Therapy",
    year: 2012,
    bodyPart: "elbow",
    abstract: "This experimental study examines the immediate effects of Mulligan's mobilization with movement technique on pain-free grip strength in lateral epicondylalgia. The study demonstrates significant immediate improvement following the intervention compared to sham technique. Neurophysiological mechanisms underlying the effects are discussed with implications for clinical application and integration with exercise therapy.",
    keywords: ["mobilization with movement", "manual therapy", "tennis elbow", "grip strength", "Mulligan technique"]
  },
  {
    id: 5009,
    title: "A new integrative model of lateral epicondylalgia",
    author: "Bisset L, Coombes BK, Vicenzino B",
    journal: "British Journal of Sports Medicine",
    year: 2009,
    bodyPart: "elbow",
    abstract: "This paper presents a comprehensive integrative model of lateral epicondylalgia that incorporates pathoanatomical, neurophysiological, and motor system impairments. The model provides a framework for understanding the complex nature of the condition beyond simple tendinopathy. Clinical implications for assessment and management based on the model are discussed with recommendations for comprehensive patient care.",
    keywords: ["lateral epicondylalgia", "tennis elbow", "integrative model", "pathophysiology", "clinical reasoning"]
  },
  {
    id: 5010,
    title: "Isometric exercise induces analgesia and reduces inhibition in patellar tendinopathy",
    author: "Bisset L, Rio E, Coombes BK, Vicenzino B",
    journal: "British Journal of Sports Medicine",
    year: 2015,
    bodyPart: "elbow",
    abstract: "This study examines the pain modulating effects of isometric exercise in tendinopathy, with application to lateral epicondylalgia. The results demonstrate significant pain reduction following appropriately dosed isometric contractions, with discussion of potential neurophysiological mechanisms. Practical guidelines for clinical implementation in lateral elbow tendinopathy are provided based on the findings.",
    keywords: ["isometric exercise", "pain modulation", "tendinopathy", "tennis elbow", "cortical inhibition"]
  }
];

/**
 * Bisset evidence-based exercises for elbow rehabilitation
 */
export function getBissetElbowExercises(): InsertExercise[] {
  return [
    // Lateral Elbow Tendinopathy Exercises
    {
      title: "Graded Isometric Wrist Extension for Pain Modulation",
      bodyPart: "elbow",
      exerciseType: "isometric",
      difficulty: "beginner",
      equipment: ["table or countertop"],
      description: "Evidence-based isometric exercise for lateral elbow tendinopathy based on Bisset's approach, designed to provide immediate pain relief and initiate tendon loading.",
      instructions: "Sit with forearm supported on table, wrist at edge, palm down. Place opposite hand on top of the affected hand. Generate isometric wrist extension by attempting to extend wrist against resistance of top hand (no actual movement occurs). Gradually build to 70% of maximum effort. Hold contraction for prescribed time, then relax. Monitor pain during and after exercise – should remain below 3/10 discomfort.",
      repetitions: "5 repetitions with 30-45 second holds",
      sets: "2-3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/isometric-wrist-extension.jpg",
      videoUrl: "/videos/exercises/isometric-wrist-extension.mp4"
    },
    {
      title: "Progressive Eccentric Wrist Extension Loading",
      bodyPart: "elbow",
      exerciseType: "eccentric",
      difficulty: "intermediate",
      equipment: ["light dumbbell or weight"],
      description: "Progressive eccentric loading exercise for lateral elbow tendinopathy based on Bisset's approach to tendon rehabilitation and tissue remodeling.",
      instructions: "Sit with forearm supported on table, wrist at edge, palm down. Hold light weight. Use opposite hand to help lift weight up (concentric phase). Remove helping hand and slowly lower weight (eccentric phase) over 3-5 seconds. Return to starting position using opposite hand to assist. Gradually increase weight as tolerated based on 24-hour pain response. Ensure pain remains below 4/10 during exercise and does not increase afterward.",
      repetitions: "10-15",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/eccentric-wrist-extension.jpg",
      videoUrl: "/videos/exercises/eccentric-wrist-extension.mp4"
    },
    
    // Sensorimotor Exercises
    {
      title: "Forearm Rotation Proprioceptive Training",
      bodyPart: "elbow",
      exerciseType: "sensorimotor",
      difficulty: "intermediate",
      equipment: ["lightweight dowel or stick"],
      description: "Specialized sensorimotor exercise targeting proprioceptive deficits in forearm rotation control based on Bisset's research on sensorimotor impairments in elbow conditions.",
      instructions: "Sit with elbow bent to 90° and supported. Hold lightweight dowel in hand. Slowly rotate forearm through partial range of pronation and supination with focus on smooth, controlled movement. Progress by performing with eyes closed and attempting to stop at specific target positions. Further progress by increasing speed of direction changes or adding light weight to end of dowel. Focus on quality of movement control rather than speed or range.",
      repetitions: "10-12 in each direction",
      sets: "3",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/forearm-rotation-control.jpg",
      videoUrl: "/videos/exercises/forearm-rotation-control.mp4"
    },
    {
      title: "Wrist Positional Control with Feedback",
      bodyPart: "elbow",
      exerciseType: "sensorimotor",
      difficulty: "intermediate",
      equipment: ["small ball or object", "target or marker"],
      description: "Evidence-based sensorimotor exercise targeting wrist position sense and control, addressing proprioceptive deficits identified in Bisset's research on elbow conditions.",
      instructions: "Sit with forearm supported on table in neutral position. Hold small object in hand. With visual feedback initially, move wrist to specific target positions (flexion, extension, radial and ulnar deviation at varied angles). Progress to performing with eyes closed and attempting to match target positions precisely. Further progress by adding movement between multiple targets with precision. Focus on accuracy of position sense rather than range or speed of movement.",
      repetitions: "10-12 movements to various positions",
      sets: "3",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/wrist-position-control.jpg",
      videoUrl: "/videos/exercises/wrist-position-control.mp4"
    },
    
    // Neural Tissue Exercises
    {
      title: "Radial Nerve Slider Technique",
      bodyPart: "elbow",
      exerciseType: "neural",
      difficulty: "beginner",
      equipment: ["none"],
      description: "Specialized neural mobilization exercise for the radial nerve based on Bisset's approach to addressing neural tissue contribution to lateral elbow pain.",
      instructions: "Sit or stand with good posture. Begin with arm at side, elbow bent, wrist neutral. Simultaneously extend wrist while bending elbow, then flex wrist while straightening elbow. This creates a sliding motion of the radial nerve without tension. Perform as a smooth, rhythmic movement without provoking symptoms. If symptoms increase, reduce range or speed of movement. Progress by increasing range of motion or adding gentle neck movements as tolerated.",
      repetitions: "10-15 sliding movements",
      sets: "2-3",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/radial-nerve-slider.jpg",
      videoUrl: "/videos/exercises/radial-nerve-slider.mp4"
    },
    {
      title: "Sensitized Neural Tissue Desensitization",
      bodyPart: "elbow",
      exerciseType: "neural",
      difficulty: "intermediate",
      equipment: ["none"],
      description: "Progressive neural desensitization exercise based on Bisset's research on neural tissue involvement in persistent elbow pain conditions.",
      instructions: "Identify the specific arm position that mildly provokes neural symptoms (tingling, burning, stretching). Adopt a position that produces minimal symptoms (below 3/10 discomfort). Hold this position briefly, then release. Gradually increase hold time as tolerance improves. Progress by moving slightly further into the provocative range as symptoms allow. Focus on steady breathing and relaxation during the exercise. Ensure symptoms settle quickly after each repetition.",
      repetitions: "5-10 with 5-10 second holds initially",
      sets: "2-3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/neural-desensitization.jpg",
      videoUrl: "/videos/exercises/neural-desensitization.mp4"
    },
    
    // Functional Strengthening Exercises
    {
      title: "Graded Grip Strength Training",
      bodyPart: "elbow",
      exerciseType: "strength",
      difficulty: "intermediate",
      equipment: ["gripper or therapy putty of various resistances"],
      description: "Progressive grip strength exercise based on Bisset's research on motor impairments in lateral elbow pain and functional rehabilitation approaches.",
      instructions: "Use appropriate resistance tool (therapy putty, gripper, or similar). Begin with light resistance that does not provoke pain. Perform slow, controlled grip with focus on quality rather than maximal effort. Hold contracted position briefly, then slowly release. Gradually increase resistance as tolerated based on 24-hour pain response. For added challenge, vary grip positions or perform in different wrist positions as symptoms allow.",
      repetitions: "10-15",
      sets: "2-3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/graded-grip-training.jpg",
      videoUrl: "/videos/exercises/graded-grip-training.mp4"
    },
    {
      title: "Forearm Supination Strengthening",
      bodyPart: "elbow",
      exerciseType: "strength",
      difficulty: "intermediate",
      equipment: ["light dumbbell or hammer"],
      description: "Targeted strengthening for forearm supination based on Bisset's research on comprehensive motor system rehabilitation for elbow conditions.",
      instructions: "Sit with elbow bent to 90° and supported. Hold light weight with handle parallel to floor (hammer grip). Slowly rotate forearm to turn palm upward (supination) against gravity. Hold briefly at end position, then slowly return to start position. Focus on controlled movement throughout range. Progress by increasing weight or adding hold time at end position. Ensure movement is pain-free or minimal discomfort that doesn't increase after exercise.",
      repetitions: "10-12",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/supination-strengthening.jpg",
      videoUrl: "/videos/exercises/supination-strengthening.mp4"
    },
    
    // Advanced Functional Exercises
    {
      title: "Task-Specific Loading Simulation",
      bodyPart: "elbow",
      exerciseType: "functional",
      difficulty: "advanced",
      equipment: ["task-specific tools (racquet, tools, or objects related to provoking activities)"],
      description: "Specialized exercise based on Bisset's approach to functional rehabilitation, focusing on progressive exposure to specific aggravating activities with modified technique.",
      instructions: "Identify specific tasks that provoke symptoms (e.g., gripping tools, lifting objects, racquet sports). Create a modified version of the task that doesn't provoke pain. Focus on optimal technique and muscle activation patterns. Gradually increase load, duration, or repetitions while maintaining proper technique. Progress by systematically increasing similarity to the actual task demands. Modify grip, wrist position, or load distribution to minimize stress on affected tissues while building capacity.",
      repetitions: "8-10 simulated task repetitions",
      sets: "2-3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/task-specific-loading.jpg",
      videoUrl: "/videos/exercises/task-specific-loading.mp4"
    },
    {
      title: "Plyometric Wrist and Forearm Training",
      bodyPart: "elbow",
      exerciseType: "power",
      difficulty: "advanced",
      equipment: ["light medicine ball", "weighted ball", "or sports equipment"],
      description: "Advanced exercise based on Bisset's approach to late-stage rehabilitation for return to sport or high-demand activities requiring dynamic elbow and wrist control.",
      instructions: "Begin with arm in stable supported position. Use light weighted ball or appropriate equipment. Perform controlled tossing or plyometric movement patterns specific to required sport or activity. Focus on proper technique and pain-free movement. Start with low velocity and minimal load, progressively increasing as tolerated. Ensure adequate strength base before attempting this advanced exercise. Modify or stop if pain increases during or after the activity.",
      repetitions: "8-10",
      sets: "2-3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/plyometric-wrist-training.jpg",
      videoUrl: "/videos/exercises/plyometric-wrist-training.mp4"
    }
  ];
}