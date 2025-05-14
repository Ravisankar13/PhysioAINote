import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Activity, Plus, ChevronRight, RefreshCcw, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VirtualPatientListProps {
  onPatientSelect: (id: number) => void;
  onCreateNew: () => void;
}

export default function VirtualPatientList({ onPatientSelect, onCreateNew }: VirtualPatientListProps) {
  const { toast } = useToast();
  
  const { 
    data: patients = [], 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery<any[]>({
    queryKey: ["/api/virtual-patients"],
    queryFn: async () => {
      try {
        console.log("Fetching virtual patients");
        const response = await fetch("/api/virtual-patients", {
          credentials: "include" // Include cookies with the request
        });
        if (response.status === 401) {
          console.log("Not authenticated while fetching virtual patients");
          toast({
            title: "Authentication Required",
            description: "Please log in to view your virtual patients",
            variant: "destructive"
          });
          return [];
        }
        if (!response.ok) {
          throw new Error("Failed to fetch virtual patients");
        }
        return response.json();
      } catch (err) {
        console.error("Error fetching virtual patients:", err);
        throw err;
      }
    },
  });

  if (isError) {
    toast({
      title: "Error",
      description: `Failed to load virtual patients: ${error?.message}`,
      variant: "destructive",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Virtual Patients</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={onCreateNew} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <Card className="text-center p-6">
          <CardContent className="pt-6">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No virtual patients yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create your first virtual patient to receive AI-generated diagnosis and treatment recommendations.
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Patient
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {patients.map((patient) => (
            <Card key={patient.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <span className="truncate">{patient.patientName}</span>
                </CardTitle>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Age: {patient.age}</span>
                  <span>•</span>
                  <span>{patient.gender}</span>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm mb-2 font-medium">{patient.chiefComplaint}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  <Badge variant="outline">{patient.bodyPart}</Badge>
                  {patient.diagnosis && (
                    <Badge variant="secondary">{patient.diagnosis}</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Created {formatDistanceToNow(new Date(patient.createdAt), { addSuffix: true })}
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center"
                  onClick={() => onPatientSelect(patient.id)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {patient.diagnosis ? "View Analysis" : "Analyze Case"}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}