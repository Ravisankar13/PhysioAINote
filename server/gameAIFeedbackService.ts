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
   * Analyze Emergency Room Simulator responses with triage assessment
   */
  private async analyzeEmergencySimulator(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const emergencyContent = gameContent.emergencySimulator || {};
    const cases = emergencyContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      const triagePriority = responses[`triagePriority_${i}`] || responses.triagePriority || '';
      const immediateActions = responses[`immediateActions_${i}`] || responses.immediateActions || '';

      if (caseData && (triagePriority || immediateActions)) {
        const feedback = await this.analyzeEmergencyCase(
          caseData,
          {
            triagePriority,
            immediateActions
          },
          `Emergency Triage Case ${i + 1}: Critical Decision Making`,
          `emergency_${i}`
        );
        feedbacks.push(feedback);
      }
    }

    return feedbacks.length > 0 ? feedbacks : [await this.createEmergencyFallback()];
  }

  /**
   * Analyze individual Emergency Simulator case with triage protocols
   */
  private async analyzeEmergencyCase(
    caseData: any,
    responses: any,
    questionText: string,
    questionId: string
  ): Promise<QuestionFeedback> {
    const prompt = `Analyze this Emergency Triage response based on established triage protocols:

Multi-Patient Emergency Scenario: ${caseData.presentation || 'Multiple patient emergency'}
Expected Patient Prioritization: ${caseData.expectedPrioritization || 'Systematic triage approach'}
Patient Details: ${JSON.stringify(caseData.patients || [])}

User's Emergency Assessment:
- Triage Priority Level: ${responses.triagePriority}
- Immediate Actions: ${responses.immediateActions}

Evaluate emergency decision-making (0-100) based on:
1. Accurate triage prioritization (50%)
2. Appropriate immediate actions (30%)
3. Resource allocation efficiency (20%)

Include research references for triage protocols and emergency management guidelines.

Return JSON:
{
  "score": number,
  "aiAnalysis": "Emergency triage analysis with protocol references",
  "idealResponse": "Evidence-based emergency management approach",
  "strengths": ["Emergency assessment strengths"],
  "improvements": ["Triage improvement recommendations"],
  "clinicalReasoning": "Emergency clinical reasoning assessment",
  "researchReferences": ["Emergency medicine guidelines and triage protocols"]
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
        userResponse: `Triage Priority: ${responses.triagePriority} | Actions: ${responses.immediateActions}`,
        aiIdealResponse: result.idealResponse || `Triage Priority: ${caseData.expectedPrioritization} | Actions: Systematic triage assessment following emergency protocols with immediate life-saving interventions prioritized by acuity and resource availability`,
        correctAnswer: result.idealResponse || `Expected: ${caseData.expectedPrioritization}`,
        aiAnalysis: result.aiAnalysis || 'Emergency triage assessment completed with protocol analysis',
        score: this.safeScore(result.score, 75),
        strengths: result.strengths || ['Emergency triage attempted'],
        improvements: result.improvements || ['Review triage protocols'],
        clinicalReasoning: result.clinicalReasoning || 'Emergency decision-making assessed',
        researchReferences: result.researchReferences || []
      };
    } catch (error) {
      console.error('Error analyzing emergency case:', error);
      return this.createEmergencyFallback();
    }
  }

  /**
   * Create fallback Emergency Simulator feedback
   */
  private async createEmergencyFallback(): Promise<QuestionFeedback> {
    return {
      questionId: 'emergency_fallback',
      questionText: 'Emergency Triage Assessment',
      userResponse: 'Emergency triage decision completed',
      correctAnswer: 'Systematic emergency triage prioritization',
      aiAnalysis: 'Emergency triage requires systematic patient prioritization based on severity, time-sensitivity, and resource requirements. Key principles include immediate life-threat assessment, resource allocation, and multi-patient management.',
      score: 75,
      strengths: ['Emergency assessment attempted', 'Triage approach applied'],
      improvements: ['Review emergency triage protocols', 'Practice multi-patient scenarios'],
      clinicalReasoning: 'Emergency decision-making skills require continued development',
      researchReferences: ['Emergency triage guidelines', 'Multi-patient management protocols']
    };
  }

  private async analyzeChooseYourAdventure(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    return this.analyzeGenericGame(responses, gameContent);
  }

  /**
   * Analyze Diagnosis Duel responses - 10 rapid cases with progressive difficulty
   */
  private async analyzeDiagnosisDuel(responses: any, gameContent: any): Promise<QuestionFeedback[]> {
    const duelContent = gameContent.diagnosisDuel || {};
    const cases = duelContent.cases || [];
    const feedbacks: QuestionFeedback[] = [];

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      const responseKey = `case_${i}`;
      const userResponse = responses[responseKey];

      if (caseData && userResponse) {
        const feedback = await this.analyzeDiagnosisDuelCase(
          caseData,
          userResponse,
          `Rapid Diagnosis Case ${i + 1}: ${caseData.presentation?.substring(0, 50)}...`,
          responseKey,
          i + 1
        );
        feedbacks.push(feedback);
      }
    }

    return feedbacks;
  }

  /**
   * Analyze individual Diagnosis Duel case with speed and accuracy focus
   */
  private async analyzeDiagnosisDuelCase(
    caseData: any,
    userResponse: string,
    questionText: string,
    questionId: string,
    caseNumber: number
  ): Promise<QuestionFeedback> {
    const prompt = `Analyze this rapid diagnosis response from a 60-second speed challenge:

Case ${caseNumber}/10 (${caseData.difficulty} difficulty):
Clinical Presentation: ${caseData.presentation}
Correct Diagnosis: ${caseData.correctDiagnosis}
User's Diagnosis: ${userResponse}
Time Allocation: ${caseData.timeAllocation} seconds

This is case ${caseNumber} of 10 in a progressive difficulty speed challenge. Evaluate based on:
1. Diagnostic accuracy (70%)
2. Speed appropriateness for difficulty level (20%) 
3. Clinical reasoning under time pressure (10%)

Provide feedback tailored to the rapid-fire format and progressive difficulty nature.

Return JSON:
{
  "score": number,
  "aiAnalysis": "Speed-focused analysis with progressive difficulty context",
  "idealResponse": "Optimal rapid diagnosis approach for this difficulty level",
  "strengths": ["Speed diagnosis strengths demonstrated"],
  "improvements": ["Rapid clinical reasoning enhancement areas"],
  "clinicalReasoning": "Assessment of diagnostic thinking under time pressure",
  "researchReferences": ["Evidence supporting rapid diagnosis techniques"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Check if diagnosis is correct for scoring
      const isCorrect = this.isMatchingDiagnosis(userResponse, caseData.correctDiagnosis);
      const baseScore = isCorrect ? 100 : 0;

      return {
        questionId,
        questionText,
        userResponse: userResponse,
        aiIdealResponse: result.idealResponse || `${caseData.correctDiagnosis} - Rapid recognition of ${caseData.difficulty} level clinical presentation requiring swift pattern recognition and systematic approach`,
        correctAnswer: caseData.correctDiagnosis,
        aiAnalysis: result.aiAnalysis || `Case ${caseNumber}: ${caseData.difficulty} difficulty diagnosis challenge completed in speed format`,
        score: this.safeScore(result.score || baseScore, baseScore),
        strengths: result.strengths || ['Rapid diagnosis attempt under time pressure'],
        improvements: result.improvements || ['Enhance speed diagnosis pattern recognition'],
        clinicalReasoning: result.clinicalReasoning || 'Rapid clinical reasoning under time constraint assessed',
        researchReferences: result.researchReferences || [`Rapid diagnosis techniques for ${caseData.difficulty} presentations`]
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
}

export const gameAIFeedbackService = new GameAIFeedbackService();