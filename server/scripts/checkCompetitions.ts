import { db } from '../db.js';
import { competitions } from '../../shared/schema.js';

async function checkCompetitions() {
  try {
    console.log('Checking competitions in database...');
    
    const result = await db.select().from(competitions);
    console.log(`Total competitions: ${result.length}`);
    
    result.forEach(comp => {
      console.log(`ID: ${comp.id}, Title: ${comp.title}, Game Type: ${comp.gameType}`);
    });
    
    console.log('\nGame type counts:');
    const gameTypeCounts = result.reduce((acc, comp) => {
      acc[comp.gameType] = (acc[comp.gameType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(gameTypeCounts).forEach(([gameType, count]) => {
      console.log(`${gameType}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error checking competitions:', error);
  }
}

checkCompetitions().then(() => {
  console.log('Script completed');
  process.exit(0);
});