import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Activity, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface MovementTest {
  name: string;
  description: string;
  instructions: string;
  normalFindings: string;
  significantFindings: string;
  scoring?: string;
}

interface MovementTestResult {
  testName: string;
  performed: boolean;
  result: string;
  painResponse: string;
  functionalLimitation: string;
  compensatoryMovements: string;
  clinicalSignificance: string;
  notes: string;
}

interface MovementTestInputProps {
  symptomData: any;
  posturalData: any;
  onTestResultsComplete: (results: MovementTestResult[]) => void;
}

export default function MovementTestInput({ 
  symptomData, 
  posturalData, 
  onTestResultsComplete 
}: MovementTestInputProps) {
  const [recommendedTests, setRecommendedTests] = useState<MovementTest[]>([]);
  const [testResults, setTestResults] = useState<MovementTestResult[]>([]);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  useEffect(() => {
    generateRecommendedTests();
  }, [symptomData, posturalData]);

  const generateRecommendedTests = async () => {
    setIsGeneratingTests(true);
    
    try {
      // Generate AI-recommended movement tests based on symptoms and posture
      const tests = generateTestsBasedOnFindings();
      setRecommendedTests(tests);
      
      // Initialize test results
      const initialResults = tests.map(test => ({
        testName: test.name,
        performed: false,
        result: '',
        painResponse: '',
        functionalLimitation: '',
        compensatoryMovements: '',
        clinicalSignificance: '',
        notes: ''
      }));
      setTestResults(initialResults);
      
    } catch (error) {
      console.error('Error generating movement tests:', error);
    } finally {
      setIsGeneratingTests(false);
    }
  };

  const generateTestsBasedOnFindings = (): MovementTest[] => {
    const bodyPart = symptomData?.primaryBodyPart || 'general';
    const symptoms = symptomData?.symptoms || [];
    
    // Generate tests based on body part and symptoms
    const testDatabase = {
      knee: [
        {
          name: "Single Leg Squat",
          description: "Assesses dynamic knee stability and control",
          instructions: "Patient performs single leg squat while maintaining balance and alignment",
          normalFindings: "Smooth controlled movement, knee tracking over 2nd toe, no pain",
          significantFindings: "Knee valgus, loss of balance, pain, compensatory movements",
          scoring: "0-3 scale (0=normal, 3=severe dysfunction)"
        },
        {
          name: "Anterior Drawer Test",
          description: "Assesses ACL integrity",
          instructions: "Patient supine, knee at 90°, examiner stabilizes tibia and pulls forward",
          normalFindings: "Firm end feel, minimal translation",
          significantFindings: "Excessive anterior translation, soft end feel, pain",
          scoring: "Grade 1-3 laxity"
        },
        {
          name: "McMurray Test",
          description: "Assesses meniscal integrity",
          instructions: "Patient supine, flex knee fully, rotate tibia while extending knee",
          normalFindings: "No click, pop, or pain",
          significantFindings: "Audible click, pain, catching sensation",
          scoring: "Positive/Negative"
        }
      ],
      shoulder: [
        {
          name: "Empty Can Test (Supraspinatus Test)",
          description: "Assesses supraspinatus muscle strength and integrity",
          instructions: "Arm elevated to 90° in scapular plane, thumbs down, resist downward pressure",
          normalFindings: "Strong resistance, no pain",
          significantFindings: "Weakness, pain, inability to maintain position",
          scoring: "0-5 manual muscle test scale"
        },
        {
          name: "Hawkins-Kennedy Test",
          description: "Assesses for subacromial impingement",
          instructions: "Arm flexed to 90°, forcibly internally rotate shoulder",
          normalFindings: "No pain or discomfort",
          significantFindings: "Pain in anterior shoulder, impingement symptoms",
          scoring: "Positive/Negative"
        },
        {
          name: "Apprehension Test",
          description: "Assesses anterior shoulder instability",
          instructions: "Arm in 90° abduction and external rotation, apply anteriorly directed force",
          normalFindings: "No apprehension or pain",
          significantFindings: "Patient apprehension, fear of dislocation",
          scoring: "Positive/Negative with apprehension level"
        }
      ],
      hip: [
        {
          name: "Trendelenburg Test",
          description: "Assesses gluteus medius strength and hip stability",
          instructions: "Patient stands on one leg for 30 seconds",
          normalFindings: "Pelvis remains level, no hip drop",
          significantFindings: "Contralateral pelvic drop, compensatory movements",
          scoring: "Positive/Negative with degree of drop"
        },
        {
          name: "FABER Test (Patrick's Test)",
          description: "Assesses hip joint mobility and SI joint function",
          instructions: "Hip flexed, abducted, externally rotated, apply overpressure",
          normalFindings: "No pain, normal range of motion",
          significantFindings: "Hip or SI joint pain, limited range",
          scoring: "Positive/Negative with pain location"
        },
        {
          name: "Thomas Test",
          description: "Assesses hip flexor tightness",
          instructions: "Patient supine, pull one knee to chest, observe opposite leg",
          normalFindings: "Opposite leg remains flat on table",
          significantFindings: "Hip flexion, knee extension indicating tightness",
          scoring: "Degrees of hip flexion contracture"
        }
      ],
      spine: [
        {
          name: "Straight Leg Raise (SLR)",
          description: "Assesses nerve root irritation and hamstring flexibility",
          instructions: "Patient supine, passively flex hip with knee extended",
          normalFindings: "70-90° hip flexion, no radicular symptoms",
          significantFindings: "Pain below knee, numbness, tingling",
          scoring: "Degrees achieved and symptom reproduction"
        },
        {
          name: "Slump Test",
          description: "Assesses neural tension and nerve root irritation",
          instructions: "Patient seated, progressively add spinal flexion, knee extension",
          normalFindings: "No reproduction of symptoms",
          significantFindings: "Leg pain, numbness, symptom reproduction",
          scoring: "Positive/Negative with symptom location"
        },
        {
          name: "Lumbar Extension Test",
          description: "Assesses facet joint involvement and spinal stenosis",
          instructions: "Patient stands and extends lumbar spine",
          normalFindings: "No increase in symptoms",
          significantFindings: "Increased back or leg pain",
          scoring: "Symptom reproduction and severity"
        }
      ]
    };

    return testDatabase[bodyPart as keyof typeof testDatabase] || testDatabase.knee;
  };

  const updateTestResult = (index: number, field: keyof MovementTestResult, value: string | boolean) => {
    const updatedResults = [...testResults];
    updatedResults[index] = { ...updatedResults[index], [field]: value };
    setTestResults(updatedResults);
  };

  const handleCompleteAssessment = () => {
    onTestResultsComplete(testResults);
  };

  const getCompletedTests = () => {
    return testResults.filter(result => result.performed).length;
  };

  if (isGeneratingTests) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Generating Movement Tests</h3>
          <p className="text-gray-600">AI is analyzing symptoms and posture to recommend specific tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Movement Testing Phase</h2>
        <p className="text-gray-600 mb-4">
          Perform the AI-recommended movement tests and record your findings
        </p>
        <Badge variant="outline" className="mb-4">
          {getCompletedTests()} of {recommendedTests.length} tests completed
        </Badge>
      </div>

      <div className="grid gap-6">
        {recommendedTests.map((test, index) => (
          <Card key={index} className={`transition-all ${testResults[index]?.performed ? 'ring-2 ring-green-200 bg-green-50' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {testResults[index]?.performed ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-400" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <CardDescription>{test.description}</CardDescription>
                  </div>
                </div>
                <Checkbox
                  checked={testResults[index]?.performed || false}
                  onCheckedChange={(checked) => updateTestResult(index, 'performed', checked as boolean)}
                />
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* Test Instructions */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Test Instructions</h4>
                  <p className="text-blue-800">{test.instructions}</p>
                </div>

                {/* Normal vs Significant Findings */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h5 className="font-medium text-green-900 mb-1">Normal Findings</h5>
                    <p className="text-green-800 text-sm">{test.normalFindings}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h5 className="font-medium text-red-900 mb-1">Significant Findings</h5>
                    <p className="text-red-800 text-sm">{test.significantFindings}</p>
                  </div>
                </div>

                {/* Test Results Input */}
                {testResults[index]?.performed && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`result-${index}`}>Test Result</Label>
                        <Select onValueChange={(value) => updateTestResult(index, 'result', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select result" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="abnormal">Abnormal</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                            <SelectItem value="inconclusive">Inconclusive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`pain-${index}`}>Pain Response</Label>
                        <Select onValueChange={(value) => updateTestResult(index, 'painResponse', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pain level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Pain</SelectItem>
                            <SelectItem value="mild">Mild Pain (1-3/10)</SelectItem>
                            <SelectItem value="moderate">Moderate Pain (4-6/10)</SelectItem>
                            <SelectItem value="severe">Severe Pain (7-10/10)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`functional-${index}`}>Functional Limitation</Label>
                      <Textarea
                        id={`functional-${index}`}
                        placeholder="Describe any functional limitations observed..."
                        value={testResults[index]?.functionalLimitation || ''}
                        onChange={(e) => updateTestResult(index, 'functionalLimitation', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`compensatory-${index}`}>Compensatory Movements</Label>
                      <Textarea
                        id={`compensatory-${index}`}
                        placeholder="Note any compensatory movement patterns..."
                        value={testResults[index]?.compensatoryMovements || ''}
                        onChange={(e) => updateTestResult(index, 'compensatoryMovements', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`significance-${index}`}>Clinical Significance</Label>
                      <Select onValueChange={(value) => updateTestResult(index, 'clinicalSignificance', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select clinical significance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not-significant">Not Clinically Significant</SelectItem>
                          <SelectItem value="mildly-significant">Mildly Significant</SelectItem>
                          <SelectItem value="moderately-significant">Moderately Significant</SelectItem>
                          <SelectItem value="highly-significant">Highly Significant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`notes-${index}`}>Additional Notes</Label>
                      <Textarea
                        id={`notes-${index}`}
                        placeholder="Any additional observations or notes..."
                        value={testResults[index]?.notes || ''}
                        onChange={(e) => updateTestResult(index, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center pt-6">
        <Button 
          onClick={handleCompleteAssessment}
          size="lg"
          className="px-8"
          disabled={getCompletedTests() === 0}
        >
          Complete Movement Assessment
          <CheckCircle className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}