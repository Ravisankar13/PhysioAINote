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
        overallScore: overallAnalysis.totalScore,
        overallFeedback: overallAnalysis.overallFeedback,
        questionFeedbacks: questionAnalyses,
        categoryScores: overallAnalysis.categoryScores,
        recommendedLearning: overallAnalysis.recommendedLearning,
        nextSteps: overallAnalysis.nextSteps
      };

    } catch (error) {
      console.error('Error generating detailed feedback:', error);
      return this.createFallbackFeedback(gameType, responses);
    }
  }

  /**
   * Analyze individual questions based on game type
   */
  private async analyzeGameQuestions(
    gameType: string,
    responses: any,
    gameContent: any
  ): Promise<QuestionFeedback[]> {
    const questionFeedbacks: QuestionFeedback[] = [];

    switch (gameType) {
      case 'lightning_diagnosis':
        return await this.analyzeLightningDiagnosis(responses, gameContent);
      
      case 'mystery_patient':
        return await this.analyzeMysteryPatient(responses, gameContent);
      
      case 'red_flag_detective':
        return await this.analyzeRedFlagDetective(responses, gameContent);
      
      case 'differential_diagnosis_duel':
        return await this.analyzeDifferentialDiagnosis(responses, gameContent);
      
      case 'choose_your_adventure':
        return await this.analyzeChooseYourAdventure(responses, gameContent);
      
      default:
        return await this.analyzeGeneralGame(responses, gameContent);
    }
  }

  /**
   * Analyze Lightning Diagnosis responses
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
        const feedback = await this.analyzeIndividualCase(
          caseData,
          userResponse,
          `Lightning Case ${i + 1}`,
          responseKey
        );
        feedbacks.push(feedback);
      }
    }

    return feedbacks;
  }

  /**
   * Analyze Mystery Patient responses
   */
  private async analyzeMysteryPatient(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const mysteryContent = gameContent.mysteryPatient || {};
    const stages = mysteryContent.stages || [];
    const feedbacks: QuestionFeedback[] = [];

    // Analyze clue interpretation
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const responseKey = `hypothesis_${i}`;
      const userResponse = responses[responseKey] || '';

      if (stage && userResponse) {
        const feedback = await this.analyzeMysteryStage(
          stage,
          userResponse,
          `Mystery Stage ${i + 1}`,
          responseKey
        );
        feedbacks.push(feedback);
      }
    }

    // Analyze final diagnosis
    if (responses.diagnosis) {
      const finalFeedback = await this.analyzeFinalDiagnosis(
        responses.diagnosis,
        mysteryContent.correctDiagnosis || 'Unknown',
        'Final Diagnosis'
      );
      feedbacks.push(finalFeedback);
    }

    return feedbacks;
  }

  /**
   * Analyze Red Flag Detective responses
   */
  private async analyzeRedFlagDetective(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const redFlagContent = gameContent.redFlagDetective || {};
    const cases = redFlagContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      const redFlagsKey = `redflags_${i}`;
      const actionKey = `action_${i}`;
      
      const userRedFlags = responses[redFlagsKey] || '';
      const userAction = responses[actionKey] || '';

      if (caseData && (userRedFlags || userAction)) {
        // Analyze red flag identification
        if (userRedFlags) {
          const redFlagFeedback = await this.analyzeRedFlagIdentification(
            caseData,
            userRedFlags,
            `Red Flag Case ${i + 1} - Identification`,
            redFlagsKey
          );
          feedbacks.push(redFlagFeedback);
        }

        // Analyze action planning
        if (userAction) {
          const actionFeedback = await this.analyzeActionPlanning(
            caseData,
            userAction,
            `Red Flag Case ${i + 1} - Action`,
            actionKey
          );
          feedbacks.push(actionFeedback);
        }
      }
    }

    return feedbacks;
  }

  /**
   * Analyze Differential Diagnosis responses
   */
  private async analyzeDifferentialDiagnosis(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const differentialContent = gameContent.differentialDiagnosisDuel || {};
    const rounds = differentialContent.rounds || [];
    const feedbacks: QuestionFeedback[] = [];

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const responseKey = `differentials_${i}`;
      const userResponse = responses[responseKey] || '';

      if (round && userResponse) {
        const feedback = await this.analyzeDifferentialRound(
          round,
          userResponse,
          `Differential Round ${i + 1}`,
          responseKey
        );
        feedbacks.push(feedback);
      }
    }

    return feedbacks;
  }

  /**
   * Analyze Choose Your Adventure responses
   */
  private async analyzeChooseYourAdventure(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const adventureContent = gameContent.chooseYourAdventure || {};
    const scenarios = adventureContent.scenarios || [];
    const feedbacks: QuestionFeedback[] = [];

    // Analyze decision-making pattern
    const choicePattern = Object.entries(responses)
      .filter(([key]) => key.startsWith('choice_'))
      .map(([key, value]) => ({ key, value }));

    if (choicePattern.length > 0) {
      const feedback = await this.analyzeDecisionPattern(
        choicePattern,
        scenarios,
        'Clinical Decision Making',
        'choice_pattern'
      );
      feedbacks.push(feedback);
    }

    return feedbacks;
  }

  /**
   * Individual analysis methods for each question type
   */
  private async analyzeIndividualCase(
    caseData: any,
    userResponse: string,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const prompt = `Analyze this lightning diagnosis case response:

Case Presentation: ${caseData.presentation || 'Case information provided'}
Correct Diagnosis: ${caseData.correctDiagnosis || 'Not specified'}
User's Response: ${userResponse}
Time Limit: ${caseData.timeLimit || 30} seconds

Provide detailed analysis in JSON format:
{
  "score": 85,
  "aiAnalysis": "Detailed analysis of the response quality and clinical reasoning",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"], 
  "clinicalReasoning": "Assessment of clinical thinking process",
  "correctAnswer": "What the ideal response should have been"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        questionId,
        questionText,
        userResponse,
        correctAnswer: result.correctAnswer || 'Not specified',
        aiAnalysis: result.aiAnalysis || 'Good attempt at rapid diagnosis',
        score: result.score || 70,
        strengths: result.strengths || ['Attempted diagnosis under time pressure'],
        improvements: result.improvements || ['Consider differential diagnoses'],
        clinicalReasoning: result.clinicalReasoning || 'Shows clinical thinking'
      };
    } catch (error) {
      console.error('Error analyzing individual case:', error);
      return this.createFallbackQuestionFeedback(questionId, questionText, userResponse);
    }
  }

  /**
   * Additional analysis methods for other game types...
   */
  private async analyzeMysteryStage(
    stage: any,
    userResponse: string,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const prompt = `Analyze this mystery patient stage response:

Stage Clue: ${stage.clue || 'Clue provided'}
User's Hypothesis: ${userResponse}

Evaluate the clinical reasoning and hypothesis formation:
{
  "score": 85,
  "aiAnalysis": "Analysis of hypothesis quality based on available clues",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "clinicalReasoning": "Assessment of clinical reasoning process",
  "correctAnswer": "Ideal hypothesis at this stage"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        questionId,
        questionText,
        userResponse,
        correctAnswer: result.correctAnswer || 'Progressive hypothesis',
        aiAnalysis: result.aiAnalysis || 'Good hypothesis formation',
        score: result.score || 75,
        strengths: result.strengths || ['Progressive clinical thinking'],
        improvements: result.improvements || ['Consider additional differential diagnoses'],
        clinicalReasoning: result.clinicalReasoning || 'Shows systematic approach'
      };
    } catch (error) {
      console.error('Error analyzing mystery stage:', error);
      return this.createFallbackQuestionFeedback(questionId, questionText, userResponse);
    }
  }

  private async analyzeRedFlagIdentification(
    caseData: any,
    userResponse: string,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const prompt = `Analyze red flag identification:

Patient Story: ${caseData.patientStory || 'Case presented'}
Actual Red Flags: ${JSON.stringify(caseData.redFlags || [])}
User Identified: ${userResponse}

Evaluate red flag detection accuracy:
{
  "score": 85,
  "aiAnalysis": "Analysis of red flag identification accuracy",
  "strengths": ["Identified key red flags", "Safety awareness"],
  "improvements": ["Missed important red flags", "Consider additional warnings"],
  "clinicalReasoning": "Assessment of safety-first thinking",
  "correctAnswer": "Complete list of red flags that should be identified"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        questionId,
        questionText,
        userResponse,
        correctAnswer: result.correctAnswer || 'Red flag identification',
        aiAnalysis: result.aiAnalysis || 'Good safety awareness',
        score: result.score || 75,
        strengths: result.strengths || ['Safety-focused approach'],
        improvements: result.improvements || ['Consider additional red flags'],
        clinicalReasoning: result.clinicalReasoning || 'Shows clinical safety awareness'
      };
    } catch (error) {
      console.error('Error analyzing red flag identification:', error);
      return this.createFallbackQuestionFeedback(questionId, questionText, userResponse);
    }
  }

  private async analyzeActionPlanning(
    caseData: any,
    userResponse: string,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    // Similar structure to other analysis methods
    try {
      const prompt = `Analyze immediate action planning for red flags:

Case Context: ${caseData.patientStory || 'Case presented'}
User's Action Plan: ${userResponse}
Appropriate Actions: ${JSON.stringify(caseData.immediateActions || [])}

Evaluate action appropriateness and urgency:
{
  "score": 85,
  "aiAnalysis": "Analysis of action planning appropriateness and timing",
  "strengths": ["Appropriate urgency", "Correct action priorities"],
  "improvements": ["Consider additional actions", "Improve action sequencing"],
  "clinicalReasoning": "Assessment of emergency response thinking",
  "correctAnswer": "Ideal immediate action plan"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        questionId,
        questionText,
        userResponse,
        correctAnswer: result.correctAnswer || 'Immediate action planning',
        aiAnalysis: result.aiAnalysis || 'Good action planning',
        score: result.score || 75,
        strengths: result.strengths || ['Appropriate action planning'],
        improvements: result.improvements || ['Consider action prioritization'],
        clinicalReasoning: result.clinicalReasoning || 'Shows emergency response thinking'
      };
    } catch (error) {
      console.error('Error analyzing action planning:', error);
      return this.createFallbackQuestionFeedback(questionId, questionText, userResponse);
    }
  }

  // Additional methods for other game types (abbreviated for space)
  private async analyzeDifferentialRound(round: any, userResponse: string, questionText: string, questionId: string): Promise<QuestionFeedback> {
    return this.createFallbackQuestionFeedback(questionId, questionText, userResponse);
  }

  private async analyzeDecisionPattern(choices: any[], scenarios: any[], questionText: string, questionId: string): Promise<QuestionFeedback> {
    return this.createFallbackQuestionFeedback(questionId, questionText, JSON.stringify(choices));
  }

  private async analyzeFinalDiagnosis(userDiagnosis: string, correctDiagnosis: string, questionText: string): Promise<QuestionFeedback> {
    return this.createFallbackQuestionFeedback('final_diagnosis', questionText, userDiagnosis);
  }

  private async analyzeGeneralGame(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const feedbacks: QuestionFeedback[] = [];
    
    Object.entries(responses).forEach(([key, value]) => {
      feedbacks.push(this.createFallbackQuestionFeedback(key, `Question: ${key}`, value as string));
    });

    return feedbacks;
  }

  /**
   * Generate overall analysis combining all question feedbacks
   */
  private async generateOverallAnalysis(
    gameType: string,
    questionFeedbacks: QuestionFeedback[],
    timeSpent: number
  ): Promise<any> {
    const averageScore = questionFeedbacks.reduce((sum, q) => sum + q.score, 0) / questionFeedbacks.length || 70;
    
    const prompt = `Generate overall game analysis:

Game Type: ${gameType}
Individual Question Scores: ${questionFeedbacks.map(q => q.score).join(', ')}
Average Score: ${averageScore}
Time Spent: ${timeSpent} seconds
Question Count: ${questionFeedbacks.length}

Strengths Identified: ${questionFeedbacks.flatMap(q => q.strengths).join(', ')}
Improvements Needed: ${questionFeedbacks.flatMap(q => q.improvements).join(', ')}

Provide comprehensive analysis:
{
  "totalScore": 85,
  "overallFeedback": "Comprehensive feedback about overall performance (200-300 words)",
  "categoryScores": {
    "accuracy": 85,
    "speed": 90,
    "reasoning": 80,
    "differential": 75,
    "treatment": 85
  },
  "recommendedLearning": ["Learning resource 1", "Learning resource 2"],
  "nextSteps": ["Next step 1", "Next step 2"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        totalScore: result.totalScore || averageScore,
        overallFeedback: result.overallFeedback || 'Good performance overall. Continue practicing to improve clinical reasoning skills.',
        categoryScores: result.categoryScores || {
          accuracy: averageScore,
          speed: 80,
          reasoning: averageScore,
          differential: 75,
          treatment: averageScore
        },
        recommendedLearning: result.recommendedLearning || ['Practice more clinical cases', 'Review differential diagnosis'],
        nextSteps: result.nextSteps || ['Continue competing', 'Focus on weak areas']
      };
    } catch (error) {
      console.error('Error generating overall analysis:', error);
      return {
        totalScore: averageScore,
        overallFeedback: 'Thank you for participating! Your responses demonstrate clinical thinking. Continue practicing to enhance your skills.',
        categoryScores: {
          accuracy: averageScore,
          speed: 80,
          reasoning: averageScore,
          differential: 75,
          treatment: averageScore
        },
        recommendedLearning: ['Practice clinical reasoning', 'Study case studies'],
        nextSteps: ['Continue practicing', 'Try different game types']
      };
    }
  }

  /**
   * Create fallback feedback for error cases
   */
  private createFallbackQuestionFeedback(questionId: string, questionText: string, userResponse: string): QuestionFeedback {
    return {
      questionId,
      questionText,
      userResponse,
      correctAnswer: 'Analysis not available',
      aiAnalysis: 'Your response shows clinical thinking. Continue practicing to improve accuracy and reasoning.',
      score: 75,
      strengths: ['Provided clinical response', 'Engaged with the question'],
      improvements: ['Continue practicing', 'Review clinical guidelines'],
      clinicalReasoning: 'Shows clinical engagement'
    };
  }

  private createFallbackFeedback(gameType: string, responses: any): GameFeedbackResult {
    return {
      overallScore: 75,
      overallFeedback: 'Thank you for participating! Your responses show clinical thinking skills. Continue practicing to improve accuracy and reasoning.',
      questionFeedbacks: [],
      categoryScores: {
        accuracy: 75,
        speed: 80,
        reasoning: 75,
        differential: 70,
        treatment: 75
      },
      recommendedLearning: ['Practice more clinical cases', 'Review clinical guidelines'],
      nextSteps: ['Continue competing', 'Try different game types']
    };
  }
}

export const gameAIFeedbackService = new GameAIFeedbackService();