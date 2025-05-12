/**
 * Helper script to seed research articles for ankle
 */
import { seedAnkleArticles } from './seedAnkleArticles';

async function main() {
  try {
    await seedAnkleArticles();
    console.log('Ankle research articles seeded successfully');
  } catch (error) {
    console.error('Error seeding ankle research articles:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });