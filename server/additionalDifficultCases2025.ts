import { ComplexCaseInput } from "./complexCaseGenerator";
import { complexCaseCompetitionService } from "./complexCaseCompetitionService";

/**
 * Additional 10 Challenging Complex Multi-Stage Clinical Reasoning Cases
 * Advanced difficulty with specialized presentations and complex decision-making
 */

export const additionalDifficultCases2025: ComplexCaseInput[] = [
  {
    bodyPart: "shoulder",
    complexity: "advanced",
    competitionType: "complete_clinician",
    estimatedTime: 35
  },
  {
    bodyPart: "knee", 
    complexity: "advanced",
    competitionType: "diagnostic_detective",
    estimatedTime: 40
  },
  {
    bodyPart: "back",
    complexity: "advanced", 
    competitionType: "treatment_strategist",
    estimatedTime: 45
  },
  {
    bodyPart: "neck",
    complexity: "advanced",
    competitionType: "complete_clinician", 
    estimatedTime: 30
  },
  {
    bodyPart: "hip",
    complexity: "advanced",
    competitionType: "diagnostic_detective",
    estimatedTime: 35
  },
  {
    bodyPart: "ankle",
    complexity: "advanced",
    competitionType: "treatment_strategist",
    estimatedTime: 25
  },
  {
    bodyPart: "elbow",
    complexity: "advanced", 
    competitionType: "clinical_educator",
    estimatedTime: 30
  },
  {
    bodyPart: "wrist",
    complexity: "advanced",
    competitionType: "complete_clinician",
    estimatedTime: 25
  },
  {
    bodyPart: "foot",
    complexity: "advanced",
    competitionType: "diagnostic_detective", 
    estimatedTime: 30
  },
  {
    bodyPart: "back",
    complexity: "advanced",
    competitionType: "treatment_strategist",
    estimatedTime: 50
  }
];

/**
 * Creates 10 additional challenging complex cases for competitions
 */
export async function createAdditionalDifficultCases2025(userId: number): Promise<void> {
  console.log('[DIFFICULT CASES] Creating 10 additional challenging complex cases...');
  
  try {
    for (const caseInput of additionalDifficultCases2025) {
      console.log(`[DIFFICULT CASES] Creating ${caseInput.bodyPart} case (${caseInput.complexity})...`);
      
      // Create complex case with competitions
      await complexCaseCompetitionService.createComplexCaseCompetition(
        {
          title: `Advanced ${caseInput.bodyPart.charAt(0).toUpperCase() + caseInput.bodyPart.slice(1)} Clinical Challenge`,
          description: `Challenging ${caseInput.bodyPart} case requiring expert-level clinical reasoning and systematic differential diagnosis`,
          bodyPart: caseInput.bodyPart,
          difficulty: caseInput.complexity as 'beginner' | 'intermediate' | 'advanced',
          maxParticipants: 50,
          timeLimit: caseInput.estimatedTime + 15, // Add buffer time for competition
          stageTimeLimit: Math.ceil(caseInput.estimatedTime / 4), // Divide by 4 stages
          complexCaseId: 0, // Will be set after case creation
          registrationWindow: 60
        },
        new Date(Date.now() + 24 * 60 * 60 * 1000), // Start tomorrow
        userId
      );
      
      console.log(`[DIFFICULT CASES] ✓ Created ${caseInput.bodyPart} competition`);
    }
    
    console.log('[DIFFICULT CASES] ✓ All 10 challenging cases created successfully');
  } catch (error) {
    console.error('[DIFFICULT CASES] Error creating cases:', error);
    throw error;
  }
}