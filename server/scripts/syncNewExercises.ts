import { CoreRehabExerciseService } from '../coreRehabExerciseService';
import { AnkleRehabExerciseService } from '../ankleRehabExerciseService';
import { BackRehabExerciseService } from '../backRehabExerciseService';

async function syncNewExercises() {
  console.log('Syncing new rehabilitation exercises...\n');

  try {
    // Sync Core Exercises
    console.log('=== Syncing Core Exercises ===');
    const coreService = new CoreRehabExerciseService();
    await coreService.syncToDatabase();
    console.log('');

    // Sync Ankle Exercises
    console.log('=== Syncing Ankle Exercises ===');
    const ankleService = new AnkleRehabExerciseService();
    await ankleService.syncToDatabase();
    console.log('');

    // Sync Back Exercises
    console.log('=== Syncing Back Exercises ===');
    const backService = new BackRehabExerciseService();
    await backService.syncToDatabase();
    console.log('');

    console.log('✅ New exercises synced successfully!');
    
  } catch (error) {
    console.error('Error during sync:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the sync
syncNewExercises();