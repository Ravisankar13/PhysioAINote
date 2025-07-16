import { MailService } from '@sendgrid/mail';
import { db } from './db';
import { users, emailCampaigns, emailCampaignRecipients, competitions } from '../shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

interface BulkEmailOptions {
  targetAudience: 'all' | 'competition_subscribers' | 'premium_users' | 'pattern_recognition_players';
  competitionId?: number;
  scheduledFor?: Date;
}

export class BulkEmailService {
  private mailService: MailService;

  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY environment variable must be set");
    }
    
    this.mailService = new MailService();
    this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
  }

  /**
   * Create and send a Pattern Recognition competition announcement
   */
  async sendPatternRecognitionAnnouncement(
    sentByUserId: number,
    options: BulkEmailOptions = { targetAudience: 'competition_subscribers' }
  ): Promise<{ campaignId: number; recipientCount: number }> {
    
    // Get Pattern Recognition competition details
    const competition = await db.query.competitions.findFirst({
      where: eq(competitions.id, 107) // Pattern Recognition competition ID
    });

    if (!competition) {
      throw new Error('Pattern Recognition competition not found');
    }

    const emailTemplate = this.generatePatternRecognitionTemplate(competition);
    
    return await this.createAndSendCampaign({
      title: `Pattern Recognition Challenge - ${new Date().toLocaleDateString()}`,
      template: emailTemplate,
      sentByUserId,
      competitionId: competition.id,
      ...options
    });
  }

  /**
   * Create and send a custom email campaign
   */
  async createAndSendCampaign(params: {
    title: string;
    template: EmailTemplate;
    sentByUserId: number;
    competitionId?: number;
    targetAudience: string;
    scheduledFor?: Date;
  }): Promise<{ campaignId: number; recipientCount: number }> {
    
    // Create campaign record
    const [campaign] = await db.insert(emailCampaigns).values({
      title: params.title,
      subject: params.template.subject,
      htmlContent: params.template.htmlContent,
      textContent: params.template.textContent,
      targetAudience: params.targetAudience,
      competitionId: params.competitionId,
      sentBy: params.sentByUserId,
      scheduledFor: params.scheduledFor,
      status: params.scheduledFor ? 'scheduled' : 'sending'
    }).returning();

    // Get recipients based on target audience
    const recipients = await this.getRecipients(params.targetAudience);
    
    // Insert recipients
    const recipientRecords = recipients.map(user => ({
      campaignId: campaign.id,
      userId: user.id,
      email: user.email!,
      status: 'pending' as const
    }));

    await db.insert(emailCampaignRecipients).values(recipientRecords);

    // Update campaign with recipient count
    await db.update(emailCampaigns)
      .set({ recipientCount: recipients.length })
      .where(eq(emailCampaigns.id, campaign.id));

    // Send emails immediately if not scheduled
    if (!params.scheduledFor) {
      await this.sendCampaignEmails(campaign.id);
    }

    return {
      campaignId: campaign.id,
      recipientCount: recipients.length
    };
  }

  /**
   * Send emails for a specific campaign
   */
  async sendCampaignEmails(campaignId: number): Promise<void> {
    const campaign = await db.query.emailCampaigns.findFirst({
      where: eq(emailCampaigns.id, campaignId)
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const recipients = await db.query.emailCampaignRecipients.findMany({
      where: and(
        eq(emailCampaignRecipients.campaignId, campaignId),
        eq(emailCampaignRecipients.status, 'pending')
      )
    });

    let successCount = 0;
    let failureCount = 0;

    // Send emails in batches to avoid rate limiting
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (recipient) => {
          try {
            await this.mailService.send({
              to: recipient.email,
              from: {
                email: 'notifications@physiogpt.com',
                name: 'PhysioGPT Team'
              },
              subject: campaign.subject,
              html: campaign.htmlContent,
              text: campaign.textContent,
              trackingSettings: {
                clickTracking: { enable: true },
                openTracking: { enable: true }
              }
            });

            // Update recipient status
            await db.update(emailCampaignRecipients)
              .set({ 
                status: 'sent',
                sentAt: new Date()
              })
              .where(eq(emailCampaignRecipients.id, recipient.id));

            successCount++;
          } catch (error) {
            // Update recipient with error
            await db.update(emailCampaignRecipients)
              .set({ 
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
              })
              .where(eq(emailCampaignRecipients.id, recipient.id));

            failureCount++;
            console.error(`Failed to send email to ${recipient.email}:`, error);
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    await db.update(emailCampaigns)
      .set({ 
        status: 'sent',
        sentAt: new Date()
      })
      .where(eq(emailCampaigns.id, campaignId));

    console.log(`Campaign ${campaignId} completed: ${successCount} sent, ${failureCount} failed`);
  }

  /**
   * Get recipients based on target audience
   */
  private async getRecipients(targetAudience: string) {
    let whereCondition;

    switch (targetAudience) {
      case 'all':
        whereCondition = isNotNull(users.email);
        break;
      case 'competition_subscribers':
        whereCondition = and(
          isNotNull(users.email),
          eq(users.competitionNotifications, true)
        );
        break;
      case 'premium_users':
        whereCondition = and(
          isNotNull(users.email),
          eq(users.membershipTier, 'premium')
        );
        break;
      case 'pattern_recognition_players':
        // Users who have participated in Pattern Recognition
        whereCondition = and(
          isNotNull(users.email),
          eq(users.competitionNotifications, true)
        );
        break;
      default:
        whereCondition = and(
          isNotNull(users.email),
          eq(users.emailNotifications, true)
        );
    }

    return await db.query.users.findMany({
      where: whereCondition,
      columns: {
        id: true,
        email: true,
        username: true,
        fullName: true
      }
    });
  }

  /**
   * Generate Pattern Recognition email template
   */
  private generatePatternRecognitionTemplate(competition: any): EmailTemplate {
    const subject = "🎯 New Pattern Recognition Challenge - Test Your Diagnostic Skills!";
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pattern Recognition Challenge</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
          .highlight { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Pattern Recognition Challenge</h1>
            <p>Ready to test your diagnostic expertise?</p>
          </div>
          
          <div class="content">
            <h2>New Challenge Available!</h2>
            <p>A fresh Pattern Recognition challenge is now live on PhysioGPT! Test your clinical reasoning skills with 100 diagnostic questions covering multiple body systems.</p>
            
            <div class="highlight">
              <strong>Challenge Details:</strong><br>
              • 100 Clinical Questions<br>
              • 5 Minutes to Complete<br>
              • Real-time Leaderboard Rankings<br>
              • Instant AI Feedback<br>
              • Multiple Body Parts Coverage
            </div>

            <div class="stats">
              <h3>Current Competition Stats</h3>
              <p><strong>Active Players:</strong> Growing community</p>
              <p><strong>Challenge Type:</strong> Rapid Diagnostic Assessment</p>
              <p><strong>Difficulty:</strong> Mixed (Beginner to Advanced)</p>
            </div>

            <center>
              <a href="https://physiogpt.replit.app/game-competition/107" class="cta-button">
                🚀 Join Challenge Now
              </a>
            </center>

            <p>Compete against fellow physiotherapists and see how your diagnostic skills stack up on our live leaderboard!</p>

            <h3>Why Participate?</h3>
            <ul>
              <li><strong>Sharpen Skills:</strong> Test pattern recognition across body systems</li>
              <li><strong>Quick Challenge:</strong> Only 5 minutes required</li>
              <li><strong>Instant Feedback:</strong> Learn from AI-powered analysis</li>
              <li><strong>Community Rankings:</strong> See how you compare with peers</li>
              <li><strong>Continuous Learning:</strong> New questions regularly added</li>
            </ul>

            <div class="highlight">
              <strong>💡 Pro Tip:</strong> The best scores come from quick, confident decision-making based on pattern recognition rather than extended analysis!
            </div>
          </div>

          <div class="footer">
            <p><strong>PhysioGPT</strong> - Advancing Physiotherapy Education Through AI</p>
            <p>Don't want these emails? <a href="#" style="color: #aaa;">Update preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Pattern Recognition Challenge - PhysioGPT

A new Pattern Recognition challenge is now live!

Challenge Details:
- 100 Clinical Questions
- 5 Minutes to Complete  
- Real-time Leaderboard Rankings
- Instant AI Feedback
- Multiple Body Parts Coverage

Join the challenge: https://physiogpt.replit.app/game-competition/107

Why Participate?
• Sharpen your diagnostic pattern recognition skills
• Quick 5-minute assessment
• Instant AI-powered feedback
• Compare with fellow physiotherapists
• Continuous learning opportunities

Join now and see how your diagnostic skills rank!

PhysioGPT Team
    `;

    return { subject, htmlContent, textContent };
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: number) {
    const campaign = await db.query.emailCampaigns.findFirst({
      where: eq(emailCampaigns.id, campaignId)
    });

    const recipients = await db.query.emailCampaignRecipients.findMany({
      where: eq(emailCampaignRecipients.campaignId, campaignId)
    });

    const sentCount = recipients.filter(r => r.status === 'sent').length;
    const failedCount = recipients.filter(r => r.status === 'failed').length;
    const pendingCount = recipients.filter(r => r.status === 'pending').length;

    return {
      campaign,
      stats: {
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
        pending: pendingCount,
        successRate: recipients.length > 0 ? (sentCount / recipients.length) * 100 : 0
      }
    };
  }
}

export const bulkEmailService = new BulkEmailService();