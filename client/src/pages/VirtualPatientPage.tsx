import { useState } from "react";
import { Helmet } from "react-helmet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import VirtualPatientForm from "@/components/virtualPatient/VirtualPatientForm";
import VirtualPatientList from "@/components/virtualPatient/VirtualPatientList";
import VirtualPatientDetail from "@/components/virtualPatient/VirtualPatientDetail";
import { useAuth } from "@/hooks/use-auth";
import { Plus, List } from "lucide-react";

enum VirtualPatientView {
  LIST = "list",
  CREATE = "create",
  DETAIL = "detail"
}

export default function VirtualPatientPage() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<VirtualPatientView>(VirtualPatientView.LIST);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const handlePatientCreated = (patientId: number) => {
    setSelectedPatientId(patientId);
    setCurrentView(VirtualPatientView.DETAIL);
  };

  const handlePatientSelected = (patientId: number) => {
    setSelectedPatientId(patientId);
    setCurrentView(VirtualPatientView.DETAIL);
  };

  const handleBackToList = () => {
    setCurrentView(VirtualPatientView.LIST);
    setSelectedPatientId(null);
  };

  return (
    <div className="container py-8">
      <Helmet>
        <title>Virtual Patients | PhysioConversation</title>
        <meta name="description" content="Create and analyze virtual patient cases to practice your clinical reasoning skills and get AI-generated diagnoses and treatment recommendations." />
      </Helmet>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virtual Patients</h1>
          <p className="text-muted-foreground mt-1">
            Create virtual patient cases and receive AI-powered diagnosis and treatment recommendations
          </p>
        </div>

        {currentView !== VirtualPatientView.LIST && (
          <Button 
            variant="outline" 
            onClick={handleBackToList}
            size="sm"
            className="flex items-center"
          >
            <List className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        )}

        {currentView === VirtualPatientView.LIST && (
          <Button 
            onClick={() => setCurrentView(VirtualPatientView.CREATE)}
            size="sm"
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Patient
          </Button>
        )}
      </div>

      <Separator className="my-6" />

      <div className="mt-4">
        {currentView === VirtualPatientView.LIST && (
          <VirtualPatientList 
            onPatientSelect={handlePatientSelected}
            onCreateNew={() => setCurrentView(VirtualPatientView.CREATE)}
          />
        )}

        {currentView === VirtualPatientView.CREATE && (
          <VirtualPatientForm 
            onPatientCreated={handlePatientCreated}
            onCancel={handleBackToList}
          />
        )}

        {currentView === VirtualPatientView.DETAIL && selectedPatientId && (
          <VirtualPatientDetail 
            patientId={selectedPatientId}
            onBackToList={handleBackToList}
          />
        )}
      </div>
    </div>
  );
}