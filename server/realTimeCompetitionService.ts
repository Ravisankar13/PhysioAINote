import { WebSocketServer, WebSocket } from 'ws';
import { db } from './db';
import { competitions, competitionParticipants, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import type { Server } from 'http';

export interface LiveCompetitionData {
  competitionId: number;
  participantCount: number;
  timeRemaining: number;
  leaderboard: Array<{
    userId: number;
    username: string;
    currentScore: number;
    rank: number;
    progress: number; // 0-100%
  }>;
  status: 'waiting' | 'active' | 'ending' | 'completed';
  activities: Array<{
    timestamp: Date;
    type: 'joined' | 'submitted' | 'completed';
    username: string;
    message: string;
  }>;
}

export interface WebSocketMessage {
  type: 'join_competition' | 'leave_competition' | 'competition_update' | 'time_warning' | 'leaderboard_update';
  competitionId?: number;
  userId?: number;
  data?: any;
}

export class RealTimeCompetitionService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map(); // clientId -> websocket
  private competitionRooms: Map<number, Set<string>> = new Map(); // competitionId -> clientIds
  private liveData: Map<number, LiveCompetitionData> = new Map();
  private competitionTimers: Map<number, NodeJS.Timeout> = new Map();

  /**
   * Initialize WebSocket server
   */
  setupWebSocket(server: Server): void {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/competition' 
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      console.log(`🔗 Client ${clientId} connected to real-time competition service`);

      ws.on('message', (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleClientDisconnect(clientId);
      });
    });

    console.log('🔗 Real-time competition WebSocket server started');
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(clientId: string, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'join_competition':
        if (message.competitionId && message.userId) {
          await this.addClientToCompetition(clientId, message.competitionId, message.userId);
        }
        break;

      case 'leave_competition':
        if (message.competitionId) {
          this.removeClientFromCompetition(clientId, message.competitionId);
        }
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Add client to competition room
   */
  private async addClientToCompetition(clientId: string, competitionId: number, userId: number): Promise<void> {
    // Add to room
    if (!this.competitionRooms.has(competitionId)) {
      this.competitionRooms.set(competitionId, new Set());
    }
    this.competitionRooms.get(competitionId)!.add(clientId);

    // Initialize live data if not exists
    if (!this.liveData.has(competitionId)) {
      await this.initializeLiveData(competitionId);
    }

    // Send current state to client
    const liveData = this.liveData.get(competitionId);
    if (liveData) {
      this.sendToClient(clientId, {
        type: 'competition_update',
        competitionId,
        data: liveData
      });
    }

    // Get username for activity
    const user = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length > 0) {
      await this.addActivity(competitionId, {
        timestamp: new Date(),
        type: 'joined',
        username: user[0].username,
        message: `${user[0].username} joined the competition`
      });
    }

    console.log(`👥 Client ${clientId} joined competition ${competitionId}`);
  }

  /**
   * Remove client from competition room
   */
  private removeClientFromCompetition(clientId: string, competitionId: number): void {
    const room = this.competitionRooms.get(competitionId);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.competitionRooms.delete(competitionId);
        // Optionally cleanup live data if no one is watching
      }
    }
    console.log(`👥 Client ${clientId} left competition ${competitionId}`);
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(clientId: string): void {
    // Remove from all rooms
    for (const [competitionId, room] of this.competitionRooms.entries()) {
      if (room.has(clientId)) {
        this.removeClientFromCompetition(clientId, competitionId);
      }
    }
    
    this.clients.delete(clientId);
    console.log(`🔗 Client ${clientId} disconnected`);
  }

  /**
   * Initialize live competition data
   */
  private async initializeLiveData(competitionId: number): Promise<void> {
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, competitionId))
      .limit(1);

    if (!competition.length) return;

    const participants = await db
      .select({
        userId: competitionParticipants.userId,
        username: users.username,
        currentScore: competitionParticipants.currentScore,
        finalScore: competitionParticipants.finalScore,
        ranking: competitionParticipants.ranking,
        completedAt: competitionParticipants.completedAt
      })
      .from(competitionParticipants)
      .innerJoin(users, eq(users.id, competitionParticipants.userId))
      .where(eq(competitionParticipants.competitionId, competitionId))
      .orderBy(competitionParticipants.ranking);

    const now = new Date();
    const timeRemaining = Math.max(0, 
      (new Date(competition[0].endTime).getTime() - now.getTime()) / 1000
    );

    const liveData: LiveCompetitionData = {
      competitionId,
      participantCount: participants.length,
      timeRemaining: Math.floor(timeRemaining),
      leaderboard: participants.map((p, index) => ({
        userId: p.userId,
        username: p.username,
        currentScore: p.currentScore || p.finalScore || 0,
        rank: p.ranking || index + 1,
        progress: p.completedAt ? 100 : 0
      })),
      status: this.getCompetitionStatus(competition[0], timeRemaining),
      activities: []
    };

    this.liveData.set(competitionId, liveData);

    // Start real-time timer if competition is active
    if (liveData.status === 'active' && !this.competitionTimers.has(competitionId)) {
      this.startCompetitionTimer(competitionId);
    }
  }

  /**
   * Get current competition status
   */
  private getCompetitionStatus(competition: any, timeRemaining: number): 'waiting' | 'active' | 'ending' | 'completed' {
    if (competition.status === 'completed') return 'completed';
    if (competition.status === 'upcoming') return 'waiting';
    
    if (timeRemaining <= 0) return 'completed';
    if (timeRemaining <= 300) return 'ending'; // Last 5 minutes
    return 'active';
  }

  /**
   * Start real-time timer for competition
   */
  private startCompetitionTimer(competitionId: number): void {
    const timer = setInterval(async () => {
      await this.updateCompetitionTimer(competitionId);
    }, 1000); // Update every second

    this.competitionTimers.set(competitionId, timer);
    console.log(`⏱️ Started real-time timer for competition ${competitionId}`);
  }

  /**
   * Update competition timer and broadcast
   */
  private async updateCompetitionTimer(competitionId: number): Promise<void> {
    const liveData = this.liveData.get(competitionId);
    if (!liveData) return;

    liveData.timeRemaining = Math.max(0, liveData.timeRemaining - 1);

    // Update status based on time remaining
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, competitionId))
      .limit(1);

    if (competition.length > 0) {
      liveData.status = this.getCompetitionStatus(competition[0], liveData.timeRemaining);
    }

    // Send time warnings
    if (liveData.timeRemaining === 300) { // 5 minutes left
      await this.broadcastTimeWarning(competitionId, '5 minutes remaining!');
    } else if (liveData.timeRemaining === 60) { // 1 minute left
      await this.broadcastTimeWarning(competitionId, '1 minute remaining!');
    } else if (liveData.timeRemaining === 30) { // 30 seconds left
      await this.broadcastTimeWarning(competitionId, '30 seconds remaining!');
    }

    // Stop timer when competition ends
    if (liveData.timeRemaining <= 0) {
      liveData.status = 'completed';
      this.stopCompetitionTimer(competitionId);
    }

    // Broadcast update
    this.broadcastToRoom(competitionId, {
      type: 'competition_update',
      competitionId,
      data: liveData
    });
  }

  /**
   * Stop competition timer
   */
  private stopCompetitionTimer(competitionId: number): void {
    const timer = this.competitionTimers.get(competitionId);
    if (timer) {
      clearInterval(timer);
      this.competitionTimers.delete(competitionId);
      console.log(`⏱️ Stopped timer for competition ${competitionId}`);
    }
  }

  /**
   * Broadcast time warning to all participants
   */
  private async broadcastTimeWarning(competitionId: number, message: string): Promise<void> {
    await this.addActivity(competitionId, {
      timestamp: new Date(),
      type: 'submitted',
      username: 'System',
      message: `⏰ ${message}`
    });

    this.broadcastToRoom(competitionId, {
      type: 'time_warning',
      competitionId,
      data: { message, timeRemaining: this.liveData.get(competitionId)?.timeRemaining }
    });
  }

  /**
   * Update participant score and broadcast
   */
  async updateParticipantScore(competitionId: number, userId: number, newScore: number): Promise<void> {
    const liveData = this.liveData.get(competitionId);
    if (!liveData) return;

    // Update leaderboard
    const participant = liveData.leaderboard.find(p => p.userId === userId);
    if (participant) {
      participant.currentScore = newScore;
      participant.progress = 100; // Completed
    }

    // Re-sort leaderboard
    liveData.leaderboard.sort((a, b) => b.currentScore - a.currentScore);
    liveData.leaderboard.forEach((p, index) => {
      p.rank = index + 1;
    });

    // Get username for activity
    const user = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length > 0) {
      await this.addActivity(competitionId, {
        timestamp: new Date(),
        type: 'submitted',
        username: user[0].username,
        message: `${user[0].username} submitted their answers (Score: ${newScore})`
      });
    }

    // Broadcast leaderboard update
    this.broadcastToRoom(competitionId, {
      type: 'leaderboard_update',
      competitionId,
      data: {
        leaderboard: liveData.leaderboard,
        participantCount: liveData.participantCount
      }
    });
  }

  /**
   * Add activity to competition feed
   */
  private async addActivity(competitionId: number, activity: any): Promise<void> {
    const liveData = this.liveData.get(competitionId);
    if (!liveData) return;

    liveData.activities.unshift(activity);
    
    // Keep only last 20 activities
    if (liveData.activities.length > 20) {
      liveData.activities.splice(20);
    }

    // Broadcast activity update
    this.broadcastToRoom(competitionId, {
      type: 'competition_update',
      competitionId,
      data: { activities: liveData.activities }
    });
  }

  /**
   * Broadcast message to all clients in competition room
   */
  private broadcastToRoom(competitionId: number, message: WebSocketMessage): void {
    const room = this.competitionRooms.get(competitionId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    
    room.forEach(clientId => {
      this.sendToClient(clientId, message);
    });
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get live competition data
   */
  getLiveData(competitionId: number): LiveCompetitionData | undefined {
    return this.liveData.get(competitionId);
  }

  /**
   * Start live tracking for competition
   */
  async startLiveTracking(competitionId: number): Promise<void> {
    await this.initializeLiveData(competitionId);
    this.startCompetitionTimer(competitionId);
  }

  /**
   * Stop live tracking for competition
   */
  stopLiveTracking(competitionId: number): void {
    this.stopCompetitionTimer(competitionId);
    this.liveData.delete(competitionId);
    this.competitionRooms.delete(competitionId);
  }
}

export const realTimeCompetitionService = new RealTimeCompetitionService();