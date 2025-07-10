/**
 * Multiplayer Competition Game Types
 * Real-time competitive clinical challenges where users battle head-to-head
 */

export interface MultiplayerGameType {
  id: string;
  name: string;
  description: string;
  playerCount: { min: number; max: number };
  timeLimit: number;
  gameFormat: 'real_time' | 'turn_based' | 'elimination' | 'race';
  scoringMethod: 'speed_accuracy' | 'accuracy_only' | 'head_to_head' | 'elimination';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export const multiplayerGameTypes: MultiplayerGameType[] = [
  {
    id: 'diagnosis_duel',
    name: 'Diagnosis Duel',
    description: 'Head-to-head rapid diagnosis battle. Two clinicians race to correctly diagnose the same patient case within 60 seconds.',
    playerCount: { min: 2, max: 2 },
    timeLimit: 60,
    gameFormat: 'real_time',
    scoringMethod: 'speed_accuracy',
    difficulty: 'intermediate'
  },
  {
    id: 'clinical_relay_race',
    name: 'Clinical Relay Race',
    description: 'Teams of 3-4 players work through complex case stages. Each player handles one phase: History → Examination → Diagnosis → Treatment.',
    playerCount: { min: 3, max: 4 },
    timeLimit: 300,
    gameFormat: 'real_time',
    scoringMethod: 'speed_accuracy',
    difficulty: 'advanced'
  },
  {
    id: 'red_flag_showdown',
    name: 'Red Flag Showdown',
    description: 'Multiple players compete to identify serious pathology red flags. First to correctly identify all critical signs wins.',
    playerCount: { min: 2, max: 8 },
    timeLimit: 120,
    gameFormat: 'race',
    scoringMethod: 'speed_accuracy',
    difficulty: 'expert'
  },
  {
    id: 'treatment_tournament',
    name: 'Treatment Tournament',
    description: 'Bracket-style elimination tournament. Players design optimal treatment plans, with peer voting determining winners.',
    playerCount: { min: 4, max: 16 },
    timeLimit: 180,
    gameFormat: 'elimination',
    scoringMethod: 'head_to_head',
    difficulty: 'advanced'
  },
  {
    id: 'emergency_triage_battle',
    name: 'Emergency Triage Battle',
    description: 'Real-time multi-patient emergency simulation. Players compete to correctly prioritize and manage multiple critical patients.',
    playerCount: { min: 2, max: 6 },
    timeLimit: 240,
    gameFormat: 'real_time',
    scoringMethod: 'accuracy_only',
    difficulty: 'expert'
  },
  {
    id: 'anatomy_lightning_round',
    name: 'Anatomy Lightning Round',
    description: 'Rapid-fire anatomy identification battle. Players compete to identify anatomical structures, functions, and clinical correlations.',
    playerCount: { min: 2, max: 10 },
    timeLimit: 45,
    gameFormat: 'race',
    scoringMethod: 'speed_accuracy',
    difficulty: 'beginner'
  },
  {
    id: 'differential_debate',
    name: 'Differential Debate',
    description: 'Turn-based clinical reasoning battle. Players take turns adding to differential diagnosis list, defending their choices.',
    playerCount: { min: 2, max: 4 },
    timeLimit: 360,
    gameFormat: 'turn_based',
    scoringMethod: 'head_to_head',
    difficulty: 'expert'
  },
  {
    id: 'assessment_auction',
    name: 'Assessment Auction',
    description: 'Players bid on assessment techniques using limited "clinical resource points". Most accurate diagnosis with efficient resource use wins.',
    playerCount: { min: 3, max: 8 },
    timeLimit: 300,
    gameFormat: 'turn_based',
    scoringMethod: 'accuracy_only',
    difficulty: 'advanced'
  },
  {
    id: 'case_study_chaos',
    name: 'Case Study Chaos',
    description: 'Fast-paced multi-case challenge. Players rotate through different patient scenarios every 30 seconds, competing for highest accuracy.',
    playerCount: { min: 3, max: 12 },
    timeLimit: 180,
    gameFormat: 'race',
    scoringMethod: 'speed_accuracy',
    difficulty: 'intermediate'
  },
  {
    id: 'clinical_capture_flag',
    name: 'Clinical Capture the Flag',
    description: 'Team-based competition where teams "capture" correct diagnoses by solving interconnected patient cases faster than opponents.',
    playerCount: { min: 4, max: 8 },
    timeLimit: 450,
    gameFormat: 'real_time',
    scoringMethod: 'speed_accuracy',
    difficulty: 'advanced'
  },
  {
    id: 'symptom_survivor',
    name: 'Symptom Survivor',
    description: 'Elimination-style competition. Players vote each other out based on incorrect symptom interpretations until one survivor remains.',
    playerCount: { min: 6, max: 12 },
    timeLimit: 600,
    gameFormat: 'elimination',
    scoringMethod: 'elimination',
    difficulty: 'expert'
  },
  {
    id: 'treatment_trade_off',
    name: 'Treatment Trade-Off',
    description: 'Resource management competition. Players manage limited treatment resources across multiple patients, optimizing outcomes.',
    playerCount: { min: 2, max: 6 },
    timeLimit: 420,
    gameFormat: 'real_time',
    scoringMethod: 'accuracy_only',
    difficulty: 'expert'
  }
];

export interface MultiplayerMatchmaking {
  gameTypeId: string;
  skillLevel: 'novice' | 'intermediate' | 'advanced' | 'expert';
  regionPreference?: string;
  languagePreference?: string;
  availableTimeSlot: number; // minutes
}

export interface MultiplayerGameRoom {
  roomId: string;
  gameType: MultiplayerGameType;
  players: Array<{
    userId: number;
    username: string;
    skillLevel: string;
    joinedAt: Date;
    ready: boolean;
  }>;
  status: 'waiting' | 'starting' | 'active' | 'completed';
  gameData: any;
  scores: Record<number, number>;
  startTime?: Date;
  endTime?: Date;
  winner?: number;
}

/**
 * Real-time scoring systems for multiplayer games
 */
export const multiplayerScoringRules = {
  diagnosis_duel: {
    correctDiagnosis: 100,
    speedBonus: (timeRemaining: number, totalTime: number) => Math.floor((timeRemaining / totalTime) * 50),
    incorrectPenalty: -25
  },
  clinical_relay_race: {
    stageCompletion: 75,
    teamBonus: 25,
    accuracyMultiplier: 1.5,
    handoffPenalty: -10
  },
  red_flag_showdown: {
    criticalRedFlag: 150,
    minorRedFlag: 75,
    falsePositive: -50,
    firstToComplete: 100
  },
  emergency_triage_battle: {
    correctPrioritization: 100,
    patientOutcome: 150,
    resourceEfficiency: 75,
    timeManagement: 50
  }
};

/**
 * Multiplayer game content generators
 */
export class MultiplayerContentGenerator {
  static generateDiagnosisDuelCase() {
    return {
      patientAge: Math.floor(Math.random() * 60) + 20,
      chiefComplaint: this.getRandomComplaint(),
      vitals: this.generateVitals(),
      examination: this.generateExamFindings(),
      correctDiagnosis: this.getCorrelatedDiagnosis(),
      distractors: this.generateDistractors(),
      timeLimit: 60
    };
  }

  static generateClinicalRelayStages() {
    return {
      stage1_history: { questions: this.generateHistoryQuestions(), timeLimit: 60 },
      stage2_examination: { tests: this.generateExamTests(), timeLimit: 90 },
      stage3_diagnosis: { options: this.generateDiagnosisOptions(), timeLimit: 45 },
      stage4_treatment: { plans: this.generateTreatmentOptions(), timeLimit: 105 }
    };
  }

  private static getRandomComplaint() {
    const complaints = [
      'Severe chest pain radiating to left arm',
      'Sudden onset severe headache with vision changes',
      'Progressive weakness in both legs over 2 days',
      'Acute abdominal pain with nausea and vomiting',
      'Shortness of breath with swollen ankles'
    ];
    return complaints[Math.floor(Math.random() * complaints.length)];
  }

  private static generateVitals() {
    return {
      heartRate: Math.floor(Math.random() * 60) + 60,
      bloodPressure: `${Math.floor(Math.random() * 80) + 100}/${Math.floor(Math.random() * 40) + 60}`,
      temperature: (36 + Math.random() * 4).toFixed(1),
      respiratoryRate: Math.floor(Math.random() * 10) + 15,
      oxygenSaturation: Math.floor(Math.random() * 10) + 90
    };
  }

  private static generateExamFindings() {
    const findings = [
      'Bilateral rales on chest auscultation',
      'Positive Babinski reflex bilaterally',
      'Abdominal guarding and rebound tenderness',
      'Irregular heart rhythm with murmur',
      'Decreased sensation in lower extremities'
    ];
    return findings[Math.floor(Math.random() * findings.length)];
  }

  private static getCorrelatedDiagnosis() {
    const diagnoses = [
      'Acute myocardial infarction',
      'Stroke with increased intracranial pressure',
      'Guillain-Barré syndrome',
      'Acute appendicitis',
      'Congestive heart failure'
    ];
    return diagnoses[Math.floor(Math.random() * diagnoses.length)];
  }

  private static generateDistractors() {
    return [
      'Anxiety attack',
      'Muscle strain',
      'Viral infection',
      'Dehydration'
    ];
  }

  private static generateHistoryQuestions() {
    return [
      'What triggered the onset of symptoms?',
      'Any family history of similar conditions?',
      'Current medications and allergies?',
      'Previous medical or surgical history?'
    ];
  }

  private static generateExamTests() {
    return [
      'Cardiovascular examination',
      'Neurological assessment',
      'Respiratory function tests',
      'Musculoskeletal evaluation'
    ];
  }

  private static generateDiagnosisOptions() {
    return [
      'Primary differential diagnosis',
      'Secondary considerations',
      'Red flag conditions to rule out'
    ];
  }

  private static generateTreatmentOptions() {
    return [
      'Immediate interventions',
      'Ongoing management plan',
      'Follow-up requirements',
      'Patient education needs'
    ];
  }
}