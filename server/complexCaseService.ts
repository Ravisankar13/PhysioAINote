import { db, pool } from './db';
import { 
  complexCases, 
  caseStages, 
  stageQuestions, 
  complexCaseAttempts,
  competitions,
  InsertComplexCase, 
  InsertCaseStage, 
  InsertStageQuestion, 
  InsertComplexCaseAttempt,
  ComplexCase,
  CaseStage,
  StageQuestion,
  ComplexCaseAttempt
} from '@shared/schema';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { generateComplexCase, scoreComplexCaseAttempt, ComplexCaseInput } from './complexCaseGenerator';

export class ComplexCaseService {
  
  /**
   * Creates a new complex case with stages and questions
   */
  async createComplexCase(input: ComplexCaseInput, userId: number): Promise<ComplexCase> {
    console.log(`Creating complex case for user ${userId}`);
    
    try {
      const generationResult = await generateComplexCase(input, userId);
      
      // Insert the complex case
      const [insertedCase] = await db.insert(complexCases)
        .values([generationResult.complexCase])
        .returning();
      
      // Insert stages
      const stagesWithCaseId = generationResult.stages.map(stage => ({
        ...stage,
        complexCaseId: insertedCase.id
      }));
      
      const insertedStages = await db.insert(caseStages)
        .values(stagesWithCaseId)
        .returning();
      
      // Insert questions with correct stage IDs
      const questionsWithStageIds: InsertStageQuestion[] = [];
      let questionIndex = 0;
      
      generationResult.stages.forEach((_, stageIndex) => {
        const stageId = insertedStages[stageIndex].id;
        const questionsForStage = generationResult.questions.filter(
          (_, qIndex) => Math.floor(qIndex / 2) === stageIndex // Assuming 2 questions per stage
        );
        
        questionsForStage.forEach(question => {
          questionsWithStageIds.push({
            ...question,
            stageId: stageId
          });
        });
      });
      
      if (questionsWithStageIds.length > 0) {
        await db.insert(stageQuestions).values(questionsWithStageIds);
      }
      
      console.log(`Complex case created with ID: ${insertedCase.id}`);
      return insertedCase;
      
    } catch (error) {
      console.error('Error creating complex case:', error);
      throw error;
    }
  }
  
  /**
   * Gets a complex case with all its stages and questions
   */
  async getComplexCaseWithDetails(caseId: number): Promise<any> {
    try {
      // Get the case using pool directly due to schema mismatch
      const caseResult = await pool.query('SELECT * FROM complex_cases WHERE id = $1', [caseId]);
      if (caseResult.rows.length === 0) return null;
      
      const complexCase = caseResult.rows[0];
      
      // Get stages using pool directly
      const stagesResult = await pool.query(
        'SELECT * FROM case_stages WHERE complex_case_id = $1 ORDER BY stage_number',
        [caseId]
      );
      
      // Get questions for each stage
      const stagesWithQuestions = await Promise.all(
        stagesResult.rows.map(async (stage) => {
          const questionsResult = await pool.query(
            'SELECT * FROM stage_questions WHERE stage_id = $1 ORDER BY question_number',
            [stage.id]
          );
          
          return { 
            ...stage, 
            questions: questionsResult.rows.map(q => ({
              ...q,
              scoringCriteria: typeof q.scoring_criteria === 'string' ? JSON.parse(q.scoring_criteria) : q.scoring_criteria
            }))
          };
        })
      );
      
      return {
        case: {
          id: complexCase.id,
          userId: complexCase.user_id,
          title: complexCase.title,
          patientDescription: complexCase.patient_description,
          occupationalHistory: complexCase.occupational_history,
          socialHistory: complexCase.social_history,
          medicalHistory: complexCase.medical_history,
          currentMedications: complexCase.current_medications,
          mechanismOfInjury: complexCase.mechanism_of_injury,
          bodyPart: complexCase.body_part,
          complexity: complexCase.complexity,
          estimatedTime: complexCase.estimated_time_minutes,
          initialPresentation: typeof complexCase.initial_presentation === 'string' ? 
            JSON.parse(complexCase.initial_presentation) : complexCase.initial_presentation,
          detailedHistory: typeof complexCase.detailed_history === 'string' ? 
            JSON.parse(complexCase.detailed_history) : complexCase.detailed_history,
          physicalFindings: typeof complexCase.physical_findings === 'string' ? 
            JSON.parse(complexCase.physical_findings) : complexCase.physical_findings
        },
        stages: stagesWithQuestions.map(stage => ({
          id: stage.id,
          complexCaseId: stage.complex_case_id,
          stageNumber: stage.stage_number,
          title: stage.title,
          description: stage.description,
          stageType: stage.stage_type,
          expectedTimeMinutes: stage.expected_time_minutes,
          informationRevealed: typeof stage.information_revealed === 'string' ? 
            JSON.parse(stage.information_revealed) : stage.information_revealed,
          questions: stage.questions.map(q => ({
            id: q.id,
            stageId: q.stage_id,
            questionNumber: q.question_number,
            questionText: q.question_text,
            questionType: q.question_type,
            options: q.options,
            expectedAnswers: q.expected_answers,
            correctAnswer: q.correct_answer,
            answerExplanation: q.answer_explanation,
            scoringCriteria: q.scoringCriteria,
            pointsAvailable: q.points_available
          }))
        }))
      };
    } catch (error) {
      console.error('Error getting complex case details:', error);
      return null;
    }
  }
  
  /**
   * Starts a complex case attempt
   */
  async startComplexCaseAttempt(
    userId: number, 
    complexCaseId: number, 
    competitionId?: number
  ): Promise<any> {
    try {
      // Use pool query to insert with correct column names
      const result = await pool.query(
        `INSERT INTO complex_case_attempts 
         (user_id, complex_case_id, competition_id, started_at, total_time_spent_seconds, stage_responses) 
         VALUES ($1, $2, $3, NOW(), 0, '[]'::jsonb) 
         RETURNING *`,
        [userId, complexCaseId, competitionId || null]
      );
      
      const attempt = result.rows[0];
      console.log(`Started complex case attempt ${attempt.id} for user ${userId}`);
      return attempt;
    } catch (error) {
      console.error('Error starting complex case attempt:', error);
      throw error;
    }
  }
  
  /**
   * Submits responses for a stage
   */
  async submitStageResponse(
    attemptId: number,
    stageId: number,
    responses: Array<{
      questionId: number;
      answer: string;
      timeSpent: number;
    }>
  ): Promise<ComplexCaseAttempt> {
    try {
      // Get current attempt using pool query
      const attemptResult = await pool.query(
        'SELECT * FROM complex_case_attempts WHERE id = $1',
        [attemptId]
      );
      
      if (attemptResult.rows.length === 0) {
        throw new Error('Attempt not found');
      }
      
      const currentAttempt = attemptResult.rows[0];
      
      // Get questions for scoring
      const questionIds = responses.map(r => r.questionId);
      const questions = await db.select()
        .from(stageQuestions)
        .where(eq(stageQuestions.stageId, stageId));
      
      // Score responses
      const scoredResponses = responses.map(response => {
        const question = questions.find(q => q.id === response.questionId);
        if (!question) return { ...response, score: 0, feedback: 'Question not found' };
        
        const score = this.scoreResponse(response.answer, question);
        const feedback = this.generateResponseFeedback(response.answer, question);
        
        return { ...response, score, feedback };
      });
      
      // Update stage responses
      const stageResponse = {
        stageId,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        responses: scoredResponses
      };
      
      const currentStageResponses = Array.isArray(currentAttempt.stage_responses) ? 
        currentAttempt.stage_responses : [];
      const updatedStageResponses = [...currentStageResponses, stageResponse];
      
      // Update attempt using pool query
      const updateResult = await pool.query(
        `UPDATE complex_case_attempts 
         SET stage_responses = $1, 
             total_time_spent_seconds = $2 
         WHERE id = $3 
         RETURNING *`,
        [
          JSON.stringify(updatedStageResponses),
          currentAttempt.total_time_spent_seconds + responses.reduce((sum, r) => sum + r.timeSpent, 0),
          attemptId
        ]
      );
      
      return updateResult.rows[0];
    } catch (error) {
      console.error('Error submitting stage response:', error);
      throw error;
    }
  }
  
  /**
   * Completes a complex case attempt and generates final scores
   */
  async completeComplexCaseAttempt(attemptId: number): Promise<ComplexCaseAttempt> {
    try {
      // Get the attempt with all data
      const [attempt] = await db.select()
        .from(complexCaseAttempts)
        .where(eq(complexCaseAttempts.id, attemptId));
      
      if (!attempt) {
        throw new Error('Attempt not found');
      }
      
      // Get the complex case for scoring
      const [complexCase] = await db.select()
        .from(complexCases)
        .where(eq(complexCases.id, attempt.complexCaseId));
      
      if (!complexCase) {
        throw new Error('Complex case not found');
      }
      
      // Score the attempt using AI
      const scoringResult = await scoreComplexCaseAttempt(complexCase, attempt.stageResponses);
      
      // Calculate time efficiency score
      const timeEfficiencyScore = this.calculateTimeEfficiencyScore(
        attempt.totalTimeSpent, 
        complexCase.estimatedTime * 60 // Convert to seconds
      );
      
      // Update attempt with final scores
      const [completedAttempt] = await db.update(complexCaseAttempts)
        .set({
          completed: true,
          completedAt: new Date(),
          totalScore: scoringResult.totalScore,
          clinicalReasoningScore: scoringResult.categoryScores.clinicalReasoning,
          assessmentSkillsScore: scoringResult.categoryScores.assessmentSkills,
          treatmentPlanningScore: scoringResult.categoryScores.treatmentPlanning,
          communicationScore: scoringResult.categoryScores.communication,
          timeEfficiencyScore: timeEfficiencyScore,
          overallFeedback: scoringResult.feedback
        })
        .where(eq(complexCaseAttempts.id, attemptId))
        .returning();
      
      console.log(`Completed complex case attempt ${attemptId} with score ${scoringResult.totalScore}`);
      return completedAttempt;
      
    } catch (error) {
      console.error('Error completing complex case attempt:', error);
      throw error;
    }
  }
  
  /**
   * Gets user's attempts for a complex case
   */
  async getUserComplexCaseAttempts(userId: number, complexCaseId?: number): Promise<ComplexCaseAttempt[]> {
    try {
      let query = db.select()
        .from(complexCaseAttempts)
        .where(eq(complexCaseAttempts.userId, userId));
      
      if (complexCaseId) {
        query = query.where(eq(complexCaseAttempts.complexCaseId, complexCaseId));
      }
      
      const attempts = await query.orderBy(desc(complexCaseAttempts.createdAt));
      return attempts;
    } catch (error) {
      console.error('Error getting user complex case attempts:', error);
      return [];
    }
  }
  
  /**
   * Gets complex cases for a competition
   */
  async getComplexCasesForCompetition(competitionId: number): Promise<ComplexCase[]> {
    try {
      // Get competition to check case type and IDs
      const [competition] = await db.select()
        .from(competitions)
        .where(eq(competitions.id, competitionId));
      
      if (!competition || competition.caseType !== 'complex' || !competition.complexCaseIds) {
        return [];
      }
      
      // Get complex cases
      const cases = await db.select()
        .from(complexCases)
        .where(
          complexCases.id.in(competition.complexCaseIds as number[])
        );
      
      return cases;
    } catch (error) {
      console.error('Error getting complex cases for competition:', error);
      return [];
    }
  }
  
  /**
   * Creates a complex competition with generated cases
   */
  async createComplexCompetition(
    title: string,
    description: string,
    competitionType: "complete_clinician" | "diagnostic_detective" | "treatment_strategist" | "clinical_educator",
    bodyPart: string,
    difficulty: string,
    numberOfCases: number = 5,
    timeLimit: number = 180, // minutes
    userId: number
  ): Promise<{ competitionId: number; caseIds: number[] }> {
    try {
      console.log(`Creating complex competition: ${title}`);
      
      // Generate complex cases
      const casePromises = Array.from({ length: numberOfCases }, () => 
        this.createComplexCase({
          bodyPart: bodyPart as any,
          complexity: difficulty as any,
          competitionType,
          estimatedTime: Math.ceil(timeLimit / numberOfCases)
        }, userId)
      );
      
      const generatedCases = await Promise.all(casePromises);
      const caseIds = generatedCases.map(c => c.id);
      
      // Create competition
      const [competition] = await db.insert(competitions)
        .values({
          title,
          description,
          type: competitionType,
          status: 'upcoming',
          bodyPart: bodyPart as any,
          difficulty,
          timeLimit,
          maxParticipants: 50,
          startTime: new Date(),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          createdBy: userId,
          caseStudyIds: [], // Empty for complex competitions
          complexCaseIds: caseIds,
          caseType: 'complex',
          rules: {
            scoringWeights: {
              accuracy: 0.3,
              speed: 0.15,
              reasoning: 0.3,
              differential: 0.15,
              treatment: 0.1
            },
            allowedAttempts: 1,
            showLeaderboard: true,
            revealAnswers: true
          }
        })
        .returning();
      
      console.log(`Created complex competition ${competition.id} with ${numberOfCases} cases`);
      return { competitionId: competition.id, caseIds };
      
    } catch (error) {
      console.error('Error creating complex competition:', error);
      throw error;
    }
  }
  
  /**
   * Scores an individual response
   */
  private scoreResponse(userAnswer: string, question: StageQuestion): number {
    if (!question.scoringCriteria || !question.expectedAnswers) return 0;
    
    const { maxPoints, partialCredit, keywordPoints } = question.scoringCriteria;
    let score = 0;
    
    // Check for keyword matches
    if (keywordPoints && Array.isArray(keywordPoints)) {
      keywordPoints.forEach(({ keyword, points }) => {
        if (userAnswer.toLowerCase().includes(keyword.toLowerCase())) {
          score += points;
        }
      });
    }
    
    // Check for expected answers
    const foundExpected = question.expectedAnswers.some(expected =>
      userAnswer.toLowerCase().includes(expected.toLowerCase())
    );
    
    if (foundExpected && !keywordPoints?.length) {
      score = maxPoints;
    }
    
    return Math.min(score, maxPoints);
  }
  
  /**
   * Generates feedback for a response
   */
  private generateResponseFeedback(userAnswer: string, question: StageQuestion): string {
    const score = this.scoreResponse(userAnswer, question);
    const maxPoints = question.scoringCriteria?.maxPoints || 0;
    const percentage = maxPoints > 0 ? (score / maxPoints) * 100 : 0;
    
    if (percentage >= 80) {
      return "Excellent response! " + question.rationale;
    } else if (percentage >= 60) {
      return "Good response with room for improvement. " + question.rationale;
    } else {
      return "Consider reviewing this topic. " + question.rationale;
    }
  }
  
  /**
   * Calculates time efficiency score
   */
  private calculateTimeEfficiencyScore(actualSeconds: number, expectedSeconds: number): number {
    if (actualSeconds <= expectedSeconds) {
      return 100;
    }
    
    const ratio = expectedSeconds / actualSeconds;
    return Math.max(0, Math.round(ratio * 100));
  }

  /**
   * Gets detailed complex case information with stages and questions
   */
  async getComplexCaseDetails(complexCaseId: number): Promise<any> {
    try {
      // Get the complex case
      const complexCaseResult = await pool.query(
        'SELECT * FROM complex_cases WHERE id = $1',
        [complexCaseId]
      );

      if (complexCaseResult.rows.length === 0) {
        return null;
      }

      const complexCase = complexCaseResult.rows[0];

      // Get stages with questions
      const stagesResult = await pool.query(
        `SELECT s.*, q.id as question_id, q.stage_id, q.question_number, 
                q.question_text, q.question_type, q.correct_answer, 
                q.answer_explanation, q.scoring_criteria, q.points_available
         FROM case_stages s
         LEFT JOIN stage_questions q ON s.id = q.stage_id
         WHERE s.complex_case_id = $1
         ORDER BY s.stage_number, q.question_number`,
        [complexCaseId]
      );

      // Group questions by stage
      const stagesMap = new Map();
      
      stagesResult.rows.forEach(row => {
        const stageId = row.id;
        
        if (!stagesMap.has(stageId)) {
          stagesMap.set(stageId, {
            id: row.id,
            complexCaseId: row.complex_case_id,
            stageNumber: row.stage_number,
            title: row.title,
            question: row.description, // Map description to question for frontend
            type: row.stage_type === 'assessment' ? 'short_answer' : 'clinical_reasoning', // Default type
            points: 20, // Default points
            description: row.description,
            stageType: row.stage_type,
            expectedTimeMinutes: row.expected_time_minutes,
            informationRevealed: typeof row.information_revealed === 'string' ? 
              JSON.parse(row.information_revealed) : row.information_revealed,
            questions: []
          });
        }

        if (row.question_id) {
          stagesMap.get(stageId).questions.push({
            id: row.question_id,
            stageId: row.stage_id,
            questionNumber: row.question_number,
            questionText: row.question_text,
            questionType: row.question_type,
            correctAnswer: row.correct_answer,
            answerExplanation: row.answer_explanation,
            scoringCriteria: typeof row.scoring_criteria === 'string' ? 
              JSON.parse(row.scoring_criteria) : row.scoring_criteria,
            pointsAvailable: row.points_available
          });
        }
      });

      return {
        case: {
          id: complexCase.id,
          userId: complexCase.user_id,
          title: complexCase.title,
          patientDescription: complexCase.patient_description,
          occupationalHistory: complexCase.occupational_history,
          socialHistory: complexCase.social_history,
          medicalHistory: complexCase.medical_history,
          currentMedications: complexCase.current_medications,
          mechanismOfInjury: complexCase.mechanism_of_injury,
          bodyPart: complexCase.body_part,
          complexity: complexCase.complexity,
          estimatedTime: complexCase.estimated_time_minutes,
          initialPresentation: typeof complexCase.initial_presentation === 'string' ? 
            JSON.parse(complexCase.initial_presentation) : complexCase.initial_presentation,
          detailedHistory: typeof complexCase.detailed_history === 'string' ? 
            JSON.parse(complexCase.detailed_history) : complexCase.detailed_history,
          physicalFindings: typeof complexCase.physical_findings === 'string' ? 
            JSON.parse(complexCase.physical_findings) : complexCase.physical_findings
        },
        stages: Array.from(stagesMap.values()).sort((a, b) => a.stageNumber - b.stageNumber)
      };
    } catch (error) {
      console.error('Error getting complex case details:', error);
      throw error;
    }
  }

  /**
   * Stores a complex case attempt to the database
   */
  async storeComplexCaseAttempt(attemptData: any): Promise<ComplexCaseAttempt> {
    try {
      const [insertedAttempt] = await db.insert(complexCaseAttempts)
        .values({
          userId: attemptData.userId,
          competitionId: attemptData.competitionId,
          complexCaseId: attemptData.complexCaseId,
          totalScore: attemptData.totalScore,
          clinicalReasoningScore: attemptData.clinicalReasoningScore,
          assessmentSkillsScore: attemptData.assessmentSkillsScore,
          treatmentPlanningScore: attemptData.treatmentPlanningScore,
          communicationScore: attemptData.communicationScore,
          timeEfficiencyScore: attemptData.timeEfficiencyScore,
          totalTimeSpent: attemptData.totalTimeSpentSeconds,
          stageResponses: attemptData.stageResponses,
          overallFeedback: attemptData.overallFeedback,
          completedAt: attemptData.completedAt,
          startedAt: attemptData.startedAt
        })
        .returning();
      
      return insertedAttempt;
    } catch (error) {
      console.error('Error storing complex case attempt:', error);
      throw error;
    }
  }

  /**
   * Gets all complex case attempts for a user
   */
  async getUserComplexCaseAttempts(userId: number): Promise<any[]> {
    try {
      const attempts = await db
        .select({
          id: complexCaseAttempts.id,
          competitionId: complexCaseAttempts.competitionId,
          complexCaseId: complexCaseAttempts.complexCaseId,
          totalScore: complexCaseAttempts.totalScore,
          clinicalReasoningScore: complexCaseAttempts.clinicalReasoningScore,
          assessmentSkillsScore: complexCaseAttempts.assessmentSkillsScore,
          treatmentPlanningScore: complexCaseAttempts.treatmentPlanningScore,
          communicationScore: complexCaseAttempts.communicationScore,
          timeEfficiencyScore: complexCaseAttempts.timeEfficiencyScore,
          totalTimeSpentSeconds: complexCaseAttempts.totalTimeSpent,
          stageResponses: complexCaseAttempts.stageResponses,
          overallFeedback: complexCaseAttempts.overallFeedback,
          completedAt: complexCaseAttempts.completedAt,
          startedAt: complexCaseAttempts.startedAt,
          competitionTitle: competitions.title,
          competitionBodyPart: competitions.bodyPart
        })
        .from(complexCaseAttempts)
        .leftJoin(competitions, eq(complexCaseAttempts.competitionId, competitions.id))
        .where(eq(complexCaseAttempts.userId, userId))
        .orderBy(desc(complexCaseAttempts.completedAt));

      // Transform the data to match the expected format for the history view
      return attempts.map(attempt => ({
        competitionId: attempt.competitionId,
        competitionTitle: attempt.competitionTitle || "Complex Case Competition",
        complexCaseId: attempt.complexCaseId,
        completedAt: attempt.completedAt,
        overallScore: attempt.totalScore,
        timeSpent: Math.round(attempt.totalTimeSpentSeconds / 60), // Convert to minutes
        categoryScores: {
          clinicalReasoning: attempt.clinicalReasoningScore || 0,
          assessmentSkills: attempt.assessmentSkillsScore || 0,
          treatmentPlanning: attempt.treatmentPlanningScore || 0,
          communication: attempt.communicationScore || 0
        },
        questionFeedback: attempt.overallFeedback?.questionFeedback || [],
        totalQuestions: attempt.stageResponses ? (Array.isArray(attempt.stageResponses) ? attempt.stageResponses.length : 0) : 0,
        averageScore: attempt.totalScore || 0,
        totalParticipants: 1, // Default for now
        rank: 1 // Default for now
      }));
    } catch (error) {
      console.error('Error getting user complex case attempts:', error);
      return [];
    }
  }
}

export const complexCaseService = new ComplexCaseService();