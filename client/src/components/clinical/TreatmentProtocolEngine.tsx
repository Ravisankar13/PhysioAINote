import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Target, Activity, AlertCircle, FileText, Zap, Brain } from 'lucide-react';
import SmartExerciseEngine from './SmartExerciseEngine';

interface TreatmentPhase {
  id: string;
  name: string;
  duration: string;
  goals: string[];
  exercises: Exercise[];
  precautions: string[];
  progressCriteria: string[];
}

interface Exercise {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: string;
  frequency: string;
  intensity: string;
  progression: string;
  contraindications: string[];
  targetMuscles: string[];
  functionalGoal: string;
}

interface TreatmentProtocol {
  id: string;
  name: string;
  condition: string;
  description: string;
  totalDuration: string;
  phases: TreatmentPhase[];
  outcomesMeasures: string[];
  homeExerciseProgram: Exercise[];
  patientEducation: string[];
  redFlags: string[];
  dischargeCriteria: string[];
}

interface DiagnosticResult {
  primaryDiagnosis: string;
  confidence: number;
  functionalImpact: string;
  redFlags: string[];
}

interface MovementAbnormality {
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  affectedSide: 'left' | 'right' | 'bilateral';
  clinicalSignificance: string;
}

interface TreatmentProtocolEngineProps {
  diagnosticResult?: DiagnosticResult;
  patientAnswers?: Record<string, any>;
  abnormalities?: MovementAbnormality[];
  assessmentData?: any;
  onProtocolSelect?: (protocol: TreatmentProtocol) => void;
  onTreatmentComplete?: (data: any) => void;
}

// Comprehensive treatment protocols
const TREATMENT_PROTOCOLS: TreatmentProtocol[] = [
  {
    id: 'upper_crossed_syndrome_protocol',
    name: 'Upper Crossed Syndrome Rehabilitation',
    condition: 'Upper Crossed Syndrome',
    description: 'Comprehensive protocol addressing postural muscle imbalances, focusing on strengthening weak muscles and stretching tight structures.',
    totalDuration: '8-12 weeks',
    phases: [
      {
        id: 'phase1_pain_mobility',
        name: 'Phase 1: Pain Reduction & Mobility',
        duration: '2-3 weeks',
        goals: [
          'Reduce pain and muscle tension',
          'Improve cervical and thoracic mobility',
          'Establish basic postural awareness',
          'Begin gentle strengthening'
        ],
        exercises: [
          {
            id: 'chin_tucks',
            name: 'Chin Tucks',
            description: 'Gentle retraction of the head to strengthen deep neck flexors',
            sets: 3,
            reps: '10-15',
            frequency: '2-3x daily',
            intensity: 'Gentle, pain-free',
            progression: 'Increase hold time from 5s to 10s',
            contraindications: ['Acute neck pain', 'Cervical instability'],
            targetMuscles: ['Deep cervical flexors', 'Longus colli', 'Longus capitis'],
            functionalGoal: 'Improve cervical posture and reduce forward head position'
          }
        ],
        precautions: [
          'Avoid movements that increase pain',
          'Monitor for dizziness or neurological symptoms',
          'Progress gradually based on pain levels'
        ],
        progressCriteria: [
          'Pain reduced by 30% on VAS scale',
          'Improved cervical range of motion',
          'Ability to perform exercises without pain increase'
        ]
      }
    ],
    outcomesMeasures: ['Neck Disability Index (NDI)', 'Visual Analog Scale (VAS)', 'Cervical Range of Motion'],
    homeExerciseProgram: [
      {
        id: 'home_chin_tucks',
        name: 'Home Chin Tucks',
        description: 'Perform chin tucks at home for postural correction',
        sets: 2,
        reps: '10',
        frequency: 'Daily',
        intensity: 'Gentle',
        progression: 'Increase hold time gradually',
        contraindications: ['Acute pain'],
        targetMuscles: ['Deep neck flexors'],
        functionalGoal: 'Maintain postural improvements at home'
      }
    ],
    patientEducation: [
      'Ergonomic workplace setup',
      'Postural awareness strategies',
      'Activity modification principles',
      'Pain management techniques'
    ],
    redFlags: [
      'Increasing neurological symptoms',
      'Severe headaches',
      'Vision changes',
      'Dizziness with movement'
    ],
    dischargeCriteria: [
      'NDI score < 10/50',
      'Full pain-free cervical range of motion',
      'Ability to maintain proper posture during activities',
      'Independent with home exercise program'
    ]
  }
];

function TreatmentProtocolEngine({ 
  diagnosticResult, 
  patientAnswers = {},
  abnormalities = [],
  assessmentData,
  onProtocolSelect,
  onTreatmentComplete
}: TreatmentProtocolEngineProps) {
  const [selectedProtocol, setSelectedProtocol] = useState<TreatmentProtocol | null>(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [matchingProtocols, setMatchingProtocols] = useState<TreatmentProtocol[]>([]);
  const [activeTab, setActiveTab] = useState('protocols');
  const [smartPrescription, setSmartPrescription] = useState<any>(null);

  useEffect(() => {
    if (diagnosticResult) {
      findMatchingProtocols();
    }
  }, [diagnosticResult]);

  const findMatchingProtocols = () => {
    if (!diagnosticResult) return;
    
    const protocols = TREATMENT_PROTOCOLS.filter(protocol => 
      protocol.condition.toLowerCase().includes(diagnosticResult.primaryDiagnosis.toLowerCase()) ||
      diagnosticResult.primaryDiagnosis.toLowerCase().includes(protocol.condition.toLowerCase())
    );
    
    setMatchingProtocols(protocols);
    if (protocols.length > 0) {
      setSelectedProtocol(protocols[0]);
    }
  };

  const selectProtocol = (protocol: TreatmentProtocol) => {
    setSelectedProtocol(protocol);
    setCurrentPhase(0);
    if (onProtocolSelect) {
      onProtocolSelect(protocol);
    }
  };

  const handleSmartPrescriptionComplete = (prescription: any) => {
    setSmartPrescription(prescription);
    setActiveTab('smart-results');
  };

  const getPhaseProgress = (phaseIndex: number) => {
    if (phaseIndex < currentPhase) return 100;
    if (phaseIndex === currentPhase) return 50;
    return 0;
  };

  const getSeverityBasedModifications = () => {
    if (!selectedProtocol) return [];
    
    const modifications = [];
    const painLevel = patientAnswers.pain_intensity || 0;
    const functionalImpact = patientAnswers.functional_impact || 0;
    
    if (painLevel >= 7) {
      modifications.push('Reduce exercise intensity by 25-50%');
      modifications.push('Focus on pain management techniques initially');
      modifications.push('Consider manual therapy or modalities');
    }
    
    if (functionalImpact >= 7) {
      modifications.push('Prioritize functional activities in treatment');
      modifications.push('Consider work/activity modifications');
      modifications.push('Extend phase 1 duration if needed');
    }
    
    if (diagnosticResult.redFlags.length > 0) {
      modifications.push('Monitor red flag symptoms closely');
      modifications.push('Consider medical referral if symptoms persist');
    }
    
    return modifications;
  };

  const renderStandardProtocols = () => {
    if (matchingProtocols.length === 0) {
      return (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No specific protocol found for {diagnosticResult.primaryDiagnosis}</p>
          <p className="text-sm text-muted-foreground mt-2">Try the AI Exercise Engine for customized recommendations</p>
        </div>
      );
    }

    if (!selectedProtocol) {
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Select Treatment Protocol</h3>
          {matchingProtocols.map((protocol) => (
            <Card key={protocol.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => selectProtocol(protocol)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{protocol.name}</h3>
                    <p className="text-gray-600 mt-1">{protocol.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {protocol.totalDuration}
                      </Badge>
                      <Badge variant="outline">
                        <Target className="h-3 w-3 mr-1" />
                        {protocol.phases.length} phases
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm">Select</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return renderSelectedProtocol();
  };

  const renderSelectedProtocol = () => {
    if (!selectedProtocol) return null;
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedProtocol.name}</span>
              <Button variant="outline" onClick={() => setSelectedProtocol(null)}>
                Change Protocol
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{selectedProtocol.description}</p>
            <div className="flex items-center gap-4">
              <Badge>
                <Clock className="h-3 w-3 mr-1" />
                {selectedProtocol.totalDuration}
              </Badge>
              <Badge variant="outline">
                <Target className="h-3 w-3 mr-1" />
                {selectedProtocol.phases.length} phases
              </Badge>
              <Badge variant="outline">
                Recommended Protocol
              </Badge>
            </div>
          </CardContent>
        </Card>

        {getSeverityBasedModifications().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Protocol Modifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getSeverityBasedModifications().map((modification, index) => (
                  <div key={index} className="p-2 bg-orange-50 border-l-4 border-orange-500 rounded">
                    <span className="text-orange-700">{modification}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderSmartResults = () => {
    if (!smartPrescription) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              AI-Generated Exercise Prescription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {smartPrescription.exercises?.map((exercise: any, index: number) => (
                <div key={exercise.id || index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{exercise.name}</h4>
                      <Badge variant={
                        exercise.recommendationStrength === 'highly recommended' ? 'default' :
                        exercise.recommendationStrength === 'recommended' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {exercise.recommendationStrength}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{exercise.description}</p>
                  <div className="text-xs space-y-1">
                    <div><strong>Sets:</strong> {exercise.loadingParameters?.sets}</div>
                    <div><strong>Reps:</strong> {exercise.loadingParameters?.reps}</div>
                    <div><strong>Frequency:</strong> {exercise.loadingParameters?.frequency}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Main component with tabs for both standard protocols and smart engine
  return (
    <div className="space-y-6">
      {/* Diagnostic Summary & Treatment Connection */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            From Diagnosis to Treatment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {diagnosticResult ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Clinical Diagnosis</h4>
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{diagnosticResult.primaryDiagnosis}</span>
                      <Badge variant="default" className="bg-blue-600">
                        {diagnosticResult.confidence}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{diagnosticResult.functionalImpact}</p>
                  </div>
                </div>
                
                {diagnosticResult.redFlags.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-2">Red Flags Identified</h4>
                  <div className="space-y-1">
                    {diagnosticResult.redFlags.map((flag, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-700">{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-green-800 mb-2">Movement Patterns Detected</h4>
                <div className="space-y-2">
                  {abnormalities.slice(0, 3).map((abnormality, index) => (
                    <div key={index} className="bg-white p-2 rounded border border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{abnormality.description}</span>
                        <Badge variant={abnormality.severity === 'severe' ? 'destructive' : 'secondary'} className="text-xs">
                          {abnormality.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {abnormalities.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{abnormalities.length - 3} more patterns detected
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-green-100 p-3 rounded border border-green-300">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-green-700" />
                  <span className="text-sm font-semibold text-green-800">Treatment Ready</span>
                </div>
                <p className="text-xs text-green-700">
                  Evidence-based protocols and AI-powered exercise prescriptions available below
                </p>
              </div>
            </div>
          </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Assessment in progress...</p>
              <p className="text-sm text-muted-foreground mt-2">Complete the diagnostic assessment to generate treatment protocols</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Treatment Planning & Exercise Prescription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="protocols" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Standard Protocols
              </TabsTrigger>
              <TabsTrigger value="smart-engine" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                AI Exercise Engine
              </TabsTrigger>
              <TabsTrigger value="smart-results" className="flex items-center gap-2" disabled={!smartPrescription}>
                <Target className="h-4 w-4" />
                AI Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="protocols" className="space-y-6">
              {renderStandardProtocols()}
            </TabsContent>

            <TabsContent value="smart-engine" className="space-y-6">
              <SmartExerciseEngine
                abnormalities={abnormalities}
                diagnosticResult={diagnosticResult}
                patientAnswers={patientAnswers}
                onPrescriptionComplete={handleSmartPrescriptionComplete}
              />
            </TabsContent>

            <TabsContent value="smart-results" className="space-y-6">
              {smartPrescription && renderSmartResults()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default TreatmentProtocolEngine;