import { ComplexCaseService } from "./complexCaseService";
import { ComplexCaseInput } from "./complexCaseGenerator";

/**
 * Additional 10 Complex Multi-Stage Clinical Reasoning Cases
 * Based on cutting-edge 2024 research and clinical innovations
 */

export const additionalComplexCases2024: ComplexCaseInput[] = [
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
    competitionType: "clinical_educator",
    estimatedTime: 24
  },
  {
    bodyPart: "wrist",
    complexity: "intermediate",
    competitionType: "complete_clinician",
    estimatedTime: 20
  },
  {
    bodyPart: "general",
    complexity: "advanced",
    competitionType: "diagnostic_detective",
    estimatedTime: 35
  },
  {
    bodyPart: "foot",
    complexity: "advanced",
    competitionType: "treatment_strategist",
    estimatedTime: 26
  }
];

/**
 * Creates 10 additional complex cases based on 2024 research
 */
export async function createAdditionalComplexCases2024(userId: number): Promise<void> {
  const complexCaseService = new ComplexCaseService();
  
  console.log("Creating 10 additional complex cases based on 2024 research...");
  
  const createdCases = [];
  
  for (let i = 0; i < additionalComplexCases2024.length; i++) {
    const caseInput = additionalComplexCases2024[i];
    
    try {
      console.log(`Creating complex case ${i + 1}/10: ${caseInput.bodyPart} (${caseInput.competitionType})`);
      
      const complexCase = await complexCaseService.createComplexCase(caseInput, userId);
      createdCases.push(complexCase);
      
      console.log(`✓ Created complex case ${i + 1}: ID ${complexCase.id}`);
      
      // Small delay to prevent overwhelming the AI API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error creating complex case ${i + 1}:`, error);
      throw error;
    }
  }
  
  console.log(`Successfully created ${createdCases.length} additional complex cases!`);
  console.log("Case IDs:", createdCases.map(c => c.id));
}