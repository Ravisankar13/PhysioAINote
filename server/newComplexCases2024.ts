import { ComplexCaseInput, generateComplexCase } from './complexCaseGenerator';
import { complexCaseService } from './complexCaseService';

/**
 * 10 New Complex Cases for 2024 - Based on Recent High-Quality Research
 * Each case incorporates cutting-edge evidence and innovative treatment approaches
 */

export const newComplexCases2024: ComplexCaseInput[] = [
  {
    bodyPart: "back",
    complexity: "advanced",
    competitionType: "complete_clinician",
    estimatedTime: 45
  },
  {
    bodyPart: "knee", 
    complexity: "advanced",
    competitionType: "diagnostic_detective",
    estimatedTime: 40
  },
  {
    bodyPart: "shoulder",
    complexity: "advanced", 
    competitionType: "treatment_strategist",
    estimatedTime: 50
  },
  {
    bodyPart: "knee",
    complexity: "intermediate",
    competitionType: "treatment_strategist", 
    estimatedTime: 35
  },
  {
    bodyPart: "neck",
    complexity: "advanced",
    competitionType: "complete_clinician",
    estimatedTime: 55
  },
  {
    bodyPart: "foot",
    complexity: "intermediate", 
    competitionType: "diagnostic_detective",
    estimatedTime: 40
  },
  {
    bodyPart: "shoulder",
    complexity: "advanced",
    competitionType: "clinical_educator",
    estimatedTime: 60
  },
  {
    bodyPart: "hip",
    complexity: "intermediate",
    competitionType: "treatment_strategist",
    estimatedTime: 35
  },
  {
    bodyPart: "ankle", 
    complexity: "advanced",
    competitionType: "complete_clinician",
    estimatedTime: 45
  },
  {
    bodyPart: "general",
    complexity: "advanced",
    competitionType: "clinical_educator", 
    estimatedTime: 50
  }
];

/**
 * Creates all 10 new complex cases in the database
 * @param userId The user ID to associate with the cases
 */
export async function createNewComplexCases2024(userId: number): Promise<void> {
  try {
    console.log('Creating 10 new complex cases based on 2024 research...');
    
    for (let i = 0; i < newComplexCases2024.length; i++) {
      const caseInput = newComplexCases2024[i];
      
      console.log(`Creating case ${i + 1}/10: ${caseInput.bodyPart} - ${caseInput.competitionType}`);
      
      // Generate the complex case with AI analysis
      const complexCase = await complexCaseService.createComplexCase(caseInput, userId);
      
      console.log(`✓ Created complex case: ${complexCase.title} (ID: ${complexCase.id})`);
    }
    
    console.log('✅ All 10 new complex cases created successfully!');
    
  } catch (error) {
    console.error('Error creating new complex cases:', error);
    throw error;
  }
}