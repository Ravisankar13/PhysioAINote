import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { config } from 'dotenv';
config();

// Configure Neon for serverless environments.
//
// IMPORTANT: We deliberately use the WebSocket transport (the default
// when `poolQueryViaFetch` is false), NOT the HTTP-fetch transport.
// The Replit-hosted Neon-compatible HTTP gateway has two confirmed
// bugs that break Drizzle/pg-protocol parsing:
//   1) Empty result sets come back as `{ rows: null }` instead of
//      `{ rows: [] }`, which then crashes
//      @neondatabase/serverless's processQueryResult at
//      `r.rows.map(...)` with
//      "Cannot read properties of null (reading 'map')". This made
//      every cache-miss SELECT against any table fail (e.g. the
//      Case-Aware Research Engine panel returned 500 on first use).
//   2) `INSERT/UPDATE ... RETURNING ...` responses come back with
//      `rows: []` even when `rowCount` is 1, silently dropping the
//      returned row. This made every `.returning()` call hand back
//      `undefined` rows.
// The WebSocket transport returns correct `rows` arrays in all of
// these cases AND is more efficient for a long-running Express
// server (persistent connection vs HTTP overhead per query), so we
// route everything through it.
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = false;

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

// Create pool with enhanced configuration for stability and reconnection
export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  // Neon-specific settings for better reliability
  allowExitOnIdle: false,
});

// Test database connection on startup with fail-fast behavior
let dbConnectionStatus = 'connecting';

pool.query('SELECT 1').then(() => {
  dbConnectionStatus = 'connected';
  console.log('✅ Database connection verified successfully');
}).catch((err) => {
  dbConnectionStatus = 'failed';
  console.error('❌ Database connection test failed:', err.message);
  console.error('   Retrying connection...');
  // Don't exit immediately, let the app try to reconnect
  setTimeout(() => {
    pool.query('SELECT 1').then(() => {
      dbConnectionStatus = 'connected';
      console.log('✅ Database reconnected successfully');
    }).catch((retryErr) => {
      console.error('❌ CRITICAL: Database connection retry failed:', retryErr.message);
      process.exit(1);
    });
  }, 2000);
});

// Export connection status for health checks
export const getDbStatus = () => dbConnectionStatus;

export const db = drizzle({ client: pool, schema });