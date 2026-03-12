import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import * as fs from 'fs';

neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const schema = fs.readFileSync('shared/schema.ts', 'utf8');

  const enumRegex = /pgEnum\(["'](\w+)["'],\s*\[([\s\S]*?)\]\)/g;
  let match;

  while ((match = enumRegex.exec(schema)) !== null) {
    const name = match[1];
    const valuesStr = match[2];
    const values = [...valuesStr.matchAll(/["']([^"']+)["']/g)].map(m => m[1]);

    const r = await pool.query('SELECT 1 FROM pg_type WHERE typname = $1', [name]);
    if (r.rows.length === 0 && values.length > 0) {
      const vals = values.map(v => `'${v}'`).join(', ');
      await pool.query(`CREATE TYPE "${name}" AS ENUM (${vals})`);
      console.log('Created enum:', name);
    }
  }

  console.log('All enums verified');
  await pool.end();
}

main().catch(e => {
  console.error('Pre-push enums failed:', e.message);
  process.exit(1);
});
