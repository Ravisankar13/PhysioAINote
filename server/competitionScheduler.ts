import { eq, and, lte, gte, lt, inArray } from 'drizzle-orm';
import { db } from './db.js';
import { competitions, complexCases } from '../shared/schema.js';
import { complexCaseCompetitionService } from './complexCaseCompetitionService.js';
import { competitionStorage } from './competitionStorage.js';

/**
 * Competition Scheduler Service
 * Handles automatic lifecycle management for competitions
 */
export class CompetitionScheduler {
  private isRunning = false;

  /**
   * Main scheduler function that runs all lifecycle checks
   */
  async runScheduledTasks(): Promise<void> {
    if (this.isRunning) {
      console.log('⏰ [SCHEDULER] Already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('⏰ [SCHEDULER] Starting scheduled tasks...');
      
      await this.openRegistrations();
      await this.closeRegistrations();
      await this.startCompetitions();
      await this.endCompetitions();
      await this.archiveOldCompetitions();
      await this.createDailyCompetitions();
      
      const duration = Date.now() - startTime;
      console.log(`⏰ [SCHEDULER] Completed all tasks in ${duration}ms`);
      
    } catch (error) {
      console.error('⏰ [SCHEDULER] Error in scheduled tasks:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Opens registration for competitions that should be accepting participants
   * Works with existing status: upcoming -> upcoming (registration open)
   */
  async openRegistrations(): Promise<void> {
    const now = new Date();
    
    try {
      // For now, we'll work with existing statuses
      // Future competitions in 'upcoming' status that have registration_opens_at field
      const competitionsToOpen = await db
        .select()
        .from(competitions)
        .where(
          and(
            eq(competitions.status, 'upcoming'),
            lte(competitions.registrationOpensAt, now),
            gte(competitions.startTime, now) // Not yet started
          )
        );

      // Mark as registration open by logging (status remains 'upcoming')
      for (const competition of competitionsToOpen) {
        console.log(`⏰ [SCHEDULER] Registration now open for: ${competition.title} (ID: ${competition.id})`);
      }
      
      if (competitionsToOpen.length > 0) {
        console.log(`⏰ [SCHEDULER] Registration opened for ${competitionsToOpen.length} competitions`);
      }
    } catch (error) {
      console.error('⏰ [SCHEDULER] Error opening registrations:', error);
    }
  }

  /**
   * Closes registration for competitions approaching their start time
   * Works with existing status: upcoming -> upcoming (registration closed)
   */
  async closeRegistrations(): Promise<void> {
    const now = new Date();
    
    try {
      const competitionsToClose = await db
        .select()
        .from(competitions)
        .where(
          and(
            eq(competitions.status, 'upcoming'),
            lte(competitions.registrationDeadline, now),
            gte(competitions.startTime, now) // Not yet started
          )
        );

      // Log registration close (status remains 'upcoming')
      for (const competition of competitionsToClose) {
        console.log(`⏰ [SCHEDULER] Registration closed for: ${competition.title} (ID: ${competition.id})`);
      }
      
      if (competitionsToClose.length > 0) {
        console.log(`⏰ [SCHEDULER] Registration closed for ${competitionsToClose.length} competitions`);
      }
    } catch (error) {
      console.error('⏰ [SCHEDULER] Error closing registrations:', error);
    }
  }

  /**
   * Starts competitions that should now be active
   */
  async startCompetitions(): Promise<void> {
    const now = new Date();
    
    try {
      const competitionsToStart = await db
        .select()
        .from(competitions)
        .where(
          and(
            eq(competitions.status, 'upcoming'),
            lte(competitions.startTime, now)
          )
        );

      for (const competition of competitionsToStart) {
        await db
          .update(competitions)
          .set({ status: 'active' })
          .where(eq(competitions.id, competition.id));
        
        console.log(`⏰ [SCHEDULER] Started competition: ${competition.title} (ID: ${competition.id})`);
      }
      
      if (competitionsToStart.length > 0) {
        console.log(`⏰ [SCHEDULER] Started ${competitionsToStart.length} competitions`);
      }
    } catch (error) {
      console.error('⏰ [SCHEDULER] Error starting competitions:', error);
    }
  }

  /**
   * Ends competitions that have reached their end time
   */
  async endCompetitions(): Promise<void> {
    const now = new Date();
    
    try {
      const competitionsToEnd = await db
        .select()
        .from(competitions)
        .where(
          and(
            eq(competitions.status, 'active'),
            lte(competitions.endTime, now)
          )
        );

      for (const competition of competitionsToEnd) {
        await db
          .update(competitions)
          .set({ status: 'completed' })
          .where(eq(competitions.id, competition.id));
        
        // Calculate final rankings
        await competitionStorage.calculateAndUpdateRankings(competition.id);
        
        console.log(`⏰ [SCHEDULER] Ended competition: ${competition.title} (ID: ${competition.id})`);
      }
      
      if (competitionsToEnd.length > 0) {
        console.log(`⏰ [SCHEDULER] Ended ${competitionsToEnd.length} competitions`);
      }
    } catch (error) {
      console.error('⏰ [SCHEDULER] Error ending competitions:', error);
    }
  }

  /**
   * Archives old completed competitions (older than 30 days)
   * Note: 'archived' status may not exist in current DB, just log for now
   */
  async archiveOldCompetitions(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    try {
      const competitionsToArchive = await db
        .select()
        .from(competitions)
        .where(
          and(
            eq(competitions.status, 'completed'),
            lt(competitions.endTime, thirtyDaysAgo)
          )
        );

      // For now just log since 'archived' status may not exist
      for (const competition of competitionsToArchive) {
        console.log(`⏰ [SCHEDULER] Would archive competition: ${competition.title} (ID: ${competition.id})`);
        // TODO: Implement archiving when archived status is available
        // await db.update(competitions).set({ status: 'archived' }).where(eq(competitions.id, competition.id));
      }
      
      if (competitionsToArchive.length > 0) {
        console.log(`⏰ [SCHEDULER] Found ${competitionsToArchive.length} old competitions for archiving`);
      }
    } catch (error) {
      console.error('⏰ [SCHEDULER] Error archiving competitions:', error);
    }
  }

  /**
   * Creates daily competitions for tomorrow if they don't exist
   */
  async createDailyCompetitions(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Start of tomorrow
    
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999); // End of tomorrow
    
    try {
      // Check if competitions already exist for tomorrow
      const existingCompetitions = await db
        .select()
        .from(competitions)
        .where(
          and(
            gte(competitions.startTime, tomorrow),
            lte(competitions.startTime, endOfTomorrow),
            eq(competitions.isAutoGenerated, true)
          )
        );

      if (existingCompetitions.length > 0) {
        console.log(`⏰ [SCHEDULER] Tomorrow already has ${existingCompetitions.length} auto-generated competitions`);
        return;
      }

      // Get available complex cases
      const availableCases = await db.select().from(complexCases).limit(20);
      
      if (availableCases.length === 0) {
        console.log('⏰ [SCHEDULER] No complex cases available for competition creation');
        return;
      }

      // Create morning competition (9 AM)
      const morningTime = new Date(tomorrow);
      morningTime.setHours(9, 0, 0, 0);
      await this.createScheduledCompetition({
        title: `Morning Clinical Challenge - ${morningTime.toDateString()}`,
        description: 'Start your day with a challenging clinical reasoning competition',
        startTime: morningTime,
        timeSlot: 'morning',
        availableCases
      });

      // Create afternoon competition (2 PM)
      const afternoonTime = new Date(tomorrow);
      afternoonTime.setHours(14, 0, 0, 0);
      await this.createScheduledCompetition({
        title: `Afternoon Diagnostic Challenge - ${afternoonTime.toDateString()}`,
        description: 'Sharpen your diagnostic skills with this midday challenge',
        startTime: afternoonTime,
        timeSlot: 'afternoon',
        availableCases
      });

      // Create evening competition (7 PM)
      const eveningTime = new Date(tomorrow);
      eveningTime.setHours(19, 0, 0, 0);
      await this.createScheduledCompetition({
        title: `Evening Expert Challenge - ${eveningTime.toDateString()}`,
        description: 'End your day with an advanced clinical reasoning challenge',
        startTime: eveningTime,
        timeSlot: 'evening',
        availableCases
      });

      console.log('⏰ [SCHEDULER] Created 3 competitions for tomorrow');
      
    } catch (error) {
      console.error('⏰ [SCHEDULER] Error creating daily competitions:', error);
    }
  }

  /**
   * Creates a single scheduled competition
   */
  private async createScheduledCompetition(config: {
    title: string;
    description: string;
    startTime: Date;
    timeSlot: string;
    availableCases: any[];
  }): Promise<void> {
    const { title, description, startTime, timeSlot, availableCases } = config;
    
    // Registration opens 2 hours before start
    const registrationOpens = new Date(startTime);
    registrationOpens.setHours(registrationOpens.getHours() - 2);
    
    // Registration closes 15 minutes before start
    const registrationDeadline = new Date(startTime);
    registrationDeadline.setMinutes(registrationDeadline.getMinutes() - 15);
    
    // Competition ends 10 minutes after start (duration)
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 10);
    
    // Select a random complex case
    const randomCase = availableCases[Math.floor(Math.random() * availableCases.length)];
    
    // Set difficulty based on time slot
    const difficulty = timeSlot === 'morning' ? 'intermediate' : 
                     timeSlot === 'afternoon' ? 'intermediate' : 'advanced';
    
    await db.insert(competitions).values({
      title,
      description,
      type: 'complete_clinician',
      status: 'upcoming', // Use existing status
      difficulty,
      timeLimit: 10, // 10 minutes
      maxParticipants: 50,
      currentParticipants: 0,
      registrationOpensAt: registrationOpens,
      registrationDeadline,
      startTime,
      endTime,
      complexCaseIds: [randomCase.id],
      caseStudyIds: [],
      caseType: 'complex',
      isAutoGenerated: true,
      rules: {
        scoringWeights: {
          accuracy: 30,
          speed: 20,
          reasoning: 25,
          differential: 15,
          treatment: 10
        },
        allowedAttempts: 1,
        showLeaderboard: true,
        revealAnswers: true,
        stageTimeLimit: 2,
        enableAntiCheat: true
      }
    });
    
    console.log(`⏰ [SCHEDULER] Created ${timeSlot} competition: ${title}`);
  }

  /**
   * Starts the scheduler with automatic interval
   */
  startScheduler(): void {
    console.log('⏰ [SCHEDULER] Competition scheduler started');
    
    // Run immediately
    this.runScheduledTasks();
    
    // Run every minute
    setInterval(() => {
      this.runScheduledTasks();
    }, 60 * 1000); // 60 seconds
  }

  /**
   * Manual trigger for testing
   */
  async triggerNow(): Promise<void> {
    console.log('⏰ [SCHEDULER] Manual trigger activated');
    await this.runScheduledTasks();
  }
}

// Export singleton instance
export const competitionScheduler = new CompetitionScheduler();