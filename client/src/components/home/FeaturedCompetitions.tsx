import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Clock, 
  Users, 
  Brain, 
  AlertTriangle, 
  Target, 
  Play,
  ArrowRight
} from "lucide-react";

interface Competition {
  id: number;
  title: string;
  description: string;
  gameType: string;
  bodyPart: string;
  difficulty: string;
  timeLimit: number;
  maxParticipants: number;
  currentParticipants: number;
  status: string;
}

const FeaturedCompetitions = () => {
  const { data: allCompetitions, isLoading } = useQuery<Competition[]>({
    queryKey: ['/api/home/featured-competitions'],
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Filter to only show the 4 approved competition types
  const allowedCompetitionTypes = [
    'emergency_triage',
    'manual_therapy_mastery',
    'exercise_prescription_expert',
    'pattern_recognition'
  ];

  const competitions = allCompetitions?.filter(competition => 
    allowedCompetitionTypes.includes(competition.gameType) ||
    competition.title.toLowerCase().includes('emergency triage') ||
    competition.title.toLowerCase().includes('manual therapy mastery') ||
    competition.title.toLowerCase().includes('exercise prescription') ||
    competition.title.toLowerCase().includes('pattern recognition')
  ) || [];

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'emergency_triage':
        return <AlertTriangle className="h-6 w-6" />;
      case 'pattern_recognition':
        return <Target className="h-6 w-6" />;
      case 'diagnosis_duel':
        return <Brain className="h-6 w-6" />;
      case 'manual_therapy_mastery':
        return <Trophy className="h-6 w-6" />;
      case 'exercise_prescription_expert':
        return <Play className="h-6 w-6" />;
      default:
        return <Brain className="h-6 w-6" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-500';
      case 'intermediate':
        return 'bg-yellow-500';
      case 'advanced':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const formatTimeLimit = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Test Your Clinical Skills</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Challenge yourself with interactive competitions designed to sharpen your clinical reasoning and diagnostic abilities
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-4">
                  <div className="w-8 h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="w-24 h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="w-32 h-3 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="w-20 h-8 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Test Your Clinical Skills</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Challenge yourself with interactive competitions designed to sharpen your clinical reasoning and diagnostic abilities
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {competitions?.map((competition) => (
            <Card key={competition.id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {getGameIcon(competition.gameType)}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`${getDifficultyColor(competition.difficulty)} text-white border-0`}
                  >
                    {competition.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {competition.title}
                </CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  {competition.bodyPart} • {competition.gameType.replace('_', ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-slate-700 mb-4 max-h-12 overflow-hidden">
                  {competition.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeLimit(competition.timeLimit)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {competition.currentParticipants}/{competition.maxParticipants}
                  </div>
                </div>

                <Button asChild className="w-full group-hover:bg-blue-600 transition-colors">
                  <Link href={`/game-competition/${competition.id}`}>
                    <Play className="h-4 w-4 mr-2" />
                    Join Challenge
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button asChild variant="outline" size="lg" className="group">
            <Link href="/game-competitions">
              View All Competitions
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCompetitions;