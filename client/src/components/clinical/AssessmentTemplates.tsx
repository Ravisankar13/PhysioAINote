import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

interface AssessmentTemplate {
  id: string;
  name: string;
  bodyPart: string;
  category: 'screening' | 'assessment' | 'outcome';
  description: string;
  evidenceLevel: 'A' | 'B' | 'C';
  questions: AssessmentQuestion[];
}

interface AssessmentQuestion {
  id: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'scale';
  question: string;
  options?: string[];
  required: boolean;
  scoring?: {
    type: 'sum' | 'weighted' | 'interpretation';
    interpretation?: { [key: string]: string };
  };
}

interface RedFlag {
  id: string;
  question: string;
  severity: 'high' | 'moderate' | 'low';
  action: string;
}

const redFlags: RedFlag[] = [
  {
    id: 'fever',
    question: 'Does the patient have a fever or signs of systemic infection?',
    severity: 'high',
    action: 'Immediate medical referral required'
  },
  {
    id: 'bowel_bladder',
    question: 'Any recent onset bowel or bladder dysfunction?',
    severity: 'high',
    action: 'Urgent medical referral - possible cauda equina'
  },
  {
    id: 'progressive_neuro',
    question: 'Progressive neurological deficit or weakness?',
    severity: 'high',
    action: 'Medical referral within 24 hours'
  },
  {
    id: 'trauma',
    question: 'History of significant trauma or fall?',
    severity: 'moderate',
    action: 'Consider imaging and medical consultation'
  },
  {
    id: 'night_pain',
    question: 'Severe night pain that wakes the patient?',
    severity: 'moderate',
    action: 'Consider serious pathology screening'
  },
  {
    id: 'weight_loss',
    question: 'Unexplained weight loss or loss of appetite?',
    severity: 'moderate',
    action: 'Medical screening recommended'
  }
];

const assessmentTemplates: AssessmentTemplate[] = [
  {
    id: 'dash',
    name: 'DASH - Disabilities of Arm, Shoulder and Hand',
    bodyPart: 'upper_extremity',
    category: 'outcome',
    description: 'Validated outcome measure for upper extremity dysfunction',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'q1',
        type: 'select',
        question: 'Open a tight or new jar',
        options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable'],
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'q2',
        type: 'select',
        question: 'Write',
        options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable'],
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'q3',
        type: 'select',
        question: 'Turn a key',
        options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable'],
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  },
  {
    id: 'shoulder_impingement',
    name: 'Shoulder Impingement Assessment',
    bodyPart: 'shoulder',
    category: 'assessment',
    description: 'Clinical tests for shoulder impingement syndrome',
    evidenceLevel: 'B',
    questions: [
      {
        id: 'hawkins_test',
        type: 'select',
        question: 'Hawkins-Kennedy Test',
        options: ['Negative', 'Positive', 'Unable to perform'],
        required: true
      },
      {
        id: 'neers_test',
        type: 'select',
        question: "Neer's Impingement Sign",
        options: ['Negative', 'Positive', 'Unable to perform'],
        required: true
      },
      {
        id: 'empty_can',
        type: 'select',
        question: 'Empty Can Test (Supraspinatus)',
        options: ['Negative', 'Positive', 'Unable to perform'],
        required: true
      },
      {
        id: 'painful_arc',
        type: 'select',
        question: 'Painful Arc (60-120 degrees)',
        options: ['Absent', 'Present', 'Unable to assess'],
        required: true
      }
    ]
  },
  {
    id: 'cervical_screening',
    name: 'Cervical Spine Screening',
    bodyPart: 'neck',
    category: 'screening',
    description: 'Screening for cervical spine pathology and red flags',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'ccr_age',
        type: 'number',
        question: 'Patient age',
        required: true
      },
      {
        id: 'ccr_mechanism',
        type: 'select',
        question: 'Mechanism of injury',
        options: ['High-speed MVA', 'Fall from height', 'Diving injury', 'Other trauma', 'Non-traumatic'],
        required: true
      },
      {
        id: 'ccr_neuro',
        type: 'checkbox',
        question: 'Neurological symptoms present',
        required: true
      }
    ]
  },
  {
    id: 'low_back_stm',
    name: 'STarT Back Screening Tool',
    bodyPart: 'back',
    category: 'screening',
    description: 'Stratifies low back pain patients for treatment approaches',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'stm_q1',
        type: 'checkbox',
        question: 'My back pain has spread down my leg(s) at some time in the last 2 weeks',
        required: true
      },
      {
        id: 'stm_q2',
        type: 'checkbox',
        question: 'I have had pain in the shoulder or neck at some time in the last 2 weeks',
        required: true
      },
      {
        id: 'stm_q3',
        type: 'checkbox',
        question: 'I have only walked short distances because of my back pain',
        required: true
      },
      {
        id: 'stm_q4',
        type: 'checkbox',
        question: 'In the last 2 weeks, I have dressed more slowly than usual because of back pain',
        required: true
      }
    ]
  }
];

interface AssessmentTemplatesProps {
  onSelectTemplate: (template: AssessmentTemplate) => void;
  selectedBodyPart?: string;
}

export default function AssessmentTemplates({ onSelectTemplate, selectedBodyPart }: AssessmentTemplatesProps) {
  const [activeTab, setActiveTab] = useState('screening');
  const [redFlagResults, setRedFlagResults] = useState<{ [key: string]: boolean }>({});
  const [showRedFlags, setShowRedFlags] = useState(false);

  const filteredTemplates = assessmentTemplates.filter(template => 
    template.category === activeTab && 
    (!selectedBodyPart || template.bodyPart === selectedBodyPart || template.bodyPart === 'general')
  );

  const handleRedFlagChange = (flagId: string, checked: boolean) => {
    setRedFlagResults(prev => ({ ...prev, [flagId]: checked }));
  };

  const getRedFlagSeverity = () => {
    const positiveFlags = Object.entries(redFlagResults)
      .filter(([_, isPositive]) => isPositive)
      .map(([flagId]) => redFlags.find(flag => flag.id === flagId)!)
      .filter(Boolean);

    if (positiveFlags.some(flag => flag.severity === 'high')) return 'high';
    if (positiveFlags.some(flag => flag.severity === 'moderate')) return 'moderate';
    return 'low';
  };

  const getEvidenceBadgeColor = (level: string) => {
    switch (level) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      {/* Red Flag Screening */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800">Red Flag Screening</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRedFlags(!showRedFlags)}
            >
              {showRedFlags ? 'Hide' : 'Show'} Screening
            </Button>
          </div>
        </CardHeader>
        {showRedFlags && (
          <CardContent className="space-y-4">
            {redFlags.map((flag) => (
              <div key={flag.id} className="flex items-start space-x-3">
                <Checkbox
                  id={flag.id}
                  checked={redFlagResults[flag.id] || false}
                  onCheckedChange={(checked) => handleRedFlagChange(flag.id, !!checked)}
                />
                <div className="flex-1">
                  <Label htmlFor={flag.id} className="text-sm font-medium">
                    {flag.question}
                  </Label>
                  {redFlagResults[flag.id] && (
                    <div className={`mt-2 p-2 rounded text-sm ${
                      flag.severity === 'high' ? 'bg-red-50 text-red-800' :
                      flag.severity === 'moderate' ? 'bg-yellow-50 text-yellow-800' :
                      'bg-blue-50 text-blue-800'
                    }`}>
                      <strong>Action Required:</strong> {flag.action}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {Object.values(redFlagResults).some(Boolean) && (
              <div className={`p-4 rounded-lg ${
                getRedFlagSeverity() === 'high' ? 'bg-red-50 border border-red-200' :
                getRedFlagSeverity() === 'moderate' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2">
                  {getRedFlagSeverity() === 'high' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  <span className="font-medium">
                    {getRedFlagSeverity() === 'high' ? 'Immediate Action Required' :
                     getRedFlagSeverity() === 'moderate' ? 'Medical Consultation Recommended' :
                     'Continue with Assessment'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Assessment Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Clinical Assessment Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="screening">Screening</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
              <TabsTrigger value="outcome">Outcome Measures</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="grid gap-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            <Badge className={getEvidenceBadgeColor(template.evidenceLevel)}>
                              Level {template.evidenceLevel}
                            </Badge>
                            <Badge variant="outline">
                              {template.bodyPart.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{template.questions.length} questions</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              ~{Math.ceil(template.questions.length * 0.5)} min
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => onSelectTemplate(template)}
                          size="sm"
                        >
                          Start Assessment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No {activeTab} templates available for the selected body region.
                    {selectedBodyPart && (
                      <div className="mt-2">
                        <Button
                          variant="link"
                          onClick={() => window.location.reload()}
                          className="text-sm"
                        >
                          View all templates
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export { type AssessmentTemplate, type AssessmentQuestion, assessmentTemplates };