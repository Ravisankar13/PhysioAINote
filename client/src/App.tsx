import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ClinicalNotes from "@/pages/ClinicalNotes";
import SoapNotes from "@/pages/SoapNotes";
import EnhancedSoapNotes from "@/pages/EnhancedSoapNotes";
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
import Research from "@/pages/Research";
import ResearchGaps from "@/pages/ResearchGaps";
import CreateResearchProject from "@/pages/CreateResearchProject";
// Membership page redirects to Pricing now
import Pricing from "@/pages/Pricing";
import OnboardingComplete from "@/pages/OnboardingComplete";
import RegistrationIncomplete from "@/pages/RegistrationIncomplete";

import ManualTherapyPage from "@/pages/ManualTherapyPage";
import TestAudioTranscription from "@/pages/TestAudioTranscription";
import TestNoteGenerator from "@/pages/TestNoteGenerator";
import TestCaseStudiesPage from "@/pages/TestCaseStudiesPage";
import SessionsPage from "@/pages/SessionsPage";
import VirtualPatientPage from "@/pages/VirtualPatientPage";
import VirtualPatients from "@/pages/VirtualPatients";
import VirtualPatientsWorking from "@/pages/VirtualPatientsWorking";
import VirtualPatientsSimple from "@/pages/VirtualPatientsSimple";
import VirtualPatientsMinimal from "@/pages/VirtualPatientsMinimal";
import VirtualPatientsFixed from "@/pages/VirtualPatientsFixed";
import VirtualPatientsManagement from "@/pages/VirtualPatientsManagement";
import SharedCasesPage from "@/pages/SharedCasesPage";
import SharedCaseDetailPage from "@/pages/SharedCaseDetailPage";
import SharedCaseFormPage from "@/pages/SharedCaseFormPage";
import CaseStudyPage from "@/pages/CaseStudyPage";
import AdminDashboard from "@/pages/admin-dashboard";
import PhysioGPT from "@/pages/PhysioGPT";
import TrialWelcome from "@/pages/TrialWelcome";
import CompetitionPage from "@/pages/CompetitionPage";
import CompetitionParticipationPage from "@/pages/CompetitionParticipationPage";
import ComplexCasePage from "@/pages/ComplexCasePage";
import ComplexCaseCompetitionsPage from "@/pages/ComplexCaseCompetitionsPage";
import ComplexCaseCompetitionParticipationPage from "@/pages/ComplexCaseCompetitionParticipationPage";
import CompetitionDiagnosisPage from "@/pages/CompetitionDiagnosisPage";
import CompetitionResultsPage from "@/pages/CompetitionResultsPage";
import GameCompetitions from "@/pages/GameCompetitions";
import GameCompetitionPage from "@/pages/GameCompetitionPage";
import ExerciseProgramBuilder from "@/pages/ExerciseProgramBuilder";
import MovementAnalysis from "@/pages/MovementAnalysis";
import CameraTest from "@/pages/CameraTest";

import TournamentWaitingRoom from "@/pages/TournamentWaitingRoom";
import TournamentMatchPage from "@/pages/TournamentMatchPage";
import TournamentResultsPage from "@/pages/TournamentResultsPage";
import BodyScanner from "@/pages/BodyScanner";
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
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/clinical-notes">
            <ProtectedRoute component={NotesClinical} />
          </Route>
          <Route path="/notes-clinical" component={NotesClinical} />
          <Route path="/soap-notes">
            <ProtectedRoute component={SoapNotes} />
          </Route>
          <Route path="/enhanced-soap-notes">
            <ProtectedRoute component={EnhancedSoapNotes} />
          </Route>
          <Route path="/shared-notes" component={SharedNotes} />
          <Route path="/research" component={Research} />
          <Route path="/research/gaps" component={ResearchGaps} />
          <Route path="/my-notes">
            <ProtectedRoute component={MyNotes} />
          </Route>
          <Route path="/notes/:id?">
            <ProtectedRoute component={SessionsPage} />
          </Route>

          <Route path="/manual-therapy" component={ManualTherapyPage} />
          <Route path="/exercise-programs">
            <ProtectedRoute component={ExerciseProgramBuilder} />
          </Route>
          <Route path="/movement-analysis">
            <ProtectedRoute component={MovementAnalysis} />
          </Route>
          <Route path="/skeleton-3d-tool" component={Skeleton3DTool} />
          <Route path="/motion-capture" component={MotionCapturePage} />
          <Route path="/static-postural-analysis" component={StaticPosturalAnalysisPage} />
          <Route path="/integrated-assessment" component={IntegratedClinicalAssessment} />
          <Route path="/intelligent-assessment" component={IntelligentAssessment} />
          <Route path="/virtual-patients">
            <ProtectedRoute component={VirtualPatientsManagement} />
          </Route>
          <Route path="/virtual-patients-debug">
            <ProtectedRoute component={VirtualPatientsSimple} />
          </Route>
          <Route path="/virtual-patient">
            <ProtectedRoute component={VirtualPatientPage} />
          </Route>
          <Route path="/shared-cases/new">
            <ProtectedRoute component={SharedCaseFormPage} />
          </Route>
          <Route path="/shared-cases/:id/edit">
            <ProtectedRoute component={SharedCaseFormPage} />
          </Route>
          <Route path="/shared-cases/:id" component={SharedCaseDetailPage} />
          <Route path="/shared-cases" component={SharedCasesPage} />
          <Route path="/case-studies" component={CaseStudyPage} />
          <Route path="/competitions">
            <ProtectedRoute component={CompetitionPage} />
          </Route>
          <Route path="/game-competitions">
            <ProtectedRoute component={GameCompetitions} />
          </Route>
          <Route path="/game-competition/:id">
            <ProtectedRoute component={GameCompetitionPage} />
          </Route>

          <Route path="/tournament/:id/waiting-room">
            <ProtectedRoute component={TournamentWaitingRoom} />
          </Route>
          <Route path="/tournament/match/:matchId">
            <ProtectedRoute component={TournamentMatchPage} />
          </Route>
          <Route path="/body-scanner">
            <ProtectedRoute component={BodyScanner} />
          </Route>
          <Route path="/complex-competitions">
            <ProtectedRoute component={ComplexCaseCompetitionsPage} />
          </Route>
          <Route path="/complex-competition/:id">
            <ProtectedRoute component={ComplexCaseCompetitionParticipationPage} />
          </Route>
          <Route path="/complex-competition/:id/results">
            <ProtectedRoute component={CompetitionResultsPage} />
          </Route>
          <Route path="/competition/:id">
            <ProtectedRoute component={CompetitionParticipationPage} />
          </Route>
          <Route path="/complex-case/:id">
            <ProtectedRoute component={ComplexCasePage} />
          </Route>
          <Route path="/competitions/:competitionId/cases/:caseId/diagnosis">
            <ProtectedRoute component={CompetitionDiagnosisPage} />
          </Route>
          <Route path="/competitions/:id/results">
            <ProtectedRoute component={CompetitionResultsPage} />
          </Route>
          <Route path="/physiogpt">
            <ProtectedRoute component={PhysioGPT} />
          </Route>
          <Route path="/membership">
            {() => {
              window.location.href = "/pricing";
              return null;
            }}
          </Route>
          <Route path="/pricing" component={Pricing} />
          <Route path="/subscription" component={Pricing} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/terms" component={Terms} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/trial-welcome">
            <ProtectedRoute component={TrialWelcome} />
          </Route>
          <Route path="/onboarding-complete" component={OnboardingComplete} />
          <Route path="/registration-incomplete">
            <ProtectedRoute component={RegistrationIncomplete} />
          </Route>
          <Route path="/admin">
            <ProtectedRoute component={AdminDashboard} />
          </Route>

          <Route path="/tournaments/:id/waiting-room">
            <ProtectedRoute component={TournamentWaitingRoom} />
          </Route>
          <Route path="/tournament/match/:matchId">
            <ProtectedRoute component={TournamentMatchPage} />
          </Route>
          <Route path="/tournament/results/:matchId">
            <ProtectedRoute component={TournamentResultsPage} />
          </Route>
          <Route path="/test-audio-transcription" component={TestAudioTranscription} />
          <Route path="/test-note-generator" component={TestNoteGenerator} />
          <Route path="/test-case-studies" component={TestCaseStudiesPage} />
          <Route path="/camera-test" component={CameraTest} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
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
  );
}

export default App;