import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { config } from 'dotenv';
config();

// Configure Neon for serverless environments
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

/**
 * Get database URL with fail-fast approach for production reliability
 * Only accepts DATABASE_URL or documented Neon alternatives
 */
function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL || 
                     process.env.NEON_DATABASE_URL || 
                     process.env.database_url;
  
  if (!databaseUrl) {
    console.error('❌ CRITICAL: DATABASE_URL not configured');
    console.error('   In Replit deployment, ensure DATABASE_URL is added to secrets');
    console.error('   This is the most common cause of "no data" in deployed apps');
    throw new Error(
      "DATABASE_URL must be set. In Replit deployment, add DATABASE_URL to your deployment secrets. This is required for database connectivity."
    );
  }

  // Log sanitized connection info for debugging (without credentials)
  try {
    const url = new URL(databaseUrl);
    console.log(`🔗 Connecting to database: ${url.hostname}/${url.pathname.slice(1)}`);
  } catch {
    console.log('🔗 Database URL configured (unable to parse for logging)');
  }
  
  return databaseUrl;
}

// Get database URL with fail-fast validation
const databaseUrl = getDatabaseUrl();

// Create pool with enhanced configuration for stability
export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test database connection on startup with fail-fast behavior
let dbConnectionStatus = 'connecting';

pool.query('SELECT 1').then(() => {
  dbConnectionStatus = 'connected';
  console.log('✅ Database connection verified successfully');
}).catch((err) => {
  dbConnectionStatus = 'failed';
  console.error('❌ CRITICAL: Database connection failed:', err.message);
  console.error('   This will cause "no data" in the application');
  console.error('   Check DATABASE_URL configuration in deployment secrets');
  // Exit the process to prevent silent failure
  process.exit(1);
});

// Export connection status for health checks
export const getDbStatus = () => dbConnectionStatus;

export const db = drizzle({ client: pool, schema });