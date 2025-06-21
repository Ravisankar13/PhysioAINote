import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Lightbulb, Users, Activity, Target, Microscope } from "lucide-react";
import { useState } from "react";

interface FollowUpQuestion {
  question: string;
  priority: number;
  feasibilityScore: number;
  rationale: string;
}

interface FollowUpQuestionsData {
  methodological: FollowUpQuestion[];
  population: FollowUpQuestion[];
  intervention: FollowUpQuestion[];
  outcomes: FollowUpQuestion[];
  mechanisms: FollowUpQuestion[];
}

interface FollowUpQuestionsProps {
  followUpQuestions: FollowUpQuestionsData;
}

const categoryConfig = {
  methodological: {
    title: "Methodological Improvements",
    icon: Lightbulb,
    color: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-800"
  },
  population: {
    title: "Population Variations",
    icon: Users,
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-800"
  },
  intervention: {
    title: "Intervention Modifications",
    icon: Activity,
    color: "bg-orange-50 border-orange-200",
    badgeColor: "bg-orange-100 text-orange-800"
  },
  outcomes: {
    title: "Outcome Measures",
    icon: Target,
    color: "bg-purple-50 border-purple-200",
    badgeColor: "bg-purple-100 text-purple-800"
  },
  mechanisms: {
    title: "Mechanism Exploration",
    icon: Microscope,
    color: "bg-indigo-50 border-indigo-200",
    badgeColor: "bg-indigo-100 text-indigo-800"
  }
};

const getPriorityColor = (priority: number) => {
  if (priority >= 8) return "bg-red-100 text-red-800";
  if (priority >= 6) return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
};

const getFeasibilityColor = (score: number) => {
  if (score >= 8) return "bg-green-100 text-green-800";
  if (score >= 6) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

export function FollowUpQuestions({ followUpQuestions }: FollowUpQuestionsProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sortQuestionsByPriority = (questions: FollowUpQuestion[]) => {
    return [...questions].sort((a, b) => b.priority - a.priority);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          AI-Generated Follow-up Research Questions
        </h3>
      </div>

      {Object.entries(categoryConfig).map(([key, config]) => {
        const questions = followUpQuestions[key as keyof FollowUpQuestionsData];
        if (!questions || questions.length === 0) return null;

        const sortedQuestions = sortQuestionsByPriority(questions);
        const isOpen = openSections[key];
        const Icon = config.icon;

        return (
          <Card key={key} className={`${config.color} transition-all duration-200`}>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <CardHeader 
                  className="cursor-pointer hover:bg-opacity-80 transition-colors"
                  onClick={() => toggleSection(key)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <span>{config.title}</span>
                      <Badge variant="outline" className={config.badgeColor}>
                        {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="p-1">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {sortedQuestions.map((question, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <p className="text-gray-900 font-medium leading-relaxed flex-1">
                            {question.question}
                          </p>
                          <div className="flex gap-2 flex-shrink-0">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getPriorityColor(question.priority)}`}
                            >
                              Priority: {question.priority}/10
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getFeasibilityColor(question.feasibilityScore)}`}
                            >
                              Feasibility: {question.feasibilityScore}/10
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-300">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium text-gray-900">Rationale:</span> {question.rationale}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {Object.values(followUpQuestions).every(questions => !questions || questions.length === 0) && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No follow-up research questions have been generated yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Complete the AI analysis to see suggested research directions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}