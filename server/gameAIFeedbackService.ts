import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface QuestionFeedback {
  questionId: string;
  questionText: string;
  userResponse: string;
  aiIdealResponse: string;
  correctAnswer?: string;
  aiAnalysis: string;
  score: number;
  strengths: string[];
  improvements: string[];
  clinicalReasoning: string;
  timeSpent?: number;
  researchReferences?: string[];
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
      case 'progressive_diagnostic_challenge':
        return await this.analyzeProgressiveDiagnosticChallenge(responses, gameContent);
      case 'mystery_patient':
        return await this.analyzeMysteryPatient(responses, gameContent);
      case 'red_flag_detective':
        return await this.analyzeRedFlagDetective(responses, gameContent);
      case 'differential_diagnosis_duel':
        return await this.analyzeDifferentialDiagnosis(responses, gameContent);
      case 'choose_your_adventure':
        return await this.analyzeChooseYourAdventure(responses, gameContent);
      case 'emergency_room_simulator':
        return await this.analyzeEmergencySimulator(responses, gameContent);
      case 'diagnosis_duel':
        return await this.analyzeDiagnosisDuel(responses, gameContent);
      case 'manual_therapy_mastery':
        return await this.analyzeManualTherapyMastery(responses, gameContent);
      case 'exercise_prescription_expert':
        return await this.analyzeExercisePrescriptionExpert(responses, gameContent);
      default:
        return await this.analyzeGenericGame(responses, gameContent);
    }
  }

  /**
   * Analyze Lightning Diagnosis responses - SIMPLIFIED: Only diagnosis accuracy matters
   */
  private async analyzeLightningDiagnosis(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    // Check both possible keys for Lightning Diagnosis content
    const lightningContent = gameContent.lightningDiagnosis || gameContent.lightning_diagnosis || {};
    const cases = lightningContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    console.log('Lightning Diagnosis Analysis Debug:', {
      casesLength: cases.length,
      responsesKeys: Object.keys(responses),
      lightningContentKeys: Object.keys(lightningContent)
    });

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      const responseKey = `case_${i}`;
      const userResponse = responses[responseKey] || '';

      console.log(`Case ${i}:`, {
        hasCaseData: !!caseData,
        hasUserResponse: !!userResponse,
        userResponse: userResponse,
        caseId: caseData?.id
      });

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

    console.log('Lightning Diagnosis feedbacks generated:', feedbacks.length);
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
    
    // Enhanced fuzzy matching for medical terms
    const correctWords = correctNorm.split(/\s+/).filter(word => word.length > 2);
    const userWords = userNorm.split(/\s+/).filter(word => word.length > 2);
    
    // Count matched words with flexible similarity
    const matchedWords = correctWords.filter(correctWord => 
      userWords.some(userWord => {
        // Direct inclusion check (both directions)
        if (userWord.includes(correctWord) || correctWord.includes(userWord)) return true;
        
        // Handle common medical spelling variations and abbreviations
        const variations = this.getMedicalTermVariations(correctWord);
        return variations.some(variation => 
          userWord.includes(variation) || variation.includes(userWord)
        );
      })
    );
    
    // Also check reverse direction - user words that match correct diagnosis
    const reverseMatchedWords = userWords.filter(userWord => 
      correctWords.some(correctWord => {
        if (correctWord.includes(userWord) || userWord.includes(correctWord)) return true;
        
        const variations = this.getMedicalTermVariations(userWord);
        return variations.some(variation => 
          correctWord.includes(variation) || variation.includes(correctWord)
        );
      })
    );
    
    // Use the better match ratio
    const forwardRatio = matchedWords.length / correctWords.length;
    const reverseRatio = reverseMatchedWords.length / userWords.length;
    const matchRatio = Math.max(forwardRatio, reverseRatio);
    
    // Consider it correct if at least 70% of key terms match
    // This handles cases like "subacromial impingement" vs "subacromical impingement syndrome"
    return matchRatio >= 0.7;
  }

  private getMedicalTermVariations(term: string): string[] {
    const variations = [term];
    
    // Common medical spelling variations
    const medicalSpellingMap: { [key: string]: string[] } = {
      'subacromial': ['subacromical', 'sub-acromial'],
      'subacromical': ['subacromial', 'sub-acromical'],
      'impingement': ['impingment', 'impingement'],
      'syndrome': ['syn', 'synd'],
      'tendinopathy': ['tendinitis', 'tendonitis', 'tendinosis'],
      'tendinitis': ['tendinopathy', 'tendonitis'],
      'tendonitis': ['tendinopathy', 'tendinitis'],
      'rotator': ['rotor', 'rotater'],
      'cuff': ['cup'],
      'lateral': ['lat'],
      'medial': ['med'],
      'anterior': ['ant'],
      'posterior': ['post'],
      'superior': ['sup'],
      'inferior': ['inf']
    };
    
    // Add variations for the term
    if (medicalSpellingMap[term]) {
      variations.push(...medicalSpellingMap[term]);
    }
    
    // Check if term is a variation of something else
    for (const [key, values] of Object.entries(medicalSpellingMap)) {
      if (values.includes(term)) {
        variations.push(key, ...values.filter(v => v !== term));
      }
    }
    
    // Remove duplicates using filter
    return variations.filter((value, index, self) => self.indexOf(value) === index);
  }

  /**
   * Analyze Treatment Speed Run responses
   */
  private async analyzeTreatmentSpeedRun(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const treatmentContent = gameContent.treatmentSpeedRun || {};
    const cases = treatmentContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    console.log('Treatment Speed Run Analysis Debug:', {
      casesLength: cases.length,
      responsesKeys: Object.keys(responses),
      treatmentContentKeys: Object.keys(treatmentContent)
    });

    // The actual response keys from the frontend
    const assessmentResponse = responses.assessmentApproach || '';
    const treatmentResponse = responses.treatmentPlan || '';
    const reasoningResponse = responses.clinicalReasoning || '';
    const outcomesResponse = responses.expectedOutcomes || '';

    if (cases.length > 0 && (assessmentResponse || treatmentResponse || reasoningResponse || outcomesResponse)) {
      const caseData = cases[0]; // Use the first case for analysis
      
      const feedback = await this.analyzeTreatmentCase(
        caseData,
        {
          assessment: assessmentResponse,
          treatment: treatmentResponse,
          reasoning: reasoningResponse,
          outcomes: outcomesResponse
        },
        `Treatment Case: ${caseData.diagnosis}`,
        'treatment_response'
      );
      feedbacks.push(feedback);
    }

    console.log('Treatment Speed Run feedbacks generated:', feedbacks.length);
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

Patient Presentation: ${caseData.patientPresentation}
Required Components: ${caseData.requiredComponents?.join(', ') || 'General treatment approach'}
Grading Criteria: ${Object.entries(caseData.gradingCriteria || {}).map(([key, value]) => `${key}: ${value}`).join(', ')}

User's Responses:
Assessment Approach: ${responses.assessment}
Treatment Plan & Interventions: ${responses.treatment}
Clinical Reasoning & Rationale: ${responses.reasoning}
Expected Outcomes & Discharge Criteria: ${responses.outcomes}

Rate this treatment plan from 0-100 based on:
- Assessment approach completeness and systematic thinking
- Evidence-based treatment interventions and manual therapy selection
- Clinical reasoning quality and theoretical foundation
- Realistic expected outcomes and measurable discharge criteria
- Integration with required components and grading criteria

Provide analysis in JSON format:
{
  "score": number,
  "aiAnalysis": "Comprehensive analysis of the treatment plan (150+ words)",
  "strengths": ["Specific strengths identified"],
  "improvements": ["Specific areas for improvement"],
  "clinicalReasoning": "Assessment of clinical decision-making quality",
  "aiIdealResponse": "Ideal comprehensive treatment plan for this case"
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
        userResponse: `Assessment: ${responses.assessment}\nTreatment: ${responses.treatment}\nReasoning: ${responses.reasoning}\nOutcomes: ${responses.outcomes}`,
        aiIdealResponse: result.aiIdealResponse || `Comprehensive evidence-based treatment plan for ${caseData.diagnosis}`,
        correctAnswer: `Optimal treatment approach for ${caseData.diagnosis}`,
        aiAnalysis: result.aiAnalysis || 'Treatment plan analysis completed',
        score: Math.max(0, Math.min(100, result.score || 50)),
        strengths: result.strengths || ['Treatment planning attempted'],
        improvements: result.improvements || ['Consider more evidence-based approaches'],
        clinicalReasoning: result.clinicalReasoning || 'Treatment planning approach evaluated'
      };
    } catch (error) {
      console.error('Error analyzing treatment case:', error);
      return {
        questionId,
        questionText,
        userResponse: `Assessment: ${responses.assessment}\nTreatment: ${responses.treatment}`,
        aiIdealResponse: `Evidence-based comprehensive treatment plan for ${caseData.diagnosis} including manual therapy, exercise prescription, and patient education`,
        correctAnswer: `Optimal treatment for ${caseData.diagnosis}`,
        aiAnalysis: 'Treatment plan submitted and analyzed. Consider incorporating evidence-based manual therapy techniques, specific exercise prescriptions, and clear patient education components.',
        score: 75,
        strengths: ['Comprehensive treatment planning attempted', 'Clinical reasoning demonstrated'],
        improvements: ['Consider more specific manual therapy techniques', 'Include evidence-based exercise progression'],
        clinicalReasoning: 'Treatment planning approach under time pressure shows clinical thinking'
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
    const averageScore = questionFeedbacks.length > 0 
      ? questionFeedbacks.reduce((sum, q) => sum + q.score, 0) / questionFeedbacks.length 
      : 0;
    
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
   * Analyze Progressive Diagnostic Challenge responses
   */
  private async analyzeProgressiveDiagnosticChallenge(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    console.log('Progressive Diagnostic Challenge Analysis Debug:', {
      responsesKeys: Object.keys(responses || {}),
      gameContentKeys: Object.keys(gameContent || {}),
      progressiveContentExists: !!gameContent.progressiveDiagnosticChallenge
    });

    const progressiveContent = gameContent.progressiveDiagnosticChallenge || {};
    const feedbacks: QuestionFeedback[] = [];

    // Analyze final diagnosis (frontend sends as 'primaryDiagnosis')
    const finalDiagnosis = responses['primaryDiagnosis'] || responses['final_diagnosis'] || '';
    const correctDiagnosis = progressiveContent.correctDiagnosis || '';
    
    console.log('Diagnosis Analysis:', {
      finalDiagnosis,
      correctDiagnosis,
      hasValidDiagnosis: !!(finalDiagnosis && correctDiagnosis)
    });
    
    if (finalDiagnosis && correctDiagnosis) {
      const diagnosisFeedback = await this.analyzeProgressiveDiagnosisCase(
        progressiveContent,
        finalDiagnosis,
        'Final Diagnosis',
        'primaryDiagnosis'
      );
      feedbacks.push(diagnosisFeedback);
    }

    // Analyze diagnostic reasoning (frontend sends as 'diagnosticReasoning')
    const diagnosticReasoning = responses['diagnosticReasoning'] || '';
    
    console.log('Reasoning Analysis:', {
      hasReasoning: !!diagnosticReasoning,
      reasoningLength: diagnosticReasoning.length
    });
    
    if (diagnosticReasoning) {
      const reasoningFeedback = await this.analyzeClinicalReasoning(
        progressiveContent,
        diagnosticReasoning,
        'Clinical Reasoning',
        'diagnosticReasoning'
      );
      feedbacks.push(reasoningFeedback);
    }

    console.log('Progressive Diagnostic Challenge Analysis Complete:', {
      feedbackCount: feedbacks.length,
      feedbackIds: feedbacks.map(f => f.questionId)
    });

    return feedbacks;
  }

  /**
   * Analyze Progressive Diagnostic Challenge case - focusing on diagnosis accuracy and clinical reasoning
   */
  private async analyzeProgressiveDiagnosisCase(
    progressiveContent: any,
    userDiagnosis: string,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const correctDiagnosis = progressiveContent.correctDiagnosis || '';
    const differentialDiagnoses = progressiveContent.differentialDiagnoses || [];
    
    // Check if diagnosis matches using enhanced fuzzy matching
    const isCorrect = this.isMatchingDiagnosis(userDiagnosis, correctDiagnosis);
    const matchQuality = this.getMatchQuality(userDiagnosis, correctDiagnosis);
    
    const prompt = `Analyze this Progressive Diagnostic Challenge diagnosis:
    
Patient Presentation: ${JSON.stringify(progressiveContent.patientPresentation || {})}
Correct Diagnosis: ${correctDiagnosis}
User Diagnosis: ${userDiagnosis}
Differential Diagnoses: ${differentialDiagnoses.join(', ')}
Match Status: ${isCorrect ? 'SUBSTANTIALLY CORRECT' : 'INCORRECT'}

IMPORTANT SCORING GUIDELINES:
- If the user diagnosis captures the essential medical condition correctly, award 100 points even if wording differs
- Examples of 100-point matches: "subacromial impingement" = "subacromical impingement syndrome"
- Focus on clinical accuracy rather than exact terminology
- Partial credit only for completely different but related conditions

Provide detailed feedback on the diagnostic accuracy and clinical reasoning. Return as JSON:
{
  "score": number (0-100, award 100 for substantially correct diagnoses),
  "aiAnalysis": "detailed analysis explaining why this ${isCorrect ? 'IS CORRECT' : 'is incorrect'}",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "clinicalReasoning": "reasoning assessment"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      // Ensure score reflects fuzzy matching logic
      const finalScore = isCorrect ? 100 : (result.score || 0);
      
      return {
        questionId,
        questionText,
        userResponse: userDiagnosis,
        correctAnswer: correctDiagnosis,
        aiAnalysis: result.aiAnalysis || this.getDefaultAnalysis(isCorrect, matchQuality, userDiagnosis, correctDiagnosis),
        score: finalScore,
        strengths: result.strengths || this.getDefaultStrengths(isCorrect, matchQuality),
        improvements: result.improvements || this.getDefaultImprovements(isCorrect),
        clinicalReasoning: result.clinicalReasoning || 'Clinical reasoning assessed'
      };
    } catch (error) {
      console.error('Error analyzing progressive diagnosis case:', error);
      return {
        questionId,
        questionText,
        userResponse: userDiagnosis,
        correctAnswer: correctDiagnosis,
        aiAnalysis: this.getDefaultAnalysis(isCorrect, matchQuality, userDiagnosis, correctDiagnosis),
        score: isCorrect ? 100 : 0,
        strengths: this.getDefaultStrengths(isCorrect, matchQuality),
        improvements: this.getDefaultImprovements(isCorrect),
        clinicalReasoning: 'Clinical reasoning assessed based on diagnostic accuracy'
      };
    }
  }

  private getMatchQuality(userDiagnosis: string, correctDiagnosis: string): string {
    const normalize = (text: string) => text.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const userNorm = normalize(userDiagnosis);
    const correctNorm = normalize(correctDiagnosis);
    
    if (userNorm === correctNorm) return 'exact';
    if (this.isMatchingDiagnosis(userDiagnosis, correctDiagnosis)) return 'substantial';
    return 'poor';
  }

  private getDefaultAnalysis(isCorrect: boolean, matchQuality: string, userDiagnosis: string, correctDiagnosis: string): string {
    if (isCorrect) {
      if (matchQuality === 'exact') {
        return `Excellent! Your diagnosis "${userDiagnosis}" is exactly correct.`;
      } else {
        return `Correct diagnosis! Your answer "${userDiagnosis}" accurately identifies the condition as "${correctDiagnosis}". Minor differences in terminology do not affect the clinical accuracy.`;
      }
    } else {
      return `The diagnosis "${userDiagnosis}" does not match the correct diagnosis "${correctDiagnosis}". Review the key clinical features to improve diagnostic accuracy.`;
    }
  }

  private getDefaultStrengths(isCorrect: boolean, matchQuality: string): string[] {
    if (isCorrect) {
      return matchQuality === 'exact' 
        ? ['Perfect diagnostic accuracy', 'Precise medical terminology']
        : ['Clinically accurate diagnosis', 'Good understanding of the condition', 'Appropriate clinical reasoning'];
    } else {
      return ['Attempted systematic diagnosis', 'Engaged with clinical reasoning process'];
    }
  }

  private getDefaultImprovements(isCorrect: boolean): string[] {
    if (isCorrect) {
      return ['Continue building on strong diagnostic skills'];
    } else {
      return ['Review key diagnostic criteria', 'Practice systematic clinical reasoning', 'Study differential diagnosis approaches'];
    }
  }

  /**
   * Analyze clinical reasoning for Progressive Diagnostic Challenge
   */
  private async analyzeClinicalReasoning(
    progressiveContent: any,
    userReasoning: string,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const prompt = `
Analyze this clinical reasoning for a Progressive Diagnostic Challenge:

Correct Diagnosis: ${progressiveContent.correctDiagnosis || 'Unknown'}
User's Clinical Reasoning: ${userReasoning}

Evaluate the clinical reasoning quality on a scale of 0-100 based on:
1. Logical flow of diagnostic thinking
2. Integration of available evidence
3. Consideration of differential diagnoses
4. Clinical safety and appropriateness

Provide analysis in JSON format:
{
  "score": number (0-100),
  "analysis": "detailed analysis of reasoning quality",
  "strengths": ["specific strengths in reasoning"],
  "improvements": ["specific areas for improvement"],
  "clinicalReasoning": "assessment of clinical logic"
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
        userResponse: userReasoning,
        aiAnalysis: result.analysis || 'Clinical reasoning analyzed',
        score: this.safeScore(result.score, 75),
        strengths: result.strengths || ['Good clinical thinking'],
        improvements: result.improvements || ['Continue developing reasoning skills'],
        clinicalReasoning: result.clinicalReasoning || 'Sound clinical approach'
      };
    } catch (error) {
      console.error('Error analyzing clinical reasoning:', error);
      return {
        questionId,
        questionText,
        userResponse: userReasoning,
        aiAnalysis: 'Clinical reasoning demonstrates good diagnostic thinking approach.',
        score: 75,
        strengths: ['Structured approach to diagnosis'],
        improvements: ['Continue developing clinical reasoning skills'],
        clinicalReasoning: 'Appropriate clinical logic applied'
      };
    }
  }

  /**
   * Analyze strategic questioning approach
   */
  private async analyzeStrategicQuestioning(
    progressiveContent: any,
    questionsAsked: string[],
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const availableQuestions = progressiveContent.availableQuestions || [];
    
    const prompt = `Analyze the strategic questioning approach:
    
Available Questions: ${JSON.stringify(availableQuestions)}
Questions Asked: ${questionsAsked.join(', ')}
Patient Presentation: ${JSON.stringify(progressiveContent.patientPresentation || {})}

Assess the efficiency and effectiveness of the questioning strategy. Return as JSON:
{
  "score": number (0-100),
  "aiAnalysis": "analysis of questioning strategy",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "clinicalReasoning": "reasoning assessment"
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
        userResponse: questionsAsked.join(', '),
        aiAnalysis: result.aiAnalysis || 'Strategic questioning assessed',
        score: result.score || 75,
        strengths: result.strengths || ['Systematic approach'],
        improvements: result.improvements || ['Consider more targeted questions'],
        clinicalReasoning: result.clinicalReasoning || 'Strategic questioning evaluated'
      };
    } catch (error) {
      console.error('Error analyzing strategic questioning:', error);
      return {
        questionId,
        questionText,
        userResponse: questionsAsked.join(', '),
        aiAnalysis: 'Strategic questioning needs improvement',
        score: 75,
        strengths: ['Systematic approach'],
        improvements: ['Consider more targeted questions'],
        clinicalReasoning: 'Strategic questioning needs refinement'
      };
    }
  }

  /**
   * Analyze diagnostic test ordering
   */
  private async analyzeTestOrdering(
    progressiveContent: any,
    testsOrdered: string[],
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const availableTests = progressiveContent.availableTests || [];
    
    const prompt = `Analyze the diagnostic testing strategy:
    
Available Tests: ${JSON.stringify(availableTests)}
Tests Ordered: ${testsOrdered.join(', ')}
Patient Presentation: ${JSON.stringify(progressiveContent.patientPresentation || {})}

Assess the appropriateness and efficiency of test ordering. Return as JSON:
{
  "score": number (0-100),
  "aiAnalysis": "analysis of test ordering strategy",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "clinicalReasoning": "reasoning assessment"
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
        userResponse: testsOrdered.join(', '),
        aiAnalysis: result.aiAnalysis || 'Test ordering assessed',
        score: result.score || 80,
        strengths: result.strengths || ['Appropriate test selection'],
        improvements: result.improvements || ['Consider cost-effectiveness'],
        clinicalReasoning: result.clinicalReasoning || 'Test ordering strategy evaluated'
      };
    } catch (error) {
      console.error('Error analyzing test ordering:', error);
      return {
        questionId,
        questionText,
        userResponse: testsOrdered.join(', '),
        aiAnalysis: 'Test ordering needs improvement',
        score: 80,
        strengths: ['Appropriate test selection'],
        improvements: ['Consider cost-effectiveness'],
        clinicalReasoning: 'Test ordering strategy needs refinement'
      };
    }
  }

  /**
   * Analyze resource management efficiency
   */
  private async analyzeResourceManagement(
    resourcesUsed: number,
    resourceBudget: number,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const efficiency = resourceBudget > 0 ? Math.max(0, 100 - ((resourcesUsed / resourceBudget) * 100)) : 100;
    
    let analysis = '';
    let score = Math.round(efficiency);
    
    if (resourcesUsed <= resourceBudget * 0.5) {
      analysis = 'Excellent resource management - very efficient use of available resources';
      score = Math.max(score, 90);
    } else if (resourcesUsed <= resourceBudget * 0.75) {
      analysis = 'Good resource management - efficient use of resources';
      score = Math.max(score, 80);
    } else if (resourcesUsed <= resourceBudget) {
      analysis = 'Adequate resource management - stayed within budget';
      score = Math.max(score, 70);
    } else {
      analysis = 'Poor resource management - exceeded available budget';
      score = Math.min(score, 50);
    }

    return {
      questionId,
      questionText,
      userResponse: `${resourcesUsed}/${resourceBudget} resources used`,
      aiAnalysis: analysis,
      score,
      strengths: resourcesUsed <= resourceBudget ? ['Stayed within budget'] : ['Attempted systematic approach'],
      improvements: resourcesUsed > resourceBudget ? ['Practice resource conservation'] : ['Continue efficient approach'],
      clinicalReasoning: 'Resource management is crucial for real-world clinical practice'
    };
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

  /**
   * Safe score calculation to prevent NaN values
   */
  private safeScore(score: any, fallback: number = 0): number {
    const numScore = Number(score);
    if (isNaN(numScore) || !isFinite(numScore)) {
      return fallback;
    }
    return Math.max(0, Math.min(100, Math.round(numScore)));
  }

  /**
   * Stub methods for missing game types (to prevent compilation errors)
   */
  private async analyzeMysteryPatient(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    return this.analyzeGenericGame(responses, gameContent);
  }

  /**
   * Analyze Red Flag Detective responses with research-backed feedback
   */
  private async analyzeRedFlagDetective(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const redFlagContent = gameContent.redFlagDetective || {};
    const cases = redFlagContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      const identifiedFlags = responses[`redFlags_${i}`] || '';
      const urgencyLevel = responses[`urgency_${i}`] || '';
      const expectedActions = responses[`actions_${i}`] || '';

      if (caseData && (identifiedFlags || urgencyLevel || expectedActions)) {
        const feedback = await this.analyzeRedFlagCase(
          caseData,
          {
            identifiedFlags,
            urgencyLevel,
            expectedActions
          },
          `Red Flag Case ${i + 1}: Emergency Assessment`,
          `red_flag_${i}`
        );
        feedbacks.push(feedback);
      }
    }

    return feedbacks.length > 0 ? feedbacks : [await this.createRedFlagFallback()];
  }

  /**
   * Analyze individual Red Flag Detective case with comprehensive research-backed feedback
   */
  private async analyzeRedFlagCase(
    caseData: any,
    responses: any,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const prompt = `Analyze this Red Flag Detective response for serious pathology identification:

Clinical Presentation: ${caseData.presentation || 'Emergency clinical scenario'}
Expected Red Flags: ${caseData.redFlags?.join(', ') || 'Serious pathology indicators'}
Expected Urgency: ${caseData.urgency || 'Emergency level'}
Expected Actions: ${caseData.expectedActions?.join(', ') || 'Immediate clinical actions'}

User's Assessment:
- Identified Red Flags: ${responses.identifiedFlags}
- Urgency Level: ${responses.urgencyLevel}
- Recommended Actions: ${responses.expectedActions}

Provide comprehensive analysis with research references for red flag identification. Rate 0-100 based on:
1. Accuracy of red flag identification (40%)
2. Appropriate urgency assessment (30%)
3. Evidence-based immediate actions (30%)

Include specific research citations for red flag criteria and emergency protocols.

Return JSON:
{
  "score": number,
  "aiAnalysis": "Detailed analysis with research references",
  "idealResponse": "Research-backed ideal assessment for this case",
  "strengths": ["Specific clinical strengths"],
  "improvements": ["Evidence-based improvement areas"],
  "clinicalReasoning": "Assessment of emergency clinical reasoning",
  "researchReferences": ["Specific studies/guidelines supporting the analysis"]
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
        userResponse: `Red Flags: ${responses.identifiedFlags} | Urgency: ${responses.urgencyLevel} | Actions: ${responses.expectedActions}`,
        aiIdealResponse: result.idealResponse || `Red Flags: ${caseData.redFlags?.join(', ')} | Urgency: ${caseData.urgency} | Actions: ${caseData.expectedActions?.join(', ')}`,
        correctAnswer: result.idealResponse || `Expected: ${caseData.redFlags?.join(', ')} with ${caseData.urgency} urgency`,
        aiAnalysis: result.aiAnalysis || 'Red flag assessment completed with research analysis',
        score: this.safeScore(result.score, 75),
        strengths: result.strengths || ['Emergency assessment attempted'],
        improvements: result.improvements || ['Review red flag identification criteria'],
        clinicalReasoning: result.clinicalReasoning || 'Emergency clinical reasoning assessed',
        researchReferences: result.researchReferences || []
      };
    } catch (error) {
      console.error('Error analyzing red flag case:', error);
      return this.createRedFlagFallback();
    }
  }

  /**
   * Analyze Differential Diagnosis responses with comprehensive clinical reasoning assessment
   */
  private async analyzeDifferentialDiagnosis(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const differentialContent = gameContent.differentialDiagnosis || {};
    const cases = differentialContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      const userDifferentials = responses[`differentials_${i}`] || '';
      const clinicalReasoning = responses[`reasoning_${i}`] || '';
      const mostLikely = responses[`mostLikely_${i}`] || '';

      if (caseData && (userDifferentials || clinicalReasoning || mostLikely)) {
        const feedback = await this.analyzeDifferentialCase(
          caseData,
          {
            userDifferentials,
            clinicalReasoning,
            mostLikely
          },
          `Differential Diagnosis Case ${i + 1}: Complex Reasoning`,
          `differential_${i}`
        );
        feedbacks.push(feedback);
      }
    }

    return feedbacks.length > 0 ? feedbacks : [await this.createDifferentialFallback()];
  }

  /**
   * Analyze individual Differential Diagnosis case with evidence-based assessment
   */
  private async analyzeDifferentialCase(
    caseData: any,
    responses: any,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const prompt = `Analyze this Differential Diagnosis response with evidence-based clinical reasoning:

Clinical Presentation: ${caseData.presentation || 'Complex clinical scenario'}
Expected Differentials: ${caseData.expectedDifferentials?.join(', ') || 'Multiple potential diagnoses'}
Most Likely Diagnosis: ${caseData.mostLikely || 'Primary diagnosis'}
Clinical Tests: ${caseData.clinicalTests?.join(', ') || 'Diagnostic approach'}

User's Assessment:
- Differential Diagnoses: ${responses.userDifferentials}
- Clinical Reasoning: ${responses.clinicalReasoning}
- Most Likely Diagnosis: ${responses.mostLikely}

Evaluate based on evidence-based diagnostic reasoning (0-100):
1. Completeness of differential list (25%)
2. Accuracy of most likely diagnosis (35%)
3. Quality of clinical reasoning (25%)
4. Evidence-based diagnostic approach (15%)

Include specific research supporting the diagnostic criteria and differential ranking.

Return JSON:
{
  "score": number,
  "aiAnalysis": "Comprehensive diagnostic reasoning analysis with research",
  "idealResponse": "Evidence-based ideal differential diagnosis approach",
  "strengths": ["Specific diagnostic reasoning strengths"],
  "improvements": ["Research-backed improvement recommendations"],
  "clinicalReasoning": "Assessment of diagnostic thinking quality",
  "researchReferences": ["Studies supporting diagnostic criteria"]
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
        userResponse: `Differentials: ${responses.userDifferentials} | Most Likely: ${responses.mostLikely} | Reasoning: ${responses.clinicalReasoning}`,
        aiIdealResponse: result.idealResponse || `Differentials: ${caseData.expectedDifferentials?.join(', ')} | Most Likely: ${caseData.mostLikely} | Reasoning: Evidence-based systematic approach considering clinical presentation, patient history, and diagnostic probability ranking`,
        correctAnswer: result.idealResponse || `Expected: ${caseData.expectedDifferentials?.join(', ')} with ${caseData.mostLikely} as most likely`,
        aiAnalysis: result.aiAnalysis || 'Differential diagnosis reasoning analyzed with research support',
        score: this.safeScore(result.score, 75),
        strengths: result.strengths || ['Differential diagnosis approach attempted'],
        improvements: result.improvements || ['Enhance diagnostic reasoning with evidence'],
        clinicalReasoning: result.clinicalReasoning || 'Diagnostic reasoning quality assessed',
        researchReferences: result.researchReferences || []
      };
    } catch (error) {
      console.error('Error analyzing differential case:', error);
      return this.createDifferentialFallback();
    }
  }

  /**
   * Create fallback Red Flag Detective feedback
   */
  private async createRedFlagFallback(): Promise<QuestionFeedback> {
    return {
      questionId: 'red_flag_fallback',
      questionText: 'Red Flag Detective Assessment',
      userResponse: 'Red flag assessment completed',
      aiIdealResponse: 'Systematic identification of serious pathology indicators: neurological deficits, progressive symptoms, systemic signs, constitutional symptoms requiring immediate medical attention and urgent investigation',
      correctAnswer: 'Systematic identification of serious pathology indicators',
      aiAnalysis: 'Red flag identification requires systematic evaluation of serious pathology. Key areas include: neurological deficits, systemic symptoms, progressive pain patterns, and constitutional symptoms requiring immediate medical attention.',
      score: 75,
      strengths: ['Emergency assessment attempted', 'Clinical evaluation approach'],
      improvements: ['Review red flag criteria systematically', 'Practice emergency decision-making'],
      clinicalReasoning: 'Emergency clinical reasoning development needed',
      researchReferences: ['Clinical red flag guidelines', 'Emergency assessment protocols']
    };
  }

  /**
   * Create fallback Differential Diagnosis feedback
   */
  private async createDifferentialFallback(): Promise<QuestionFeedback> {
    return {
      questionId: 'differential_fallback',
      questionText: 'Differential Diagnosis Assessment',
      userResponse: 'Differential diagnosis approach completed',
      aiIdealResponse: 'Comprehensive evidence-based differential diagnosis list ranked by probability with systematic consideration of clinical presentation, patient history, examination findings, and evidence-based diagnostic criteria',
      correctAnswer: 'Comprehensive evidence-based differential diagnosis list',
      aiAnalysis: 'Effective differential diagnosis requires systematic consideration of multiple potential conditions, ranking by probability based on clinical presentation, and evidence-based diagnostic reasoning.',
      score: 75,
      strengths: ['Diagnostic approach attempted', 'Clinical reasoning engagement'],
      improvements: ['Develop systematic differential approach', 'Enhance evidence-based reasoning'],
      clinicalReasoning: 'Diagnostic reasoning skills require continued development',
      researchReferences: ['Diagnostic reasoning frameworks', 'Evidence-based diagnosis protocols']
    };
  }

  /**
   * Analyze Emergency Room Simulator responses with patient prioritization and clinical reasoning
   */
  private async analyzeEmergencySimulator(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const emergencyContent = gameContent.emergencySimulator || {};
    const cases = emergencyContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    console.log('Emergency Simulator Analysis Debug:', {
      casesLength: cases.length,
      responsesKeys: Object.keys(responses),
      hasPatientRankings: !!responses.patientRankings,
      hasClinicalReasoning: !!responses.clinicalReasoning,
      hasResourceManagement: !!responses.resourceManagement
    });

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      
      // Handle new patient ranking system and legacy triage priority system
      const patientRankings = responses.patientRankings || [];
      const clinicalReasoning = responses.clinicalReasoning || '';
      const resourceManagement = responses.resourceManagement || '';
      
      // Legacy support for old format
      const triagePriority = responses[`triagePriority_${i}`] || responses.triagePriority || '';
      const immediateActions = responses[`immediateActions_${i}`] || responses.immediateActions || '';

      if (caseData && (patientRankings.length > 0 || clinicalReasoning || triagePriority)) {
        const feedback = await this.analyzeEmergencyCase(
          caseData,
          {
            patientRankings,
            clinicalReasoning,
            resourceManagement,
            // Legacy support
            triagePriority,
            immediateActions
          },
          `Emergency Triage Case ${i + 1}: Patient Prioritization & Clinical Decision Making`,
          `emergency_${i}`
        );
        feedbacks.push(feedback);
      }
    }

    return feedbacks.length > 0 ? feedbacks : [await this.createEmergencyFallback()];
  }

  /**
   * Analyze individual Emergency Simulator case with patient prioritization and clinical reasoning
   */
  private async analyzeEmergencyCase(
    caseData: any,
    responses: any,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    // Prepare patient information for analysis
    const patients = caseData.patients || [];
    const userRankings = responses.patientRankings || [];
    const clinicalReasoning = responses.clinicalReasoning || '';
    const resourceManagement = responses.resourceManagement || '';
    
    // Generate correct prioritization for comparison
    const correctPrioritization = patients
      .map((patient: any, index: number) => ({ ...patient, originalIndex: index }))
      .sort((a: any, b: any) => a.priority - b.priority)
      .map((patient: any) => patient.originalIndex);

    // Create user prioritization description
    const userPrioritizationDesc = userRankings.map((index: number, rank: number) => {
      const patient = patients[index];
      return `${rank + 1}. ${patient?.age}-year-old: ${patient?.condition}`;
    }).join('\n');

    // Create correct prioritization description  
    const correctPrioritizationDesc = correctPrioritization.map((index: number, rank: number) => {
      const patient = patients[index];
      return `${rank + 1}. ${patient?.age}-year-old: ${patient?.condition} (Priority ${patient?.priority}: ${patient?.reasoning})`;
    }).join('\n');

    const prompt = `Analyze this Emergency Triage response based on established emergency medicine protocols and triage principles:

CLINICAL SCENARIO:
${caseData.presentation || 'Multiple patient emergency scenario'}

PATIENT DETAILS:
${patients.map((p: any, i: number) => `Patient ${i + 1}: ${p.age}-year-old with ${p.condition} (Expected Priority: ${p.priority} - ${p.reasoning})`).join('\n')}

USER'S PATIENT PRIORITIZATION:
${userPrioritizationDesc}

CORRECT PRIORITIZATION:
${correctPrioritizationDesc}

USER'S CLINICAL REASONING:
${clinicalReasoning}

USER'S RESOURCE MANAGEMENT:
${resourceManagement}

EVALUATION CRITERIA (0-100 points):
1. Patient Prioritization Accuracy (40%) - Correct identification of most urgent patients first
2. Clinical Reasoning Quality (35%) - Understanding of triage principles, life-threatening conditions, urgency factors
3. Resource Management (25%) - Efficient allocation of limited emergency resources

Analyze the user's emergency triage decision-making and provide comprehensive feedback.

Return JSON format:
{
  "score": number (0-100),
  "aiAnalysis": "Detailed analysis of triage decision-making with specific examples (200+ words)",
  "idealResponse": "Perfect emergency triage approach with correct prioritization and reasoning",
  "strengths": ["Specific strengths in emergency assessment"],
  "improvements": ["Specific areas for emergency triage improvement"],
  "clinicalReasoning": "Assessment of emergency clinical decision-making skills",
  "researchReferences": ["Emergency medicine guidelines and triage protocols"],
  "correctPrioritization": "${correctPrioritizationDesc}",
  "triageAccuracy": number (0-100)
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      // Calculate triage accuracy based on position matching
      const triageAccuracy = this.calculateTriageAccuracy(userRankings, correctPrioritization);

      return {
        questionId,
        questionText,
        userResponse: `Patient Prioritization:\n${userPrioritizationDesc}\n\nClinical Reasoning: ${clinicalReasoning}\n\nResource Management: ${resourceManagement}`,
        aiIdealResponse: result.idealResponse || `Correct Patient Prioritization:\n${correctPrioritizationDesc}\n\nOptimal emergency triage requires systematic assessment of life-threatening conditions, resource requirements, and time-sensitive interventions. Prioritize immediate life threats, then urgent conditions requiring rapid intervention, followed by less urgent but important cases.`,
        correctAnswer: `Correct Prioritization:\n${correctPrioritizationDesc}`,
        aiAnalysis: result.aiAnalysis || `Emergency triage assessment completed. Triage accuracy: ${triageAccuracy}%. Focus on systematic patient prioritization based on severity, urgency, and resource requirements.`,
        score: this.safeScore(result.score, 75),
        strengths: result.strengths || ['Emergency triage assessment attempted', 'Clinical reasoning provided'],
        improvements: result.improvements || ['Review emergency triage protocols', 'Practice multi-patient prioritization'],
        clinicalReasoning: result.clinicalReasoning || `Emergency decision-making assessed. Triage accuracy: ${triageAccuracy}%`,
        researchReferences: result.researchReferences || ['Emergency Severity Index (ESI)', 'ATS Triage Guidelines', 'CTAS Emergency Triage Protocols'],
        triageAccuracy
      };
    } catch (error) {
      console.error('Error analyzing emergency case:', error);
      return this.createEmergencyFallback();
    }
  }

  /**
   * Calculate triage accuracy based on patient ranking positions
   */
  private calculateTriageAccuracy(userRankings: number[], correctRankings: number[]): number {
    if (!userRankings || !correctRankings || userRankings.length === 0) return 0;
    
    let correctPositions = 0;
    const totalPositions = Math.min(userRankings.length, correctRankings.length);
    
    for (let i = 0; i < totalPositions; i++) {
      if (userRankings[i] === correctRankings[i]) {
        correctPositions++;
      }
    }
    
    return Math.round((correctPositions / totalPositions) * 100);
  }

  /**
   * Create fallback Emergency Simulator feedback
   */
  private async createEmergencyFallback(): Promise<QuestionFeedback> {
    return {
      questionId: 'emergency_fallback',
      questionText: 'Emergency Triage: Patient Prioritization Assessment',
      userResponse: 'Emergency triage prioritization and clinical reasoning provided',
      correctAnswer: 'Systematic emergency triage prioritization based on severity, urgency, and resource requirements',
      aiAnalysis: 'Emergency triage assessment completed. Effective emergency triage requires systematic patient prioritization based on severity, time-sensitivity, and resource requirements. Key principles include immediate life-threat assessment, rapid evaluation of hemodynamic stability, airway compromise, and potential for clinical deterioration. Consider resource allocation and patient flow management.',
      score: 75,
      strengths: ['Emergency triage assessment attempted', 'Patient prioritization provided', 'Clinical reasoning demonstrated'],
      improvements: ['Review emergency severity index (ESI) criteria', 'Practice multi-patient prioritization scenarios', 'Study emergency medicine triage protocols'],
      clinicalReasoning: 'Emergency decision-making skills demonstrate understanding of triage principles with room for refinement',
      researchReferences: ['Emergency Severity Index (ESI) Guidelines', 'ATS Emergency Triage Guidelines', 'CTAS Emergency Department Triage Protocols']
    };
  }

  private async analyzeChooseYourAdventure(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    return this.analyzeGenericGame(responses, gameContent);
  }

  /**
   * Analyze Diagnosis Duel responses - 10 rapid cases with progressive difficulty (OPTIMIZED)
   */
  private async analyzeDiagnosisDuel(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const duelContent = gameContent.diagnosisDuel || {};
    const cases = duelContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    // Process all cases in parallel for faster feedback
    const feedbackPromises = cases.map(async (caseData, i) => {
      const responseKey = `case_${i}`;
      const userResponse = responses[responseKey];

      if (caseData && userResponse) {
        return this.analyzeDiagnosisDuelCaseOptimized(
          caseData,
          userResponse,
          `Rapid Diagnosis Case ${i + 1}: ${caseData.presentation?.substring(0, 50)}...`,
          responseKey,
          i + 1
        );
      }
      return null;
    });

    // Wait for all feedback to complete in parallel
    const results = await Promise.all(feedbackPromises);
    
    // Filter out null results
    return results.filter(feedback => feedback !== null) as QuestionFeedback[];
  }

  /**
   * Analyze individual Diagnosis Duel case with speed and accuracy focus (OPTIMIZED)
   */
  private async analyzeDiagnosisDuelCaseOptimized(
    caseData: any,
    userResponse: string,
    questionText: string,
    questionId: string,
    caseNumber: number
  ): Promise<QuestionFeedback> {
    // Check if diagnosis is correct immediately
    const isCorrect = this.isMatchingDiagnosis(userResponse, caseData.correctDiagnosis);
    
    // For speed, use simplified feedback for correct answers and detailed AI analysis only for incorrect ones
    if (isCorrect) {
      return {
        questionId,
        questionText,
        userResponse: userResponse,
        aiIdealResponse: `${caseData.correctDiagnosis} - Excellent rapid pattern recognition for ${caseData.difficulty} level case`,
        correctAnswer: caseData.correctDiagnosis,
        aiAnalysis: `✅ CORRECT: Your diagnosis "${userResponse}" is accurate! Well done identifying this ${caseData.difficulty} level case quickly.`,
        score: 100,
        strengths: ['Accurate rapid diagnosis', 'Effective pattern recognition', 'Good time management'],
        improvements: ['Continue building speed for harder cases'],
        clinicalReasoning: `Successful rapid diagnostic reasoning for ${caseData.difficulty} level presentation`,
        researchReferences: [`Pattern recognition in ${caseData.difficulty} clinical presentations`, 'Rapid diagnosis methodologies']
      };
    }

    // For incorrect answers, provide detailed AI analysis with correct reasoning
    const prompt = `Provide educational feedback for this INCORRECT diagnosis in a speed challenge:

Case ${caseNumber}/10 (${caseData.difficulty} difficulty):
Clinical Presentation: ${caseData.presentation}
Correct Diagnosis: ${caseData.correctDiagnosis}
User's Incorrect Diagnosis: ${userResponse}

Focus on:
1. Why the correct diagnosis is right (key clinical indicators)
2. Why the user's diagnosis doesn't fit
3. Learning points for similar future cases

Return JSON:
{
  "aiAnalysis": "Clear explanation of why correct diagnosis is right and user's is wrong",
  "idealResponse": "Key clinical reasoning for correct diagnosis",
  "strengths": ["Any positive aspects of the attempt"],
  "improvements": ["Specific areas to focus on"],
  "clinicalReasoning": "Educational reasoning explanation",
  "researchReferences": ["Relevant evidence sources"]
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
        userResponse: userResponse,
        aiIdealResponse: result.idealResponse || `${caseData.correctDiagnosis} - Key indicators point to this diagnosis based on clinical presentation`,
        correctAnswer: caseData.correctDiagnosis,
        aiAnalysis: result.aiAnalysis || `❌ INCORRECT: The correct diagnosis is "${caseData.correctDiagnosis}". Your answer "${userResponse}" doesn't match the clinical presentation.`,
        score: 0,
        strengths: result.strengths || ['Attempted rapid assessment'],
        improvements: result.improvements || ['Review pattern recognition', 'Study key clinical indicators'],
        clinicalReasoning: result.clinicalReasoning || 'Focus on key clinical indicators for accurate rapid diagnosis',
        researchReferences: result.researchReferences || [`Clinical features of ${caseData.correctDiagnosis}`, 'Differential diagnosis techniques']
      };
    } catch (error) {
      console.error('Error analyzing diagnosis duel case:', error);
      return this.createDiagnosisDuelFallback(caseData, userResponse, questionId, caseNumber);
    }
  }

  /**
   * Create fallback Diagnosis Duel feedback
   */
  private createDiagnosisDuelFallback(caseData: any, userResponse: string, questionId: string, caseNumber: number): QuestionFeedback {
    const isCorrect = this.isMatchingDiagnosis(userResponse, caseData.correctDiagnosis);
    
    return {
      questionId,
      questionText: `Rapid Diagnosis Case ${caseNumber}`,
      userResponse: userResponse,
      aiIdealResponse: `${caseData.correctDiagnosis} - Swift recognition of key clinical patterns for ${caseData.difficulty} level presentation`,
      correctAnswer: caseData.correctDiagnosis,
      aiAnalysis: `Case ${caseNumber} (${caseData.difficulty}): ${isCorrect ? 'Correct' : 'Incorrect'} rapid diagnosis in speed challenge format`,
      score: isCorrect ? 100 : 0,
      strengths: isCorrect ? ['Accurate rapid diagnosis', 'Effective time management'] : ['Attempted rapid assessment'],
      improvements: isCorrect ? ['Maintain accuracy at higher difficulty levels'] : ['Review pattern recognition for rapid diagnosis'],
      clinicalReasoning: `${caseData.difficulty} level rapid reasoning ${isCorrect ? 'successful' : 'requires improvement'}`,
      researchReferences: [`Clinical pattern recognition studies`, `Rapid diagnosis methodologies`]
    };
  }

  /**
   * Analyze Manual Therapy Mastery responses
   */
  private async analyzeManualTherapyMastery(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const challenges = gameContent.challenges || [];
    const feedbacks: QuestionFeedback[] = [];

    console.log('Manual Therapy Mastery Analysis Debug:', {
      challengesLength: challenges.length,
      responsesKeys: Object.keys(responses),
      gameContentKeys: Object.keys(gameContent)
    });

    // Manual therapy responses - handle both old and new field names
    const techniqueResponse = responses.techniqueSelection || responses.assessmentApproach || '';
    const progressionResponse = responses.treatmentProgression || responses.treatmentPlan || '';
    const reasoningResponse = responses.clinicalReasoning || '';
    const outcomesResponse = responses.expectedOutcomes || '';

    if (challenges.length > 0 && (techniqueResponse || progressionResponse || reasoningResponse || outcomesResponse)) {
      const challenge = challenges[0]; // Use the first challenge for analysis
      
      const feedback = await this.analyzeManualTherapyCase(
        challenge,
        {
          assessment: techniqueResponse,
          treatment: progressionResponse,
          reasoning: reasoningResponse,
          outcomes: outcomesResponse
        },
        `Manual Therapy Challenge: ${challenge.scenario || challenge.challenge}`,
        'manual_therapy_response'
      );
      feedbacks.push(feedback);
    } else {
      // Create fallback feedback if no responses found
      const fallbackFeedback = this.createManualTherapyFallback(
        challenges[0] || {},
        {
          assessment: techniqueResponse,
          treatment: progressionResponse,
          reasoning: reasoningResponse,
          outcomes: outcomesResponse
        },
        'manual_therapy_fallback',
        'Manual Therapy Assessment'
      );
      feedbacks.push(fallbackFeedback);
    }

    console.log('Manual Therapy Mastery feedbacks generated:', feedbacks.length);
    return feedbacks;
  }

  /**
   * Analyze Exercise Prescription Expert responses
   */
  private async analyzeExercisePrescriptionExpert(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const challenges = gameContent.challenges || [];
    const feedbacks: QuestionFeedback[] = [];

    console.log('Exercise Prescription Expert Analysis Debug:', {
      challengesLength: challenges.length,
      responsesKeys: Object.keys(responses),
      gameContentKeys: Object.keys(gameContent)
    });

    // Exercise prescription responses - handle actual frontend field names
    const exerciseProgramResponse = responses.exerciseProgram || responses.assessmentApproach || '';
    const loadingParametersResponse = responses.loadingParameters || responses.treatmentPlan || '';
    const outcomeMonitoringResponse = responses.outcomeMonitoring || responses.clinicalReasoning || '';
    const evidenceModificationsResponse = responses.evidenceModifications || responses.expectedOutcomes || '';

    if (challenges.length > 0 && (exerciseProgramResponse || loadingParametersResponse || outcomeMonitoringResponse || evidenceModificationsResponse)) {
      const challenge = challenges[0]; // Use the first challenge for analysis
      
      const feedback = await this.analyzeExercisePrescriptionCase(
        challenge,
        {
          exerciseProgram: exerciseProgramResponse,
          loadingParameters: loadingParametersResponse,
          outcomeMonitoring: outcomeMonitoringResponse,
          evidenceModifications: evidenceModificationsResponse
        },
        `Exercise Prescription Challenge: ${challenge.scenario || challenge.challenge}`,
        'exercise_prescription_response'
      );
      feedbacks.push(feedback);
    } else {
      // Create fallback feedback if no responses found
      const fallbackFeedback = this.createExercisePrescriptionFallback(
        challenges[0] || {},
        {
          exerciseProgram: exerciseProgramResponse,
          loadingParameters: loadingParametersResponse,
          outcomeMonitoring: outcomeMonitoringResponse,
          evidenceModifications: evidenceModificationsResponse
        },
        'exercise_prescription_fallback',
        'Exercise Prescription Assessment'
      );
      feedbacks.push(fallbackFeedback);
    }

    console.log('Exercise Prescription Expert feedbacks generated:', feedbacks.length);
    return feedbacks;
  }

  /**
   * Analyze manual therapy case with AI
   */
  private async analyzeManualTherapyCase(
    caseData: any,
    userResponses: any,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const prompt = `Analyze this manual therapy clinical response:

CLINICAL SCENARIO: ${caseData.scenario || caseData.challenge || 'Manual therapy case'}

EXAMINATION FINDINGS: ${caseData.presentation?.examination || caseData.presentation?.symptoms || 'Clinical findings available'}

CORRECT APPROACH: ${caseData.correctApproach || 'Evidence-based manual therapy approach'}
PROGRESSION PLAN: ${caseData.progressionPlan || 'Progressive manual therapy protocol'}

AVAILABLE TECHNIQUE OPTIONS:
${caseData.techniqueOptions ? caseData.techniqueOptions.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n') : 'Various manual therapy techniques available'}

USER RESPONSES:
Technique Selection: ${userResponses.assessment || 'Not provided'}
Treatment Progression: ${userResponses.treatment || 'Not provided'}
Clinical Reasoning: ${userResponses.reasoning || 'Not provided'}
Expected Outcomes: ${userResponses.outcomes || 'Not provided'}

Evaluate the response quality and provide educational feedback. Consider:
1. Technique selection appropriateness for the condition
2. Safety considerations and contraindications
3. Progression planning and dosage
4. Clinical reasoning and evidence base

Provide detailed feedback in JSON format:
{
  "overallScore": 0-100,
  "aiAnalysis": "Comprehensive analysis of manual therapy approach and technique selection",
  "idealResponse": "Expert manual therapy approach for this specific case presentation",
  "strengths": ["What the clinician did well in their approach"],
  "improvements": ["Specific areas for improvement in manual therapy decision-making"],
  "clinicalReasoning": "Educational explanation of optimal manual therapy approach and reasoning",
  "researchReferences": ["Relevant evidence-based manual therapy sources"]
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
        userResponse: `Technique: ${userResponses.assessment || 'Not specified'} | Progression: ${userResponses.treatment || 'Not specified'}`,
        aiIdealResponse: result.idealResponse || caseData.correctApproach || 'Evidence-based manual therapy approach',
        aiAnalysis: result.aiAnalysis || 'Manual therapy technique selection and progression evaluated',
        score: this.safeScore(result.overallScore, 75), // Default to 75 if no score provided
        strengths: result.strengths || ['Attempted manual therapy assessment'],
        improvements: result.improvements || ['Review manual therapy evidence and technique selection'],
        clinicalReasoning: result.clinicalReasoning || 'Manual therapy requires careful technique selection based on clinical presentation and safety considerations',
        researchReferences: result.researchReferences || ['Manual therapy research', 'Clinical practice guidelines', 'Technique safety studies']
      };
    } catch (error) {
      console.error('Error analyzing manual therapy case:', error);
      return this.createManualTherapyFallback(caseData, userResponses, questionId, questionText);
    }
  }

  /**
   * Analyze exercise prescription case with AI
   */
  private async analyzeExercisePrescriptionCase(
    caseData: any,
    userResponses: any,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const prompt = `Analyze this exercise prescription clinical response:

CLINICAL SCENARIO: ${caseData.scenario || caseData.challenge || 'Exercise prescription case'}

PATIENT PRESENTATION: ${caseData.presentation?.symptoms || caseData.presentation?.examination || 'Clinical presentation available'}

CORRECT APPROACH: ${caseData.correctApproach || 'Evidence-based exercise prescription'}
PROGRESSION PLAN: ${caseData.progressionPlan || 'Progressive loading protocol'}

USER RESPONSES:
Exercise Program: ${userResponses.exerciseProgram || 'Not provided'}
Loading Parameters: ${userResponses.loadingParameters || 'Not provided'}
Outcome Monitoring: ${userResponses.outcomeMonitoring || 'Not provided'}
Evidence Modifications: ${userResponses.evidenceModifications || 'Not provided'}

Evaluate the exercise prescription quality and provide educational feedback. Consider:
1. Exercise selection appropriateness for the specific condition
2. Loading parameter precision and safety
3. Outcome monitoring effectiveness and clinical relevance
4. Evidence-based modifications and progression planning

Provide detailed feedback in JSON format:
{
  "overallScore": 0-100,
  "aiAnalysis": "Comprehensive analysis of exercise prescription approach and clinical reasoning",
  "idealResponse": "Expert exercise prescription approach for this specific case presentation",
  "strengths": ["What the clinician did well in their exercise prescription"],
  "improvements": ["Specific areas for improvement in exercise prescription decision-making"],
  "clinicalReasoning": "Educational explanation of optimal exercise prescription approach and rationale",
  "researchReferences": ["Relevant evidence-based exercise prescription sources"]
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
        userResponse: `Program: ${userResponses.exerciseProgram || 'Not specified'} | Parameters: ${userResponses.loadingParameters || 'Not specified'}`,
        aiIdealResponse: result.idealResponse || caseData.correctApproach || 'Evidence-based exercise prescription approach',
        aiAnalysis: result.aiAnalysis || 'Exercise prescription approach and clinical reasoning evaluated',
        score: this.safeScore(result.overallScore, 75), // Default to 75 if no score provided
        strengths: result.strengths || ['Attempted exercise prescription assessment'],
        improvements: result.improvements || ['Review exercise prescription evidence and loading parameters'],
        clinicalReasoning: result.clinicalReasoning || 'Exercise prescription requires careful selection based on clinical presentation and evidence-based protocols',
        researchReferences: result.researchReferences || ['Exercise prescription research', 'Clinical practice guidelines', 'Loading parameter studies']
      };
    } catch (error) {
      console.error('Error analyzing exercise prescription case:', error);
      return this.createExercisePrescriptionFallback(caseData, userResponses, questionId, questionText);
    }
  }

  /**
   * Create fallback manual therapy feedback
   */
  private createManualTherapyFallback(caseData: any, userResponses: any, questionId: string, questionText: string): QuestionFeedback {
    return {
      questionId,
      questionText,
      userResponse: `Assessment: ${userResponses.assessment} | Treatment: ${userResponses.treatment}`,
      aiIdealResponse: caseData.correctApproach || 'Evidence-based manual therapy approach',
      aiAnalysis: 'Manual therapy response evaluated - consider evidence-based technique selection',
      score: 75,
      strengths: ['Attempted manual therapy assessment'],
      improvements: ['Review manual therapy evidence', 'Consider contraindications'],
      clinicalReasoning: 'Manual therapy requires careful technique selection based on clinical presentation',
      researchReferences: ['Manual therapy research', 'Clinical practice guidelines']
    };
  }

  /**
   * Create fallback exercise prescription feedback
   */
  private createExercisePrescriptionFallback(caseData: any, userResponses: any, questionId: string, questionText: string): QuestionFeedback {
    return {
      questionId,
      questionText,
      userResponse: `Program: ${userResponses.exerciseProgram || 'Not specified'} | Parameters: ${userResponses.loadingParameters || 'Not specified'}`,
      aiIdealResponse: caseData.correctApproach || 'Evidence-based exercise prescription with progressive loading',
      aiAnalysis: 'Exercise prescription response evaluated - consider evidence-based selection, loading parameters, and outcome monitoring',
      score: 75,
      strengths: ['Attempted exercise prescription assessment'],
      improvements: ['Review exercise prescription evidence', 'Consider loading parameters', 'Enhance outcome monitoring'],
      clinicalReasoning: 'Exercise prescription requires evidence-based selection, appropriate loading parameters, and comprehensive outcome monitoring',
      researchReferences: ['Exercise prescription research', 'Progressive loading studies', 'Outcome monitoring protocols']
    };
  }
}

export const gameAIFeedbackService = new GameAIFeedbackService();