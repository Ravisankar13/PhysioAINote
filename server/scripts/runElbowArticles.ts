/**
 * Helper script to seed research articles for elbow
 */
import { seedElbowArticles } from './seedElbowArticles';

async function main() {
  try {
    await seedElbowArticles();
    console.log('Elbow research articles seeded successfully');
  } catch (error) {
    console.error('Error seeding elbow research articles:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });