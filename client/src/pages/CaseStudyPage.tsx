import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import CaseStudyList from "@/components/caseStudies/CaseStudyList";
import CaseStudyDetail from "@/components/caseStudies/CaseStudyDetail";
import CreateCaseStudyForm from "@/components/caseStudies/CreateCaseStudyForm";
import { Button } from "@/components/ui/button";

enum CaseStudyView {
  LIST = "list",
  DETAIL = "detail",
  CREATE = "create",
}

export default function CaseStudyPage() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<CaseStudyView>(CaseStudyView.LIST);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

  const handleSelectCase = (caseId: number) => {
    setSelectedCaseId(caseId);
    setCurrentView(CaseStudyView.DETAIL);
  };

  const handleBackToList = () => {
    setCurrentView(CaseStudyView.LIST);
  };

  const handleCreateCase = () => {
    setCurrentView(CaseStudyView.CREATE);
  };

  const handleCaseCreated = (caseId: number) => {
    setSelectedCaseId(caseId);
    setCurrentView(CaseStudyView.DETAIL);
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-2">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">AI Physiotherapy Case Studies</h1>
          </div>
        </div>
        <p className="mt-2 text-muted-foreground">
          Practice your diagnostic skills with research-based physiotherapy cases, receive real-time feedback on your assessment and treatment approaches.
        </p>
      </div>

      {currentView === CaseStudyView.LIST && (
        <CaseStudyList 
          onSelectCase={handleSelectCase}
          onCreateCase={handleCreateCase}
        />
      )}

      {currentView === CaseStudyView.DETAIL && selectedCaseId && (
        <CaseStudyDetail 
          caseId={selectedCaseId}
          onBackToList={handleBackToList}
        />
      )}

      {currentView === CaseStudyView.CREATE && (
        <CreateCaseStudyForm
          onCaseCreated={handleCaseCreated}
          onCancel={handleBackToList}
        />
      )}
    </div>
  );
}