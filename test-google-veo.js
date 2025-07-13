// Test Google Veo Integration
// Run with: node test-google-veo.js

import { googleVeoService } from './server/googleVeoService';

async function testGoogleVeo() {
  console.log('🎬 Testing Google Veo Video Generation Integration...\n');

  try {
    // Test 1: Check configuration
    console.log('1. Checking Google Veo configuration...');
    const isConfigured = await googleVeoService.validateConfiguration();
    console.log(`   Configuration status: ${isConfigured ? '✅ Valid' : '❌ Invalid'}`);
    
    if (!isConfigured) {
      console.log('   Missing required environment variables:');
      console.log(`   - GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID ? '✅' : '❌'}`);
      console.log(`   - GOOGLE_CLOUD_LOCATION: ${process.env.GOOGLE_CLOUD_LOCATION ? '✅' : '❌'}`);
      console.log('\n   Please set up Google Cloud credentials to test video generation.');
      return;
    }

    // Test 2: Generate simple clinical video
    console.log('\n2. Testing clinical video generation...');
    const testDescription = 'Patient has shoulder pain and cannot lift left arm above head due to impingement';
    
    const videoResult = await googleVeoService.generateClinicalVideo(
      testDescription,
      'shoulder_movement',
      5
    );
    
    console.log(`   ✅ Video generated successfully!`);
    console.log(`   Video URL: ${videoResult.videoUrl}`);
    console.log(`   Generation ID: ${videoResult.generationId}`);

    // Test 3: Test patient movement video
    console.log('\n3. Testing patient movement video...');
    const mockPatientData = {
      bodyPart: 'shoulder',
      clinicalPresentation: {
        chiefComplaint: 'Shoulder pain with overhead activities'
      },
      physicalFindings: {
        rangeOfMotion: 'Limited shoulder flexion to 120 degrees',
        strength: 'Weakness in external rotation',
        functionalMovement: 'Compensated overhead reach pattern'
      }
    };

    const patientVideoResult = await googleVeoService.generatePatientMovementVideo(
      mockPatientData,
      'overhead_reach'
    );

    console.log(`   ✅ Patient video generated successfully!`);
    console.log(`   Video URL: ${patientVideoResult.videoUrl}`);
    console.log(`   Generation ID: ${patientVideoResult.generationId}`);

    console.log('\n🎉 Google Veo integration test completed successfully!');
    console.log('   Ready for use in Virtual Patients system');

  } catch (error) {
    console.error('❌ Google Veo test failed:', error.message);
    
    if (error.message.includes('credentials')) {
      console.log('\n💡 Setup required:');
      console.log('   1. Set GOOGLE_CLOUD_PROJECT_ID in .env file');
      console.log('   2. Configure Google Cloud authentication');
      console.log('   3. Enable Vertex AI API in your Google Cloud project');
    }
  }
}

testGoogleVeo().catch(console.error);