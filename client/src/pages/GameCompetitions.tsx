import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Zap, Clock, Heart, AlertTriangle, Target, BookOpen, Award, Search, Play, Trophy, Users, Timer, ChevronRight, ExternalLink, Brain } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

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
  progressive_diagnostic_challenge: Brain,
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
  progressive_diagnostic_challenge: 'Progressive Diagnostic Challenge',
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

// Component to display formatted game content
function GameContentDisplay({ gameType, content }: { gameType: string, content: any }) {
  const gameContent = content[gameType];
  
  if (!gameContent) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No content available for this game type.</p>
      </div>
    );
  }

  // Simple formatted display for all game types
  return (
    <div className="space-y-4">
      <h4 className="font-semibold capitalize">
        {gameTypeNames[gameType] || gameType.replace(/_/g, ' ')}
      </h4>
      <div className="text-sm space-y-3">
        {Object.entries(gameContent).map(([key, value]) => (
          <div key={key} className="bg-muted/30 p-3 rounded-lg">
            <div className="font-medium capitalize text-primary mb-2">
              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
            </div>
            <div className="text-muted-foreground">
              {Array.isArray(value) 
                ? `${value.length} ${key === 'cases' ? 'clinical cases' : key === 'patients' ? 'patients' : 'items'} available`
                : typeof value === 'object' && value !== null && !Array.isArray(value)
                ? `${Object.keys(value as Record<string, any>).length} elements configured`
                : String(value).slice(0, 150) + (String(value).length > 150 ? '...' : '')
              }
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <Trophy className="h-4 w-4 inline mr-1" />
        Join this competition to access the full interactive content and start playing!
      </div>
    </div>
  );
}

function GameCompetitions() {
  const [competitions, setCompetitions] = useState<GameCompetition[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedCompetition, setSelectedCompetition] = useState<GameContent | null>(null);
  const [joiningCompetition, setJoiningCompetition] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
    if (joiningCompetition) return; // Prevent multiple clicks
    
    setJoiningCompetition(competitionId);
    try {
      const response = await fetch(`/api/game-competitions/${competitionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join competition');
      }
      
      const data = await response.json();
      
      if (data.alreadyJoined) {
        toast({
          title: "Already Participating",
          description: "Taking you to the competition page...",
        });
      } else {
        toast({
          title: "Competition Joined!",
          description: "You've successfully joined the game competition. Redirecting to competition page...",
        });
      }
      
      // Navigate to game competition page
      setTimeout(() => {
        setLocation(`/game-competition/${competitionId}`);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error joining competition:', error);
      toast({
        title: "Join Failed",
        description: error.message || "Failed to join competition. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoiningCompetition(null);
    }
  };

  const viewCompetitionDetails = async (competitionId: number) => {
    try {
      const response = await fetch(`/api/game-competitions/${competitionId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch competition details');
      }
      
      const data = await response.json();
      setSelectedCompetition(data);
    } catch (error: any) {
      console.error('Error fetching competition details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load competition details",
        variant: "destructive",
      });
    }
  };

  const filteredCompetitions = competitions.filter(comp => {
    return (
      (selectedBodyPart === 'all' || comp.bodyPart === selectedBodyPart) &&
      (selectedDifficulty === 'all' || comp.difficulty === selectedDifficulty) &&
      (selectedGameType === 'all' || comp.gameType === selectedGameType)
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

  // Organize competitions by game type for dashboard sections
  const lightningDiagnosisCompetitions = competitions.filter(comp => comp.gameType === 'lightning_diagnosis');
  const progressiveDiagnosticCompetitions = competitions.filter(comp => comp.gameType === 'progressive_diagnostic_challenge');
  const treatmentSpeedRunCompetitions = competitions.filter(comp => comp.gameType === 'treatment_speed_run');
  
  // Get popular competitions (for demo purposes, using active status as popularity indicator)
  const popularCompetitions = competitions.filter(comp => comp.status === 'active').slice(0, 4);
  
  // Helper function to render competition cards
  const renderCompetitionCard = (competition: GameCompetition, featured = false) => {
    const IconComponent = gameTypeIcons[competition.gameType] || Trophy;
    return (
      <Card key={competition.id} className={`hover:shadow-lg transition-all duration-200 ${featured ? 'border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <IconComponent className={`h-6 w-6 ${featured ? 'text-primary' : 'text-muted-foreground'}`} />
            <Badge variant={competition.status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {competition.status}
            </Badge>
          </div>
          <CardTitle className="text-base leading-tight">{competition.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex flex-wrap gap-1">
            {competition.bodyPart && (
              <Badge variant="outline" className="text-xs">{competition.bodyPart}</Badge>
            )}
            {competition.difficulty && (
              <Badge variant="outline" className="text-xs">{competition.difficulty}</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {competition.timeLimit ? `${competition.timeLimit}min` : 'No limit'}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {competition.maxParticipants}
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => viewCompetitionDetails(competition.id)}
              variant="outline" 
              size="sm"
              className="flex-1 text-xs h-8"
            >
              View
            </Button>
            <Button 
              onClick={() => joinCompetition(competition.id)}
              size="sm"
              className="flex-1 text-xs h-8"
              disabled={joiningCompetition === competition.id}
            >
              {joiningCompetition === competition.id ? 'Loading...' : 'Join'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Clinical Challenge Dashboard</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Master your clinical skills through gamified challenges. Quick diagnostics, complex detective work, and comprehensive treatment planning.
        </p>
      </div>

      {/* Quick Challenge Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Quick Challenges</h2>
          </div>
          <Badge variant="secondary" className="text-xs">30 seconds each</Badge>
        </div>
        <p className="text-muted-foreground mb-4">
          Lightning-fast diagnosis challenges. Perfect for quick skill practice and warm-ups.
        </p>
        
        {lightningDiagnosisCompetitions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {lightningDiagnosisCompetitions.slice(0, 8).map(comp => renderCompetitionCard(comp))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No Lightning Diagnosis challenges available</p>
            </CardContent>
          </Card>
        )}

        {lightningDiagnosisCompetitions.length > 8 && (
          <div className="text-center mt-4">
            <Button variant="outline" size="sm">
              View All {lightningDiagnosisCompetitions.length} Lightning Challenges
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </section>

      {/* Clinical Detective Work Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold">Clinical Detective Work</h2>
          </div>
          <Badge variant="secondary" className="text-xs">5 minutes each</Badge>
        </div>
        <p className="text-muted-foreground mb-4">
          Complex diagnostic challenges requiring strategic questioning and clinical reasoning under time pressure.
        </p>
        
        {progressiveDiagnosticCompetitions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {progressiveDiagnosticCompetitions.slice(0, 6).map(comp => renderCompetitionCard(comp))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No Progressive Diagnostic challenges available</p>
            </CardContent>
          </Card>
        )}

        {progressiveDiagnosticCompetitions.length > 6 && (
          <div className="text-center mt-4">
            <Button variant="outline" size="sm">
              View All {progressiveDiagnosticCompetitions.length} Detective Challenges
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </section>

      {/* Treatment Planning Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-green-500" />
            <h2 className="text-2xl font-bold">Treatment Planning</h2>
          </div>
          <Badge variant="secondary" className="text-xs">Comprehensive protocols</Badge>
        </div>
        <p className="text-muted-foreground mb-4">
          Create detailed treatment plans under time pressure. Test your comprehensive clinical planning skills.
        </p>
        
        {treatmentSpeedRunCompetitions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {treatmentSpeedRunCompetitions.slice(0, 6).map(comp => renderCompetitionCard(comp))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No Treatment Speed Run challenges available</p>
            </CardContent>
          </Card>
        )}

        {treatmentSpeedRunCompetitions.length > 6 && (
          <div className="text-center mt-4">
            <Button variant="outline" size="sm">
              View All {treatmentSpeedRunCompetitions.length} Treatment Challenges
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </section>

      {/* Popular This Week Section */}
      {popularCompetitions.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-orange-500" />
              <h2 className="text-2xl font-bold">Popular This Week</h2>
            </div>
            <Badge variant="secondary" className="text-xs">Most active</Badge>
          </div>
          <p className="text-muted-foreground mb-4">
            Join the challenges other clinicians are taking on this week.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularCompetitions.map(comp => renderCompetitionCard(comp, true))}
          </div>
        </section>
      )}

      {/* Global Filters and Browse All */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Browse All Challenges
            </CardTitle>
            <CardDescription>Filter and explore all available competitions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
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
                  <SelectItem value="ankle">Ankle</SelectItem>
                  <SelectItem value="hip">Hip</SelectItem>
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

              <Select value={selectedGameType} onValueChange={setSelectedGameType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Challenge Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Challenge Types</SelectItem>
                  <SelectItem value="lightning_diagnosis">Lightning Diagnosis</SelectItem>
                  <SelectItem value="progressive_diagnostic_challenge">Progressive Diagnostic</SelectItem>
                  <SelectItem value="treatment_speed_run">Treatment Speed Run</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredCompetitions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCompetitions.map(comp => renderCompetitionCard(comp))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No competitions found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters to see more challenges.</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </section>

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
                      `${selectedCompetition.competition.timeLimit}` : '∞'
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
                    <GameContentDisplay 
                      gameType={selectedCompetition.competition.gameType} 
                      content={selectedCompetition.content} 
                    />
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

export default GameCompetitions;