import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  Activity, 
  ClipboardList, 
  Brain, 
  Target, 
  CheckCircle, 
  ArrowRight,
  ArrowLeft,
  User,
  FileText,
  Stethoscope,
  Play,
  Pause,
  RotateCcw,
  Save
} from "lucide-react";
import StaticPosturalAnalysis from "@/components/StaticPosturalAnalysis";
import MotionCapture from "@/components/MotionCapture";
import ClinicalInterview from "@/components/clinical/ClinicalInterview";
import DiagnosticEngine from "@/components/clinical/DiagnosticEngine";
import TreatmentProtocolEngine from "@/components/clinical/TreatmentProtocolEngine";

interface AssessmentData {
  staticPostural: {
    frontal: any | null;
    sagittal: any | null;
  };
  motionCapture: any | null;
  clinicalInterview: any | null;
  diagnosis: any | null;
  treatment: any | null;
}

const IntegratedClinicalAssessment: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    staticPostural: { frontal: null, sagittal: null },
    motionCapture: null,
    clinicalInterview: null,
    diagnosis: null,
    treatment: null
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = [
    { id: 'static-frontal', title: 'Static Posture - Frontal', icon: Camera, description: 'Frontal plane postural analysis' },
    { id: 'static-sagittal', title: 'Static Posture - Sagittal', icon: Camera, description: 'Sagittal plane postural analysis' },
    { id: 'motion-capture', title: 'Dynamic Movement', icon: Activity, description: 'Motion capture and movement analysis' },
    { id: 'clinical-interview', title: 'Clinical Interview', icon: ClipboardList, description: 'Patient history and symptoms' },
    { id: 'diagnosis', title: 'AI Diagnosis', icon: Brain, description: 'Clinical diagnosis generation' },
    { id: 'treatment', title: 'Treatment Plan', icon: Target, description: 'Personalized treatment protocol' }
  ];

  const handleStepComplete = useCallback(async (stepId: string, data: any) => {
    setIsProcessing(true);
    
    try {
      const updatedData = { ...assessmentData };
      
      switch (stepId) {
        case 'static-frontal':
          updatedData.staticPostural.frontal = data;
          break;
        case 'static-sagittal':
          updatedData.staticPostural.sagittal = data;
          break;
        case 'motion-capture':
          updatedData.motionCapture = data;
          break;
        case 'clinical-interview':
          updatedData.clinicalInterview = data;
          break;
        case 'diagnosis':
          updatedData.diagnosis = data;
          break;
        case 'treatment':
          updatedData.treatment = data;
          break;
      }
      
      setAssessmentData(updatedData);
      
      // Auto-advance to next step
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Error processing step:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentStep, assessmentData]);

  const handleStepNavigation = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canGoNext = () => {
    return currentStep < steps.length - 1 && canProceedToStep(currentStep + 1);
  };

  const canGoPrevious = () => {
    return currentStep > 0;
  };

  const calculateProgress = () => {
    let completedSteps = 0;
    if (assessmentData.staticPostural.frontal) completedSteps++;
    if (assessmentData.staticPostural.sagittal) completedSteps++;
    if (assessmentData.motionCapture) completedSteps++;
    if (assessmentData.clinicalInterview) completedSteps++;
    if (assessmentData.diagnosis) completedSteps++;
    if (assessmentData.treatment) completedSteps++;
    
    return (completedSteps / steps.length) * 100;
  };

  const isStepCompleted = (stepId: string) => {
    switch (stepId) {
      case 'static-frontal':
        return !!assessmentData.staticPostural.frontal;
      case 'static-sagittal':
        return !!assessmentData.staticPostural.sagittal;
      case 'motion-capture':
        return !!assessmentData.motionCapture;
      case 'clinical-interview':
        return !!assessmentData.clinicalInterview;
      case 'diagnosis':
        return !!assessmentData.diagnosis;
      case 'treatment':
        return !!assessmentData.treatment;
      default:
        return false;
    }
  };

  const canProceedToStep = (stepIndex: number) => {
    if (stepIndex === 0) return true; // First step always available
    if (stepIndex === 1) return isStepCompleted('static-frontal');
    if (stepIndex === 2) return isStepCompleted('static-sagittal');
    if (stepIndex === 3) return isStepCompleted('motion-capture');
    if (stepIndex === 4) return isStepCompleted('clinical-interview');
    if (stepIndex === 5) return isStepCompleted('diagnosis');
    return false;
  };

  const renderCurrentStep = () => {
    const currentStepData = steps[currentStep];
    
    switch (currentStepData.id) {
      case 'static-frontal':
        return (
          <StaticPosturalAnalysis
            viewMode="frontal"
            onAnalysisComplete={(data) => handleStepComplete('static-frontal', data)}
            previousData={assessmentData.staticPostural.frontal}
          />
        );
        
      case 'static-sagittal':
        return (
          <StaticPosturalAnalysis
            viewMode="sagittal"
            onAnalysisComplete={(data) => handleStepComplete('static-sagittal', data)}
            previousData={assessmentData.staticPostural.sagittal}
          />
        );
        
      case 'motion-capture':
        return (
          <MotionCapture
            onAnalysisComplete={(data) => handleStepComplete('motion-capture', data)}
            previousData={assessmentData.motionCapture}
            staticPosturalData={assessmentData.staticPostural}
          />
        );
        
      case 'clinical-interview':
        return (
          <ClinicalInterview
            onInterviewComplete={(data: any) => handleStepComplete('clinical-interview', data)}
            posturalFindings={assessmentData.staticPostural}
            motionFindings={assessmentData.motionCapture}
          />
        );
        
      case 'diagnosis':
        return (
          <DiagnosticEngine
            assessmentData={assessmentData}
            onDiagnosisComplete={(data) => handleStepComplete('diagnosis', data)}
          />
        );
        
      case 'treatment':
        return (
          <TreatmentProtocolEngine
            assessmentData={assessmentData}
            onTreatmentComplete={(data) => handleStepComplete('treatment', data)}
          />
        );
        
      default:
        return <div>Step not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Integrated Clinical Assessment
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Comprehensive multi-modal assessment for clinical diagnosis and treatment planning
          </p>
          
          {/* Progress Bar */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Assessment Progress</span>
              <span className="text-sm text-gray-500">{Math.round(calculateProgress())}% Complete</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Step Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Assessment Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = isStepCompleted(step.id);
                  const isCurrent = index === currentStep;
                  const canProceed = canProceedToStep(index);
                  
                  return (
                    <Button
                      key={step.id}
                      variant={isCurrent ? "default" : isCompleted ? "secondary" : "ghost"}
                      className={`w-full justify-start h-auto p-3 ${
                        !canProceed ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => canProceed && handleStepNavigation(index)}
                      disabled={!canProceed || isProcessing}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="relative">
                          <Icon className="h-4 w-4" />
                          {isCompleted && (
                            <CheckCircle className="h-3 w-3 text-green-600 absolute -top-1 -right-1" />
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-medium text-sm">{step.title}</div>
                          <div className="text-xs text-muted-foreground">{step.description}</div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {React.createElement(steps[currentStep].icon, { className: "h-5 w-5" })}
                      {steps[currentStep].title}
                    </CardTitle>
                    <CardDescription>{steps[currentStep].description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isStepCompleted(steps[currentStep].id) ? "default" : "secondary"}>
                      Step {currentStep + 1} of {steps.length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-sm text-gray-600">Processing assessment data...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {renderCurrentStep()}
                    
                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={goToPreviousStep}
                        disabled={!canGoPrevious() || isProcessing}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          Step {currentStep + 1} of {steps.length}
                        </span>
                        {isStepCompleted(steps[currentStep].id) && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      
                      <Button
                        onClick={goToNextStep}
                        disabled={!canGoNext() || isProcessing}
                        className="flex items-center gap-2"
                      >
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Integration Summary */}
            {calculateProgress() > 50 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Assessment Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Camera className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <div className="font-medium">Static Analysis</div>
                      <div className="text-sm text-gray-600">
                        {assessmentData.staticPostural.frontal && assessmentData.staticPostural.sagittal 
                          ? 'Both planes completed' 
                          : `${(assessmentData.staticPostural.frontal ? 1 : 0) + (assessmentData.staticPostural.sagittal ? 1 : 0)}/2 planes`}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Activity className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <div className="font-medium">Motion Analysis</div>
                      <div className="text-sm text-gray-600">
                        {assessmentData.motionCapture ? 'Completed' : 'Pending'}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <ClipboardList className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                      <div className="font-medium">Clinical History</div>
                      <div className="text-sm text-gray-600">
                        {assessmentData.clinicalInterview ? 'Completed' : 'Pending'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedClinicalAssessment;