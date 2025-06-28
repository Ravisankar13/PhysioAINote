import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Camera, Activity, Target, CheckCircle, ChevronRight, ArrowLeft, Eye } from 'lucide-react';
import SymptomAnalysisEngine from '@/components/intelligent/SymptomAnalysisEngine';
import EnhancedPosturalAnalysis from '@/components/intelligent/EnhancedPosturalAnalysis';
import MovementTestInput from '@/components/intelligent/MovementTestInput';
import ClinicalQuestionsInput from '@/components/intelligent/ClinicalQuestionsInput';
import ClinicalVisualizationEngine from '@/components/clinical/ClinicalVisualizationEngine';

type AssessmentStep = 'symptoms' | 'posture' | 'movement' | 'questions' | 'visualization' | 'treatment';

interface AssessmentData {
  symptomAnalysis?: any;
  posturalAnalysis?: any;
  movementAnalysis?: any;
  movementTestResults?: any;
  clinicalQuestions?: any;
  clinicalQuestionResponses?: any;
  clinicalVisualization?: any;
  treatmentPlan?: any;
}

const assessmentSteps = [
  {
    id: 'symptoms' as AssessmentStep,
    title: 'Symptom Analysis',
    description: 'AI-powered symptom processing and movement prediction',
    icon: Brain,
    completed: false
  },
  {
    id: 'posture' as AssessmentStep,
    title: 'Postural Assessment',
    description: 'Multi-plane static postural analysis',
    icon: Camera,
    completed: false
  },
  {
    id: 'movement' as AssessmentStep,
    title: 'Movement Testing',
    description: 'AI-recommended functional movement analysis',
    icon: Activity,
    completed: false
  },
  {
    id: 'questions' as AssessmentStep,
    title: 'Clinical Questions',
    description: 'AI-generated clinical assessment questions',
    icon: Target,
    completed: false
  },
  {
    id: 'visualization' as AssessmentStep,
    title: 'Clinical Visualization',
    description: 'AI-generated anatomical illustrations',
    icon: Eye,
    completed: false
  },
  {
    id: 'treatment' as AssessmentStep,
    title: 'Treatment Planning',
    description: 'Evidence-based treatment protocols',
    icon: CheckCircle,
    completed: false
  }
];

export default function IntelligentAssessment() {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('symptoms');
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({});
  const [completedSteps, setCompletedSteps] = useState<Set<AssessmentStep>>(new Set());

  const markStepComplete = (step: AssessmentStep) => {
    setCompletedSteps(prev => new Set(prev).add(step));
  };

  const handleSymptomAnalysisComplete = (analysis: any) => {
    setAssessmentData(prev => ({ ...prev, symptomAnalysis: analysis }));
    markStepComplete('symptoms');
  };

  const handlePosturalAnalysisComplete = (analysis: any) => {
    setAssessmentData(prev => ({ ...prev, posturalAnalysis: analysis }));
    markStepComplete('posture');
  };

  const handleMovementTestsComplete = (results: any) => {
    setAssessmentData(prev => ({ ...prev, movementTestResults: results }));
    markStepComplete('movement');
  };

  const handleClinicalQuestionsComplete = (responses: any) => {
    setAssessmentData(prev => ({ ...prev, clinicalQuestionResponses: responses }));
    markStepComplete('questions');
  };

  const handleVisualizationComplete = (data: any) => {
    setAssessmentData(prev => ({ ...prev, clinicalVisualization: data }));
    markStepComplete('visualization');
  };

  const proceedToNextStep = (nextStep: AssessmentStep) => {
    setCurrentStep(nextStep);
  };

  const goBackToStep = (step: AssessmentStep) => {
    setCurrentStep(step);
  };

  const getCurrentStepIndex = () => {
    return assessmentSteps.findIndex(step => step.id === currentStep);
  };

  const getProgress = () => {
    return (completedSteps.size / assessmentSteps.length) * 100;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'symptoms':
        return (
          <SymptomAnalysisEngine
            onAnalysisComplete={handleSymptomAnalysisComplete}
            onProceedToPostural={() => proceedToNextStep('posture')}
          />
        );
      
      case 'posture':
        return (
          <EnhancedPosturalAnalysis
            symptomAnalysis={assessmentData.symptomAnalysis}
            onAnalysisComplete={handlePosturalAnalysisComplete}
            onProceedToMovement={() => proceedToNextStep('movement')}
          />
        );
      
      case 'movement':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-6 w-6 text-blue-600" />
                  AI-Recommended Movement Testing
                </CardTitle>
                <CardDescription>
                  Functional movement tests based on symptom and postural analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {assessmentData.symptomAnalysis?.recommendedMovements && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Recommended Movement Tests</h3>
                    <div className="grid gap-4">
                      {assessmentData.symptomAnalysis.recommendedMovements.map((movement: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{movement.name}</h4>
                            <Badge variant={
                              movement.priority === 'high' ? 'default' :
                              movement.priority === 'medium' ? 'secondary' : 'outline'
                            }>
                              {movement.priority} priority
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Purpose:</strong> {movement.purpose}
                          </p>
                          <p className="text-sm text-muted-foreground">{movement.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Next: AI Clinical Visualization</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Based on your assessment findings, AI will generate patient-specific anatomical illustrations showing the suspected pathology.
                  </p>
                  <Button onClick={() => proceedToNextStep('visualization')}>
                    <Target className="h-4 w-4 mr-2" />
                    Generate Clinical Visualization
                  </Button>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => goBackToStep('posture')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Posture
                  </Button>
                  <Button onClick={() => proceedToNextStep('visualization')}>
                    Continue to Visualization
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'visualization':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-6 w-6 text-blue-600" />
                  AI Clinical Visualization
                </CardTitle>
                <CardDescription>
                  Patient-specific anatomical illustrations of suspected pathology
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
                      <Target className="h-12 w-12 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold">AI Medical Illustration Generation</h3>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      Revolutionary AI technology that creates patient-specific anatomical visualizations based on your assessment findings. 
                      This feature will show exactly what the AI predicts is happening in the patient's body.
                    </p>
                  </div>
                </div>

                {assessmentData.symptomAnalysis?.suspectedConditions && (
                  <div>
                    <h4 className="font-semibold mb-3">Visualization Targets:</h4>
                    <div className="space-y-2">
                      {assessmentData.symptomAnalysis.suspectedConditions.map((condition: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{condition.condition}</span>
                          <Badge variant="secondary">{condition.likelihood}% confidence</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <ClinicalVisualizationEngine
                  symptomData={assessmentData.symptomAnalysis}
                  posturalData={assessmentData.posturalAnalysis}
                  movementData={assessmentData.movementAnalysis}
                  onVisualizationComplete={handleVisualizationComplete}
                />

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => goBackToStep('movement')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Movement
                  </Button>
                  <Button onClick={() => proceedToNextStep('treatment')}>
                    Continue to Treatment
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'treatment':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                  Evidence-Based Treatment Planning
                </CardTitle>
                <CardDescription>
                  Personalized treatment protocols based on comprehensive AI assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Assessment Complete</h4>
                  <p className="text-green-800 text-sm">
                    Your comprehensive AI-powered assessment is complete. The system has analyzed symptoms, posture, 
                    and movement patterns to generate evidence-based treatment recommendations.
                  </p>
                </div>

                {assessmentData.posturalAnalysis?.overallPosture?.recommendations && (
                  <div>
                    <h4 className="font-semibold mb-3">Postural Intervention Recommendations:</h4>
                    <ul className="space-y-2">
                      {assessmentData.posturalAnalysis.overallPosture.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-semibold">Comprehensive Treatment Protocol:</h4>
                  <div className="grid gap-4">
                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">Phase 1: Pain Management & Mobility</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Manual therapy techniques</li>
                        <li>• Pain modulation strategies</li>
                        <li>• Gentle mobility exercises</li>
                      </ul>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">Phase 2: Movement Re-education</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Postural correction exercises</li>
                        <li>• Movement pattern training</li>
                        <li>• Neuromuscular re-education</li>
                      </ul>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">Phase 3: Strengthening & Function</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Progressive strengthening</li>
                        <li>• Functional movement training</li>
                        <li>• Return to activity preparation</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => goBackToStep('symptoms')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Start New Assessment
                  </Button>
                  <Button>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">Intelligent Assessment System</h1>
          <p className="text-muted-foreground text-center mb-6">
            AI-powered comprehensive physiotherapy assessment with clinical visualization
          </p>
          
          {/* Progress */}
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span>Assessment Progress</span>
              <span>{Math.round(getProgress())}% Complete</span>
            </div>
            <Progress value={getProgress()} className="w-full mb-4" />
          </div>
        </div>

        {/* Step Navigation */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {assessmentSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = completedSteps.has(step.id);
              const isAccessible = index === 0 || completedSteps.has(assessmentSteps[index - 1].id);

              return (
                <Button
                  key={step.id}
                  variant={isActive ? "default" : isCompleted ? "outline" : "ghost"}
                  onClick={() => isAccessible ? setCurrentStep(step.id) : null}
                  disabled={!isAccessible}
                  className="flex items-center space-x-2 h-auto p-3"
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <div className="text-left">
                    <div className="font-medium text-sm">{step.title}</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex justify-center">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}