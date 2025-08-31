import { ShoulderRehabExerciseService } from '../shoulderRehabExerciseService';
import { NeckRehabExerciseService } from '../neckRehabExerciseService';
import { ElbowRehabExerciseService } from '../elbowRehabExerciseService';
import { WristRehabExerciseService } from '../wristRehabExerciseService';
import { CoreRehabExerciseService } from '../coreRehabExerciseService';
import { AnkleRehabExerciseService } from '../ankleRehabExerciseService';
import { BackRehabExerciseService } from '../backRehabExerciseService';
import { HipRehabExerciseService } from '../hipRehabExerciseService';
import { KneeRehabExerciseService } from '../kneeRehabExerciseService';

async function syncAllExercises() {
  console.log('Starting comprehensive exercise database sync...\n');

  try {
    // Sync Hip Exercises
    console.log('=== Syncing Hip Exercises ===');
    const hipService = new HipRehabExerciseService();
    await hipService.syncToDatabase();
    console.log('');

    // Sync Knee Exercises
    console.log('=== Syncing Knee Exercises ===');
    const kneeService = new KneeRehabExerciseService();
    await kneeService.syncToDatabase();
    console.log('');

    // Sync Shoulder Exercises
    console.log('=== Syncing Shoulder Exercises ===');
    const shoulderService = new ShoulderRehabExerciseService();
    await shoulderService.syncToDatabase();
    console.log('');

    // Sync Neck Exercises
    console.log('=== Syncing Neck Exercises ===');
    const neckService = new NeckRehabExerciseService();
    await neckService.syncToDatabase();
    console.log('');

    // Sync Elbow Exercises
    console.log('=== Syncing Elbow Exercises ===');
    const elbowService = new ElbowRehabExerciseService();
    await elbowService.syncToDatabase();
    console.log('');

    // Sync Wrist Exercises
    console.log('=== Syncing Wrist Exercises ===');
    const wristService = new WristRehabExerciseService();
    await wristService.syncToDatabase();
    console.log('');

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

    console.log('✅ All exercise services synced successfully!');
    console.log('The database now contains comprehensive rehabilitation exercises for:');
    console.log('- Hips (60 exercises)');
    console.log('- Knees (40 exercises)');
    console.log('- Shoulders (25 exercises)');
    console.log('- Neck (15 exercises)');
    console.log('- Elbows (20 exercises)');
    console.log('- Wrists (15 exercises)');
    console.log('- Core (20 exercises)');
    console.log('- Ankles (20 exercises)');
    console.log('- Back (25 exercises)');
    console.log('\nTotal: ~240 evidence-based rehabilitation exercises!');
    
  } catch (error) {
    console.error('Error during sync:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the sync
syncAllExercises();