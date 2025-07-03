import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Camera, Upload, Brain, AlertTriangle, CheckCircle, FileImage, Zap, Target, Activity } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface SymptomData {
  painLevel: number;
  painDuration: string;
  painType: string;
  painTriggers: string[];
  painRelief: string[];
  swelling: boolean;
  bruising: boolean;
  stiffness: boolean;
  weakness: boolean;
  numbness: boolean;
  previousInjury: boolean;
  additionalSymptoms: string;
}

interface DiagnosticAnalysis {
  primaryDiagnosis: {
    condition: string;
    confidence: number;
    reasoning: string;
  };
  differentialDiagnoses: Array<{
    condition: string;
    confidence: number;
    reasoning: string;
  }>;
  visualFindings: string[];
  recommendations: {
    immediateActions: string[];
    treatmentOptions: string[];
    referralNeeded: boolean;
    followUpTimeframe: string;
  };
  redFlags: string[];
  confidenceScore: number;
}

const bodyParts = [
  { value: 'knee', label: 'Knee' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'back', label: 'Lower Back' },
  { value: 'neck', label: 'Neck' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'hip', label: 'Hip' },
  { value: 'elbow', label: 'Elbow' },
  { value: 'wrist', label: 'Wrist' },
  { value: 'foot', label: 'Foot' },
  { value: 'hand', label: 'Hand' },
];

const painTypes = [
  'Sharp', 'Dull', 'Aching', 'Burning', 'Throbbing', 'Stabbing', 'Cramping', 'Electric'
];

const painTriggers = [
  'Movement', 'Weight bearing', 'Touch', 'Heat', 'Cold', 'Morning stiffness', 'Exercise', 'Rest'
];

const painReliefOptions = [
  'Rest', 'Ice', 'Heat', 'Movement', 'Medication', 'Massage', 'Stretching', 'Nothing helps'
];

export default function BodyScanner() {
  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [symptoms, setSymptoms] = useState<SymptomData>({
    painLevel: 5,
    painDuration: '',
    painType: '',
    painTriggers: [],
    painRelief: [],
    swelling: false,
    bruising: false,
    stiffness: false,
    weakness: false,
    numbness: false,
    previousInjury: false,
    additionalSymptoms: ''
  });
  const [analysis, setAnalysis] = useState<DiagnosticAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get capture guidance for selected body part
  const { data: captureGuidance } = useQuery({
    queryKey: ['/api/body-scanner/guidance', selectedBodyPart],
    enabled: !!selectedBodyPart,
  });

  // Get user's previous scans
  const { data: previousScans } = useQuery({
    queryKey: ['/api/body-scanner/scans'],
  });

  const handleImageCapture = (file: File) => {
    setCapturedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setCurrentStep(3);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageCapture(file);
    }
  };

  const updateSymptoms = (key: keyof SymptomData, value: any) => {
    setSymptoms(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayValue = (array: string[], value: string) => {
    return array.includes(value) 
      ? array.filter(item => item !== value)
      : [...array, value];
  };

  const handleAnalysis = async () => {
    if (!capturedImage || !selectedBodyPart) return;

    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('image', capturedImage);
      formData.append('bodyPart', selectedBodyPart);
      formData.append('symptoms', JSON.stringify(symptoms));

      const response = await fetch('/api/body-scanner/analyze', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const result = await response.json();
      setAnalysis(result.analysis);
      setCurrentStep(4);
      
      // Invalidate scans list to include new scan
      queryClient.invalidateQueries({ queryKey: ['/api/body-scanner/scans'] });
      
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetScanner = () => {
    setSelectedBodyPart('');
    setCapturedImage(null);
    setImagePreview('');
    setSymptoms({
      painLevel: 5,
      painDuration: '',
      painType: '',
      painTriggers: [],
      painRelief: [],
      swelling: false,
      bruising: false,
      stiffness: false,
      weakness: false,
      numbness: false,
      previousInjury: false,
      additionalSymptoms: ''
    });
    setAnalysis(null);
    setCurrentStep(1);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {step}
          </div>
          {step < 4 && (
            <div className={`w-16 h-1 mx-2 ${
              step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Brain className="w-8 h-8 text-blue-600" />
          AI Body Scanner
        </h1>
        <p className="text-gray-600">
          Advanced diagnostic imaging analysis for physiotherapy assessment
        </p>
      </div>

      {renderStepIndicator()}

      <Tabs value={currentStep <= 3 ? "scanner" : "results"} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scanner">Scanner</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Step 1: Select Body Part
                </CardTitle>
                <CardDescription>
                  Choose the area you'd like to analyze
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedBodyPart} onValueChange={setSelectedBodyPart}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select body part to analyze" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodyParts.map((part) => (
                      <SelectItem key={part.value} value={part.value}>
                        {part.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedBodyPart && captureGuidance && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Capture Guidelines for {bodyParts.find(p => p.value === selectedBodyPart)?.label}</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-2">
                        <div>
                          <strong>Instructions:</strong>
                          <ul className="list-disc list-inside ml-2">
                            {captureGuidance.instructions?.map((instruction: string, index: number) => (
                              <li key={index}>{instruction}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong>Required Views:</strong> {captureGuidance.requiredViews?.join(', ')}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={() => setCurrentStep(2)} 
                  disabled={!selectedBodyPart}
                  className="w-full"
                >
                  Next: Capture Image
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Step 2: Capture Image
                </CardTitle>
                <CardDescription>
                  Take or upload a clear image of the affected area
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-32 flex flex-col gap-2"
                    variant="outline"
                  >
                    <Upload className="w-8 h-8" />
                    Upload Image
                  </Button>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-32 flex flex-col gap-2"
                    variant="outline"
                  >
                    <Camera className="w-8 h-8" />
                    Take Photo
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {imagePreview && (
                  <div className="mt-4">
                    <img 
                      src={imagePreview} 
                      alt="Captured" 
                      className="max-w-full h-48 object-cover rounded-lg border"
                    />
                    <Button 
                      onClick={() => setCurrentStep(3)} 
                      className="w-full mt-2"
                    >
                      Next: Enter Symptoms
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Step 3: Symptom Assessment
                </CardTitle>
                <CardDescription>
                  Provide detailed information about your symptoms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Pain Level (0-10): {symptoms.painLevel}
                  </label>
                  <Slider
                    value={[symptoms.painLevel]}
                    onValueChange={(value) => updateSymptoms('painLevel', value[0])}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Pain Duration</label>
                    <Select 
                      value={symptoms.painDuration} 
                      onValueChange={(value) => updateSymptoms('painDuration', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acute">Acute (&lt; 2 weeks)</SelectItem>
                        <SelectItem value="subacute">Subacute (2-12 weeks)</SelectItem>
                        <SelectItem value="chronic">Chronic (&gt; 12 weeks)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Pain Type</label>
                    <Select 
                      value={symptoms.painType} 
                      onValueChange={(value) => updateSymptoms('painType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pain type" />
                      </SelectTrigger>
                      <SelectContent>
                        {painTypes.map((type) => (
                          <SelectItem key={type} value={type.toLowerCase()}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Pain Triggers</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {painTriggers.map((trigger) => (
                      <div key={trigger} className="flex items-center space-x-2">
                        <Checkbox
                          id={trigger}
                          checked={symptoms.painTriggers.includes(trigger)}
                          onCheckedChange={() => 
                            updateSymptoms('painTriggers', 
                              toggleArrayValue(symptoms.painTriggers, trigger)
                            )
                          }
                        />
                        <label htmlFor={trigger} className="text-sm">
                          {trigger}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Pain Relief</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {painReliefOptions.map((relief) => (
                      <div key={relief} className="flex items-center space-x-2">
                        <Checkbox
                          id={relief}
                          checked={symptoms.painRelief.includes(relief)}
                          onCheckedChange={() => 
                            updateSymptoms('painRelief', 
                              toggleArrayValue(symptoms.painRelief, relief)
                            )
                          }
                        />
                        <label htmlFor={relief} className="text-sm">
                          {relief}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Additional Symptoms</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['swelling', 'bruising', 'stiffness', 'weakness', 'numbness', 'previousInjury'].map((symptom) => (
                      <div key={symptom} className="flex items-center space-x-2">
                        <Checkbox
                          id={symptom}
                          checked={symptoms[symptom as keyof SymptomData] as boolean}
                          onCheckedChange={(checked) => updateSymptoms(symptom as keyof SymptomData, checked)}
                        />
                        <label htmlFor={symptom} className="text-sm capitalize">
                          {symptom.replace(/([A-Z])/g, ' $1')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Additional Notes</label>
                  <Textarea
                    value={symptoms.additionalSymptoms}
                    onChange={(e) => updateSymptoms('additionalSymptoms', e.target.value)}
                    placeholder="Any other symptoms or relevant information..."
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleAnalysis}
                  disabled={isAnalyzing || !capturedImage}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results">
          {analysis ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Analysis Complete
                  </CardTitle>
                  <CardDescription>
                    AI-powered diagnostic assessment results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Primary Diagnosis</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{analysis.primaryDiagnosis.condition}</span>
                          <Badge variant="secondary">
                            {analysis.primaryDiagnosis.confidence}% confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{analysis.primaryDiagnosis.reasoning}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Overall Confidence</h3>
                      <Progress value={analysis.confidenceScore} className="w-full" />
                      <p className="text-sm text-gray-600 mt-1">
                        {analysis.confidenceScore}% diagnostic confidence
                      </p>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3">Differential Diagnoses</h3>
                      <div className="space-y-2">
                        {analysis.differentialDiagnoses.map((diff, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{diff.condition}</span>
                              <Badge variant="outline">{diff.confidence}%</Badge>
                            </div>
                            <p className="text-sm text-gray-600">{diff.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {analysis.visualFindings.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Visual Findings</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {analysis.visualFindings.map((finding, index) => (
                            <li key={index} className="text-sm">{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.redFlags.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Red Flags Identified</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside mt-2">
                            {analysis.redFlags.map((flag, index) => (
                              <li key={index}>{flag}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <h3 className="font-semibold mb-3">Recommendations</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Immediate Actions</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {analysis.recommendations.immediateActions.map((action, index) => (
                              <li key={index}>{action}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Treatment Options</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {analysis.recommendations.treatmentOptions.map((treatment, index) => (
                              <li key={index}>{treatment}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">Professional Review</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          {analysis.recommendations.referralNeeded 
                            ? 'Professional referral recommended' 
                            : 'Self-management may be appropriate'
                          } - Follow up {analysis.recommendations.followUpTimeframe}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <Button onClick={resetScanner} className="w-full">
                      Start New Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No analysis results yet. Complete a scan to see results here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Previous Scans</CardTitle>
              <CardDescription>View your scanning history and results</CardDescription>
            </CardHeader>
            <CardContent>
              {previousScans && previousScans.length > 0 ? (
                <div className="space-y-4">
                  {previousScans.map((scan: any) => (
                    <div key={scan.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium capitalize">{scan.bodyPart} Analysis</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(scan.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={scan.reviewedByProfessional ? "default" : "secondary"}>
                          {scan.reviewedByProfessional ? "Reviewed" : "Pending"}
                        </Badge>
                      </div>
                      {scan.analysisResults?.primaryDiagnosis && (
                        <p className="text-sm">
                          <strong>Primary:</strong> {scan.analysisResults.primaryDiagnosis.condition} 
                          ({scan.analysisResults.primaryDiagnosis.confidence}% confidence)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No previous scans found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}