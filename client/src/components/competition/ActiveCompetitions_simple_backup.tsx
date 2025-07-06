import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Users, Timer, Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ActiveCompetitions() {
  const { data: activeCompetitions, isLoading: loadingActive } = useQuery({
    queryKey: ['/api/competitions/active']
  });

  const { data: gameCompetitions, isLoading: loadingGames } = useQuery({
    queryKey: ['/api/game-competitions']
  });

  if (loadingActive || loadingGames) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-center h-40">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const safeActiveCompetitions = Array.isArray(activeCompetitions) ? activeCompetitions : [];
  const safeGameCompetitions = Array.isArray(gameCompetitions) ? gameCompetitions : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          All Competitions
        </h3>
        
        {safeActiveCompetitions.length === 0 && safeGameCompetitions.length === 0 ? (
          <Alert>
            <AlertDescription>
              No competitions available at the moment. Check back soon for new challenges!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {/* Traditional Competitions */}
            {safeActiveCompetitions.map((comp: any) => (
              <Card key={comp.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                        {comp.title}
                      </CardTitle>
                      <CardDescription>{comp.description}</CardDescription>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      Traditional
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button size="sm">Join Competition</Button>
                </CardContent>
              </Card>
            ))}
            
            {/* Game Competitions */}
            {safeGameCompetitions.map((comp: any) => (
              <Card key={comp.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-blue-600" />
                        {comp.title}
                      </CardTitle>
                      <CardDescription>{comp.gameType} Challenge</CardDescription>
                    </div>
                    <Badge variant="outline">Game Challenge</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline">Start Challenge</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}