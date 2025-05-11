/**
 * Helper script to run sample notes creation
 * Uses an existing user (usually the first registered user)
 */

import { storage } from '../storage';
import { createAllSampleNotes } from './createSampleNotes';

async function main() {
  try {
    // Get the first user in the system, or use a specific user ID if provided
    const userId = process.argv[2] ? parseInt(process.argv[2]) : 1;
    
    if (isNaN(userId)) {
      console.error('Invalid user ID provided');
      process.exit(1);
    }
    
    // Verify the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      console.error(`User with ID ${userId} not found`);
      process.exit(1);
    }
    
    console.log(`Creating sample notes for user: ${user.username} (ID: ${user.id})`);
    
    // Create the sample notes
    await createAllSampleNotes(user.id);
    
    console.log('Sample notes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample notes:', error);
    process.exit(1);
  }
}

// Run the script
main();