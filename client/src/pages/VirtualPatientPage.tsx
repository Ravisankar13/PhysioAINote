import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VirtualPatientForm from "@/components/virtualPatient/VirtualPatientForm";
import VirtualPatientList from "@/components/virtualPatient/VirtualPatientList";
import VirtualPatientDetail from "@/components/virtualPatient/VirtualPatientDetail";

export default function VirtualPatientPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("list");

  const handlePatientSelect = (id: number) => {
    setSelectedPatientId(id);
    setActiveTab("detail");
  };

  const handleCreateNew = () => {
    setSelectedPatientId(null);
    setActiveTab("create");
  };

  const handleBackToList = () => {
    setActiveTab("list");
  };

  const handlePatientCreated = (patientId: number) => {
    setSelectedPatientId(patientId);
    setActiveTab("detail");
  };

  return (
    <div className="container py-8">
      <Helmet>
        <title>Virtual Patient | PhysioHub</title>
        <meta name="description" content="Create virtual patients and receive AI-generated diagnoses, treatment options, and relevant research recommendations." />
      </Helmet>
      
      <h1 className="text-3xl font-bold mb-6 text-center">Virtual Patient</h1>
      <p className="text-center mb-8 max-w-3xl mx-auto">
        Create a virtual patient by entering their demographic information, signs, symptoms, and medical history. 
        Our AI will analyze the case and provide potential diagnoses, treatment options, and relevant research.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
          <TabsTrigger value="list">Patient List</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="detail" disabled={!selectedPatientId}>View Patient</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-0">
          <VirtualPatientList 
            onPatientSelect={handlePatientSelect} 
            onCreateNew={handleCreateNew}
          />
        </TabsContent>
        
        <TabsContent value="create" className="mt-0">
          <VirtualPatientForm 
            onPatientCreated={handlePatientCreated} 
            onCancel={handleBackToList}
          />
        </TabsContent>
        
        <TabsContent value="detail" className="mt-0">
          {selectedPatientId && (
            <VirtualPatientDetail 
              patientId={selectedPatientId} 
              onBackToList={handleBackToList}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}