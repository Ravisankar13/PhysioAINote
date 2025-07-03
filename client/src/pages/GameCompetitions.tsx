import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Zap, Clock, Heart, AlertTriangle, Target, BookOpen, Award, Search, Play, Trophy, Users, Timer } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface GameCompetition {
  id: number;
  title: string;
  description: string;
  gameType: string;
  bodyPart?: string;
  difficulty?: string;
  timeLimit?: number;
  status: string;
  maxParticipants: number;
  startTime: string;
  endTime: string;
}

interface GameContent {
  competition: GameCompetition;
  content: any;
}

const gameTypeIcons: Record<string, any> = {
  lightning_diagnosis: Zap,
  treatment_speed_run: Clock,
  choose_your_adventure: Play,
  emergency_room_simulator: Heart,
  red_flag_detective: AlertTriangle,
  differential_diagnosis_duel: Target,
  journal_club_race: BookOpen,
  cpg_quiz_master: Award,
  mystery_patient: Search,
};

const gameTypeNames: Record<string, string> = {
  lightning_diagnosis: 'Lightning Diagnosis',
  treatment_speed_run: 'Treatment Speed Run',
  choose_your_adventure: 'Choose Your Adventure',
  emergency_room_simulator: 'Emergency Room Simulator',
  red_flag_detective: 'Red Flag Detective',
  differential_diagnosis_duel: 'Differential Diagnosis Duel',
  journal_club_race: 'Journal Club Race',
  cpg_quiz_master: 'CPG Quiz Master',
  mystery_patient: 'Mystery Patient',
};

const gameTypeDescriptions: Record<string, string> = {
  lightning_diagnosis: 'Rapid-fire diagnosis challenges with 30-second time limits',
  treatment_speed_run: 'Create comprehensive treatment plans under time pressure',
  choose_your_adventure: 'Interactive clinical scenarios with branching storylines',
  emergency_room_simulator: 'Manage multiple patients with limited resources',
  red_flag_detective: 'Identify serious pathology hidden in routine cases',
  differential_diagnosis_duel: 'Battle to create the most comprehensive differential lists',
  journal_club_race: 'Critical appraisal of research papers against the clock',
  cpg_quiz_master: 'Test knowledge of clinical practice guidelines',
  mystery_patient: 'Solve complex cases with gradually revealed clues',
};

export default function GameCompetitions() {
  const [competitions, setCompetitions] = useState<GameCompetition[]>([]);
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedCompetition, setSelectedCompetition] = useState<GameContent | null>(null);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      const response = await fetch('/api/game-competitions');
      const data = await response.json();
      setCompetitions(data);
    } catch (error) {
      console.error('Error fetching competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewCompetition = async (gameType: string) => {
    try {
      const response = await fetch('/api/game-competitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameType,
          title: `${gameTypeNames[gameType]} Challenge`,
          description: gameTypeDescriptions[gameType],
          bodyPart: 'general',
          difficulty: 'intermediate',
          timeLimit: 1800, // 30 minutes
        }),
      });
      
      const data = await response.json();
      
      // Refresh competitions list
      fetchCompetitions();
      console.log('Competition created:', data);
    } catch (error) {
      console.error('Error creating competition:', error);
    }
  };

  const joinCompetition = async (competitionId: number) => {
    try {
      const response = await fetch(`/api/game-competitions/${competitionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      console.log('Joined competition:', data);
    } catch (error) {
      console.error('Error joining competition:', error);
    }
  };

  const viewCompetitionDetails = async (competitionId: number) => {
    try {
      const response = await fetch(`/api/game-competitions/${competitionId}`);
      const data = await response.json();
      setSelectedCompetition(data);
    } catch (error) {
      console.error('Error fetching competition details:', error);
    }
  };

  const filteredCompetitions = competitions.filter(comp => {
    return (
      (selectedGameType === 'all' || comp.gameType === selectedGameType) &&
      (selectedBodyPart === 'all' || comp.bodyPart === selectedBodyPart) &&
      (selectedDifficulty === 'all' || comp.difficulty === selectedDifficulty)
    );
  });

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-pulse">Loading game competitions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Game-Based Competitions</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Experience clinical learning through innovative game formats. Each competition type offers unique challenges 
          designed to test different aspects of physiotherapy expertise.
        </p>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Games</TabsTrigger>
          <TabsTrigger value="active">Active Competitions</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Competitions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Select value={selectedGameType} onValueChange={setSelectedGameType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Game Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Game Types</SelectItem>
                  {Object.entries(gameTypeNames).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBodyPart} onValueChange={setSelectedBodyPart}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Body Part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Body Parts</SelectItem>
                  <SelectItem value="shoulder">Shoulder</SelectItem>
                  <SelectItem value="knee">Knee</SelectItem>
                  <SelectItem value="back">Back</SelectItem>
                  <SelectItem value="neck">Neck</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Competitions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompetitions.map((competition) => {
              const IconComponent = gameTypeIcons[competition.gameType] || Trophy;
              return (
                <Card key={competition.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <IconComponent className="h-8 w-8 text-primary" />
                      <Badge variant={competition.status === 'active' ? 'default' : 'secondary'}>
                        {competition.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{competition.title}</CardTitle>
                    <CardDescription>{competition.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {competition.bodyPart && (
                        <Badge variant="outline">{competition.bodyPart}</Badge>
                      )}
                      {competition.difficulty && (
                        <Badge variant="outline">{competition.difficulty}</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Timer className="h-4 w-4" />
                        {competition.timeLimit ? `${Math.floor(competition.timeLimit / 60)}min` : 'No limit'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Max {competition.maxParticipants}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => viewCompetitionDetails(competition.id)}
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                      >
                        View Details
                      </Button>
                      <Button 
                        onClick={() => joinCompetition(competition.id)}
                        size="sm"
                        className="flex-1"
                      >
                        Join
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredCompetitions.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No competitions found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or create a new competition.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Competitions</CardTitle>
              <CardDescription>Competitions currently accepting participants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4" />
                <p>No active competitions at the moment. Check back soon!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Game Competition</CardTitle>
              <CardDescription>Choose a game format to create a new competition</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(gameTypeNames).map(([gameType, name]) => {
                  const IconComponent = gameTypeIcons[gameType] || Trophy;
                  return (
                    <Card key={gameType} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center space-y-4">
                          <IconComponent className="h-12 w-12 text-primary" />
                          <h3 className="text-lg font-semibold text-center">{name}</h3>
                          <p className="text-sm text-muted-foreground text-center">
                            {gameTypeDescriptions[gameType]}
                          </p>
                          <Button 
                            onClick={() => createNewCompetition(gameType)}
                            className="w-full"
                          >
                            Create Competition
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Competition Details Dialog */}
      <Dialog open={!!selectedCompetition} onOpenChange={() => setSelectedCompetition(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCompetition?.competition.title}</DialogTitle>
            <DialogDescription>{selectedCompetition?.competition.description}</DialogDescription>
          </DialogHeader>
          
          {selectedCompetition && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedCompetition.competition.timeLimit ? 
                      `${Math.floor(selectedCompetition.competition.timeLimit / 60)}` : '∞'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Minutes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedCompetition.competition.maxParticipants}
                  </div>
                  <div className="text-sm text-muted-foreground">Max Players</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedCompetition.competition.difficulty || 'Any'}
                  </div>
                  <div className="text-sm text-muted-foreground">Difficulty</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedCompetition.competition.bodyPart || 'General'}
                  </div>
                  <div className="text-sm text-muted-foreground">Focus Area</div>
                </div>
              </div>

              {selectedCompetition.content && (
                <Card>
                  <CardHeader>
                    <CardTitle>Game Content Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(selectedCompetition.content, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-4">
                <Button 
                  onClick={() => joinCompetition(selectedCompetition.competition.id)}
                  className="flex-1"
                >
                  Join Competition
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedCompetition(null)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}