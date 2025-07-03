import { db } from './db';
import { competitions, complexCases } from '@shared/schema';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

export interface ThematicWeek {
  theme: string;
  bodyPart: string;
  description: string;
  specializations: string[];
  competitions: Array<{
    title: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    timeSlot: 'morning' | 'afternoon' | 'evening';
    specialFocus: string;
  }>;
}

export interface TournamentFormat {
  name: string;
  type: 'knockout' | 'league' | 'swiss' | 'round_robin';
  description: string;
  minParticipants: number;
  maxParticipants: number;
  rounds: number;
  scoringSystem: string;
}

export class CompetitionContentService {
  
  /**
   * Get thematic weeks for the current month
   */
  getThematicWeeks(): ThematicWeek[] {
    return [
      {
        theme: 'Knee Week',
        bodyPart: 'knee',
        description: 'Comprehensive knee injury diagnosis and treatment challenges',
        specializations: ['Sports Medicine', 'Orthopedics', 'ACL Reconstruction', 'Meniscal Tears'],
        competitions: [
          {
            title: 'ACL Injury Recognition Challenge',
            difficulty: 'intermediate',
            timeSlot: 'morning',
            specialFocus: 'Acute sports injuries'
          },
          {
            title: 'Meniscal Tear Diagnosis Race',
            difficulty: 'advanced',
            timeSlot: 'afternoon',
            specialFocus: 'Imaging interpretation'
          },
          {
            title: 'Knee Osteoarthritis Management',
            difficulty: 'beginner',
            timeSlot: 'evening',
            specialFocus: 'Conservative treatment'
          }
        ]
      },
      {
        theme: 'Sports Injury Week',
        bodyPart: 'general',
        description: 'Multi-system sports injury assessment and return-to-play protocols',
        specializations: ['Sports Medicine', 'Athletic Training', 'Exercise Physiology'],
        competitions: [
          {
            title: 'Concussion Protocol Challenge',
            difficulty: 'advanced',
            timeSlot: 'morning',
            specialFocus: 'Neurological assessment'
          },
          {
            title: 'Return-to-Play Decision Making',
            difficulty: 'intermediate',
            timeSlot: 'afternoon',
            specialFocus: 'Risk assessment'
          },
          {
            title: 'Sports Injury Prevention',
            difficulty: 'beginner',
            timeSlot: 'evening',
            specialFocus: 'Preventive strategies'
          }
        ]
      },
      {
        theme: 'Shoulder Week',
        bodyPart: 'shoulder',
        description: 'Complex shoulder pathology and rehabilitation challenges',
        specializations: ['Orthopedics', 'Manual Therapy', 'Rotator Cuff', 'Frozen Shoulder'],
        competitions: [
          {
            title: 'Rotator Cuff Tear Classification',
            difficulty: 'advanced',
            timeSlot: 'morning',
            specialFocus: 'Imaging analysis'
          },
          {
            title: 'Frozen Shoulder Treatment Protocol',
            difficulty: 'intermediate',
            timeSlot: 'afternoon',
            specialFocus: 'Progressive mobilization'
          },
          {
            title: 'Shoulder Impingement Basics',
            difficulty: 'beginner',
            timeSlot: 'evening',
            specialFocus: 'Clinical assessment'
          }
        ]
      },
      {
        theme: 'Spine Week',
        bodyPart: 'back',
        description: 'Spinal pathology assessment and evidence-based treatment',
        specializations: ['Manual Therapy', 'Pain Science', 'Red Flags', 'McKenzie Method'],
        competitions: [
          {
            title: 'Red Flag Recognition Challenge',
            difficulty: 'advanced',
            timeSlot: 'morning',
            specialFocus: 'Emergency screening'
          },
          {
            title: 'Disc Herniation Management',
            difficulty: 'intermediate',
            timeSlot: 'afternoon',
            specialFocus: 'Conservative vs surgical'
          },
          {
            title: 'Lower Back Pain Assessment',
            difficulty: 'beginner',
            timeSlot: 'evening',
            specialFocus: 'Basic evaluation'
          }
        ]
      }
    ];
  }

  /**
   * Get tournament formats available
   */
  getTournamentFormats(): TournamentFormat[] {
    return [
      {
        name: 'Knockout Tournament',
        type: 'knockout',
        description: 'Single elimination tournament with head-to-head matchups',
        minParticipants: 8,
        maxParticipants: 64,
        rounds: 6,
        scoringSystem: 'Winner advances, loser eliminated'
      },
      {
        name: 'League Championship',
        type: 'league',
        description: 'Round-robin league where everyone competes against everyone',
        minParticipants: 6,
        maxParticipants: 20,
        rounds: 19,
        scoringSystem: 'Points accumulation over multiple rounds'
      },
      {
        name: 'Swiss Tournament',
        type: 'swiss',
        description: 'Participants paired based on similar performance levels',
        minParticipants: 8,
        maxParticipants: 50,
        rounds: 7,
        scoringSystem: 'Pairing based on current standings'
      },
      {
        name: 'Grand Prix Series',
        type: 'round_robin',
        description: 'Multiple competitions with cumulative scoring',
        minParticipants: 10,
        maxParticipants: 100,
        rounds: 5,
        scoringSystem: 'Best performances across multiple events'
      }
    ];
  }

  /**
   * Generate themed competition based on current week
   */
  async generateThemedCompetition(theme: string, difficulty: string, timeSlot: string): Promise<any> {
    const thematicWeeks = this.getThematicWeeks();
    const currentTheme = thematicWeeks.find(tw => tw.theme.toLowerCase().includes(theme.toLowerCase()));
    
    if (!currentTheme) {
      throw new Error(`Theme ${theme} not found`);
    }

    // Get relevant case studies for the theme
    const relevantCases = await db
      .select()
      .from(complexCases)
      .where(eq(complexCases.bodyPart, currentTheme.bodyPart as any))
      .limit(5);

    if (relevantCases.length === 0) {
      throw new Error(`No case studies found for ${currentTheme.bodyPart}`);
    }

    // Select competition from theme
    const themeCompetition = currentTheme.competitions.find(
      comp => comp.difficulty === difficulty && comp.timeSlot === timeSlot
    );

    if (!themeCompetition) {
      // Fallback to first available competition
      const fallback = currentTheme.competitions[0];
      return {
        title: `${currentTheme.theme} - ${fallback.title}`,
        description: `${currentTheme.description} - Focus: ${fallback.specialFocus}`,
        bodyPart: currentTheme.bodyPart,
        difficulty: fallback.difficulty,
        specialFocus: fallback.specialFocus,
        caseIds: relevantCases.map(c => c.id),
        theme: currentTheme.theme
      };
    }

    return {
      title: `${currentTheme.theme} - ${themeCompetition.title}`,
      description: `${currentTheme.description} - Focus: ${themeCompetition.specialFocus}`,
      bodyPart: currentTheme.bodyPart,
      difficulty: themeCompetition.difficulty,
      specialFocus: themeCompetition.specialFocus,
      caseIds: relevantCases.map(c => c.id),
      theme: currentTheme.theme
    };
  }

  /**
   * Get difficulty progression for the week
   */
  getWeeklyDifficultyProgression(): Record<string, string> {
    return {
      'Monday': 'beginner',
      'Tuesday': 'beginner',
      'Wednesday': 'intermediate',
      'Thursday': 'intermediate',
      'Friday': 'advanced',
      'Saturday': 'intermediate', // Weekend recovery
      'Sunday': 'beginner'
    };
  }

  /**
   * Generate specialty competition variants
   */
  getSpecialtyCompetitions(): Array<{
    name: string;
    description: string;
    rules: any;
    format: string;
  }> {
    return [
      {
        name: 'Speed Diagnostics',
        description: 'Rapid-fire diagnosis challenges with time pressure',
        format: 'Multiple short cases, 2 minutes each',
        rules: {
          timePerCase: 120,
          penaltyForIncorrect: 30,
          bonusForSpeed: true,
          maxCases: 5
        }
      },
      {
        name: 'Accuracy Masters',
        description: 'Complex cases requiring precise diagnosis',
        format: 'Detailed cases with multiple stages',
        rules: {
          timePerCase: 600,
          partialCredit: true,
          detailedReasoning: true,
          maxCases: 2
        }
      },
      {
        name: 'Differential Diagnosis Race',
        description: 'Generate comprehensive differential diagnoses',
        format: 'Cases requiring multiple diagnostic possibilities',
        rules: {
          minDifferentials: 3,
          scoringByCompleteness: true,
          evidenceRequired: true,
          timeLimit: 480
        }
      },
      {
        name: 'Treatment Planning Elite',
        description: 'Comprehensive treatment protocol development',
        format: 'Post-diagnosis treatment planning challenges',
        rules: {
          requiresProgression: true,
          outcomesMustBeSpecified: true,
          evidenceBasedOnly: true,
          timeLimit: 720
        }
      },
      {
        name: 'Clinical Educator Challenge',
        description: 'Explain complex cases for teaching purposes',
        format: 'Educational content creation from clinical cases',
        rules: {
          mustIncludeTeaching: true,
          learningObjectives: true,
          multipleChoiceCreation: true,
          timeLimit: 900
        }
      }
    ];
  }

  /**
   * Create tournament bracket structure
   */
  async createTournamentBracket(
    competitionId: number, 
    participants: number[], 
    format: TournamentFormat
  ): Promise<any> {
    
    const bracket = {
      competitionId,
      format: format.type,
      participants: participants.length,
      rounds: [],
      currentRound: 1,
      status: 'setup'
    };

    switch (format.type) {
      case 'knockout':
        bracket.rounds = this.generateKnockoutRounds(participants);
        break;
      case 'league':
        bracket.rounds = this.generateLeagueFixtures(participants);
        break;
      case 'swiss':
        bracket.rounds = this.generateSwissRounds(participants, format.rounds);
        break;
      case 'round_robin':
        bracket.rounds = this.generateRoundRobinRounds(participants);
        break;
    }

    return bracket;
  }

  /**
   * Generate knockout tournament rounds
   */
  private generateKnockoutRounds(participants: number[]): any[] {
    const rounds = [];
    let currentParticipants = [...participants];
    let roundNumber = 1;

    while (currentParticipants.length > 1) {
      const matches = [];
      
      for (let i = 0; i < currentParticipants.length; i += 2) {
        if (i + 1 < currentParticipants.length) {
          matches.push({
            player1: currentParticipants[i],
            player2: currentParticipants[i + 1],
            winner: null,
            scores: { p1: 0, p2: 0 }
          });
        } else {
          // Bye - player advances automatically
          matches.push({
            player1: currentParticipants[i],
            player2: null,
            winner: currentParticipants[i],
            scores: { p1: 0, p2: 0 }
          });
        }
      }

      rounds.push({
        round: roundNumber,
        name: this.getRoundName(roundNumber, currentParticipants.length),
        matches,
        status: roundNumber === 1 ? 'active' : 'pending'
      });

      // Prepare next round participants (winners of current round)
      currentParticipants = matches.map(match => match.winner).filter(w => w !== null);
      roundNumber++;
    }

    return rounds;
  }

  /**
   * Generate league fixtures
   */
  private generateLeagueFixtures(participants: number[]): any[] {
    const rounds = [];
    const n = participants.length;
    
    for (let round = 0; round < n - 1; round++) {
      const matches = [];
      
      for (let i = 0; i < n / 2; i++) {
        const home = participants[i];
        const away = participants[n - 1 - i];
        
        matches.push({
          player1: home,
          player2: away,
          winner: null,
          scores: { p1: 0, p2: 0 }
        });
      }

      rounds.push({
        round: round + 1,
        name: `Round ${round + 1}`,
        matches,
        status: round === 0 ? 'active' : 'pending'
      });

      // Rotate participants for next round (keep first fixed)
      participants.splice(1, 0, participants.pop()!);
    }

    return rounds;
  }

  /**
   * Generate Swiss tournament rounds
   */
  private generateSwissRounds(participants: number[], maxRounds: number): any[] {
    // Swiss pairing algorithm - simplified version
    const rounds = [];
    
    for (let round = 1; round <= maxRounds; round++) {
      rounds.push({
        round,
        name: `Swiss Round ${round}`,
        matches: [], // Matches generated dynamically based on standings
        status: round === 1 ? 'active' : 'pending'
      });
    }

    return rounds;
  }

  /**
   * Generate round-robin rounds
   */
  private generateRoundRobinRounds(participants: number[]): any[] {
    // Similar to league but with different scoring
    return this.generateLeagueFixtures(participants);
  }

  /**
   * Get round name for knockout tournaments
   */
  private getRoundName(roundNumber: number, participantCount: number): string {
    const roundNames = {
      1: 'Final',
      2: 'Semi-Final',
      3: 'Quarter-Final',
      4: 'Round of 16',
      5: 'Round of 32',
      6: 'Round of 64'
    };

    const roundsFromEnd = Math.ceil(Math.log2(participantCount));
    const nameIndex = roundsFromEnd - roundNumber + 1;
    
    return roundNames[nameIndex] || `Round ${roundNumber}`;
  }

  /**
   * Get current week's theme
   */
  getCurrentWeekTheme(): ThematicWeek {
    const weekNumber = Math.floor((Date.now() / (1000 * 60 * 60 * 24 * 7))) % 4;
    return this.getThematicWeeks()[weekNumber];
  }

  /**
   * Generate diverse case study selection
   */
  async generateDiverseCaseSelection(bodyPart: string, difficulty: string, count: number): Promise<number[]> {
    const cases = await db
      .select()
      .from(complexCases)
      .where(
        and(
          eq(complexCases.bodyPart, bodyPart as any),
          sql`${complexCases.stages}->0->>'difficulty' = ${difficulty}`
        )
      )
      .limit(count * 2); // Get more than needed for diversity

    // Shuffle and select diverse cases
    const shuffled = cases.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(c => c.id);
  }
}

export const competitionContentService = new CompetitionContentService();