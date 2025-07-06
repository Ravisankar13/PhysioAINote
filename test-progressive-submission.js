// Test Progressive Diagnostic Challenge submission
const testSubmission = async () => {
  console.log('Testing Progressive Diagnostic Challenge submission...');
  
  // Find a Progressive Diagnostic Challenge competition
  const competitionsResponse = await fetch('http://localhost:5000/api/game-competitions');
  const competitions = await competitionsResponse.json();
  
  const progressiveComp = competitions.find(c => c.gameType === 'progressive_diagnostic_challenge');
  
  if (!progressiveComp) {
    console.log('No Progressive Diagnostic Challenge found');
    return;
  }
  
  console.log(`Found competition: ${progressiveComp.title} (ID: ${progressiveComp.id})`);
  
  // Test submission data for Progressive Diagnostic Challenge
  const testResponses = {
    primaryDiagnosis: 'ACL Rupture',
    diagnosticReasoning: 'Based on the mechanism of injury (non-contact pivoting), audible pop, immediate inability to bear weight, and positive anterior drawer test, this strongly suggests complete ACL rupture.',
    timeSpent: 180 // 3 minutes
  };
  
  try {
    const submitResponse = await fetch(`http://localhost:5000/api/game-competitions/${progressiveComp.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        responses: testResponses,
        timeSpent: 180
      })
    });
    
    if (submitResponse.ok) {
      const result = await submitResponse.json();
      console.log('✅ Submission successful!');
      console.log('Score:', result.totalScore);
      console.log('Feedback:', result.feedback);
      console.log('Question feedbacks count:', result.questionFeedbacks?.length || 0);
      
      if (result.questionFeedbacks) {
        result.questionFeedbacks.forEach((qf, index) => {
          console.log(`  Question ${index + 1}: ${qf.questionText} - Score: ${qf.score}`);
        });
      }
    } else {
      const error = await submitResponse.text();
      console.log('❌ Submission failed:', submitResponse.status, error);
    }
  } catch (error) {
    console.log('❌ Submission error:', error.message);
  }
};

testSubmission().catch(console.error);