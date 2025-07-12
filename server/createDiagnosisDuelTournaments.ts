/**
 * Create 5 Diagnosis Duel Tournaments with proper scheduling
 * Each tournament allows only 1 per day with 3 rounds
 */

import { db } from './db';
import { diagnosisDuelTournaments } from '@shared/schema';

export async function createDiagnosisDuelTournaments() {
  console.log('Creating 5 Diagnosis Duel tournaments...');

  const now = new Date();
  const tournaments = [];

  // Create 5 tournaments, each starting on different days
  for (let i = 0; i < 5; i++) {
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + i); // Each tournament starts on a different day
    
    // Registration opens 2 hours before tournament start
    const registrationStart = new Date(startDate);
    registrationStart.setHours(10, 0, 0, 0); // 10:00 AM registration opens
    
    // Registration closes 30 minutes before tournament start
    const registrationEnd = new Date(startDate);
    registrationEnd.setHours(11, 30, 0, 0); // 11:30 AM registration closes
    
    // Tournament starts at noon
    const tournamentStart = new Date(startDate);
    tournamentStart.setHours(12, 0, 0, 0); // 12:00 PM tournament starts

    const tournament = {
      title: `Diagnosis Duel Tournament ${i + 1}`,
      description: `Elite clinical diagnosis tournament featuring 3 progressive rounds of elimination battles. Test your diagnostic skills against the best clinicians!`,
      bodyPart: 'general' as const,
      difficulty: 'intermediate' as const,
      status: 'registration' as const,
      maxParticipants: 16, // Good size for 4 rounds of elimination
      currentParticipants: 0,
      currentRound: 1,
      registrationStartTime: registrationStart,
      registrationEndTime: registrationEnd,
      tournamentStartTime: tournamentStart,
    };

    tournaments.push(tournament);
  }

  try {
    // Insert all tournaments
    const createdTournaments = await db
      .insert(diagnosisDuelTournaments)
      .values(tournaments)
      .returning();

    console.log(`✅ Created ${createdTournaments.length} Diagnosis Duel tournaments:`);
    createdTournaments.forEach((tournament, index) => {
      console.log(`   🏆 Tournament ${index + 1}: ${tournament.title}`);
      console.log(`      📅 Registration: ${tournament.registrationStartTime.toLocaleString()} - ${tournament.registrationEndTime.toLocaleString()}`);
      console.log(`      🚀 Start: ${tournament.tournamentStartTime.toLocaleString()}`);
    });

    return createdTournaments;
  } catch (error) {
    console.error('❌ Error creating tournaments:', error);
    throw error;
  }
}