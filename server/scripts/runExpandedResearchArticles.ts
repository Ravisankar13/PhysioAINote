/**
 * Helper script to seed expanded research articles
 */
import { seedExpandedResearchArticles } from './seedExpandedResearchArticles';

async function main() {
  try {
    await seedExpandedResearchArticles();
    console.log('Expanded research articles seeded successfully');
  } catch (error) {
    console.error('Error seeding expanded research articles:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });