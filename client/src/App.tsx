import { Route, Routes } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ClinicalNotes from "@/pages/ClinicalNotes";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import AuthPage from "@/pages/auth-page";
import SharedNotes from "@/pages/SharedNotes";
import MyNotes from "@/pages/MyNotes";
import SkeletonTool from "@/pages/SkeletonTool";
import Skeleton3DTool from "@/pages/Skeleton3DTool";
import Research from "@/pages/Research";
import Membership from "@/pages/Membership";
import ExercisePage from "@/pages/ExercisePage";
import ManualTherapyPage from "@/pages/ManualTherapyPage";
import TestAudioTranscription from "@/pages/TestAudioTranscription";
import TestNoteGenerator from "@/pages/TestNoteGenerator";
import SessionsPage from "@/pages/SessionsPage";
import VirtualPatientPage from "@/pages/VirtualPatientPage";
import SharedCasesPage from "@/pages/SharedCasesPage";
import SharedCaseDetailPage from "@/pages/SharedCaseDetailPage";
import SharedCaseFormPage from "@/pages/SharedCaseFormPage";
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
        <Routes>
          <Header />
          <Route path="/" element={<Home />} />
          <Route
            path="/clinical-notes"
            element={
              <ProtectedRoute
                path="/clinical-notes"
                component={ClinicalNotes}
              />
            }
          />
          <Route path={"/notes-clinical"} element={<NotesClinical />} />
          <Route path="/shared-notes" element={<SharedNotes />} />
          <Route path="/research" element={<Research />} />
          <Route
            path="/my-notes"
            element={<ProtectedRoute path="/my-notes" component={MyNotes} />}
          />
          <Route
            path="/notes/:id?"
            element={
              <ProtectedRoute path="/notes/:id?" component={SessionsPage} />
            }
          />
          <Route path="/exercises" element={<ExercisePage />} />
          <Route path="/manual-therapy" element={<ManualTherapyPage />} />
          <Route path="/skeleton-tool" element={<SkeletonTool />} />
          <Route path="/skeleton-3d-tool" element={<Skeleton3DTool />} />
          <Route
            path="/virtual-patients"
            element={
              <ProtectedRoute
                path="/virtual-patients"
                component={VirtualPatientPage}
              />
            }
          />
          <Route
            path="/virtual-patient"
            element={
              <ProtectedRoute
                path="/virtual-patient"
                component={VirtualPatientPage}
              />
            }
          />
          <Route
            path="/shared-cases/new"
            element={
              <ProtectedRoute
                path="/shared-cases/new"
                component={SharedCaseFormPage}
              />
            }
          />
          <Route
            path="/shared-cases/:id/edit"
            element={
              <ProtectedRoute
                path="/shared-cases/:id/edit"
                component={SharedCaseFormPage}
              />
            }
          />
          <Route path="/shared-cases/:id" element={<SharedCaseDetailPage />} />
          <Route path="/shared-cases" element={<SharedCasesPage />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/test-audio-transcription"
            element={<TestAudioTranscription />}
          />
          <Route path="/test-note-generator" element={<TestNoteGenerator />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
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
