import { storage } from '../storage';
import { ComplexCaseService } from '../complexCaseService';
import { ComplexCaseInput } from '../complexCaseGenerator';

const complexCaseService = new ComplexCaseService();

const bodyPartCases: ComplexCaseInput[] = [
  {
    bodyPart: "shoulder",
    complexity: "advanced",
    competitionType: "complete_clinician",
    estimatedTime: 25
  },
  {
    bodyPart: "knee",
    complexity: "advanced", 
    competitionType: "diagnostic_detective",
    estimatedTime: 20
  },
  {
    bodyPart: "back",
    complexity: "intermediate",
    competitionType: "treatment_strategist",
    estimatedTime: 30
  },
  {
    bodyPart: "neck",
    complexity: "advanced",
    competitionType: "complete_clinician",
    estimatedTime: 22
  },
  {
    bodyPart: "hip",
    complexity: "advanced",
    competitionType: "diagnostic_detective",
    estimatedTime: 28
  },
  {
    bodyPart: "ankle",
    complexity: "intermediate",
    competitionType: "treatment_strategist",
    estimatedTime: 18
  },
  {
    bodyPart: "elbow",
    complexity: "advanced",
    competitionType: "complete_clinician",
    estimatedTime: 20
  },
  {
    bodyPart: "wrist",
    complexity: "intermediate",
    competitionType: "diagnostic_detective",
    estimatedTime: 15
  },
  {
    bodyPart: "foot",
    complexity: "advanced",
    competitionType: "treatment_strategist",
    estimatedTime: 25
  },
  {
    bodyPart: "general",
    complexity: "advanced",
    competitionType: "clinical_educator",
    estimatedTime: 35
  }
];

export async function recreateComplexCases(): Promise<void> {
  console.log('Clearing existing complex cases...');
  
  // Clear existing cases
  await storage.db.delete(storage.complexCases);
  
  console.log('Creating new body-part specific complex cases...');
  
  const userId = 1; // Admin user
  const createdCases = [];
  
  for (let i = 0; i < bodyPartCases.length; i++) {
    const caseInput = bodyPartCases[i];
    
    try {
      console.log(`Creating case ${i + 1}/10: ${caseInput.bodyPart} (${caseInput.competitionType})`);
      
      const complexCase = await complexCaseService.createComplexCase(caseInput, userId);
      createdCases.push(complexCase);
      
      console.log(`✓ Created: "${complexCase.title}"`);
      
    } catch (error) {
      console.error(`Error creating case ${i + 1}:`, error);
    }
  }
  
  console.log(`Successfully created ${createdCases.length} complex cases`);
}

// Run if this file is executed directly
if (require.main === module) {
  recreateComplexCases().then(() => {
    console.log('Complex case recreation completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Failed to recreate complex cases:', error);
    process.exit(1);
  });
}