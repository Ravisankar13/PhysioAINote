import { db } from './db';
import { competitions, competitionParticipants, users, userAchievements } from '@shared/schema';
import { eq, sql, desc, gte, lte, and, avg, count, min, max } from 'drizzle-orm';

export interface PerformanceTrend {
  period: string;
  averageScore: number;
  participationCount: number;
  averageRank: number;
  improvementRate: number;
}

export interface PeerComparison {
  userId: number;
  username: string;
  averageScore: number;
  participationCount: number;
  winRate: number;
  specialty: string;
}

export interface DetailedAnalytics {
  userId: number;
  overallStats: {
    totalParticipations: number;
    averageScore: number;
    bestScore: number;
    averageRank: number;
    bestRank: number;
    winRate: number;
    improvementTrend: number;
  };
  categoryBreakdown: Array<{
    bodyPart: string;
    participations: number;
    averageScore: number;
    strengths: string[];
    improvements: string[];
  }>;
  performanceTrends: PerformanceTrend[];
  peerComparisons: PeerComparison[];
  achievements: Array<{
    name: string;
    description: string;
    unlockedAt: Date;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }>;
  recommendations: string[];
}

export interface SocialFeatures {
  shareableResults: {
    imageUrl: string;
    text: string;
    hashtags: string[];
  };
  celebrationMessage: string;
  rivalryData: Array<{
    rivalUserId: number;
    rivalUsername: string;
    headToHeadRecord: { wins: number; losses: number; ties: number };
    lastEncounter: Date;
  }>;
}

export class CompetitionAnalyticsService {

  /**
   * Generate comprehensive performance analytics for a user
   */
  async generateDetailedAnalytics(userId: number): Promise<DetailedAnalytics> {
    const [overallStats, categoryBreakdown, performanceTrends, peerComparisons, achievements] = await Promise.all([
      this.calculateOverallStats(userId),
      this.calculateCategoryBreakdown(userId),
      this.calculatePerformanceTrends(userId),
      this.calculatePeerComparisons(userId),
      this.getUserAchievements(userId)
    ]);

    const recommendations = await this.generateRecommendations(userId, categoryBreakdown, performanceTrends);

    return {
      userId,
      overallStats,
      categoryBreakdown,
      performanceTrends,
      peerComparisons,
      achievements,
      recommendations
    };
  }

  /**
   * Calculate overall performance statistics
   */
  private async calculateOverallStats(userId: number): Promise<any> {
    const participations = await db
      .select({
        score: competitionParticipants.finalScore,
        rank: competitionParticipants.ranking,
        competitionDate: competitions.createdAt
      })
      .from(competitionParticipants)
      .innerJoin(competitions, eq(competitions.id, competitionParticipants.competitionId))
      .where(eq(competitionParticipants.userId, userId))
      .orderBy(desc(competitions.createdAt));

    if (participations.length === 0) {
      return {
        totalParticipations: 0,
        averageScore: 0,
        bestScore: 0,
        averageRank: 0,
        bestRank: 0,
        winRate: 0,
        improvementTrend: 0
      };
    }

    const scores = participations.map(p => p.score || 0);
    const ranks = participations.map(p => p.rank || 999);
    
    const totalParticipations = participations.length;
    const averageScore = scores.reduce((a, b) => a + b, 0) / totalParticipations;
    const bestScore = Math.max(...scores);
    const averageRank = ranks.reduce((a, b) => a + b, 0) / totalParticipations;
    const bestRank = Math.min(...ranks);
    const winRate = (ranks.filter(r => r === 1).length / totalParticipations) * 100;

    // Calculate improvement trend (last 5 vs first 5 competitions)
    let improvementTrend = 0;
    if (totalParticipations >= 5) {
      const recent5 = scores.slice(0, 5);
      const first5 = scores.slice(-5);
      const recentAvg = recent5.reduce((a, b) => a + b, 0) / 5;
      const firstAvg = first5.reduce((a, b) => a + b, 0) / 5;
      improvementTrend = ((recentAvg - firstAvg) / firstAvg) * 100;
    }

    return {
      totalParticipations,
      averageScore: Math.round(averageScore * 10) / 10,
      bestScore,
      averageRank: Math.round(averageRank * 10) / 10,
      bestRank,
      winRate: Math.round(winRate * 10) / 10,
      improvementTrend: Math.round(improvementTrend * 10) / 10
    };
  }

  /**
   * Calculate performance breakdown by category
   */
  private async calculateCategoryBreakdown(userId: number): Promise<any[]> {
    const results = await db
      .select({
        bodyPart: competitions.bodyPart,
        score: competitionParticipants.finalScore,
        competitionCount: sql<number>`count(*)`
      })
      .from(competitionParticipants)
      .innerJoin(competitions, eq(competitions.id, competitionParticipants.competitionId))
      .where(eq(competitionParticipants.userId, userId))
      .groupBy(competitions.bodyPart);

    return results.map(result => ({
      bodyPart: result.bodyPart || 'general',
      participations: Number(result.competitionCount),
      averageScore: result.score || 0,
      strengths: this.getBodyPartStrengths(result.bodyPart || 'general', result.score || 0),
      improvements: this.getBodyPartImprovements(result.bodyPart || 'general', result.score || 0)
    }));
  }

  /**
   * Calculate performance trends over time
   */
  private async calculatePerformanceTrends(userId: number): Promise<PerformanceTrend[]> {
    const trends: PerformanceTrend[] = [];
    const periods = ['last_week', 'last_month', 'last_3_months', 'last_6_months'];

    for (const period of periods) {
      const dateFilter = this.getDateFilter(period);
      
      const results = await db
        .select({
          avgScore: sql<number>`avg(${competitionParticipants.finalScore})`,
          avgRank: sql<number>`avg(${competitionParticipants.ranking})`,
          participationCount: sql<number>`count(*)`
        })
        .from(competitionParticipants)
        .innerJoin(competitions, eq(competitions.id, competitionParticipants.competitionId))
        .where(
          and(
            eq(competitionParticipants.userId, userId),
            gte(competitions.createdAt, dateFilter)
          )
        );

      const result = results[0];
      trends.push({
        period,
        averageScore: Math.round((result.avgScore || 0) * 10) / 10,
        participationCount: Number(result.participationCount),
        averageRank: Math.round((result.avgRank || 0) * 10) / 10,
        improvementRate: 0 // Calculate based on previous period
      });
    }

    // Calculate improvement rates
    for (let i = 1; i < trends.length; i++) {
      const current = trends[i - 1];
      const previous = trends[i];
      if (previous.averageScore > 0) {
        current.improvementRate = Math.round(
          ((current.averageScore - previous.averageScore) / previous.averageScore) * 100 * 10
        ) / 10;
      }
    }

    return trends;
  }

  /**
   * Calculate peer comparisons
   */
  private async calculatePeerComparisons(userId: number): Promise<PeerComparison[]> {
    // Get users with similar participation levels
    const userStats = await db
      .select({
        userId: competitionParticipants.userId,
        username: users.username,
        avgScore: sql<number>`avg(${competitionParticipants.finalScore})`,
        participationCount: sql<number>`count(*)`,
        winCount: sql<number>`sum(case when ${competitionParticipants.ranking} = 1 then 1 else 0 end)`
      })
      .from(competitionParticipants)
      .innerJoin(users, eq(users.id, competitionParticipants.userId))
      .where(sql`${competitionParticipants.userId} != ${userId}`)
      .groupBy(competitionParticipants.userId, users.username)
      .having(sql`count(*) >= 3`) // At least 3 participations
      .orderBy(sql`avg(${competitionParticipants.finalScore}) desc`)
      .limit(10);

    return userStats.map(stat => ({
      userId: stat.userId,
      username: stat.username,
      averageScore: Math.round((stat.avgScore || 0) * 10) / 10,
      participationCount: Number(stat.participationCount),
      winRate: Math.round(((stat.winCount || 0) / Number(stat.participationCount)) * 100 * 10) / 10,
      specialty: this.determineSpecialty(stat.userId)
    }));
  }

  /**
   * Get user achievements
   */
  private async getUserAchievements(userId: number): Promise<any[]> {
    const achievements = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));

    return achievements.map(achievement => ({
      name: achievement.name,
      description: achievement.description,
      unlockedAt: achievement.unlockedAt || new Date(),
      rarity: this.determineAchievementRarity(achievement.name)
    }));
  }

  /**
   * Generate personalized recommendations
   */
  private async generateRecommendations(
    userId: number, 
    categoryBreakdown: any[], 
    performanceTrends: PerformanceTrend[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze weak body parts
    const weakestCategory = categoryBreakdown
      .sort((a, b) => a.averageScore - b.averageScore)[0];
    
    if (weakestCategory && weakestCategory.averageScore < 70) {
      recommendations.push(
        `Focus on ${weakestCategory.bodyPart} cases - your average score of ${weakestCategory.averageScore} suggests room for improvement`
      );
    }

    // Analyze participation patterns
    const recentTrend = performanceTrends[0];
    if (recentTrend && recentTrend.participationCount < 3) {
      recommendations.push(
        'Increase participation frequency - regular practice leads to better performance'
      );
    }

    // Analyze improvement trends
    if (recentTrend && recentTrend.improvementRate < -5) {
      recommendations.push(
        'Review your recent performances and identify patterns in mistakes'
      );
    }

    // Add specific study recommendations
    recommendations.push(
      'Practice differential diagnosis skills with our case study library',
      'Review evidence-based treatment protocols in your weak areas',
      'Join themed weeks to focus on specific specialties'
    );

    return recommendations;
  }

  /**
   * Generate social sharing features
   */
  async generateSocialFeatures(userId: number, competitionId: number): Promise<SocialFeatures> {
    const result = await db
      .select({
        score: competitionParticipants.finalScore,
        rank: competitionParticipants.ranking,
        competitionTitle: competitions.title,
        totalParticipants: competitions.currentParticipants
      })
      .from(competitionParticipants)
      .innerJoin(competitions, eq(competitions.id, competitionParticipants.competitionId))
      .where(
        and(
          eq(competitionParticipants.userId, userId),
          eq(competitionParticipants.competitionId, competitionId)
        )
      )
      .limit(1);

    if (!result.length) {
      throw new Error('Competition result not found');
    }

    const { score, rank, competitionTitle, totalParticipants } = result[0];
    
    const shareText = this.generateShareText(score || 0, rank || 0, competitionTitle, totalParticipants || 0);
    const celebrationMessage = this.generateCelebrationMessage(rank || 0, totalParticipants || 0);
    const rivalryData = await this.calculateRivalryData(userId);

    return {
      shareableResults: {
        imageUrl: await this.generateResultsImage(userId, competitionId),
        text: shareText,
        hashtags: ['#PhysioGPT', '#MedicalEducation', '#ClinicalSkills', '#PhysiotherapyCompetition']
      },
      celebrationMessage,
      rivalryData
    };
  }

  /**
   * Calculate rivalry data with frequent competitors
   */
  private async calculateRivalryData(userId: number): Promise<any[]> {
    // Find users who frequently compete in the same competitions
    const rivals = await db
      .select({
        rivalUserId: competitionParticipants.userId,
        rivalUsername: users.username,
        encounterCount: sql<number>`count(*)`,
        wins: sql<number>`sum(case when ${competitionParticipants.ranking} > rival_rank.ranking then 1 else 0 end)`,
        losses: sql<number>`sum(case when ${competitionParticipants.ranking} < rival_rank.ranking then 1 else 0 end)`,
        ties: sql<number>`sum(case when ${competitionParticipants.ranking} = rival_rank.ranking then 1 else 0 end)`,
        lastEncounter: sql<Date>`max(competitions.created_at)`
      })
      .from(competitionParticipants)
      .innerJoin(users, eq(users.id, competitionParticipants.userId))
      .innerJoin(
        sql`competition_participants rival_rank`,
        sql`rival_rank.competition_id = ${competitionParticipants.competitionId} AND rival_rank.user_id = ${userId}`
      )
      .innerJoin(competitions, eq(competitions.id, competitionParticipants.competitionId))
      .where(sql`${competitionParticipants.userId} != ${userId}`)
      .groupBy(competitionParticipants.userId, users.username)
      .having(sql`count(*) >= 3`) // At least 3 encounters
      .orderBy(sql`count(*) desc`)
      .limit(5);

    return rivals.map(rival => ({
      rivalUserId: rival.rivalUserId,
      rivalUsername: rival.rivalUsername,
      headToHeadRecord: {
        wins: Number(rival.wins || 0),
        losses: Number(rival.losses || 0),
        ties: Number(rival.ties || 0)
      },
      lastEncounter: rival.lastEncounter
    }));
  }

  /**
   * Helper methods
   */
  private getDateFilter(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'last_week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last_month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'last_3_months':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'last_6_months':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private getBodyPartStrengths(bodyPart: string, score: number): string[] {
    const strengths: Record<string, string[]> = {
      knee: ['Acute injury assessment', 'Sports medicine protocols', 'Ligament evaluation'],
      shoulder: ['Rotator cuff diagnosis', 'Impingement assessment', 'Manual therapy techniques'],
      back: ['Red flag screening', 'Postural assessment', 'Pain pattern recognition'],
      neck: ['Neurological screening', 'Cervical mobility', 'Headache evaluation'],
      general: ['Clinical reasoning', 'Differential diagnosis', 'Treatment planning']
    };

    return score > 80 ? strengths[bodyPart] || strengths.general : [];
  }

  private getBodyPartImprovements(bodyPart: string, score: number): string[] {
    const improvements: Record<string, string[]> = {
      knee: ['MRI interpretation', 'Biomechanical analysis', 'Return-to-sport protocols'],
      shoulder: ['Arthroscopic findings', 'Throwing mechanics', 'Adhesive capsulitis'],
      back: ['Nerve root compression', 'Spinal instability', 'Psychosocial factors'],
      neck: ['Vascular screening', 'Dizziness evaluation', 'Whiplash mechanisms'],
      general: ['Evidence synthesis', 'Outcome measures', 'Patient communication']
    };

    return score < 70 ? improvements[bodyPart] || improvements.general : [];
  }

  private async determineSpecialty(userId: number): Promise<string> {
    // Analyze user's best performing body parts
    const results = await db
      .select({
        bodyPart: competitions.bodyPart,
        avgScore: sql<number>`avg(${competitionParticipants.finalScore})`
      })
      .from(competitionParticipants)
      .innerJoin(competitions, eq(competitions.id, competitionParticipants.competitionId))
      .where(eq(competitionParticipants.userId, userId))
      .groupBy(competitions.bodyPart)
      .orderBy(sql`avg(${competitionParticipants.finalScore}) desc`)
      .limit(1);

    return results.length > 0 ? `${results[0].bodyPart} specialist` : 'General practitioner';
  }

  private determineAchievementRarity(achievementName: string): 'common' | 'rare' | 'epic' | 'legendary' {
    const rarityMap: Record<string, 'common' | 'rare' | 'epic' | 'legendary'> = {
      'First Victory': 'common',
      'Hat Trick': 'rare',
      'Perfect Score': 'epic',
      'Competition Legend': 'legendary',
      'Speed Demon': 'rare',
      'Accuracy Expert': 'epic'
    };

    return rarityMap[achievementName] || 'common';
  }

  private generateShareText(score: number, rank: number, title: string, totalParticipants: number): string {
    const rankSuffix = (n: number) => {
      if (n === 1) return 'st';
      if (n === 2) return 'nd';
      if (n === 3) return 'rd';
      return 'th';
    };

    if (rank === 1) {
      return `🏆 Just won "${title}" with a score of ${score}! Out of ${totalParticipants} participants, I came out on top! #Victory`;
    } else if (rank <= 3) {
      return `🥉 Finished ${rank}${rankSuffix(rank)} in "${title}" with ${score} points! Great competition with ${totalParticipants} participants.`;
    } else {
      return `Completed "${title}" and scored ${score} points! Ranked ${rank}${rankSuffix(rank)} out of ${totalParticipants} participants. Always learning!`;
    }
  }

  private generateCelebrationMessage(rank: number, totalParticipants: number): string {
    if (rank === 1) {
      return `🎉 Congratulations! You've achieved victory and proven your clinical expertise! 🏆`;
    } else if (rank <= 3) {
      return `🎊 Excellent performance! You've placed in the top 3 among ${totalParticipants} participants! 🥉`;
    } else if (rank <= Math.ceil(totalParticipants * 0.1)) {
      return `⭐ Well done! You've finished in the top 10% of all participants! 📈`;
    } else if (rank <= Math.ceil(totalParticipants * 0.25)) {
      return `👏 Good job! You've placed in the top 25% - keep up the great work! 💪`;
    } else {
      return `🎯 Thank you for participating! Every competition is a learning opportunity. 📚`;
    }
  }

  private async generateResultsImage(userId: number, competitionId: number): Promise<string> {
    // In a real implementation, this would generate an actual image
    // For now, return a placeholder URL
    return `https://api.placeholder.image/600x400/2563eb/white?text=Competition+Results+-+User+${userId}+-+Competition+${competitionId}`;
  }
}

export const competitionAnalyticsService = new CompetitionAnalyticsService();