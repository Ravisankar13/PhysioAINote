import { Route, Routes, BrowserRouter } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ClinicalNotes from "@/pages/ClinicalNotes";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Terms from "@/pages/Terms";
import AuthPage from "@/pages/auth-page";
import SharedNotes from "@/pages/SharedNotes";
import MyNotes from "@/pages/MyNotes";

import Skeleton3DTool from "@/pages/Skeleton3DTool";
import MotionCapturePage from "@/pages/MotionCapturePage";
import StaticPosturalAnalysisPage from "@/pages/StaticPosturalAnalysisPage";
import IntegratedClinicalAssessment from "@/pages/IntegratedClinicalAssessment";
import IntelligentAssessment from "@/pages/IntelligentAssessment";
import ResearchHub from "@/pages/ResearchHub";
import ResearchGaps from "@/pages/ResearchGaps";
import CreateResearchProject from "@/pages/CreateResearchProject";
import Membership from "@/pages/Membership";
import ExercisePage from "@/pages/ExercisePage";
import ManualTherapyPage from "@/pages/ManualTherapyPage";
import TestAudioTranscription from "@/pages/TestAudioTranscription";
import TestNoteGenerator from "@/pages/TestNoteGenerator";
import TestCaseStudiesPage from "@/pages/TestCaseStudiesPage";
import SessionsPage from "@/pages/SessionsPage";
import VirtualPatientPage from "@/pages/VirtualPatientPage";
import SharedCasesPage from "@/pages/SharedCasesPage";
import SharedCaseDetailPage from "@/pages/SharedCaseDetailPage";
import SharedCaseFormPage from "@/pages/SharedCaseFormPage";
import CaseStudyPage from "@/pages/CaseStudyPage";
import AdminDashboard from "@/pages/admin-dashboard";
import PhysioGPT from "@/pages/PhysioGPT";
import TrialWelcome from "@/pages/TrialWelcome";
import CompetitionPage from "@/pages/CompetitionPage";
import CompetitionParticipationPage from "@/pages/CompetitionParticipationPage";
import CompetitionDiagnosisPage from "@/pages/CompetitionDiagnosisPage";
import CompetitionResultsPage from "@/pages/CompetitionResultsPage";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotesClinical from "./pages/NotesClinical";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/clinical-notes"
            element={<ProtectedRoute component={NotesClinical} />}
          />
          <Route path={"/notes-clinical"} element={<NotesClinical />} />
          <Route path="/shared-notes" element={<SharedNotes />} />
          <Route path="/research" element={<ResearchHub />} />
          <Route path="/research/gaps" element={<ResearchGaps />} />
          <Route 
            path="/research/projects/create" 
            element={<ProtectedRoute component={CreateResearchProject} />} 
          />
          <Route
            path="/my-notes"
            element={<ProtectedRoute component={MyNotes} />}
          />
          <Route
            path="/notes/:id?"
            element={<ProtectedRoute component={SessionsPage} />}
          />
          <Route path="/exercises" element={<ExercisePage />} />
          <Route path="/manual-therapy" element={<ManualTherapyPage />} />
          <Route path="/skeleton-3d-tool" element={<Skeleton3DTool />} />
          <Route path="/motion-capture" element={<MotionCapturePage />} />
          <Route path="/static-postural-analysis" element={<StaticPosturalAnalysisPage />} />
          <Route path="/integrated-assessment" element={<IntegratedClinicalAssessment />} />
          <Route path="/intelligent-assessment" element={<IntelligentAssessment />} />
          <Route
            path="/virtual-patients"
            element={<ProtectedRoute component={VirtualPatientPage} />}
          />
          <Route
            path="/virtual-patient"
            element={<ProtectedRoute component={VirtualPatientPage} />}
          />
          <Route
            path="/shared-cases/new"
            element={<ProtectedRoute component={SharedCaseFormPage} />}
          />
          <Route
            path="/shared-cases/:id/edit"
            element={<ProtectedRoute component={SharedCaseFormPage} />}
          />
          <Route path="/shared-cases/:id" element={<SharedCaseDetailPage />} />
          <Route path="/shared-cases" element={<SharedCasesPage />} />
          <Route
            path="/case-studies"
            element={<ProtectedRoute component={CaseStudyPage} />}
          />
          <Route
            path="/competitions"
            element={<ProtectedRoute component={CompetitionPage} />}
          />
          <Route
            path="/competitions/:id"
            element={<ProtectedRoute component={CompetitionParticipationPage} />}
          />
          <Route
            path="/competitions/:competitionId/cases/:caseId/diagnosis"
            element={<ProtectedRoute component={CompetitionDiagnosisPage} />}
          />
          <Route
            path="/competitions/:id/results"
            element={<ProtectedRoute component={CompetitionResultsPage} />}
          />
          <Route
            path="/physiogpt"
            element={<ProtectedRoute component={PhysioGPT} />}
          />
          <Route path="/membership" element={<Membership />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/trial-welcome"
            element={<ProtectedRoute component={TrialWelcome} />}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute component={AdminDashboard} />}
          />
          <Route
            path="/test-audio-transcription"
            element={<TestAudioTranscription />}
          />
          <Route path="/test-note-generator" element={<TestNoteGenerator />} />
          <Route path="/test-case-studies" element={<TestCaseStudiesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <Router />
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
