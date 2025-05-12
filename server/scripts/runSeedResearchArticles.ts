/**
 * Helper script to seed research articles
 */
import { seedResearchArticles } from './seedResearchArticles';

async function main() {
  try {
    await seedResearchArticles();
    console.log('Research articles seeded successfully');
  } catch (error) {
    console.error('Error seeding research articles:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });