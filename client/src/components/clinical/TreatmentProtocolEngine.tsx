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
  diagnosticResult: DiagnosticResult;
  patientAnswers: Record<string, any>;
  abnormalities?: MovementAbnormality[];
  onProtocolSelect: (protocol: TreatmentProtocol) => void;
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
            functionalGoal: 'Improve cervical posture and reduce forward head posture'
          },
          {
            id: 'upper_trap_stretch',
            name: 'Upper Trapezius Stretch',
            description: 'Lateral neck stretch targeting tight upper trapezius',
            sets: 3,
            reps: '30s hold',
            frequency: '2-3x daily',
            intensity: 'Gentle stretch sensation',
            progression: 'Increase hold time to 60s',
            contraindications: ['Acute neck sprain', 'Cervical radiculopathy'],
            targetMuscles: ['Upper trapezius', 'Levator scapulae'],
            functionalGoal: 'Reduce muscle tension and improve neck mobility'
          },
          {
            id: 'doorway_chest_stretch',
            name: 'Doorway Chest Stretch',
            description: 'Passive stretch for tight pectoral muscles',
            sets: 2,
            reps: '30-60s hold',
            frequency: '2x daily',
            intensity: 'Moderate stretch',
            progression: 'Vary arm position (90°, 135°)',
            contraindications: ['Acute shoulder injury', 'Recent chest surgery'],
            targetMuscles: ['Pectoralis major', 'Pectoralis minor'],
            functionalGoal: 'Improve shoulder posture and thoracic extension'
          }
        ],
        precautions: [
          'Avoid aggressive stretching',
          'Stop if symptoms worsen',
          'Maintain neutral spine during exercises'
        ],
        progressCriteria: [
          'Decreased pain levels (>50% improvement)',
          'Improved cervical range of motion',
          'Ability to perform exercises without pain',
          'Improved postural awareness'
        ]
      },
      {
        id: 'phase2_strengthening',
        name: 'Phase 2: Progressive Strengthening',
        duration: '3-4 weeks',
        goals: [
          'Strengthen deep neck flexors',
          'Improve scapular stability',
          'Enhance postural endurance',
          'Begin functional integration'
        ],
        exercises: [
          {
            id: 'deep_neck_flexor_strengthening',
            name: 'Deep Neck Flexor Strengthening',
            description: 'Progressive strengthening using resistance or gravity',
            sets: 3,
            reps: '8-12',
            frequency: 'Daily',
            intensity: 'Moderate resistance',
            progression: 'Increase resistance or duration',
            contraindications: ['Cervical instability', 'Severe neck pain'],
            targetMuscles: ['Deep cervical flexors', 'Longus colli'],
            functionalGoal: 'Improve cervical stability and postural control'
          },
          {
            id: 'scapular_retractions',
            name: 'Scapular Retractions',
            description: 'Strengthening middle and lower trapezius',
            sets: 3,
            reps: '12-15',
            frequency: 'Daily',
            intensity: 'Light to moderate resistance',
            progression: 'Add resistance band or weights',
            contraindications: ['Acute shoulder pain'],
            targetMuscles: ['Middle trapezius', 'Lower trapezius', 'Rhomboids'],
            functionalGoal: 'Improve scapular positioning and shoulder stability'
          },
          {
            id: 'wall_slides',
            name: 'Wall Slides',
            description: 'Dynamic exercise combining mobility and strengthening',
            sets: 2,
            reps: '10-15',
            frequency: 'Daily',
            intensity: 'Body weight',
            progression: 'Increase range of motion and speed',
            contraindications: ['Shoulder impingement', 'Acute shoulder pain'],
            targetMuscles: ['Serratus anterior', 'Lower trapezius', 'Posterior deltoid'],
            functionalGoal: 'Improve overhead mobility and scapular function'
          }
        ],
        precautions: [
          'Maintain proper form over intensity',
          'Progress gradually',
          'Monitor for fatigue or compensation patterns'
        ],
        progressCriteria: [
          'Able to perform exercises with proper form',
          'Increased strength (measured by reps/resistance)',
          'Improved postural endurance',
          'Reduced compensatory movements'
        ]
      },
      {
        id: 'phase3_functional',
        name: 'Phase 3: Functional Integration',
        duration: '3-5 weeks',
        goals: [
          'Integrate strengthening into functional activities',
          'Improve work/sport-specific postures',
          'Maintain long-term postural habits',
          'Prevent recurrence'
        ],
        exercises: [
          {
            id: 'functional_reaching',
            name: 'Functional Reaching Patterns',
            description: 'Task-specific reaching with postural control',
            sets: 3,
            reps: '10 each direction',
            frequency: 'Daily',
            intensity: 'Functional loads',
            progression: 'Add weight or complexity',
            contraindications: ['Acute injury', 'Severe movement dysfunction'],
            targetMuscles: ['Core stabilizers', 'Scapular stabilizers', 'Cervical stabilizers'],
            functionalGoal: 'Integrate postural control into daily activities'
          },
          {
            id: 'work_simulation',
            name: 'Work Position Simulation',
            description: 'Practice work postures with proper alignment',
            sets: 3,
            reps: '2-5 minutes',
            frequency: 'Daily',
            intensity: 'Endurance-based',
            progression: 'Increase duration and complexity',
            contraindications: ['Acute symptoms'],
            targetMuscles: ['Postural muscles', 'Deep stabilizers'],
            functionalGoal: 'Maintain proper posture during work activities'
          }
        ],
        precautions: [
          'Avoid prolonged static postures',
          'Take regular breaks',
          'Monitor for symptom recurrence'
        ],
        progressCriteria: [
          'Maintain proper posture during activities',
          'No symptom recurrence with activities',
          'Independent exercise program compliance',
          'Return to full function'
        ]
      }
    ],
    outcomesMeasures: [
      'Neck Disability Index (NDI)',
      'Visual Analog Scale (VAS) for pain',
      'Craniovertebral angle measurement',
      'Cervical range of motion',
      'Deep neck flexor endurance test',
      'Patient satisfaction scores'
    ],
    homeExerciseProgram: [
      {
        id: 'home_chin_tucks',
        name: 'Daily Chin Tucks',
        description: 'Perform throughout the day, especially during computer work',
        sets: 1,
        reps: '10',
        frequency: 'Every 2 hours',
        intensity: 'Gentle',
        progression: 'Maintain consistency',
        contraindications: [],
        targetMuscles: ['Deep neck flexors'],
        functionalGoal: 'Maintain cervical posture'
      },
      {
        id: 'home_stretches',
        name: 'Postural Stretches',
        description: 'Upper trap and chest stretches',
        sets: 2,
        reps: '30s each',
        frequency: 'Morning and evening',
        intensity: 'Gentle to moderate',
        progression: 'Maintain range',
        contraindications: [],
        targetMuscles: ['Upper trapezius', 'Pectorals'],
        functionalGoal: 'Maintain mobility'
      }
    ],
    patientEducation: [
      'Proper workstation ergonomics',
      'Importance of regular movement breaks',
      'Sleep posture recommendations',
      'Stress management techniques',
      'Long-term exercise maintenance',
      'Warning signs for recurrence'
    ],
    redFlags: [
      'Severe or worsening neurological symptoms',
      'Loss of arm strength or sensation',
      'Severe headaches',
      'Dizziness or balance problems',
      'No improvement after 4-6 weeks'
    ],
    dischargeCriteria: [
      'Pain levels ≤ 2/10',
      'Full cervical range of motion',
      'Normal craniovertebral angle (>48°)',
      'Independent home exercise program',
      'Return to all functional activities',
      'Patient satisfaction with outcomes'
    ]
  },
  {
    id: 'hip_abductor_weakness_protocol',
    name: 'Hip Abductor Strengthening Protocol',
    condition: 'Hip Abductor Weakness',
    description: 'Progressive strengthening program targeting hip abductor muscles with functional integration.',
    totalDuration: '6-8 weeks',
    phases: [
      {
        id: 'phase1_basic_strengthening',
        name: 'Phase 1: Basic Strengthening',
        duration: '2-3 weeks',
        goals: [
          'Activate weak hip abductor muscles',
          'Improve basic strength',
          'Establish movement patterns',
          'Reduce compensatory movements'
        ],
        exercises: [
          {
            id: 'clamshells',
            name: 'Clamshells',
            description: 'Side-lying hip external rotation with abduction',
            sets: 3,
            reps: '12-15',
            frequency: 'Daily',
            intensity: 'Light resistance band',
            progression: 'Increase resistance or add pulses',
            contraindications: ['Acute hip pain', 'Hip precautions post-surgery'],
            targetMuscles: ['Gluteus medius', 'Gluteus maximus', 'Deep hip rotators'],
            functionalGoal: 'Improve hip stability and control'
          },
          {
            id: 'side_lying_abduction',
            name: 'Side-lying Hip Abduction',
            description: 'Pure abduction movement in side-lying position',
            sets: 3,
            reps: '10-12',
            frequency: 'Daily',
            intensity: 'Body weight, progress to ankle weights',
            progression: 'Add resistance, increase range',
            contraindications: ['Hip impingement', 'Acute trochanteric bursitis'],
            targetMuscles: ['Gluteus medius', 'Gluteus minimus', 'Tensor fasciae latae'],
            functionalGoal: 'Strengthen primary hip abductors'
          }
        ],
        precautions: [
          'Avoid compensatory trunk movements',
          'Maintain neutral spine alignment',
          'Start with low resistance'
        ],
        progressCriteria: [
          'Able to perform exercises without compensation',
          'Reduced Trendelenburg sign',
          'Improved single-leg balance',
          'Decreased hip pain with walking'
        ]
      },
      {
        id: 'phase2_functional_strengthening',
        name: 'Phase 2: Functional Strengthening',
        duration: '2-3 weeks',
        goals: [
          'Progress to weight-bearing exercises',
          'Improve functional movement patterns',
          'Enhance balance and proprioception',
          'Increase strength and endurance'
        ],
        exercises: [
          {
            id: 'single_leg_bridge',
            name: 'Single-leg Bridge',
            description: 'Bridge with one leg extended, emphasizing hip stability',
            sets: 3,
            reps: '8-12 each leg',
            frequency: 'Daily',
            intensity: 'Body weight',
            progression: 'Add resistance or instability',
            contraindications: ['Lower back pain', 'Hip flexor tightness'],
            targetMuscles: ['Gluteus maximus', 'Gluteus medius', 'Hamstrings'],
            functionalGoal: 'Improve hip stability during single-limb support'
          },
          {
            id: 'monster_walks',
            name: 'Monster Walks',
            description: 'Lateral walking with resistance band around ankles',
            sets: 3,
            reps: '10 steps each direction',
            frequency: 'Daily',
            intensity: 'Moderate resistance band',
            progression: 'Increase resistance or steps',
            contraindications: ['Knee pain', 'Hip impingement'],
            targetMuscles: ['Gluteus medius', 'Gluteus maximus', 'Hip external rotators'],
            functionalGoal: 'Improve dynamic hip stability during walking'
          }
        ],
        precautions: [
          'Maintain proper knee alignment',
          'Avoid excessive forward trunk lean',
          'Progress intensity gradually'
        ],
        progressCriteria: [
          'Improved single-leg balance time (>30s)',
          'Reduced hip drop during walking',
          'Increased strength on manual muscle testing',
          'Improved functional movement patterns'
        ]
      },
      {
        id: 'phase3_advanced_functional',
        name: 'Phase 3: Advanced Functional Training',
        duration: '2-3 weeks',
        goals: [
          'Sport/activity-specific training',
          'Plyometric and dynamic movements',
          'Injury prevention strategies',
          'Long-term maintenance'
        ],
        exercises: [
          {
            id: 'step_ups',
            name: 'Step-ups with Knee Drive',
            description: 'Step up with emphasis on hip control and knee drive',
            sets: 3,
            reps: '8-10 each leg',
            frequency: 'Daily',
            intensity: 'Body weight, progress to weighted',
            progression: 'Increase height, add weight, or speed',
            contraindications: ['Knee pathology', 'Balance deficits'],
            targetMuscles: ['Gluteus medius', 'Gluteus maximus', 'Quadriceps'],
            functionalGoal: 'Improve stair climbing and single-limb function'
          },
          {
            id: 'lateral_bounds',
            name: 'Lateral Bounds',
            description: 'Dynamic lateral jumping with controlled landing',
            sets: 3,
            reps: '6-8 each direction',
            frequency: '3x per week',
            intensity: 'Body weight',
            progression: 'Increase distance or speed',
            contraindications: ['Acute injuries', 'Poor movement control'],
            targetMuscles: ['Hip abductors', 'Ankle stabilizers', 'Core'],
            functionalGoal: 'Improve dynamic stability and power'
          }
        ],
        precautions: [
          'Ensure proper landing mechanics',
          'Progress plyometrics carefully',
          'Monitor for fatigue and form breakdown'
        ],
        progressCriteria: [
          'Normal hip abductor strength (5/5)',
          'No Trendelenburg sign',
          'Return to sport/activity without pain',
          'Independent exercise program'
        ]
      }
    ],
    outcomesMeasures: [
      'Manual muscle testing (hip abductors)',
      'Single-leg balance test',
      'Trendelenburg test',
      'Step-down test quality',
      'Hip Outcome Score (HOS)',
      'Return to activity questionnaire'
    ],
    homeExerciseProgram: [
      {
        id: 'daily_clamshells',
        name: 'Daily Clamshells',
        description: 'Maintain hip abductor strength',
        sets: 2,
        reps: '15',
        frequency: 'Daily',
        intensity: 'Light resistance',
        progression: 'Maintain consistency',
        contraindications: [],
        targetMuscles: ['Hip abductors'],
        functionalGoal: 'Strength maintenance'
      }
    ],
    patientEducation: [
      'Importance of hip stability for knee health',
      'Proper movement mechanics',
      'Activity modification strategies',
      'Long-term exercise maintenance',
      'Injury prevention techniques'
    ],
    redFlags: [
      'Severe hip or groin pain',
      'Neurological symptoms',
      'No improvement after 4 weeks',
      'Worsening function'
    ],
    dischargeCriteria: [
      'Hip abductor strength 5/5',
      'Negative Trendelenburg test',
      'Normal functional movement patterns',
      'Return to desired activities',
      'Independent home program'
    ]
  }
  // Additional protocols would be added here for other conditions
];

export default function TreatmentProtocolEngine({ 
  diagnosticResult, 
  patientAnswers, 
  onProtocolSelect 
}: TreatmentProtocolEngineProps) {
  const [selectedProtocol, setSelectedProtocol] = useState<TreatmentProtocol | null>(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [matchingProtocols, setMatchingProtocols] = useState<TreatmentProtocol[]>([]);

  useEffect(() => {
    findMatchingProtocols();
  }, [diagnosticResult]);

  const findMatchingProtocols = () => {
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
    onProtocolSelect(protocol);
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

  if (matchingProtocols.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Treatment Protocol Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No specific protocol found for {diagnosticResult.primaryDiagnosis}. A customized treatment approach will be recommended based on the movement analysis.</p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedProtocol) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Treatment Protocol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
        </CardContent>
      </Card>
    );
  }

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

      <Card>
        <CardHeader>
          <CardTitle>Treatment Phases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {selectedProtocol.phases.map((phase, index) => (
              <div key={phase.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index <= currentPhase ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{phase.name}</h3>
                      <p className="text-sm text-gray-600">{phase.duration}</p>
                    </div>
                  </div>
                  <Progress value={getPhaseProgress(index)} className="w-20" />
                </div>
                
                <Tabs defaultValue="goals" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="goals">Goals</TabsTrigger>
                    <TabsTrigger value="exercises">Exercises</TabsTrigger>
                    <TabsTrigger value="precautions">Precautions</TabsTrigger>
                    <TabsTrigger value="progress">Progress</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="goals" className="mt-4">
                    <div className="space-y-2">
                      {phase.goals.map((goal, goalIndex) => (
                        <div key={goalIndex} className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span>{goal}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="exercises" className="mt-4">
                    <div className="space-y-4">
                      {phase.exercises.map((exercise) => (
                        <Card key={exercise.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold">{exercise.name}</h4>
                              <Badge variant="outline">{exercise.intensity}</Badge>
                            </div>
                            <p className="text-gray-600 mb-3">{exercise.description}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Sets:</span> {exercise.sets}
                              </div>
                              <div>
                                <span className="font-medium">Reps:</span> {exercise.reps}
                              </div>
                              <div>
                                <span className="font-medium">Frequency:</span> {exercise.frequency}
                              </div>
                              <div>
                                <span className="font-medium">Progression:</span> {exercise.progression}
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-sm"><span className="font-medium">Target:</span> {exercise.functionalGoal}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="precautions" className="mt-4">
                    <div className="space-y-2">
                      {phase.precautions.map((precaution, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-yellow-700">{precaution}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="progress" className="mt-4">
                    <div className="space-y-2">
                      {phase.progressCriteria.map((criteria, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>{criteria}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Home Exercise Program
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedProtocol.homeExerciseProgram.map((exercise) => (
                <div key={exercise.id} className="p-3 border rounded">
                  <h4 className="font-medium">{exercise.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{exercise.description}</p>
                  <div className="flex gap-4 text-xs mt-2">
                    <span>{exercise.sets} sets</span>
                    <span>{exercise.reps} reps</span>
                    <span>{exercise.frequency}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Patient Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedProtocol.patientEducation.map((topic, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">{topic}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outcome Measures & Discharge Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Assessment Tools</h4>
              <div className="space-y-2">
                {selectedProtocol.outcomesMeasures.map((measure, index) => (
                  <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                    {measure}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Discharge Criteria</h4>
              <div className="space-y-2">
                {selectedProtocol.dischargeCriteria.map((criteria, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>{criteria}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}