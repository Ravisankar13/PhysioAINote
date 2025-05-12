/**
 * Helper script to seed research articles for additional body parts
 */
import { seedAdditionalBodyParts } from './seedAdditionalBodyParts';

async function main() {
  try {
    await seedAdditionalBodyParts();
    console.log('Additional body part research articles seeded successfully');
  } catch (error) {
    console.error('Error seeding additional body part research articles:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });