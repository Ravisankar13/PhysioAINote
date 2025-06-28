import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Stethoscope, Activity, Users, ChevronRight, CheckCircle, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';

interface MovementAbnormality {
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  timestamp: number;
  affectedSide: 'left' | 'right' | 'bilateral';
  angle?: number;
  normalRange?: string;
  clinicalSignificance: string;
}

interface DiagnosticPattern {
  id: string;
  name: string;
  abnormalities: string[];
  requiredAbnormalities: string[];
  likelihood: number;
  description: string;
  commonCauses: string[];
  associatedConditions: string[];
}

interface ClinicalQuestion {
  id: string;
  question: string;
  type: 'scale' | 'multiple' | 'text' | 'boolean';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  required: boolean;
  category: 'pain' | 'history' | 'function' | 'symptoms';
}

interface DiagnosticResult {
  primaryDiagnosis: string;
  confidence: number;
  differentialDiagnoses: Array<{ diagnosis: string; likelihood: number }>;
  redFlags: string[];
  functionalImpact: string;
  recommendedTreatment: string;
  exercisePrescription: string[];
  followUpRecommendations: string[];
}

interface DiagnosticEngineProps {
  abnormalities?: MovementAbnormality[];
  assessmentData?: any;
  onDiagnosisComplete: (result: DiagnosticResult) => void;
  onProceedToTreatment?: () => void;
}

const clinicalQuestions: ClinicalQuestion[] = [
  {
    id: 'pain_location',
    question: 'Where is your primary pain located?',
    type: 'multiple',
    options: [
      'Neck', 'Shoulder', 'Upper back', 'Lower back', 'Hip', 'Knee', 'Ankle', 'Foot',
      'Elbow', 'Wrist', 'Hand', 'Chest', 'Multiple areas'
    ],
    required: true,
    category: 'pain'
  },
  {
    id: 'pain_intensity',
    question: 'Rate your current pain intensity (0 = no pain, 10 = worst possible pain)',
    type: 'scale',
    scaleMin: 0,
    scaleMax: 10,
    scaleLabels: { min: 'No pain', max: 'Worst pain' },
    required: true,
    category: 'pain'
  },
  {
    id: 'symptom_duration',
    question: 'How long have you had these symptoms?',
    type: 'multiple',
    options: [
      'Less than 1 week', '1-4 weeks', '1-3 months', '3-6 months', 
      '6-12 months', 'More than 1 year'
    ],
    required: true,
    category: 'history'
  },
  {
    id: 'onset_mechanism',
    question: 'How did your symptoms begin?',
    type: 'multiple',
    options: [
      'Gradual onset', 'Sudden onset', 'After specific injury', 
      'After repetitive activity', 'Unknown cause'
    ],
    required: true,
    category: 'history'
  },
  {
    id: 'aggravating_factors',
    question: 'What makes your symptoms worse?',
    type: 'text',
    required: false,
    category: 'symptoms'
  },
  {
    id: 'relieving_factors',
    question: 'What makes your symptoms better?',
    type: 'text',
    required: false,
    category: 'symptoms'
  },
  {
    id: 'functional_impact',
    question: 'How much do your symptoms interfere with daily activities? (0 = no interference, 10 = unable to perform activities)',
    type: 'scale',
    scaleMin: 0,
    scaleMax: 10,
    scaleLabels: { min: 'No interference', max: 'Unable to perform' },
    required: true,
    category: 'function'
  },
  {
    id: 'previous_episodes',
    question: 'Have you had similar symptoms before?',
    type: 'boolean',
    required: true,
    category: 'history'
  },
  {
    id: 'current_medications',
    question: 'Are you currently taking any medications for this condition?',
    type: 'text',
    required: false,
    category: 'history'
  },
  {
    id: 'sleep_impact',
    question: 'Do your symptoms affect your sleep?',
    type: 'boolean',
    required: true,
    category: 'function'
  }
];

export default function DiagnosticEngine({ abnormalities, assessmentData, onDiagnosisComplete, onProceedToTreatment }: DiagnosticEngineProps) {
  const [currentStep, setCurrentStep] = useState<'interview' | 'analysis' | 'results'>('interview');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const allAbnormalities = useMemo(() => {
    const movementAbnormalities = abnormalities || [];
    const staticPosturalAbnormalities = assessmentData?.staticPostural?.abnormalities || [];
    return [...movementAbnormalities, ...staticPosturalAbnormalities];
  }, [abnormalities, assessmentData]);

  const currentQuestion = clinicalQuestions[currentQuestionIndex];
  const totalQuestions = clinicalQuestions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const generateAIDiagnosis = async () => {
    try {
      const response = await fetch('/api/ai-diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staticPosturalData: assessmentData?.staticPostural || null,
          motionCaptureData: assessmentData?.motionCapture || null,
          clinicalInterviewData: answers,
          detectedAbnormalities: allAbnormalities
        }),
      });

      if (response.ok) {
        const aiDiagnosis = await response.json();
        return aiDiagnosis;
      }
    } catch (error) {
      console.error('AI diagnosis failed:', error);
    }
    return null;
  };

  const generateAIDifferentials = async () => {
    try {
      const response = await fetch('/api/ai-differentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clinicalInterviewData: answers,
          staticPosturalData: assessmentData?.staticPostural || null,
          motionCaptureData: assessmentData?.motionCapture || null
        }),
      });

      if (response.ok) {
        const differentials = await response.json();
        return differentials.differentialDiagnoses || [];
      }
    } catch (error) {
      console.error('AI differentials failed:', error);
    }
    
    // Fallback differentials based on clinical interview
    return createFallbackDifferentials();
  };

  const createFallbackDifferentials = () => {
    const painLocation = answers.pain_location?.toLowerCase() || '';
    
    if (painLocation.includes('shoulder')) {
      return [
        { diagnosis: 'Rotator Cuff Tendinopathy', likelihood: 75 },
        { diagnosis: 'Adhesive Capsulitis', likelihood: 65 },
        { diagnosis: 'Subacromial Impingement', likelihood: 60 }
      ];
    } else if (painLocation.includes('back') || painLocation.includes('spine')) {
      return [
        { diagnosis: 'Mechanical Low Back Pain', likelihood: 70 },
        { diagnosis: 'Facet Joint Dysfunction', likelihood: 60 },
        { diagnosis: 'Muscle Strain', likelihood: 55 }
      ];
    } else if (painLocation.includes('knee')) {
      return [
        { diagnosis: 'Patellofemoral Pain Syndrome', likelihood: 70 },
        { diagnosis: 'IT Band Syndrome', likelihood: 60 },
        { diagnosis: 'Meniscal Pathology', likelihood: 55 }
      ];
    } else if (painLocation.includes('hip')) {
      return [
        { diagnosis: 'Hip Flexor Strain', likelihood: 65 },
        { diagnosis: 'Greater Trochanteric Pain Syndrome', likelihood: 70 },
        { diagnosis: 'Hip Osteoarthritis', likelihood: 50 }
      ];
    }
    
    return [
      { diagnosis: 'Musculoskeletal Pain Syndrome', likelihood: 65 },
      { diagnosis: 'Overuse Injury', likelihood: 60 },
      { diagnosis: 'Movement Dysfunction', likelihood: 55 }
    ];
  };

  const createClinicalInterviewPattern = (): DiagnosticPattern => {
    const painLocation = answers.pain_location || 'unspecified region';
    
    return {
      id: 'clinical_interview_diagnosis',
      name: `${painLocation.charAt(0).toUpperCase() + painLocation.slice(1)} Pain Syndrome`,
      abnormalities: [],
      requiredAbnormalities: [],
      likelihood: 0.70,
      description: `Pain condition affecting the ${painLocation} based on clinical presentation`,
      commonCauses: ['Overuse', 'Poor mechanics', 'Muscle imbalance', 'Previous injury'],
      associatedConditions: ['Functional limitation', 'Movement dysfunction', 'Activity restriction']
    };
  };

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleCompleteInterview();
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleCompleteInterview = async () => {
    setCurrentStep('analysis');
    setIsAnalyzing(true);

    try {
      // Try to get AI diagnosis first
      const aiDiagnosis = await generateAIDiagnosis();
      const aiDifferentials = await generateAIDifferentials();

      let primaryDiagnosis = '';
      let confidence = 70;
      let description = '';
      let commonCauses: string[] = [];
      let associatedConditions: string[] = [];

      if (aiDiagnosis) {
        primaryDiagnosis = aiDiagnosis.primaryDiagnosis;
        confidence = aiDiagnosis.confidence;
        description = aiDiagnosis.description;
        commonCauses = aiDiagnosis.commonCauses || [];
        associatedConditions = aiDiagnosis.associatedConditions || [];
      } else {
        // Fallback to clinical interview pattern
        const pattern = createClinicalInterviewPattern();
        primaryDiagnosis = pattern.name;
        confidence = pattern.likelihood * 100;
        description = pattern.description;
        commonCauses = pattern.commonCauses;
        associatedConditions = pattern.associatedConditions;
      }

      const treatmentRecommendations = generateTreatmentRecommendations(answers);

      const result: DiagnosticResult = {
        primaryDiagnosis,
        confidence,
        differentialDiagnoses: aiDifferentials,
        redFlags: identifyRedFlags(answers),
        functionalImpact: assessFunctionalImpact(answers),
        recommendedTreatment: treatmentRecommendations.approach,
        exercisePrescription: treatmentRecommendations.exercises,
        followUpRecommendations: treatmentRecommendations.followUp
      };

      setDiagnosticResult(result);
      setCurrentStep('results');
      onDiagnosisComplete(result);

    } catch (error) {
      console.error('Error completing diagnosis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateTreatmentRecommendations = (answers: Record<string, any>) => {
    const isAcute = answers.symptom_duration === 'Less than 1 week' || answers.symptom_duration === '1-4 weeks';
    const painLevel = answers.pain_intensity || 0;
    const painLocation = answers.pain_location || '';

    let approach = '';
    let exercises: string[] = [];
    let followUp: string[] = [];

    if (painLocation.toLowerCase().includes('shoulder')) {
      approach = isAcute ? 'Initial focus on pain reduction and gentle mobility' : 'Progressive strengthening and range of motion restoration';
      exercises = [
        'Pendulum exercises',
        'Passive range of motion',
        'Scapular stabilization',
        'Rotator cuff strengthening',
        'Postural correction exercises'
      ];
      followUp = [
        'Monitor pain levels and ROM',
        'Progress exercises as tolerated',
        'Consider imaging if no improvement in 4-6 weeks'
      ];
    } else if (painLocation.toLowerCase().includes('back')) {
      approach = isAcute ? 'Pain management and gentle movement' : 'Core strengthening and movement restoration';
      exercises = [
        'Gentle spinal mobility',
        'Core stabilization',
        'Hip flexor stretches',
        'Postural strengthening',
        'Movement re-education'
      ];
      followUp = [
        'Activity modification guidance',
        'Ergonomic assessment',
        'Monitor for red flag symptoms'
      ];
    } else {
      // Generic recommendations
      approach = isAcute ? 'Conservative management with gentle mobilization' : 'Progressive rehabilitation approach';
      exercises = [
        'Range of motion exercises',
        'Strengthening exercises',
        'Functional movement training',
        'Postural correction',
        'Activity-specific training'
      ];
      followUp = [
        'Regular reassessment',
        'Progress monitoring',
        'Home exercise compliance'
      ];
    }

    return { approach, exercises, followUp };
  };

  const identifyRedFlags = (answers: Record<string, any>): string[] => {
    const redFlags: string[] = [];
    
    if (answers.pain_intensity >= 8) {
      redFlags.push('High pain intensity requiring close monitoring');
    }
    
    if (answers.functional_impact >= 8) {
      redFlags.push('Severe functional limitation');
    }
    
    if (answers.sleep_impact) {
      redFlags.push('Sleep disturbance affecting recovery');
    }
    
    return redFlags;
  };

  const assessFunctionalImpact = (answers: Record<string, any>): string => {
    const impactLevel = answers.functional_impact || 0;
    
    if (impactLevel >= 8) return 'Severe functional limitation requiring immediate intervention';
    if (impactLevel >= 6) return 'Moderate functional limitation affecting daily activities';
    if (impactLevel >= 3) return 'Mild functional limitation with some activity restrictions';
    return 'Minimal functional impact on daily activities';
  };

  const renderQuestion = (question: ClinicalQuestion) => {
    const currentAnswer = answers[question.id];

    switch (question.type) {
      case 'multiple':
        return (
          <Select value={currentAnswer} onValueChange={handleAnswer}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'scale':
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{question.scaleLabels?.min}</span>
              <span>{question.scaleLabels?.max}</span>
            </div>
            <Slider
              value={[currentAnswer || 0]}
              onValueChange={(values) => handleAnswer(values[0])}
              max={question.scaleMax}
              min={question.scaleMin}
              step={1}
              className="w-full"
            />
            <div className="text-center text-lg font-semibold">
              {currentAnswer || 0} / {question.scaleMax}
            </div>
          </div>
        );

      case 'boolean':
        return (
          <RadioGroup value={currentAnswer} onValueChange={handleAnswer}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no">No</Label>
            </div>
          </RadioGroup>
        );

      case 'text':
        return (
          <Textarea
            value={currentAnswer || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Please describe..."
            rows={3}
          />
        );

      default:
        return null;
    }
  };

  if (currentStep === 'analysis') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Brain className="h-12 w-12 text-blue-600 animate-pulse" />
          </div>
          <CardTitle>Analyzing Clinical Data</CardTitle>
          <CardDescription>
            Processing your assessment data and clinical interview responses...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Analysis Progress</span>
              <span>Processing...</span>
            </div>
            <Progress value={75} className="w-full" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Clinical Interview</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Movement Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
              <span>AI Diagnosis</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
              <span>Treatment Planning</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'results' && diagnosticResult) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Stethoscope className="h-6 w-6 text-blue-600" />
                  Diagnostic Results
                </CardTitle>
                <CardDescription>
                  AI-powered clinical analysis based on your comprehensive assessment
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {diagnosticResult.confidence}% Confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Diagnosis */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Primary Diagnosis</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">{diagnosticResult.primaryDiagnosis}</h4>
                <Progress value={diagnosticResult.confidence} className="mt-2" />
              </div>
            </div>

            {/* Differential Diagnoses */}
            {diagnosticResult.differentialDiagnoses.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Differential Diagnoses</h3>
                <div className="space-y-2">
                  {diagnosticResult.differentialDiagnoses.map((diff, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>{diff.diagnosis}</span>
                      <Badge variant="secondary">{diff.likelihood}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Red Flags */}
            {diagnosticResult.redFlags.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Clinical Considerations:</strong>
                  <ul className="mt-2 space-y-1">
                    {diagnosticResult.redFlags.map((flag, index) => (
                      <li key={index} className="text-sm">• {flag}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Functional Impact */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Functional Impact</h3>
              <p className="text-muted-foreground">{diagnosticResult.functionalImpact}</p>
            </div>

            {/* Treatment Recommendations */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Recommended Treatment Approach</h3>
              <p className="mb-4">{diagnosticResult.recommendedTreatment}</p>
              
              {diagnosticResult.exercisePrescription.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Exercise Prescription</h4>
                  <ul className="space-y-1">
                    {diagnosticResult.exercisePrescription.map((exercise, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{exercise}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Follow-up Recommendations */}
            {diagnosticResult.followUpRecommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Follow-up Recommendations</h3>
                <ul className="space-y-1">
                  {diagnosticResult.followUpRecommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-4">
              {onProceedToTreatment && (
                <Button onClick={onProceedToTreatment} className="flex-1">
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Proceed to Treatment Planning
                </Button>
              )}
              <Button variant="outline" onClick={() => setCurrentStep('interview')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Review Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Clinical Interview Step
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Clinical Interview
              </CardTitle>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium">
              {currentQuestion.question}
              {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="mt-4">
              {renderQuestion(currentQuestion)}
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <Button
              onClick={nextQuestion}
              disabled={currentQuestion.required && !answers[currentQuestion.id]}
            >
              {currentQuestionIndex === totalQuestions - 1 ? (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Complete Diagnosis
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}