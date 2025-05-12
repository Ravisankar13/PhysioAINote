/**
 * Helper script to seed research articles for wrist
 */
import { seedWristArticles } from './seedWristArticles';

async function main() {
  try {
    await seedWristArticles();
    console.log('Wrist research articles seeded successfully');
  } catch (error) {
    console.error('Error seeding wrist research articles:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });