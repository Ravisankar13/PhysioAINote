import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export interface CourseAIContext {
  courseId: number;
  moduleId: number;
  moduleTitle: string;
  moduleType: string;
  bodyPart: string;
  learningObjective?: string;
  clinicalFocus?: string;
}

export const useCourseAI = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const startAISession = (context: CourseAIContext) => {
    if (!user) {
      console.warn("User must be authenticated to start AI session");
      return;
    }

    // Create clinical context for PhysioGPT based on course content
    const clinicalContext = {
      bodyRegion: context.bodyPart === 'shoulder' ? 'shoulder' : 'general',
      conditionType: 'educational' as const,
      patientAge: 'adult' as const,
      activityLevel: 'educational' as const,
      clinicalTags: [
        'education',
        'course_content',
        context.moduleType,
        context.bodyPart,
        'shoulder_assessment',
        'jo_gibson_methodology'
      ],
      professionalMode: true,
      educationalContext: {
        courseId: context.courseId,
        moduleId: context.moduleId,
        moduleTitle: context.moduleTitle,
        learningObjective: context.learningObjective,
        clinicalFocus: context.clinicalFocus
      }
    };

    // Store context in localStorage for PhysioGPT to access
    localStorage.setItem('course_ai_context', JSON.stringify(clinicalContext));
    
    // Navigate to PhysioGPT with a specific URL parameter to indicate educational context
    setLocation(`/physio-gpt?source=education&course=${context.courseId}&module=${context.moduleId}`);
  };

  const openBodyScanner = (bodyPart: string = 'shoulder') => {
    // Navigate to Body Scanner with specific body part focus
    setLocation(`/body-scanner?focus=${bodyPart}&source=education`);
  };

  const openMovementAnalysis = (analysisType: string = 'shoulder') => {
    // Navigate to Movement Analysis with specific focus
    setLocation(`/movement-analysis?focus=${analysisType}&source=education`);
  };

  const openVirtualPatients = (pathology?: string) => {
    // Navigate to Virtual Patients with pathology filter
    const url = pathology 
      ? `/virtual-patients?pathology=${pathology}&source=education`
      : `/virtual-patients?source=education`;
    setLocation(url);
  };

  const openExerciseDatabase = (bodyPart: string = 'shoulder', pathology?: string) => {
    // Navigate to Exercise Program Builder with specific filters
    const params = new URLSearchParams({
      bodyPart,
      source: 'education'
    });
    if (pathology) {
      params.append('pathology', pathology);
    }
    setLocation(`/exercise-builder?${params.toString()}`);
  };

  return {
    startAISession,
    openBodyScanner,
    openMovementAnalysis,
    openVirtualPatients,
    openExerciseDatabase,
  };
};

// Helper function to create pre-configured AI prompts for different course contexts
export const createEducationalPrompts = (context: CourseAIContext) => {
  const basePrompts = {
    anatomy: [
      `Explain the shoulder anatomy relevant to ${context.moduleTitle}`,
      "Help me understand the biomechanical principles",
      "What are the key clinical correlations I should know?"
    ],
    assessment: [
      `Guide me through the ${context.moduleTitle} assessment protocol`,
      "What special tests are most important for this condition?",
      "Help me develop clinical reasoning for this case"
    ],
    movement: [
      "Analyze this movement pattern and explain what I'm seeing",
      "What compensatory strategies should I look for?",
      "How does this movement relate to the underlying pathology?"
    ],
    treatment: [
      `Recommend evidence-based treatments for ${context.clinicalFocus}`,
      "Help me design an exercise progression",
      "What are the contraindications I should consider?"
    ],
    integration: [
      "Challenge me with a complex clinical scenario",
      "Test my clinical reasoning on this case",
      "Help me integrate all the concepts I've learned"
    ]
  };

  // Return prompts based on module type
  switch (context.moduleType) {
    case 'interactive_3d':
      return basePrompts.anatomy;
    case 'ai_clinical_assistant':
      return basePrompts.assessment;
    case 'motion_capture_lab':
      return basePrompts.movement;
    case 'treatment_planning_lab':
      return basePrompts.treatment;
    case 'advanced_ai_integration':
      return basePrompts.integration;
    default:
      return basePrompts.anatomy;
  }
};