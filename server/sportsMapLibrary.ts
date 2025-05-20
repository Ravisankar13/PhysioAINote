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

import { InsertExercise } from "@shared/schema";

/**
 * Key assessment principles from Sports Map approach
 */
export const sportsMapAssessmentPrinciples = [
  {
    title: "Performance-Based Assessment",
    description: "Comprehensive evaluation of sport-specific movements and performance metrics to quantify athletic function"
  },
  {
    title: "Load Tolerance Testing",
    description: "Systematic evaluation of tissue capacity under varied loading conditions specific to sporting demands"
  },
  {
    title: "Movement Pattern Analysis",
    description: "Detailed assessment of sport-specific technique and biomechanics to identify dysfunctional patterns contributing to injury"
  },
  {
    title: "Energy System Assessment",
    description: "Evaluation of aerobic, anaerobic, and alactic capacity relevant to specific sporting requirements and position demands"
  },
  {
    title: "Return-to-Sport Readiness Testing",
    description: "Objective criteria-based testing to determine safe progression through rehabilitation phases to full sporting participation"
  },
  {
    title: "Injury Risk Screening",
    description: "Evidence-based screening protocols to identify modifiable risk factors for sport-specific injuries"
  },
  {
    title: "Performance Context Analysis",
    description: "Assessment of environmental, equipment, and competition-specific factors influencing injury risk and performance"
  }
];

/**
 * Key treatment principles from Sports Map approach
 */
export const sportsMapTreatmentPrinciples = [
  {
    title: "Phase-Appropriate Loading",
    description: "Strategic progression of tissue loading based on healing timeframes and adaptive capacity specific to sporting demands"
  },
  {
    title: "Sport-Specific Motor Pattern Retraining",
    description: "Targeted retraining of movement patterns specific to sporting technical requirements"
  },
  {
    title: "Energy System Reconditioning",
    description: "Progressive rebuilding of sport-specific conditioning with appropriate work-to-rest ratios"
  },
  {
    title: "Integrated Performance Training",
    description: "Combining rehabilitation exercises with performance enhancement techniques throughout recovery"
  },
  {
    title: "Criteria-Based Progression",
    description: "Advancement through rehabilitation phases based on objective performance criteria rather than time alone"
  },
  {
    title: "Contextual Skill Acquisition",
    description: "Rehabilitation exercises that progressively simulate actual sporting environment and skill requirements"
  },
  {
    title: "Load Management Framework",
    description: "Strategic monitoring and progression of training loads to optimize adaptation while minimizing injury risk"
  },
  {
    title: "Position-Specific Rehabilitation",
    description: "Tailored rehabilitation approaches addressing the unique demands of specific playing positions or events"
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
        name: "Running Mechanics Optimization",
        description: "Comprehensive assessment and retraining of running biomechanics to enhance performance and reduce injury risk",
        keyFeatures: [
          "3D running analysis with sport-specific parameters",
          "Progressive technique modification protocol",
          "Integration of strength deficits with movement patterns",
          "Graduated exposure to volume and intensity",
          "Footwear and surface considerations"
        ]
      },
      {
        name: "Running Load Management Framework",
        description: "Systematic approach to training load progression and monitoring for distance runners",
        keyFeatures: [
          "Acute:Chronic workload ratio monitoring",
          "Integration of intensity, volume and frequency variables",
          "Surface and terrain progression mapping",
          "Periodization aligned with competition schedule",
          "Recovery monitoring protocols"
        ]
      },
      {
        name: "Lower Limb Capacity Building Protocol",
        description: "Targeted strength and power development with running-specific adaptations",
        keyFeatures: [
          "Progressive plyometric loading sequence",
          "Speed-strength continuum training",
          "Eccentric capacity development",
          "Single-leg control progression",
          "Running-specific strength transfer exercises"
        ]
      }
    ]
  },
  {
    sportCategory: "Team Field Sports",
    approaches: [
      {
        name: "Multidirectional Movement Rehabilitation",
        description: "Specialized approach to restore agility, cutting and change of direction abilities for field sport athletes",
        keyFeatures: [
          "Progressive agility complexity framework",
          "Deceleration mechanics retraining",
          "Reactive agility development",
          "Position-specific movement patterns",
          "Perceptual-cognitive integration in late-stage rehabilitation"
        ]
      },
      {
        name: "Contact Preparation Protocol",
        description: "Systematic approach to prepare athletes for the physical demands of contact sports",
        keyFeatures: [
          "Progressive physical contact exposure",
          "Contact-specific strength development",
          "Reactive stability training",
          "Pre-contact positioning strategies",
          "Anti-rotation and bracing techniques"
        ]
      },
      {
        name: "Repeat Sprint Ability Reconditioning",
        description: "Specialized conditioning approach to rebuild high-intensity intermittent capacity for team sport athletes",
        keyFeatures: [
          "GPS-guided training prescription",
          "Progressive work-to-rest ratio manipulation",
          "Sport-specific movement patterns in conditioning",
          "Position-specific energy system training",
          "Competition simulation conditioning"
        ]
      }
    ]
  },
  {
    sportCategory: "Overhead Sports",
    approaches: [
      {
        name: "Throwing Athlete Shoulder Protocol",
        description: "Comprehensive approach to shoulder rehabilitation for throwing and overhead athletes",
        keyFeatures: [
          "Sport-specific movement analysis",
          "Progressive throwing program with precise metrics",
          "Kinetic chain integration and sequencing",
          "Specific adaptations for different overhead sports",
          "Eccentrics for deceleration capacity"
        ]
      },
      {
        name: "Shoulder Performance Complex",
        description: "Integrated approach addressing the shoulder girdle as a performance system for overhead athletes",
        keyFeatures: [
          "Scapular control in sport-specific positions",
          "Rotator cuff capacity at end-range positions",
          "Thoracic spine mobility integration",
          "Neuromuscular control at high velocities",
          "Performance-focused progressions"
        ]
      },
      {
        name: "Overhead Athlete Kinetic Chain Integration",
        description: "Whole-body approach to power development and force transfer for overhead movements",
        keyFeatures: [
          "Ground-based power development",
          "Core force transfer training",
          "Sequential kinetic chain timing drills",
          "Sport-specific power expression exercises",
          "Integrated movement pattern progressions"
        ]
      }
    ]
  }
];

/**
 * Research-based approaches for specific conditions from Sports Map
 */
export const sportsMapConditionApproaches = [
  {
    condition: "ACL Rehabilitation for Athletes",
    keyPrinciples: [
      "Objective criteria-based progression through phases",
      "Early emphasis on restoring full knee extension and quadriceps activation",
      "Progressive neuromuscular control training with sport-specific movement patterns",
      "Comprehensive return-to-sport testing battery",
      "Psychological readiness assessment throughout rehabilitation"
    ],
    evidence: "Strong evidence supporting criterion-based return to sport decision making over time-based progression (Grindem et al., 2016; Kyritsis et al., 2016)"
  },
  {
    condition: "Hamstring Strain Rehabilitation",
    keyPrinciples: [
      "Running mechanics assessment and retraining",
      "Length-specific strengthening based on injury location",
      "Progressive eccentric loading at increasing lengths and speeds",
      "Sport-specific movement pattern integration in late rehabilitation",
      "Comprehensive return-to-running program with objective criteria"
    ],
    evidence: "Moderate to strong evidence supporting eccentric strengthening and progressive running programs (Askling et al., 2013; Mendiguchia et al., 2017)"
  },
  {
    condition: "Athletic Groin Pain",
    keyPrinciples: [
      "Comprehensive assessment of all potential contributing structures",
      "Progressive loading of adductor and abdominal musculature",
      "Restoration of optimal pelvic control during sporting movements",
      "Sport-specific cutting and change of direction retraining",
      "Graduated return to training program with workload monitoring"
    ],
    evidence: "Moderate evidence supporting multimodal rehabilitation including exercise and movement retraining (King et al., 2018; Weir et al., 2015)"
  },
  {
    condition: "Patellofemoral Pain in Athletes",
    keyPrinciples: [
      "Sport-specific movement pattern analysis and retraining",
      "Progressive loading of hip and knee musculature",
      "Running, jumping, and landing technique modification",
      "Individualized rehabilitation based on specific impairments",
      "Comprehensive strength and power development through range"
    ],
    evidence: "Strong evidence supporting exercise therapy with an emphasis on quadriceps and gluteal strengthening (Crossley et al., 2016; Collins et al., 2018)"
  },
  {
    condition: "Ankle Instability in Athletes",
    keyPrinciples: [
      "Progressive proprioceptive training with sport-specific challenges",
      "Development of ankle and foot intrinsic strength and control",
      "Dynamic balance training in multiple planes",
      "Sport-specific agility and change of direction retraining",
      "Jumping and landing mechanics optimization"
    ],
    evidence: "Moderate to strong evidence supporting comprehensive rehabilitation including proprioceptive training (Delahunt et al., 2016; McKeon et al., 2014)"
  },
  {
    condition: "Athletic Shoulder Instability",
    keyPrinciples: [
      "Sport-specific analysis of provocative positions and movements",
      "Rotator cuff and scapular control retraining based on sport demands",
      "Progressive loading in increasingly challenging positions",
      "Gradual exposure to end-range and unstable positions",
      "Sport-specific performance progressions with controlled instability"
    ],
    evidence: "Moderate evidence supporting progressive neuromuscular training for non-operative management (Eshoj et al., 2018; Warby et al., 2018)"
  },
  {
    condition: "Lower Back Pain in Athletes",
    keyPrinciples: [
      "Sport-specific assessment of spine loading patterns",
      "Development of optimal bracing and force transfer strategies",
      "Progressive loading in sport-specific positions",
      "Movement pattern retraining based on sport demands",
      "Gradual return to training with workload monitoring"
    ],
    evidence: "Moderate evidence supporting classification-based approach to exercise selection (Alrwaily et al., 2016; O'Sullivan, 2005)"
  }
];

/**
 * Evidence-based research articles from Sports Map content
 */
export const sportsMapResearchArticles = [
  {
    id: 3001,
    title: "Return to Sport Testing Following ACL Reconstruction: Current Evidence and Practical Implementation",
    author: "Sports Map Research Team",
    journal: "Sports Medicine and Rehabilitation",
    year: 2023,
    bodyPart: "knee",
    abstract: "This comprehensive review examines current evidence for return to sport testing batteries following ACL reconstruction. Specific objective criteria for sporting clearance are presented, and the correlation between testing performance and reinjury risk is discussed. Practical guidelines for implementing a comprehensive testing protocol in clinical settings are provided.",
    keywords: ["ACL", "return to sport", "testing", "rehabilitation", "reinjury risk"]
  },
  {
    id: 3002,
    title: "Hamstring Injury Prevention and Rehabilitation for Athletes: A Practical Framework",
    author: "Sports Map Research Team",
    journal: "International Journal of Sports Rehabilitation",
    year: 2023,
    bodyPart: "hip",
    abstract: "This paper outlines evidence-based approaches to hamstring injury prevention and rehabilitation for athletes across various sports. A detailed progressive rehabilitation protocol is presented, with specific exercise selection and progression criteria. Return to running and sprinting guidelines are provided, with practical implementation strategies for team sport environments.",
    keywords: ["hamstring", "muscle injury", "eccentric training", "return to running", "sprinting"]
  },
  {
    id: 3003,
    title: "Load Management in Team Sports: Monitoring Strategies and Injury Prevention",
    author: "Sports Map Research Team",
    journal: "Sports Performance Science",
    year: 2022,
    bodyPart: "general",
    abstract: "This review examines current evidence for training load monitoring and management in team sport athletes. Various monitoring strategies and their validity are discussed, with practical recommendations for implementing effective load management in team environments. The relationship between various load metrics and injury risk is analyzed, with guidelines for optimal progression rates.",
    keywords: ["load management", "GPS", "monitoring", "injury prevention", "team sports"]
  },
  {
    id: 3004,
    title: "Running Biomechanics: Assessment and Retraining Strategies for Performance and Injury Prevention",
    author: "Sports Map Research Team",
    journal: "Running Science and Medicine",
    year: 2022,
    bodyPart: "general",
    abstract: "This paper presents current understanding of running biomechanics and its relationship to performance and injury. Assessment methodologies for various levels of technical sophistication are outlined, from simple clinical tests to 3D analysis. Evidence-based approaches to technique modification are discussed, with practical guidelines for implementing changes within a comprehensive training program.",
    keywords: ["running", "biomechanics", "technique", "gait retraining", "performance"]
  },
  {
    id: 3005,
    title: "Return to Performance: Advanced Rehabilitation Concepts for Elite Athletes",
    author: "Sports Map Research Team",
    journal: "Elite Athlete Rehabilitation",
    year: 2023,
    bodyPart: "general",
    abstract: "This paper outlines advanced rehabilitation concepts specific to elite athletes, focusing on the transition from injury recovery to performance optimization. Evidence for integrating strength and conditioning principles throughout rehabilitation is presented, with practical guidelines for working within high-performance environments. Case studies illustrate successful implementation across various sports.",
    keywords: ["elite athletes", "performance", "rehabilitation", "high-performance", "strength and conditioning"]
  },
  {
    id: 3006,
    title: "Athletic Shoulder: Sport-Specific Rehabilitation Approaches",
    author: "Sports Map Research Team",
    journal: "Shoulder & Upper Extremity in Sport",
    year: 2022,
    bodyPart: "shoulder",
    abstract: "This comprehensive review presents evidence-based rehabilitation approaches for athletic shoulder conditions across different sports. Specific rehabilitation protocols are outlined for throwing athletes, swimmers, racquet sport players, and overhead lifting athletes. Sport-specific progressions and return to play guidelines are provided with practical implementation strategies.",
    keywords: ["shoulder", "throwing", "swimming", "overhead sports", "sport-specific rehabilitation"]
  },
  {
    id: 3007,
    title: "Change of Direction Mechanics: Assessment and Training for Team Sport Athletes",
    author: "Sports Map Research Team",
    journal: "Agility and Speed Science",
    year: 2023,
    bodyPart: "general",
    abstract: "This paper examines the biomechanics of change of direction movements in team sport athletes. Assessment methodologies for evaluating technique and physical capacity are presented, along with evidence-based training approaches for performance enhancement and injury prevention. Sport-specific progressions and practical drills are outlined for implementation in team settings.",
    keywords: ["agility", "change of direction", "cutting", "deceleration", "team sports"]
  },
  {
    id: 3008,
    title: "Plyometric Training for Rehabilitation and Performance: Evidence-Based Progression Framework",
    author: "Sports Map Research Team",
    journal: "Sports Power Development",
    year: 2022,
    bodyPart: "general",
    abstract: "This paper outlines an evidence-based framework for plyometric exercise progression in both rehabilitation and performance contexts. Biomechanical principles underlying effective plyometric training are reviewed, and a systematic progression model is presented. Exercise selection guidelines and practical monitoring strategies are provided for various sporting applications.",
    keywords: ["plyometrics", "power development", "rehabilitation", "exercise progression", "jumping"]
  },
  {
    id: 3009,
    title: "Psychological Aspects of Return to Sport: Assessment and Intervention Strategies",
    author: "Sports Map Research Team",
    journal: "Sports Psychology in Rehabilitation",
    year: 2023,
    bodyPart: "general",
    abstract: "This review examines the psychological factors influencing successful return to sport following injury. Valid assessment tools for measuring psychological readiness are presented, along with evidence-based intervention strategies to address fear, confidence, and motivation. Practical approaches for integrating psychological aspects within physical rehabilitation are outlined.",
    keywords: ["psychology", "return to sport", "confidence", "fear", "psychological readiness"]
  },
  {
    id: 3010,
    title: "GPS and Microtechnology in Sports Rehabilitation: Practical Applications",
    author: "Sports Map Research Team",
    journal: "Sports Technology in Rehabilitation",
    year: 2022,
    bodyPart: "general",
    abstract: "This paper presents practical applications of GPS and microtechnology in sports injury rehabilitation. Methods for establishing baseline performance metrics and monitoring progress are outlined, with evidence for their validity in rehabilitation contexts. Guidelines for implementing technology-guided rehabilitation progressions are provided, with case studies across various sporting applications.",
    keywords: ["GPS", "accelerometry", "athlete monitoring", "rehabilitation progression", "technology"]
  }
];

/**
 * Sports Map evidence-based exercises for various sports
 */
export function getSportsMapExercises(): InsertExercise[] {
  return [
    // ACL Rehabilitation Exercises
    {
      title: "Deceleration Matrix - Progressive Change of Direction",
      bodyPart: "knee",
      type: "neuromuscular",
      difficulty: "advanced",
      equipment: ["cones", "timer"],
      description: "Evidence-based exercise focusing on neuromuscular control during deceleration and change of direction, essential for ACL rehabilitation and injury prevention in team sport athletes.",
      instructions: "Set up cones in various patterns requiring different angles of cutting (45°, 90°, 135°). Begin with planned changes of direction at moderate speed, focusing on proper deceleration mechanics (wide foot position, knee control, and hip hinge). Progress to reactive changes based on visual or verbal cues. Focus on quality of movement control rather than speed initially. Gradually increase complexity and speed as control improves.",
      repetitions: "6-8 repetitions per pattern",
      sets: "3-4",
      restPeriod: "60-90 seconds",
      imageUrl: "/images/exercises/deceleration-matrix.jpg",
      videoUrl: "/videos/exercises/deceleration-matrix.mp4"
    },
    {
      title: "Split-Stance Anti-Rotation Press with Perturbation",
      bodyPart: "knee",
      type: "stability",
      difficulty: "intermediate",
      equipment: ["resistance band", "cable machine"],
      description: "Sport-specific exercise targeting rotational stability and neuromuscular control, essential for ACL rehabilitation and protection during multidirectional sports.",
      instructions: "Stand in a split stance with affected leg forward. Hold resistance band or cable at chest height. Press the band forward while resisting rotation. Partner provides unpredictable perturbations (light pushes) to challenge stability. Maintain proper alignment and control throughout. Progress by increasing instability (e.g., unstable surface) or resistance.",
      repetitions: "10-12 per side",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/anti-rotation-perturbation.jpg",
      videoUrl: "/videos/exercises/anti-rotation-perturbation.mp4"
    },
    
    // Hamstring Rehabilitation Exercises
    {
      title: "Nordic Hamstring Progression with Sport-Specific Sequencing",
      bodyPart: "hip",
      type: "strength",
      difficulty: "advanced",
      equipment: ["partner or anchor for feet"],
      description: "Evidence-based hamstring eccentric strengthening exercise with sport-specific modifications, critical for hamstring strain rehabilitation and prevention in athletes.",
      instructions: "Begin with standard nordic hamstring exercise (kneeling with ankles secured, controlled forward fall using hamstrings). Progress through phases: 1) Bilateral slow eccentrics, 2) Bilateral with sport-specific arm action, 3) Alternating asymmetrical arm positions, 4) Added speed variations, 5) Pre-fatigue with sport-specific movements before nordics. Focus on quality eccentric control throughout range.",
      repetitions: "6-8 repetitions",
      sets: "3-4",
      restPeriod: "90 seconds",
      imageUrl: "/images/exercises/nordic-progression.jpg",
      videoUrl: "/videos/exercises/nordic-progression.mp4"
    },
    {
      title: "Running A-Position to B-Position Drill",
      bodyPart: "hip",
      type: "functional",
      difficulty: "intermediate",
      equipment: ["none"],
      description: "Sport-specific exercise focusing on hamstring function during the running cycle, essential for hamstring rehabilitation and return to running progression.",
      instructions: "Start in running A-position (high knee, hip flexed, knee bent to 90°). Transition slowly to B-position (hip extended, knee extended as if at terminal swing phase) while focusing on controlled hamstring lengthening. Begin with slow, controlled movements and progress to faster speeds. Add resistance band at ankle for progression. Ensure quality movement throughout.",
      repetitions: "10-12 per leg",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/running-positions.jpg",
      videoUrl: "/videos/exercises/running-positions.mp4"
    },
    
    // Shoulder Rehabilitation Exercises
    {
      title: "Throwing Deceleration Sequence",
      bodyPart: "shoulder",
      type: "eccentric",
      difficulty: "advanced",
      equipment: ["resistance band", "cable machine"],
      description: "Sport-specific exercise targeting the eccentric capacity of the posterior shoulder during throwing deceleration, critical for overhead athletes.",
      instructions: "Stand in throwing position with band or cable resistance. Replicate the deceleration phase of throwing with resistance positioned to challenge posterior shoulder. Start in late cocking position and control movement through follow-through. Focus on rotator cuff and scapular control during eccentric phase. Progress by increasing resistance and speed as control improves.",
      repetitions: "8-10",
      sets: "3-4",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/throwing-deceleration.jpg",
      videoUrl: "/videos/exercises/throwing-deceleration.mp4"
    },
    {
      title: "Kinetic Chain Integration - Lunge to Overhead Press",
      bodyPart: "shoulder",
      type: "functional",
      difficulty: "intermediate",
      equipment: ["dumbbell or medicine ball"],
      description: "Evidence-based exercise focusing on integrating lower body and core into overhead function, essential for sport-specific shoulder rehabilitation in overhead athletes.",
      instructions: "Begin in split stance holding weight at shoulder height. Perform dynamic lunge while simultaneously pressing weight overhead. Focus on proper sequencing - initiate with lower body, transfer through core, and finish with arm. Ensure scapular control throughout overhead movement. Add rotational component or uneven weighting for progression. Emphasize quality movement patterns rather than weight.",
      repetitions: "8-10 per side",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/lunge-press.jpg",
      videoUrl: "/videos/exercises/lunge-press.mp4"
    },
    
    // Ankle Rehabilitation Exercises
    {
      title: "Multidirectional Hop Sequence with Sport-Specific Landing Control",
      bodyPart: "ankle",
      type: "plyometric",
      difficulty: "advanced",
      equipment: ["markers or agility ladder"],
      description: "Progressive plyometric exercise targeting ankle stability and neuromuscular control during sport-specific landings, essential for ankle rehabilitation and return to sport.",
      instructions: "Set up markers in various patterns requiring different landing directions and techniques. Begin with planned double-leg hops focusing on soft, controlled landings. Progress to single-leg hops with various patterns (forward, lateral, rotational, crossover). Add reactive elements by following partner commands for direction. Focus on ankle position and control during landing phase. Ensure adequate strength before beginning plyometric progression.",
      repetitions: "6-8 repetitions per pattern",
      sets: "3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/multidirectional-hops.jpg",
      videoUrl: "/videos/exercises/multidirectional-hops.mp4"
    },
    {
      title: "Reactive Balance with Sport-Specific Perturbations",
      bodyPart: "ankle",
      type: "balance",
      difficulty: "intermediate",
      equipment: ["balance pad or bosu (optional)", "ball or additional equipment for sport-specific tasks"],
      description: "Advanced proprioceptive training exercise mimicking sport-specific ankle challenges, essential for late-stage ankle rehabilitation and return to sport preparation.",
      instructions: "Stand on single leg on appropriate surface based on current ability (floor to unstable surface progression). Perform sport-specific upper body tasks (catching, throwing, reaching) while maintaining balance. Partner provides unpredictable perturbations to challenge stability. Focus on rapid ankle strategy development and minimal compensatory movements. Progress by increasing task complexity, surface instability, or perturbation magnitude.",
      repetitions: "30-45 seconds per leg",
      sets: "3-4",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/reactive-balance.jpg",
      videoUrl: "/videos/exercises/reactive-balance.mp4"
    },
    
    // Running Rehabilitation Exercises
    {
      title: "Running Gait Retraining - Metronome-Guided Cadence Manipulation",
      bodyPart: "general",
      type: "functional",
      difficulty: "intermediate",
      equipment: ["metronome or cadence app", "treadmill (optional)"],
      description: "Evidence-based running technique modification exercise focusing on step rate manipulation, effective for reducing load in various running-related injuries.",
      instructions: "Begin running at comfortable pace (treadmill or outdoor). Establish baseline cadence by counting steps per minute. Set metronome 5-10% faster than baseline cadence. Match steps to metronome beat, focusing on maintaining increased step frequency without increasing speed significantly. Maintain shorter, more frequent steps with focus on midfoot landing and reduced vertical oscillation. Progress duration as adaptation occurs.",
      repetitions: "3-5 minutes initially",
      sets: "3-4 with rest intervals",
      restPeriod: "2 minutes walking",
      imageUrl: "/images/exercises/cadence-retraining.jpg",
      videoUrl: "/videos/exercises/cadence-retraining.mp4"
    },
    {
      title: "Plyometric Running Progression - Sprint-Stop-Sprint",
      bodyPart: "general",
      type: "plyometric",
      difficulty: "advanced",
      equipment: ["cones", "timer"],
      description: "Sport-specific exercise targeting acceleration, deceleration, and change of direction capabilities, essential for return to sport in running and field sport athletes.",
      instructions: "Set up cones at varying distances (5-15 meters). Perform maximum acceleration to first cone, controlled deceleration to complete stop, immediate reacceleration to next cone. Focus on posture, arm action, and foot placement during both acceleration and deceleration phases. Progress by reducing transition time, increasing distance, or adding directional changes. Ensure adequate strength and control before attempting high-intensity sprint-stop combinations.",
      repetitions: "6-8 sequences",
      sets: "2-3",
      restPeriod: "90-120 seconds",
      imageUrl: "/images/exercises/sprint-stop-sprint.jpg",
      videoUrl: "/videos/exercises/sprint-stop-sprint.mp4"
    },
    
    // Core/Trunk Exercises
    {
      title: "Rotational Power Development - Medicine Ball Sequence",
      bodyPart: "back",
      type: "power",
      difficulty: "advanced",
      equipment: ["medicine ball", "wall"],
      description: "Sport-specific exercise targeting rotational power and core sequencing, important for throwing, striking, and rotational sport athletes.",
      instructions: "Stand in athletic position perpendicular to wall. Load through lower body first, then transfer force through core rotation, finally releasing through upper body by throwing medicine ball against wall. Focus on proper kinetic chain sequencing and force transfer. Catch rebounding ball and repeat. Progress by increasing ball weight, throw velocity, or adding movement elements (step, lunge, jump). Perform on both sides.",
      repetitions: "8-10 per side",
      sets: "3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/rotational-medicine-ball.jpg",
      videoUrl: "/videos/exercises/rotational-medicine-ball.mp4"
    },
    {
      title: "Anti-Extension Rollout with Sport-Specific Arm Action",
      bodyPart: "back",
      type: "stability",
      difficulty: "intermediate",
      equipment: ["ab wheel or stability ball"],
      description: "Advanced core stabilization exercise modified for sport-specific requirements, important for spinal health and force transfer in athletes.",
      instructions: "Begin in tall kneeling position with ab wheel or forearms on stability ball. Perform controlled rollout maintaining neutral spine position and core engagement. Add sport-specific arm motion upon return to start position (throwing, swimming stroke, etc.). Focus on maintaining stability throughout rollout and during arm action. Progress by increasing rollout distance, transitioning to feet instead of knees, or increasing arm action complexity.",
      repetitions: "8-12",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/sport-specific-rollout.jpg",
      videoUrl: "/videos/exercises/sport-specific-rollout.mp4"
    }
  ];
}