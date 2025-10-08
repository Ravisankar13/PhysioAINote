import { populateAllModulesWithComprehensiveContent } from './populateComprehensiveContent';

async function triggerContentPopulation() {
  console.log('Starting comprehensive content population...');
  
  try {
    const result = await populateAllModulesWithComprehensiveContent();
    
    if (result.success) {
      console.log(`✅ Successfully populated ${result.updatedCount} modules with comprehensive content!`);
    } else {
      console.error('❌ Failed to populate content:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during content population:', error);
  }
  
  process.exit(0);
}

// Run the population
triggerContentPopulation();