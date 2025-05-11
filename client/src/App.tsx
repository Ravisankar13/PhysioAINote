import { Switch, Route } from "wouter";
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
import SampleNotes from "@/pages/SampleNotes";
import MyNotes from "@/pages/MyNotes";
import SkeletonTool from "@/pages/SkeletonTool";
import Skeleton3DTool from "@/pages/Skeleton3DTool";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <ProtectedRoute path="/clinical-notes" component={ClinicalNotes} />
          <Route path="/shared-notes" component={SharedNotes} />
          <Route path="/sample-notes" component={SampleNotes} />
          <ProtectedRoute path="/my-notes" component={MyNotes} />
          <Route path="/skeleton-tool" component={SkeletonTool} />
          <Route path="/skeleton-3d-tool" component={Skeleton3DTool} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/auth" component={AuthPage} />
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
