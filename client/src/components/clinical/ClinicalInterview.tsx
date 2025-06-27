import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ClipboardList, 
  User, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight,
  Brain,
  Target
} from "lucide-react";

interface ClinicalInterviewProps {
  onInterviewComplete: (data: any) => void;
  previousData?: any;
  objectiveFindings?: {
    staticPostural: any;
    motionCapture: any;
  };
}

interface InterviewData {
  // Patient Demographics
  patientInfo: {
    age: string;
    gender: string;
    occupation: string;
    activityLevel: string;
  };
  
  // Primary Complaint
  primaryComplaint: {
    mainProblem: string;
    onset: string;
    mechanism: string;
    duration: string;
  };
  
  // Pain Assessment
  painAssessment: {
    location: string[];
    intensity: string;
    quality: string[];
    behavior: {
      aggravatingFactors: string[];
      relievingFactors: string[];
      timePattern: string;
    };
  };
  
  // Functional Impact
  functionalImpact: {
    dailyActivities: string[];
    workImpact: string;
    sportsImpact: string;
    sleepImpact: string;
  };
  
  // Medical History
  medicalHistory: {
    previousInjuries: string;
    surgeries: string;
    medications: string;
    medicalConditions: string;
  };
  
  // Adaptive Questions (based on objective findings)
  adaptiveQuestions: {
    [key: string]: any;
  };
}

const ClinicalInterview: React.FC<ClinicalInterviewProps> = ({
  onInterviewComplete,
  previousData,
  objectiveFindings
}) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [interviewData, setInterviewData] = useState<InterviewData>({
    patientInfo: { age: '', gender: '', occupation: '', activityLevel: '' },
    primaryComplaint: { mainProblem: '', onset: '', mechanism: '', duration: '' },
    painAssessment: { 
      location: [], 
      intensity: '', 
      quality: [], 
      behavior: { aggravatingFactors: [], relievingFactors: [], timePattern: '' }
    },
    functionalImpact: { dailyActivities: [], workImpact: '', sportsImpact: '', sleepImpact: '' },
    medicalHistory: { previousInjuries: '', surgeries: '', medications: '', medicalConditions: '' },
    adaptiveQuestions: {}
  });
  
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<any[]>([]);

  // Generate adaptive questions based on objective findings
  useEffect(() => {
    if (objectiveFindings) {
      const questions = generateAdaptiveQuestions(objectiveFindings);
      setAdaptiveQuestions(questions);
    }
  }, [objectiveFindings]);

  const generateAdaptiveQuestions = (findings: any) => {
    const questions: any[] = [];
    
    // Analyze static postural findings
    if (findings.staticPostural) {
      const { frontal, sagittal } = findings.staticPostural;
      
      // Forward head posture questions
      if ((frontal?.abnormalities || []).some((a: any) => a.type?.includes('head')) ||
          (sagittal?.abnormalities || []).some((a: any) => a.type?.includes('head'))) {
        questions.push({
          id: 'forward_head_posture',
          question: 'Do you experience neck pain, headaches, or upper back tension?',
          type: 'multiselect',
          options: ['Neck pain', 'Headaches', 'Upper back tension', 'Jaw pain', 'None of these'],
          category: 'Postural Adaptation'
        });
      }
      
      // Shoulder asymmetry questions
      if ((frontal?.abnormalities || []).some((a: any) => a.type?.includes('shoulder'))) {
        questions.push({
          id: 'shoulder_asymmetry',
          question: 'Do you have shoulder pain or notice one shoulder feeling different from the other?',
          type: 'radio',
          options: ['Left shoulder pain', 'Right shoulder pain', 'Both shoulders', 'No shoulder pain'],
          category: 'Shoulder Assessment'
        });
      }
      
      // Spinal curvature questions
      if ((sagittal?.abnormalities || []).some((a: any) => a.type?.includes('spine') || a.type?.includes('lordosis') || a.type?.includes('kyphosis'))) {
        questions.push({
          id: 'spinal_pain',
          question: 'Do you experience back pain? If yes, where specifically?',
          type: 'multiselect',
          options: ['Upper back', 'Middle back', 'Lower back', 'Tailbone area', 'No back pain'],
          category: 'Spinal Assessment'
        });
      }
      
      // Pelvic alignment questions
      if ((frontal?.abnormalities || []).some((a: any) => a.type?.includes('pelv')) ||
          (sagittal?.abnormalities || []).some((a: any) => a.type?.includes('pelv'))) {
        questions.push({
          id: 'pelvic_symptoms',
          question: 'Do you experience hip, pelvis, or lower back symptoms?',
          type: 'multiselect',
          options: ['Hip pain', 'Lower back pain', 'Pelvic pain', 'Leg length difference feeling', 'None'],
          category: 'Pelvic Assessment'
        });
      }
    }
    
    // Analyze motion capture findings
    if (findings.motionCapture) {
      const motionIssues = findings.motionCapture.abnormalities || [];
      
      if (motionIssues.some((issue: any) => issue.type?.includes('knee'))) {
        questions.push({
          id: 'knee_symptoms',
          question: 'Do you experience knee problems during movement or activity?',
          type: 'multiselect',
          options: ['Knee pain', 'Knee instability', 'Knee stiffness', 'Clicking/popping', 'None'],
          category: 'Movement Pattern'
        });
      }
      
      if (motionIssues.some((issue: any) => issue.type?.includes('hip'))) {
        questions.push({
          id: 'hip_movement',
          question: 'Do you notice difficulty with hip movements like squatting or climbing stairs?',
          type: 'multiselect',
          options: ['Squatting difficulty', 'Stair climbing pain', 'Hip stiffness', 'Groin pain', 'None'],
          category: 'Movement Pattern'
        });
      }
    }
    
    return questions;
  };

  const sections = [
    { 
      id: 'patient-info', 
      title: 'Patient Information', 
      icon: User,
      description: 'Basic demographics and background'
    },
    { 
      id: 'primary-complaint', 
      title: 'Primary Complaint', 
      icon: AlertCircle,
      description: 'Main reason for seeking treatment'
    },
    { 
      id: 'pain-assessment', 
      title: 'Pain Assessment', 
      icon: Target,
      description: 'Detailed pain characteristics'
    },
    { 
      id: 'functional-impact', 
      title: 'Functional Impact', 
      icon: Activity,
      description: 'How symptoms affect daily life'
    },
    { 
      id: 'medical-history', 
      title: 'Medical History', 
      icon: ClipboardList,
      description: 'Previous injuries and medical background'
    },
    { 
      id: 'adaptive-questions', 
      title: 'Targeted Assessment', 
      icon: Brain,
      description: 'Questions based on your movement analysis'
    }
  ];

  const handleInputChange = (section: keyof InterviewData, field: string, value: any) => {
    setInterviewData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section: keyof InterviewData, nested: string, field: string, value: any) => {
    setInterviewData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nested]: {
          ...prev[section][nested],
          [field]: value
        }
      }
    }));
  };

  const handleArrayInputChange = (section: keyof InterviewData, field: string, value: string, checked: boolean) => {
    setInterviewData(prev => {
      const currentArray = prev[section][field] as string[] || [];
      const newArray = checked 
        ? [...currentArray, value]
        : currentArray.filter(item => item !== value);
      
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray
        }
      };
    });
  };

  const handleAdaptiveAnswer = (questionId: string, answer: any) => {
    setInterviewData(prev => ({
      ...prev,
      adaptiveQuestions: {
        ...prev.adaptiveQuestions,
        [questionId]: answer
      }
    }));
  };

  const isCurrentSectionComplete = () => {
    const currentSectionId = sections[currentSection].id;
    
    switch (currentSectionId) {
      case 'patient-info':
        return interviewData.patientInfo.age && interviewData.patientInfo.gender;
      case 'primary-complaint':
        return interviewData.primaryComplaint.mainProblem && interviewData.primaryComplaint.onset;
      case 'pain-assessment':
        return interviewData.painAssessment.location.length > 0 && interviewData.painAssessment.intensity;
      case 'functional-impact':
        return interviewData.functionalImpact.dailyActivities.length > 0;
      case 'medical-history':
        return true; // Optional section
      case 'adaptive-questions':
        return adaptiveQuestions.length === 0 || 
               adaptiveQuestions.every(q => interviewData.adaptiveQuestions[q.id]);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleComplete = () => {
    onInterviewComplete({
      ...interviewData,
      completedAt: new Date().toISOString(),
      objectiveCorrelations: generateObjectiveCorrelations()
    });
  };

  const generateObjectiveCorrelations = () => {
    const correlations: any[] = [];
    
    // Correlate subjective complaints with objective findings
    if (objectiveFindings?.staticPostural) {
      const abnormalities = [
        ...(objectiveFindings.staticPostural.frontal?.abnormalities || []),
        ...(objectiveFindings.staticPostural.sagittal?.abnormalities || [])
      ];
      
      abnormalities.forEach((abnormality: any) => {
        const painLocation = interviewData.painAssessment.location;
        
        if (abnormality.type?.includes('head') && painLocation.includes('Neck')) {
          correlations.push({
            objective: abnormality.type,
            subjective: 'Neck pain',
            correlation: 'Strong - Forward head posture commonly causes neck pain'
          });
        }
        
        if (abnormality.type?.includes('shoulder') && painLocation.includes('Shoulder')) {
          correlations.push({
            objective: abnormality.type,
            subjective: 'Shoulder pain',
            correlation: 'Strong - Postural asymmetry correlates with reported symptoms'
          });
        }
      });
    }
    
    return correlations;
  };

  const renderCurrentSection = () => {
    const section = sections[currentSection];
    
    switch (section.id) {
      case 'patient-info':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  value={interviewData.patientInfo.age}
                  onChange={(e) => handleInputChange('patientInfo', 'age', e.target.value)}
                  placeholder="Enter age"
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={interviewData.patientInfo.gender}
                  onValueChange={(value) => handleInputChange('patientInfo', 'gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={interviewData.patientInfo.occupation}
                onChange={(e) => handleInputChange('patientInfo', 'occupation', e.target.value)}
                placeholder="e.g., Office worker, Teacher, Athlete"
              />
            </div>
            
            <div>
              <Label>Activity Level</Label>
              <RadioGroup
                value={interviewData.patientInfo.activityLevel}
                onValueChange={(value) => handleInputChange('patientInfo', 'activityLevel', value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sedentary" id="sedentary" />
                  <Label htmlFor="sedentary">Sedentary (minimal exercise)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light">Light (1-2 days/week)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moderate" id="moderate" />
                  <Label htmlFor="moderate">Moderate (3-4 days/week)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active">Active (5+ days/week)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="athlete" id="athlete" />
                  <Label htmlFor="athlete">Competitive athlete</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );
        
      case 'primary-complaint':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="mainProblem">What is your main problem or concern? *</Label>
              <Textarea
                id="mainProblem"
                value={interviewData.primaryComplaint.mainProblem}
                onChange={(e) => handleInputChange('primaryComplaint', 'mainProblem', e.target.value)}
                placeholder="Describe your main symptoms or concerns..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>When did this problem start? *</Label>
                <RadioGroup
                  value={interviewData.primaryComplaint.onset}
                  onValueChange={(value) => handleInputChange('primaryComplaint', 'onset', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="acute" id="acute" />
                    <Label htmlFor="acute">Suddenly (within days)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gradual" id="gradual" />
                    <Label htmlFor="gradual">Gradually (over weeks/months)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="chronic" id="chronic" />
                    <Label htmlFor="chronic">Long-standing (years)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="duration">How long have you had this problem?</Label>
                <Input
                  id="duration"
                  value={interviewData.primaryComplaint.duration}
                  onChange={(e) => handleInputChange('primaryComplaint', 'duration', e.target.value)}
                  placeholder="e.g., 2 weeks, 3 months"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="mechanism">What do you think caused this problem?</Label>
              <Textarea
                id="mechanism"
                value={interviewData.primaryComplaint.mechanism}
                onChange={(e) => handleInputChange('primaryComplaint', 'mechanism', e.target.value)}
                placeholder="e.g., lifting heavy object, fall, gradual onset from work posture..."
                rows={2}
              />
            </div>
          </div>
        );
        
      case 'pain-assessment':
        return (
          <div className="space-y-6">
            <div>
              <Label>Where do you feel pain or discomfort? (Select all that apply) *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {['Neck', 'Shoulder', 'Upper back', 'Lower back', 'Hip', 'Knee', 'Ankle', 'Foot', 'Arm', 'Wrist', 'Hand', 'Other'].map((location) => (
                  <div key={location} className="flex items-center space-x-2">
                    <Checkbox
                      id={location}
                      checked={interviewData.painAssessment.location.includes(location)}
                      onCheckedChange={(checked) => 
                        handleArrayInputChange('painAssessment', 'location', location, checked as boolean)
                      }
                    />
                    <Label htmlFor={location}>{location}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Pain intensity (0-10 scale) *</Label>
              <RadioGroup
                value={interviewData.painAssessment.intensity}
                onValueChange={(value) => handleInputChange('painAssessment', 'intensity', value)}
                className="flex flex-wrap gap-4 mt-2"
              >
                {Array.from({length: 11}, (_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={i.toString()} id={`pain-${i}`} />
                    <Label htmlFor={`pain-${i}`}>{i}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            <div>
              <Label>Pain quality (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {['Sharp', 'Dull', 'Aching', 'Burning', 'Throbbing', 'Shooting', 'Cramping', 'Stiff'].map((quality) => (
                  <div key={quality} className="flex items-center space-x-2">
                    <Checkbox
                      id={quality}
                      checked={interviewData.painAssessment.quality.includes(quality)}
                      onCheckedChange={(checked) => 
                        handleArrayInputChange('painAssessment', 'quality', quality, checked as boolean)
                      }
                    />
                    <Label htmlFor={quality}>{quality}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>What makes it worse?</Label>
                <div className="space-y-2 mt-2">
                  {['Sitting', 'Standing', 'Walking', 'Bending', 'Lifting', 'Exercise', 'Morning', 'Evening'].map((factor) => (
                    <div key={factor} className="flex items-center space-x-2">
                      <Checkbox
                        id={`aggravating-${factor}`}
                        checked={interviewData.painAssessment.behavior.aggravatingFactors.includes(factor)}
                        onCheckedChange={(checked) => 
                          handleNestedInputChange('painAssessment', 'behavior', 'aggravatingFactors', 
                            checked 
                              ? [...interviewData.painAssessment.behavior.aggravatingFactors, factor]
                              : interviewData.painAssessment.behavior.aggravatingFactors.filter(f => f !== factor)
                          )
                        }
                      />
                      <Label htmlFor={`aggravating-${factor}`}>{factor}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>What makes it better?</Label>
                <div className="space-y-2 mt-2">
                  {['Rest', 'Movement', 'Heat', 'Ice', 'Medication', 'Massage', 'Stretching', 'Exercise'].map((factor) => (
                    <div key={factor} className="flex items-center space-x-2">
                      <Checkbox
                        id={`relieving-${factor}`}
                        checked={interviewData.painAssessment.behavior.relievingFactors.includes(factor)}
                        onCheckedChange={(checked) => 
                          handleNestedInputChange('painAssessment', 'behavior', 'relievingFactors',
                            checked 
                              ? [...interviewData.painAssessment.behavior.relievingFactors, factor]
                              : interviewData.painAssessment.behavior.relievingFactors.filter(f => f !== factor)
                          )
                        }
                      />
                      <Label htmlFor={`relieving-${factor}`}>{factor}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'functional-impact':
        return (
          <div className="space-y-6">
            <div>
              <Label>Which daily activities are difficult? (Select all that apply) *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {[
                  'Getting dressed', 'Showering/bathing', 'Cooking', 'Cleaning', 
                  'Driving', 'Computer work', 'Lifting objects', 'Reaching overhead',
                  'Bending down', 'Walking', 'Climbing stairs', 'Sports/exercise'
                ].map((activity) => (
                  <div key={activity} className="flex items-center space-x-2">
                    <Checkbox
                      id={activity}
                      checked={interviewData.functionalImpact.dailyActivities.includes(activity)}
                      onCheckedChange={(checked) => 
                        handleArrayInputChange('functionalImpact', 'dailyActivities', activity, checked as boolean)
                      }
                    />
                    <Label htmlFor={activity}>{activity}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>How does this affect your work?</Label>
              <RadioGroup
                value={interviewData.functionalImpact.workImpact}
                onValueChange={(value) => handleInputChange('functionalImpact', 'workImpact', value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="work-none" />
                  <Label htmlFor="work-none">No impact</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mild" id="work-mild" />
                  <Label htmlFor="work-mild">Mild impact (some discomfort)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moderate" id="work-moderate" />
                  <Label htmlFor="work-moderate">Moderate impact (need breaks/modifications)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="severe" id="work-severe" />
                  <Label htmlFor="work-severe">Severe impact (time off work)</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label htmlFor="sleepImpact">How does this affect your sleep?</Label>
              <Select
                value={interviewData.functionalImpact.sleepImpact}
                onValueChange={(value) => handleInputChange('functionalImpact', 'sleepImpact', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sleep impact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No impact on sleep</SelectItem>
                  <SelectItem value="mild">Occasional sleep disruption</SelectItem>
                  <SelectItem value="moderate">Regular sleep disruption</SelectItem>
                  <SelectItem value="severe">Significant sleep problems</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'medical-history':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="previousInjuries">Previous injuries or similar problems</Label>
              <Textarea
                id="previousInjuries"
                value={interviewData.medicalHistory.previousInjuries}
                onChange={(e) => handleInputChange('medicalHistory', 'previousInjuries', e.target.value)}
                placeholder="Describe any previous injuries, treatments, or similar episodes..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="surgeries">Previous surgeries</Label>
              <Textarea
                id="surgeries"
                value={interviewData.medicalHistory.surgeries}
                onChange={(e) => handleInputChange('medicalHistory', 'surgeries', e.target.value)}
                placeholder="List any surgeries, including dates if known..."
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="medications">Current medications</Label>
              <Textarea
                id="medications"
                value={interviewData.medicalHistory.medications}
                onChange={(e) => handleInputChange('medicalHistory', 'medications', e.target.value)}
                placeholder="List current medications, including pain relievers, supplements..."
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="medicalConditions">Other medical conditions</Label>
              <Textarea
                id="medicalConditions"
                value={interviewData.medicalHistory.medicalConditions}
                onChange={(e) => handleInputChange('medicalHistory', 'medicalConditions', e.target.value)}
                placeholder="Diabetes, heart conditions, arthritis, etc..."
                rows={2}
              />
            </div>
          </div>
        );
        
      case 'adaptive-questions':
        return (
          <div className="space-y-6">
            {adaptiveQuestions.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No additional questions needed based on your movement analysis. 
                  Your postural and movement patterns don't indicate specific areas requiring targeted questioning.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    These questions are specifically generated based on your postural and movement analysis 
                    to better understand your symptoms.
                  </AlertDescription>
                </Alert>
                
                {adaptiveQuestions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-1">
                        {question.category}
                      </Badge>
                      <div className="flex-1">
                        <Label className="text-base font-medium">
                          {question.question}
                        </Label>
                        
                        {question.type === 'radio' && (
                          <RadioGroup
                            value={interviewData.adaptiveQuestions[question.id] || ''}
                            onValueChange={(value) => handleAdaptiveAnswer(question.id, value)}
                            className="mt-3"
                          >
                            {question.options.map((option: string) => (
                              <div key={option} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                        
                        {question.type === 'multiselect' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                            {question.options.map((option: string) => (
                              <div key={option} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${question.id}-${option}`}
                                  checked={(interviewData.adaptiveQuestions[question.id] || []).includes(option)}
                                  onCheckedChange={(checked) => {
                                    const currentAnswers = interviewData.adaptiveQuestions[question.id] || [];
                                    const newAnswers = checked
                                      ? [...currentAnswers, option]
                                      : currentAnswers.filter((a: string) => a !== option);
                                    handleAdaptiveAnswer(question.id, newAnswers);
                                  }}
                                />
                                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        );
        
      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Section Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Clinical Interview</h2>
          <Badge variant="outline">
            Section {currentSection + 1} of {sections.length}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const isCompleted = index < currentSection || (index === currentSection && isCurrentSectionComplete());
            const isCurrent = index === currentSection;
            
            return (
              <Button
                key={section.id}
                variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setCurrentSection(index)}
              >
                <Icon className="h-3 w-3" />
                {section.title}
                {isCompleted && <CheckCircle className="h-3 w-3" />}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Current Section Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(sections[currentSection].icon, { className: "h-5 w-5" })}
            {sections[currentSection].title}
          </CardTitle>
          <CardDescription>{sections[currentSection].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderCurrentSection()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentSection === 0}
        >
          Previous
        </Button>
        
        <div className="flex gap-2">
          {currentSection === sections.length - 1 ? (
            <Button
              onClick={handleComplete}
              disabled={!isCurrentSectionComplete()}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Interview
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!isCurrentSectionComplete()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalInterview;