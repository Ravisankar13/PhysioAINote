import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Users, Clock, Target, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface TreatmentProtocol {
  id: string;
  name: string;
  condition: string;
  bodyPart: string;
  evidenceLevel: 'A' | 'B' | 'C';
  phases: TreatmentPhase[];
  contraindications: string[];
  precautions: string[];
  outcomes: OutcomeMeasure[];
  references: Reference[];
}

interface TreatmentPhase {
  id: string;
  name: string;
  duration: string;
  goals: string[];
  interventions: Intervention[];
  progressionCriteria: string[];
}

interface Intervention {
  id: string;
  type: 'exercise' | 'manual_therapy' | 'education' | 'modality';
  name: string;
  description: string;
  dosage: string;
  frequency: string;
  evidenceLevel: 'A' | 'B' | 'C';
}

interface OutcomeMeasure {
  name: string;
  type: 'functional' | 'pain' | 'quality_of_life' | 'objective';
  frequency: string;
  target: string;
}

interface Reference {
  title: string;
  authors: string;
  journal: string;
  year: number;
  doi?: string;
  evidenceLevel: 'A' | 'B' | 'C';
}

const treatmentProtocols: TreatmentProtocol[] = [
  {
    id: 'acl_rehab',
    name: 'ACL Reconstruction Rehabilitation',
    condition: 'Post-ACL Reconstruction',
    bodyPart: 'knee',
    evidenceLevel: 'A',
    contraindications: [
      'Active infection',
      'Unhealed surgical site',
      'Severe pain (>7/10)',
      'Significant joint effusion'
    ],
    precautions: [
      'Graft protection protocols',
      'Monitor for signs of re-injury',
      'Avoid early return to sport activities'
    ],
    phases: [
      {
        id: 'phase1',
        name: 'Phase 1: Protection & Early Mobility',
        duration: '0-2 weeks post-op',
        goals: [
          'Control pain and swelling',
          'Protect healing tissues',
          'Restore basic knee mobility',
          'Initiate quadriceps activation'
        ],
        interventions: [
          {
            id: 'quad_sets',
            type: 'exercise',
            name: 'Quadriceps Setting',
            description: 'Isometric quadriceps contractions',
            dosage: '10 seconds hold',
            frequency: '10 reps, 3 sets, 3x daily',
            evidenceLevel: 'A'
          },
          {
            id: 'ankle_pumps',
            type: 'exercise',
            name: 'Ankle Pumps',
            description: 'Active ankle dorsiflexion/plantarflexion',
            dosage: 'Full range',
            frequency: '20 reps every hour while awake',
            evidenceLevel: 'B'
          }
        ],
        progressionCriteria: [
          'Minimal pain and swelling',
          'Knee flexion to 90 degrees',
          'Straight leg raise without extension lag'
        ]
      },
      {
        id: 'phase2',
        name: 'Phase 2: Progressive Strengthening',
        duration: '2-12 weeks post-op',
        goals: [
          'Restore full knee range of motion',
          'Progressive quadriceps strengthening',
          'Improve functional mobility',
          'Return to activities of daily living'
        ],
        interventions: [
          {
            id: 'closed_chain',
            type: 'exercise',
            name: 'Closed Chain Exercises',
            description: 'Mini squats, step-ups, leg press',
            dosage: '0-60° knee flexion initially',
            frequency: '2-3 sets, 10-15 reps, daily',
            evidenceLevel: 'A'
          },
          {
            id: 'hamstring_curls',
            type: 'exercise',
            name: 'Hamstring Curls',
            description: 'Prone or seated hamstring strengthening',
            dosage: 'Progressive resistance',
            frequency: '3 sets, 10-15 reps, daily',
            evidenceLevel: 'B'
          }
        ],
        progressionCriteria: [
          'Full knee extension',
          'Knee flexion >120 degrees',
          'Quadriceps strength >70% of contralateral',
          'No significant effusion'
        ]
      }
    ],
    outcomes: [
      {
        name: 'IKDC Subjective Score',
        type: 'functional',
        frequency: 'Baseline, 3, 6, 12 months',
        target: '>85 at 6 months'
      },
      {
        name: 'Single Leg Hop Test',
        type: 'objective',
        frequency: '4, 6, 9 months',
        target: '>90% limb symmetry'
      }
    ],
    references: [
      {
        title: 'Anterior cruciate ligament reconstruction rehabilitation: evidence-based medicine across the return-to-sport continuum',
        authors: 'Buckthorpe M, Della Villa F',
        journal: 'Sports Health',
        year: 2019,
        doi: '10.1177/1941738119869328',
        evidenceLevel: 'A'
      }
    ]
  },
  {
    id: 'frozen_shoulder',
    name: 'Adhesive Capsulitis Treatment',
    condition: 'Frozen Shoulder/Adhesive Capsulitis',
    bodyPart: 'shoulder',
    evidenceLevel: 'B',
    contraindications: [
      'Acute fracture',
      'Significant osteoporosis',
      'Recent surgery (<6 weeks)'
    ],
    precautions: [
      'Respect pain limits',
      'Avoid aggressive mobilization in freezing stage',
      'Monitor for diabetes complications'
    ],
    phases: [
      {
        id: 'freezing',
        name: 'Freezing Stage',
        duration: '2-9 months',
        goals: [
          'Pain management',
          'Maintain available range of motion',
          'Patient education about condition'
        ],
        interventions: [
          {
            id: 'gentle_rom',
            type: 'exercise',
            name: 'Gentle Range of Motion',
            description: 'Pendulum exercises, passive ROM within pain limits',
            dosage: 'Pain-free range only',
            frequency: '3-4 times daily',
            evidenceLevel: 'B'
          },
          {
            id: 'joint_mob',
            type: 'manual_therapy',
            name: 'Grade I-II Joint Mobilization',
            description: 'Gentle glenohumeral mobilization',
            dosage: 'Pain-free amplitude',
            frequency: '2-3 times per week',
            evidenceLevel: 'B'
          }
        ],
        progressionCriteria: [
          'Decreased night pain',
          'Stable or improved ROM measurements'
        ]
      }
    ],
    outcomes: [
      {
        name: 'DASH Score',
        type: 'functional',
        frequency: 'Monthly',
        target: '<30 at 12 months'
      },
      {
        name: 'Shoulder ROM',
        type: 'objective',
        frequency: 'Bi-weekly',
        target: '>75% of normal by 18 months'
      }
    ],
    references: [
      {
        title: 'Effectiveness of physical therapy for patients with adhesive capsulitis: a systematic review',
        authors: 'Page MJ, Green S, Kramer S',
        journal: 'Physiotherapy',
        year: 2014,
        evidenceLevel: 'A'
      }
    ]
  },
  {
    id: 'low_back_pain',
    name: 'Non-Specific Low Back Pain',
    condition: 'Acute/Chronic Non-Specific Low Back Pain',
    bodyPart: 'back',
    evidenceLevel: 'A',
    contraindications: [
      'Cauda equina syndrome',
      'Spinal fracture',
      'Spinal infection',
      'Progressive neurological deficit'
    ],
    precautions: [
      'Screen for red flags',
      'Monitor psychosocial factors',
      'Avoid bed rest >2 days'
    ],
    phases: [
      {
        id: 'acute_phase',
        name: 'Acute Phase Management',
        duration: '0-6 weeks',
        goals: [
          'Pain reduction',
          'Early mobilization',
          'Return to normal activities',
          'Prevent chronicity'
        ],
        interventions: [
          {
            id: 'education',
            type: 'education',
            name: 'Pain Science Education',
            description: 'Education about back pain, prognosis, and activity modification',
            dosage: 'Comprehensive session',
            frequency: 'Initial visit + reinforcement',
            evidenceLevel: 'A'
          },
          {
            id: 'graded_activity',
            type: 'exercise',
            name: 'Graded Activity Program',
            description: 'Progressive return to normal activities and work',
            dosage: 'Individualized progression',
            frequency: 'Daily activities + 2-3x/week PT',
            evidenceLevel: 'A'
          }
        ],
        progressionCriteria: [
          'Reduced pain intensity',
          'Improved function scores',
          'Return to work/activities'
        ]
      }
    ],
    outcomes: [
      {
        name: 'Roland Morris Disability Questionnaire',
        type: 'functional',
        frequency: 'Baseline, 2, 6, 12 weeks',
        target: '<4 points'
      },
      {
        name: 'Pain Intensity (VAS)',
        type: 'pain',
        frequency: 'Each visit',
        target: '<3/10'
      }
    ],
    references: [
      {
        title: 'Clinical practice guidelines for the management of non-specific low back pain',
        authors: 'Foster NE, Anema JR, Cherkin D',
        journal: 'Lancet',
        year: 2018,
        doi: '10.1016/S0140-6736(18)30480-X',
        evidenceLevel: 'A'
      }
    ]
  }
];

interface EvidenceBasedProtocolsProps {
  selectedCondition?: string;
  selectedBodyPart?: string;
}

export default function EvidenceBasedProtocols({ selectedCondition, selectedBodyPart }: EvidenceBasedProtocolsProps) {
  const [selectedProtocol, setSelectedProtocol] = useState<TreatmentProtocol | null>(null);
  const [activePhase, setActivePhase] = useState(0);

  const filteredProtocols = treatmentProtocols.filter(protocol => 
    (!selectedBodyPart || protocol.bodyPart === selectedBodyPart) &&
    (!selectedCondition || protocol.condition.toLowerCase().includes(selectedCondition.toLowerCase()))
  );

  const getEvidenceBadgeColor = (level: string) => {
    switch (level) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInterventionIcon = (type: string) => {
    switch (type) {
      case 'exercise': return <Target className="h-4 w-4" />;
      case 'manual_therapy': return <Users className="h-4 w-4" />;
      case 'education': return <BookOpen className="h-4 w-4" />;
      case 'modality': return <AlertCircle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  if (selectedProtocol) {
    const currentPhase = selectedProtocol.phases[activePhase];

    return (
      <div className="space-y-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {selectedProtocol.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedProtocol.condition}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getEvidenceBadgeColor(selectedProtocol.evidenceLevel)}>
                  Level {selectedProtocol.evidenceLevel}
                </Badge>
                <Button onClick={() => setSelectedProtocol(null)} variant="outline" size="sm">
                  Back to Protocols
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="protocol" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="protocol">Treatment Protocol</TabsTrigger>
            <TabsTrigger value="contraindications">Safety</TabsTrigger>
            <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
          </TabsList>

          <TabsContent value="protocol" className="space-y-6">
            {/* Phase Navigation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Treatment Phases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  {selectedProtocol.phases.map((phase, index) => (
                    <Button
                      key={phase.id}
                      variant={activePhase === index ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActivePhase(index)}
                    >
                      Phase {index + 1}
                    </Button>
                  ))}
                </div>
                <Progress value={((activePhase + 1) / selectedProtocol.phases.length) * 100} />
              </CardContent>
            </Card>

            {/* Current Phase Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{currentPhase.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{currentPhase.duration}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Goals */}
                <div>
                  <h4 className="font-semibold mb-3">Phase Goals</h4>
                  <ul className="space-y-2">
                    {currentPhase.goals.map((goal, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Interventions */}
                <div>
                  <h4 className="font-semibold mb-3">Interventions</h4>
                  <div className="grid gap-4">
                    {currentPhase.interventions.map((intervention) => (
                      <Card key={intervention.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getInterventionIcon(intervention.type)}
                              <h5 className="font-medium">{intervention.name}</h5>
                            </div>
                            <Badge className={getEvidenceBadgeColor(intervention.evidenceLevel)} variant="outline">
                              Level {intervention.evidenceLevel}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{intervention.description}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Dosage: </span>
                              {intervention.dosage}
                            </div>
                            <div>
                              <span className="font-medium">Frequency: </span>
                              {intervention.frequency}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Progression Criteria */}
                <div>
                  <h4 className="font-semibold mb-3">Progression Criteria</h4>
                  <ul className="space-y-2">
                    {currentPhase.progressionCriteria.map((criteria, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{criteria}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contraindications" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Contraindications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedProtocol.contraindications.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Precautions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedProtocol.precautions.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="outcomes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Outcome Measures & Targets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {selectedProtocol.outcomes.map((outcome, index) => (
                    <Card key={index} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{outcome.name}</h4>
                          <Badge variant="outline">{outcome.type}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Assessment Frequency: </span>
                            {outcome.frequency}
                          </div>
                          <div>
                            <span className="font-medium">Target: </span>
                            {outcome.target}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Supporting Evidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedProtocol.references.map((ref, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm leading-relaxed">{ref.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {ref.authors} • {ref.journal} ({ref.year})
                            </p>
                          </div>
                          <Badge className={getEvidenceBadgeColor(ref.evidenceLevel)}>
                            Level {ref.evidenceLevel}
                          </Badge>
                        </div>
                        {ref.doi && (
                          <Button variant="link" size="sm" className="p-0 h-auto">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Publication
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Evidence-Based Treatment Protocols
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Standardized, research-backed treatment approaches for common conditions
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {filteredProtocols.map((protocol) => (
            <Card key={protocol.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{protocol.name}</h3>
                      <Badge className={getEvidenceBadgeColor(protocol.evidenceLevel)}>
                        Level {protocol.evidenceLevel}
                      </Badge>
                      <Badge variant="outline">
                        {protocol.bodyPart}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {protocol.condition}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{protocol.phases.length} phases</span>
                      <span>{protocol.outcomes.length} outcome measures</span>
                      <span>{protocol.references.length} references</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedProtocol(protocol)}
                    size="sm"
                  >
                    View Protocol
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredProtocols.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No treatment protocols available for the selected criteria.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { type TreatmentProtocol, type TreatmentPhase, type Intervention, treatmentProtocols };