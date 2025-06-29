import { competitionStorage } from './competitionStorage';
import { generateDiagnosticFeedback } from './aiCaseStudyGenerator';
import { 
  type Competition, 
  type CompetitionParticipant, 
  type DailyChallenge,
  type AICaseStudy 
} from '@shared/schema';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CompetitionAttempt {
  caseStudyId: number;
  userDiagnosis: string;
  userReasoning: string;
  assessmentTests: string[];
  proposedTreatment: string;
  timeSpent: number; // in seconds
}

export interface CompetitionResult {
  participantId: number;
  totalScore: number;
  rank: number;
  caseResults: {
    caseStudyId: number;
    scores: {
      accuracy: number;
      speed: number;
      reasoning: number;
      differential: number;
      treatment: number;
      total: number;
    };
    feedback: string;
  }[];
  achievements?: string[];
}

export class CompetitionService {
  
  // Scoring System
  async scoreCompetitionAttempt(
    competition: Competition,
    caseStudy: AICaseStudy,
    attempt: CompetitionAttempt
  ): Promise<{
    scores: {
      accuracy: number;
      speed: number;
      reasoning: number;
      differential: number;
      treatment: number;
      total: number;
    };
    feedback: string;
  }> {
    console.log(`[SCORING] Starting to score attempt for case ${caseStudy.id}`);
    
    try {
      // Check if OpenAI is properly configured
      if (!process.env.OPENAI_API_KEY) {
        console.error("[SCORING] OPENAI_API_KEY not found in environment");
        throw new Error("OpenAI API key not configured");
      }

      const weights = competition.rules?.scoringWeights || {
        accuracy: 0.3,
        speed: 0.2,
        reasoning: 0.2,
        differential: 0.15,
        treatment: 0.15
      };

    // Calculate individual scores
    console.log(`[SCORING] Calculating accuracy score...`);
    const accuracyScore = this.calculateAccuracyScore(caseStudy, attempt);
    console.log(`[SCORING] Accuracy score: ${accuracyScore}`);
    
    console.log(`[SCORING] Calculating speed score...`);
    const speedScore = this.calculateSpeedScore(attempt.timeSpent, competition.timeLimit || 30);
    console.log(`[SCORING] Speed score: ${speedScore}`);
    
    console.log(`[SCORING] Calculating reasoning score (AI call)...`);
    const reasoningScore = await this.calculateReasoningScore(caseStudy, attempt);
    console.log(`[SCORING] Reasoning score: ${reasoningScore}`);
    
    console.log(`[SCORING] Calculating differential score...`);
    const differentialScore = this.calculateDifferentialScore(caseStudy, attempt);
    console.log(`[SCORING] Differential score: ${differentialScore}`);
    
    console.log(`[SCORING] Calculating treatment score...`);
    const treatmentScore = this.calculateTreatmentScore(caseStudy, attempt);
    console.log(`[SCORING] Treatment score: ${treatmentScore}`);

    // Calculate weighted total
    const totalScore = Math.round(
      (accuracyScore * weights.accuracy +
       speedScore * weights.speed +
       reasoningScore * weights.reasoning +
       differentialScore * weights.differential +
       treatmentScore * weights.treatment) * 100
    );

      // Generate AI feedback
      const feedback = await this.generateCompetitionFeedback(caseStudy, attempt, {
        accuracy: accuracyScore,
        speed: speedScore,
        reasoning: reasoningScore,
        differential: differentialScore,
        treatment: treatmentScore,
        total: totalScore
      });

      return {
        scores: {
          accuracy: Math.round(accuracyScore * 100),
          speed: Math.round(speedScore * 100),
          reasoning: Math.round(reasoningScore * 100),
          differential: Math.round(differentialScore * 100),
          treatment: Math.round(treatmentScore * 100),
          total: totalScore
        },
        feedback
      };
    } catch (error) {
      console.error("[SCORING] Error in scoreCompetitionAttempt:", error);
      
      // Return fallback scores if OpenAI fails
      const fallbackScores = {
        accuracy: Math.round(this.calculateAccuracyScore(caseStudy, attempt) * 100),
        speed: 70, // Default decent speed score
        reasoning: 60, // Default reasoning score
        differential: 50, // Default differential score
        treatment: 60, // Default treatment score
        total: 60
      };
      
      return {
        scores: fallbackScores,
        feedback: "Assessment completed. Keep practicing to improve your clinical reasoning skills!"
      };
    }
  }

  private calculateAccuracyScore(caseStudy: AICaseStudy, attempt: CompetitionAttempt): number {
    const correctDiagnosis = caseStudy.correctDiagnosis.toLowerCase();
    const userDiagnosis = attempt.userDiagnosis.toLowerCase();
    
    // Exact match gets full points
    if (userDiagnosis === correctDiagnosis) return 1.0;
    
    // Partial match scoring using similarity
    const similarity = this.calculateTextSimilarity(correctDiagnosis, userDiagnosis);
    
    // Check if user diagnosis is in differential diagnoses
    const isInDifferentials = caseStudy.differentialDiagnoses.some(diff => 
      diff.toLowerCase().includes(userDiagnosis) || userDiagnosis.includes(diff.toLowerCase())
    );
    
    if (isInDifferentials) return Math.max(similarity, 0.7);
    
    return similarity;
  }

  private calculateSpeedScore(timeSpent: number, timeLimit: number): number {
    const timeLimitSeconds = timeLimit * 60;
    if (timeSpent <= timeLimitSeconds * 0.5) return 1.0; // Fastest 50% of time limit
    if (timeSpent <= timeLimitSeconds * 0.75) return 0.8; // 50-75% of time limit
    if (timeSpent <= timeLimitSeconds) return 0.6; // 75-100% of time limit
    return Math.max(0.2, 1 - (timeSpent - timeLimitSeconds) / timeLimitSeconds); // Overtime penalty
  }

  private async calculateReasoningScore(caseStudy: AICaseStudy, attempt: CompetitionAttempt): Promise<number> {
    try {
      console.log(`[REASONING] Using OpenAI for advanced clinical reasoning analysis`);
      
      const prompt = `You are an expert physiotherapy educator evaluating clinical reasoning. Score this student's clinical reasoning from 0-100 based on how well they demonstrate understanding of the case.

**Case Information:**
- Patient: ${caseStudy.patientDescription}
- History: ${caseStudy.history}
- Symptoms: ${caseStudy.presentingSymptoms}
- Correct Diagnosis: ${caseStudy.correctDiagnosis}

**Student's Clinical Reasoning:**
"${attempt.userReasoning}"

**Student's Diagnosis:**
"${attempt.userDiagnosis}"

**Evaluation Criteria:**
1. Logical connection between symptoms and diagnosis (40%)
2. Understanding of pathophysiology (30%)
3. Clinical insight and professional reasoning (20%)
4. Clarity and organization of thought (10%)

Respond with ONLY a JSON object in this exact format:
{
  "score": 75,
  "rationale": "Brief explanation of scoring"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(completion.choices[0].message.content || '{"score": 50, "rationale": "Default score"}');
      const score = Math.max(0, Math.min(100, response.score)) / 100;
      
      console.log(`[REASONING] OpenAI reasoning score: ${score} (${response.score}/100)`);
      console.log(`[REASONING] Rationale: ${response.rationale}`);
      
      return score;
    } catch (error) {
      console.error("[REASONING] OpenAI error, using fallback:", error);
      
      // Fallback to quick text analysis if OpenAI fails
      const userText = (attempt.userReasoning || "").toLowerCase();
      const correctDiagnosis = caseStudy.correctDiagnosis.toLowerCase();
      
      let score = 0.3; // Base score
      
      // Check diagnosis accuracy in reasoning
      if (userText.includes(correctDiagnosis) || this.calculateTextSimilarity(userText, correctDiagnosis) > 0.3) {
        score += 0.4;
      }
      
      // Check for clinical keywords
      const clinicalKeywords = ['pain', 'assess', 'examine', 'treatment', 'function', 'mobility', 'strength', 'range'];
      const mentionedKeywords = clinicalKeywords.filter(keyword => userText.includes(keyword));
      score += (mentionedKeywords.length / clinicalKeywords.length) * 0.3;
      
      return Math.max(0, Math.min(1, score));
    }
  }

  private calculateDifferentialScore(caseStudy: AICaseStudy, attempt: CompetitionAttempt): number {
    const correctDifferentials = caseStudy.differentialDiagnoses.map(d => d.toLowerCase());
    const userTests = attempt.assessmentTests.map(t => t.toLowerCase());
    const correctApproaches = caseStudy.correctAssessmentApproach.map(a => a.toLowerCase());
    
    let score = 0;
    let totalRelevant = 0;
    
    // Check if user identified key differential diagnoses through their assessment choices
    correctDifferentials.forEach(differential => {
      totalRelevant++;
      const isIdentified = userTests.some(test => 
        test.includes(differential) || differential.includes(test) ||
        correctApproaches.some(approach => approach.includes(test))
      );
      if (isIdentified) score++;
    });
    
    return totalRelevant > 0 ? score / totalRelevant : 0.5;
  }

  private calculateTreatmentScore(caseStudy: AICaseStudy, attempt: CompetitionAttempt): number {
    const correctTreatment = caseStudy.correctTreatmentApproach.toLowerCase();
    const userTreatment = attempt.proposedTreatment.toLowerCase();
    
    return this.calculateTextSimilarity(correctTreatment, userTreatment);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => 
      words2.some(w2 => w2.includes(word) || word.includes(w2))
    ).length;
    
    return commonWords / Math.max(words1.length, words2.length);
  }

  private async generateCompetitionFeedback(
    caseStudy: AICaseStudy, 
    attempt: CompetitionAttempt, 
    scores: any
  ): Promise<string> {
    try {
      console.log(`[FEEDBACK] Generating OpenAI competitive feedback`);
      
      const prompt = `You are an expert physiotherapy educator providing competitive feedback. Be concise, encouraging, and specific.

**Case:** ${caseStudy.title}
**Correct Diagnosis:** ${caseStudy.correctDiagnosis}
**Student Diagnosis:** ${attempt.userDiagnosis}
**Student Reasoning:** ${attempt.userReasoning}

**Performance Scores:**
- Accuracy: ${scores.accuracy}/100
- Speed: ${scores.speed}/100  
- Reasoning: ${scores.reasoning}/100
- Assessment: ${scores.differential}/100
- Treatment: ${scores.treatment}/100
- **Total: ${scores.total}/100**

Provide feedback in exactly this format:
**Strengths:** [What they did well]
**Areas for Improvement:** [Key points to work on]
**Competitive Tip:** [One specific insight for better performance]

Keep total response under 150 words. Be encouraging but honest about areas needing work.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.2,
      });

      const feedback = response.choices[0].message.content || "Great effort! Keep practicing to improve your clinical reasoning skills.";
      console.log(`[FEEDBACK] Generated feedback (${feedback.length} chars)`);
      return feedback;
    } catch (error) {
      console.error("[FEEDBACK] OpenAI error, using fallback:", error);
      return "Great effort! Keep practicing to improve your clinical reasoning skills.";
    }
  }

  // Daily Challenge Management
  async createTodaysChallenge(): Promise<DailyChallenge | null> {
    const existing = await competitionStorage.getTodaysChallenge();
    if (existing) return existing;

    // Select a random case study for today's challenge
    const caseIds = await competitionStorage.getRandomCaseStudies(undefined, undefined, 10);
    if (caseIds.length === 0) return null;

    const selectedCaseId = caseIds[Math.floor(Math.random() * caseIds.length)];
    const caseStudy = await competitionStorage.getCaseStudyWithCorrectAnswers(selectedCaseId);
    
    if (!caseStudy) return null;

    const challenge = await competitionStorage.createDailyChallenge({
      date: new Date(),
      caseStudyId: selectedCaseId,
      title: `Daily Challenge: ${caseStudy.title}`,
      difficulty: caseStudy.complexity,
      bodyPart: caseStudy.bodyPart,
      participantCount: 0,
      averageScore: 0
    });

    return challenge;
  }

  // Achievement System
  async checkAndAwardAchievements(userId: number, competitionResult: CompetitionResult): Promise<string[]> {
    const achievements: string[] = [];
    const userAchievements = await competitionStorage.getUserAchievements(userId);
    const userHistory = await competitionStorage.getUserCompetitionHistory(userId);

    // Speed Demon Achievement
    if (competitionResult.caseResults.some(r => r.scores.speed >= 90)) {
      await this.checkAchievement(userId, 'speed_demon', userAchievements, 
        'Speed Demon', 'Complete a case in under 50% of time limit', 1);
      achievements.push('Speed Demon');
    }

    // Accuracy Master Achievement  
    if (competitionResult.caseResults.some(r => r.scores.accuracy >= 95)) {
      await this.checkAchievement(userId, 'accuracy_master', userAchievements,
        'Accuracy Master', 'Achieve 95%+ accuracy on a case', 1);
      achievements.push('Accuracy Master');
    }

    // Streak Keeper Achievement
    const recentCompletions = userHistory.filter(h => h.completedAt).slice(0, 7);
    if (recentCompletions.length >= 7) {
      await this.checkAchievement(userId, 'streak_keeper', userAchievements,
        'Streak Keeper', 'Complete 7 competitions in a row', 7);
      achievements.push('Streak Keeper');
    }

    // Case Crusher Achievement
    if (userHistory.length >= 50) {
      await this.checkAchievement(userId, 'case_crusher', userAchievements,
        'Case Crusher', 'Complete 50 competitions', 50);
      achievements.push('Case Crusher');
    }

    return achievements;
  }

  private async checkAchievement(
    userId: number, 
    type: string, 
    userAchievements: any[], 
    title: string, 
    description: string, 
    target: number
  ) {
    const existing = userAchievements.find(a => a.achievementType === type);
    if (!existing) {
      await competitionStorage.createAchievement({
        userId,
        achievementType: type as any,
        title,
        description,
        icon: this.getAchievementIcon(type),
        progress: 1,
        target,
        completed: 1 >= target,
        completedAt: 1 >= target ? new Date() : null
      });
    } else if (!existing.completed && existing.progress + 1 >= target) {
      await competitionStorage.updateAchievementProgress(existing.id, existing.progress + 1);
    }
  }

  private getAchievementIcon(type: string): string {
    const icons: Record<string, string> = {
      speed_demon: 'zap',
      accuracy_master: 'target',
      streak_keeper: 'flame',
      differential_expert: 'brain',
      treatment_guru: 'heart-handshake',
      case_crusher: 'trophy',
      specialty_champion: 'crown',
      quick_thinker: 'lightning',
      research_master: 'book'
    };
    return icons[type] || 'award';
  }

  // Tournament Management
  async createTournamentBrackets(competitionId: number, participantIds: number[]): Promise<void> {
    if (participantIds.length < 2) return;

    // Ensure power of 2 participants for clean brackets
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(participantIds.length)));
    const shuffled = [...participantIds].sort(() => Math.random() - 0.5);
    
    // Fill empty slots with null for byes
    while (shuffled.length < bracketSize) {
      shuffled.push(null as any);
    }

    let round = 1;
    let matchNumber = 1;
    
    // Create first round brackets
    for (let i = 0; i < shuffled.length; i += 2) {
      const participant1 = shuffled[i];
      const participant2 = shuffled[i + 1];
      
      // Skip if both participants are null
      if (!participant1 && !participant2) continue;
      
      // Auto-advance if one participant is null (bye)
      if (!participant1 || !participant2) {
        const winner = participant1 || participant2;
        await competitionStorage.createTournamentBracket({
          competitionId,
          round,
          matchNumber: matchNumber++,
          participant1Id: participant1,
          participant2Id: participant2,
          winnerId: winner,
          participant1Score: 0,
          participant2Score: 0,
          caseStudyId: null,
          completedAt: new Date()
        });
      } else {
        // Regular match
        const caseIds = await competitionStorage.getRandomCaseStudies(undefined, undefined, 1);
        await competitionStorage.createTournamentBracket({
          competitionId,
          round,
          matchNumber: matchNumber++,
          participant1Id: participant1,
          participant2Id: participant2,
          winnerId: null,
          participant1Score: 0,
          participant2Score: 0,
          caseStudyId: caseIds[0] || null,
          completedAt: null
        });
      }
    }
  }

  // Leaderboard Updates
  async updateLeaderboards(userId: number, competitionResult: CompetitionResult): Promise<void> {
    const categories = ['overall', 'speed', 'accuracy'];
    const timeframes = ['daily', 'weekly', 'monthly', 'all_time'];
    
    for (const category of categories) {
      for (const timeframe of timeframes) {
        const score = this.getScoreForCategory(competitionResult, category);
        
        await competitionStorage.updateLeaderboard({
          userId,
          category,
          bodyPart: null,
          timeframe,
          score,
          rank: 1, // Will be recalculated
          gamesPlayed: 1,
          averageScore: score,
          winStreak: competitionResult.rank === 1 ? 1 : 0
        });
      }
    }
  }

  private getScoreForCategory(result: CompetitionResult, category: string): number {
    switch (category) {
      case 'speed':
        return Math.round(result.caseResults.reduce((avg, r) => avg + r.scores.speed, 0) / result.caseResults.length);
      case 'accuracy':
        return Math.round(result.caseResults.reduce((avg, r) => avg + r.scores.accuracy, 0) / result.caseResults.length);
      default:
        return result.totalScore;
    }
  }

  // Competition Management
  async startCompetition(competitionId: number): Promise<void> {
    await competitionStorage.updateCompetitionStatus(competitionId, 'active');
  }

  async endCompetition(competitionId: number): Promise<void> {
    await competitionStorage.updateCompetitionStatus(competitionId, 'completed');
    await competitionStorage.calculateAndUpdateRankings(competitionId);
  }

  async autoManageCompetitions(): Promise<void> {
    const now = new Date();
    
    // Start upcoming competitions
    const upcoming = await competitionStorage.getUpcomingCompetitions();
    for (const competition of upcoming) {
      if (new Date(competition.startTime) <= now) {
        await this.startCompetition(competition.id);
      }
    }
    
    // End active competitions
    const active = await competitionStorage.getActiveCompetitions();
    for (const competition of active) {
      if (new Date(competition.endTime) <= now) {
        await this.endCompetition(competition.id);
      }
    }
  }
}

export const competitionService = new CompetitionService();