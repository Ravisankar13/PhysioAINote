/**
 * Helper script to seed research articles for foot
 */
import { seedFootArticles } from './seedFootArticles';

async function main() {
  try {
    await seedFootArticles();
    console.log('Foot research articles seeded successfully');
  } catch (error) {
    console.error('Error seeding foot research articles:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });