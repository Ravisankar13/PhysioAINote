import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  User, 
  Brain, 
  Calendar, 
  Activity,
  ChevronDown,
  ChevronRight,
  Stethoscope,
  FileText,
  Target
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface VirtualPatient {
  id: number;
  patient_name: string;
  age: number;
  gender: string;
  body_part: string;
  chief_complaint: string;
  symptoms_description: string;
  past_medical_history: string;
  diagnosis?: string;
  createdAt: string;
  // Analysis result fields if present
  analysisResult?: {
    diagnosis?: string;
    treatmentPlan?: string;
    expertInsights?: string;
  };
}

// This interface should match what PhysioGPT expects
interface PhysioGPTVirtualPatient {
  id: number;
  patientName: string;
  age: number;
  gender: string;
  bodyPart: string;
  condition: string;
  chiefComplaint: string;
  presentingSymptoms: string;
  medicalHistory: string;
  expertFramework: string;
  complexity: string;
}

interface VirtualPatientSidebarProps {
  onPatientSelect: (patient: PhysioGPTVirtualPatient) => void;
  selectedPatientId?: number | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const expertFrameworks = [
  { id: 'jo-gibson', name: 'Jo Gibson', specialty: 'Shoulder Rehabilitation' },
  { id: 'grimaldi', name: 'Alison Grimaldi', specialty: 'Hip & Pelvis' },
  { id: 'bisset', name: 'Leanne Bisset', specialty: 'Elbow Conditions' },
  { id: 'clinical-edge', name: 'Clinical Edge', specialty: 'Evidence-Based Practice' },
  { id: 'physio-network', name: 'Physio Network', specialty: 'Pain Management' },
  { id: 'sports-map', name: 'Sports Map', specialty: 'Sports Rehabilitation' },
];

const complexityColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800'
};

export default function VirtualPatientSidebar({ 
  onPatientSelect, 
  selectedPatientId, 
  isCollapsed = false,
  onToggleCollapse 
}: VirtualPatientSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFramework, setSelectedFramework] = useState<string>("all");
  const [expandedFrameworks, setExpandedFrameworks] = useState<Set<string>>(new Set());

  const { 
    data: patients = [], 
    isLoading 
  } = useQuery<VirtualPatient[]>({
    queryKey: ["/api/virtual-patients"],
    queryFn: async () => {
      if (!user) return [];
      
      const response = await fetch("/api/virtual-patients", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error(`Failed to fetch virtual patients`);
      }
      
      return response.json();
    },
    enabled: !!user,
    refetchOnWindowFocus: false
  });

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = !searchTerm || 
      patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.body_part.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFramework = selectedFramework === "all";
    
    return matchesSearch && matchesFramework;
  });

  // Group patients by body part instead of framework
  const groupedPatients = filteredPatients.reduce((acc, patient) => {
    const bodyPart = patient.body_part || 'general';
    if (!acc[bodyPart]) acc[bodyPart] = [];
    acc[bodyPart].push(patient);
    return acc;
  }, {} as Record<string, VirtualPatient[]>);

  const toggleBodyPart = (bodyPart: string) => {
    const newExpanded = new Set(expandedFrameworks);
    if (newExpanded.has(bodyPart)) {
      newExpanded.delete(bodyPart);
    } else {
      newExpanded.add(bodyPart);
    }
    setExpandedFrameworks(newExpanded);
  };

  const getBodyPartInfo = (bodyPart: string) => {
    return { id: bodyPart, name: bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1), specialty: 'General' };
  };

  // Convert database patient to PhysioGPT format
  const convertToPhysioGPTFormat = (patient: VirtualPatient): PhysioGPTVirtualPatient => {
    // Map body part to appropriate expert framework
    const frameworkMapping: Record<string, string> = {
      'shoulder': 'jo-gibson',
      'hip': 'grimaldi', 
      'elbow': 'bisset',
      'knee': 'clinical-edge',
      'back': 'physio-network',
      'neck': 'physio-network',
      'ankle': 'sports-map',
      'foot': 'sports-map',
      'wrist': 'clinical-edge',
      'hand': 'clinical-edge'
    };

    return {
      id: patient.id,
      patientName: patient.patient_name,
      age: patient.age,
      gender: patient.gender,
      bodyPart: patient.body_part,
      condition: patient.diagnosis || patient.chief_complaint,
      chiefComplaint: patient.chief_complaint,
      presentingSymptoms: patient.symptoms_description,
      medicalHistory: patient.past_medical_history || 'No significant medical history',
      expertFramework: frameworkMapping[patient.body_part] || 'clinical-edge',
      complexity: 'intermediate' // Default complexity
    };
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full border-r bg-muted/50 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="w-8 h-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 h-full border-r bg-muted/50 flex flex-col max-h-screen">
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Virtual Patients</h3>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="w-6 h-6 p-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Framework Filter */}
        <select
          value={selectedFramework}
          onChange={(e) => setSelectedFramework(e.target.value)}
          className="w-full p-2 text-sm border rounded-md bg-background"
        >
          <option value="all">All Frameworks</option>
          {expertFrameworks.map((framework) => (
            <option key={framework.id} value={framework.id}>
              {framework.name}
            </option>
          ))}
        </select>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchTerm || selectedFramework !== "all" 
                  ? "No patients match your filters" 
                  : "No virtual patients yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedPatients).map(([bodyPartId, bodyPartPatients]) => {
                const bodyPartInfo = getBodyPartInfo(bodyPartId);
                const isExpanded = expandedFrameworks.has(bodyPartId);
                
                return (
                  <div key={bodyPartId} className="space-y-1">
                    <Button
                      variant="ghost"
                      onClick={() => toggleBodyPart(bodyPartId)}
                      className="w-full justify-between h-8 px-2 text-xs font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        <span>{bodyPartInfo.name}</span>
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {bodyPartPatients.length}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>

                    {isExpanded && (
                      <div className="space-y-1 ml-2">
                        {bodyPartPatients.map((patient) => (
                          <Card
                            key={patient.id}
                            className={`cursor-pointer transition-all hover:shadow-sm border-l-4 ${
                              selectedPatientId === patient.id 
                                ? 'ring-2 ring-blue-500 bg-blue-50 border-l-blue-500' 
                                : 'hover:bg-muted/50 border-l-transparent'
                            }`}
                            onClick={() => onPatientSelect(convertToPhysioGPTFormat(patient))}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm truncate text-blue-900">
                                    {patient.patient_name}
                                  </h4>
                                  <h5 className="font-medium text-xs text-orange-700 truncate mb-1">
                                    {patient.diagnosis || patient.chief_complaint}
                                  </h5>
                                  <p className="text-xs text-muted-foreground">
                                    {patient.age}y • {patient.gender} • {patient.body_part}
                                  </p>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  Patient
                                </Badge>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground truncate">
                                    {patient.chief_complaint}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-2 pt-2 border-t">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(patient.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {patient.analysisResult?.diagnosis && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    Analyzed
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 border-t flex-shrink-0">
        <p className="text-xs text-muted-foreground text-center">
          Select a patient to analyze with PhysioGPT
        </p>
      </div>
    </div>
  );
}