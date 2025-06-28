import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Target, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ClinicalQuestion {
  id: string;
  category: string;
  question: string;
  type: 'yes-no' | 'scale' | 'multiple-choice' | 'text' | 'numeric';
  options?: string[];
  scale?: { min: number; max: number; description: string };
  rationale: string;
  clinicalSignificance: string;
}

interface QuestionResponse {
  questionId: string;
  response: string | number;
  notes?: string;
  clinicalRelevance?: string;
}

interface ClinicalQuestionsInputProps {
  symptomData: any;
  posturalData: any;
  movementData: any;
  onQuestionsComplete: (responses: QuestionResponse[]) => void;
}

export default function ClinicalQuestionsInput({ 
  symptomData, 
  posturalData, 
  movementData,
  onQuestionsComplete 
}: ClinicalQuestionsInputProps) {
  const [clinicalQuestions, setClinicalQuestions] = useState<ClinicalQuestion[]>([]);
  const [questionResponses, setQuestionResponses] = useState<QuestionResponse[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    generateClinicalQuestions();
  }, [symptomData, posturalData, movementData]);

  const generateClinicalQuestions = async () => {
    setIsGeneratingQuestions(true);
    
    try {
      // Generate AI-recommended clinical questions based on assessment findings
      const questions = generateQuestionsBasedOnFindings();
      setClinicalQuestions(questions);
      
      // Initialize responses
      const initialResponses = questions.map(question => ({
        questionId: question.id,
        response: '',
        notes: '',
        clinicalRelevance: ''
      }));
      setQuestionResponses(initialResponses);
      
    } catch (error) {
      console.error('Error generating clinical questions:', error);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const generateQuestionsBasedOnFindings = (): ClinicalQuestion[] => {
    const bodyPart = symptomData?.primaryBodyPart || 'general';
    const symptoms = symptomData?.symptoms || [];
    const painLevel = symptomData?.painLevel || 0;
    
    // Generate questions based on findings
    const questionDatabase = {
      knee: [
        {
          id: 'knee-1',
          category: 'History',
          question: 'Did the patient report any specific mechanism of injury?',
          type: 'yes-no' as const,
          rationale: 'Understanding mechanism helps differentiate acute vs degenerative conditions',
          clinicalSignificance: 'Traumatic onset suggests structural damage; insidious onset suggests overuse'
        },
        {
          id: 'knee-2',
          category: 'Symptoms',
          question: 'Rate the severity of knee instability during activities',
          type: 'scale' as const,
          scale: { min: 0, max: 10, description: '0 = No instability, 10 = Cannot bear weight' },
          rationale: 'Instability suggests ligamentous involvement or muscular weakness',
          clinicalSignificance: 'High instability scores indicate need for stability testing and strengthening'
        },
        {
          id: 'knee-3',
          category: 'Function',
          question: 'Which activities are most problematic for the patient?',
          type: 'multiple-choice' as const,
          options: ['Stair climbing', 'Running', 'Pivoting', 'Squatting', 'Walking', 'Standing'],
          rationale: 'Activity limitations guide functional testing and treatment priorities',
          clinicalSignificance: 'Specific activity limitations indicate which structures to target'
        },
        {
          id: 'knee-4',
          category: 'Red Flags',
          question: 'Any signs of infection, fracture, or serious pathology?',
          type: 'text' as const,
          rationale: 'Essential to rule out serious pathology requiring immediate referral',
          clinicalSignificance: 'Presence of red flags requires immediate medical referral'
        }
      ],
      shoulder: [
        {
          id: 'shoulder-1',
          category: 'History',
          question: 'Is the pain worse with overhead activities?',
          type: 'yes-no' as const,
          rationale: 'Overhead pain suggests impingement or rotator cuff involvement',
          clinicalSignificance: 'Positive response indicates need for impingement testing'
        },
        {
          id: 'shoulder-2',
          category: 'Sleep',
          question: 'Rate sleep disturbance due to shoulder pain',
          type: 'scale' as const,
          scale: { min: 0, max: 10, description: '0 = No sleep issues, 10 = Cannot sleep' },
          rationale: 'Night pain is characteristic of rotator cuff pathology',
          clinicalSignificance: 'High sleep disturbance suggests significant tissue irritation'
        },
        {
          id: 'shoulder-3',
          category: 'Stability',
          question: 'Has the patient experienced any shoulder dislocations or subluxations?',
          type: 'yes-no' as const,
          rationale: 'History of instability affects treatment approach and prognosis',
          clinicalSignificance: 'Previous instability requires specific stability testing'
        },
        {
          id: 'shoulder-4',
          category: 'Function',
          question: 'Describe the impact on daily activities (reaching, lifting, dressing)',
          type: 'text' as const,
          rationale: 'Functional limitations guide treatment goals and progression',
          clinicalSignificance: 'Specific functional deficits inform exercise prescription'
        }
      ],
      hip: [
        {
          id: 'hip-1',
          category: 'Pain Pattern',
          question: 'Where is the pain primarily located?',
          type: 'multiple-choice' as const,
          options: ['Groin', 'Lateral hip', 'Posterior hip', 'Buttock', 'Referred to knee'],
          rationale: 'Pain location helps differentiate hip joint vs soft tissue pathology',
          clinicalSignificance: 'Different pain patterns suggest different structures involved'
        },
        {
          id: 'hip-2',
          category: 'Activities',
          question: 'Is pain worse with weight-bearing activities?',
          type: 'yes-no' as const,
          rationale: 'Weight-bearing pain suggests joint or load-bearing structure involvement',
          clinicalSignificance: 'Positive response indicates need for load management strategies'
        },
        {
          id: 'hip-3',
          category: 'Stiffness',
          question: 'Rate morning stiffness duration (minutes)',
          type: 'numeric' as const,
          rationale: 'Extended morning stiffness suggests inflammatory or degenerative conditions',
          clinicalSignificance: 'Prolonged stiffness may indicate osteoarthritis or inflammatory arthritis'
        },
        {
          id: 'hip-4',
          category: 'Function',
          question: 'Difficulty with specific activities',
          type: 'multiple-choice' as const,
          options: ['Getting in/out of car', 'Putting on shoes/socks', 'Stairs', 'Walking distance', 'Standing from sitting'],
          rationale: 'Specific functional limitations guide treatment priorities',
          clinicalSignificance: 'Activity-specific deficits inform targeted interventions'
        }
      ],
      spine: [
        {
          id: 'spine-1',
          category: 'Neurological',
          question: 'Any numbness, tingling, or weakness in arms/legs?',
          type: 'yes-no' as const,
          rationale: 'Neurological symptoms suggest nerve root or cord involvement',
          clinicalSignificance: 'Positive neurological signs require detailed neurological assessment'
        },
        {
          id: 'spine-2',
          category: 'Red Flags',
          question: 'Any bowel/bladder dysfunction, saddle anesthesia, or progressive weakness?',
          type: 'yes-no' as const,
          rationale: 'These are signs of cauda equina syndrome requiring emergency referral',
          clinicalSignificance: 'Positive response requires immediate medical referral'
        },
        {
          id: 'spine-3',
          category: 'Behavior',
          question: 'Is pain worse with sitting, standing, or walking?',
          type: 'multiple-choice' as const,
          options: ['Sitting', 'Standing', 'Walking', 'Lying down', 'Bending forward', 'Extending back'],
          rationale: 'Pain behavior helps differentiate disc vs facet vs other pathology',
          clinicalSignificance: 'Position-dependent pain guides treatment approach'
        },
        {
          id: 'spine-4',
          category: 'History',
          question: 'Previous episodes of back pain and their resolution',
          type: 'text' as const,
          rationale: 'Pattern of previous episodes affects prognosis and treatment planning',
          clinicalSignificance: 'Recurrent episodes may indicate underlying biomechanical issues'
        }
      ]
    };

    return questionDatabase[bodyPart as keyof typeof questionDatabase] || questionDatabase.spine;
  };

  const updateResponse = (questionId: string, field: keyof QuestionResponse, value: string | number) => {
    const updatedResponses = questionResponses.map(response => 
      response.questionId === questionId 
        ? { ...response, [field]: value }
        : response
    );
    setQuestionResponses(updatedResponses);
  };

  const handleCompleteQuestions = () => {
    onQuestionsComplete(questionResponses);
  };

  const getCompletedQuestions = () => {
    return questionResponses.filter(response => 
      response.response !== '' && response.response !== null && response.response !== undefined
    ).length;
  };

  const renderQuestionInput = (question: ClinicalQuestion, response: QuestionResponse) => {
    switch (question.type) {
      case 'yes-no':
        return (
          <RadioGroup
            value={response.response as string}
            onValueChange={(value) => updateResponse(question.id, 'response', value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id={`${question.id}-yes`} />
              <Label htmlFor={`${question.id}-yes`}>Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id={`${question.id}-no`} />
              <Label htmlFor={`${question.id}-no`}>No</Label>
            </div>
          </RadioGroup>
        );

      case 'scale':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">0</span>
              <input
                type="range"
                min={question.scale?.min || 0}
                max={question.scale?.max || 10}
                value={response.response as number || 0}
                onChange={(e) => updateResponse(question.id, 'response', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-500">{question.scale?.max || 10}</span>
            </div>
            <div className="text-center">
              <Badge variant="outline">Score: {response.response || 0}</Badge>
            </div>
            <p className="text-sm text-gray-600">{question.scale?.description}</p>
          </div>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${index}`}
                  checked={(response.response as string)?.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentResponse = response.response as string || '';
                    const responses = currentResponse ? currentResponse.split(',') : [];
                    if (checked) {
                      responses.push(option);
                    } else {
                      const index = responses.indexOf(option);
                      if (index > -1) responses.splice(index, 1);
                    }
                    updateResponse(question.id, 'response', responses.join(','));
                  }}
                />
                <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case 'numeric':
        return (
          <input
            type="number"
            value={response.response as number || ''}
            onChange={(e) => updateResponse(question.id, 'response', parseInt(e.target.value) || 0)}
            className="w-full p-2 border rounded-md"
            placeholder="Enter numeric value"
          />
        );

      case 'text':
        return (
          <Textarea
            value={response.response as string || ''}
            onChange={(e) => updateResponse(question.id, 'response', e.target.value)}
            placeholder="Enter detailed response..."
            rows={3}
          />
        );

      default:
        return null;
    }
  };

  if (isGeneratingQuestions) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Target className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Generating Clinical Questions</h3>
          <p className="text-gray-600">AI is creating targeted assessment questions based on your findings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Clinical Assessment Questions</h2>
        <p className="text-gray-600 mb-4">
          Answer these AI-generated questions to complete your clinical assessment
        </p>
        <Badge variant="outline" className="mb-4">
          {getCompletedQuestions()} of {clinicalQuestions.length} questions answered
        </Badge>
      </div>

      <div className="grid gap-6">
        {clinicalQuestions.map((question, index) => {
          const response = questionResponses.find(r => r.questionId === question.id);
          const isAnswered = response && response.response !== '' && response.response !== null;

          return (
            <Card key={question.id} className={`transition-all ${isAnswered ? 'ring-2 ring-green-200 bg-green-50' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isAnswered ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Clock className="h-6 w-6 text-gray-400" />
                    )}
                    <div>
                      <Badge variant="secondary" className="mb-2">{question.category}</Badge>
                      <CardTitle className="text-lg">{question.question}</CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Clinical Rationale */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Clinical Rationale</h4>
                    <p className="text-blue-800 text-sm">{question.rationale}</p>
                  </div>

                  {/* Question Input */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Response</Label>
                    {response && renderQuestionInput(question, response)}
                  </div>

                  {/* Additional Notes */}
                  {isAnswered && (
                    <div className="space-y-3 border-t pt-4">
                      <div>
                        <Label htmlFor={`notes-${question.id}`}>Additional Notes</Label>
                        <Textarea
                          id={`notes-${question.id}`}
                          placeholder="Any additional observations or context..."
                          value={response?.notes || ''}
                          onChange={(e) => updateResponse(question.id, 'notes', e.target.value)}
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`relevance-${question.id}`}>Clinical Relevance</Label>
                        <Select onValueChange={(value) => updateResponse(question.id, 'clinicalRelevance', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select clinical relevance" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not-relevant">Not Clinically Relevant</SelectItem>
                            <SelectItem value="mildly-relevant">Mildly Relevant</SelectItem>
                            <SelectItem value="moderately-relevant">Moderately Relevant</SelectItem>
                            <SelectItem value="highly-relevant">Highly Relevant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Clinical Significance */}
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-yellow-900 mb-1">Clinical Significance</h5>
                        <p className="text-yellow-800 text-sm">{question.clinicalSignificance}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center pt-6">
        <Button 
          onClick={handleCompleteQuestions}
          size="lg"
          className="px-8"
          disabled={getCompletedQuestions() === 0}
        >
          Complete Clinical Assessment
          <CheckCircle className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}