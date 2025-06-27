import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Brain, FileText, Stethoscope } from 'lucide-react';

// Types for the diagnostic system
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

// Diagnostic patterns based on movement abnormalities
const DIAGNOSTIC_PATTERNS: DiagnosticPattern[] = [
  {
    id: 'upper_crossed_syndrome',
    name: 'Upper Crossed Syndrome',
    abnormalities: ['forward_head', 'cervical_extension', 'shoulder_elevation', 'thoracic_kyphosis'],
    requiredAbnormalities: ['forward_head', 'shoulder_elevation'],
    likelihood: 0.85,
    description: 'Postural syndrome characterized by muscle imbalances in the upper body',
    commonCauses: ['Prolonged sitting', 'Computer work', 'Poor ergonomics', 'Weak deep neck flexors'],
    associatedConditions: ['Cervical pain', 'Headaches', 'Shoulder impingement', 'TMJ dysfunction']
  },
  {
    id: 'hip_abductor_weakness',
    name: 'Hip Abductor Weakness',
    abnormalities: ['trendelenburg', 'hip_drop', 'lateral_trunk_lean', 'pelvic_tilt'],
    requiredAbnormalities: ['trendelenburg'],
    likelihood: 0.90,
    description: 'Weakness of hip abductor muscles causing compensatory movement patterns',
    commonCauses: ['Gluteus medius weakness', 'Hip pathology', 'L5 nerve root irritation', 'Post-surgical weakness'],
    associatedConditions: ['Lower back pain', 'Hip pain', 'IT band syndrome', 'Knee pain']
  },
  {
    id: 'dynamic_knee_valgus',
    name: 'Dynamic Knee Valgus Pattern',
    abnormalities: ['knee_valgus', 'ankle_pronation', 'hip_drop', 'internal_shoulder_rotation'],
    requiredAbnormalities: ['knee_valgus', 'ankle_pronation'],
    likelihood: 0.80,
    description: 'Movement pattern associated with increased injury risk and patellofemoral pain',
    commonCauses: ['Hip weakness', 'Ankle stiffness', 'Poor movement control', 'Muscle imbalances'],
    associatedConditions: ['Patellofemoral pain', 'ACL injury risk', 'IT band syndrome', 'Ankle instability']
  },
  {
    id: 'neurological_dysfunction',
    name: 'Neurological Movement Disorder',
    abnormalities: ['tremor', 'bradykinesia', 'muscle_rigidity', 'ataxic_movement'],
    requiredAbnormalities: ['tremor', 'bradykinesia'],
    likelihood: 0.75,
    description: 'Movement patterns suggesting neurological involvement',
    commonCauses: ['Parkinson\'s disease', 'Essential tremor', 'Medication effects', 'Cerebellar dysfunction'],
    associatedConditions: ['Balance impairments', 'Fall risk', 'Functional limitations', 'Cognitive changes']
  },
  {
    id: 'gait_dysfunction',
    name: 'Gait Pattern Dysfunction',
    abnormalities: ['antalgic_gait', 'steppage_gait', 'circumduction_gait', 'foot_drop'],
    requiredAbnormalities: ['antalgic_gait'],
    likelihood: 0.85,
    description: 'Abnormal gait patterns indicating pain or neurological involvement',
    commonCauses: ['Pain avoidance', 'Nerve injury', 'Muscle weakness', 'Joint restriction'],
    associatedConditions: ['Chronic pain', 'Functional limitations', 'Fall risk', 'Activity restrictions']
  },
  {
    id: 'spinal_dysfunction',
    name: 'Spinal Alignment Dysfunction',
    abnormalities: ['scoliosis', 'lumbar_lordosis', 'cervical_extension', 'pelvic_rotation'],
    requiredAbnormalities: ['scoliosis'],
    likelihood: 0.70,
    description: 'Spinal alignment issues affecting overall posture and movement',
    commonCauses: ['Structural abnormalities', 'Muscle imbalances', 'Poor posture', 'Developmental issues'],
    associatedConditions: ['Back pain', 'Reduced mobility', 'Respiratory issues', 'Functional limitations']
  }
];

// Clinical assessment questions
const CLINICAL_QUESTIONS: ClinicalQuestion[] = [
  {
    id: 'pain_location',
    question: 'Where is your primary area of pain or discomfort?',
    type: 'text',
    required: true,
    category: 'pain'
  },
  {
    id: 'pain_intensity',
    question: 'Rate your current pain level (0 = no pain, 10 = worst pain imaginable)',
    type: 'scale',
    scaleMin: 0,
    scaleMax: 10,
    scaleLabels: { min: 'No pain', max: 'Worst pain' },
    required: true,
    category: 'pain'
  },
  {
    id: 'symptom_duration',
    question: 'How long have you been experiencing these symptoms?',
    type: 'multiple',
    options: ['Less than 1 week', '1-4 weeks', '1-3 months', '3-6 months', 'More than 6 months'],
    required: true,
    category: 'history'
  },
  {
    id: 'onset_mechanism',
    question: 'How did your symptoms begin?',
    type: 'multiple',
    options: ['Sudden onset (acute injury)', 'Gradual onset (no specific injury)', 'After specific activity', 'Following an accident', 'Unknown/can\'t remember'],
    required: true,
    category: 'history'
  },
  {
    id: 'aggravating_factors',
    question: 'What activities or positions make your symptoms worse?',
    type: 'text',
    required: false,
    category: 'symptoms'
  },
  {
    id: 'relieving_factors',
    question: 'What activities or positions make your symptoms better?',
    type: 'text',
    required: false,
    category: 'symptoms'
  },
  {
    id: 'previous_episodes',
    question: 'Have you experienced similar symptoms before?',
    type: 'boolean',
    required: true,
    category: 'history'
  },
  {
    id: 'functional_impact',
    question: 'How much do these symptoms affect your daily activities? (0 = no impact, 10 = unable to function)',
    type: 'scale',
    scaleMin: 0,
    scaleMax: 10,
    scaleLabels: { min: 'No impact', max: 'Unable to function' },
    required: true,
    category: 'function'
  },
  {
    id: 'medical_history',
    question: 'Do you have any relevant medical history (surgeries, chronic conditions, medications)?',
    type: 'text',
    required: false,
    category: 'history'
  },
  {
    id: 'red_flag_symptoms',
    question: 'Are you experiencing any of the following? (Select all that apply)',
    type: 'multiple',
    options: ['Severe unrelenting pain', 'Numbness or tingling', 'Weakness in arms/legs', 'Loss of bowel/bladder control', 'Fever', 'Unexplained weight loss', 'Night pain that wakes you'],
    required: true,
    category: 'symptoms'
  }
];

export default function DiagnosticEngine({ abnormalities, assessmentData, onDiagnosisComplete, onProceedToTreatment }: DiagnosticEngineProps) {
  const [currentStep, setCurrentStep] = useState<'analysis' | 'questions' | 'results'>('analysis');
  const [detectedPatterns, setDetectedPatterns] = useState<DiagnosticPattern[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [allAbnormalities, setAllAbnormalities] = useState<MovementAbnormality[]>([]);

  // Analyze movement patterns
  useEffect(() => {
    analyzeMovementPatterns();
  }, [abnormalities]);

  const analyzeMovementPatterns = () => {
    const patterns: DiagnosticPattern[] = [];
    
    // Extract abnormalities from assessment data if not provided directly
    let extractedAbnormalities: MovementAbnormality[] = abnormalities || [];
    
    if (assessmentData) {
      // Extract abnormalities from static postural analysis
      if (assessmentData.staticPostural) {
        const staticAbnormalities = [
          ...(assessmentData.staticPostural.frontal?.abnormalities || []),
          ...(assessmentData.staticPostural.sagittal?.abnormalities || [])
        ];
        extractedAbnormalities = extractedAbnormalities.concat(staticAbnormalities);
      }
      
      // Extract abnormalities from motion capture analysis
      if (assessmentData.motionCapture?.analysis) {
        const motionAbnormalities = assessmentData.motionCapture.analysis.abnormalities || [];
        extractedAbnormalities = extractedAbnormalities.concat(motionAbnormalities);
      }
    }
    
    // Update state with all abnormalities
    setAllAbnormalities(extractedAbnormalities);
    
    const abnormalityTypes = extractedAbnormalities.map(a => a.type);

    DIAGNOSTIC_PATTERNS.forEach(pattern => {
      const hasRequiredAbnormalities = pattern.requiredAbnormalities.every(req => 
        abnormalityTypes.includes(req)
      );

      if (hasRequiredAbnormalities) {
        const matchingAbnormalities = pattern.abnormalities.filter(ab => 
          abnormalityTypes.includes(ab)
        );
        
        const matchScore = matchingAbnormalities.length / pattern.abnormalities.length;
        const adjustedLikelihood = pattern.likelihood * matchScore;

        if (adjustedLikelihood > 0.5) {
          patterns.push({
            ...pattern,
            likelihood: adjustedLikelihood
          });
        }
      }
    });

    // Sort by likelihood
    patterns.sort((a, b) => b.likelihood - a.likelihood);
    setDetectedPatterns(patterns);

    if (patterns.length > 0) {
      setCurrentStep('questions');
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < CLINICAL_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      generateDiagnosis();
    }
  };

  const generateDiagnosis = () => {
    const primaryPattern = detectedPatterns[0];
    
    // Assess red flags
    const redFlags = [];
    if (answers.red_flag_symptoms && Array.isArray(answers.red_flag_symptoms)) {
      redFlags.push(...answers.red_flag_symptoms);
    }
    if (answers.pain_intensity >= 8) {
      redFlags.push('High pain intensity (>= 8/10)');
    }

    // Generate differential diagnoses
    const differentialDiagnoses = detectedPatterns.slice(1, 4).map(pattern => ({
      diagnosis: pattern.name,
      likelihood: Math.round(pattern.likelihood * 100)
    }));

    // Determine treatment approach based on pattern and answers
    const treatmentRecommendations = generateTreatmentRecommendations(primaryPattern, answers);

    const result: DiagnosticResult = {
      primaryDiagnosis: primaryPattern.name,
      confidence: Math.round(primaryPattern.likelihood * 100),
      differentialDiagnoses,
      redFlags,
      functionalImpact: getFunctionalImpactDescription(answers.functional_impact),
      recommendedTreatment: treatmentRecommendations.approach,
      exercisePrescription: treatmentRecommendations.exercises,
      followUpRecommendations: treatmentRecommendations.followUp
    };

    setDiagnosticResult(result);
    setCurrentStep('results');
    onDiagnosisComplete(result);
  };

  const generateTreatmentRecommendations = (pattern: DiagnosticPattern, answers: Record<string, any>) => {
    const isAcute = answers.symptom_duration === 'Less than 1 week' || answers.symptom_duration === '1-4 weeks';
    const painLevel = answers.pain_intensity || 0;

    let approach = '';
    let exercises: string[] = [];
    let followUp: string[] = [];

    switch (pattern.id) {
      case 'upper_crossed_syndrome':
        approach = isAcute ? 'Initial focus on pain reduction and gentle mobility' : 'Progressive strengthening and postural correction';
        exercises = [
          'Deep neck flexor strengthening',
          'Chin tucks',
          'Upper trap stretches',
          'Doorway chest stretches',
          'Thoracic extension exercises',
          'Scapular retraction exercises'
        ];
        followUp = [
          'Ergonomic assessment of workstation',
          'Progress to advanced strengthening in 2-3 weeks',
          'Monitor posture throughout day'
        ];
        break;

      case 'hip_abductor_weakness':
        approach = 'Progressive hip strengthening with focus on functional movement patterns';
        exercises = [
          'Clamshells',
          'Side-lying hip abduction',
          'Single-leg bridges',
          'Monster walks with resistance band',
          'Step-ups',
          'Single-leg balance exercises'
        ];
        followUp = [
          'Progress to plyometric exercises when strength improves',
          'Assess for underlying hip pathology if no improvement',
          'Consider gait retraining'
        ];
        break;

      case 'dynamic_knee_valgus':
        approach = 'Movement pattern retraining with strengthening and mobility work';
        exercises = [
          'Hip strengthening (glutes, external rotators)',
          'Ankle mobility exercises',
          'Single-leg squat progression',
          'Jump landing training',
          'Balance and proprioception exercises',
          'Core strengthening'
        ];
        followUp = [
          'Video analysis of movement patterns',
          'Sport-specific movement training',
          'Consider footwear assessment'
        ];
        break;

      default:
        approach = 'Individualized treatment based on specific presentation';
        exercises = ['Assessment-guided exercise prescription'];
        followUp = ['Regular monitoring and progression'];
    }

    if (painLevel >= 7) {
      approach = 'Initial pain management focus before progressing to active treatment';
      followUp.unshift('Pain management strategies');
    }

    return { approach, exercises, followUp };
  };

  const getFunctionalImpactDescription = (score: number): string => {
    if (score <= 2) return 'Minimal functional impact';
    if (score <= 4) return 'Mild functional limitations';
    if (score <= 6) return 'Moderate functional limitations';
    if (score <= 8) return 'Significant functional limitations';
    return 'Severe functional limitations';
  };

  const renderQuestion = (question: ClinicalQuestion) => {
    const currentAnswer = answers[question.id];

    return (
      <Card key={question.id} className="mb-4">
        <CardContent className="pt-6">
          <Label className="text-base font-medium mb-4 block">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </Label>

          {question.type === 'scale' && (
            <div className="space-y-4">
              <Input
                type="range"
                min={question.scaleMin}
                max={question.scaleMax}
                value={currentAnswer || question.scaleMin}
                onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{question.scaleLabels?.min}</span>
                <span className="font-medium">{currentAnswer || question.scaleMin}</span>
                <span>{question.scaleLabels?.max}</span>
              </div>
            </div>
          )}

          {question.type === 'multiple' && (
            <RadioGroup
              value={currentAnswer || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                  <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.type === 'text' && (
            <Textarea
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Please provide details..."
              className="w-full"
            />
          )}

          {question.type === 'boolean' && (
            <RadioGroup
              value={currentAnswer?.toString() || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value === 'true')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`${question.id}-yes`} />
                <Label htmlFor={`${question.id}-yes`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`${question.id}-no`} />
                <Label htmlFor={`${question.id}-no`}>No</Label>
              </div>
            </RadioGroup>
          )}
        </CardContent>
      </Card>
    );
  };

  if (currentStep === 'analysis') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Analyzing Movement Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Analyzing {allAbnormalities.length} detected movement abnormalities...</p>
            <div className="grid gap-2">
              {allAbnormalities.map((abnormality, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{abnormality.type.replace(/_/g, ' ')}</span>
                  <Badge variant={abnormality.severity === 'severe' ? 'destructive' : abnormality.severity === 'moderate' ? 'default' : 'secondary'}>
                    {abnormality.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'questions') {
    const currentQuestion = CLINICAL_QUESTIONS[currentQuestionIndex];
    const canProceed = !currentQuestion.required || answers[currentQuestion.id] !== undefined;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Clinical Assessment</span>
              <span className="text-sm font-normal">
                Question {currentQuestionIndex + 1} of {CLINICAL_QUESTIONS.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / CLINICAL_QUESTIONS.length) * 100}%` }}
                />
              </div>
            </div>
            
            {renderQuestion(currentQuestion)}
            
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              <Button
                onClick={nextQuestion}
                disabled={!canProceed}
              >
                {currentQuestionIndex === CLINICAL_QUESTIONS.length - 1 ? 'Generate Diagnosis' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {detectedPatterns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detected Movement Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {detectedPatterns.slice(0, 3).map((pattern, index) => (
                  <div key={pattern.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{pattern.name}</span>
                      <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                    </div>
                    <Badge variant="outline">
                      {Math.round(pattern.likelihood * 100)}% match
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (currentStep === 'results' && diagnosticResult) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Diagnostic Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Primary Diagnosis</h3>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                  <span className="font-medium">{diagnosticResult.primaryDiagnosis}</span>
                  <Badge>{diagnosticResult.confidence}% confidence</Badge>
                </div>
              </div>

              {diagnosticResult.redFlags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Red Flags
                  </h3>
                  <div className="space-y-2">
                    {diagnosticResult.redFlags.map((flag, index) => (
                      <div key={index} className="p-2 bg-red-50 border-l-4 border-red-500 rounded">
                        <span className="text-red-700">{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-lg mb-2">Differential Diagnoses</h3>
                <div className="space-y-2">
                  {diagnosticResult.differentialDiagnoses.map((diff, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{diff.diagnosis}</span>
                      <Badge variant="outline">{diff.likelihood}%</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Functional Impact</h3>
                <p className="p-3 bg-gray-50 rounded">{diagnosticResult.functionalImpact}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Treatment Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Treatment Approach</h3>
                <p className="p-3 bg-blue-50 rounded">{diagnosticResult.recommendedTreatment}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Exercise Prescription</h3>
                <div className="space-y-2">
                  {diagnosticResult.exercisePrescription.map((exercise, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{exercise}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Follow-up Recommendations</h3>
                <div className="space-y-2">
                  {diagnosticResult.followUpRecommendations.map((recommendation, index) => (
                    <div key={index} className="p-2 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                      <span>{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Treatment Planning Call-to-Action */}
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">Diagnosis Complete</h3>
                </div>
                <p className="text-sm text-gray-700">
                  Clinical assessment finished. Ready to create personalized treatment protocols 
                  and evidence-based exercise prescriptions.
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>✓ Movement patterns analyzed</span>
                  <span>✓ Clinical diagnosis established</span>
                  <span>→ Treatment planning ready</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => {
                    if (onProceedToTreatment) {
                      onProceedToTreatment();
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3"
                >
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Create Treatment Plan
                </Button>
                <div className="text-xs text-center text-gray-500">
                  AI-powered protocols & exercises
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}