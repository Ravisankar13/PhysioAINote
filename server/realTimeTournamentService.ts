import WebSocket from 'ws';
import { diagnosisDuelTournamentService } from './diagnosisDuelTournamentService';

interface TournamentConnection {
  ws: WebSocket;
  userId: number;
  tournamentId?: number;
  matchId?: number;
}

export class RealTimeTournamentService {
  private connections: Map<number, TournamentConnection> = new Map();
  private tournamentRooms: Map<number, Set<number>> = new Map(); // tournamentId -> Set of userIds
  private matchRooms: Map<number, Set<number>> = new Map(); // matchId -> Set of userIds

  /**
   * Add a WebSocket connection for a user
   */
  addConnection(userId: number, ws: WebSocket): void {
    const connection: TournamentConnection = { ws, userId };
    this.connections.set(userId, connection);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(userId, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      this.removeConnection(userId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error for user', userId, ':', error);
      this.removeConnection(userId);
    });
  }

  /**
   * Remove a user's connection
   */
  private removeConnection(userId: number): void {
    const connection = this.connections.get(userId);
    if (connection) {
      // Remove from tournament room
      if (connection.tournamentId) {
        this.leaveTournamentRoom(userId, connection.tournamentId);
      }
      // Remove from match room
      if (connection.matchId) {
        this.leaveMatchRoom(userId, connection.matchId);
      }
      this.connections.delete(userId);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(userId: number, message: any): Promise<void> {
    switch (message.type) {
      case 'join_tournament':
        await this.joinTournamentRoom(userId, message.tournamentId);
        break;
      case 'leave_tournament':
        this.leaveTournamentRoom(userId, message.tournamentId);
        break;
      case 'join_match':
        await this.joinMatchRoom(userId, message.matchId);
        break;
      case 'leave_match':
        this.leaveMatchRoom(userId, message.matchId);
        break;
      case 'match_progress':
        this.broadcastMatchProgress(userId, message.matchId, message.progress);
        break;
      case 'match_submission':
        await this.handleMatchSubmission(userId, message);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Join a tournament room for real-time updates
   */
  private async joinTournamentRoom(userId: number, tournamentId: number): Promise<void> {
    const connection = this.connections.get(userId);
    if (!connection) return;

    connection.tournamentId = tournamentId;
    
    if (!this.tournamentRooms.has(tournamentId)) {
      this.tournamentRooms.set(tournamentId, new Set());
    }
    this.tournamentRooms.get(tournamentId)!.add(userId);

    // Send current tournament state
    const tournamentDetails = await diagnosisDuelTournamentService.getTournamentDetails(tournamentId);
    if (tournamentDetails) {
      this.sendToUser(userId, {
        type: 'tournament_state',
        tournament: tournamentDetails,
      });
    }
  }

  /**
   * Leave a tournament room
   */
  private leaveTournamentRoom(userId: number, tournamentId: number): void {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.tournamentId = undefined;
    }

    const room = this.tournamentRooms.get(tournamentId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.tournamentRooms.delete(tournamentId);
      }
    }
  }

  /**
   * Join a match room for real-time 1v1 gameplay
   */
  private async joinMatchRoom(userId: number, matchId: number): Promise<void> {
    const connection = this.connections.get(userId);
    if (!connection) return;

    connection.matchId = matchId;
    
    if (!this.matchRooms.has(matchId)) {
      this.matchRooms.set(matchId, new Set());
    }
    this.matchRooms.get(matchId)!.add(userId);

    // If both players are now connected, start the match
    const matchRoom = this.matchRooms.get(matchId)!;
    if (matchRoom.size === 2) {
      this.broadcastToMatch(matchId, {
        type: 'match_ready',
        message: 'Both players connected - match starting in 5 seconds!',
        countdown: 5,
      });

      // Start countdown
      setTimeout(() => {
        this.broadcastToMatch(matchId, {
          type: 'match_start',
          message: 'Match started! Good luck!',
          startTime: Date.now(),
        });
      }, 5000);
    } else {
      this.sendToUser(userId, {
        type: 'waiting_for_opponent',
        message: 'Waiting for your opponent to connect...',
      });
    }
  }

  /**
   * Leave a match room
   */
  private leaveMatchRoom(userId: number, matchId: number): void {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.matchId = undefined;
    }

    const room = this.matchRooms.get(matchId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.matchRooms.delete(matchId);
      } else {
        // Notify remaining player that opponent left
        this.broadcastToMatch(matchId, {
          type: 'opponent_disconnected',
          message: 'Your opponent has disconnected',
        });
      }
    }
  }

  /**
   * Broadcast match progress (answers completed, etc.)
   */
  private broadcastMatchProgress(userId: number, matchId: number, progress: any): void {
    const room = this.matchRooms.get(matchId);
    if (!room) return;

    // Send progress to the other player
    room.forEach(participantId => {
      if (participantId !== userId) {
        this.sendToUser(participantId, {
          type: 'opponent_progress',
          progress,
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Handle match submission from a player
   */
  private async handleMatchSubmission(userId: number, message: any): Promise<void> {
    const { matchId, responses, score, timeSpent } = message;
    
    // Notify opponent that this player has submitted
    const room = this.matchRooms.get(matchId);
    if (room) {
      room.forEach(participantId => {
        if (participantId !== userId) {
          this.sendToUser(participantId, {
            type: 'opponent_submitted',
            message: 'Your opponent has submitted their answers!',
          });
        }
      });
    }

    // Store submission temporarily until both players submit
    // This would need a more sophisticated storage system in production
  }

  /**
   * Broadcast tournament updates
   */
  async broadcastTournamentUpdate(tournamentId: number, update: any): Promise<void> {
    const room = this.tournamentRooms.get(tournamentId);
    if (!room) return;

    const tournamentDetails = await diagnosisDuelTournamentService.getTournamentDetails(tournamentId);
    
    room.forEach(userId => {
      this.sendToUser(userId, {
        type: 'tournament_update',
        tournament: tournamentDetails,
        update,
      });
    });
  }

  /**
   * Broadcast match results to both players
   */
  broadcastMatchResults(matchId: number, results: any): void {
    this.broadcastToMatch(matchId, {
      type: 'match_results',
      results,
    });
  }

  /**
   * Notify players of upcoming matches
   */
  notifyUpcomingMatch(player1Id: number, player2Id: number, matchId: number, scheduledTime: Date): void {
    const notification = {
      type: 'upcoming_match',
      matchId,
      scheduledTime,
      message: 'Your match is starting soon!',
    };

    this.sendToUser(player1Id, notification);
    this.sendToUser(player2Id, notification);
  }

  /**
   * Send message to a specific user
   */
  private sendToUser(userId: number, message: any): void {
    const connection = this.connections.get(userId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all players in a match
   */
  private broadcastToMatch(matchId: number, message: any): void {
    const room = this.matchRooms.get(matchId);
    if (!room) return;

    room.forEach(userId => {
      this.sendToUser(userId, message);
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    activeTournaments: number;
    activeMatches: number;
  } {
    return {
      totalConnections: this.connections.size,
      activeTournaments: this.tournamentRooms.size,
      activeMatches: this.matchRooms.size,
    };
  }
}

export const realTimeTournamentService = new RealTimeTournamentService();