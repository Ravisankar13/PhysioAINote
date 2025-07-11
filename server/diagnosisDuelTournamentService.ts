import { db } from './db';
import { 
  diagnosisDuelTournaments, 
  tournamentParticipants, 
  tournamentMatches,
  gameContent,
  users,
  InsertDiagnosisDuelTournament,
  InsertTournamentParticipant,
  InsertTournamentMatch,
  DiagnosisDuelTournament,
  TournamentParticipant,
  TournamentMatch
} from '@shared/schema';
import { eq, and, or, isNull, desc } from 'drizzle-orm';
import { gameContentGenerator } from './gameContentGenerator';

export class DiagnosisDuelTournamentService {
  /**
   * Create a new Diagnosis Duel tournament
   */
  async createTournament(tournamentData: Omit<InsertDiagnosisDuelTournament, 'registrationStartTime'>): Promise<DiagnosisDuelTournament> {
    const [tournament] = await db
      .insert(diagnosisDuelTournaments)
      .values({
        ...tournamentData,
        registrationStartTime: new Date(),
      })
      .returning();

    return tournament;
  }

  /**
   * Register a user for a tournament
   */
  async registerForTournament(tournamentId: number, userId: number): Promise<{ success: boolean; message: string; participant?: TournamentParticipant }> {
    try {
      // Get user information
      console.log(`Looking up user with ID: ${userId}`);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      console.log("User lookup result:", user);

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (!user.username) {
        return { success: false, message: 'User has no username' };
      }

      // Check if tournament exists and is accepting registrations
      const [tournament] = await db
        .select()
        .from(diagnosisDuelTournaments)
        .where(eq(diagnosisDuelTournaments.id, tournamentId));

      if (!tournament) {
        return { success: false, message: 'Tournament not found' };
      }

      if (tournament.status !== 'registration' && tournament.status !== 'waiting_for_players') {
        return { success: false, message: 'Tournament registration is closed' };
      }

      if (tournament.currentParticipants >= tournament.maxParticipants) {
        return { success: false, message: 'Tournament is full' };
      }

      // Check if user is already registered
      const [existingParticipant] = await db
        .select()
        .from(tournamentParticipants)
        .where(and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, userId)
        ));

      if (existingParticipant) {
        return { success: false, message: 'You are already registered for this tournament' };
      }

      // Calculate bracket position
      const bracketPosition = tournament.currentParticipants + 1;

      // Register the participant
      console.log(`Registering participant with:`, {
        tournamentId,
        userId,
        username: user.username,
        bracketPosition,
      });
      
      const [participant] = await db
        .insert(tournamentParticipants)
        .values({
          tournamentId,
          userId,
          username: user.username,
          bracketPosition,
        })
        .returning();

      // Update tournament participant count
      await db
        .update(diagnosisDuelTournaments)
        .set({ 
          currentParticipants: tournament.currentParticipants + 1,
          status: tournament.currentParticipants + 1 >= 4 ? 'waiting_for_players' : 'registration'
        })
        .where(eq(diagnosisDuelTournaments.id, tournamentId));

      // If we have enough players (4, 8, 16, or 32), check if we should start
      const newParticipantCount = tournament.currentParticipants + 1;
      if (this.isValidTournamentSize(newParticipantCount) && new Date() >= tournament.tournamentStartTime) {
        await this.startTournament(tournamentId);
      }

      return { 
        success: true, 
        message: 'Successfully registered for tournament',
        participant 
      };
    } catch (error) {
      console.error('Error registering for tournament:', error);
      console.error('Error details:', error.message, error.stack);
      return { success: false, message: `Failed to register for tournament: ${error.message}` };
    }
  }

  /**
   * Leave a tournament
   */
  async leaveTournament(tournamentId: number, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Check if tournament exists
      const [tournament] = await db
        .select()
        .from(diagnosisDuelTournaments)
        .where(eq(diagnosisDuelTournaments.id, tournamentId));

      if (!tournament) {
        return { success: false, message: 'Tournament not found' };
      }

      // Check if tournament has started
      if (tournament.status === 'active' || tournament.status === 'completed') {
        return { success: false, message: 'Cannot leave a tournament that has already started' };
      }

      // Check if user is registered
      const [participant] = await db
        .select()
        .from(tournamentParticipants)
        .where(and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, userId)
        ));

      if (!participant) {
        return { success: false, message: 'You are not registered for this tournament' };
      }

      // Remove the participant
      await db
        .delete(tournamentParticipants)
        .where(and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, userId)
        ));

      // Update tournament participant count
      await db
        .update(diagnosisDuelTournaments)
        .set({ 
          currentParticipants: tournament.currentParticipants - 1 
        })
        .where(eq(diagnosisDuelTournaments.id, tournamentId));

      return { success: true, message: 'Successfully left tournament' };
    } catch (error) {
      console.error('Error leaving tournament:', error);
      return { success: false, message: 'Failed to leave tournament' };
    }
  }

  /**
   * Start a tournament and create the bracket
   */
  async startTournament(tournamentId: number): Promise<{ success: boolean; message: string }> {
    try {
      const [tournament] = await db
        .select()
        .from(diagnosisDuelTournaments)
        .where(eq(diagnosisDuelTournaments.id, tournamentId));

      if (!tournament) {
        return { success: false, message: 'Tournament not found' };
      }

      if (!this.isValidTournamentSize(tournament.currentParticipants)) {
        return { success: false, message: 'Invalid number of participants' };
      }

      // Get all participants with usernames
      const participants = await db
        .select({
          id: tournamentParticipants.id,
          tournamentId: tournamentParticipants.tournamentId,
          userId: tournamentParticipants.userId,
          username: users.username,
          bracketPosition: tournamentParticipants.bracketPosition,
          currentRound: tournamentParticipants.currentRound,
          isEliminated: tournamentParticipants.isEliminated,
          joinedAt: tournamentParticipants.joinedAt,
        })
        .from(tournamentParticipants)
        .innerJoin(users, eq(tournamentParticipants.userId, users.id))
        .where(eq(tournamentParticipants.tournamentId, tournamentId))
        .orderBy(tournamentParticipants.bracketPosition);

      console.log('Debug participants data:', JSON.stringify(participants, null, 2));

      // Create bracket matches for Round 1
      const matches = await this.createBracketMatches(tournamentId, participants, 1);

      // Update tournament status
      await db
        .update(diagnosisDuelTournaments)
        .set({ status: 'round_1' })
        .where(eq(diagnosisDuelTournaments.id, tournamentId));

      return { success: true, message: 'Tournament started successfully' };
    } catch (error) {
      console.error('Error starting tournament:', error);
      return { success: false, message: 'Failed to start tournament' };
    }
  }

  /**
   * Create bracket matches for a round
   */
  async createBracketMatches(
    tournamentId: number, 
    participants: TournamentParticipant[], 
    round: number
  ): Promise<TournamentMatch[]> {
    const matches: InsertTournamentMatch[] = [];
    
    // Get pre-generated tournament Lightning Diagnosis content
    const [existingContent] = await db
      .select()
      .from(gameContent)
      .where(eq(gameContent.competitionId, 107)); // Tournament content competition ID
    
    if (!existingContent) {
      throw new Error('Tournament content not found. Please run the tournament content generation script first.');
    }
    
    const content = existingContent;

    // Pair up participants for matches
    for (let i = 0; i < participants.length; i += 2) {
      if (i + 1 < participants.length) {
        const matchNumber = Math.floor(i / 2) + 1;
        matches.push({
          tournamentId,
          round,
          matchNumber,
          player1Id: participants[i].userId,
          player2Id: participants[i + 1].userId,
          player1Username: participants[i].username,
          player2Username: participants[i + 1].username,
          gameContentId: content.id,
          status: 'scheduled',
          scheduledStartTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          actualStartTime: new Date(), // Set to current time
        });
      }
    }

    // Insert all matches
    const createdMatches = await db
      .insert(tournamentMatches)
      .values(matches)
      .returning();

    return createdMatches;
  }

  /**
   * Submit match results for both players
   */
  async submitMatchResults(
    matchId: number, 
    player1Responses: Record<string, string>,
    player2Responses: Record<string, string>,
    player1Score: number,
    player2Score: number,
    player1TimeSpent: number,
    player2TimeSpent: number
  ): Promise<{ success: boolean; message: string; winnerId?: number }> {
    try {
      // Determine winner
      const winnerId = player1Score > player2Score ? undefined : undefined; // Will be determined by the higher score
      const actualWinnerId = player1Score > player2Score ? 
        (await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId)))[0].player1Id :
        (await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId)))[0].player2Id;

      // Update match with results
      await db
        .update(tournamentMatches)
        .set({
          player1Responses,
          player2Responses,
          player1Score,
          player2Score,
          player1TimeSpent,
          player2TimeSpent,
          winnerId: actualWinnerId,
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(tournamentMatches.id, matchId));

      // Get match details to check if round is complete
      const [match] = await db
        .select()
        .from(tournamentMatches)
        .where(eq(tournamentMatches.id, matchId));

      // Check if all matches in this round are complete
      const roundMatches = await db
        .select()
        .from(tournamentMatches)
        .where(and(
          eq(tournamentMatches.tournamentId, match.tournamentId),
          eq(tournamentMatches.round, match.round)
        ));

      const allMatchesComplete = roundMatches.every(m => m.status === 'completed');

      if (allMatchesComplete) {
        // Advance to next round or complete tournament
        await this.advanceToNextRound(match.tournamentId, match.round);
      }

      return { 
        success: true, 
        message: 'Match results submitted successfully',
        winnerId: actualWinnerId
      };
    } catch (error) {
      console.error('Error submitting match results:', error);
      return { success: false, message: 'Failed to submit match results' };
    }
  }

  /**
   * Advance tournament to next round
   */
  async advanceToNextRound(tournamentId: number, currentRound: number): Promise<void> {
    // Get winners from current round
    const winners = await db
      .select({
        userId: tournamentMatches.winnerId,
        matchNumber: tournamentMatches.matchNumber,
      })
      .from(tournamentMatches)
      .where(and(
        eq(tournamentMatches.tournamentId, tournamentId),
        eq(tournamentMatches.round, currentRound),
        isNull(tournamentMatches.winnerId).not()
      ));

    if (winners.length <= 1) {
      // Tournament is complete
      await db
        .update(diagnosisDuelTournaments)
        .set({ status: 'completed' })
        .where(eq(diagnosisDuelTournaments.id, tournamentId));
      return;
    }

    // Create next round matches
    const nextRound = currentRound + 1;
    const nextRoundStatus = this.getRoundStatus(nextRound);
    
    // Create tournament participants for next round (winners only)
    const nextRoundParticipants: TournamentParticipant[] = winners.map((winner, index) => ({
      id: 0, // Will be set by database
      tournamentId,
      userId: winner.userId!,
      bracketPosition: index + 1,
      currentRound: nextRound,
      isEliminated: false,
      joinedAt: new Date(),
    }));

    await this.createBracketMatches(tournamentId, nextRoundParticipants, nextRound);

    // Update tournament status
    await db
      .update(diagnosisDuelTournaments)
      .set({ 
        status: nextRoundStatus,
        currentRound: nextRound 
      })
      .where(eq(diagnosisDuelTournaments.id, tournamentId));
  }

  /**
   * Get all active tournaments
   */
  async getActiveTournaments(): Promise<DiagnosisDuelTournament[]> {
    return await db
      .select()
      .from(diagnosisDuelTournaments)
      .where(or(
        eq(diagnosisDuelTournaments.status, 'registration'),
        eq(diagnosisDuelTournaments.status, 'waiting_for_players'),
        eq(diagnosisDuelTournaments.status, 'round_1'),
        eq(diagnosisDuelTournaments.status, 'round_2'),
        eq(diagnosisDuelTournaments.status, 'round_3'),
        eq(diagnosisDuelTournaments.status, 'round_4'),
        eq(diagnosisDuelTournaments.status, 'finals')
      ))
      .orderBy(desc(diagnosisDuelTournaments.createdAt));
  }

  /**
   * Get tournament details with participants and matches
   */
  async getTournamentDetails(tournamentId: number): Promise<{
    tournament: DiagnosisDuelTournament;
    participants: (TournamentParticipant & { username: string })[];
    matches: (TournamentMatch & { player1Username: string; player2Username: string })[];
  } | null> {
    console.log("Getting tournament details for ID:", tournamentId);
    
    // Validate tournamentId is a proper number
    if (!tournamentId || isNaN(tournamentId)) {
      throw new Error(`Invalid tournament ID: ${tournamentId}`);
    }
    
    const [tournament] = await db
      .select()
      .from(diagnosisDuelTournaments)
      .where(eq(diagnosisDuelTournaments.id, tournamentId));

    if (!tournament) return null;

    const participants = await db
      .select({
        id: tournamentParticipants.id,
        tournamentId: tournamentParticipants.tournamentId,
        userId: tournamentParticipants.userId,
        bracketPosition: tournamentParticipants.bracketPosition,
        currentRound: tournamentParticipants.currentRound,
        isEliminated: tournamentParticipants.isEliminated,
        joinedAt: tournamentParticipants.joinedAt,
        username: users.username,
      })
      .from(tournamentParticipants)
      .leftJoin(users, eq(tournamentParticipants.userId, users.id))
      .where(eq(tournamentParticipants.tournamentId, tournamentId));

    const matches = await db
      .select({
        id: tournamentMatches.id,
        tournamentId: tournamentMatches.tournamentId,
        round: tournamentMatches.round,
        matchNumber: tournamentMatches.matchNumber,
        player1Id: tournamentMatches.player1Id,
        player2Id: tournamentMatches.player2Id,
        player1Score: tournamentMatches.player1Score,
        player2Score: tournamentMatches.player2Score,
        winnerId: tournamentMatches.winnerId,
        status: tournamentMatches.status,
        scheduledStartTime: tournamentMatches.scheduledStartTime,
        completedAt: tournamentMatches.completedAt,
        createdAt: tournamentMatches.createdAt,
        player1Username: tournamentMatches.player1Username,
        player2Username: tournamentMatches.player2Username,
      })
      .from(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, tournamentId));

    return {
      tournament,
      participants,
      matches: matches as any, // Type assertion for now
    };
  }

  /**
   * Get user's tournament registrations
   */
  async getUserTournamentRegistrations(userId: number) {
    try {
      console.log("Getting tournament registrations for user ID:", userId);
      
      // Validate userId is a proper number
      if (!userId || isNaN(userId)) {
        throw new Error(`Invalid user ID: ${userId}`);
      }
      
      const registrations = await db
        .select({
          id: tournamentParticipants.id,
          tournamentId: tournamentParticipants.tournamentId,
          userId: tournamentParticipants.userId,
          username: users.username,
          bracketPosition: tournamentParticipants.bracketPosition,
          currentRound: tournamentParticipants.currentRound,
          isEliminated: tournamentParticipants.isEliminated,
          joinedAt: tournamentParticipants.joinedAt,
        })
        .from(tournamentParticipants)
        .leftJoin(users, eq(tournamentParticipants.userId, users.id))
        .where(eq(tournamentParticipants.userId, userId));

      console.log("Found registrations:", registrations);
      return registrations;
    } catch (error) {
      console.error("Error getting user tournament registrations:", error);
      throw error;
    }
  }

  /**
   * Get tournament participants
   */
  async getTournamentParticipants(tournamentId: number) {
    try {
      const participants = await db
        .select({
          id: tournamentParticipants.id,
          tournamentId: tournamentParticipants.tournamentId,
          userId: tournamentParticipants.userId,
          username: users.username,
          bracketPosition: tournamentParticipants.bracketPosition,
          currentRound: tournamentParticipants.currentRound,
          isEliminated: tournamentParticipants.isEliminated,
          joinedAt: tournamentParticipants.joinedAt,
        })
        .from(tournamentParticipants)
        .leftJoin(users, eq(tournamentParticipants.userId, users.id))
        .where(eq(tournamentParticipants.tournamentId, tournamentId));

      return participants;
    } catch (error) {
      console.error("Error getting tournament participants:", error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private isValidTournamentSize(participantCount: number): boolean {
    return [4, 8, 16, 32].includes(participantCount);
  }

  private getRoundStatus(round: number): 'round_1' | 'round_2' | 'round_3' | 'round_4' | 'finals' {
    const roundStatusMap: Record<number, 'round_1' | 'round_2' | 'round_3' | 'round_4' | 'finals'> = {
      1: 'round_1',
      2: 'round_2',
      3: 'round_3',
      4: 'round_4',
      5: 'finals',
    };
    return roundStatusMap[round] || 'finals';
  }
}

export const diagnosisDuelTournamentService = new DiagnosisDuelTournamentService();