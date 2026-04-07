import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Terms from "@/pages/Terms";
import AuthPage from "@/pages/auth-page";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Pricing from "@/pages/Pricing";
import OnboardingComplete from "@/pages/OnboardingComplete";
import RegistrationIncomplete from "@/pages/RegistrationIncomplete";
import RegistrationComplete from "@/pages/RegistrationComplete";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

const PhysioGPT = lazy(() => import("@/pages/PhysioGPT"));
const ClinicalNotes = lazy(() => import("@/pages/ClinicalNotes"));
const SoapNotes = lazy(() => import("@/pages/SoapNotes"));
const EnhancedSoapNotes = lazy(() => import("@/pages/EnhancedSoapNotes"));
const SharedNotes = lazy(() => import("@/pages/SharedNotes"));
const MyNotes = lazy(() => import("@/pages/MyNotes"));
const Skeleton3DTool = lazy(() => import("@/pages/Skeleton3DTool"));
const MotionCapturePage = lazy(() => import("@/pages/MotionCapturePage"));
const StaticPosturalAnalysisPage = lazy(() => import("@/pages/StaticPosturalAnalysisPage"));
const IntegratedClinicalAssessment = lazy(() => import("@/pages/IntegratedClinicalAssessment"));
const IntelligentAssessment = lazy(() => import("@/pages/IntelligentAssessment"));
const ResearchHub = lazy(() => import("@/pages/ResearchHub"));
const Research = lazy(() => import("@/pages/Research"));
const ResearchGaps = lazy(() => import("@/pages/ResearchGaps"));
const CreateResearchProject = lazy(() => import("@/pages/CreateResearchProject"));
const ManualTherapyPage = lazy(() => import("@/pages/ManualTherapyPage"));
const TestAudioTranscription = lazy(() => import("@/pages/TestAudioTranscription"));
const TestNoteGenerator = lazy(() => import("@/pages/TestNoteGenerator"));
const TestCaseStudiesPage = lazy(() => import("@/pages/TestCaseStudiesPage"));
const SessionsPage = lazy(() => import("@/pages/SessionsPage"));
const VirtualPatientPage = lazy(() => import("@/pages/VirtualPatientPage"));
const VirtualPatients = lazy(() => import("@/pages/VirtualPatients"));
const VirtualPatientsWorking = lazy(() => import("@/pages/VirtualPatientsWorking"));
const VirtualPatientsSimple = lazy(() => import("@/pages/VirtualPatientsSimple"));
const VirtualPatientsMinimal = lazy(() => import("@/pages/VirtualPatientsMinimal"));
const VirtualPatientsFixed = lazy(() => import("@/pages/VirtualPatientsFixed"));
const VirtualPatientsManagement = lazy(() => import("@/pages/VirtualPatientsManagement"));
const VirtualPatient2 = lazy(() => import("@/pages/VirtualPatient2"));
const SharedCasesPage = lazy(() => import("@/pages/SharedCasesPage"));
const SharedCaseDetailPage = lazy(() => import("@/pages/SharedCaseDetailPage"));
const SharedCaseFormPage = lazy(() => import("@/pages/SharedCaseFormPage"));
const CaseStudyPage = lazy(() => import("@/pages/CaseStudyPage"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const TrialWelcome = lazy(() => import("@/pages/TrialWelcome"));
const CompetitionPage = lazy(() => import("@/pages/CompetitionPage"));
const CompetitionParticipationPage = lazy(() => import("@/pages/CompetitionParticipationPage"));
const ComplexCasePage = lazy(() => import("@/pages/ComplexCasePage"));
const ComplexCaseCompetitionsPage = lazy(() => import("@/pages/ComplexCaseCompetitionsPage"));
const ComplexCaseCompetitionParticipationPage = lazy(() => import("@/pages/ComplexCaseCompetitionParticipationPage"));
const CompetitionDiagnosisPage = lazy(() => import("@/pages/CompetitionDiagnosisPage"));
const CompetitionResultsPage = lazy(() => import("@/pages/CompetitionResultsPage"));
const GameCompetitions = lazy(() => import("@/pages/GameCompetitions"));
const GameCompetitionPage = lazy(() => import("@/pages/GameCompetitionPage"));
const ExerciseProgramBuilder = lazy(() => import("@/pages/ExerciseProgramBuilder"));
const MovementAnalysis = lazy(() => import("@/pages/MovementAnalysis"));
const CameraTest = lazy(() => import("@/pages/CameraTest"));
const PhoneCameraPage = lazy(() => import("@/pages/PhoneCameraPage"));
const TournamentWaitingRoom = lazy(() => import("@/pages/TournamentWaitingRoom"));
const TournamentMatchPage = lazy(() => import("@/pages/TournamentMatchPage"));
const TournamentResultsPage = lazy(() => import("@/pages/TournamentResultsPage"));
const BodyScanner = lazy(() => import("@/pages/BodyScanner"));
const JointAnalysisLab = lazy(() => import("@/pages/JointAnalysisLab"));
const TestSkeleton = lazy(() => import("@/pages/TestSkeleton"));
const TestSkeletonNew = lazy(() => import("@/pages/TestSkeletonNew"));
const TestSkeletonNewSimple = lazy(() => import("@/pages/TestSkeletonNewSimple"));
const TestSkeletonScapula = lazy(() => import("@/pages/TestSkeletonScapula"));
const PatientAssessmentDashboard = lazy(() => import("@/pages/PatientAssessmentDashboard"));
const Education = lazy(() => import("@/pages/Education"));
const CourseContent = lazy(() => import("@/pages/CourseContent"));
const NotesClinical = lazy(() => import("./pages/NotesClinical"));
const TreatmentNotes = lazy(() => import("@/pages/TreatmentNotes"));

function PageLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-emerald-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-1">Loading</h2>
          <p className="text-sm text-slate-400">Preparing your workspace...</p>
        </div>
      </div>
    </div>
  );
}

class PageErrorBoundary extends Component<
  { children: ReactNode; pageName: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; pageName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.pageName}] React render crash:`, error.message, error.stack);
    console.error(`[${this.props.pageName}] Component stack:`, errorInfo.componentStack);
    fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: this.props.pageName,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }).catch(() => {});
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>Something went wrong on the {this.props.pageName} page</h2>
          <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', maxWidth: 800, margin: '20px auto', background: '#f5f5f5', padding: 16, borderRadius: 8, fontSize: 12 }}>
            {this.state.error?.message}{'\n'}{this.state.error?.stack}
          </pre>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{ marginTop: 16, padding: '8px 16px' }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Header />
        <Suspense fallback={<PageLoadingFallback />}>
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
          <Route path="/treatment-notes">
            <ProtectedRoute component={TreatmentNotes} />
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
          <Route path="/virtual-patient-2" component={VirtualPatient2} />
          <Route path="/test-skeleton" component={TestSkeleton} />
          <Route path="/test-skeleton-new" component={TestSkeletonNew} />
          <Route path="/test-skeleton-simple" component={TestSkeletonNewSimple} />
          <Route path="/test-skeleton-scapula" component={TestSkeletonScapula} />
          <Route path="/patient-assessment" component={PatientAssessmentDashboard} />
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
          <Route path="/joint-analysis-lab">
            <ProtectedRoute component={JointAnalysisLab} />
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
            <PageErrorBoundary pageName="PhysioGPT">
              <ProtectedRoute component={PhysioGPT} />
            </PageErrorBoundary>
          </Route>
          <Route path="/education">
            <ProtectedRoute component={Education} />
          </Route>
          <Route path="/education/course/:id">
            <ProtectedRoute component={CourseContent} />
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
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/trial-welcome">
            <ProtectedRoute component={TrialWelcome} />
          </Route>
          <Route path="/onboarding-complete" component={OnboardingComplete} />
          <Route path="/registration-incomplete">
            <ProtectedRoute component={RegistrationIncomplete} />
          </Route>
          <Route path="/registration-complete" component={RegistrationComplete} />
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
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Switch>
              <Route path="/phone-camera/:roomId" component={PhoneCameraPage} />
              <Route>
                <Router />
              </Route>
            </Switch>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
