import OpenAI from "openai";
import { type GameContent } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GameContentRequest {
  gameType: string;
  bodyPart?: string;
  difficulty?: string;
  theme?: string;
}

export class GameContentGenerator {
  
  /**
   * Generate Lightning Diagnosis content
   */
  async generateLightningDiagnosis(request: GameContentRequest) {
    const prompt = `Generate 5 lightning diagnosis cases for ${request.bodyPart || 'general'} physiotherapy.
    
Each case should be:
- Brief presentation (1-2 sentences)
- 30-second time limit 
- Clear correct diagnosis
- 2-3 red herrings/distractors
- ${request.difficulty || 'intermediate'} difficulty level

Format as JSON with this structure:
{
  "cases": [
    {
      "id": "ld_001",
      "presentation": "45-year-old tennis player with sudden onset shoulder pain during serve",
      "timeLimit": 30,
      "correctDiagnosis": "Rotator cuff tear",
      "redHerrings": ["Shoulder impingement", "Labral tear", "Biceps tendinitis"]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate Treatment Speed Run content
   */
  async generateTreatmentSpeedRun(request: GameContentRequest) {
    const prompt = `Generate 3 treatment speed run cases for ${request.bodyPart || 'general'} physiotherapy.

Each case should include:
- Clear diagnosis
- Patient profile details
- 5-minute time limit
- Required treatment components
- Scoring criteria

Format as JSON:
{
  "cases": [
    {
      "id": "tsr_001", 
      "diagnosis": "Acute lower back pain",
      "patientProfile": "32-year-old office worker, sedentary lifestyle, recent lifting injury",
      "timeLimit": 300,
      "requiredComponents": ["Pain management", "Movement education", "Exercise prescription", "Ergonomic advice"],
      "scoringCriteria": ["Evidence-based interventions", "Safety considerations", "Patient education", "Progressive loading"]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate Progressive Diagnostic Challenge content
   */
  async generateProgressiveDiagnosticChallenge(request: GameContentRequest) {
    const prompt = `Create 3 progressive diagnostic challenge cases for ${request.bodyPart || 'general'} physiotherapy.

Each case should be a detective-style diagnostic challenge where players must work strategically to uncover the diagnosis:

- Start with minimal information (age, gender, basic complaint)
- Provide 15-20 strategic questions that cost "credits" to ask
- Include 10-15 assessment tests with varying costs, time requirements, and accuracy
- Have realistic time evolution where condition may worsen if key questions aren't asked
- Include red flags that emerge through targeted questioning
- Correct diagnosis should require strategic thinking, not just pattern matching
- ${request.difficulty || 'intermediate'} difficulty level

Format as JSON:
{
  "cases": [
    {
      "id": "pdc_001",
      "initialPresentation": "45-year-old reports shoulder pain",
      "patientAge": 45,
      "patientGender": "female",
      "availableQuestions": [
        {
          "id": "q1",
          "question": "When did the pain start?",
          "cost": 1,
          "category": "history",
          "answer": "Gradual onset over 6 months, worsening recently",
          "revealsRedFlag": false
        },
        {
          "id": "q2", 
          "question": "Does pain wake you at night?",
          "cost": 1,
          "category": "symptoms",
          "answer": "Yes, consistently wakes patient around 3 AM",
          "revealsRedFlag": true
        }
      ],
      "availableTests": [
        {
          "id": "t1",
          "testName": "Impingement test",
          "cost": 2,
          "timeRequired": 2,
          "category": "orthopedic",
          "result": "Negative - no pain with impingement maneuvers",
          "accuracy": 85,
          "contraindications": []
        },
        {
          "id": "t2",
          "testName": "X-ray shoulder",
          "cost": 5,
          "timeRequired": 15,
          "category": "imaging", 
          "result": "Lytic lesion visible in humeral head",
          "accuracy": 95,
          "contraindications": ["pregnancy"]
        }
      ],
      "correctDiagnosis": "Metastatic bone disease",
      "differentialDiagnoses": ["Rotator cuff tear", "Frozen shoulder", "Impingement syndrome"],
      "redFlags": ["Night pain", "Progressive worsening", "Age >40", "Unexplained weight loss"],
      "timeEvolution": [
        {
          "timePoint": 10,
          "newSymptoms": ["Patient mentions fatigue, 10lb weight loss"],
          "changingVitals": {},
          "complications": []
        }
      ],
      "scoringWeights": {
        "efficiency": 25,
        "thoroughness": 25,
        "safety": 30,
        "accuracy": 20
      },
      "maxQuestionCredits": 12,
      "maxTestCredits": 15,
      "timeLimit": 20
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate Choose Your Adventure content
   */
  async generateChooseYourAdventure(request: GameContentRequest) {
    const prompt = `Create a "Choose Your Own Adventure" clinical storyline for ${request.bodyPart || 'general'} physiotherapy.

Create 8-10 interconnected scenes with branching paths:
- Opening scene with patient presentation
- Assessment choices leading to different outcomes
- Treatment decision branches
- Multiple possible endings based on choices
- Point values for each choice (good choices = higher points)

Format as JSON:
{
  "storyline": [
    {
      "id": "scene_001",
      "scene": "A 28-year-old runner presents with knee pain...",
      "choices": [
        {
          "text": "Perform immediate special tests",
          "nextScene": "scene_002a",
          "consequences": "Patient becomes anxious about aggressive testing",
          "points": 2
        },
        {
          "text": "Take detailed history first", 
          "nextScene": "scene_002b",
          "consequences": "Patient feels heard and relaxed",
          "points": 5
        }
      ],
      "isEnding": false
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate Emergency Room Simulator content
   */
  async generateEmergencyRoomSimulator(request: GameContentRequest) {
    const prompt = `Create a comprehensive emergency triage scenario with 10 patients arriving simultaneously, requiring critical decision-making and prioritization.

Create realistic, diverse clinical presentations covering:
- Life-threatening conditions (Priority 1 - Immediate)
- Urgent conditions (Priority 2 - Urgent) 
- Semi-urgent conditions (Priority 3 - Semi-urgent)
- Non-urgent conditions (Priority 4 - Non-urgent)

Each patient should have:
- Age and brief clinical presentation
- Key symptoms/findings
- Vital signs (if relevant)
- Mechanism of injury/onset
- Current stability status

Format as JSON:
{
  "emergencySimulator": {
    "cases": [
      {
        "id": 1,
        "presentation": "Mass casualty scenario with 10 patients arriving simultaneously at emergency department",
        "patients": [
          {
            "age": 45,
            "condition": "Unconscious after head trauma, GCS 6, irregular breathing",
            "vitalSigns": "BP: 180/100, HR: 55, RR: irregular",
            "mechanism": "Motor vehicle accident, head impact",
            "priority": 1,
            "reasoning": "Life-threatening traumatic brain injury with signs of increased intracranial pressure"
          },
          {
            "age": 8,
            "condition": "Severe respiratory distress, wheezing, cyanotic",
            "vitalSigns": "BP: 90/60, HR: 150, RR: 40, SpO2: 85%",
            "mechanism": "Severe asthma exacerbation",
            "priority": 1,
            "reasoning": "Pediatric respiratory failure requiring immediate intervention"
          },
          {
            "age": 32,
            "condition": "Crush injury to chest, difficulty breathing, coughing blood",
            "vitalSigns": "BP: 85/50, HR: 120, RR: 28",
            "mechanism": "Trapped under vehicle",
            "priority": 1,
            "reasoning": "Potential pneumothorax/hemothorax with hemodynamic compromise"
          },
          {
            "age": 67,
            "condition": "Severe chest pain, diaphoretic, nauseous",
            "vitalSigns": "BP: 90/60, HR: 110, irregular",
            "mechanism": "Acute onset during activity",
            "priority": 2,
            "reasoning": "Acute myocardial infarction with cardiogenic shock"
          },
          {
            "age": 28,
            "condition": "Penetrating abdominal wound, conscious but pale",
            "vitalSigns": "BP: 100/70, HR: 110, RR: 24",
            "mechanism": "Stab wound to abdomen",
            "priority": 2,
            "reasoning": "Potential internal bleeding requiring urgent surgical evaluation"
          },
          {
            "age": 55,
            "condition": "Fractured femur, severe pain, unable to move leg",
            "vitalSigns": "BP: 120/80, HR: 100, RR: 20",
            "mechanism": "Fall from ladder",
            "priority": 2,
            "reasoning": "Risk of fat embolism and blood loss from femoral fracture"
          },
          {
            "age": 19,
            "condition": "Dislocated shoulder, significant pain",
            "vitalSigns": "BP: 130/85, HR: 90, RR: 18",
            "mechanism": "Sports injury during football",
            "priority": 3,
            "reasoning": "Painful but stable orthopedic injury"
          },
          {
            "age": 42,
            "condition": "Severe lower back pain, cannot walk",
            "vitalSigns": "BP: 140/90, HR: 85, RR: 16",
            "mechanism": "Lifting heavy object",
            "priority": 3,
            "reasoning": "Acute back injury requiring pain management and assessment"
          },
          {
            "age": 35,
            "condition": "Ankle fracture, swollen and deformed",
            "vitalSigns": "BP: 125/75, HR: 80, RR: 16",
            "mechanism": "Fall down stairs",
            "priority": 3,
            "reasoning": "Closed fracture requiring orthopedic management"
          },
          {
            "age": 24,
            "condition": "Sprained wrist, mild swelling",
            "vitalSigns": "Normal",
            "mechanism": "Trip and fall on outstretched hand",
            "priority": 4,
            "reasoning": "Minor injury suitable for delayed treatment"
          }
        ],
        "resources": {
          "emergencyBays": 3,
          "staff": "2 doctors, 3 nurses",
          "equipment": ["Ventilator", "Defibrillator", "X-ray", "CT scanner", "Ultrasound"]
        },
        "timeConstraint": "All patients arrived within 5 minutes",
        "expectedPrioritization": "Priority 1: Patients 1,2,3 → Priority 2: Patients 4,5,6 → Priority 3: Patients 7,8,9 → Priority 4: Patient 10"
      }
    ]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate Red Flag Detective content
   */
  async generateRedFlagDetective(request: GameContentRequest) {
    const prompt = `Create 4 red flag detective cases for ${request.bodyPart || 'general'} physiotherapy.

Each case should:
- Present as routine complaint initially
- Contain hidden serious pathology warning signs
- Include distractors and normal findings
- Have different severity levels
- Time pressure to identify red flags

Format as JSON:
{
  "cases": [
    {
      "id": "rf_001",
      "patientStory": "55-year-old presents with 'usual' back pain, worse at night, not relieved by rest",
      "hiddenRedFlags": ["Night pain", "Constant pain", "Age >50", "Weight loss mentioned casually"],
      "distractors": ["Previous back pain episodes", "Stress at work", "Poor posture"],
      "severity": "high",
      "timeToIdentify": 120
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate Differential Diagnosis Duel content
   */
  async generateDifferentialDiagnosisDuel(request: GameContentRequest) {
    const prompt = `Create 5 differential diagnosis duel rounds for ${request.bodyPart || 'general'} physiotherapy.

Each round includes:
- Complex case presentation
- 3-5 correct differential diagnoses
- Common diagnostic mistakes/traps
- Point values for each correct differential
- Time limit per round

Format as JSON:
{
  "rounds": [
    {
      "casePresentation": "25-year-old dancer with insidious onset anterior knee pain, worse with stairs and prolonged sitting",
      "correctDifferentials": ["Patellofemoral pain syndrome", "Patellar tendinopathy", "ITB friction syndrome", "Plica syndrome"],
      "commonMistakes": ["Meniscal tear", "ACL injury", "Osteoarthritis"],
      "pointsPerCorrect": 10,
      "timeLimit": 90
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate Journal Club Race content
   */
  async generateJournalClubRace(request: GameContentRequest) {
    const prompt = `Create 3 research paper scenarios for journal club race competition in ${request.bodyPart || 'general'} physiotherapy.

Include:
- Realistic paper abstracts
- Study methodology details
- Key results
- Critical appraisal questions
- Evidence interpretation challenges

Format as JSON:
{
  "papers": [
    {
      "id": "jcr_001",
      "title": "Effectiveness of Manual Therapy vs Exercise for Chronic Neck Pain: A Randomized Controlled Trial",
      "abstract": "Background: Chronic neck pain affects 15% of population...",
      "methodology": "RCT with 120 participants, comparing manual therapy to supervised exercise...",
      "results": "Significant improvement in pain scores for manual therapy group (p<0.05)...",
      "questions": [
        {
          "question": "What is the primary limitation of this study design?",
          "options": ["Small sample size", "Lack of blinding", "Short follow-up", "Selection bias"],
          "correctAnswer": 1,
          "explanation": "Participants and therapists cannot be blinded in manual therapy studies"
        }
      ]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate CPG Quiz Master content
   */
  async generateCpgQuizMaster(request: GameContentRequest) {
    const prompt = `Create clinical practice guideline questions for ${request.bodyPart || 'general'} physiotherapy.

Include questions from major organizations:
- Recent guideline recommendations
- Evidence levels (A, B, C)
- Strength of recommendations
- Practical application scenarios

Format as JSON:
{
  "guidelines": [
    {
      "organization": "American Physical Therapy Association",
      "topic": "Low Back Pain Clinical Practice Guidelines",
      "questions": [
        {
          "question": "According to APTA guidelines, what is the recommended first-line treatment for acute low back pain?",
          "options": ["Bed rest", "Active movement and exercise", "Manual therapy only", "Anti-inflammatory medication"],
          "correctAnswer": 1,
          "evidenceLevel": "Grade A",
          "guidanceStrength": "Strong recommendation"
        }
      ]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate Mystery Patient content
   */
  async generateMysteryPatient(request: GameContentRequest) {
    const prompt = `Create a mystery patient scenario for ${request.bodyPart || 'general'} physiotherapy.

Progressive clue reveal system:
- 8-10 clues revealed gradually
- Different clue types (history, exam, tests, observations)
- Varying significance levels
- Final diagnosis with explanation
- Key clues that lead to solution

Format as JSON:
{
  "clues": [
    {
      "stage": 1,
      "clueType": "history",
      "content": "62-year-old retired teacher reports shoulder pain for 3 months",
      "significance": "low"
    },
    {
      "stage": 2,
      "clueType": "examination", 
      "content": "Positive Hawkins test, weak external rotation",
      "significance": "medium"
    }
  ],
  "solution": {
    "diagnosis": "Rotator cuff tear with secondary impingement",
    "explanation": "Combination of age, chronic duration, positive impingement signs, and weakness indicates degenerative rotator cuff pathology",
    "keyClues": ["Age >60", "Chronic duration", "Weak external rotation", "Positive Hawkins test"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate Manual Therapy Mastery content
   */
  async generateManualTherapyMastery(request: GameContentRequest) {
    const prompt = `Generate elite manual therapy challenges for ${request.bodyPart || 'general'} conditions.

Create 5 advanced manual therapy scenarios covering:
- Complex patient presentations requiring manual therapy expertise
- Technique selection and modification decisions
- Contraindication identification
- Treatment progression strategies
- Outcome assessment

Format as JSON:
{
  "challenges": [
    {
      "id": "mt_001",
      "scenario": "65-year-old with chronic cervical pain, history of disc herniation C5-6, reports increased pain with rotation",
      "presentation": {
        "symptoms": "Deep aching neck pain, occasional arm tingling",
        "examination": "Limited cervical rotation 30°, positive Spurling's test",
        "imaging": "MRI shows mild disc protrusion C5-6",
        "redFlags": "None identified"
      },
      "challenge": "Select appropriate manual therapy techniques",
      "options": [
        {
          "technique": "High velocity thrust manipulation to C5-6",
          "rationale": "Direct targeting of restricted segment",
          "safety": "contraindicated",
          "points": 0,
          "feedback": "Contraindicated due to disc pathology and positive neural signs"
        },
        {
          "technique": "Gentle mobilization grades I-II to adjacent segments",
          "rationale": "Reduce protective muscle guarding and improve regional mobility",
          "safety": "appropriate",
          "points": 8,
          "feedback": "Excellent choice - addresses regional restrictions while respecting tissue pathology"
        },
        {
          "technique": "Soft tissue techniques to suboccipital muscles",
          "rationale": "Release muscle tension contributing to symptoms",
          "safety": "appropriate",
          "points": 6,
          "feedback": "Good supportive technique but not addressing primary movement restriction"
        }
      ],
      "learningPoints": [
        "Disc pathology with neural signs is contraindication for thrust techniques",
        "Graded mobilization approach respects tissue healing",
        "Regional treatment may be more appropriate than local"
      ],
      "timeLimit": 180,
      "difficulty": "advanced"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate Exercise Prescription Expert content
   */
  async generateExercisePrescriptionExpert(request: GameContentRequest) {
    const prompt = `Generate advanced exercise prescription challenges for ${request.bodyPart || 'general'} rehabilitation.

Create 5 complex exercise prescription scenarios requiring:
- Evidence-based exercise selection
- Load progression strategies
- Exercise modification for specific populations
- Outcome prediction and monitoring
- Integration with manual therapy

Format as JSON:
{
  "challenges": [
    {
      "id": "ep_001",
      "patientProfile": {
        "age": 42,
        "gender": "female",
        "occupation": "desk worker",
        "condition": "Chronic low back pain with hip weakness",
        "history": "18 months duration, previous physiotherapy with limited success",
        "currentFunction": "Struggles with prolonged sitting, difficulty with stairs"
      },
      "assessmentFindings": {
        "movement": "Hip hike during single leg stance, lumbar flexion pattern in squatting",
        "strength": "Hip abductors 3/5, deep abdominals poor recruitment",
        "endurance": "Cannot hold plank >30 seconds",
        "pain": "4/10 constant, increases to 7/10 with prolonged sitting"
      },
      "challenge": "Design 6-week progressive exercise program",
      "options": [
        {
          "program": "High-intensity strengthening focus",
          "exercises": ["Weighted squats", "Deadlifts", "Planks to fatigue"],
          "rationale": "Build strength quickly",
          "appropriateness": "inappropriate",
          "points": 2,
          "feedback": "Too aggressive for chronic pain - likely to increase symptoms and reduce compliance"
        },
        {
          "program": "Motor control and graded strengthening",
          "exercises": ["Dead bug progression", "Clamshells", "Modified squats", "Functional movements"],
          "rationale": "Address movement patterns before loading, build confidence",
          "appropriateness": "excellent",
          "points": 10,
          "feedback": "Evidence-based approach addressing motor control deficits and graded exposure"
        },
        {
          "program": "Stretching and mobility only",
          "exercises": ["Hip flexor stretches", "Spinal rotation", "General mobility"],
          "rationale": "Improve flexibility first",
          "appropriateness": "insufficient",
          "points": 4,
          "feedback": "Passive approach unlikely to address strength deficits and motor patterns"
        }
      ],
      "progressionMarkers": [
        "Week 1-2: Perfect form with bodyweight",
        "Week 3-4: Add light resistance/longer holds",
        "Week 5-6: Functional integration and load challenges"
      ],
      "outcomesMeasures": ["Pain VAS", "Oswestry Disability Index", "Single leg stance time", "Work productivity"],
      "timeLimit": 300,
      "difficulty": "advanced"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Main method to generate content based on game type
   */
  async generateGameContent(request: GameContentRequest): Promise<any> {
    switch (request.gameType) {
      case 'lightning_diagnosis':
        return await this.generateLightningDiagnosis(request);
      case 'treatment_speed_run':
        return await this.generateTreatmentSpeedRun(request);
      case 'progressive_diagnostic_challenge':
        return await this.generateProgressiveDiagnosticChallenge(request);
      case 'choose_your_adventure':
        return await this.generateChooseYourAdventure(request);
      case 'emergency_room_simulator':
        return await this.generateEmergencyRoomSimulator(request);
      case 'red_flag_detective':
        return await this.generateRedFlagDetective(request);
      case 'differential_diagnosis_duel':
        return await this.generateDifferentialDiagnosisDuel(request);
      case 'journal_club_race':
        return await this.generateJournalClubRace(request);
      case 'cpg_quiz_master':
        return await this.generateCpgQuizMaster(request);
      case 'mystery_patient':
        return await this.generateMysteryPatient(request);
      case 'manual_therapy_mastery':
        return await this.generateManualTherapyMastery(request);
      case 'exercise_prescription_expert':
        return await this.generateExercisePrescriptionExpert(request);
      default:
        throw new Error(`Unsupported game type: ${request.gameType}`);
    }
  }
}

export const gameContentGenerator = new GameContentGenerator();