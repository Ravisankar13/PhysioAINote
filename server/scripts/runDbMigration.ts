/**
 * Run this script to push schema changes to the database
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../db';

async function main() {
  console.log('Running database migration...');
  
  try {
    console.log('Pushing schema changes to the database...');
    // Push the schema changes to the database
    await db.execute(`
      DO $$ 
      BEGIN
        -- Check if difficulty enum type exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty') THEN
          CREATE TYPE difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
        END IF;
        
        -- Create exercises table if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercises') THEN
          CREATE TABLE exercises (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            body_part body_part DEFAULT 'general' NOT NULL,
            target_muscles TEXT NOT NULL,
            difficulty difficulty DEFAULT 'beginner' NOT NULL,
            instructions TEXT NOT NULL,
            precautions TEXT,
            repetitions TEXT,
            sets TEXT,
            duration TEXT,
            image_url TEXT,
            video_url TEXT,
            ai_generated BOOLEAN DEFAULT TRUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        END IF;
      END $$;
    `);
    
    console.log('✅ Schema changes applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();