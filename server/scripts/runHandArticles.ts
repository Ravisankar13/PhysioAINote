/**
 * Helper script to seed research articles for hand
 */
import { seedHandArticles } from './seedHandArticles';

async function main() {
  try {
    await seedHandArticles();
    console.log('Hand research articles seeded successfully');
  } catch (error) {
    console.error('Error seeding hand research articles:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });