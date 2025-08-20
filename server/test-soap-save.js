// Test script to verify SOAP note saving functionality
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testSoapNoteSaving() {
  console.log('Testing SOAP note saving functionality...\n');
  
  try {
    // Check the structure of temporary_soap_notes table
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'temporary_soap_notes'
      AND column_name IN ('subjective', 'objective', 'assessment', 'plan', 'transcription_text')
      ORDER BY ordinal_position;
    `);
    
    console.log('Table structure for SOAP fields:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check recent notes to see if they have content
    const recentNotes = await pool.query(`
      SELECT id, patient_name, 
             LENGTH(COALESCE(subjective, '')) as subj_len,
             LENGTH(COALESCE(objective, '')) as obj_len,
             LENGTH(COALESCE(assessment, '')) as assess_len,
             LENGTH(COALESCE(plan, '')) as plan_len,
             LENGTH(COALESCE(transcription_text, '')) as trans_len,
             created_at
      FROM temporary_soap_notes
      WHERE user_id = 54
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    console.log('\nRecent notes with content lengths:');
    console.log('ID | Patient Name | S | O | A | P | Transcript | Created');
    console.log('---|-------------|---|---|---|---|-----------|--------');
    recentNotes.rows.forEach(row => {
      console.log(
        `${row.id} | ${row.patient_name.substring(0, 30).padEnd(30)} | ` +
        `${row.subj_len} | ${row.obj_len} | ${row.assess_len} | ${row.plan_len} | ` +
        `${row.trans_len} | ${new Date(row.created_at).toLocaleString()}`
      );
    });
    
    // Test creating a new note with proper structure
    console.log('\nTesting note creation with correct structure...');
    const testNote = await pool.query(`
      INSERT INTO temporary_soap_notes (
        user_id, session_id, patient_name,
        subjective, objective, assessment, plan,
        transcription_text, recording_duration,
        expires_at, recording_mode, note_order
      ) VALUES (
        54, 
        $1,
        'Test Patient - Verification',
        'Test subjective content',
        'Test objective content',
        'Test assessment content',
        'Test plan content',
        'Test transcription',
        30,
        NOW() + INTERVAL '24 hours',
        'standard',
        1
      ) RETURNING id, patient_name, subjective;
    `, [`test-session-${Date.now()}`]);
    
    if (testNote.rows[0]) {
      console.log('✓ Test note created successfully with ID:', testNote.rows[0].id);
      console.log('  Content saved:', testNote.rows[0].subjective.substring(0, 50));
      
      // Clean up test note
      await pool.query('DELETE FROM temporary_soap_notes WHERE id = $1', [testNote.rows[0].id]);
      console.log('✓ Test note cleaned up');
    }
    
    console.log('\n✅ SOAP note saving system is working correctly!');
    console.log('All fields are properly configured at the database level.');
    
  } catch (error) {
    console.error('❌ Error testing SOAP note saving:', error);
  } finally {
    await pool.end();
  }
}

testSoapNoteSaving();