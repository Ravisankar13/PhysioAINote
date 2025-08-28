import OpenAI from 'openai';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TreatmentQuestion {
  question: string;
  category: string;
  followUp?: boolean;
}

interface TreatmentPlanUpdate {
  phases?: any[];
  exercises?: any[];
  precautions?: string[];
  educationPoints?: string[];
  clinicalReasoning?: string;
  redFlags?: string[];
}

export class AITreatmentPlannerService {
  async generateInitialQuestions(diagnosis: string): Promise<TreatmentQuestion[]> {
    try {
      const prompt = `
        As an expert physiotherapist, generate a series of assessment questions for a patient with ${diagnosis}.
        The questions should gather essential information to create a personalized treatment plan.
        
        Return a JSON array of questions with the following structure:
        {
          "questions": [
            {
              "question": "specific question text",
              "category": "category (Demographics/History/Symptoms/Function/Medical/Goals)",
              "followUp": false
            }
          ]
        }
        
        Include questions about:
        - Patient demographics (age, gender)
        - Symptom duration and onset
        - Pain severity and characteristics
        - Functional limitations
        - Previous treatments
        - Occupation and activity level
        - Medical history
        - Patient goals
        - Aggravating and easing factors
        
        Limit to 10-12 essential questions.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist creating comprehensive treatment plans. Always return valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_completion_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.questions || [];
    } catch (error) {
      console.error('Error generating questions:', error);
      return this.getDefaultQuestions();
    }
  }

  async generateFollowUpQuestion(
    diagnosis: string,
    chatHistory: any[],
    currentAnswer: string
  ): Promise<TreatmentQuestion | null> {
    try {
      const prompt = `
        Based on the diagnosis "${diagnosis}" and the patient's answer: "${currentAnswer}"
        
        Previous conversation:
        ${chatHistory.map(m => `${m.type}: ${m.content}`).join('\n')}
        
        Should we ask a follow-up question? If yes, generate ONE specific follow-up question.
        
        Return JSON:
        {
          "needsFollowUp": true/false,
          "question": {
            "question": "follow-up question text",
            "category": "category",
            "followUp": true
          }
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist conducting a thorough assessment."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_completion_tokens: 300
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.needsFollowUp ? result.question : null;
    } catch (error) {
      console.error('Error generating follow-up question:', error);
      return null;
    }
  }

  async updateTreatmentPlan(
    diagnosis: string,
    currentPlan: any,
    patientProfile: any,
    newAnswer: string,
    questionContext: string
  ): Promise<TreatmentPlanUpdate> {
    try {
      const prompt = `
        Update the treatment plan for ${diagnosis} based on new information:
        
        Question context: ${questionContext}
        Patient's answer: ${newAnswer}
        
        Current patient profile:
        ${JSON.stringify(patientProfile, null, 2)}
        
        Current plan summary:
        - Phases: ${currentPlan.phases?.length || 3} phases
        - Duration: ${currentPlan.phases?.[0]?.duration || 'TBD'}
        
        Based on this new information, provide updates to the treatment plan.
        Consider:
        - Should phase durations be adjusted?
        - Are there specific precautions needed?
        - What exercises would be most appropriate?
        - Any red flags identified?
        - Clinical reasoning for modifications
        
        Return JSON with only the fields that need updating:
        {
          "phases": [updated phases if needed],
          "precautions": ["any new precautions"],
          "educationPoints": ["relevant education"],
          "clinicalReasoning": "explanation of changes",
          "redFlags": ["any identified red flags"],
          "exerciseModifications": {
            "add": ["exercise categories to add"],
            "remove": ["exercise categories to remove"],
            "modify": ["modifications needed"]
          }
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist updating treatment plans based on patient assessment. Focus on evidence-based practice."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_completion_tokens: 1500
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result;
    } catch (error) {
      console.error('Error updating treatment plan:', error);
      return {};
    }
  }

  async generateCompleteTreatmentPlan(
    diagnosis: string,
    patientProfile: any,
    exerciseDatabase: any[]
  ): Promise<any> {
    try {
      const prompt = `
        Create a comprehensive physiotherapy treatment plan for:
        Diagnosis: ${diagnosis}
        
        Patient Profile:
        ${JSON.stringify(patientProfile, null, 2)}
        
        Generate a detailed treatment plan including:
        1. Three progressive phases with specific timelines
        2. Clear goals for each phase
        3. Progression criteria
        4. Precautions and contraindications
        5. Education points
        6. Recommended outcome measures
        7. Clinical reasoning
        
        Available exercise categories: strengthening, stretching, mobility, neuromuscular, functional, stabilization, plyometric
        
        Return comprehensive JSON:
        {
          "phases": [
            {
              "name": "phase name",
              "duration": "specific timeline",
              "goals": ["specific goals"],
              "exerciseCategories": ["recommended categories"],
              "exerciseParameters": {
                "sets": "range",
                "reps": "range",
                "frequency": "per week"
              },
              "progressionCriteria": ["specific criteria"],
              "precautions": ["if any"]
            }
          ],
          "outcomeMeasures": ["specific measures"],
          "redFlags": ["if identified"],
          "educationPoints": ["key points"],
          "homeProgram": {
            "frequency": "daily/etc",
            "exercises": ["exercise types"]
          },
          "clinicalReasoning": "detailed explanation"
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist creating evidence-based treatment plans. Be specific and practical."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_completion_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Match exercises from database
      if (result.phases) {
        result.phases = result.phases.map((phase: any) => {
          const phaseExercises = this.selectExercisesForPhase(
            exerciseDatabase,
            phase.exerciseCategories || [],
            diagnosis
          );
          return {
            ...phase,
            exercises: phaseExercises
          };
        });
      }

      return result;
    } catch (error) {
      console.error('Error generating complete treatment plan:', error);
      throw error;
    }
  }

  private selectExercisesForPhase(
    exerciseDatabase: any[],
    categories: string[],
    diagnosis: string
  ): any[] {
    const diagnosisKeywords = diagnosis.toLowerCase().split(' ');
    
    let relevantExercises = exerciseDatabase.filter(exercise => {
      const matchesCategory = categories.some(cat => 
        exercise.category?.toLowerCase().includes(cat.toLowerCase())
      );
      const matchesDiagnosis = diagnosisKeywords.some(keyword =>
        exercise.name?.toLowerCase().includes(keyword) ||
        exercise.bodyPart?.toLowerCase().includes(keyword)
      );
      
      return matchesCategory || matchesDiagnosis;
    });

    // Limit to reasonable number per phase
    return relevantExercises.slice(0, 8);
  }

  private getDefaultQuestions(): TreatmentQuestion[] {
    return [
      {
        question: "What is the patient's age and gender?",
        category: "Demographics",
        followUp: false
      },
      {
        question: "How long has the patient been experiencing symptoms?",
        category: "History",
        followUp: false
      },
      {
        question: "On a scale of 0-10, what is the patient's average pain level?",
        category: "Symptoms",
        followUp: false
      },
      {
        question: "What is the patient's occupation and activity level?",
        category: "Function",
        followUp: false
      },
      {
        question: "What movements or activities make the symptoms worse?",
        category: "Symptoms",
        followUp: false
      },
      {
        question: "What provides relief or makes symptoms better?",
        category: "Symptoms",
        followUp: false
      },
      {
        question: "Has the patient tried any previous treatments?",
        category: "History",
        followUp: false
      },
      {
        question: "Are there any other medical conditions we should be aware of?",
        category: "Medical",
        followUp: false
      },
      {
        question: "What are the patient's main goals for therapy?",
        category: "Goals",
        followUp: false
      }
    ];
  }

  async analyzeAnswerForProfile(answer: string, questionContext: string): Promise<any> {
    try {
      const prompt = `
        Extract relevant patient information from this answer:
        Question: ${questionContext}
        Answer: ${answer}
        
        Extract and return JSON with any of these fields that can be determined:
        {
          "age": number or null,
          "gender": "male/female/other" or null,
          "occupation": string or null,
          "activityLevel": "sedentary/moderate/active/very active" or null,
          "symptomDuration": string or null,
          "painSeverity": number (0-10) or null,
          "previousTreatments": [array] or null,
          "comorbidities": [array] or null,
          "goals": [array] or null,
          "aggravatingFactors": [array] or null,
          "easingFactors": [array] or null,
          "sleepQuality": string or null,
          "medicationUse": [array] or null
        }
        
        Only include fields that can be clearly determined from the answer.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "Extract patient information accurately. Only include fields you're confident about."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_completion_tokens: 500
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      // Remove null values
      Object.keys(result).forEach(key => {
        if (result[key] === null) {
          delete result[key];
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error analyzing answer:', error);
      return {};
    }
  }
}

export default AITreatmentPlannerService;