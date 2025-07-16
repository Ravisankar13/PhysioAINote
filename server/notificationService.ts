// SendGrid functionality removed for deployment compatibility
import { db } from './db';
import { users, competitions, competitionParticipants } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface NotificationTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface CompetitionNotification {
  type: 'upcoming' | 'starting' | 'ended' | 'leaderboard' | 'registration_reminder';
  competitionId: number;
  userId?: number;
  data?: any;
}

export class NotificationService {
  private inAppNotifications: Map<number, any[]> = new Map(); // userId -> notifications

  constructor() {
    // Email functionality disabled for deployment compatibility
  }

  /**
   * Send email notification (disabled for deployment compatibility)
   */
  async sendEmailNotification(
    to: string,
    template: NotificationTemplate,
    fromEmail: string = 'noreply@physiogpt.com'
  ): Promise<boolean> {
    console.log('📧 Email functionality disabled for deployment compatibility');
    console.log(`📧 Would have sent email to ${to}: ${template.subject}`);
    return false;
  }

  /**
   * Add in-app notification
   */
  async addInAppNotification(userId: number, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
    read?: boolean;
  }): Promise<void> {
    const userNotifications = this.inAppNotifications.get(userId) || [];
    
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification
    };

    userNotifications.unshift(newNotification);
    
    // Keep only last 50 notifications per user
    if (userNotifications.length > 50) {
      userNotifications.splice(50);
    }
    
    this.inAppNotifications.set(userId, userNotifications);
    console.log(`🔔 In-app notification added for user ${userId}: ${notification.title}`);
  }

  /**
   * Get in-app notifications for user
   */
  getInAppNotifications(userId: number): any[] {
    return this.inAppNotifications.get(userId) || [];
  }

  /**
   * Mark notification as read
   */
  markNotificationRead(userId: number, notificationId: number): boolean {
    const notifications = this.inAppNotifications.get(userId);
    if (!notifications) return false;

    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  /**
   * Send competition starting notifications (30 minutes before)
   */
  async sendCompetitionStartingNotifications(): Promise<void> {
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    // Find competitions starting in ~30 minutes
    const upcomingCompetitions = await db
      .select()
      .from(competitions)
      .where(
        and(
          eq(competitions.status, 'upcoming'),
          gte(competitions.startTime, now),
          lte(competitions.startTime, thirtyMinutesFromNow)
        )
      );

    for (const competition of upcomingCompetitions) {
      // Get registered participants
      const participants = await db
        .select({
          userId: competitionParticipants.userId,
          email: users.email,
          username: users.username
        })
        .from(competitionParticipants)
        .innerJoin(users, eq(users.id, competitionParticipants.userId))
        .where(eq(competitionParticipants.competitionId, competition.id));

      for (const participant of participants) {
        // Send email notification
        if (participant.email) {
          const template = this.getCompetitionStartingTemplate(competition, participant.username);
          await this.sendEmailNotification(participant.email, template);
        }

        // Send in-app notification
        await this.addInAppNotification(participant.userId, {
          type: 'competition_starting',
          title: 'Competition Starting Soon!',
          message: `${competition.title} starts in 30 minutes. Get ready!`,
          data: { competitionId: competition.id }
        });
      }
    }
  }

  /**
   * Send competition ended notifications with results
   */
  async sendCompetitionEndedNotifications(competitionId: number): Promise<void> {
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, competitionId))
      .limit(1);

    if (!competition.length) return;

    // Get final results
    const results = await db
      .select({
        userId: competitionParticipants.userId,
        email: users.email,
        username: users.username,
        finalScore: competitionParticipants.finalScore,
        ranking: competitionParticipants.ranking
      })
      .from(competitionParticipants)
      .innerJoin(users, eq(users.id, competitionParticipants.userId))
      .where(eq(competitionParticipants.competitionId, competitionId))
      .orderBy(competitionParticipants.ranking);

    for (const result of results) {
      // Send email notification
      if (result.email) {
        const template = this.getCompetitionEndedTemplate(competition[0], result);
        await this.sendEmailNotification(result.email, template);
      }

      // Send in-app notification
      await this.addInAppNotification(result.userId, {
        type: 'competition_ended',
        title: 'Competition Results Available!',
        message: `${competition[0].title} has ended. You ranked #${result.ranking || 'N/A'}!`,
        data: { 
          competitionId: competitionId, 
          score: result.finalScore,
          ranking: result.ranking
        }
      });
    }
  }

  /**
   * Send leaderboard position update notifications
   */
  async sendLeaderboardUpdateNotification(userId: number, newPosition: number, category: string): Promise<void> {
    await this.addInAppNotification(userId, {
      type: 'leaderboard_update',
      title: 'Leaderboard Update!',
      message: `You're now ranked #${newPosition} in ${category}!`,
      data: { position: newPosition, category }
    });
  }

  /**
   * Get competition starting email template
   */
  private getCompetitionStartingTemplate(competition: any, username: string): NotificationTemplate {
    return {
      subject: `🏆 ${competition.title} starts in 30 minutes!`,
      text: `Hi ${username},\n\nYour registered competition "${competition.title}" starts in 30 minutes.\n\nCompetition Details:\n- Start Time: ${competition.startTime}\n- Duration: ${competition.timeLimit} minutes\n- Difficulty: ${competition.difficulty}\n\nGet ready and good luck!\n\nPhysioGPT Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🏆 Competition Starting Soon!</h2>
          <p>Hi ${username},</p>
          <p>Your registered competition <strong>"${competition.title}"</strong> starts in 30 minutes.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Competition Details:</h3>
            <ul>
              <li><strong>Start Time:</strong> ${new Date(competition.startTime).toLocaleString()}</li>
              <li><strong>Duration:</strong> ${competition.timeLimit} minutes</li>
              <li><strong>Difficulty:</strong> ${competition.difficulty}</li>
              <li><strong>Body Part:</strong> ${competition.bodyPart || 'General'}</li>
            </ul>
          </div>
          
          <p>Get ready and good luck! 🍀</p>
          <p>Best regards,<br>The PhysioGPT Team</p>
        </div>
      `
    };
  }

  /**
   * Get competition ended email template
   */
  private getCompetitionEndedTemplate(competition: any, result: any): NotificationTemplate {
    const rankSuffix = (rank: number) => {
      if (rank === 1) return 'st';
      if (rank === 2) return 'nd';
      if (rank === 3) return 'rd';
      return 'th';
    };

    return {
      subject: `📊 ${competition.title} Results - You ranked #${result.ranking}!`,
      text: `Hi ${result.username},\n\nThe competition "${competition.title}" has ended!\n\nYour Results:\n- Final Score: ${result.finalScore || 0} points\n- Ranking: #${result.ranking || 'N/A'}\n\nThank you for participating!\n\nPhysioGPT Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">📊 Competition Results</h2>
          <p>Hi ${result.username},</p>
          <p>The competition <strong>"${competition.title}"</strong> has ended!</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your Results:</h3>
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 48px; font-weight: bold; color: #059669;">
                #${result.ranking || 'N/A'}
              </div>
              <div style="font-size: 18px; margin: 10px 0;">
                ${result.ranking ? `${result.ranking}${rankSuffix(result.ranking)} Place` : 'Participated'}
              </div>
              <div style="font-size: 16px; color: #6b7280;">
                Score: ${result.finalScore || 0} points
              </div>
            </div>
          </div>
          
          <p>Thank you for participating! Keep competing to improve your skills. 🎯</p>
          <p>Best regards,<br>The PhysioGPT Team</p>
        </div>
      `
    };
  }
}

export const notificationService = new NotificationService();