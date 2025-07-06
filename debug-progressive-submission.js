// Debug Progressive Diagnostic Challenge submission without authentication
const testProgressiveSubmission = async () => {
  console.log('Testing Progressive Diagnostic Challenge AI feedback system...');
  
  try {
    // Test the AI feedback service directly
    console.log('Testing AI feedback generation...');
    
    const testGameContent = {
      progressiveDiagnosticChallenge: {
        correctDiagnosis: 'ACL Rupture',
        differentialDiagnoses: ['Meniscal tear', 'MCL sprain'],
        hiddenInformation: {
          injury_details: 'Non-contact injury occurred during pivoting movement',
          pop_sound: 'Loud audible pop heard by player and teammates',
          weight_bearing_status: 'Unable to bear weight immediately after injury',
          acl_status: 'Positive anterior drawer test indicating ACL rupture'
        }
      }
    };
    
    const testResponses = {
      primaryDiagnosis: 'ACL Rupture',
      diagnosticReasoning: 'Based on the non-contact mechanism, audible pop, immediate inability to bear weight, and positive anterior drawer test, this strongly suggests complete ACL rupture.'
    };
    
    // Import and test the AI feedback service
    const module = await import('./server/gameAIFeedbackService.ts');
    const service = module.gameAIFeedbackService;
    
    const feedback = await service.generateDetailedGameFeedback(
      'progressive_diagnostic_challenge',
      testResponses,
      testGameContent,
      180 // 3 minutes
    );
    
    console.log('✅ AI Feedback Generated:');
    console.log('Total Score:', feedback.totalScore);
    console.log('Feedback:', feedback.feedback);
    console.log('Question Feedbacks:', feedback.questionFeedbacks?.length || 0);
    
    if (feedback.questionFeedbacks && feedback.questionFeedbacks.length > 0) {
      feedback.questionFeedbacks.forEach((qf, index) => {
        console.log(`  ${index + 1}. ${qf.questionText}: Score ${qf.score}`);
        console.log(`     Analysis: ${qf.aiAnalysis}`);
        console.log(`     Strengths: ${qf.strengths.join(', ')}`);
        console.log(`     Improvements: ${qf.improvements.join(', ')}`);
      });
    }
    
    console.log('\n✅ Progressive Diagnostic Challenge AI feedback system working correctly!');
    
  } catch (error) {
    console.log('❌ Error testing Progressive Diagnostic Challenge:', error.message);
    console.log('Stack:', error.stack);
  }
};

testProgressiveSubmission().catch(console.error);