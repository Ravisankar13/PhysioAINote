import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Target, 
  Timer, 
  Trophy,
  Activity,
  BookOpen,
  CheckCircle
} from 'lucide-react';

interface ManualTherapyTechnique {
  id: string;
  name: string;
  category: 'soft_tissue' | 'joint_mobilization' | 'trigger_point' | 'myofascial';
  description: string;
  targetRegions: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // seconds
  forcePattern: {
    initialForce: number;
    peakForce: number;
    rhythm: 'steady' | 'pulsing' | 'increasing' | 'oscillating';
    frequency?: number; // Hz for pulsing/oscillating
  };
  safety: {
    maxForce: number;
    contraindications: string[];
    precautions: string[];
  };
  learningObjectives: string[];
  assessmentCriteria: {
    forceControl: number; // weight in assessment
    rhythm: number;
    duration: number;
    regionAccuracy: number;
  };
}

const manualTherapyTechniques: ManualTherapyTechnique[] = [
  {
    id: 'effleurage_basic',
    name: 'Effleurage - Basic Strokes',
    category: 'soft_tissue',
    description: 'Light to moderate pressure stroking movements to warm tissues and promote circulation.',
    targetRegions: ['back', 'shoulders', 'arms', 'legs'],
    difficulty: 'beginner',
    duration: 60,
    forcePattern: {
      initialForce: 0.2,
      peakForce: 0.4,
      rhythm: 'steady'
    },
    safety: {
      maxForce: 0.5,
      contraindications: ['acute inflammation', 'open wounds'],
      precautions: ['adjust pressure for client comfort']
    },
    learningObjectives: [
      'Maintain consistent pressure throughout stroke',
      'Use full palm contact',
      'Follow anatomical contours',
      'Establish rhythmic pattern'
    ],
    assessmentCriteria: {
      forceControl: 40,
      rhythm: 30,
      duration: 20,
      regionAccuracy: 10
    }
  },
  {
    id: 'petrissage_kneading',
    name: 'Petrissage - Kneading',
    category: 'soft_tissue',
    description: 'Rhythmic compression and lifting of muscle tissue to improve tissue mobility.',
    targetRegions: ['shoulders', 'back', 'thighs', 'calves'],
    difficulty: 'intermediate',
    duration: 90,
    forcePattern: {
      initialForce: 0.4,
      peakForce: 0.7,
      rhythm: 'pulsing',
      frequency: 0.5
    },
    safety: {
      maxForce: 0.8,
      contraindications: ['muscle strains', 'recent surgery'],
      precautions: ['avoid bony prominences', 'monitor client response']
    },
    learningObjectives: [
      'Coordinate bilateral hand movements',
      'Apply appropriate compression depth',
      'Maintain rhythmic timing',
      'Avoid pinching tissues'
    ],
    assessmentCriteria: {
      forceControl: 35,
      rhythm: 35,
      duration: 15,
      regionAccuracy: 15
    }
  },
  {
    id: 'trigger_point_release',
    name: 'Trigger Point Release',
    category: 'trigger_point',
    description: 'Sustained pressure on hyperirritable spots to reduce muscle tension and pain.',
    targetRegions: ['neck', 'shoulders', 'back', 'glutes'],
    difficulty: 'advanced',
    duration: 30,
    forcePattern: {
      initialForce: 0.3,
      peakForce: 0.9,
      rhythm: 'increasing'
    },
    safety: {
      maxForce: 1.0,
      contraindications: ['acute injury', 'severe inflammation'],
      precautions: ['start with light pressure', 'monitor pain levels', 'allow tissue adaptation']
    },
    learningObjectives: [
      'Locate trigger points accurately',
      'Apply graduated pressure increase',
      'Recognize tissue release',
      'Maintain pressure duration'
    ],
    assessmentCriteria: {
      forceControl: 50,
      rhythm: 20,
      duration: 20,
      regionAccuracy: 10
    }
  },
  {
    id: 'joint_mobilization_grade2',
    name: 'Joint Mobilization - Grade II',
    category: 'joint_mobilization',
    description: 'Small amplitude movements through the joint range to reduce pain and stiffness.',
    targetRegions: ['shoulder', 'spine', 'hip', 'knee'],
    difficulty: 'advanced',
    duration: 45,
    forcePattern: {
      initialForce: 0.2,
      peakForce: 0.5,
      rhythm: 'oscillating',
      frequency: 1.0
    },
    safety: {
      maxForce: 0.6,
      contraindications: ['fractures', 'joint instability', 'acute inflammation'],
      precautions: ['respect tissue barrier', 'monitor joint position', 'avoid forcing movement']
    },
    learningObjectives: [
      'Identify joint barriers',
      'Apply oscillatory movements',
      'Maintain joint positioning',
      'Control movement amplitude'
    ],
    assessmentCriteria: {
      forceControl: 30,
      rhythm: 40,
      duration: 20,
      regionAccuracy: 10
    }
  },
  {
    id: 'myofascial_release',
    name: 'Myofascial Release',
    category: 'myofascial',
    description: 'Sustained low-load stretching to release fascial restrictions.',
    targetRegions: ['IT band', 'plantar fascia', 'thoracolumbar fascia'],
    difficulty: 'intermediate',
    duration: 120,
    forcePattern: {
      initialForce: 0.3,
      peakForce: 0.6,
      rhythm: 'steady'
    },
    safety: {
      maxForce: 0.7,
      contraindications: ['acute injury', 'infection'],
      precautions: ['allow adequate time for tissue response', 'avoid excessive force']
    },
    learningObjectives: [
      'Identify fascial restrictions',
      'Apply sustained pressure',
      'Feel tissue release',
      'Maintain patient comfort'
    ],
    assessmentCriteria: {
      forceControl: 45,
      rhythm: 25,
      duration: 25,
      regionAccuracy: 5
    }
  }
];

interface ManualTherapyLibraryProps {
  onTechniqueSelect: (technique: ManualTherapyTechnique) => void;
  currentTechnique?: ManualTherapyTechnique | null;
  isTraining: boolean;
  trainingProgress?: {
    score: number;
    feedback: string[];
    timeRemaining: number;
  };
}

export default function ManualTherapyLibrary({
  onTechniqueSelect,
  currentTechnique,
  isTraining,
  trainingProgress
}: ManualTherapyLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredTechniques = manualTherapyTechniques.filter(technique => {
    const categoryMatch = selectedCategory === 'all' || technique.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || technique.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'soft_tissue': return <Activity className="h-4 w-4" />;
      case 'joint_mobilization': return <Target className="h-4 w-4" />;
      case 'trigger_point': return <CheckCircle className="h-4 w-4" />;
      case 'myofascial': return <BookOpen className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Manual Therapy Training Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="techniques">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="techniques">Techniques</TabsTrigger>
              <TabsTrigger value="training">Training Session</TabsTrigger>
            </TabsList>

            <TabsContent value="techniques" className="space-y-4">
              {/* Filter Controls */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  All Categories
                </Button>
                <Button
                  variant={selectedCategory === 'soft_tissue' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('soft_tissue')}
                >
                  Soft Tissue
                </Button>
                <Button
                  variant={selectedCategory === 'joint_mobilization' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('joint_mobilization')}
                >
                  Joint Mobilization
                </Button>
                <Button
                  variant={selectedCategory === 'trigger_point' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('trigger_point')}
                >
                  Trigger Point
                </Button>
                <Button
                  variant={selectedCategory === 'myofascial' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('myofascial')}
                >
                  Myofascial
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={selectedDifficulty === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDifficulty('all')}
                >
                  All Levels
                </Button>
                <Button
                  variant={selectedDifficulty === 'beginner' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDifficulty('beginner')}
                >
                  Beginner
                </Button>
                <Button
                  variant={selectedDifficulty === 'intermediate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDifficulty('intermediate')}
                >
                  Intermediate
                </Button>
                <Button
                  variant={selectedDifficulty === 'advanced' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDifficulty('advanced')}
                >
                  Advanced
                </Button>
              </div>

              {/* Technique List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTechniques.map((technique) => (
                  <Card key={technique.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(technique.category)}
                            <h4 className="font-medium">{technique.name}</h4>
                            <Badge className={getDifficultyColor(technique.difficulty)}>
                              {technique.difficulty}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {technique.description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {technique.duration}s
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {technique.targetRegions.join(', ')}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {technique.learningObjectives.slice(0, 2).map((objective, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {objective}
                              </Badge>
                            ))}
                            {technique.learningObjectives.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{technique.learningObjectives.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => onTechniqueSelect(technique)}
                          disabled={isTraining}
                          className="ml-4"
                        >
                          {currentTechnique?.id === technique.id ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Active
                            </>
                          ) : (
                            'Select'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="training" className="space-y-4">
              {currentTechnique ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Training: {currentTechnique.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isTraining && trainingProgress ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Overall Score</span>
                          <span className="text-lg font-bold">{trainingProgress.score}%</span>
                        </div>
                        
                        <Progress value={trainingProgress.score} className="w-full" />
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Timer className="h-4 w-4" />
                          Time Remaining: {trainingProgress.timeRemaining}s
                        </div>
                        
                        {trainingProgress.feedback.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Real-time Feedback:</h4>
                            <div className="space-y-1">
                              {trainingProgress.feedback.map((feedback, idx) => (
                                <div key={idx} className="text-xs p-2 bg-muted rounded">
                                  {feedback}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">Learning Objectives:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {currentTechnique.learningObjectives.map((objective, idx) => (
                              <li key={idx}>{objective}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Safety Considerations:</h4>
                          <div className="text-sm space-y-1">
                            <div>
                              <strong>Max Force:</strong> {currentTechnique.safety.maxForce * 100}%
                            </div>
                            <div>
                              <strong>Contraindications:</strong> {currentTechnique.safety.contraindications.join(', ')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Assessment Criteria:</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>Force Control: {currentTechnique.assessmentCriteria.forceControl}%</div>
                            <div>Rhythm: {currentTechnique.assessmentCriteria.rhythm}%</div>
                            <div>Duration: {currentTechnique.assessmentCriteria.duration}%</div>
                            <div>Accuracy: {currentTechnique.assessmentCriteria.regionAccuracy}%</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Technique Selected</h3>
                    <p className="text-muted-foreground">
                      Select a manual therapy technique from the library to begin training.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}