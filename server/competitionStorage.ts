import { db } from "./db";
import { 
  competitions, 
  competitionParticipants, 
  dailyChallenges, 
  userAchievements, 
  leaderboards, 
  tournamentBrackets,
  aiCaseStudies,
  users,
  type Competition,
  type InsertCompetition,
  type CompetitionParticipant,
  type InsertCompetitionParticipant,
  type DailyChallenge,
  type InsertDailyChallenge,
  type UserAchievement,
  type InsertUserAchievement,
  type Leaderboard,
  type InsertLeaderboard,
  type TournamentBracket,
  type InsertTournamentBracket,
} from "@shared/schema";
import { eq, desc, asc, and, gte, lte, isNull, sql, inArray } from "drizzle-orm";

export class CompetitionStorage {
  // Competition Management
  async createCompetition(competition: InsertCompetition): Promise<Competition> {
    const [newCompetition] = await db
      .insert(competitions)
      .values(competition)
      .returning();
    return newCompetition;
  }

  async getActiveCompetitions(): Promise<Competition[]> {
    return await db
      .select()
      .from(competitions)
      .where(eq(competitions.status, "active"))
      .orderBy(desc(competitions.startTime));
  }

  async getUpcomingCompetitions(): Promise<Competition[]> {
    return await db
      .select()
      .from(competitions)
      .where(eq(competitions.status, "upcoming"))
      .orderBy(asc(competitions.startTime));
  }

  async getCompetitionById(id: number): Promise<Competition | undefined> {
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, id));
    return competition;
  }

  async getCompetitionsByType(type: string): Promise<Competition[]> {
    return await db
      .select()
      .from(competitions)
      .where(eq(competitions.type, type as any))
      .orderBy(desc(competitions.startTime));
  }

  async updateCompetitionStatus(id: number, status: string): Promise<Competition> {
    const [updated] = await db
      .update(competitions)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(competitions.id, id))
      .returning();
    return updated;
  }

  // Participant Management
  async joinCompetition(data: InsertCompetitionParticipant): Promise<CompetitionParticipant> {
    const [participant] = await db
      .insert(competitionParticipants)
      .values(data)
      .returning();
    return participant;
  }

  async getCompetitionParticipants(competitionId: number): Promise<CompetitionParticipant[]> {
    return await db
      .select()
      .from(competitionParticipants)
      .where(eq(competitionParticipants.competitionId, competitionId))
      .orderBy(desc(competitionParticipants.totalScore));
  }

  async getParticipantByUserAndCompetition(userId: number, competitionId: number): Promise<CompetitionParticipant | undefined> {
    const [participant] = await db
      .select()
      .from(competitionParticipants)
      .where(
        and(
          eq(competitionParticipants.userId, userId),
          eq(competitionParticipants.competitionId, competitionId)
        )
      );
    return participant;
  }

  async updateParticipant(id: number, data: Partial<CompetitionParticipant>): Promise<CompetitionParticipant> {
    const [updated] = await db
      .update(competitionParticipants)
      .set(data)
      .where(eq(competitionParticipants.id, id))
      .returning();
    return updated;
  }

  async calculateAndUpdateRankings(competitionId: number): Promise<void> {
    // Get all participants sorted by score
    const participants = await db
      .select()
      .from(competitionParticipants)
      .where(eq(competitionParticipants.competitionId, competitionId))
      .orderBy(desc(competitionParticipants.totalScore));

    // Update ranks
    for (let i = 0; i < participants.length; i++) {
      await db
        .update(competitionParticipants)
        .set({ rank: i + 1 })
        .where(eq(competitionParticipants.id, participants[i].id));
    }
  }

  // Daily Challenges
  async getTodaysChallenge(): Promise<DailyChallenge | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [challenge] = await db
      .select()
      .from(dailyChallenges)
      .where(gte(dailyChallenges.date, today));
    return challenge;
  }

  async createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge> {
    const [newChallenge] = await db
      .insert(dailyChallenges)
      .values(challenge)
      .returning();
    return newChallenge;
  }

  async getRecentChallenges(limit: number = 10): Promise<DailyChallenge[]> {
    return await db
      .select()
      .from(dailyChallenges)
      .orderBy(desc(dailyChallenges.date))
      .limit(limit);
  }

  async updateChallengeStats(challengeId: number, participantCount: number, averageScore: number): Promise<void> {
    await db
      .update(dailyChallenges)
      .set({ participantCount, averageScore })
      .where(eq(dailyChallenges.id, challengeId));
  }

  // Achievements
  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.earnedAt));
  }

  async createAchievement(achievement: InsertUserAchievement): Promise<UserAchievement> {
    const [newAchievement] = await db
      .insert(userAchievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }

  async updateAchievementProgress(id: number, progress: number): Promise<UserAchievement> {
    const completed = progress >= (await this.getAchievementTarget(id));
    const [updated] = await db
      .update(userAchievements)
      .set({ 
        progress, 
        completed,
        completedAt: completed ? new Date() : null 
      })
      .where(eq(userAchievements.id, id))
      .returning();
    return updated;
  }

  private async getAchievementTarget(achievementId: number): Promise<number> {
    const [achievement] = await db
      .select({ target: userAchievements.target })
      .from(userAchievements)
      .where(eq(userAchievements.id, achievementId));
    return achievement?.target || 0;
  }

  // Leaderboards
  async getLeaderboard(category: string, timeframe: string, bodyPart?: string): Promise<Leaderboard[]> {
    let query = db
      .select({
        id: leaderboards.id,
        userId: leaderboards.userId,
        category: leaderboards.category,
        bodyPart: leaderboards.bodyPart,
        timeframe: leaderboards.timeframe,
        score: leaderboards.score,
        rank: leaderboards.rank,
        gamesPlayed: leaderboards.gamesPlayed,
        averageScore: leaderboards.averageScore,
        winStreak: leaderboards.winStreak,
        lastUpdated: leaderboards.lastUpdated,
        username: users.username,
        fullName: users.fullName
      })
      .from(leaderboards)
      .leftJoin(users, eq(leaderboards.userId, users.id))
      .where(
        and(
          eq(leaderboards.category, category),
          eq(leaderboards.timeframe, timeframe)
        )
      );

    if (bodyPart) {
      query = query.where(eq(leaderboards.bodyPart, bodyPart as any));
    } else {
      query = query.where(isNull(leaderboards.bodyPart));
    }

    return await query.orderBy(asc(leaderboards.rank));
  }

  async updateLeaderboard(data: InsertLeaderboard): Promise<Leaderboard> {
    // Check if entry exists
    const existing = await db
      .select()
      .from(leaderboards)
      .where(
        and(
          eq(leaderboards.userId, data.userId),
          eq(leaderboards.category, data.category),
          eq(leaderboards.timeframe, data.timeframe),
          data.bodyPart 
            ? eq(leaderboards.bodyPart, data.bodyPart)
            : isNull(leaderboards.bodyPart)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(leaderboards)
        .set({ ...data, lastUpdated: new Date() })
        .where(eq(leaderboards.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(leaderboards)
        .values(data)
        .returning();
      return created;
    }
  }

  // Tournament Brackets
  async createTournamentBracket(bracket: InsertTournamentBracket): Promise<TournamentBracket> {
    const [newBracket] = await db
      .insert(tournamentBrackets)
      .values(bracket)
      .returning();
    return newBracket;
  }

  async getTournamentBrackets(competitionId: number): Promise<TournamentBracket[]> {
    return await db
      .select()
      .from(tournamentBrackets)
      .where(eq(tournamentBrackets.competitionId, competitionId))
      .orderBy(asc(tournamentBrackets.round), asc(tournamentBrackets.matchNumber));
  }

  async updateBracketMatch(id: number, winnerId: number, scores: { p1Score: number, p2Score: number }): Promise<TournamentBracket> {
    const [updated] = await db
      .update(tournamentBrackets)
      .set({
        winnerId,
        participant1Score: scores.p1Score,
        participant2Score: scores.p2Score,
        completedAt: new Date()
      })
      .where(eq(tournamentBrackets.id, id))
      .returning();
    return updated;
  }

  // Case Study Selection for Competitions
  async getRandomCaseStudies(bodyPart?: string, difficulty?: string, limit: number = 5): Promise<number[]> {
    let query = db
      .select({ id: aiCaseStudies.id })
      .from(aiCaseStudies);

    const conditions = [];
    if (bodyPart) {
      conditions.push(eq(aiCaseStudies.bodyPart, bodyPart as any));
    }
    if (difficulty) {
      conditions.push(eq(aiCaseStudies.complexity, difficulty));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(sql`random()`)
      .limit(limit);

    return results.map(r => r.id);
  }

  async getCaseStudyWithCorrectAnswers(id: number) {
    const [caseStudy] = await db
      .select()
      .from(aiCaseStudies)
      .where(eq(aiCaseStudies.id, id));
    return caseStudy;
  }

  // Competition Analytics
  async getCompetitionStats(competitionId: number) {
    const participants = await this.getCompetitionParticipants(competitionId);
    
    const totalParticipants = participants.length;
    const completedParticipants = participants.filter(p => p.completedAt).length;
    const averageScore = participants.reduce((sum, p) => sum + (p.totalScore || 0), 0) / totalParticipants || 0;
    const averageTime = participants
      .filter(p => p.timeSpent)
      .reduce((sum, p) => sum + p.timeSpent, 0) / completedParticipants || 0;

    return {
      totalParticipants,
      completedParticipants,
      averageScore: Math.round(averageScore),
      averageTimeSeconds: Math.round(averageTime),
      completionRate: totalParticipants > 0 ? (completedParticipants / totalParticipants * 100) : 0
    };
  }

  async getUserCompetitionHistory(userId: number): Promise<CompetitionParticipant[]> {
    return await db
      .select()
      .from(competitionParticipants)
      .where(eq(competitionParticipants.userId, userId))
      .orderBy(desc(competitionParticipants.joinedAt));
  }

  async getTopPerformers(limit: number = 10): Promise<any[]> {
    return await db
      .select({
        userId: competitionParticipants.userId,
        username: users.username,
        fullName: users.fullName,
        totalCompetitions: sql<number>`count(*)`,
        averageScore: sql<number>`avg(${competitionParticipants.totalScore})`,
        bestScore: sql<number>`max(${competitionParticipants.totalScore})`,
        averageRank: sql<number>`avg(${competitionParticipants.rank})`
      })
      .from(competitionParticipants)
      .leftJoin(users, eq(competitionParticipants.userId, users.id))
      .where(eq(competitionParticipants.completedAt, sql`not null`))
      .groupBy(competitionParticipants.userId, users.username, users.fullName)
      .orderBy(desc(sql`avg(${competitionParticipants.totalScore})`))
      .limit(limit);
  }
}

export const competitionStorage = new CompetitionStorage();