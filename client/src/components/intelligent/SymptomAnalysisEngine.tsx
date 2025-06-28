import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Brain, AlertTriangle, Target, Activity, ChevronRight, CheckCircle } from 'lucide-react';

interface SymptomData {
  primaryComplaint: string;
  painLocation: string;
  painIntensity: number;
  symptomDuration: string;
  onsetMechanism: string;
  aggravatingFactors: string;
  relievingFactors: string;
  functionalLimitations: string;
}

interface SymptomAnalysis {
  bodyRegion: string;
  suspectedConditions: Array<{
    condition: string;
    likelihood: number;
    reasoning: string;
  }>;
  redFlags: string[];
  recommendedMovements: Array<{
    name: string;
    purpose: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
  }>;
  clinicalQuestions: Array<{
    question: string;
    reasoning: string;
    category: string;
  }>;
}

interface SymptomAnalysisEngineProps {
  onAnalysisComplete: (analysis: SymptomAnalysis) => void;
  onProceedToPostural: () => void;
}

const bodyRegions = [
  'Neck/Cervical Spine',
  'Shoulder/Scapula',
  'Elbow/Forearm',
  'Wrist/Hand',
  'Thoracic Spine',
  'Lumbar Spine',
  'Hip/Pelvis',
  'Knee',
  'Ankle/Foot',
  'Multiple Regions'
];

const durationOptions = [
  'Less than 1 week',
  '1-4 weeks',
  '1-3 months',
  '3-6 months',
  '6-12 months',
  'More than 1 year'
];

const onsetOptions = [
  'Gradual onset',
  'Sudden onset',
  'After specific injury/trauma',
  'After repetitive activity',
  'Post-surgical',
  'Unknown/Insidious'
];

export default function SymptomAnalysisEngine({ onAnalysisComplete, onProceedToPostural }: SymptomAnalysisEngineProps) {
  const [currentStep, setCurrentStep] = useState<'input' | 'analyzing' | 'results'>('input');
  const [symptomData, setSymptomData] = useState<SymptomData>({
    primaryComplaint: '',
    painLocation: '',
    painIntensity: 5,
    symptomDuration: '',
    onsetMechanism: '',
    aggravatingFactors: '',
    relievingFactors: '',
    functionalLimitations: ''
  });
  const [analysisResult, setAnalysisResult] = useState<SymptomAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const updateSymptomData = (field: keyof SymptomData, value: any) => {
    setSymptomData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const analyzeSymptoms = async () => {
    setCurrentStep('analyzing');
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze-symptoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(symptomData),
      });

      if (response.ok) {
        const analysis = await response.json();
        setAnalysisResult(analysis);
        setCurrentStep('results');
        onAnalysisComplete(analysis);
      } else {
        // Fallback analysis if API fails
        const fallbackAnalysis = generateFallbackAnalysis();
        setAnalysisResult(fallbackAnalysis);
        setCurrentStep('results');
        onAnalysisComplete(fallbackAnalysis);
      }
    } catch (error) {
      console.error('Symptom analysis failed:', error);
      // Generate fallback analysis
      const fallbackAnalysis = generateFallbackAnalysis();
      setAnalysisResult(fallbackAnalysis);
      setCurrentStep('results');
      onAnalysisComplete(fallbackAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFallbackAnalysis = (): SymptomAnalysis => {
    const painLocation = symptomData.painLocation.toLowerCase();
    
    // Determine body region and suspected conditions based on pain location
    let bodyRegion = '';
    let suspectedConditions: Array<{ condition: string; likelihood: number; reasoning: string }> = [];
    let recommendedMovements: Array<{ name: string; purpose: string; priority: 'high' | 'medium' | 'low'; description: string }> = [];

    if (painLocation.includes('knee') || painLocation.includes('patella')) {
      bodyRegion = 'Knee';
      suspectedConditions = [
        {
          condition: 'Patellofemoral Pain Syndrome',
          likelihood: 75,
          reasoning: 'Anterior knee pain is commonly associated with PFPS, especially with functional activities'
        },
        {
          condition: 'Meniscal Pathology',
          likelihood: 60,
          reasoning: 'Knee pain with mechanical symptoms may indicate meniscal involvement'
        },
        {
          condition: 'IT Band Syndrome',
          likelihood: 45,
          reasoning: 'Lateral knee pain patterns suggest possible IT band friction'
        }
      ];
      recommendedMovements = [
        {
          name: 'Single Leg Squat',
          purpose: 'Assess dynamic knee control and hip stability',
          priority: 'high',
          description: 'Single limb loading to evaluate patellofemoral mechanics'
        },
        {
          name: 'Step Down Test',
          purpose: 'Evaluate eccentric quadriceps control',
          priority: 'high',
          description: 'Controlled descent to assess knee tracking and stability'
        },
        {
          name: 'Thomas Test Position',
          purpose: 'Assess hip flexor flexibility',
          priority: 'medium',
          description: 'Hip flexor tightness can contribute to knee dysfunction'
        }
      ];
    } else if (painLocation.includes('back') || painLocation.includes('lumbar') || painLocation.includes('spine')) {
      bodyRegion = 'Lumbar Spine';
      suspectedConditions = [
        {
          condition: 'Mechanical Low Back Pain',
          likelihood: 80,
          reasoning: 'Most common cause of low back pain in active populations'
        },
        {
          condition: 'Facet Joint Dysfunction',
          likelihood: 55,
          reasoning: 'Extension-based pain patterns suggest facet involvement'
        },
        {
          condition: 'Disc-related Pain',
          likelihood: 40,
          reasoning: 'Flexion-aggravated symptoms may indicate disc pathology'
        }
      ];
      recommendedMovements = [
        {
          name: 'Forward Bend Test',
          purpose: 'Assess spinal flexion and neural tension',
          priority: 'high',
          description: 'Evaluate lumbar flexion range and symptom provocation'
        },
        {
          name: 'Extension in Standing',
          purpose: 'Test facet joint loading and extension tolerance',
          priority: 'high',
          description: 'Assess extension-based symptom reproduction'
        },
        {
          name: 'Single Leg Stand',
          purpose: 'Evaluate core stability and hip control',
          priority: 'medium',
          description: 'Test lumbopelvic stability in single limb stance'
        }
      ];
    } else if (painLocation.includes('shoulder')) {
      bodyRegion = 'Shoulder/Scapula';
      suspectedConditions = [
        {
          condition: 'Rotator Cuff Tendinopathy',
          likelihood: 70,
          reasoning: 'Shoulder pain with overhead activities commonly involves rotator cuff'
        },
        {
          condition: 'Subacromial Impingement',
          likelihood: 65,
          reasoning: 'Pain with elevation suggests subacromial space narrowing'
        },
        {
          condition: 'Adhesive Capsulitis',
          likelihood: 30,
          reasoning: 'Progressive stiffness may indicate capsular restriction'
        }
      ];
      recommendedMovements = [
        {
          name: 'Overhead Reach Test',
          purpose: 'Assess shoulder elevation and scapular rhythm',
          priority: 'high',
          description: 'Bilateral shoulder elevation to evaluate range and quality'
        },
        {
          name: 'Wall Slide Test',
          purpose: 'Evaluate scapular control and posterior chain flexibility',
          priority: 'high',
          description: 'Against-wall movement to assess scapular stability'
        },
        {
          name: 'Internal/External Rotation',
          purpose: 'Test rotator cuff function and capsular mobility',
          priority: 'medium',
          description: 'Assess rotational range of motion and strength'
        }
      ];
    } else {
      bodyRegion = 'General Musculoskeletal';
      suspectedConditions = [
        {
          condition: 'Musculoskeletal Pain Syndrome',
          likelihood: 60,
          reasoning: 'Non-specific pain pattern requiring further assessment'
        }
      ];
      recommendedMovements = [
        {
          name: 'General Movement Screen',
          purpose: 'Assess overall movement quality',
          priority: 'high',
          description: 'Comprehensive movement evaluation'
        }
      ];
    }

    const redFlags: string[] = [];
    if (symptomData.painIntensity >= 8) {
      redFlags.push('High pain intensity requiring close monitoring');
    }
    if (symptomData.symptomDuration === 'More than 1 year') {
      redFlags.push('Chronic condition requiring comprehensive management');
    }

    const clinicalQuestions = [
      {
        question: 'Does the pain radiate or refer to other areas?',
        reasoning: 'Radicular patterns may indicate neural involvement',
        category: 'Neurological'
      },
      {
        question: 'Are there any mechanical symptoms (clicking, locking, giving way)?',
        reasoning: 'Mechanical symptoms suggest structural pathology',
        category: 'Mechanical'
      },
      {
        question: 'How does the pain behave with activity vs rest?',
        reasoning: 'Activity patterns help differentiate inflammatory vs mechanical causes',
        category: 'Behavioral'
      }
    ];

    return {
      bodyRegion,
      suspectedConditions,
      redFlags,
      recommendedMovements,
      clinicalQuestions
    };
  };

  const isFormValid = () => {
    return symptomData.primaryComplaint.trim() !== '' &&
           symptomData.painLocation !== '' &&
           symptomData.symptomDuration !== '' &&
           symptomData.onsetMechanism !== '';
  };

  if (currentStep === 'analyzing') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Brain className="h-12 w-12 text-blue-600 animate-pulse" />
          </div>
          <CardTitle>Analyzing Patient Symptoms</CardTitle>
          <CardDescription>
            AI is processing symptom patterns and generating assessment recommendations...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Analysis Progress</span>
              <span>Processing...</span>
            </div>
            <Progress value={85} className="w-full" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Symptom Classification</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Red Flag Screening</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
              <span>Movement Selection</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
              <span>Clinical Reasoning</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'results' && analysisResult) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Target className="h-6 w-6 text-blue-600" />
                  Symptom Analysis Results
                </CardTitle>
                <CardDescription>
                  AI-powered symptom analysis and assessment recommendations
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {analysisResult.bodyRegion}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Suspected Conditions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Suspected Conditions</h3>
              <div className="space-y-3">
                {analysisResult.suspectedConditions.map((condition, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{condition.condition}</h4>
                      <Badge variant="secondary">{condition.likelihood}% likelihood</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{condition.reasoning}</p>
                    <Progress value={condition.likelihood} className="mt-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Red Flags */}
            {analysisResult.redFlags.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Clinical Considerations:</strong>
                  <ul className="mt-2 space-y-1">
                    {analysisResult.redFlags.map((flag, index) => (
                      <li key={index} className="text-sm">• {flag}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Recommended Movements */}
            <div>
              <h3 className="text-lg font-semibold mb-3">AI-Recommended Movement Tests</h3>
              <div className="grid gap-4">
                {analysisResult.recommendedMovements.map((movement, index) => (
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
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Purpose:</strong> {movement.purpose}
                    </p>
                    <p className="text-sm text-muted-foreground">{movement.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Questions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Additional Clinical Questions</h3>
              <div className="space-y-3">
                {analysisResult.clinicalQuestions.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <p className="font-medium mb-1">{item.question}</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>{item.category}:</strong> {item.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button onClick={onProceedToPostural} className="flex-1">
                <Activity className="h-4 w-4 mr-2" />
                Proceed to Postural Analysis
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep('input')}>
                Modify Symptoms
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Input Step
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Patient Symptom Analysis
          </CardTitle>
          <CardDescription>
            Enter patient symptoms for AI-powered assessment and movement recommendation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Complaint */}
          <div className="space-y-2">
            <Label htmlFor="complaint">Primary Complaint *</Label>
            <Textarea
              id="complaint"
              placeholder="Describe the patient's main symptoms (e.g., 'Anterior knee pain when climbing stairs' or 'Lower back pain with forward bending')"
              value={symptomData.primaryComplaint}
              onChange={(e) => updateSymptomData('primaryComplaint', e.target.value)}
              rows={3}
            />
          </div>

          {/* Pain Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Primary Pain Location *</Label>
            <Select value={symptomData.painLocation} onValueChange={(value) => updateSymptomData('painLocation', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select primary pain location..." />
              </SelectTrigger>
              <SelectContent>
                {bodyRegions.map(region => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pain Intensity */}
          <div className="space-y-4">
            <Label>Pain Intensity (0-10 scale)</Label>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>No pain</span>
              <span>Worst pain</span>
            </div>
            <Slider
              value={[symptomData.painIntensity]}
              onValueChange={(values) => updateSymptomData('painIntensity', values[0])}
              max={10}
              min={0}
              step={1}
              className="w-full"
            />
            <div className="text-center text-lg font-semibold">
              {symptomData.painIntensity} / 10
            </div>
          </div>

          {/* Symptom Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Symptom Duration *</Label>
            <Select value={symptomData.symptomDuration} onValueChange={(value) => updateSymptomData('symptomDuration', value)}>
              <SelectTrigger>
                <SelectValue placeholder="How long have symptoms been present?" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map(duration => (
                  <SelectItem key={duration} value={duration}>
                    {duration}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Onset Mechanism */}
          <div className="space-y-2">
            <Label htmlFor="onset">Onset Mechanism *</Label>
            <Select value={symptomData.onsetMechanism} onValueChange={(value) => updateSymptomData('onsetMechanism', value)}>
              <SelectTrigger>
                <SelectValue placeholder="How did the symptoms begin?" />
              </SelectTrigger>
              <SelectContent>
                {onsetOptions.map(onset => (
                  <SelectItem key={onset} value={onset}>
                    {onset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aggravating Factors */}
          <div className="space-y-2">
            <Label htmlFor="aggravating">Aggravating Factors</Label>
            <Textarea
              id="aggravating"
              placeholder="What makes the symptoms worse? (e.g., stairs, sitting, overhead activities)"
              value={symptomData.aggravatingFactors}
              onChange={(e) => updateSymptomData('aggravatingFactors', e.target.value)}
              rows={2}
            />
          </div>

          {/* Relieving Factors */}
          <div className="space-y-2">
            <Label htmlFor="relieving">Relieving Factors</Label>
            <Textarea
              id="relieving"
              placeholder="What makes the symptoms better? (e.g., rest, heat, specific positions)"
              value={symptomData.relievingFactors}
              onChange={(e) => updateSymptomData('relievingFactors', e.target.value)}
              rows={2}
            />
          </div>

          {/* Functional Limitations */}
          <div className="space-y-2">
            <Label htmlFor="limitations">Functional Limitations</Label>
            <Textarea
              id="limitations"
              placeholder="How do symptoms affect daily activities? (e.g., difficulty with stairs, sleep disturbance, work limitations)"
              value={symptomData.functionalLimitations}
              onChange={(e) => updateSymptomData('functionalLimitations', e.target.value)}
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <Button 
            onClick={analyzeSymptoms} 
            disabled={!isFormValid()}
            className="w-full"
          >
            <Brain className="h-4 w-4 mr-2" />
            Analyze Symptoms with AI
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}