import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calculator, 
  Search, 
  BookOpen, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
  Target,
  Brain,
  Stethoscope,
  FileText,
  ClipboardCheck
} from "lucide-react";
import ClinicalCalculators from "./ClinicalCalculators";

interface SpecialTest {
  name: string;
  bodyPart: string;
  purpose: string;
  sensitivity: number;
  specificity: number;
  technique: string;
  interpretation: string;
}

interface ExerciseProtocol {
  name: string;
  condition: string;
  phase: 'acute' | 'subacute' | 'strengthening' | 'return-to-function';
  sets: string;
  reps: string;
  frequency: string;
  intensity: string;
  progression: string;
  contraindications: string[];
}

interface DifferentialDiagnosis {
  condition: string;
  likelihood: 'high' | 'moderate' | 'low';
  keyFindings: string[];
  rulingTests: string[];
}

export default function ClinicalToolsPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTest, setSelectedTest] = useState<SpecialTest | null>(null);
  const [activeTab, setActiveTab] = useState("calculators");

  // Sample special tests data - would be expanded in full implementation
  const specialTests: SpecialTest[] = [
    {
      name: "Neer's Test",
      bodyPart: "Shoulder",
      purpose: "Subacromial impingement",
      sensitivity: 79,
      specificity: 53,
      technique: "Forward flex arm to 180° with scapula stabilized",
      interpretation: "Positive if pain reproduced in subacromial region"
    },
    {
      name: "Empty Can Test",
      bodyPart: "Shoulder",
      purpose: "Supraspinatus pathology",
      sensitivity: 69,
      specificity: 62,
      technique: "Arm at 90° abduction, 30° horizontal adduction, thumb down",
      interpretation: "Positive if weakness or pain with resistance"
    },
    {
      name: "McMurray's Test",
      bodyPart: "Knee",
      purpose: "Meniscal tears",
      sensitivity: 61,
      specificity: 84,
      technique: "Flex knee, rotate tibia, extend knee",
      interpretation: "Positive if click/pain at joint line"
    },
    {
      name: "Lachman's Test",
      bodyPart: "Knee",
      purpose: "ACL integrity",
      sensitivity: 85,
      specificity: 94,
      technique: "Knee at 20-30°, anterior tibial translation",
      interpretation: "Positive if excessive translation or soft endpoint"
    },
    {
      name: "SLUMP Test",
      bodyPart: "Spine",
      purpose: "Neural tension",
      sensitivity: 84,
      specificity: 83,
      technique: "Seated slump with cervical flexion, knee extension, ankle DF",
      interpretation: "Positive if reproduces symptoms, relieved by cervical extension"
    }
  ];

  const exerciseProtocols: ExerciseProtocol[] = [
    {
      name: "Achilles Tendinopathy Protocol",
      condition: "Achilles tendinopathy",
      phase: 'strengthening',
      sets: "3-4",
      reps: "15 (slow)",
      frequency: "Daily",
      intensity: "Moderate-heavy load",
      progression: "Increase load when pain <3/10",
      contraindications: ["Acute rupture", "Severe pain >7/10"]
    },
    {
      name: "Rotator Cuff Progressive Loading",
      condition: "Rotator cuff tendinopathy",
      phase: 'subacute',
      sets: "3",
      reps: "8-15",
      frequency: "3x/week",
      intensity: "60-80% 1RM",
      progression: "Add 5-10% load weekly",
      contraindications: ["Full thickness tear", "Acute inflammation"]
    }
  ];

  const filteredTests = specialTests.filter(test =>
    test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.bodyPart.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculators" className="text-xs">
            <Calculator className="h-3 w-3 mr-1" />
            Calculators
          </TabsTrigger>
          <TabsTrigger value="tests" className="text-xs">
            <Stethoscope className="h-3 w-3 mr-1" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="exercises" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            Exercises
          </TabsTrigger>
          <TabsTrigger value="reasoning" className="text-xs">
            <Brain className="h-3 w-3 mr-1" />
            Reasoning
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="calculators" className="p-4">
            <ClinicalCalculators />
          </TabsContent>

          <TabsContent value="tests" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Search Special Tests</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, body part, or purpose..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredTests.map((test) => (
                <Card
                  key={test.name}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedTest(test)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{test.name}</div>
                        <div className="text-xs text-gray-600">{test.purpose}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {test.bodyPart}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Sn: {test.sensitivity}%
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Sp: {test.specificity}%
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedTest && (
              <Card className="border-teal-200 bg-teal-50/30">
                <CardHeader>
                  <CardTitle className="text-base">{selectedTest.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Technique:</span>
                    <p className="text-gray-600 mt-1">{selectedTest.technique}</p>
                  </div>
                  <div>
                    <span className="font-medium">Interpretation:</span>
                    <p className="text-gray-600 mt-1">{selectedTest.interpretation}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-2xl font-bold text-green-600">{selectedTest.sensitivity}%</div>
                      <div className="text-xs text-gray-600">Sensitivity</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-2xl font-bold text-blue-600">{selectedTest.specificity}%</div>
                      <div className="text-xs text-gray-600">Specificity</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="exercises" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Exercise Prescription Protocols</Label>
              <div className="text-xs text-gray-600">Evidence-based loading parameters</div>
            </div>

            {exerciseProtocols.map((protocol) => (
              <Card key={protocol.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{protocol.name}</CardTitle>
                  <Badge className="w-fit" variant="outline">
                    {protocol.phase} phase
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Sets/Reps:</span>
                      <p className="text-gray-600">{protocol.sets} x {protocol.reps}</p>
                    </div>
                    <div>
                      <span className="font-medium">Frequency:</span>
                      <p className="text-gray-600">{protocol.frequency}</p>
                    </div>
                    <div>
                      <span className="font-medium">Intensity:</span>
                      <p className="text-gray-600">{protocol.intensity}</p>
                    </div>
                    <div>
                      <span className="font-medium">Progression:</span>
                      <p className="text-gray-600">{protocol.progression}</p>
                    </div>
                  </div>
                  {protocol.contraindications.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Contraindications:</span>
                      </div>
                      <ul className="text-xs text-gray-600 mt-1 list-disc list-inside">
                        {protocol.contraindications.map((ci, idx) => (
                          <li key={idx}>{ci}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="reasoning" className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Clinical Reasoning Framework
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge className="mt-0.5">1</Badge>
                    <div>
                      <div className="font-medium text-sm">Pattern Recognition</div>
                      <div className="text-xs text-gray-600">Identify common clinical presentations</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="mt-0.5">2</Badge>
                    <div>
                      <div className="font-medium text-sm">Hypothesis Generation</div>
                      <div className="text-xs text-gray-600">Form differential diagnoses</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="mt-0.5">3</Badge>
                    <div>
                      <div className="font-medium text-sm">Hypothesis Testing</div>
                      <div className="text-xs text-gray-600">Use specific tests to confirm/refute</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="mt-0.5">4</Badge>
                    <div>
                      <div className="font-medium text-sm">Clinical Decision</div>
                      <div className="text-xs text-gray-600">Apply evidence to treatment selection</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="mt-0.5">5</Badge>
                    <div>
                      <div className="font-medium text-sm">Reassessment</div>
                      <div className="text-xs text-gray-600">Monitor progress and modify</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Red Flag Screening
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-red-500" />
                    <span>Cauda equina syndrome</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-red-500" />
                    <span>Fracture indicators</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-red-500" />
                    <span>Infection signs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-red-500" />
                    <span>Malignancy markers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-red-500" />
                    <span>Vascular compromise</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}