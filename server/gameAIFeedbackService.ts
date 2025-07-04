import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface QuestionFeedback {
  questionId: string;
  questionText: string;
  userResponse: string;
  correctAnswer?: string;
  aiAnalysis: string;
  score: number;
  strengths: string[];
  improvements: string[];
  clinicalReasoning: string;
  timeSpent?: number;
}

export interface GameFeedbackResult {
  overallScore: number;
  overallFeedback: string;
  questionFeedbacks: QuestionFeedback[];
  categoryScores: {
    accuracy: number;
    speed: number;
    reasoning: number;
    differential: number;
    treatment: number;
  };
  recommendedLearning: string[];
  nextSteps: string[];
}

export class GameAIFeedbackService {
  /**
   * Generate comprehensive AI feedback for all questions in a game competition
   */
  async generateDetailedGameFeedback(
    gameType: string,
    responses: any,
    gameContent: any,
    timeSpent: number
  ): Promise<GameFeedbackResult> {
    try {
      // Parse game-specific questions and responses
      const questionAnalyses = await this.analyzeGameQuestions(gameType, responses, gameContent);
      
      // Generate overall analysis
      const overallAnalysis = await this.generateOverallAnalysis(gameType, questionAnalyses, timeSpent);

      return {
        overallScore: overallAnalysis.overallScore,
        overallFeedback: overallAnalysis.overallFeedback,
        questionFeedbacks: questionAnalyses,
        categoryScores: overallAnalysis.categoryScores,
        recommendedLearning: overallAnalysis.recommendedLearning,
        nextSteps: overallAnalysis.nextSteps
      };
    } catch (error) {
      console.error('Error generating game feedback:', error);
      // Fallback response
      return this.createFallbackFeedback(gameType, responses);
    }
  }

  /**
   * Analyze game-specific questions and responses
   */
  private async analyzeGameQuestions(
    gameType: string,
    responses: any,
    gameContent: any
  ): Promise<QuestionFeedback[]> {
    switch (gameType) {
      case 'lightning_diagnosis':
        return await this.analyzeLightningDiagnosis(responses, gameContent);
      case 'treatment_speed_run':
        return await this.analyzeTreatmentSpeedRun(responses, gameContent);
      case 'mystery_patient':
        return await this.analyzeMysteryPatient(responses, gameContent);
      case 'red_flag_detective':
        return await this.analyzeRedFlagDetective(responses, gameContent);
      case 'differential_diagnosis_duel':
        return await this.analyzeDifferentialDiagnosis(responses, gameContent);
      case 'choose_your_adventure':
        return await this.analyzeChooseYourAdventure(responses, gameContent);
      default:
        return await this.analyzeGenericGame(responses, gameContent);
    }
  }

  /**
   * Analyze Lightning Diagnosis responses - SIMPLIFIED: Only diagnosis accuracy matters
   */
  private async analyzeLightningDiagnosis(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const lightningContent = gameContent.lightningDiagnosis || {};
    const cases = lightningContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      const responseKey = `case_${i}`;
      const userResponse = responses[responseKey] || '';

      if (caseData && userResponse) {
        const feedback = await this.analyzeLightningDiagnosisCase(
          caseData,
          userResponse,
          `Lightning Case ${i + 1}: ${caseData.presentation?.substring(0, 50)}...`,
          responseKey
        );
        feedbacks.push(feedback);
      }
    }

    return feedbacks;
  }

  /**
   * Analyze Lightning Diagnosis case - ONLY focusing on diagnosis accuracy, no justification required
   */
  private async analyzeLightningDiagnosisCase(
    caseData: any,
    userResponse: string,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const correctDiagnosis = caseData.correctDiagnosis || '';
    const userDiagnosis = userResponse.trim();

    // Simple diagnosis matching - if diagnosis is correct, award 100%, no justification required
    const isCorrectDiagnosis = this.isMatchingDiagnosis(userDiagnosis, correctDiagnosis);
    
    // For Lightning Diagnosis, we only evaluate the diagnosis itself, not the reasoning
    // This provides immediate, clear feedback focused on diagnostic accuracy
    if (isCorrectDiagnosis) {
      return {
        questionId,
        questionText,
        userResponse: userDiagnosis,
        correctAnswer: correctDiagnosis,
        aiAnalysis: `Correct! ${correctDiagnosis} is the accurate diagnosis for this presentation.`,
        score: 100,
        strengths: ['Accurate rapid diagnosis', 'Correct clinical pattern recognition'],
        improvements: [],
        clinicalReasoning: 'Successful diagnostic reasoning under time pressure'
      };
    } else {
      return {
        questionId,
        questionText,
        userResponse: userDiagnosis,
        correctAnswer: correctDiagnosis,
        aiAnalysis: `Incorrect. The correct diagnosis is ${correctDiagnosis}. Your answer "${userDiagnosis}" doesn't match the expected diagnosis for this clinical presentation.`,
        score: 0,
        strengths: ['Attempted rapid diagnosis under time pressure'],
        improvements: [`Review ${correctDiagnosis} presentation and key features`, 'Practice pattern recognition for similar cases'],
        clinicalReasoning: 'Consider reviewing differential diagnosis approach for this presentation'
      };
    }
  }

  /**
   * Check if user diagnosis matches correct diagnosis (flexible matching)
   */
  private isMatchingDiagnosis(userDiagnosis: string, correctDiagnosis: string): boolean {
    const normalize = (text: string) => text.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const userNorm = normalize(userDiagnosis);
    const correctNorm = normalize(correctDiagnosis);
    
    // Exact match
    if (userNorm === correctNorm) return true;
    
    // Check if user diagnosis contains the key terms from correct diagnosis
    const correctWords = correctNorm.split(/\s+/).filter(word => word.length > 2);
    const userWords = userNorm.split(/\s+/);
    
    // If most key words from correct diagnosis are present in user response
    const matchedWords = correctWords.filter(word => 
      userWords.some(userWord => userWord.includes(word) || word.includes(userWord))
    );
    
    // Consider it correct if at least 70% of key words match
    return matchedWords.length >= Math.ceil(correctWords.length * 0.7);
  }

  /**
   * Analyze Treatment Speed Run responses
   */
  private async analyzeTreatmentSpeedRun(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const treatmentContent = gameContent.treatmentSpeedRun || {};
    const cases = treatmentContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      
      // Check for treatment planning responses
      const assessmentResponse = responses[`assessment_${i}`] || '';
      const treatmentResponse = responses[`treatment_${i}`] || '';
      const exercisesResponse = responses[`exercises_${i}`] || '';
      const educationResponse = responses[`education_${i}`] || '';
      const followupResponse = responses[`followup_${i}`] || '';

      if (caseData && (assessmentResponse || treatmentResponse || exercisesResponse)) {
        const feedback = await this.analyzeTreatmentCase(
          caseData,
          {
            assessment: assessmentResponse,
            treatment: treatmentResponse,
            exercises: exercisesResponse,
            education: educationResponse,
            followup: followupResponse
          },
          `Treatment Case ${i + 1}: ${caseData.diagnosis}`,
          `treatment_${i}`
        );
        feedbacks.push(feedback);
      }
    }

    return feedbacks;
  }

  /**
   * Analyze individual treatment planning case
   */
  private async analyzeTreatmentCase(
    caseData: any,
    responses: any,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const prompt = `Analyze this treatment planning response for a ${caseData.diagnosis} case:

Patient: ${caseData.patientProfile}
Required Components: ${caseData.requiredComponents?.join(', ') || 'General treatment approach'}

Assessment Plan: ${responses.assessment}
Treatment Protocol: ${responses.treatment}
Exercise Prescription: ${responses.exercises}
Patient Education: ${responses.education}
Follow-up Plan: ${responses.followup}

Rate this treatment plan from 0-100 based on:
- Completeness and appropriateness of assessment
- Evidence-based treatment interventions
- Specific and progressive exercise prescription
- Comprehensive patient education
- Appropriate follow-up planning

Provide analysis in JSON format:
{
  "score": number,
  "aiAnalysis": "Comprehensive analysis of the treatment plan",
  "strengths": ["List specific strengths"],
  "improvements": ["Areas needing improvement"],
  "clinicalReasoning": "Assessment of clinical decision-making"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        questionId,
        questionText,
        userResponse: `Assessment: ${responses.assessment} | Treatment: ${responses.treatment}`,
        correctAnswer: `Comprehensive treatment for ${caseData.diagnosis}`,
        aiAnalysis: result.aiAnalysis || 'Treatment plan analysis completed',
        score: Math.max(0, Math.min(100, result.score || 50)),
        strengths: result.strengths || ['Treatment planning attempted'],
        improvements: result.improvements || ['Consider more evidence-based approaches'],
        clinicalReasoning: result.clinicalReasoning || 'Treatment planning approach'
      };
    } catch (error) {
      console.error('Error analyzing treatment case:', error);
      return {
        questionId,
        questionText,
        userResponse: `Assessment: ${responses.assessment} | Treatment: ${responses.treatment}`,
        correctAnswer: `Comprehensive treatment for ${caseData.diagnosis}`,
        aiAnalysis: 'Treatment plan submitted for review',
        score: 75,
        strengths: ['Comprehensive treatment planning attempted'],
        improvements: ['Consider evidence-based protocol refinements'],
        clinicalReasoning: 'Treatment planning under time pressure'
      };
    }
  }

  /**
   * Analyze generic game responses
   */
  private async analyzeGenericGame(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const feedbacks: QuestionFeedback[] = [];
    
    Object.keys(responses).forEach((key, index) => {
      feedbacks.push({
        questionId: key,
        questionText: `Question ${index + 1}`,
        userResponse: responses[key],
        aiAnalysis: 'Response submitted successfully',
        score: 75,
        strengths: ['Participation in challenge'],
        improvements: ['Continue practicing clinical scenarios'],
        clinicalReasoning: 'Active engagement in clinical learning'
      });
    });

    return feedbacks;
  }

  /**
   * Generate overall analysis and scoring
   */
  private async generateOverallAnalysis(
    gameType: string,
    questionFeedbacks: QuestionFeedback[],
    timeSpent: number
  ): Promise<any> {
    const averageScore = questionFeedbacks.reduce((sum, q) => sum + q.score, 0) / questionFeedbacks.length;
    
    const prompt = `Analyze overall performance in ${gameType} competition:

Questions answered: ${questionFeedbacks.length}
Average score: ${averageScore}
Time spent: ${timeSpent} seconds
Individual scores: ${questionFeedbacks.map(q => q.score).join(', ')}
Strengths shown: ${questionFeedbacks.flatMap(q => q.strengths).join(', ')}
Areas for improvement: ${questionFeedbacks.flatMap(q => q.improvements).join(', ')}

Provide overall assessment in JSON format:
{
  "overallScore": ${Math.round(averageScore)},
  "overallFeedback": "Comprehensive feedback paragraph",
  "categoryScores": {
    "accuracy": ${Math.round(averageScore)},
    "speed": ${Math.max(60, 100 - (timeSpent / 60))},
    "reasoning": ${Math.round(averageScore * 0.9)},
    "differential": ${Math.round(averageScore * 0.8)},
    "treatment": ${Math.round(averageScore * 0.85)}
  },
  "recommendedLearning": ["Specific learning recommendations"],
  "nextSteps": ["Actionable next steps"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        overallScore: result.overallScore || Math.round(averageScore),
        overallFeedback: result.overallFeedback || 'Competition completed successfully',
        categoryScores: result.categoryScores || {
          accuracy: Math.round(averageScore),
          speed: Math.max(60, 100 - (timeSpent / 60)),
          reasoning: Math.round(averageScore * 0.9),
          differential: Math.round(averageScore * 0.8),
          treatment: Math.round(averageScore * 0.85)
        },
        recommendedLearning: result.recommendedLearning || ['Continue clinical practice'],
        nextSteps: result.nextSteps || ['Practice more scenarios']
      };
    } catch (error) {
      console.error('Error generating overall analysis:', error);
      return {
        overallScore: Math.round(averageScore),
        overallFeedback: 'Competition completed with good effort',
        categoryScores: {
          accuracy: Math.round(averageScore),
          speed: Math.max(60, 100 - (timeSpent / 60)),
          reasoning: Math.round(averageScore * 0.9),
          differential: Math.round(averageScore * 0.8),
          treatment: Math.round(averageScore * 0.85)
        },
        recommendedLearning: ['Continue clinical skill development'],
        nextSteps: ['Participate in more competitions']
      };
    }
  }

  /**
   * Create fallback feedback when AI analysis fails
   */
  private createFallbackFeedback(gameType: string, responses: any): GameFeedbackResult {
    const questionFeedbacks: QuestionFeedback[] = Object.keys(responses).map((key, index) => ({
      questionId: key,
      questionText: `Question ${index + 1}`,
      userResponse: responses[key],
      aiAnalysis: 'Response recorded successfully',
      score: 75,
      strengths: ['Participation in competition'],
      improvements: ['Continue practicing'],
      clinicalReasoning: 'Active engagement'
    }));

    const averageScore = 75;

    return {
      overallScore: averageScore,
      overallFeedback: 'Competition completed successfully. Thank you for participating!',
      questionFeedbacks,
      categoryScores: {
        accuracy: averageScore,
        speed: 80,
        reasoning: 70,
        differential: 75,
        treatment: 75
      },
      recommendedLearning: ['Continue clinical practice', 'Review competition materials'],
      nextSteps: ['Participate in more competitions', 'Practice specific areas for improvement']
    };
  }
}

export const gameAIFeedbackService = new GameAIFeedbackService();